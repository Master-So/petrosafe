"""Unified end-to-end SIF prediction pipeline.

Orchestrates preprocessing, semantic embedding, FAISS similarity retrieval,
weighted kNN voting, precursor detection, entity extraction, IOGP mapping,
risk scoring, and explainability generation.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from src.data.preprocess import clean_text
from src.embeddings.embedding_engine import EmbeddingEngine
from src.extraction.event_parser import EventParser
from src.models.knn_classifier import WeightedKNNClassifier
from src.risk.sif_risk_engine import SIFRiskEngine
from src.safety.iogp_rules import map_iogp_rules
from src.safety.precursor_detector import SafetyPrecursorDetector
from src.vectorstore.faiss_store import FaissVectorStore

logger = logging.getLogger(__name__)


class PredictionPipeline:
    """End-to-end inference pipeline for incident report analysis."""

    def __init__(
        self,
        config_path: str = "config.yaml",
        model_meta_path: str = "models/metadata/model_config.json",
        faiss_index_path: str = "artifacts/vector_store/faiss_train_bge.index",
        faiss_meta_path: str = "artifacts/vector_store/faiss_train_bge_metadata.json",
    ) -> None:
        # 1. Load config
        self.config = {}
        cfg_file = Path(config_path)
        if cfg_file.exists():
            with open(cfg_file, "r", encoding="utf-8") as f:
                self.config = yaml.safe_load(f) or {}

        # 2. Load model metadata
        self.model_meta = {}
        mm_file = Path(model_meta_path)
        if mm_file.exists():
            with open(mm_file, "r", encoding="utf-8") as f:
                self.model_meta = json.load(f)

        # 3. Initialize components
        emb_model_name = self.config.get("model", {}).get("embedding_model", "BAAI/bge-small-en-v1.5")
        self.embedding_engine = EmbeddingEngine(model_name=emb_model_name)

        # Load FAISS vector store
        self.vector_store = FaissVectorStore()
        idx_p = Path(faiss_index_path)
        meta_p = Path(faiss_meta_path)
        if idx_p.exists() and meta_p.exists():
            self.vector_store.load(str(idx_p), str(meta_p))
        else:
            logger.warning("FAISS index files not found at startup. Vector retrieval will be disabled until built.")

        # Classifiers and engines
        best_k = int(self.model_meta.get("best_k", {}).get("bge", {}).get("optimal_k", 10))
        threshold = float(self.config.get("model", {}).get("threshold", 0.5))
        self.knn_classifier = WeightedKNNClassifier(k=best_k, threshold=threshold)

        self.precursor_detector = SafetyPrecursorDetector()
        self.event_parser = EventParser()
        self.risk_engine = SIFRiskEngine(config=self.config)

    def predict_report(self, text: str, top_k_similar: int = 5) -> Dict[str, Any]:
        """Analyzes a safety report and returns structured multi-dimensional intelligence.

        Args:
            text: Raw or uncleaned report description.
            top_k_similar: Number of similar historical incidents to return.

        Returns:
            Comprehensive JSON-serializable dictionary.
        """
        # 1. Conservative text cleaning
        cleaned_text = clean_text(text)
        if not cleaned_text:
            raise ValueError("Input report text is empty after normalization.")

        # 2. Semantic vector encoding
        query_vector = self.embedding_engine.encode(cleaned_text)[0]

        # 3. FAISS nearest neighbor retrieval
        similar_reports = []
        if self.vector_store.index is not None:
            raw_neighbors = self.vector_store.search(query_vector, top_k=max(self.knn_classifier.k, top_k_similar))
            knn_res = self.knn_classifier.predict_from_neighbors(raw_neighbors)
            sif_potential = knn_res["sif_potential"]
            sif_probability = knn_res["sif_probability"]

            for item in raw_neighbors[:top_k_similar]:
                similar_reports.append({
                    "report_id": item.get("report_id"),
                    "similarity": round(float(item.get("similarity", 0.0)), 4),
                    "sif_proxy": int(item.get("sif_proxy", 0)),
                    "description": item.get("description_clean", ""),
                })
        else:
            sif_potential = False
            sif_probability = 0.0

        # 4. Safety precursor detection & barrier failures
        precursor_objs = self.precursor_detector.detect_precursors(cleaned_text)
        barrier_objs = self.precursor_detector.detect_barrier_failures(cleaned_text)

        precursor_names = [p["name"] for p in precursor_objs]
        barrier_failure_types = [b["type"] for b in barrier_objs]

        # 5. Entity & attribute extraction (Equipment, Activity, Hazards, Exposures)
        parsed_events = self.event_parser.parse(cleaned_text)

        # 6. IOGP Life-Saving Rules mapping
        iogp_matches = map_iogp_rules(cleaned_text, detected_precursors=precursor_objs)
        iogp_rule_names = [r["rule"] for r in iogp_matches]

        # 7. Prototype multi-factor risk calculation
        risk_res = self.risk_engine.calculate_risk(precursor_objs, barrier_objs)

        # 8. Evidence-based explanation generation
        explanations = self._generate_explanations(
            precursors=precursor_objs,
            barriers=barrier_objs,
            parsed_events=parsed_events,
            iogp_rules=iogp_rule_names,
            sif_probability=sif_probability,
        )

        return {
            "sif_potential": sif_potential,
            "sif_probability": sif_probability,
            "risk_score": risk_res["risk_score"],
            "risk_category": risk_res["risk_category"],
            "activity": parsed_events["activity"],
            "equipment": parsed_events["equipment"],
            "hazards": parsed_events["hazards"],
            "exposures": parsed_events["exposures"],
            "barrier_failures": barrier_failure_types,
            "precursors": precursor_names,
            "iogp_rules": iogp_rule_names,
            "similar_reports": similar_reports,
            "explanation": explanations,
            "model_metadata": {
                "model_version": self.config.get("model", {}).get("version", "0.1.0"),
                "embedding_model": self.embedding_engine.model_name,
                "label_type": "development_proxy",
                "disclaimer": "The current SIF label is a development proxy derived from Potential Accident Level and is not an official OIL/IOGP SIF classification.",
            },
        }

    @staticmethod
    def _generate_explanations(
        precursors: List[Dict[str, Any]],
        barriers: List[Dict[str, Any]],
        parsed_events: Dict[str, Any],
        iogp_rules: List[str],
        sif_probability: float,
    ) -> List[str]:
        """Generates evidence-backed bullet explanations for HSE decision support."""
        explanations = []

        if sif_probability >= 0.5:
            explanations.append(
                f"Historical similarity model indicates high SIF-potential characteristics (model confidence: {sif_probability:.2f})."
            )

        for p in precursors:
            terms = ", ".join(f"'{t}'" for t in p.get("matched_terms", []))
            explanations.append(
                f"Detected {p['name']} precursor based on domain keywords: {terms}."
            )

        for b in barriers:
            explanations.append(
                f"Identified safety barrier breakdown ({b['type']}): \"{b.get('evidence', '')}\"."
            )

        if parsed_events.get("hazards"):
            hazards_str = ", ".join(parsed_events["hazards"])
            explanations.append(f"Identified physical hazard(s): {hazards_str}.")

        if parsed_events.get("exposures"):
            exposures_str = ", ".join(parsed_events["exposures"])
            explanations.append(f"Identified personnel exposure(s): {exposures_str}.")

        if iogp_rules:
            rules_str = ", ".join(iogp_rules)
            explanations.append(f"Mapped to relevant IOGP Life-Saving Rule(s): {rules_str}.")

        if not explanations:
            explanations.append("No critical safety precursors or high-risk exposure terms were identified in the report.")

        return explanations
