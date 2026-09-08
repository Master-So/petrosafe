import re
import math
import json
import logging
from typing import List, Dict, Tuple, Optional, Any

logger = logging.getLogger("safety_engine")

class DeterministicSafetyEngine:
    RULES = [
        {
            "id": "LSR_01_FALL_PROTECTION",
            "name": "Working at Height Without Fall Arrest",
            "hazard_regex": r"\b(height|ladder|scaffold|scaffolding|platform|roof|elevat|fall|climb|beam|deck|suspended)\b",
            "protective_regex": r"\b(harness|lanyard|lifeline|guardrail|fall arrest|tied off|safety belt|handrail)\b",
            "violation_msg": "CRITICAL: Work at height detected without verified fall arrest system, anchored harness, or guardrail."
        },
        {
            "id": "LSR_02_LOTO_LIVE_ENERGY",
            "name": "Live Energy / Pressurized Line Breach (LOTO)",
            "hazard_regex": r"\b(pressur|pipe|valve|flange|steam|hydraulic|depressur|uncoupl|440v|voltage|breaker|electrical|energiz)\b",
            "protective_regex": r"\b(lockout|tagout|loto|isolated|depressurized|de-energized|zero energy|verified isolation|grounding)\b",
            "violation_msg": "CRITICAL: Maintenance on pressurized or energized system without verified LOTO, isolation, or depressurization."
        },
        {
            "id": "LSR_03_MOBILE_EQUIPMENT",
            "name": "Mobile Equipment / Vehicle Interaction Zone",
            "hazard_regex": r"\b(forklift|loader|truck|jumbo|crane|vehicle|reversing|haul truck|excavator|tractor)\b",
            "protective_regex": r"\b(barricade|exclusion zone|spotter|clearance|seatbelt|flashing light|pedestrian barrier|chock)\b",
            "violation_msg": "HIGH RISK: Heavy mobile equipment or crane operation without pedestrian exclusion zone, spotter clearance, or chocks."
        },
        {
            "id": "LSR_04_CHEMICAL_EXPOSURE",
            "name": "Hazardous Chemical Handling Without Primary Barrier",
            "hazard_regex": r"\b(acid|chemical|sulphide|sulfide|caustic|toxic|bioxide|splash|solvent|cyanide|reagent|dust)\b",
            "protective_regex": r"\b(chemical apron|face shield|nitrile|neoprene gloves|eyewash|respirator|fume hood|ppe)\b",
            "violation_msg": "HIGH RISK: Toxic or corrosive substance manipulation without full face shield, chemical gloves, or active eyewash access."
        },
        {
            "id": "LSR_05_CONFINED_SPACE",
            "name": "Confined Space Entry Without Atmospheric Testing",
            "hazard_regex": r"\b(confined space|tank|silo|tunnel|manhole|vessel|sump|chute)\b",
            "protective_regex": r"\b(gas test|gas detector|atmospheric test|continuous ventilation|entry permit|standby person)\b",
            "violation_msg": "CRITICAL: Confined space entry initiated without documented atmospheric gas testing, ventilation, or standby permit."
        },
        {
            "id": "LSR_06_SUSPENDED_LOADS",
            "name": "Personnel Within Suspended Load Zone",
            "hazard_regex": r"\b(suspended load|hoist|winch|rigging|overhead crane|slings|pulley)\b",
            "protective_regex": r"\b(exclusion area|no go zone|chocked|tagline|secured load|barricaded)\b",
            "violation_msg": "CRITICAL: Personnel positioning directly beneath or within the uncontrolled swing radius of a suspended load."
        }
    ]

    @classmethod
    def evaluate(cls, narrative: str, category: str = "") -> List[str]:
        if not narrative:
            return []
        combined_text = f"{category} {narrative}".lower()
        violations = []
        for rule in cls.RULES:
            has_hazard = re.search(rule["hazard_regex"], combined_text, re.IGNORECASE)
            has_protection = re.search(rule["protective_regex"], combined_text, re.IGNORECASE)
            explicit_breach = re.search(
                rf"(without|no|lack of|failed to|unverified|did not wear|did not use)\s+[a-z\s]*{rule['protective_regex']}",
                combined_text,
                re.IGNORECASE
            )
            if (has_hazard and not has_protection) or explicit_breach:
                violations.append(rule["violation_msg"])
        return violations

class ExecutiveSummaryGenerator:
    EQUIPMENT_PATTERNS = [
        r"\b(jumbo \d+|pump \d+|crane \w*|forklift|loader|silo truck|scaffolding|valve|pipe \w*|conveyor|winch|drill rod|pulley|electric board|transformer|filter|grinder|compressor)\b"
    ]

    @classmethod
    def generate(cls, narrative: str, category: str, location: str, predicted_severity: int) -> str:
        if not narrative or len(narrative.strip()) == 0:
            return f"Incident logged at {location} in category '{category}'. No detailed narrative provided."
        clean_text = narrative.strip().replace("\n", " ").replace("\r", " ")
        clean_text = re.sub(r"\s+", " ", clean_text)
        raw_sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", clean_text) if len(s.strip()) > 5]
        if not raw_sentences:
            raw_sentences = [clean_text]
        equipment_found = "industrial equipment"
        for p in cls.EQUIPMENT_PATTERNS:
            match = re.search(p, clean_text, re.IGNORECASE)
            if match:
                equipment_found = match.group(0).strip()
                break
        outcome_sentence = ""
        for s in reversed(raw_sentences):
            if any(re.search(p, s, re.IGNORECASE) for p in [r"injury", r"hospital", r"burn", r"wound", r"first aid", r"clinic", r"struck", r"fell", r"fracture", r"spill"]):
                outcome_sentence = s
                break
        if not outcome_sentence:
            outcome_sentence = raw_sentences[-1] if raw_sentences else "Personnel received immediate evaluation."
        first_sentence = raw_sentences[0]
        if len(first_sentence) > 140:
            first_sentence = first_sentence[:137] + "..."
        sif_status = "SIF-Level Event (High Inherent Potential)" if predicted_severity >= 3 else "Non-SIF Event (Contained Operational Hazard)"
        return (
            f"At {location} during operations involving {category.lower()} ({equipment_found}), "
            f"{first_sentence.rstrip('.')}. "
            f"AI evaluation rates this as a {sif_status}. Immediate outcome: {outcome_sentence.rstrip('.')}."
        )

def predict_heuristic_severity_and_distribution(narrative: str, category: str, location: str, perceived_severity: int) -> Tuple[int, float, List[float]]:
    text = f"{category} {narrative}".lower()
    crit_high = len(re.findall(r"\b(fatal|death|amputat\w*|flash|explosion|440v|crushed|severe burn|unconscious|skull|internal|multiple fracture|ruptur\w*|collaps\w*)\b", text))
    crit_med = len(re.findall(r"\b(fall\w*|fell|fractur\w*|burn\w*|hospital|spill\w*|pressur\w*|depressur\w*|acid\w*|chemical\w*|sulphid\w*|sulfid\w*|suspended|struck by|uncontrolled|deep laceration|silo|scaffold\w*|height)\b", text))
    crit_low = len(re.findall(r"\b(first aid|scratch\w*|small wound|slip\w*|slipped|trip\w*|minor|excoriation|bruise\w*|pinched|irritation|foreign body)\b", text))
    base_scores = [0.60, 0.16, 0.11, 0.09, 0.04]
    if crit_high > 0:
        base_scores = [0.03, 0.07, 0.15, 0.42, 0.33]
    elif crit_med >= 2:
        base_scores = [0.05, 0.12, 0.38, 0.35, 0.10]
    elif crit_med == 1:
        base_scores = [0.10, 0.20, 0.40, 0.22, 0.08]
    elif crit_low > 0:
        base_scores = [0.72, 0.18, 0.06, 0.03, 0.01]
    if crit_high == 0 and crit_med == 0:
        idx = max(0, min(4, perceived_severity - 1))
        base_scores[idx] += 0.22
    total = sum(base_scores)
    probs = [round(float(s / total), 4) for s in base_scores]
    norm_sum = sum(probs)
    probs[-1] = round(probs[-1] + (1.0 - norm_sum), 4)
    predicted_class = int(probs.index(max(probs))) + 1
    confidence = float(max(probs))
    return predicted_class, confidence, probs

class OfflineMetaSummarizer:
    STOP_WORDS = {
        "the", "and", "in", "of", "to", "was", "at", "a", "when", "with", "for", "on", "as",
        "is", "by", "that", "this", "it", "from", "an", "were", "be", "or", "his", "her",
        "employee", "collaborator", "worker", "technician", "reported", "causing", "during",
        "which", "after", "into", "area", "approximately", "moment", "while", "then", "there"
    }
    @classmethod
    def generate_report(cls, incidents: List[Any], focus_area: Optional[str] = None) -> Dict[str, Any]:
        total_count = len(incidents)
        if total_count == 0:
            return {
                "incident_count": 0, "sif_count": 0, "sif_rate_pct": 0.0,
                "executive_trend_assessment": "No records found.",
                "primary_failure_vectors": ["No active risk data available."],
                "actionable_prevention_directives": ["Maintain standard safety observation."]
            }
        sif_incidents = [i for i in incidents if getattr(i, "sif_label", "") == "SIF" or getattr(i, "predicted_severity", 0) >= 3]
        sif_count = len(sif_incidents)
        sif_rate = round((sif_count / max(1, total_count)) * 100.0, 1)
        under_reported_count = sum(1 for i in incidents if getattr(i, "under_reported", False))
        categories, locations, rule_counts = {}, {}, {}
        for inc in incidents:
            cat = getattr(inc, "category", "Others")
            loc = getattr(inc, "location", "Unknown")
            raw_rules = getattr(inc, "rule_violations", "[]")
            categories[cat] = categories.get(cat, 0) + 1
            locations[loc] = locations.get(loc, 0) + 1
            if raw_rules:
                try:
                    r_list = json.loads(raw_rules) if isinstance(raw_rules, str) else raw_rules
                    for r in r_list:
                        rule_counts[r] = rule_counts.get(r, 0) + 1
                except Exception:
                    pass
        top_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:3]
        top_locations = sorted(locations.items(), key=lambda x: x[1], reverse=True)[:2]
        top_cat_str = ", ".join([f"{cat} ({cnt} events)" for cat, cnt in top_categories]) if top_categories else "General Industrial Operations"
        top_loc_str = ", ".join([f"{loc} ({cnt} events)" for loc, cnt in top_locations]) if top_locations else "All Plants"
        trend_assessment = (
            f"Cohort analysis across {total_count} safety events reveals a SIF exposure rate of {sif_rate}% "
            f"({sif_count} critical potential events), with {under_reported_count} cases identified as under-reported near-misses. "
            f"Operational vulnerability is clustered in {top_cat_str}, with site concentration at {top_loc_str}."
        )
        failure_vectors = []
        if rule_counts:
            for r_text, count in sorted(rule_counts.items(), key=lambda x: x[1], reverse=True)[:3]:
                clean_rule = r_text.replace("CRITICAL: ", "").replace("HIGH RISK: ", "")
                failure_vectors.append(f"{clean_rule} (Breached {count} times across cohort)")
        if len(failure_vectors) < 3:
            for cat, count in top_categories:
                pct = round((count / max(1, total_count)) * 100, 1)
                failure_vectors.append(f"Recurring barrier breakdown in '{cat}' operations ({count} events, {pct}% of cohort).")
        clean_site = top_loc_str.split('(')[0].strip() if top_locations else "target plants"
        prevention_directives = [
            f"Mandate pre-task dynamic risk assessments (LOTO & zero-energy line breaking) at {clean_site}.",
            "Implement mandatory dual-verification permits for suspended loads or pressurized fluid corridors.",
            "Conduct leadership safety stand-downs focusing on the 5-tier SIF triage criteria to address reporting gaps.",
            "Institute strict weekly field audits of PPE compliance (face shields, cut-resistant gloves) in maintenance bays."
        ]
        return {
            "incident_count": total_count,
            "sif_count": sif_count,
            "sif_rate_pct": sif_rate,
            "executive_trend_assessment": trend_assessment,
            "primary_failure_vectors": failure_vectors[:3],
            "actionable_prevention_directives": prevention_directives
        }
