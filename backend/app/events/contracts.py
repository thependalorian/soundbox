"""The event contract.

Everything published to the broker is defined here, in one place, because an
event is an interface. Once a second consumer exists, changing a field name
breaks a system nobody was thinking about while making the change.

Three rules the contract holds to:

1. **Events describe what happened, not what to do.** `payment.verified`,
   not `announce.payment`. A publisher that names an action has decided what
   the consumer is for, and the next consumer has to pretend to be the first.
2. **Events carry no personal data beyond a masked alias.** They cross a
   process boundary and sit in a durable queue, which is a worse place for a
   national ID than a database — a queue is drained, snapshotted and
   inspected by operators. `docs/privacy.md` governs this; the schema here
   enforces it by not having the fields.
3. **Every event carries the id of the record it describes.** A consumer
   that needs more re-reads it. Publishing whole entities means a consumer
   acting on a stale copy, and stale payment data is the one thing this
   product exists to prevent.

Routing keys are hierarchical (`payment.verified`, `payment.failed`) so a
consumer binds to `payment.*` or to one specific event without the publisher
knowing which consumers exist.
"""

import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional

# The exchange every payment event is published to. Topic type, so binding is
# the consumer's decision rather than the publisher's.
EXCHANGE = "soundbox.events"
EXCHANGE_TYPE = "topic"

# Contract version. Consumers assert on it, so an incompatible change is
# caught at the boundary rather than as a KeyError three services away.
SCHEMA_VERSION = "1.0"


class RoutingKey:
    """Every routing key the platform publishes.

    Named constants rather than string literals at call sites: a typo in a
    routing key does not raise, it silently publishes to a key nothing is
    bound to, and the event is dropped without a trace.
    """

    PAYMENT_VERIFIED = "payment.verified"
    PAYMENT_FAILED = "payment.failed"
    ALERT_RAISED = "alert.raised"
    ALERT_VERDICT = "alert.verdict"
    DEVICE_STATUS_CHANGED = "device.status_changed"
    MERCHANT_STATUS_CHANGED = "merchant.status_changed"


@dataclass
class Event:
    """The envelope every message shares."""

    routing_key: str
    organization_id: str
    payload: Dict[str, Any]
    # Generated client-side, before publishing, so a retried publish carries
    # the same id and a consumer can discard the duplicate. At-least-once
    # delivery is the guarantee; idempotency is the consumer's job, and this
    # is what makes it possible.
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    schema_version: str = SCHEMA_VERSION

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def payment_verified(
    organization_id: str,
    transaction_id: str,
    transaction_ref: str,
    merchant_id: str,
    amount: float,
    currency_code: str,
    payment_type: str,
    device_id: Optional[str] = None,
    payer_alias: Optional[str] = None,
) -> Event:
    """A payment the rails confirmed.

    `payer_alias` is the masked form and nothing more. The announcement needs
    an amount; nothing downstream needs to know who paid.
    """
    return Event(
        routing_key=RoutingKey.PAYMENT_VERIFIED,
        organization_id=organization_id,
        payload={
            "transactionId": transaction_id,
            "transactionRef": transaction_ref,
            "merchantId": merchant_id,
            "deviceId": device_id,
            "amount": amount,
            "currencyCode": currency_code,
            "paymentType": payment_type,
            "payerAlias": payer_alias,
        },
    )


def payment_failed(
    organization_id: str,
    transaction_ref: str,
    merchant_id: str,
    amount: float,
    currency_code: str,
    reason: str,
) -> Event:
    """A payment that did not complete.

    Published as its own event rather than a `payment.verified` with a status
    field, because the device treats failure differently: a failed payment is
    announced twice, being the one a seller must not miss.
    """
    return Event(
        routing_key=RoutingKey.PAYMENT_FAILED,
        organization_id=organization_id,
        payload={
            "transactionRef": transaction_ref,
            "merchantId": merchant_id,
            "amount": amount,
            "currencyCode": currency_code,
            "reason": reason,
        },
    )


def alert_raised(
    organization_id: str,
    alert_id: str,
    merchant_id: str,
    anomaly_score: float,
    risk_level: str,
    expected_loss: float,
    rule_config: Optional[str] = None,
) -> Event:
    """An anomaly alert was created.

    Carries the configuration fingerprint so a consumer can tell whether two
    alerts were scored under the same policy without re-reading the rules.
    """
    return Event(
        routing_key=RoutingKey.ALERT_RAISED,
        organization_id=organization_id,
        payload={
            "alertId": alert_id,
            "merchantId": merchant_id,
            "anomalyScore": anomaly_score,
            "riskLevel": risk_level,
            "expectedLoss": expected_loss,
            "ruleConfig": rule_config,
        },
    )


def alert_verdict(
    organization_id: str,
    alert_id: str,
    verdict: str,
    status: str,
    reviewer: str,
) -> Event:
    """A reviewer decided an alert.

    The only confirmed-outcome event the platform produces, and therefore the
    one a future training pipeline subscribes to.
    """
    return Event(
        routing_key=RoutingKey.ALERT_VERDICT,
        organization_id=organization_id,
        payload={
            "alertId": alert_id,
            "verdict": verdict,
            "status": status,
            "reviewer": reviewer,
        },
    )


def device_status_changed(
    organization_id: str,
    device_id: str,
    device_code: str,
    from_status: Optional[str],
    to_status: str,
) -> Event:
    return Event(
        routing_key=RoutingKey.DEVICE_STATUS_CHANGED,
        organization_id=organization_id,
        payload={
            "deviceId": device_id,
            "deviceCode": device_code,
            "fromStatus": from_status,
            "toStatus": to_status,
        },
    )


def merchant_status_changed(
    organization_id: str,
    merchant_id: str,
    from_status: Optional[str],
    to_status: str,
) -> Event:
    return Event(
        routing_key=RoutingKey.MERCHANT_STATUS_CHANGED,
        organization_id=organization_id,
        payload={
            "merchantId": merchant_id,
            "fromStatus": from_status,
            "toStatus": to_status,
        },
    )
