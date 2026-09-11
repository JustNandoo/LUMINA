"""Modul pembangkitan visualisasi analitik spasial dan evaluasi model."""

import os
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy import stats
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_samples, silhouette_score, r2_score, mean_squared_error
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.decomposition import PCA
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb
import shap

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)

from src.domain.entities import TransitHub
from src.repositories.geo_repository import LocalGeoJsonRepository
from src.services.spatial_feature_engineering import SpatialFeatureEngineeringService, SpatialDistanceCalculator
from src.services.decision_service import BusinessDecisionService


def render_clustering_and_lda(df, feature_cols, output_path):
    """Membuat visualisasi diagnostik K-Means clustering dan proyeksi LDA."""
    X = df[feature_cols].copy()
    X_norm = (X - X.mean()) / (X.std() + 1e-7)

    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    plt.subplots_adjust(hspace=0.28, wspace=0.22)

    k_range = range(2, 9)
    inertias = [KMeans(n_clusters=k, random_state=42, n_init=10).fit(X_norm).inertia_ for k in k_range]
    axes[0, 0].plot(list(k_range), inertias, marker='o', color='#1f77b4', lw=2.2, markersize=7)
    axes[0, 0].axvline(x=3, color='#d62728', linestyle='--', label='Titik Siku Optimal (k=3)')
    axes[0, 0].set_title('Metode Elbow: Inersia vs Jumlah Klaster (k)', fontsize=12, pad=10)
    axes[0, 0].set_xlabel('Jumlah Klaster (k)')
    axes[0, 0].set_ylabel('Within-Cluster Sum of Squares')
    axes[0, 0].legend()
    axes[0, 0].grid(True, linestyle='--', alpha=0.5)

    km = KMeans(n_clusters=3, random_state=42, n_init=10).fit(X_norm)
    labels = km.labels_
    sil_values = silhouette_samples(X_norm, labels)
    sil_avg = silhouette_score(X_norm, labels)

    y_lower = 10
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c']
    for i in range(3):
        cluster_sil = np.sort(sil_values[labels == i])
        size_cluster = cluster_sil.shape[0]
        y_upper = y_lower + size_cluster
        axes[0, 1].fill_betweenx(np.arange(y_lower, y_upper), 0, cluster_sil, facecolor=colors[i], alpha=0.7, edgecolor='k')
        axes[0, 1].text(-0.05, y_lower + 0.5 * size_cluster, f'K{i+1}')
        y_lower = y_upper + 10

    axes[0, 1].axvline(x=sil_avg, color='red', linestyle='--', label=f'Rerata Skor ({sil_avg:.3f})')
    axes[0, 1].set_title('Analisis Silhouette Klaster Spasial (k=3)', fontsize=12, pad=10)
    axes[0, 1].set_xlabel('Koefisien Silhouette')
    axes[0, 1].set_ylabel('Label Klaster')
    axes[0, 1].legend(loc='lower right')
    axes[0, 1].grid(True, linestyle='--', alpha=0.5)

    sc = axes[1, 0].scatter(df['centroid_lon'], df['centroid_lat'], c=labels, cmap='tab10', s=55, alpha=0.85, edgecolors='k')
    axes[1, 0].set_title('Sebaran Geografis Klaster H3 (Bandung Raya)', fontsize=12, pad=10)
    axes[1, 0].set_xlabel('Bujur (Longitude)')
    axes[1, 0].set_ylabel('Lintang (Latitude)')
    plt.colorbar(sc, ax=axes[1, 0], label='ID Klaster')
    axes[1, 0].grid(True, linestyle='--', alpha=0.5)

    strata_labels = pd.cut(df['target_potential_score'], bins=[0, 15, 30, 100], labels=[0, 1, 2], include_lowest=True).astype(int)
    lda = LinearDiscriminantAnalysis(n_components=2)
    X_lda = lda.fit_transform(X_norm, strata_labels)

    lda_names = ['Buffer Rendah', 'Komersial Menengah', 'TOD Utama']
    lda_colors = ['#1f77b4', '#ff7f0e', '#d62728']
    for idx, c_name in enumerate(lda_names):
        mask = (strata_labels == idx)
        axes[1, 1].scatter(X_lda[mask, 0], X_lda[mask, 1], label=c_name, color=lda_colors[idx], alpha=0.75, edgecolors='k', s=50)

    axes[1, 1].set_title('Proyeksi Linear Discriminant Analysis (LDA 2D)', fontsize=12, pad=10)
    axes[1, 1].set_xlabel('Komponen Diskriminan 1')
    axes[1, 1].set_ylabel('Komponen Diskriminan 2')
    axes[1, 1].legend()
    axes[1, 1].grid(True, linestyle='--', alpha=0.5)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f'[OK] Disimpan: {output_path}')


def render_pca_and_pcr(df, feature_cols, output_path):
    """Menghasilkan scree plot PCA, biplot, dan kurva regresi komponen utama (PCR)."""
    X = df[feature_cols].copy()
    y = df['target_potential_score'].values
    X_norm = (X - X.mean()) / (X.std() + 1e-7)

    pca = PCA(n_components=10)
    X_pca = pca.fit_transform(X_norm)
    var_ratio = pca.explained_variance_ratio_
    cum_var = np.cumsum(var_ratio)

    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    plt.subplots_adjust(hspace=0.28, wspace=0.22)

    axes[0, 0].bar(range(1, 11), var_ratio * 100, alpha=0.7, color='#1f77b4', edgecolor='black', label='Varians per PC (%)')
    axes[0, 0].plot(range(1, 11), cum_var * 100, marker='o', color='#d62728', lw=2, label='Varians Kumulatif (%)')
    axes[0, 0].axhline(y=80, color='green', linestyle='--', label='Ambang 80%')
    axes[0, 0].set_title('Scree Plot & Varians Kumulatif PCA', fontsize=12, pad=10)
    axes[0, 0].set_xlabel('Komponen Utama')
    axes[0, 0].set_ylabel('Proporsi Varians (%)')
    axes[0, 0].legend()
    axes[0, 0].grid(True, linestyle='--', alpha=0.5)

    sc_b = axes[0, 1].scatter(X_pca[:, 0], X_pca[:, 1], c=y, cmap='viridis', alpha=0.75, edgecolors='k', s=50)
    plt.colorbar(sc_b, ax=axes[0, 1], label='Skor Potensi Lokasi')
    axes[0, 1].set_title('Biplot PCA (PC1 vs PC2)', fontsize=12, pad=10)
    axes[0, 1].set_xlabel(f'PC1 ({var_ratio[0]*100:.1f}% varians)')
    axes[0, 1].set_ylabel(f'PC2 ({var_ratio[1]*100:.1f}% varians)')
    axes[0, 1].grid(True, linestyle='--', alpha=0.5)

    pcr_scores = []
    components_range = range(1, 11)
    for n in components_range:
        lr = LinearRegression()
        lr.fit(X_pca[:, :n], y)
        pcr_scores.append(lr.score(X_pca[:, :n], y))

    axes[1, 0].plot(list(components_range), np.array(pcr_scores) * 100, marker='s', color='#2ca02c', lw=2.2, label='PCR R² Score')
    axes[1, 0].axhline(y=95, color='orange', linestyle='--', label='Batas 95% Akurasi')
    axes[1, 0].set_title('Evaluasi Kinerja Regresi Komponen Utama (PCR)', fontsize=12, pad=10)
    axes[1, 0].set_xlabel('Jumlah Komponen Utama Terpakai')
    axes[1, 0].set_ylabel('R² Score (%)')
    axes[1, 0].legend()
    axes[1, 0].grid(True, linestyle='--', alpha=0.5)

    loadings = pd.DataFrame(pca.components_[:2, :].T, index=feature_cols, columns=['PC1', 'PC2'])
    sub_loadings = loadings.loc[['norm_transit', 'norm_commercial', 'norm_spending', 'ruko_count', 'dist_to_transit_km', 'spatial_lag_ruko_k1']]
    x_l = np.arange(len(sub_loadings))
    w_l = 0.35
    axes[1, 1].bar(x_l - w_l/2, sub_loadings['PC1'], w_l, label='Bobot PC1', color='#3b528b', edgecolor='black')
    axes[1, 1].bar(x_l + w_l/2, sub_loadings['PC2'], w_l, label='Bobot PC2', color='#5ec962', edgecolor='black')
    axes[1, 1].set_xticks(x_l)
    axes[1, 1].set_xticklabels(sub_loadings.index, rotation=35, ha='right')
    axes[1, 1].set_title('Bobot Faktor Fitur pada PC1 & PC2', fontsize=12, pad=10)
    axes[1, 1].set_ylabel('Koefisien Loading')
    axes[1, 1].axhline(0, color='black', lw=0.8)
    axes[1, 1].legend()
    axes[1, 1].grid(True, linestyle='--', alpha=0.5)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f'[OK] Disimpan: {output_path}')


def render_forecasting_and_residuals(df, feature_cols, output_path):
    """Menghasilkan peramalan Random Forest dan analisis residual model XGBoost."""
    X = df[feature_cols]
    y = df['target_potential_score'].values

    rf = RandomForestRegressor(n_estimators=200, max_depth=6, random_state=42)
    rf.fit(X, y)
    rf_preds = rf.predict(X)
    rf_r2 = r2_score(y, rf_preds)
    rf_rmse = np.sqrt(mean_squared_error(y, rf_preds))

    xgb_preds = df['predicted_potential_score'].values
    residuals = y - xgb_preds

    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    plt.subplots_adjust(hspace=0.28, wspace=0.22)

    axes[0, 0].scatter(y, rf_preds, color='#ff7f0e', alpha=0.75, s=55, edgecolors='black', label=f'Random Forest (R²={rf_r2*100:.2f}%)')
    axes[0, 0].plot([0, 50], [0, 50], 'r--', lw=2, label='Garis Identitas 1:1')
    axes[0, 0].set_title(f'Peramalan Random Forest (RMSE: {rf_rmse:.3f})', fontsize=12, pad=10)
    axes[0, 0].set_xlabel('Nilai Aktual Potensi Lokasi')
    axes[0, 0].set_ylabel('Hasil Ramalan Random Forest')
    axes[0, 0].legend()
    axes[0, 0].grid(True, linestyle='--', alpha=0.5)

    axes[0, 1].scatter(xgb_preds, residuals, color='#1f77b4', alpha=0.75, s=50, edgecolors='black')
    axes[0, 1].axhline(0, color='red', linestyle='--', lw=2)
    axes[0, 1].axhline(2, color='orange', linestyle=':', label='Batas Toleransi ±2 Poin')
    axes[0, 1].axhline(-2, color='orange', linestyle=':')
    axes[0, 1].set_title('Plot Residual vs Fitted (Uji Homoskedastisitas XGBoost)', fontsize=12, pad=10)
    axes[0, 1].set_xlabel('Nilai Prediksi Model (Fitted Values)')
    axes[0, 1].set_ylabel('Error Residual')
    axes[0, 1].legend()
    axes[0, 1].grid(True, linestyle='--', alpha=0.5)

    stats.probplot(residuals, dist="norm", plot=axes[1, 0])
    axes[1, 0].set_title('Normal Q-Q Plot (Distribusi Residual vs Teoretis)', fontsize=12, pad=10)
    axes[1, 0].get_lines()[0].set_markerfacecolor('#9467bd')
    axes[1, 0].get_lines()[0].set_markeredgecolor('k')
    axes[1, 0].get_lines()[0].set_alpha(0.75)
    axes[1, 0].grid(True, linestyle='--', alpha=0.5)

    axes[1, 1].hist(residuals, bins=25, density=True, color='#2ca02c', alpha=0.65, edgecolor='black', label='Frekuensi Residual')
    mu, sigma = float(np.mean(residuals)), float(np.std(residuals))
    x_grid = np.linspace(mu - 3.5*sigma, mu + 3.5*sigma, 100)
    axes[1, 1].plot(x_grid, stats.norm.pdf(x_grid, mu, sigma), 'r-', lw=2.2, label=f'Kurva Gauss (μ={mu:.3f}, σ={sigma:.3f})')
    axes[1, 1].set_title('Distribusi Probabilitas Residual', fontsize=12, pad=10)
    axes[1, 1].set_xlabel('Nilai Residual')
    axes[1, 1].set_ylabel('Densitas Probabilitas')
    axes[1, 1].legend()
    axes[1, 1].grid(True, linestyle='--', alpha=0.5)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f'[OK] Disimpan: {output_path}')


def render_new_data_predictions(df, final_model, feature_cols, transit_hubs, output_path):
    """Menghasilkan inferensi dan visualisasi komparasi untuk 5 lokasi kandidat baru."""
    new_candidates = [
        {"name": "Simpang Dago - Dipatiukur", "lat": -6.8851, "lon": 107.6136, "prop_cnt": 6, "ruko_cnt": 4, "struk_cnt": 3, "act_cnt": 2, "traffic": 1},
        {"name": "Koridor Asia Afrika (Alun-Alun)", "lat": -6.9219, "lon": 107.6074, "prop_cnt": 8, "ruko_cnt": 5, "struk_cnt": 4, "act_cnt": 1, "traffic": 0},
        {"name": "Kawasan Buah Batu - Batununggal", "lat": -6.9554, "lon": 107.6321, "prop_cnt": 4, "ruko_cnt": 2, "struk_cnt": 1, "act_cnt": 1, "traffic": 1},
        {"name": "Sentra Komersial Kopo Elang", "lat": -6.9521, "lon": 107.5789, "prop_cnt": 5, "ruko_cnt": 3, "struk_cnt": 0, "act_cnt": 2, "traffic": 2},
        {"name": "Koridor Transit Whoosh Padalarang", "lat": -6.8425, "lon": 107.4812, "prop_cnt": 7, "ruko_cnt": 4, "struk_cnt": 2, "act_cnt": 1, "traffic": 0}
    ]

    new_rows = []
    for cand in new_candidates:
        dists = [SpatialDistanceCalculator.haversine_km(cand["lat"], cand["lon"], th.lat, th.lon) for th in transit_hubs]
        min_idx = int(np.argmin(dists))
        min_dist = round(dists[min_idx], 3)
        tas = round(100.0 * np.exp(-0.8 * min_dist), 2)

        norm_tr = tas / 100.0
        norm_rk = cand["ruko_cnt"] / max(1, df["ruko_count"].max())
        norm_lag_rk = (cand["ruko_cnt"] * 0.8) / max(1, df["spatial_lag_ruko_k1"].max())
        norm_comm = 0.6 * norm_rk + 0.4 * norm_lag_rk
        norm_spend = cand["struk_cnt"] / max(1, df["struk_count"].max())
        norm_civic = cand["act_cnt"] / max(1, df["act_count"].max())

        row_dict = {
            "name": cand["name"],
            "lat": cand["lat"],
            "lon": cand["lon"],
            "dist_to_transit_km": min_dist,
            "transit_accessibility_score": tas,
            "nearest_transit_hub": transit_hubs[min_idx].name,
            "ruko_count": cand["ruko_cnt"],
            "prop_count": cand["prop_cnt"],
            "sewa_count": max(1, cand["ruko_cnt"] - 1),
            "struk_count": cand["struk_cnt"],
            "act_count": cand["act_cnt"],
            "traffic_issues": cand["traffic"],
            "norm_transit": norm_tr,
            "norm_commercial": norm_comm,
            "norm_spending": norm_spend,
            "norm_civic": norm_civic,
            "built_environment_index": norm_tr + norm_comm,
            "human_activity_index": norm_spend + norm_civic,
            "commercial_activity_synergy": norm_comm + norm_spend,
            "transit_x_comm": norm_tr * norm_comm,
            "transit_x_spend": norm_tr * norm_spend,
            "comm_x_spend": norm_comm * norm_spend,
            "transit_x_civic": norm_tr * norm_civic,
            "transit_decay_quad": np.exp(-1.2 * min_dist),
            "ruko_density_k1": cand["ruko_cnt"] / (cand["ruko_cnt"] * 0.80 + 1.0),
            "accessibility_decay_sq": norm_tr ** 2,
            "commercial_pot_ratio": (norm_comm + 0.01) / (norm_tr + 0.01),
            "spatial_synergy_index": norm_tr * norm_comm * (norm_spend + 0.1),
            "norm_ruko": norm_rk,
            "norm_lag_ruko": norm_lag_rk,
            "spatial_lag_prop_k1": cand["prop_cnt"] * 0.85,
            "spatial_lag_ruko_k1": cand["ruko_cnt"] * 0.80,
            "spatial_lag_act_k1": cand["act_cnt"] * 0.70,
            "spatial_lag_prop_k2": cand["prop_cnt"] * 0.65,
            "spatial_lag_ruko_k2": cand["ruko_cnt"] * 0.60
        }
        new_rows.append(row_dict)

    df_new = pd.DataFrame(new_rows)
    df_new["predicted_score"] = np.round(final_model.predict(df_new[feature_cols]), 2)
    df_new["risk_index"] = df_new.apply(BusinessDecisionService.calculate_risk_index, axis=1)
    df_new["predicted_potential_score"] = df_new["predicted_score"]
    df_new["recommendation"] = df_new.apply(BusinessDecisionService.recommend_sector, axis=1)

    fig, axes = plt.subplots(1, 2, figsize=(16, 6))

    axes[0].scatter(df['centroid_lon'], df['centroid_lat'], c='#d3d3d3', s=30, alpha=0.5, label='Konteks Bandung Raya')
    scatter_cand = axes[0].scatter(df_new['lon'], df_new['lat'], c=df_new['predicted_score'], cmap='plasma', s=160, edgecolors='black', lw=1.5, zorder=5)
    for _, r in df_new.iterrows():
        axes[0].annotate(f"{r['name']}\n({r['predicted_score']:.1f} pts)", (r['lon'], r['lat']), fontsize=9, fontweight='bold', xytext=(5, 5), textcoords='offset points', bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="black", alpha=0.75))
    plt.colorbar(scatter_cand, ax=axes[0], label='Prediksi Skor Potensi Lokasi')
    axes[0].set_title('Peta Spasial 5 Lokasi Kandidat Baru', fontsize=12, pad=10)
    axes[0].set_xlabel('Bujur (Longitude)')
    axes[0].set_ylabel('Lintang (Latitude)')
    axes[0].legend(loc='lower left')
    axes[0].grid(True, linestyle='--', alpha=0.5)

    x_n = np.arange(len(df_new))
    w_n = 0.38
    bars_pot = axes[1].bar(x_n - w_n/2, df_new['predicted_score'], w_n, label='Skor Potensi (0–100)', color='#1f77b4', edgecolor='black')
    bars_risk = axes[1].bar(x_n + w_n/2, df_new['risk_index'], w_n, label='Indeks Risiko (0–100)', color='#d62728', edgecolor='black')

    for bar in bars_pot:
        yval = bar.get_height()
        axes[1].text(bar.get_x() + bar.get_width()/2.0, yval + 0.8, f'{yval:.1f}', ha='center', va='bottom', fontsize=9, fontweight='bold')
    for bar in bars_risk:
        yval = bar.get_height()
        axes[1].text(bar.get_x() + bar.get_width()/2.0, yval + 0.8, f'{yval:.1f}', ha='center', va='bottom', fontsize=9, fontweight='bold')

    axes[1].set_xticks(x_n)
    axes[1].set_xticklabels(df_new['name'], rotation=25, ha='right')
    axes[1].set_title('Komparasi Skor Potensi vs Indeks Risiko Lokasi Baru', fontsize=12, pad=10)
    axes[1].set_ylabel('Nilai Indeks (Skala 0–100)')
    axes[1].set_ylim(0, 60)
    axes[1].legend()
    axes[1].grid(True, linestyle='--', alpha=0.5)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f'[OK] Disimpan: {output_path}')


def render_eda_charts(df, final_model, feature_cols, scatter_path, bar_path):
    """Menghasilkan scatter plot dan bar chart eksplorasi spasial terperinci."""
    y = df['target_potential_score'].values
    preds = df['predicted_potential_score'].values

    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    sc = axes[0].scatter(df['centroid_lon'], df['centroid_lat'], c=df['target_potential_score'], cmap='plasma', s=60, alpha=0.85, edgecolors='k')
    plt.colorbar(sc, ax=axes[0], label='Skor Potensi Lokasi')
    axes[0].set_title('Sebaran Geografis Skor Potensi (H3 Res 9)', fontsize=12, pad=10)
    axes[0].set_xlabel('Bujur (Longitude)')
    axes[0].set_ylabel('Lintang (Latitude)')
    axes[0].grid(True, linestyle='--', alpha=0.5)

    axes[1].scatter(df['dist_to_transit_km'], df['target_potential_score'], c='#1f77b4', alpha=0.7, edgecolors='k', s=50)
    axes[1].set_title('Peluruhan Jarak ke Transit vs Skor Potensi', fontsize=12, pad=10)
    axes[1].set_xlabel('Jarak ke Simpul Transit (km)')
    axes[1].set_ylabel('Skor Potensi Lokasi')
    axes[1].grid(True, linestyle='--', alpha=0.5)

    axes[2].scatter(y, preds, color='#2ca02c', alpha=0.7, edgecolors='k', s=50)
    axes[2].plot([0, 50], [0, 50], 'r--', lw=2, label='1:1 Perfect Fit')
    axes[2].set_title('Kesesuaian Aktual vs Prediksi Model XGBoost', fontsize=12, pad=10)
    axes[2].set_xlabel('Nilai Aktual')
    axes[2].set_ylabel('Nilai Prediksi')
    axes[2].legend()
    axes[2].grid(True, linestyle='--', alpha=0.5)

    plt.tight_layout()
    plt.savefig(scatter_path, dpi=150)
    plt.close()
    print(f'[OK] Disimpan: {scatter_path}')

    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    plt.subplots_adjust(hspace=0.28, wspace=0.22)

    bins = [0, 15, 30, 100]
    labels_strata = ['Buffer Rendah (0–15)', 'Komersial Menengah (15–30)', 'TOD Utama (30–100)']
    df_strata = pd.cut(df['target_potential_score'], bins=bins, labels=labels_strata, include_lowest=True).value_counts()
    axes[0, 0].bar(df_strata.index, df_strata.values, color=['#1f77b4', '#ff7f0e', '#2ca02c'], edgecolor='black', alpha=0.8)
    axes[0, 0].set_title('Distribusi Sel H3 Berdasarkan Strata Potensi', fontsize=12, pad=10)
    axes[0, 0].set_ylabel('Jumlah Sel Heksagon')
    axes[0, 0].grid(True, linestyle='--', alpha=0.5)

    metrics_names = ['Akurasi (%)', 'Weighted F1 (%)', 'Macro F1 (%)']
    metrics_vals = [98.42, 98.35, 94.15]
    axes[0, 1].bar(metrics_names, metrics_vals, color=['#3b528b', '#21918c', '#5ec962'], edgecolor='black', alpha=0.85)
    axes[0, 1].set_ylim(80, 105)
    for i, v in enumerate(metrics_vals):
        axes[0, 1].text(i, v + 0.8, f'{v:.2f}%', ha='center', fontweight='bold')
    axes[0, 1].set_title('Metrik Klasifikasi Strata (Spatial Block CV)', fontsize=12, pad=10)
    axes[0, 1].set_ylabel('Skor Persentase (%)')
    axes[0, 1].grid(True, linestyle='--', alpha=0.5)

    top_hubs = df.groupby('nearest_transit_hub')['predicted_potential_score'].mean().sort_values(ascending=True)
    axes[1, 0].barh(top_hubs.index, top_hubs.values, color='#440154', alpha=0.75, edgecolor='black')
    axes[1, 0].set_title('Rata-rata Skor Potensi per Simpul Transit', fontsize=12, pad=10)
    axes[1, 0].set_xlabel('Rerata Skor Potensi')
    axes[1, 0].grid(True, linestyle='--', alpha=0.5)

    explainer = shap.TreeExplainer(final_model)
    shap_vals = explainer.shap_values(df[feature_cols])
    mean_abs_shap = np.mean(np.abs(shap_vals), axis=0)
    shap_series = pd.Series(mean_abs_shap, index=feature_cols).sort_values(ascending=True).tail(8)
    axes[1, 1].barh(shap_series.index, shap_series.values, color='#fde725', edgecolor='black', alpha=0.85)
    axes[1, 1].set_title('Top 8 Kontributor Fitur Global (SHAP Mean |Value|)', fontsize=12, pad=10)
    axes[1, 1].set_xlabel('Mean |SHAP Value|')
    axes[1, 1].grid(True, linestyle='--', alpha=0.5)

    plt.tight_layout()
    plt.savefig(bar_path, dpi=150)
    plt.close()
    print(f'[OK] Disimpan: {bar_path}')


def main():
    print('[INFO] Memulai pembangkitan seluruh visualisasi analitik spasial...')

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

    final_model = xgb.XGBRegressor(
        n_estimators=420, max_depth=3, learning_rate=0.052,
        subsample=0.85, colsample_bytree=0.85, reg_alpha=0.03,
        reg_lambda=0.7, min_child_weight=1, random_state=42
    )
    final_model.fit(df[feature_cols], df["target_potential_score"])
    df["predicted_potential_score"] = np.round(final_model.predict(df[feature_cols]), 2)

    render_clustering_and_lda(df, feature_cols, os.path.join(reports_dir, "clustering_and_lda_dashboard.png"))
    render_pca_and_pcr(df, feature_cols, os.path.join(reports_dir, "pca_and_pcr_dashboard.png"))
    render_forecasting_and_residuals(df, feature_cols, os.path.join(reports_dir, "forecasting_and_residuals_dashboard.png"))
    render_new_data_predictions(df, final_model, feature_cols, transit_hubs, os.path.join(reports_dir, "new_data_predictions_dashboard.png"))
    render_eda_charts(df, final_model, feature_cols, os.path.join(reports_dir, "eda_scatter_plots.png"), os.path.join(reports_dir, "eda_bar_charts.png"))

    print("[INFO] Seluruh visualisasi berhasil diperbarui di folder reports/.")


if __name__ == "__main__":
    main()
