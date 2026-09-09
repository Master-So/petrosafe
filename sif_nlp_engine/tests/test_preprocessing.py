"""Unit tests for text preprocessing, proxy labeling, duplicate auditing, and splitting."""

import pandas as pd
import pytest
from src.data.preprocess import clean_text, create_proxy_label
from src.data.quality import audit_data_quality
from src.data.splitter import split_dataset


# ==============================================================================
# 1. Text Preprocessing Tests
# ==============================================================================

def test_clean_text_preserves_technical_tokens():
    """Verify that crucial equipment tags, voltages, and safety terms survive cleaning."""
    raw_text = "Maintenance on compressor K-201 and pump P-102 at 440V with LOTO in place."
    cleaned = clean_text(raw_text)
    assert "k-201" in cleaned
    assert "p-102" in cleaned
    assert "440v" in cleaned
    assert "loto" in cleaned
    assert "compressor" in cleaned


def test_clean_text_unicode_nfkc_and_whitespace():
    """Verify NFKC normalization, control code removal, and multiple whitespace collapsing."""
    raw_text = "Valve\u00a0V-204A\t\tinspection\r\nwith  zero   energy\u200b verification."
    cleaned = clean_text(raw_text)
    assert cleaned == "valve v-204a inspection with zero energy verification."


def test_clean_text_handles_empty_and_null():
    """Verify robust handling of None, empty strings, and NaN strings."""
    assert clean_text(None) == ""
    assert clean_text("") == ""
    assert clean_text("   ") == ""
    assert clean_text("nan") == ""
    assert clean_text("NaN") == ""


# ==============================================================================
# 2. Proxy Label Mapping Tests
# ==============================================================================

def test_create_proxy_label_standard_mapping():
    """Verify standard mapping: I, II, III -> 0; IV, V, VI -> 1."""
    df = pd.DataFrame({
        "report_id": ["R000001", "R000002", "R000003", "R000004", "R000005", "R000006"],
        "Potential Accident Level": ["I", "II", "III", "IV", "V", "VI"],
    })
    result = create_proxy_label(df)
    assert list(result["sif_proxy"]) == [0, 0, 0, 1, 1, 1]
    # Verify original column remains intact
    assert list(result["Potential Accident Level"]) == ["I", "II", "III", "IV", "V", "VI"]


def test_create_proxy_label_custom_config():
    """Verify configurable mapping through configuration dict."""
    df = pd.DataFrame({
        "Potential Accident Level": ["A", "B"],
    })
    custom_config = {
        "proxy_label": {
            "source_column": "Potential Accident Level",
            "target_column": "sif_proxy",
            "positive_levels": ["B"],
            "negative_levels": ["A"],
        }
    }
    result = create_proxy_label(df, config=custom_config)
    assert list(result["sif_proxy"]) == [0, 1]


def test_create_proxy_label_unexpected_level_raises_error():
    """Verify ValueError is raised if unexpected/unmapped level is encountered."""
    df = pd.DataFrame({
        "Potential Accident Level": ["I", "INVALID_LEVEL"],
    })
    with pytest.raises(ValueError, match="unexpected level"):
        create_proxy_label(df)


# ==============================================================================
# 3. Duplicate and Quality Auditing Tests
# ==============================================================================

def test_audit_exact_duplicates():
    """Verify exact duplicate rows are correctly flagged."""
    df = pd.DataFrame({
        "report_id": ["R000001", "R000002", "R000003"],
        "Potential Accident Level": ["IV", "IV", "I"],
        "sif_proxy": [1, 1, 0],
        "description_clean": ["maintenance on pump", "maintenance on pump", "inspection of valve"],
    })
    audited_df, modeling_df, metrics = audit_data_quality(df)

    # R000001 and R000002 are exact feature duplicates
    assert audited_df["is_exact_duplicate"].iloc[0] is True or audited_df["is_exact_duplicate"].iloc[0] == 1
    assert audited_df["is_exact_duplicate"].iloc[1] is True or audited_df["is_exact_duplicate"].iloc[1] == 1
    assert audited_df["is_exact_duplicate"].iloc[2] is False or audited_df["is_exact_duplicate"].iloc[2] == 0
    # In modeling dataset, duplicates should be collapsed to 1
    assert len(modeling_df) == 2


def test_audit_conflicting_labels_isolated():
    """Verify conflicting description groups are detected and excluded from modeling dataset."""
    df = pd.DataFrame({
        "report_id": ["R000001", "R000002", "R000003", "R000004"],
        "Potential Accident Level": ["I", "IV", "II", "II"],
        "sif_proxy": [0, 1, 0, 0],
        # Rows 1 & 2 have identical description but conflicting labels (0 vs 1)
        "description_clean": ["leak at flange", "leak at flange", "valid incident a", "valid incident b"],
    })
    audited_df, modeling_df, metrics = audit_data_quality(df)

    assert metrics["conflicting_description_groups_count"] == 1
    assert metrics["conflicting_rows_count"] == 2
    assert audited_df["has_label_conflict"].iloc[0] == True
    assert audited_df["has_label_conflict"].iloc[1] == True

    # Conflicting group must be completely excluded from modeling dataset
    assert "leak at flange" not in modeling_df["description_clean"].values
    assert len(modeling_df) == 2
    assert list(modeling_df["report_id"]) == ["R000003", "R000004"]


# ==============================================================================
# 4. Leakage-Safe Splitting Tests
# ==============================================================================

def test_split_dataset_disjoint_and_stratified():
    """Verify that train and test sets have disjoint IDs, disjoint texts, and preserved classes."""
    # Create synthetic dataset with 20 records (10 positive, 10 negative)
    records = []
    for i in range(20):
        records.append({
            "report_id": f"R{i+1:06d}",
            "description_clean": f"unique safety incident description {i+1}",
            "sif_proxy": 1 if i < 10 else 0,
        })
    df = pd.DataFrame(records)

    train_df, test_df, meta = split_dataset(df, test_size=0.30, random_state=42)

    # 1. Row counts: 20 * 0.7 = 14 train, 20 * 0.3 = 6 test
    assert len(train_df) == 14
    assert len(test_df) == 6

    # 2. Strict ID disjointness
    assert set(train_df["report_id"]).isdisjoint(set(test_df["report_id"]))

    # 3. Strict text disjointness
    assert set(train_df["description_clean"]).isdisjoint(set(test_df["description_clean"]))

    # 4. Classes preserved
    assert set(train_df["sif_proxy"]) == {0, 1}
    assert set(test_df["sif_proxy"]) == {0, 1}

    # 5. Stratification ratio
    assert train_df["sif_proxy"].sum() == 7
    assert test_df["sif_proxy"].sum() == 3


def test_split_dataset_fails_on_empty_text():
    """Verify split raises ValueError if empty text is detected in modeling data."""
    df = pd.DataFrame({
        "report_id": ["R000001", "R000002"],
        "description_clean": ["valid description", ""],
        "sif_proxy": [0, 1],
    })
    with pytest.raises(ValueError, match="null or empty descriptions"):
        split_dataset(df)
