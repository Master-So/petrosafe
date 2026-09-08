================================================================================
AI Incident & Safety Intelligence Model Bundle (v1.0.0)
================================================================================

This distribution package contains the standalone models and testing suite for
Industrial SIF vs. Non-SIF Triage.

QUICK START:
1. Install minimal dependencies:
   pip install -r requirements_standalone.txt

2. Verify file integrity:
   python verify_bundle.py

3. Run assertion-based test suite:
   python test_models.py --mode auto

4. Run inference on custom narrative:
   python standalone_inference.py --text "Contractor fell from 4m height without harness" --category "Fall from height"

MODELS INCLUDED:
- Model 1 (Severity Classifier): DistilBERT 5-class sequence classifier predicting
  Severity Levels 1 to 5, mapped to SIF (Levels 3-5) vs. Non-SIF (Levels 1-2).
  Includes zero-VRAM calibrated heuristic fallback.
- Model 2 (Safety Intelligence & Summarizer): Extractive NLP narrative generator
  for single incidents + TF-IDF multi-incident cohort summarizer generating
  executive assessments, failure vectors, and actionable directives.
