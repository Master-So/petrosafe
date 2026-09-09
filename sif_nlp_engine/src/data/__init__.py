"""Data ingestion, preprocessing, quality auditing, splitting, and EDA modules."""

from src.data.loader import load_raw_dataset
from src.data.preprocess import clean_text, create_proxy_label
from src.data.quality import audit_data_quality
from src.data.splitter import split_dataset
from src.data.eda import generate_eda_report, save_eda_artifacts

__all__ = [
    "load_raw_dataset",
    "clean_text",
    "create_proxy_label",
    "audit_data_quality",
    "split_dataset",
    "generate_eda_report",
    "save_eda_artifacts",
]
