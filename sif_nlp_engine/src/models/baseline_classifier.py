"""Classical ML baselines for SIF prediction (TF-IDF + Logistic Regression / Linear SVM)."""

import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

logger = logging.getLogger(__name__)


class BaselineClassifiers:
    """Manages training and inference for classical TF-IDF text classifiers."""

    def __init__(self, random_state: int = 42) -> None:
        self.random_state = random_state

        # Pipeline 1: TF-IDF + Logistic Regression
        self.logreg_pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000, sublinear_tf=True)),
            ("clf", LogisticRegression(class_weight="balanced", random_state=self.random_state, max_iter=1000)),
        ])

        # Pipeline 2: TF-IDF + Calibrated Linear SVM (to obtain well-calibrated probabilities)
        self.svm_pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000, sublinear_tf=True)),
            ("clf", CalibratedClassifierCV(LinearSVC(class_weight="balanced", random_state=self.random_state, max_iter=2000))),
        ])

    def fit(self, texts: list, labels: np.ndarray) -> None:
        """Trains both classical baselines on training data."""
        logger.info("Training TF-IDF + Logistic Regression baseline...")
        self.logreg_pipeline.fit(texts, labels)

        logger.info("Training TF-IDF + Calibrated Linear SVM baseline...")
        self.svm_pipeline.fit(texts, labels)
        logger.info("Classical baselines fitted successfully.")

    def predict_logreg(self, texts: list, threshold: float = 0.5) -> Tuple[np.ndarray, np.ndarray]:
        """Predicts probabilities and binary decisions with Logistic Regression."""
        probs = self.logreg_pipeline.predict_proba(texts)[:, 1]
        preds = (probs >= threshold).astype(int)
        return preds, probs

    def predict_svm(self, texts: list, threshold: float = 0.5) -> Tuple[np.ndarray, np.ndarray]:
        """Predicts probabilities and binary decisions with Calibrated Linear SVM."""
        probs = self.svm_pipeline.predict_proba(texts)[:, 1]
        preds = (probs >= threshold).astype(int)
        return preds, probs

    def save(self, output_dir: str = "models/classifiers") -> None:
        """Serializes trained pipelines to disk."""
        p = Path(output_dir)
        p.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.logreg_pipeline, p / "tfidf_logreg.joblib")
        joblib.dump(self.svm_pipeline, p / "tfidf_svm.joblib")
        logger.info("Saved baseline models to %s", p.resolve())

    def load(self, model_dir: str = "models/classifiers") -> None:
        """Loads trained pipelines from disk."""
        p = Path(model_dir)
        self.logreg_pipeline = joblib.load(p / "tfidf_logreg.joblib")
        self.svm_pipeline = joblib.load(p / "tfidf_svm.joblib")
        logger.info("Loaded baseline models from %s", p.resolve())
