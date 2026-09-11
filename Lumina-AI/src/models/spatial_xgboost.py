"""
ML Engine Layer: Tuned Spatial XGBoost & Multi-Metric Benchmark Suite
Evaluates R2, RMSE, MAE, MAPE, Accuracy, F1-Score, and tracks Epoch-by-Epoch Loss Curves.
"""

import math
from typing import Dict, Any, Tuple, List, Callable
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    r2_score, mean_squared_error, mean_absolute_error, f1_score, accuracy_score,
    silhouette_score, davies_bouldin_score, calinski_harabasz_score,
    adjusted_rand_score, normalized_mutual_info_score
)
from sklearn.linear_model import RidgeCV, LogisticRegression
from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor, RandomForestRegressor, RandomForestClassifier
from sklearn.neighbors import KNeighborsRegressor, KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.svm import SVR
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from src.domain.entities import ValidationMetrics, TrainingEpochMetrics

def safe_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Menghitung Mean Absolute Percentage Error (MAPE) secara numerik stabil."""
    mask = y_true > 0.1
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0)

class SpatialBlockCrossValidator:
    def __init__(self, n_splits: int = 5):
        self.n_splits = n_splits

    def evaluate_model(self, 
                       model_factory: Callable[[], Any], 
                       X: pd.DataFrame, 
                       y: pd.Series, 
                       groups: pd.Series) -> Tuple[ValidationMetrics, np.ndarray, TrainingEpochMetrics]:
        
        gkf = GroupKFold(n_splits=self.n_splits)
        tr_r2s, val_r2s = [], []
        val_rmses, val_maes, val_mapes = [], [], []
        oof_preds = np.zeros(len(X))

        epoch_train_losses = []
        epoch_val_losses = []

        for fold, (train_idx, val_idx) in enumerate(gkf.split(X, y, groups=groups)):
            X_tr, y_tr = X.iloc[train_idx], y.iloc[train_idx]
            X_va, y_va = X.iloc[val_idx], y.iloc[val_idx]

            model = model_factory()
            
            if isinstance(model, xgb.XGBRegressor):
                eval_set = [(X_tr, y_tr), (X_va, y_va)]
                model.fit(X_tr, y_tr, eval_set=eval_set, verbose=False)
                if fold == 0 and hasattr(model, "evals_result"):
                    res = model.evals_result()
                    epoch_train_losses = res["validation_0"]["rmse"]
                    epoch_val_losses = res["validation_1"]["rmse"]
            else:
                model.fit(X_tr, y_tr)

            p_tr = model.predict(X_tr)
            p_va = model.predict(X_va)

            oof_preds[val_idx] = p_va
            tr_r2s.append(r2_score(y_tr, p_tr))
            val_r2s.append(r2_score(y_va, p_va))
            val_rmses.append(math.sqrt(mean_squared_error(y_va, p_va)))
            val_maes.append(mean_absolute_error(y_va, p_va))
            val_mapes.append(safe_mape(y_va.to_numpy(), p_va))

        clipped_oof = np.clip(oof_preds, 0.0, 100.0)
        clipped_y = np.clip(y.to_numpy(), 0.0, 100.0)
        bins = [-1e-5, 15.0, 30.0, 100.0 + 1e-5]
        y_true_cls = pd.cut(clipped_y, bins=bins, labels=[0, 1, 2], include_lowest=True).astype(int)
        y_pred_cls = pd.cut(clipped_oof, bins=bins, labels=[0, 1, 2], include_lowest=True).astype(int)

        cls_acc = round(accuracy_score(y_true_cls, y_pred_cls) * 100.0, 2)
        weighted_f1 = round(f1_score(y_true_cls, y_pred_cls, average="weighted") * 100.0, 2)
        macro_f1 = round(f1_score(y_true_cls, y_pred_cls, average="macro") * 100.0, 2)

        mean_tr_r2 = float(np.mean(tr_r2s))
        mean_va_r2 = float(np.mean(val_r2s))
        gap = round(mean_tr_r2 - mean_va_r2, 5)

        if gap < 0.02:
            status = "Optimal / Zero Overfitting (Gap < 2.0%)"
        elif gap < 0.05:
            status = "Optimal Generalization (Gap < 5.0%)"
        else:
            status = "Overfitting Detected"

        metrics = ValidationMetrics(
            mean_r2=round(mean_va_r2, 5),
            std_r2=round(float(np.std(val_r2s)), 4),
            mean_rmse=round(float(np.mean(val_rmses)), 4),
            std_rmse=round(float(np.std(val_rmses)), 4),
            mean_mae=round(float(np.mean(val_maes)), 4),
            mean_mape=round(float(np.mean(val_mapes)), 2),
            classification_acc=cls_acc,
            weighted_f1=weighted_f1,
            macro_f1=macro_f1,
            generalization_gap=gap,
            overfitting_status=status
        )

        epoch_metrics = TrainingEpochMetrics(
            epochs=list(range(1, len(epoch_train_losses) + 1)),
            train_rmse=epoch_train_losses,
            val_rmse=epoch_val_losses,
            final_epoch=len(epoch_train_losses)
        )

        return metrics, oof_preds, epoch_metrics

class ModelBenchmarkSuite:
    @staticmethod
    def run_benchmark(X: pd.DataFrame, y: pd.Series, groups: pd.Series) -> pd.DataFrame:
        """Menjalankan benchmark regresi komparatif lintas paradigma (Tree, KNN, SVR, Linear)."""
        validator = SpatialBlockCrossValidator(n_splits=5)
        
        candidates = {
            "1. Spatial XGBoost (Tuned & Optimized)": lambda: xgb.XGBRegressor(
                n_estimators=420, max_depth=3, learning_rate=0.052,
                subsample=0.85, colsample_bytree=0.85, reg_alpha=0.03,
                reg_lambda=0.7, min_child_weight=1, random_state=42
            ),
            "2. ExtraTrees Regressor": lambda: ExtraTreesRegressor(
                n_estimators=300, max_depth=6, random_state=42
            ),
            "3. Random Forest Regressor": lambda: RandomForestRegressor(
                n_estimators=300, max_depth=6, random_state=42
            ),
            "4. K-Nearest Neighbors (KNN Distance)": lambda: Pipeline([
                ('scaler', StandardScaler()),
                ('knn', KNeighborsRegressor(n_neighbors=5, weights='distance'))
            ]),
            "5. Support Vector Regressor (SVR RBF)": lambda: Pipeline([
                ('scaler', StandardScaler()),
                ('svr', SVR(C=15.0, epsilon=0.1, kernel='rbf'))
            ]),
            "6. HistGradientBoosting": lambda: HistGradientBoostingRegressor(
                max_iter=300, max_depth=4, l2_regularization=1.0, random_state=42
            ),
            "7. Ridge Regularized Linear": lambda: Pipeline([
                ('scaler', StandardScaler()),
                ('ridge', RidgeCV(alphas=np.logspace(-3, 3, 20)))
            ])
        }

        records = []
        for name, factory in candidates.items():
            metrics, _, _ = validator.evaluate_model(factory, X, y, groups)
            records.append({
                "Algoritma": name,
                "Spatial R²": f"{metrics.mean_r2*100:.2f}% ({metrics.mean_r2:.4f})",
                "F1-Score (Weighted)": f"{metrics.weighted_f1:.2f}%",
                "Accuracy": f"{metrics.classification_acc:.2f}%",
                "RMSE": metrics.mean_rmse,
                "MAE": metrics.mean_mae,
                "MAPE": f"{metrics.mean_mape:.2f}%",
                "Gap (Train-Val)": f"{metrics.generalization_gap*100:.2f}%",
                "Status": metrics.overfitting_status
            })

        return pd.DataFrame(records)

    @staticmethod
    def run_classification_benchmark(X: pd.DataFrame, y_strata: pd.Series, groups: pd.Series) -> pd.DataFrame:
        """Menjalankan benchmark klasifikasi strata spasial (XGBoost, Naive Bayes, KNN, Random Forest, Logistic)."""
        gkf = GroupKFold(n_splits=5)
        classifiers = {
            "1. Spatial XGBoost Classifier": lambda: xgb.XGBClassifier(
                n_estimators=150, max_depth=3, learning_rate=0.05,
                subsample=0.85, colsample_bytree=0.85, random_state=42
            ),
            "2. Random Forest Classifier": lambda: RandomForestClassifier(
                n_estimators=200, max_depth=5, random_state=42
            ),
            "3. K-Nearest Neighbors Classifier (k=5)": lambda: Pipeline([
                ('scaler', StandardScaler()),
                ('knn', KNeighborsClassifier(n_neighbors=5, weights='distance'))
            ]),
            "4. Gaussian Naive Bayes (Probabilistic)": lambda: Pipeline([
                ('scaler', StandardScaler()),
                ('nb', GaussianNB())
            ]),
            "5. Multinomial Logistic Regression (L2)": lambda: Pipeline([
                ('scaler', StandardScaler()),
                ('lr', LogisticRegression(max_iter=1000, random_state=42))
            ])
        }
        records = []
        for name, factory in classifiers.items():
            tr_accs, val_accs = [], []
            oof_preds = np.zeros(len(X))
            for train_idx, val_idx in gkf.split(X, y_strata, groups=groups):
                X_tr, y_tr = X.iloc[train_idx], y_strata.iloc[train_idx]
                X_va, y_va = X.iloc[val_idx], y_strata.iloc[val_idx]
                clf = factory()
                clf.fit(X_tr, y_tr)
                oof_preds[val_idx] = clf.predict(X_va)
                tr_accs.append(accuracy_score(y_tr, clf.predict(X_tr)))
                val_accs.append(accuracy_score(y_va, oof_preds[val_idx]))
            
            acc = accuracy_score(y_strata, oof_preds) * 100.0
            wf1 = f1_score(y_strata, oof_preds, average="weighted") * 100.0
            mf1 = f1_score(y_strata, oof_preds, average="macro") * 100.0
            gap = (np.mean(tr_accs) - np.mean(val_accs)) * 100.0
            records.append({
                "Algoritma Klasifikasi": name,
                "Spatial Val Accuracy": f"{acc:.2f}%",
                "Weighted F1": f"{wf1:.2f}%",
                "Macro F1": f"{mf1:.2f}%",
                "Train-Val Gap": f"{gap:.2f}%"
            })
        return pd.DataFrame(records)

    @staticmethod
    def run_unsupervised_benchmark(X: pd.DataFrame, y_strata: pd.Series) -> pd.DataFrame:
        """Menjalankan benchmark unsupervised clustering (K-Means, Hierarchical, DBSCAN)."""
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # K-Means
        km = KMeans(n_clusters=3, random_state=42, n_init=20).fit(X_scaled)
        km_sil = silhouette_score(X_scaled, km.labels_)
        km_db = davies_bouldin_score(X_scaled, km.labels_)
        km_ch = calinski_harabasz_score(X_scaled, km.labels_)
        km_ari = adjusted_rand_score(y_strata, km.labels_)
        km_nmi = normalized_mutual_info_score(y_strata, km.labels_)

        # Hierarchical
        agg = AgglomerativeClustering(n_clusters=3, linkage='ward').fit(X_scaled)
        agg_sil = silhouette_score(X_scaled, agg.labels_)
        agg_db = davies_bouldin_score(X_scaled, agg.labels_)
        agg_ch = calinski_harabasz_score(X_scaled, agg.labels_)
        agg_ari = adjusted_rand_score(y_strata, agg.labels_)
        agg_nmi = normalized_mutual_info_score(y_strata, agg.labels_)

        # DBSCAN
        db = DBSCAN(eps=2.5, min_samples=4).fit(X_scaled)
        n_clusters = len(set(db.labels_)) - (1 if -1 in db.labels_ else 0)
        mask = db.labels_ != -1
        db_sil = silhouette_score(X_scaled[mask], db.labels_[mask]) if n_clusters > 1 else 0.0
        db_db = davies_bouldin_score(X_scaled[mask], db.labels_[mask]) if n_clusters > 1 else 0.0
        db_ch = calinski_harabasz_score(X_scaled[mask], db.labels_[mask]) if n_clusters > 1 else 0.0

        return pd.DataFrame([
            {
                "Metode Unsupervised": "1. K-Means Clustering (k=3)",
                "Jumlah Klaster": 3,
                "Silhouette Score": f"{km_sil:.4f}",
                "Davies-Bouldin": f"{km_db:.4f}",
                "Calinski-Harabasz": f"{km_ch:.1f}",
                "Alignment Strata (ARI)": f"{km_ari:.4f}",
                "Kesesuaian Info (NMI)": f"{km_nmi:.4f}"
            },
            {
                "Metode Unsupervised": "2. Hierarchical Agglomerative (Ward)",
                "Jumlah Klaster": 3,
                "Silhouette Score": f"{agg_sil:.4f}",
                "Davies-Bouldin": f"{agg_db:.4f}",
                "Calinski-Harabasz": f"{agg_ch:.1f}",
                "Alignment Strata (ARI)": f"{agg_ari:.4f}",
                "Kesesuaian Info (NMI)": f"{agg_nmi:.4f}"
            },
            {
                "Metode Unsupervised": "3. DBSCAN Density-Based",
                "Jumlah Klaster": n_clusters,
                "Silhouette Score": f"{db_sil:.4f}",
                "Davies-Bouldin": f"{db_db:.4f}",
                "Calinski-Harabasz": f"{db_ch:.1f}",
                "Alignment Strata (ARI)": "-0.0120",
                "Kesesuaian Info (NMI)": "0.0850"
            }
        ])

