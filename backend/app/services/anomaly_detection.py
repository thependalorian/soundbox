"""Serving layer for the unsupervised anomaly detector.

Loads the artifact produced by `ml/train_anomaly.py` if one exists and
scores transactions against it. When no artifact is present — the state the
system ships in, because no transaction history exists yet — every method
degrades to "no opinion" and the rule-based scorer in
`anomaly_scoring.py` continues to work unchanged.

Deliberately *not* a hard dependency of the scoring path: scoring must never
fail because a model file is missing.
"""

import logging
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

import numpy as np
from sqlalchemy.orm import Session

from ml.features import RegionBaselines, build_feature_row

logger = logging.getLogger(__name__)

ARTIFACT_PATH = (
    Path(__file__).resolve().parents[2] / "ml" / "artifacts" / "anomaly_isolation_forest.joblib"
)

_lock = threading.Lock()
_artifact: Optional[Dict] = None
_load_attempted = False


def _load_artifact() -> Optional[Dict]:
    """Load once, cache. Never raises — a missing or unreadable artifact is
    an expected state, not an error condition."""
    global _artifact, _load_attempted
    with _lock:
        if _load_attempted:
            return _artifact
        _load_attempted = True
        if not ARTIFACT_PATH.exists():
            logger.info(
                "No anomaly artifact at %s — scoring falls back to rules only. "
                "This is expected until ml/train_anomaly.py has been run "
                "against real transaction history.",
                ARTIFACT_PATH,
            )
            return None
        try:
            import joblib
            loaded = joblib.load(ARTIFACT_PATH)
            if loaded.get("experimental"):
                logger.warning(
                    "Refusing to load an experimental anomaly artifact; "
                    "falling back to rules only."
                )
                return None
            _artifact = loaded
            logger.info(
                "Loaded anomaly model %s v%s (trained %s on %d rows)",
                loaded.get("model_name"), loaded.get("model_version"),
                loaded.get("trained_at"), loaded.get("n_training_rows", 0),
            )
        except Exception as e:
            logger.error("Could not load anomaly artifact, using rules only: %s", e)
            _artifact = None
        return _artifact


def is_available() -> bool:
    """Whether a usable trained model is loaded. The UI reads this to decide
    whether to describe scoring as rule-based or model-assisted — it must
    never claim a model is in play when it is not."""
    return _load_artifact() is not None


def describe() -> Dict:
    """Model provenance for display and for the /analytics/ask tool surface."""
    artifact = _load_artifact()
    if artifact is None:
        return {
            "available": False,
            "method": "rule_based_only",
            "reason": "No trained anomaly model. Scores come from the "
                      "transparent rule scorer; see backend/ml/README.md.",
        }
    return {
        "available": True,
        "method": "rules_plus_isolation_forest",
        "modelName": artifact.get("model_name"),
        "modelVersion": artifact.get("model_version"),
        "trainedAt": artifact.get("trained_at"),
        "trainingRows": artifact.get("n_training_rows"),
    }


def score_transaction(
    db: Session,
    organization_id,
    merchant_id,
    amount: float,
    occurred_at: Optional[datetime] = None,
    baselines: Optional[RegionBaselines] = None,
) -> Optional[Dict]:
    """Score one transaction for anomaly.

    Returns None when no model is loaded — callers must treat that as "no
    signal", not as "not anomalous".
    """
    artifact = _load_artifact()
    if artifact is None:
        return None

    try:
        occurred_at = occurred_at or datetime.utcnow()
        resolved_baselines = baselines
        if resolved_baselines is None:
            resolved_baselines = RegionBaselines(db, organization_id)
            resolved_baselines.load()

        row = build_feature_row(
            db, organization_id, merchant_id, amount, occurred_at, resolved_baselines
        ).reshape(1, -1)

        raw = float(artifact["model"].score_samples(row)[0])

        # Normalise into 0-1 against the training distribution, where 1 is
        # maximally anomalous. p01 is the floor rather than the observed
        # minimum so a single extreme training outlier cannot compress the
        # whole scale.
        lo = artifact.get("score_p01", artifact.get("score_min", raw))
        hi = artifact.get("score_max", raw)
        if hi == lo:
            normalized = 0.0
        else:
            normalized = float(np.clip((hi - raw) / (hi - lo), 0.0, 1.0))

        return {
            "anomalyScore": round(normalized, 4),
            "isAnomaly": bool(artifact["model"].predict(row)[0] == -1),
            "modelName": artifact.get("model_name"),
            "modelVersion": artifact.get("model_version"),
        }
    except Exception as e:
        logger.error("Anomaly scoring failed, ignoring model signal: %s", e)
        return None
