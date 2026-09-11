"""Modul fine-tuning hyperparameter Spatial XGBoost menggunakan Spatial Block CV."""

import os
import sys
import json
import time
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import GroupKFold
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
import shap

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)

from src.domain.entities import TransitHub
from src.repositories.geo_repository import LocalGeoJsonRepository
from src.services.spatial_feature_engineering import SpatialFeatureEngineeringService
from src.services.balancing_service import DataBalancingService


def run_fine_tuning():
    print("[INFO] Memulai fine-tuning hyperparameter Spatial XGBoost...")

    raw_dir = os.path.join(BASE_DIR, "data", "raw")
    models_dir = os.path.join(BASE_DIR, "models")
    reports_dir = os.path.join(BASE_DIR, "reports")

    os.makedirs(models_dir, exist_ok=True)
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

    features = engineer.get_feature_names()

    X = df[features]
    y = df["target_potential_score"]
    groups = df["block_id"]

    configs = [
        {"n_estimators": 500, "max_depth": 3, "learning_rate": 0.055, "subsample": 0.85, "colsample_bytree": 0.85, "reg_alpha": 0.03, "reg_lambda": 0.8, "min_child_weight": 1},
        {"n_estimators": 450, "max_depth": 3, "learning_rate": 0.055, "subsample": 0.85, "colsample_bytree": 0.85, "reg_alpha": 0.03, "reg_lambda": 0.8, "min_child_weight": 1},
        {"n_estimators": 550, "max_depth": 3, "learning_rate": 0.055, "subsample": 0.85, "colsample_bytree": 0.85, "reg_alpha": 0.03, "reg_lambda": 0.8, "min_child_weight": 1},
        {"n_estimators": 480, "max_depth": 3, "learning_rate": 0.050, "subsample": 0.88, "colsample_bytree": 0.85, "reg_alpha": 0.04, "reg_lambda": 0.9, "min_child_weight": 1},
        {"n_estimators": 420, "max_depth": 3, "learning_rate": 0.052, "subsample": 0.85, "colsample_bytree": 0.85, "reg_alpha": 0.03, "reg_lambda": 0.7, "min_child_weight": 1},
        {"n_estimators": 380, "max_depth": 3, "learning_rate": 0.055, "subsample": 0.85, "colsample_bytree": 0.85, "reg_alpha": 0.03, "reg_lambda": 0.8, "min_child_weight": 1},
        {"n_estimators": 450, "max_depth": 3, "learning_rate": 0.048, "subsample": 0.88, "colsample_bytree": 0.88, "reg_alpha": 0.04, "reg_lambda": 0.8, "min_child_weight": 1},
        {"n_estimators": 350, "max_depth": 4, "learning_rate": 0.045, "subsample": 0.85, "colsample_bytree": 0.85, "reg_alpha": 0.05, "reg_lambda": 1.0, "min_child_weight": 2},
        {"n_estimators": 400, "max_depth": 3, "learning_rate": 0.050, "subsample": 0.85, "colsample_bytree": 0.85, "reg_alpha": 0.04, "reg_lambda": 1.0, "min_child_weight": 1},
        {"n_estimators": 500, "max_depth": 3, "learning_rate": 0.045, "subsample": 0.85, "colsample_bytree": 0.85, "reg_alpha": 0.03, "reg_lambda": 0.8, "min_child_weight": 1},
    ]

    print(f"[INFO] Menjalankan validasi {len(configs)} kandidat konfigurasi parameter (Clean & Leak-Free)...")

    gkf = GroupKFold(n_splits=5)
    results = []

    start_time = time.time()
    for idx, params in enumerate(configs):
        p = params.copy()
        p["random_state"] = 42

        tr_r2s, va_r2s = [], []
        va_rmses, va_maes = [], []
        oof_preds = np.zeros(len(X))

        for tr_idx, va_idx in gkf.split(X, y, groups=groups):
            X_tr, y_tr = X.iloc[tr_idx], y.iloc[tr_idx]
            X_va, y_va = X.iloc[va_idx], y.iloc[va_idx]

            m = xgb.XGBRegressor(**p)
            m.fit(X_tr, y_tr)

            pr_tr = m.predict(X_tr)
            pr_va = m.predict(X_va)

            oof_preds[va_idx] = pr_va
            tr_r2s.append(r2_score(y_tr, pr_tr))
            va_r2s.append(r2_score(y_va, pr_va))
            va_rmses.append(np.sqrt(mean_squared_error(y_va, pr_va)))
            va_maes.append(mean_absolute_error(y_va, pr_va))

        mean_tr = float(np.mean(tr_r2s))
        mean_va = float(np.mean(va_r2s))
        gap = round(mean_tr - mean_va, 5)

        results.append({
            "trial_id": idx + 1,
            "params": params,
            "train_r2": round(mean_tr, 5),
            "val_r2": round(mean_va, 5),
            "std_val_r2": round(float(np.std(va_r2s)), 4),
            "val_rmse": round(float(np.mean(va_rmses)), 4),
            "val_mae": round(float(np.mean(va_maes)), 4),
            "gap": gap,
            "oof_preds": oof_preds
        })

    elapsed = time.time() - start_time
    print(f"[INFO] Eksplorasi hyperparameter selesai dalam {elapsed:.2f} detik.")

    results.sort(key=lambda x: x["val_r2"], reverse=True)

    print("\n--- Top 5 Kandidat Hasil Fine-Tuning ---")
    summary_rows = []
    for r in results[:5]:
        p = r["params"]
        summary_rows.append({
            "Trial": f"Trial {r['trial_id']}",
            "Trees": p["n_estimators"],
            "Depth": p["max_depth"],
            "LR": p["learning_rate"],
            "Subsample": p["subsample"],
            "Colsample": p["colsample_bytree"],
            "Reg L1/L2": f"{p['reg_alpha']}/{p['reg_lambda']}",
            "Spatial Val R²": f"{r['val_r2']:.5f} (±{r['std_val_r2']:.4f})",
            "RMSE": f"{r['val_rmse']:.4f}",
            "MAE": f"{r['val_mae']:.4f}",
            "Gap": f"{r['gap']:.5f}"
        })
    print(pd.DataFrame(summary_rows).to_string(index=False))

    best = results[0]
    best_params = best["params"].copy()
    best_params["random_state"] = 42

    print(f"\n--- Konfigurasi Optimal Terpilih: Trial {best['trial_id']} ---")
    print(f"Spatial Val R²             : {best['val_r2']:.5f} (±{best['std_val_r2']:.4f})")
    print(f"Spatial Val RMSE           : {best['val_rmse']:.4f}")
    print(f"Spatial Val MAE            : {best['val_mae']:.4f}")
    print(f"Train R² Score             : {best['train_r2']:.5f}")
    print(f"Generalization Gap         : {best['gap']:.5f} ({best['gap']*100:.2f}%)")

    final_model = xgb.XGBRegressor(**best_params)
    
    t0 = time.time()
    final_model.fit(X, y)
    fit_time = (time.time() - t0) * 1000.0

    t1 = time.time()
    df["final_predicted_potential_score"] = np.round(final_model.predict(X), 2)
    inference_time = (time.time() - t1) * 1000.0

    model_json_path = os.path.join(models_dir, "best_spatial_xgboost_model.json")
    final_model.save_model(model_json_path)

    print("\n--- Evaluasi Residual Berdasarkan Strata ---")
    profiles = DataBalancingService.profile_strata(y, best["oof_preds"])
    for p in profiles:
        print(f"• {p.stratum_name:32}: N={p.sample_count:3d} ({p.percentage:5.1f}%) | MAE: {p.mean_error:.4f} pts")

    explainer = shap.TreeExplainer(final_model)
    shap_vals = explainer.shap_values(X)
    mean_shap = np.mean(np.abs(shap_vals), axis=0)
    shap_importance = pd.DataFrame({
        "Feature": features,
        "Mean |SHAP Value|": mean_shap
    }).sort_values("Mean |SHAP Value|", ascending=False)

    print("\n--- Atribusi Fitur Global (SHAP) ---")
    print(shap_importance.head(5).to_string(index=False))

    report_dict = {
        "best_trial_id": best["trial_id"],
        "best_hyperparameters": best["params"],
        "spatial_val_r2": best["val_r2"],
        "spatial_val_rmse": best["val_rmse"],
        "spatial_val_mae": best["val_mae"],
        "generalization_gap": best["gap"],
        "inference_latency_ms": round(inference_time, 2),
        "top_features": shap_importance.head(5).to_dict(orient="records")
    }
    with open(os.path.join(reports_dir, "fine_tuning_final_results.json"), "w") as f:
        json.dump(report_dict, f, indent=2)

    print("[INFO] Laporan ringkasan disimpan di reports/fine_tuning_final_results.json.")


if __name__ == "__main__":
    run_fine_tuning()
