"""
Domain Layer: Entities & Value Objects
Enterprise Clean Architecture for MAPID WebGIS Competition 2026.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass(frozen=True)
class TransitHub:
    """Entitas simpul transportasi massal (KAI, Commuter, Bus Terminal, Whoosh)."""
    name: str
    station_type: str
    lat: float
    lon: float

@dataclass
class H3SpatialCell:
    """Entitas sel heksagon Uber H3 sebagai unit analisis spasial terkecil."""
    cell_id: str
    block_id: str
    centroid_lat: float
    centroid_lon: float
    dist_to_transit_km: float
    nearest_transit_hub: str
    transit_accessibility_score: float
    prop_count: int = 0
    ruko_count: int = 0
    sewa_count: int = 0
    jual_count: int = 0
    struk_count: int = 0
    qris_count: int = 0
    act_count: int = 0
    traffic_issues: int = 0
    transit_positive: int = 0
    spatial_lag_prop_k1: float = 0.0
    spatial_lag_act_k1: float = 0.0
    spatial_lag_ruko_k1: float = 0.0
    potential_score: float = 0.0
    risk_index: float = 0.0
    recommendation: str = ""
    top_positive_driver: str = ""
    top_negative_driver: str = ""

@dataclass
class ValidationMetrics:
    """Value object untuk metrik evaluasi komprehensif model machine learning spasial."""
    mean_r2: float
    std_r2: float
    mean_rmse: float
    std_rmse: float
    mean_mae: float
    mean_mape: float
    classification_acc: float
    weighted_f1: float
    macro_f1: float
    generalization_gap: float
    overfitting_status: str

@dataclass
class StrataProfile:
    """Profil sebaran strata target untuk diagnosis ketimpangan data."""
    stratum_name: str
    sample_count: int
    percentage: float
    mean_error: float

@dataclass
class TrainingEpochMetrics:
    """Riwayat metrik evaluasi per epoch/boosting round."""
    epochs: List[int]
    train_rmse: List[float]
    val_rmse: List[float]
    final_epoch: int
