import os
import sys
import json
import argparse
from standalone_inference import SafetyInferencePipeline
from engine import OfflineMetaSummarizer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXPECTED_FILE = os.path.join(BASE_DIR, "expected_results.json")

class ModelVerifier:
    def __init__(self, expected_results_path: str = EXPECTED_FILE):
        self.pipeline = SafetyInferencePipeline()
        with open(expected_results_path, "r", encoding="utf-8") as f:
            self.expected_data = json.load(f)
        self.passed_tests = 0
        self.failed_tests = 0

    def log_pass(self, name: str, details: str = ""):
        self.passed_tests += 1
        print(f"  ✅ [PASS] {name} {details}")

    def log_fail(self, name: str, reason: str):
        self.failed_tests += 1
        print(f"  ❌ [FAIL] {name}: {reason}")

    def run_automated_suite(self) -> bool:
        print("=== SAFETY MODEL ASSERTION TEST SUITE ===")
        test_cases = self.expected_data.get("test_cases", [])
        tol = self.expected_data.get("tolerance", 0.0002)

        for case in test_cases:
            c_id = case["id"]
            name = case["name"]
            print(f"\nEvaluating: [{c_id}] {name}")
            try:
                res = self.pipeline.predict(
                    case["narrative"], case.get("category", "Others"), case.get("location", "General"), case.get("perceived_severity", 1)
                )
                probs = res.get("probabilities", [])
                if len(probs) == 5:
                    self.log_pass("Vector Dimension", "5 classes")
                else:
                    self.log_fail("Vector Dimension", f"Expected 5, got {len(probs)}")

                if abs(sum(probs) - 1.0) <= tol:
                    self.log_pass("Probability Sum", f"{sum(probs):.4f}")
                else:
                    self.log_fail("Probability Sum", f"{sum(probs)}")

                pred_sev = res.get("predicted_severity")
                valid_range = case.get("expected_severity_range", [1, 5])
                if pred_sev in valid_range:
                    self.log_pass("Severity Range", f"Level {pred_sev} in {valid_range}")
                else:
                    self.log_fail("Severity Range", f"Got Level {pred_sev}")

                sif_label = res.get("sif_label")
                expected_sif = "SIF" if case.get("expected_sif") else "Non-SIF"
                if sif_label == expected_sif:
                    self.log_pass("SIF Triage", f"Got '{sif_label}'")
                else:
                    self.log_fail("SIF Triage", f"Got '{sif_label}', expected '{expected_sif}'")

                if len(res.get("executive_summary", "")) > 15:
                    self.log_pass("Executive Summary", "Generated successfully")
                else:
                    self.log_fail("Executive Summary", "Too short or empty")
            except Exception as e:
                self.log_fail(f"Exception on {c_id}", str(e))

        total = self.passed_tests + self.failed_tests
        print(f"\nTEST SUMMARY: {self.passed_tests}/{total} Passed | {self.failed_tests} Failed")
        return self.failed_tests == 0

if __name__ == "__main__":
    verifier = ModelVerifier()
    success = verifier.run_automated_suite()
    sys.exit(0 if success else 1)
