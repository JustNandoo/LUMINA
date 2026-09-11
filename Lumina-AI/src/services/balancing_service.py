"""
Domain Service: Data Imbalance Diagnostics & Balancing Engine
Handles target skewness, stratum profiling, and sample weighting.
"""

from typing import Tuple, List, Dict, Any
import numpy as np
import pandas as pd
from scipy.stats import skew, kurtosis
from sklearn.utils.class_weight import compute_sample_weight
from src.domain.entities import StrataProfile

class DataBalancingService:
    """Layanan untuk menganalisis dan menyeimbangkan distribusi target spasial."""

    @staticmethod
    def analyze_skewness(y: pd.Series) -> Dict[str, float]:
        """Menghitung metrik ketimpangan distribusi target."""
        return {
            "mean": float(y.mean()),
            "median": float(y.median()),
            "std": float(y.std()),
            "min": float(y.min()),
            "max": float(y.max()),
            "skewness": float(skew(y)),
            "kurtosis": float(kurtosis(y))
        }

    @staticmethod
    def create_strata(y: pd.Series) -> pd.Series:
        """Membagi target menjadi 3 strata spasial perkotaan."""
        bins = [0, 15, 30, 100]
        labels = ["Low Potential (Buffer)", "Medium Potential (Commercial)", "High Potential (TOD Peak)"]
        return pd.cut(y, bins=bins, labels=labels, include_lowest=True)

    @staticmethod
    def compute_balanced_weights(strata: pd.Series) -> np.ndarray:
        """Menghitung bobot sampel berimbang (Inverse Class Frequency)."""
        return compute_sample_weight("balanced", strata)

    @staticmethod
    def profile_strata(y_true: pd.Series, y_pred: np.ndarray) -> List[StrataProfile]:
        """Mengevaluasi akurasi dan error pada masing-masing strata data."""
        strata = DataBalancingService.create_strata(y_true)
        abs_err = np.abs(y_true - y_pred)
        
        profiles = []
        total_n = len(y_true)
        for label in strata.unique():
            mask = (strata == label)
            cnt = int(mask.sum())
            pct = round(100.0 * cnt / total_n, 2)
            m_err = round(float(abs_err[mask].mean()), 4) if cnt > 0 else 0.0
            profiles.append(StrataProfile(
                stratum_name=str(label),
                sample_count=cnt,
                percentage=pct,
                mean_error=m_err
            ))
        return sorted(profiles, key=lambda x: x.sample_count, reverse=True)
