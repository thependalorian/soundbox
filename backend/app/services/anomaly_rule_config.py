"""Anomaly rules as configuration, not as constants in Python.

Every rule the scorer applies — whether it runs at all, how much it
contributes, and how far above normal counts as unusual — is a row in
`type_definitions` under the `anomaly_rule` domain. Changing a threshold is
an UPDATE and a log row, never a migration and never a deploy.

Why this matters here specifically. The thresholds encode a policy judgement
that belongs to the person accountable for the queue, not to whoever wrote
the scorer: how much unexamined activity is acceptable, and how much analyst
time a marginal alert is worth. Nomentia's payment anomaly product treats
configurability as the core of the offering for exactly this reason — the
same rule set cannot serve a market stall and a corporate treasury.

Three properties keep this auditable rather than merely flexible:

1. **Defaults are code, values are data.** DEFAULT_RULES below is the shipped
   position and the source of every field's meaning. A missing row falls back
   to it, so the system is never left without a rule because a row was
   deleted.
2. **Changes are append-only.** `type_definitions` rows are mutable by
   design, so every change also writes an immutable `anomaly_rule_config_log`
   row recording who changed what, from what, to what. The current value is
   fast to read; the history is impossible to rewrite.
3. **Scores are attributable to a configuration.** `fingerprint()` hashes the
   effective rule set. Every alert stores it, so an alert raised under one
   policy stays explainable after the policy changes — without it, "why is
   this a 0.6" becomes unanswerable the moment someone moves a slider.

Bounds are enforced in `validate_change`, not merely suggested. A
contribution outside 0.0-1.0 or a multiple below 1.0 is not a preference, it
is a broken scorer.
"""

import hashlib
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models import AnomalyRuleConfigLog, TypeDefinition

logger = logging.getLogger(__name__)

RULE_DOMAIN = "anomaly_rule"
POLICY_DOMAIN = "anomaly_policy"

# The shipped position. Each entry is the full meaning of a rule: what it
# looks for, what it costs when it fires, and which knobs are safe to turn.
#
# `contribution` is the weight added to the score when the rule fires.
# `threshold` is the rule's own parameter, and its unit differs per rule —
# stated in `threshold_label` so a settings screen can say what a number
# means instead of showing a bare slider.
DEFAULT_RULES: Dict[str, Dict] = {
    "velocity_24h": {
        "label": "Unusual daily volume",
        "description": (
            "Payments today against what this business normally takes on this "
            "weekday. Compared to its own history, so a busy Saturday is only "
            "unusual against other Saturdays."
        ),
        "enabled": True,
        "contribution": 0.3,
        "threshold": 3.0,
        "threshold_label": "times the business's own weekday median",
        "threshold_min": 1.5,
        "threshold_max": 10.0,
        "sort_order": 10,
    },
    "velocity_1h": {
        "label": "Sudden burst of payments",
        "description": (
            "Payments in one hour against this business's own busy hour for "
            "this weekday. The bar is a learned peak, not an assumed one."
        ),
        "enabled": True,
        "contribution": 0.3,
        "threshold": 3.0,
        "threshold_label": "times the business's own busy-hour peak",
        "threshold_min": 1.5,
        "threshold_max": 10.0,
        "sort_order": 20,
    },
    "velocity_no_baseline": {
        "label": "High volume, no history to compare against",
        "description": (
            "For a business with fewer than four trading weeks on this "
            "weekday. Deliberately blunt: it fires only on activity too "
            "extreme to be ordinary for any small business, and says openly "
            "that it is judging without a baseline."
        ),
        "enabled": True,
        "contribution": 0.2,
        "threshold": 200.0,
        "threshold_label": "payments in 24 hours",
        "threshold_min": 50.0,
        "threshold_max": 1000.0,
        "sort_order": 30,
    },
    "amount_anomaly": {
        "label": "Unusual transaction amount",
        "description": "A single payment against this business's own average.",
        "enabled": True,
        "contribution": 0.2,
        "threshold": 3.0,
        "threshold_label": "times the business's average payment",
        "threshold_min": 1.5,
        "threshold_max": 20.0,
        "sort_order": 40,
    },
    "possible_duplicate": {
        "label": "Possible duplicate payment",
        "description": (
            "The same amount to the same business again within minutes. "
            "Distinct from protocol idempotency, which catches the same "
            "reference reported twice; this catches a genuine double payment, "
            "which costs more to recover afterwards than to catch now."
        ),
        "enabled": True,
        "contribution": 0.2,
        "threshold": 10.0,
        "threshold_label": "minutes to look back",
        "threshold_min": 1.0,
        "threshold_max": 120.0,
        "sort_order": 50,
    },
    "new_counterparty": {
        "label": "First payment from this payer",
        "description": (
            "Ordinary at a market stall, notable at a business trading with a "
            "settled set of suppliers. Weighted lightly on its own; a "
            "deployment serving mostly stalls may want it off entirely."
        ),
        "enabled": True,
        "contribution": 0.1,
        "threshold": None,
        "threshold_label": None,
        "sort_order": 60,
    },
    "off_hours": {
        "label": "Outside normal trading hours",
        "description": (
            "Activity while the business is closed. The window is a "
            "deployment-wide default; a 24-hour fuel station is the obvious "
            "case for widening it."
        ),
        "enabled": True,
        "contribution": 0.1,
        "threshold": 6.0,
        "threshold_label": "hour trading opens (closes 16 hours later)",
        "threshold_min": 0.0,
        "threshold_max": 12.0,
        "sort_order": 70,
    },
    "sequence_anomaly": {
        "label": "Unusual versus regional peers",
        "description": (
            "The unsupervised model's opinion, admitted as one rule among "
            "many. It can raise a score; it is never the only thing behind an "
            "alert, because the rule reasons are what an analyst reads."
        ),
        "enabled": True,
        "contribution": 0.2,
        "threshold": None,
        "threshold_label": None,
        "sort_order": 80,
    },
}

# Policy settings that are not rules. `review_threshold` is the score at or
# above which an alert is put in front of a person — the setting the queue
# is actually governed by.
DEFAULT_POLICY: Dict[str, Dict] = {
    "review_threshold": {
        "label": "Raise for review above",
        "description": (
            "Anything below this is still scored and still recorded; it just "
            "stays out of the queue. Raising it quietens the queue and "
            "increases what goes unexamined. No setting avoids both."
        ),
        "value": 0.6,
        "value_min": 0.1,
        "value_max": 0.95,
        "sort_order": 10,
    },
    "band_medium": {
        "label": "Medium risk starts at",
        "description": "The score at which an alert stops reading as low risk.",
        "value": 0.3,
        "value_min": 0.05,
        "value_max": 0.9,
        "sort_order": 20,
    },
    "band_high": {
        "label": "High risk starts at",
        "description": "The score at which an alert reads as high risk.",
        "value": 0.6,
        "value_min": 0.1,
        "value_max": 0.99,
        "sort_order": 30,
    },
}


class RuleConfigError(ValueError):
    """A change that would leave the scorer in an invalid state."""


def _seed_missing(db: Session, organization_id, domain: str, defaults: Dict[str, Dict]) -> None:
    """Create rows for any default that has no row yet.

    Additive by design: a code that already exists is left exactly as the
    operator set it. Shipping a new rule therefore does not silently reset
    the ones already tuned.
    """
    existing = {
        row.code
        for row in db.query(TypeDefinition.code).filter(
            TypeDefinition.organization_id == organization_id,
            TypeDefinition.domain == domain,
        ).all()
    }
    missing = [code for code in defaults if code not in existing]
    if not missing:
        return

    for code in missing:
        spec = dict(defaults[code])
        db.add(TypeDefinition(
            id=uuid.uuid4(),
            organization_id=organization_id,
            domain=domain,
            code=code,
            label=spec["label"],
            config=spec,
            sort_order=spec.get("sort_order", 0),
            is_active=True,
        ))
    db.commit()
    logger.info("Seeded %d %s rows from defaults", len(missing), domain)


def load_rules(db: Session, organization_id) -> Dict[str, Dict]:
    """The effective rule set for this organisation.

    Falls back to DEFAULT_RULES field by field, so a row missing a key added
    in a later release still produces a complete rule rather than a
    KeyError at scoring time.
    """
    try:
        _seed_missing(db, organization_id, RULE_DOMAIN, DEFAULT_RULES)
        rows = db.query(TypeDefinition).filter(
            TypeDefinition.organization_id == organization_id,
            TypeDefinition.domain == RULE_DOMAIN,
        ).all()
        by_code = {row.code: (row.config or {}) for row in rows}
    except Exception as e:
        # Configuration being unreadable must not stop payments being
        # scored. The shipped defaults are a safe position, and saying so
        # in the log is better than scoring silently on an unknown basis.
        logger.error("Rule config unavailable, scoring on shipped defaults: %s", e)
        by_code = {}

    effective: Dict[str, Dict] = {}
    for code, default in DEFAULT_RULES.items():
        merged = dict(default)
        merged.update({k: v for k, v in by_code.get(code, {}).items() if k in default})
        effective[code] = merged
    return effective


def load_policy(db: Session, organization_id) -> Dict[str, float]:
    """Effective policy values, keyed by code."""
    try:
        _seed_missing(db, organization_id, POLICY_DOMAIN, DEFAULT_POLICY)
        rows = db.query(TypeDefinition).filter(
            TypeDefinition.organization_id == organization_id,
            TypeDefinition.domain == POLICY_DOMAIN,
        ).all()
        by_code = {row.code: (row.config or {}) for row in rows}
    except Exception as e:
        logger.error("Policy config unavailable, using shipped defaults: %s", e)
        by_code = {}

    return {
        code: float(by_code.get(code, {}).get("value", default["value"]))
        for code, default in DEFAULT_POLICY.items()
    }


def fingerprint(rules: Dict[str, Dict], policy: Dict[str, float]) -> str:
    """A short, stable hash of everything that can change a score.

    Stored on every alert. Two alerts with the same fingerprint were scored
    under identical policy; two with different fingerprints are not directly
    comparable, and the log says what moved between them.

    Only score-affecting fields are hashed — relabelling a rule or rewording
    its description must not invalidate the attribution of past alerts.
    """
    material = {
        "rules": {
            code: [bool(r["enabled"]), float(r["contribution"]),
                   None if r.get("threshold") is None else float(r["threshold"])]
            for code, r in sorted(rules.items())
        },
        "policy": {k: float(v) for k, v in sorted(policy.items())},
    }
    blob = json.dumps(material, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(blob.encode()).hexdigest()[:12]


def validate_change(code: str, field: str, value, current: Dict) -> float:
    """Coerce and bound-check one field. Raises RuleConfigError if invalid.

    Bounds are enforced rather than clamped: silently accepting a
    contribution of 5.0 and storing 1.0 would leave the operator believing
    they had configured something they had not.
    """
    if field == "enabled":
        return bool(value)

    if field == "contribution":
        try:
            v = float(value)
        except (TypeError, ValueError):
            raise RuleConfigError(f"{code}.contribution must be a number.")
        if not 0.0 <= v <= 1.0:
            raise RuleConfigError(
                f"{code}.contribution must be between 0.0 and 1.0 — a single rule "
                f"cannot contribute more than the whole score. Received {v}."
            )
        return round(v, 3)

    if field == "threshold":
        if current.get("threshold") is None:
            raise RuleConfigError(f"{code} has no threshold to set.")
        try:
            v = float(value)
        except (TypeError, ValueError):
            raise RuleConfigError(f"{code}.threshold must be a number.")
        lo = float(current.get("threshold_min", 0.0))
        hi = float(current.get("threshold_max", 1e9))
        if not lo <= v <= hi:
            raise RuleConfigError(
                f"{code}.threshold must be between {lo:g} and {hi:g} "
                f"({current.get('threshold_label', 'no unit stated')}). Received {v:g}."
            )
        return round(v, 3)

    raise RuleConfigError(f"{field} is not a configurable field.")


def _write_log(db: Session, organization_id, domain: str, code: str,
               field: str, from_value, to_value, actor: str, note: Optional[str]) -> None:
    db.add(AnomalyRuleConfigLog(
        id=uuid.uuid4(),
        organization_id=organization_id,
        domain=domain,
        code=code,
        field=field,
        from_value=None if from_value is None else str(from_value),
        to_value=None if to_value is None else str(to_value),
        changed_by=actor,
        note=note,
        created_at=datetime.utcnow(),
    ))


def update_rule(db: Session, organization_id, code: str, changes: Dict,
                actor: str, note: Optional[str] = None) -> Dict:
    """Apply changes to one rule. Returns the rule as it now stands.

    A no-op change writes no log row: an audit trail full of "set 0.3 to 0.3"
    is one nobody reads.
    """
    if code not in DEFAULT_RULES:
        raise RuleConfigError(f"{code} is not a known rule.")

    _seed_missing(db, organization_id, RULE_DOMAIN, DEFAULT_RULES)
    row = db.query(TypeDefinition).filter(
        TypeDefinition.organization_id == organization_id,
        TypeDefinition.domain == RULE_DOMAIN,
        TypeDefinition.code == code,
    ).first()
    if row is None:
        raise RuleConfigError(f"{code} has no configuration row.")

    config = dict(DEFAULT_RULES[code])
    config.update(row.config or {})

    applied = 0
    for field, raw in changes.items():
        new_value = validate_change(code, field, raw, config)
        old_value = config.get(field)
        if old_value == new_value:
            continue
        config[field] = new_value
        _write_log(db, organization_id, RULE_DOMAIN, code, field, old_value, new_value, actor, note)
        applied += 1

    if applied:
        row.config = config
        row.updated_at = datetime.utcnow()
        db.commit()
        logger.info("Rule %s updated by %s (%d field(s))", code, actor, applied)

    return config


def update_policy(db: Session, organization_id, code: str, value,
                  actor: str, note: Optional[str] = None) -> Dict:
    """Set one policy value, with the same bounds and logging discipline."""
    if code not in DEFAULT_POLICY:
        raise RuleConfigError(f"{code} is not a known policy setting.")

    _seed_missing(db, organization_id, POLICY_DOMAIN, DEFAULT_POLICY)
    row = db.query(TypeDefinition).filter(
        TypeDefinition.organization_id == organization_id,
        TypeDefinition.domain == POLICY_DOMAIN,
        TypeDefinition.code == code,
    ).first()
    if row is None:
        raise RuleConfigError(f"{code} has no configuration row.")

    config = dict(DEFAULT_POLICY[code])
    config.update(row.config or {})

    try:
        v = float(value)
    except (TypeError, ValueError):
        raise RuleConfigError(f"{code} must be a number.")
    lo, hi = float(config["value_min"]), float(config["value_max"])
    if not lo <= v <= hi:
        raise RuleConfigError(f"{code} must be between {lo:g} and {hi:g}. Received {v:g}.")
    v = round(v, 3)

    if v != config.get("value"):
        _write_log(db, organization_id, POLICY_DOMAIN, code, "value",
                   config.get("value"), v, actor, note)
        config["value"] = v
        row.config = config
        row.updated_at = datetime.utcnow()
        db.commit()
        logger.info("Policy %s set to %s by %s", code, v, actor)

    # The two bands must stay ordered or the risk labels become nonsense.
    # Checked after the write so the message can name the actual conflict.
    policy = load_policy(db, organization_id)
    if policy["band_medium"] >= policy["band_high"]:
        raise RuleConfigError(
            f"Medium risk ({policy['band_medium']:g}) must start below high risk "
            f"({policy['band_high']:g}). The change was recorded; adjust the other band."
        )
    return config


def history(db: Session, organization_id, limit: int = 50) -> List[Dict]:
    """Most recent configuration changes, newest first."""
    rows = db.query(AnomalyRuleConfigLog).filter(
        AnomalyRuleConfigLog.organization_id == organization_id,
    ).order_by(AnomalyRuleConfigLog.created_at.desc()).limit(limit).all()

    labels = {**{c: s["label"] for c, s in DEFAULT_RULES.items()},
              **{c: s["label"] for c, s in DEFAULT_POLICY.items()}}
    return [{
        "id": str(r.id),
        "code": r.code,
        "label": labels.get(r.code, r.code),
        "field": r.field,
        "from": r.from_value,
        "to": r.to_value,
        "changed_by": r.changed_by,
        "note": r.note,
        "at": r.created_at.isoformat(),
    } for r in rows]
