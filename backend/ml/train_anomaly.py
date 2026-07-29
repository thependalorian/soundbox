"""Train the unsupervised anomaly detector.

Run:  python -m ml.train_anomaly  (from backend/, with the venv active)

Unsupervised by construction: IsolationForest isolates points that are
easy to separate from the rest of the data. It needs no labels at all, which is
what makes it the right first model here — no confirmed outcomes exist, and
none will until reviewers have triaged real alerts for a while.

The script refuses to write an artifact below MIN_TRANSACTIONS. A model
fitted on a handful of rows would produce confident-looking scores with no
statistical basis, which is worse than having no model: it would be shown to
a regulator as though it meant something.
"""

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from app.db.helpers import get_or_create_organization
from app.db.session import SessionLocal
from ml.features import FEATURE_NAMES, build_training_matrix

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("train_anomaly")

ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
ARTIFACT_PATH = ARTIFACT_DIR / "anomaly_isolation_forest.joblib"

MODEL_NAME = "isolation_forest_anomaly"
MODEL_VERSION = "1.0.0"

# Below this, an IsolationForest's notion of "normal" is not meaningfully
# different from noise. 2,000 is a working floor, not a guarantee of quality
# — see README.md for how to decide the real threshold from the data.
MIN_TRANSACTIONS = 2000

# Expected share of anomalies. Deliberately conservative: every flagged
# transaction costs an analyst's attention, and an alert queue nobody can
# work through is the most common way this kind of tooling fails.
CONTAMINATION = 0.01


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="Train even below MIN_TRANSACTIONS. Writes to a -experimental "
             "artifact name that the serving layer will not load.",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        organization = get_or_create_organization(db)
        logger.info("Building feature matrix...")
        X, txn_ids = build_training_matrix(db, organization.id)
        n = X.shape[0]
        logger.info("Transactions available: %d (features: %d)", n, len(FEATURE_NAMES))

        if n < MIN_TRANSACTIONS and not args.force:
            logger.error(
                "Refusing to train: %d transactions available, %d required.\n"
                "This is the expected state until the platform has processed "
                "real traffic. The rule-based scorer in "
                "app/services/anomaly_scoring.py remains in effect and is "
                "fully functional; nothing is degraded by this.\n"
                "Re-run once data accumulates, or pass --force to produce an "
                "experimental artifact (which the API will not load).",
                n, MIN_TRANSACTIONS,
            )
            return 1

        logger.info("Fitting IsolationForest (contamination=%.3f)...", CONTAMINATION)
        model = IsolationForest(
            n_estimators=200,
            contamination=CONTAMINATION,
            max_samples="auto",
            random_state=42,   # reproducible artifacts
            n_jobs=-1,
        )
        model.fit(X)

        # score_samples: lower = more anomalous. Persist the training
        # distribution so serving can normalise a raw score into 0-1 without
        # re-reading the training set.
        scores = model.score_samples(X)
        artifact = {
            "model": model,
            "feature_names": FEATURE_NAMES,
            "model_name": MODEL_NAME,
            "model_version": MODEL_VERSION,
            "trained_at": datetime.utcnow().isoformat(),
            "n_training_rows": int(n),
            "contamination": CONTAMINATION,
            "score_min": float(np.min(scores)),
            "score_max": float(np.max(scores)),
            "score_p01": float(np.percentile(scores, 1)),
            "score_p05": float(np.percentile(scores, 5)),
            "experimental": bool(n < MIN_TRANSACTIONS),
        }

        ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
        path = ARTIFACT_PATH
        if artifact["experimental"]:
            path = ARTIFACT_DIR / "anomaly_isolation_forest-experimental.joblib"
        joblib.dump(artifact, path)

        logger.info("Wrote %s", path)
        logger.info(
            "Flagged %d of %d training rows at the chosen contamination.",
            int((model.predict(X) == -1).sum()), n,
        )
        if artifact["experimental"]:
            logger.warning(
                "EXPERIMENTAL artifact — trained below the minimum. The API "
                "will not load this. Do not present its output as validated."
            )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
