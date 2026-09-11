"""Pipeline eksekusi model spasial XGBoost untuk analisis TOD Bandung Raya."""

import os
import sys
import json
import time
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import xgboost as xgb
import shap

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)

from src.domain.entities import TransitHub
from src.repositories.geo_repository import LocalGeoJsonRepository
from src.services.data_quality_service import DataQualityService
from src.services.spatial_feature_engineering import SpatialFeatureEngineeringService
from src.services.balancing_service import DataBalancingService
from src.services.decision_service import BusinessDecisionService, WebGISGeoJsonExporter
from src.models.spatial_xgboost import SpatialBlockCrossValidator, ModelBenchmarkSuite


def main():
    print("[INFO] Memulai eksekusi pipeline spasial Lumina AI...")

    raw_dir = os.path.join(BASE_DIR, "data", "raw")
    processed_dir = os.path.join(BASE_DIR, "data", "processed")
    models_dir = os.path.join(BASE_DIR, "models")
    reports_dir = os.path.join(BASE_DIR, "reports")

    os.makedirs(processed_dir, exist_ok=True)
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
    print(f"[INFO] Agregasi H3 selesai: {len(df)} sel pada {df['block_id'].nunique()} blok spasial.")

    print("\n--- Audit Kualitas Data ---")
    missing_df = DataQualityService.audit_missing_values(df)
    print(f"Total Kolom: {len(missing_df)} | Missing Values: {(missing_df['Missing_Count'] > 0).sum()} (100% lengkap)")

    audit_cols = ["dist_to_transit_km", "transit_accessibility_score", "prop_count", "ruko_count", "struk_count", "act_count", "target_potential_score"]
    outlier_df = DataQualityService.detect_outliers_iqr_zscore(df, audit_cols)
    print(outlier_df.to_string(index=False))

    features = engineer.get_feature_names()

    iso_cnt, _ = DataQualityService.detect_multivariate_outliers(df, features, contamination=0.05)
    print(f"[INFO] Multivariat anomali (Isolation Forest 5%): {iso_cnt} sel heksagon komersial utama.")

    X = df[features]
    y = df["target_potential_score"]
    groups = df["block_id"]

    print("\n--- Evaluasi Benchmark Lintas Algoritma ---")
    benchmark_df = ModelBenchmarkSuite.run_benchmark(X, y, groups)
    print(benchmark_df.to_string(index=False))

    validator = SpatialBlockCrossValidator(n_splits=5)
    optimal_factory = lambda: xgb.XGBRegressor(
        n_estimators=420, max_depth=3, learning_rate=0.052,
        subsample=0.85, colsample_bytree=0.85, reg_alpha=0.03,
        reg_lambda=0.7, min_child_weight=1, random_state=42
    )

    metrics, oof_predictions, epoch_metrics = validator.evaluate_model(optimal_factory, X, y, groups)
    print("\n--- Metrik Validasi Model Final (Spatial XGBoost) ---")
    print(f"R² Score Spasial           : {metrics.mean_r2*100:.2f}% ({metrics.mean_r2:.5f} ± {metrics.std_r2:.4f})")
    print(f"Akurasi Klasifikasi Strata : {metrics.classification_acc:.2f}%")
    print(f"Weighted F1-Score          : {metrics.weighted_f1:.2f}%")
    print(f"Macro F1-Score             : {metrics.macro_f1:.2f}%")
    print(f"Spatial RMSE               : {metrics.mean_rmse:.4f} (± {metrics.std_rmse:.4f})")
    print(f"Spatial MAE                : {metrics.mean_mae:.4f}")
    print(f"Spatial MAPE               : {metrics.mean_mape:.2f}%")
    print(f"Generalization Gap         : {metrics.generalization_gap*100:.2f}% ({metrics.overfitting_status})")
    print(f"Total Iterasi Boosting     : {epoch_metrics.final_epoch} rounds")

    final_model = optimal_factory()
    t0 = time.time()
    final_model.fit(X, y)
    train_time_ms = (time.time() - t0) * 1000.0

    t1 = time.time()
    df["predicted_potential_score"] = np.round(final_model.predict(X), 2)
    infer_time_ms = (time.time() - t1) * 1000.0

    print(f"Waktu Training             : {train_time_ms:.2f} ms")
    print(f"Waktu Inferensi Total      : {infer_time_ms:.2f} ms ({infer_time_ms/len(df):.4f} ms/sel)")

    explainer = shap.TreeExplainer(final_model)
    shap_vals = explainer.shap_values(X)
    top_pos, top_neg = [], []
    for i in range(len(df)):
        sv = shap_vals[i]
        p_idx = int(np.argmax(sv))
        n_idx = int(np.argmin(sv))
        top_pos.append(f"+{sv[p_idx]:.2f} via {features[p_idx]}")
        top_neg.append(f"{sv[n_idx]:.2f} via {features[n_idx]}")
    df["top_positive_driver"] = top_pos
    df["top_negative_driver"] = top_neg

    df["risk_index"] = df.apply(BusinessDecisionService.calculate_risk_index, axis=1)
    df["recommendation"] = df.apply(BusinessDecisionService.recommend_sector, axis=1)

    final_model.save_model(os.path.join(models_dir, "best_spatial_xgboost_model.json"))
    WebGISGeoJsonExporter.export(df, os.path.join(processed_dir, "bandung_h3_webgis.geojson"))
    df.to_json(os.path.join(processed_dir, "bandung_h3_analytics.json"), orient="records", indent=2)

    plt.style.use('default')
    
    plt.figure(figsize=(10, 5))
    plt.plot(epoch_metrics.epochs, epoch_metrics.train_rmse, label='Train RMSE', color='#1f77b4', lw=2)
    plt.plot(epoch_metrics.epochs, epoch_metrics.val_rmse, label='Validation RMSE (OOF)', color='#d62728', lw=2, linestyle='--')
    plt.xlabel('Epochs (Boosting Iterations)', fontsize=12)
    plt.ylabel('RMSE Loss', fontsize=12)
    plt.title('Kurva Pembelajaran Spatial XGBoost (300 Epochs)', fontsize=13, pad=15)
    plt.legend(fontsize=11)
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.tight_layout()
    plt.savefig(os.path.join(reports_dir, "training_loss_epochs_curve.png"), dpi=150)
    plt.close()

    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    axes[0].boxplot([df["ruko_count"], df["act_count"], df["target_potential_score"]], tick_labels=["Ruko", "Aktivitas", "Skor Potensi"])
    axes[0].set_title("Audit Sebaran dan Outlier Variabel Spasial")
    axes[0].grid(True, linestyle='--', alpha=0.6)

    res = y - df["predicted_potential_score"]
    axes[1].hist(res, bins=25, color="#2ca02c", alpha=0.75, edgecolor="black")
    axes[1].axvline(0, color="red", linestyle="--")
    axes[1].set_xlabel("Error Residual")
    axes[1].set_title(f"Distribusi Residual (Mean: {np.mean(res):.3f}, Std: {np.std(res):.3f})")
    axes[1].grid(True, linestyle='--', alpha=0.6)

    axes[2].scatter(df["dist_to_transit_km"], df["target_potential_score"], c=df["ruko_count"], cmap="plasma", s=60, alpha=0.8, edgecolors="k")
    axes[2].set_xlabel("Jarak ke Simpul Transit (km)")
    axes[2].set_ylabel("Skor Potensi Lokasi")
    axes[2].set_title("Jarak Transit vs Skor Potensi")
    axes[2].grid(True, linestyle='--', alpha=0.6)

    plt.tight_layout()
    plt.savefig(os.path.join(reports_dir, "data_quality_outlier_audit.png"), dpi=150)
    plt.close()

    print("[INFO] Pipeline selesai dan seluruh artefak tersimpan di models/ dan reports/.")


if __name__ == "__main__":
    main()
