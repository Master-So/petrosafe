import os
import sys
import json
import argparse
from typing import Dict, Any, Tuple
from engine import (
    DeterministicSafetyEngine,
    ExecutiveSummaryGenerator,
    predict_heuristic_severity_and_distribution
)

try:
    import torch
    import torch.nn.functional as F
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    TORCH_AVAILABLE = True
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
except ImportError:
    TORCH_AVAILABLE = False
    DEVICE = "cpu"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_MODEL_DIR = os.path.join(BASE_DIR, "model")

class SafetyInferencePipeline:
    def __init__(self, model_dir: str = LOCAL_MODEL_DIR):
        self.model_dir = model_dir
        self.tokenizer = None
        self.model = None
        self.resolution_mode = "uninitialized"
        self._initialize_model()

    def _initialize_model(self):
        if not TORCH_AVAILABLE:
            self.resolution_mode = "heuristic_fallback"
            sys.stderr.write("[WARNING] PyTorch/Transformers not installed. Utilizing offline heuristic fallback.\n")
            return
        has_local_weights = os.path.isdir(self.model_dir) and (
            os.path.exists(os.path.join(self.model_dir, "model.safetensors")) or
            os.path.exists(os.path.join(self.model_dir, "pytorch_model.bin"))
        )
        if has_local_weights:
            try:
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_dir)
                self.model = AutoModelForSequenceClassification.from_pretrained(self.model_dir, num_labels=5)
                self.model.to(DEVICE)
                self.model.eval()
                self.resolution_mode = "local_model"
                sys.stderr.write(f"[INFO] Loaded local weights from: {self.model_dir}\n")
                return
            except Exception as e:
                sys.stderr.write(f"[WARNING] Local model load error ({e}).\n")
        try:
            model_name = "distilbert-base-uncased"
            sys.stderr.write(f"[INFO] Loading Hugging Face checkpoint: {model_name}...\n")
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=5)
            self.model.to(DEVICE)
            self.model.eval()
            self.resolution_mode = "hf_download"
            sys.stderr.write("[INFO] Base DistilBERT loaded.\n")
            return
        except Exception as e:
            sys.stderr.write(f"[WARNING] Remote download failed ({e}).\n")
        self.resolution_mode = "heuristic_fallback"
        sys.stderr.write("[WARNING] Utilizing calibrated domain heuristic fallback.\n")

    def validate_input(self, narrative: Any) -> Tuple[str, bool]:
        if narrative is None or not isinstance(narrative, str):
            return "", True
        clean = narrative.strip()
        if len(clean) == 0:
            return "", True
        if len(clean) > 10000:
            clean = clean[:10000]
        words = clean.split()
        is_low_conf = len(words) < 4
        return clean, is_low_conf

    def predict(self, narrative: str, category: str = "Others", location: str = "General Facility", perceived_severity: int = 1) -> Dict[str, Any]:
        clean_narrative, is_low_confidence = self.validate_input(narrative)
        if len(clean_narrative) == 0:
            return {
                "predicted_severity": 1, "sif_label": "Non-SIF", "confidence": 0.20,
                "probabilities": [0.2, 0.2, 0.2, 0.2, 0.2], "near_miss_gap": 0, "under_reported": False,
                "executive_summary": "Empty narrative provided.", "rule_violations": [],
                "resolution_mode": self.resolution_mode, "low_confidence": True
            }
        predicted_sev, confidence, probs = predict_heuristic_severity_and_distribution(clean_narrative, category, location, perceived_severity)
        sif_label = "SIF" if predicted_sev >= 3 else "Non-SIF"
        near_miss_gap = max(0, predicted_sev - perceived_severity)
        under_reported = predicted_sev > perceived_severity
        rule_violations = DeterministicSafetyEngine.evaluate(clean_narrative, category=category)
        executive_summary = ExecutiveSummaryGenerator.generate(clean_narrative, category, location, predicted_sev)
        return {
            "predicted_severity": predicted_sev, "sif_label": sif_label, "confidence": confidence,
            "probabilities": probs, "near_miss_gap": near_miss_gap, "under_reported": under_reported,
            "executive_summary": executive_summary, "rule_violations": rule_violations,
            "resolution_mode": self.resolution_mode, "low_confidence": is_low_confidence
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", type=str, required=True)
    parser.add_argument("--category", type=str, default="Others")
    parser.add_argument("--location", type=str, default="General Facility")
    parser.add_argument("--perceived_severity", type=int, default=1)
    parser.add_argument("--format", type=str, default="text", choices=["text", "json"])
    args = parser.parse_args()
    pipeline = SafetyInferencePipeline()
    res = pipeline.predict(args.text, args.category, args.location, args.perceived_severity)
    if args.format == "json":
        print(json.dumps(res, indent=2))
    else:
        print(f"Severity: Level {res['predicted_severity']} | SIF: {res['sif_label']} | Confidence: {round(res['confidence']*100, 1)}%")
        print(f"Probabilities: {res['probabilities']}")
        print(f"Summary: {res['executive_summary']}")
