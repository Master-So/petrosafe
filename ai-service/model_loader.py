"""
model_loader.py
───────────────
Responsible for discovering and initializing the pre-trained safety models
located in `/AIModels/safety_platform`.

Performs eager validation at import-time so the FastAPI process fails fast
with an actionable error message if any required model artifact is missing.
"""

import os
import sys
import logging
from pathlib import Path

logger = logging.getLogger("ai_service.model_loader")

# ── Resolve paths ────────────────────────────────────────────────────────────
# ai-service/ sits next to AIModels/ under the project root.
_THIS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = _THIS_DIR.parent
AIMODELS_DIR = PROJECT_ROOT / "AIModels" / "safety_platform"

# ── Validate model directory structure ───────────────────────────────────────
_REQUIRED_FILES = ["engine.py", "standalone_inference.py", "schemas.py"]


def _validate_model_directory() -> None:
    """Check that every required model artifact exists and is readable."""
    if not AIMODELS_DIR.is_dir():
        raise FileNotFoundError(
            f"[model_loader] AIModels directory not found at: {AIMODELS_DIR}\n"
            "Ensure the /AIModels/safety_platform directory exists at the project root."
        )

    missing: list[str] = []
    for fname in _REQUIRED_FILES:
        fpath = AIMODELS_DIR / fname
        if not fpath.is_file():
            missing.append(str(fpath))
        elif not os.access(fpath, os.R_OK):
            missing.append(f"{fpath} (exists but not readable)")

    if missing:
        raise PermissionError(
            "[model_loader] Required model files are missing or unreadable:\n"
            + "\n".join(f"  • {m}" for m in missing)
        )


# Run validation eagerly on import
_validate_model_directory()

# ── Add AIModels/safety_platform to sys.path so its modules are importable ──
_sp_str = str(AIMODELS_DIR)
if _sp_str not in sys.path:
    sys.path.insert(0, _sp_str)
    logger.info("Added %s to sys.path", _sp_str)

# ── Import the inference pipeline ────────────────────────────────────────────
try:
    from standalone_inference import SafetyInferencePipeline  # type: ignore[import-untyped]
except ImportError as exc:
    raise ImportError(
        f"[model_loader] Failed to import SafetyInferencePipeline from "
        f"{AIMODELS_DIR / 'standalone_inference.py'}.\n"
        f"Original error: {exc}"
    ) from exc


# ── Singleton pipeline instance ──────────────────────────────────────────────
_pipeline_instance: SafetyInferencePipeline | None = None


def get_pipeline() -> SafetyInferencePipeline:
    """Return a lazily-initialised singleton of the inference pipeline.

    The first call constructs the pipeline (which loads model weights if
    available, or falls back to the calibrated heuristic engine).  Subsequent
    calls return the cached instance.
    """
    global _pipeline_instance
    if _pipeline_instance is None:
        logger.info("Initializing SafetyInferencePipeline …")
        try:
            _pipeline_instance = SafetyInferencePipeline()
        except Exception as exc:
            logger.critical(
                "SafetyInferencePipeline failed to initialize: %s", exc, exc_info=True
            )
            raise RuntimeError(
                "[model_loader] Could not initialize the safety inference pipeline. "
                "Check that all model files are present and dependencies are installed."
            ) from exc
        logger.info(
            "Pipeline ready  ─  resolution_mode=%s",
            _pipeline_instance.resolution_mode,
        )
    return _pipeline_instance
