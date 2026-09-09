# OIL SIF Precursor Detection Engine (Backend)

**Problem Statement ID:** 26165  
**Title:** AI/NLP Engine to Detect Serious Injury & Fatality (SIF) Precursors in OIL's Unsafe-Act/Unsafe-Condition and Near-Miss Reports  
**Organization:** Oil India Limited (OIL)  
**Component:** Backend AI/NLP & REST API Engine (Frontend is managed independently by another team).

---

> [!WARNING]
> **DEVELOPMENT PROXY LABEL CAVEAT**:  
> "The current SIF label is a development proxy derived from Potential Accident Level (I, II, III → 0; IV, V, VI → 1) and is not an official OIL/IOGP SIF classification."  
> All probability outputs represent model confidence estimates and prototype risk scores, not official probability claims that an accident will occur.

---

## 1. System Architecture

```text
                    SAFETY REPORT
                          │
                    PREPROCESSING (NFKC, conservative token preservation)
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
      EMBEDDING        SAFETY RULES     STRUCTURED
       MODEL            ENGINE         EXTRACTION
  (BGE / MiniLM)  (Precursors, Barriers) (Equipment, ID, Activity, Hazards)
          │               │                │
          ▼               ▼                ▼
        FAISS       IOGP LIFE-SAVING     HAZARDS &
       RETRIEVAL       RULE MAPPER       EXPOSURES
          │
          ▼
      WEIGHTED kNN
          │
          └───────────────┬────────────────┘
                          ▼
                   SIF RISK ENGINE (Multi-factor prototype scoring)
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
          SIF SCORE   IOGP RULE   EXPLANATIONS
                          │
                          ▼
                   PATTERN ENGINE (Multidimensional historical aggregation)
                          │
                          ▼
                    REST APIs (FastAPI)
                          │
                          ▼
                    FRONTEND TEAM
```

---

## 2. Directory Structure

```text
sif_backend/
├── README.md
├── requirements.txt
├── config.yaml
├── .env.example
├── .gitignore
├── data/
│   ├── raw/
│   └── processed/
│       ├── cleaned_all_reports.csv
│       ├── modeling_data.csv
│       ├── train.csv
│       └── test.csv
├── models/
│   ├── embeddings/
│   ├── classifiers/
│   └── metadata/
├── artifacts/
│   ├── vector_store/
│   ├── evaluation/
│   └── patterns/
├── outputs/
│   └── eda/
├── src/
│   ├── data/
│   ├── embeddings/
│   ├── vectorstore/
│   ├── models/
│   ├── safety/
│   ├── extraction/
│   ├── risk/
│   ├── analytics/
│   ├── pipeline/
│   └── evaluation/
├── api/
│   ├── main.py
│   ├── schemas.py
│   └── routes/
├── scripts/
│   ├── 01_eda.py
│   ├── 02_prepare_data.py
│   ├── 03_build_embeddings.py
│   ├── 04_build_faiss.py
│   ├── 05_train.py
│   ├── 06_evaluate.py
│   └── 07_build_patterns.py
└── tests/
```

---

## 3. End-to-End Setup and Execution in WSL

### A. Environment Setup
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### B. Place Dataset
```bash
mkdir -p data/raw data/processed outputs/eda
cp /mnt/c/Users/arjun/Downloads/IHMStefanini_industrial_safety_and_health_database_with_accidents_description.csv data/raw/
```

### C. Execute Data & Modeling Pipeline

```bash
# 1. Exploratory Data Analysis & Quality Audit
python scripts/01_eda.py

# 2. Data Preparation & Leakage-Safe 70/30 Split
python scripts/02_prepare_data.py

# 3. Build Semantic Embeddings (BGE & MiniLM)
python scripts/03_build_embeddings.py

# 4. Build FAISS Vector Retrieval Index (Training Set Only)
python scripts/04_build_faiss.py

# 5. Train Classical Baselines & Tune Weighted kNN (5-Fold CV)
python scripts/05_train.py

# 6. Comprehensive Evaluation on Untouched Test Partition (N=123)
python scripts/06_evaluate.py

# 7. Build Historical Precursor Pattern Aggregations
python scripts/07_build_patterns.py
```

### D. Launch the REST API
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger Documentation available at: `http://localhost:8000/docs`.

---

## 4. REST API Reference

### `POST /predict`
Submit an incident description to obtain comprehensive AI/NLP safety intelligence.

**Request:**
```json
{
  "text": "During maintenance of compressor K-201, the equipment was opened before confirming zero energy isolation. Residual pressure was released and workers were standing near the discharge line.",
  "top_k_similar": 5
}
```

**Response:**
```json
{
  "sif_potential": true,
  "sif_probability": 0.8950,
  "risk_score": 80,
  "risk_category": "CRITICAL",
  "activity": "Maintenance",
  "equipment": {
    "name": "Compressor",
    "equipment_type": "Compressor",
    "equipment_id": "K-201"
  },
  "hazards": ["Stored Energy", "Pressure"],
  "exposures": ["Line of Fire", "Pressure Release"],
  "barrier_failures": ["Isolation not verified"],
  "precursors": ["Energy Exposure", "Isolation Failure", "Line of Fire"],
  "iogp_rules": ["Energy Isolation", "Line of Fire"],
  "similar_reports": [
    {
      "report_id": "R000124",
      "similarity": 0.9123,
      "sif_proxy": 1,
      "description": "..."
    }
  ],
  "explanation": [
    "Historical similarity model indicates high SIF-potential characteristics (model confidence: 0.90).",
    "Detected Isolation Failure precursor based on domain keywords: 'zero energy isolation'.",
    "Identified safety barrier breakdown (Isolation not verified): \"equipment was opened before confirming zero energy isolation\".",
    "Mapped to relevant IOGP Life-Saving Rule(s): Energy Isolation, Line of Fire."
  ],
  "model_metadata": {
    "model_version": "0.1.0",
    "embedding_model": "BAAI/bge-small-en-v1.5",
    "label_type": "development_proxy",
    "disclaimer": "The current SIF label is a development proxy derived from Potential Accident Level and is not an official OIL/IOGP SIF classification."
  }
}
```

### `POST /similar-reports`
Retrieve nearest historical training incidents using cosine vector similarity.

### `GET /patterns?dimension=equipment`
Retrieve aggregated precursor density and SIF rates across operational dimensions (`equipment`, `activity`, `site`, `hazard`, `iogp_rule`).

### `GET /health`
Liveness probe and model runtime status.

### `GET /metadata`
Operational dimensions, model version, and regulatory caveats for frontend forms.

### `GET /evaluation`
Benchmark performance across all models on the untouched test partition.

---

## 5. Running the Test Suite
```bash
pytest -v
```
Covers:
- `tests/test_preprocessing.py`: NFKC normalization, technical token preservation, proxy labeling, conflict isolation, and leakage-safe splitting.
- `tests/test_embeddings.py`: Vector dimensionality and L2 normalization.
- `tests/test_faiss.py`: Cosine similarity search, persistence, and index isolation.
- `tests/test_knn.py`: Similarity-weighted voting, threshold logic, and edge cases.
- `tests/test_precursors.py`: Precursor detection, barrier failures, and IOGP Life-Saving Rules mapping.
- `tests/test_equipment.py`: Equipment taxonomy, tag extraction (`K-201`), activities, and hazards.
- `tests/test_risk_engine.py`: Multi-factor risk scoring and qualitative bands (LOW, MEDIUM, HIGH, CRITICAL).
- `tests/test_api.py`: FastAPI endpoint validation, status codes, and error handling.

---

## 6. Regulatory Limitations & Future Transition
1. **Label Transition**: The backend uses parameter-based configuration (`config.yaml`) so that when official expert-labelled OIL safety reports become available, they can replace the proxy label without modifying any API contracts or pipeline modules.
2. **Deterministic ID Stability**: All incidents use reproducible identifiers (`report_id`: `R000001`...) across embeddings, vector retrieval, and analytics.
3. **No External LLM Hard-Dependency**: Core inference operates with SentenceTransformers, FAISS, scikit-learn, and deterministic rule engines.
