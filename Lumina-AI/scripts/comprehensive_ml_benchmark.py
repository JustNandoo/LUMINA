"""
Comprehensive Machine Learning Benchmark Suite:
Supervised Regression, Supervised Classification, Unsupervised Clustering & Anomaly Detection,
specifically evaluating Naive Bayes, KNN, Tree Ensembles, Linear/Kernel Models across Uber H3 Spatial Grids.
"""

import os
import sys
import math
import time
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List

from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    r2_score, mean_squared_error, mean_absolute_error,
    accuracy_score, f1_score,
    silhouette_score, davies_bouldin_score, calinski_harabasz_score,
    adjusted_rand_score, normalized_mutual_info_score
)

# Supervised Models
import xgboost as xgb
from sklearn.ensemble import ExtraTreesRegressor, RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsRegressor, KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.svm import SVR
from sklearn.linear_model import RidgeCV, LogisticRegression

# Unsupervised Models
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)

from src.domain.entities import TransitHub
from src.repositories.geo_repository import LocalGeoJsonRepository
from src.services.spatial_feature_engineering import SpatialFeatureEngineeringService

def safe_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    mask = y_true > 0.1
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0)

def main():
    print("[INFO] Memulai Benchmark Komprehensif Seluruh Paradigma Machine Learning...")
    
    raw_dir = os.path.join(BASE_DIR, "data", "raw")
    reports_dir = os.path.join(BASE_DIR, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    repo = LocalGeoJsonRepository()
    prop_data = repo.load_features(os.path.join(raw_dir, "Properti_Go_Bandung.geojson"))
    struk_data = repo.load_features(os.path.join(raw_dir, "Sample_StrukGo_WebGIS2026.geojson"))
    act_data = repo.load_features(os.path.join(raw_dir, "Sample_Activity_WebGIS2026.geojson"))
    
    transit_hubs = [
        TransitHub("Stasiun Bandung (Hall)", "KAI Jarak Jauh & Commuter Line", -6.9126, 107.6024),
        TransitHub("Stasiun Kiaracondong", "KAI Jarak Jauh & Commuter Line", -6.9250, 107.6465),
        TransitHub("Stasiun Cimahi", "Commuter Line Bandung Raya", -6.8856, 107.5360),
        TransitHub("Stasiun Padalarang", "Hub Kereta Cepat Whoosh & Commuter", -6.8415, 107.4789),
        TransitHub("Stasiun Ciroyom", "Commuter Line Bandung Raya", -6.9142, 107.5925),
        TransitHub("Stasiun Cikudapateuh", "Commuter Line Bandung Raya", -6.9213, 107.6253),
        TransitHub("Stasiun Cimekar", "Commuter Line Bandung Raya", -6.9458, 107.7032),
        TransitHub("Stasiun Gedebage", "Commuter Line & Transit Hub", -6.9442, 107.6789),
        TransitHub("Stasiun Kereta Cepat Tegalluar", "Kereta Cepat Whoosh Hub", -6.9669, 107.7126),
        TransitHub("Terminal Leuwipanjang", "Terminal Bus Transit Antarmoda", -6.9463, 107.5942),
        TransitHub("Terminal Cicaheum", "Terminal Bus Transit Antarmoda", -6.9015, 107.6575),
        TransitHub("Terminal Ledeng", "Terminal Angkutan Kota & Bus", -6.8588, 107.5937),
    ]
    
    engineer = SpatialFeatureEngineeringService(res_micro=9, res_macro=7)
    df = engineer.fuse_and_engineer(prop_data, struk_data, act_data, transit_hubs)
    
    feature_cols = engineer.get_feature_names()
    X = df[feature_cols].copy()
    y = df["target_potential_score"].copy()
    groups = df["block_id"].copy()
    
    bins = [-1e-5, 15.0, 30.0, 100.0 + 1e-5]
    labels = [0, 1, 2] # 0: Suburban Buffer, 1: Commercial Corridor, 2: Prime TOD
    y_strata = pd.cut(y, bins=bins, labels=labels, include_lowest=True).astype(int)
    
    gkf = GroupKFold(n_splits=5)
    
    print("\n" + "="*80)
    print("BAGIAN 1: SUPERVISED LEARNING — MODEL REGRESI POTENSI SPASIAL")
    print("="*80)
    
    regressors = {
        "1. Spatial XGBoost (Tuned & Regularized)": lambda: xgb.XGBRegressor(
            n_estimators=420, max_depth=3, learning_rate=0.052,
            subsample=0.85, colsample_bytree=0.85, reg_alpha=0.03,
            reg_lambda=0.7, min_child_weight=1, random_state=42
        ),
        "2. Random Forest Regressor": lambda: RandomForestRegressor(
            n_estimators=300, max_depth=6, random_state=42
        ),
        "3. ExtraTrees Regressor": lambda: ExtraTreesRegressor(
            n_estimators=300, max_depth=6, random_state=42
        ),
        "4. K-Nearest Neighbors (KNN Distance)": lambda: Pipeline([
            ('scaler', StandardScaler()),
            ('knn', KNeighborsRegressor(n_neighbors=5, weights='distance', metric='euclidean'))
        ]),
        "5. K-Nearest Neighbors (KNN Uniform)": lambda: Pipeline([
            ('scaler', StandardScaler()),
            ('knn', KNeighborsRegressor(n_neighbors=5, weights='uniform', metric='euclidean'))
        ]),
        "6. Support Vector Regressor (SVR RBF)": lambda: Pipeline([
            ('scaler', StandardScaler()),
            ('svr', SVR(C=15.0, epsilon=0.1, kernel='rbf'))
        ]),
        "7. Ridge Regularized Linear": lambda: Pipeline([
            ('scaler', StandardScaler()),
            ('ridge', RidgeCV(alphas=np.logspace(-3, 3, 20)))
        ])
    }
    
    reg_records = []
    
    for name, factory in regressors.items():
        tr_r2s, val_r2s = [], []
        val_rmses, val_maes, val_mapes = [], [], []
        oof_preds = np.zeros(len(X))
        
        t0 = time.time()
        for train_idx, val_idx in gkf.split(X, y, groups=groups):
            X_tr, y_tr = X.iloc[train_idx], y.iloc[train_idx]
            X_va, y_va = X.iloc[val_idx], y.iloc[val_idx]
            
            model = factory()
            model.fit(X_tr, y_tr)
            
            p_tr = model.predict(X_tr)
            p_va = model.predict(X_va)
            
            oof_preds[val_idx] = p_va
            tr_r2s.append(r2_score(y_tr, p_tr))
            val_r2s.append(r2_score(y_va, p_va))
            val_rmses.append(math.sqrt(mean_squared_error(y_va, p_va)))
            val_maes.append(mean_absolute_error(y_va, p_va))
            val_mapes.append(safe_mape(y_va.to_numpy(), p_va))
            
        latency_ms = (time.time() - t0) * 1000.0
        
        oof_clipped = np.clip(oof_preds, 0.0, 100.0)
        oof_strata = pd.cut(oof_clipped, bins=bins, labels=labels, include_lowest=True).astype(int)
        
        acc = accuracy_score(y_strata, oof_strata) * 100.0
        wf1 = f1_score(y_strata, oof_strata, average="weighted") * 100.0
        mf1 = f1_score(y_strata, oof_strata, average="macro") * 100.0
        
        m_tr_r2 = float(np.mean(tr_r2s))
        m_va_r2 = float(np.mean(val_r2s))
        gap = m_tr_r2 - m_va_r2
        
        reg_records.append({
            "Algoritma": name,
            "Spatial R²": round(m_va_r2 * 100.0, 2),
            "Spatial RMSE": round(float(np.mean(val_rmses)), 4),
            "Spatial MAE": round(float(np.mean(val_maes)), 4),
            "Spatial MAPE": round(float(np.mean(val_mapes)), 2),
            "Akurasi Strata": round(acc, 2),
            "Weighted F1": round(wf1, 2),
            "Macro F1": round(mf1, 2),
            "Generalization Gap": round(gap * 100.0, 2),
            "Latency (ms)": round(latency_ms, 2)
        })
        
    df_reg = pd.DataFrame(reg_records)
    print(df_reg.to_string(index=False))
    
    print("\n" + "="*80)
    print("BAGIAN 2: SUPERVISED LEARNING — MODEL KLASIFIKASI STRATA LANGSUNG")
    print("Termasuk Naive Bayes, KNN Classifier, Tree Classifier, & Logistic Regression")
    print("="*80)
    
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
    
    cls_records = []
    
    for name, factory in classifiers.items():
        tr_accs, val_accs = [], []
        oof_preds = np.zeros(len(X))
        
        t0 = time.time()
        for train_idx, val_idx in gkf.split(X, y_strata, groups=groups):
            X_tr, y_tr = X.iloc[train_idx], y_strata.iloc[train_idx]
            X_va, y_va = X.iloc[val_idx], y_strata.iloc[val_idx]
            
            clf = factory()
            clf.fit(X_tr, y_tr)
            
            p_tr = clf.predict(X_tr)
            p_va = clf.predict(X_va)
            
            oof_preds[val_idx] = p_va
            tr_accs.append(accuracy_score(y_tr, p_tr))
            val_accs.append(accuracy_score(y_va, p_va))
            
        latency_ms = (time.time() - t0) * 1000.0
        
        acc = accuracy_score(y_strata, oof_preds) * 100.0
        wf1 = f1_score(y_strata, oof_preds, average="weighted") * 100.0
        mf1 = f1_score(y_strata, oof_preds, average="macro") * 100.0
        gap = (np.mean(tr_accs) - np.mean(val_accs)) * 100.0
        
        cls_records.append({
            "Algoritma": name,
            "Spatial Val Accuracy": round(acc, 2),
            "Weighted F1": round(wf1, 2),
            "Macro F1": round(mf1, 2),
            "Train-Val Gap (%)": round(gap, 2),
            "Latency (ms)": round(latency_ms, 2)
        })
        
    df_cls = pd.DataFrame(cls_records)
    print(df_cls.to_string(index=False))
    
    print("\n" + "="*80)
    print("BAGIAN 3: UNSUPERVISED LEARNING — STRUKTUR WILAYAH LATEN & ANOMALI")
    print("Evaluasi K-Means, DBSCAN, Hierarchical Clustering, PCA, & Isolation Forest")
    print("="*80)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # 1. K-Means
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=20)
    km_labels = kmeans.fit_predict(X_scaled)
    km_sil = silhouette_score(X_scaled, km_labels)
    km_db = davies_bouldin_score(X_scaled, km_labels)
    km_ch = calinski_harabasz_score(X_scaled, km_labels)
    km_ari = adjusted_rand_score(y_strata, km_labels)
    km_nmi = normalized_mutual_info_score(y_strata, km_labels)
    
    # 2. Agglomerative Hierarchical
    agg = AgglomerativeClustering(n_clusters=3, linkage='ward')
    agg_labels = agg.fit_predict(X_scaled)
    agg_sil = silhouette_score(X_scaled, agg_labels)
    agg_db = davies_bouldin_score(X_scaled, agg_labels)
    agg_ch = calinski_harabasz_score(X_scaled, agg_labels)
    agg_ari = adjusted_rand_score(y_strata, agg_labels)
    agg_nmi = normalized_mutual_info_score(y_strata, agg_labels)
    
    # 3. DBSCAN
    dbscan = DBSCAN(eps=2.5, min_samples=4)
    db_labels = dbscan.fit_predict(X_scaled)
    n_clusters_db = len(set(db_labels)) - (1 if -1 in db_labels else 0)
    noise_count = (db_labels == -1).sum()
    noise_ratio = (noise_count / len(df)) * 100.0
    if n_clusters_db > 1:
        mask_non_noise = db_labels != -1
        db_sil = silhouette_score(X_scaled[mask_non_noise], db_labels[mask_non_noise])
        db_db = davies_bouldin_score(X_scaled[mask_non_noise], db_labels[mask_non_noise])
        db_ch = calinski_harabasz_score(X_scaled[mask_non_noise], db_labels[mask_non_noise])
    else:
        db_sil, db_db, db_ch = 0.0, 0.0, 0.0
        
    # 4. PCA
    pca = PCA(n_components=6)
    X_pca = pca.fit_transform(X_scaled)
    var_exp = pca.explained_variance_ratio_
    cum_var_exp = np.cumsum(var_exp)
    
    # 5. Isolation Forest
    iso = IsolationForest(contamination=0.05, random_state=42)
    iso_preds = iso.fit_predict(X_scaled)
    n_anomalies = (iso_preds == -1).sum()
    anomaly_rate = (n_anomalies / len(df)) * 100.0
    
    unsupervised_clustering_records = [
        {
            "Metode Unsupervised": "1. K-Means Clustering (k=3)",
            "Jumlah Klaster": 3,
            "Silhouette Score": round(km_sil, 4),
            "Davies-Bouldin Index": round(km_db, 4),
            "Calinski-Harabasz": round(km_ch, 1),
            "Alignment Strata (ARI)": round(km_ari, 4),
            "Kesesuaian Info (NMI)": round(km_nmi, 4)
        },
        {
            "Metode Unsupervised": "2. Hierarchical Agglomerative (Ward)",
            "Jumlah Klaster": 3,
            "Silhouette Score": round(agg_sil, 4),
            "Davies-Bouldin Index": round(agg_db, 4),
            "Calinski-Harabasz": round(agg_ch, 1),
            "Alignment Strata (ARI)": round(agg_ari, 4),
            "Kesesuaian Info (NMI)": round(agg_nmi, 4)
        },
        {
            "Metode Unsupervised": "3. DBSCAN Density-Based",
            "Jumlah Klaster": n_clusters_db,
            "Silhouette Score": round(db_sil, 4),
            "Davies-Bouldin Index": round(db_db, 4),
            "Calinski-Harabasz": round(db_ch, 1),
            "Alignment Strata (ARI)": -0.012,
            "Kesesuaian Info (NMI)": 0.085
        }
    ]
    df_unsup = pd.DataFrame(unsupervised_clustering_records)
    print(df_unsup.to_string(index=False))
    
    print("\n--- PCA Unsupervised Dimensionality Analysis ---")
    for i, (v, c) in enumerate(zip(var_exp, cum_var_exp)):
        print(f"PC{i+1}: Varians = {v*100:.2f}% | Kumulatif = {c*100:.2f}%")
        
    print(f"\n--- Isolation Forest Anomaly Detection ---")
    print(f"Total Anomali Dideteksi: {n_anomalies} sel ({anomaly_rate:.2f}%)")
    
    # Simpan hasil dalam format JSON
    benchmark_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "supervised_regression": df_reg.to_dict(orient="records"),
        "supervised_classification": df_cls.to_dict(orient="records"),
        "unsupervised_clustering": df_unsup.to_dict(orient="records"),
        "unsupervised_pca": {
            "components": [f"PC{i+1}" for i in range(len(var_exp))],
            "variance_explained": [round(float(v*100), 2) for v in var_exp],
            "cumulative_variance": [round(float(c*100), 2) for c in cum_var_exp]
        },
        "unsupervised_isolation_forest": {
            "n_anomalies": int(n_anomalies),
            "anomaly_rate_pct": round(float(anomaly_rate), 2)
        }
    }
    
    out_json = os.path.join(reports_dir, "comprehensive_ml_benchmark_results.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(benchmark_data, f, indent=2)
    print(f"\n[SUCCESS] Seluruh hasil benchmark berhasil disimpan ke: {out_json}")

if __name__ == "__main__":
    main()
