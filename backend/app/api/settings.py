"""Anomaly rule configuration, over HTTP.

Reads are open to any signed-in operator: an analyst working the queue needs
to know what the queue was filtered on, and hiding that would make the alerts
harder to trust rather than the system harder to misuse. Writes are
restricted, bounded, and logged.

Every write returns the new configuration *and* the new fingerprint, because
the caller's next question is always whether scores from before the change
are still comparable. They are not, and the fingerprint is how the UI says so.
"""

import logging
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.data import cache
from app.db.helpers import get_or_create_organization
from app.db.models import User
from app.db.session import get_db
from app.services import anomaly_rule_config
from app.services.anomaly_rule_config import RuleConfigError

router = APIRouter()
logger = logging.getLogger(__name__)

# Who may change the numbers that decide what a person is asked to look at.
# A merchant can read their own alerts; they cannot set the bar those alerts
# are raised against, because the bar protects the payer as much as them.
WRITE_ROLES = ("admin", "regulator")


class RuleUpdate(BaseModel):
    enabled: Optional[bool] = None
    contribution: Optional[float] = None
    threshold: Optional[float] = None
    note: Optional[str] = Field(default=None, max_length=500)


class PolicyUpdate(BaseModel):
    value: float
    note: Optional[str] = Field(default=None, max_length=500)


@router.get("/settings/anomaly-rules")
async def get_anomaly_rules(db: Session = Depends(get_db)) -> Dict:
    """The effective rule set, the policy values, and the fingerprint."""
    try:
        org = get_or_create_organization(db)
        rules = anomaly_rule_config.load_rules(db, org.id)
        policy_values = anomaly_rule_config.load_policy(db, org.id)
        policy = [
            {**anomaly_rule_config.DEFAULT_POLICY[code], "code": code, "value": value}
            for code, value in policy_values.items()
        ]
        return {
            "rules": [{"code": code, **rule} for code, rule in sorted(
                rules.items(), key=lambda kv: kv[1].get("sort_order", 0)
            )],
            "policy": sorted(policy, key=lambda p: p.get("sort_order", 0)),
            "fingerprint": anomaly_rule_config.fingerprint(rules, policy_values),
        }
    except Exception as e:
        logger.error(f"Error loading anomaly rules: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/settings/anomaly-rules/{code}")
async def update_anomaly_rule(
    code: str,
    body: RuleUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*WRITE_ROLES)),
) -> Dict:
    changes = {k: v for k, v in body.model_dump(exclude={"note"}).items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="No changes supplied.")
    try:
        org = get_or_create_organization(db)
        rule = anomaly_rule_config.update_rule(db, org.id, code, changes, actor.display_name, body.note)
        # A cached alert rate computed under the previous thresholds is not
        # merely stale, it is misleading — it describes a policy no longer in
        # force.
        cache.invalidate("nps_dashboard")
        rules = anomaly_rule_config.load_rules(db, org.id)
        policy = anomaly_rule_config.load_policy(db, org.id)
        return {
            "rule": {"code": code, **rule},
            "fingerprint": anomaly_rule_config.fingerprint(rules, policy),
        }
    except RuleConfigError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating rule {code}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/settings/anomaly-policy/{code}")
async def update_anomaly_policy(
    code: str,
    body: PolicyUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*WRITE_ROLES)),
) -> Dict:
    try:
        org = get_or_create_organization(db)
        setting = anomaly_rule_config.update_policy(db, org.id, code, body.value, actor.display_name, body.note)
        cache.invalidate("nps_dashboard")
        rules = anomaly_rule_config.load_rules(db, org.id)
        policy = anomaly_rule_config.load_policy(db, org.id)
        return {
            "policy": {"code": code, **setting},
            "fingerprint": anomaly_rule_config.fingerprint(rules, policy),
        }
    except RuleConfigError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating policy {code}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/settings/anomaly-rules/history")
async def get_rule_history(limit: int = 50, db: Session = Depends(get_db)) -> Dict:
    """Who changed what, and when. Append-only, so this is the whole story."""
    try:
        org = get_or_create_organization(db)
        return {"changes": anomaly_rule_config.history(db, org.id, limit=min(limit, 200))}
    except Exception as e:
        logger.error(f"Error loading rule history: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/settings/anomaly-rules/preview")
async def preview_rules(db: Session = Depends(get_db)) -> Dict:
    """What the current configuration would do to the queue.

    A threshold is abstract until it is a number of alerts. This scores
    nothing new — it counts existing alerts against the current review
    threshold, so an operator can see the consequence of a change before
    living with it for a month.
    """
    try:
        from app.db.models import AnomalyAlert

        org = get_or_create_organization(db)
        policy = anomaly_rule_config.load_policy(db, org.id)
        threshold = policy["review_threshold"]

        alerts = db.query(AnomalyAlert.anomaly_score).filter(
            AnomalyAlert.organization_id == org.id,
            AnomalyAlert.deleted_at.is_(None),
        ).all()
        scores = [float(a[0] or 0) for a in alerts]
        queued = [s for s in scores if s >= threshold]
        return {
            "review_threshold": threshold,
            "scored_total": len(scores),
            "would_queue": len(queued),
            "below_threshold": len(scores) - len(queued),
        }
    except Exception as e:
        logger.error(f"Error previewing rules: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
