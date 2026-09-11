"""
Data Quality Layer: Missing Value Forensics & Outlier Detection
Handles statistical outlier detection (IQR, Z-Score, Isolation Forest) and data completeness.
"""

from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

class DataQualityService:
    """Layanan audit forensik kualitas data, missing value, dan anomali spasial."""

    @staticmethod
    def audit_missing_values(df: pd.DataFrame) -> pd.DataFrame:
        """Memeriksa missing value (count & percentage) pada seluruh kolom."""
        total_rows = len(df)
        records = []
        for col in df.columns:
            null_cnt = int(df[col].isna().sum())
            null_pct = round(100.0 * null_cnt / total_rows, 2)
            records.append({
                "Column": col,
                "Missing_Count": null_cnt,
                "Missing_Pct": null_pct,
                "Dtype": str(df[col].dtype),
                "Status": "100% Clean" if null_cnt == 0 else f"{null_pct}% Missing"
            })
        return pd.DataFrame(records)

    @staticmethod
    def detect_outliers_iqr_zscore(df: pd.DataFrame, numerical_cols: List[str]) -> pd.DataFrame:
        """Mendeteksi outlier menggunakan metode rentang interkuartil (IQR) dan Z-score standard."""
        records = []
        for col in numerical_cols:
            if col not in df.columns:
                continue
            series = df[col].astype(float)
            q1 = float(series.quantile(0.25))
            q3 = float(series.quantile(0.75))
            iqr = q3 - q1
            lower_bound = round(q1 - 1.5 * iqr, 3)
            upper_bound = round(q3 + 1.5 * iqr, 3)

            iqr_outliers = series[(series < lower_bound) | (series > upper_bound)]
            
            mean = float(series.mean())
            std = float(series.std())
            z_scores = np.abs((series - mean) / (std + 1e-7))
            z_outliers = series[z_scores > 3.0]

            records.append({
                "Feature": col,
                "IQR_Lower": lower_bound,
                "IQR_Upper": upper_bound,
                "IQR_Outlier_Count": len(iqr_outliers),
                "IQR_Outlier_Pct": round(100.0 * len(iqr_outliers) / len(df), 2),
                "ZScore_Outlier_Count": len(z_outliers),
                "Domain_Interpretation": "Sinyal Sentral TOD (Bukan Noise)" if "ruko" in col or "potential" in col or "struk" in col else "Sebaran Spasial Normal"
            })
        return pd.DataFrame(records)

    @staticmethod
    def detect_multivariate_outliers(df: pd.DataFrame, feature_cols: List[str], contamination: float = 0.05) -> Tuple[int, np.ndarray]:
        """Mendeteksi outlier multivariat menggunakan algoritma Isolation Forest."""
        iso = IsolationForest(contamination=contamination, random_state=42)
        preds = iso.fit_predict(df[feature_cols])
        outlier_count = int((preds == -1).sum())
        return outlier_count, preds
