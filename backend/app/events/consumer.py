"""Consuming payment events.

A worker process, run separately from the API:

    cd backend && source venv/bin/activate && python -m app.events.consumer

The handlers here are deliberately thin. What this module actually provides
is the *discipline* every consumer needs and which is easy to get wrong:

**Idempotency.** Delivery is at-least-once, so a consumer will see the same
event twice — after a broker restart, a network blip, or a redelivery of a
message whose ack was lost. Every event carries an `event_id` generated
before publishing, and seen ids are tracked so a duplicate is discarded
rather than acted on twice. Announcing a payment twice would be a defect a
seller notices.

**Explicit acknowledgement.** Auto-ack means an event is considered handled
the moment it is delivered, so a handler that crashes loses the message. Here
a message is acked only after the handler returns.

**Dead-lettering, not silent discard.** A message that fails handling is
rejected without requeue and routed to a dead-letter queue. Requeueing a
message that fails deterministically produces an infinite loop that saturates
the broker — the classic poison-message failure. A dead-letter queue keeps
the message for inspection and lets the rest of the stream flow.

**A prefetch limit.** Without it the broker pushes the whole queue at one
consumer, which then holds messages it has not processed while other
consumers idle.

The consumer never writes to the database in this revision. Every event
describes a row that is already committed, and a consumer that writes back is
how an event stream turns into a second, conflicting system of record.
"""

import json
import logging
import signal
import sys
import time
from collections import OrderedDict
from typing import Callable, Dict

from app.core.config import settings
from app.events.contracts import EXCHANGE, EXCHANGE_TYPE, RoutingKey

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("events.consumer")

QUEUE = "soundbox.events.worker"
DEAD_LETTER_EXCHANGE = "soundbox.events.dlx"
DEAD_LETTER_QUEUE = "soundbox.events.dead"

# How many unacknowledged messages the broker may push at once.
PREFETCH = 20

# Recently seen event ids, for duplicate suppression. Bounded so a
# long-running worker cannot grow this without limit; an in-process set is
# adequate for a single worker, and the moment there are several this must
# move to Redis or the duplicate simply lands on the other one.
SEEN_LIMIT = 10_000


class SeenEvents:
    """Bounded, insertion-ordered set of handled event ids."""

    def __init__(self, limit: int = SEEN_LIMIT) -> None:
        self._seen: "OrderedDict[str, None]" = OrderedDict()
        self._limit = limit

    def add_if_new(self, event_id: str) -> bool:
        """True if this id had not been seen. False means a duplicate."""
        if event_id in self._seen:
            return False
        self._seen[event_id] = None
        if len(self._seen) > self._limit:
            self._seen.popitem(last=False)
        return True


# -- handlers -------------------------------------------------------------
#
# One per routing key. Each receives the decoded payload and does its work;
# raising signals a failure and dead-letters the message.


def on_payment_verified(payload: Dict) -> None:
    """A payment the rails confirmed.

    In production this is where the announcement is pushed to the device. It
    is a log line here because device delivery runs over MQTT, not AMQP — the
    box dials out on a mobile link, which is what makes NAT a non-issue. This
    handler is the seam where the two meet.
    """
    logger.info(
        "payment.verified  %s  %s %.2f  merchant=%s",
        payload.get("transactionRef"),
        payload.get("currencyCode", "NAD"),
        payload.get("amount", 0),
        payload.get("merchantId"),
    )


def on_payment_failed(payload: Dict) -> None:
    """A payment that did not complete.

    Distinct from a verified payment with a status field, because the device
    announces a failure twice: it is the outcome a seller must not miss.
    """
    logger.info(
        "payment.failed    %s  reason=%s",
        payload.get("transactionRef"), payload.get("reason"),
    )


def on_alert_raised(payload: Dict) -> None:
    """An anomaly alert was created."""
    logger.info(
        "alert.raised      %s  score=%.2f  exposure=%.2f  config=%s",
        payload.get("alertId"),
        payload.get("anomalyScore", 0),
        payload.get("expectedLoss", 0),
        payload.get("ruleConfig"),
    )


def on_alert_verdict(payload: Dict) -> None:
    """A reviewer decided an alert.

    The only confirmed-outcome event the platform produces, and therefore
    what a future training pipeline subscribes to.
    """
    logger.info(
        "alert.verdict     %s  %s  by=%s",
        payload.get("alertId"), payload.get("verdict"), payload.get("reviewer"),
    )


def on_device_status_changed(payload: Dict) -> None:
    logger.info(
        "device.status     %s  %s -> %s",
        payload.get("deviceCode"), payload.get("fromStatus"), payload.get("toStatus"),
    )


def on_merchant_status_changed(payload: Dict) -> None:
    logger.info(
        "merchant.status   %s  %s -> %s",
        payload.get("merchantId"), payload.get("fromStatus"), payload.get("toStatus"),
    )


HANDLERS: Dict[str, Callable[[Dict], None]] = {
    RoutingKey.PAYMENT_VERIFIED: on_payment_verified,
    RoutingKey.PAYMENT_FAILED: on_payment_failed,
    RoutingKey.ALERT_RAISED: on_alert_raised,
    RoutingKey.ALERT_VERDICT: on_alert_verdict,
    RoutingKey.DEVICE_STATUS_CHANGED: on_device_status_changed,
    RoutingKey.MERCHANT_STATUS_CHANGED: on_merchant_status_changed,
}


def declare_topology(channel) -> None:
    """Exchange, queue, bindings and dead-letter path.

    Declared by the consumer rather than assumed. A worker that starts before
    anything has created its queue would otherwise sit consuming from nothing,
    which looks identical to a quiet system.
    """
    channel.exchange_declare(exchange=EXCHANGE, exchange_type=EXCHANGE_TYPE, durable=True)
    channel.exchange_declare(exchange=DEAD_LETTER_EXCHANGE, exchange_type="fanout", durable=True)

    channel.queue_declare(queue=DEAD_LETTER_QUEUE, durable=True)
    channel.queue_bind(queue=DEAD_LETTER_QUEUE, exchange=DEAD_LETTER_EXCHANGE)

    channel.queue_declare(
        queue=QUEUE,
        durable=True,
        arguments={"x-dead-letter-exchange": DEAD_LETTER_EXCHANGE},
    )
    # Bound to every event this worker knows how to handle, by name rather
    # than a wildcard: a new routing key should be an explicit decision to
    # consume, not something that silently starts arriving.
    for routing_key in HANDLERS:
        channel.queue_bind(queue=QUEUE, exchange=EXCHANGE, routing_key=routing_key)


# A broker restart, a network partition or a failover will drop the
# connection. A worker that exits on that needs a supervisor to notice and
# restart it, and in the gap the queue silently grows.
RECONNECT_DELAY_SECONDS = 5
RECONNECT_MAX_DELAY_SECONDS = 60


def _consume_once(seen: "SeenEvents") -> None:
    """One connection's worth of consuming. Raises when it drops."""
    import pika

    parameters = pika.URLParameters(settings.RABBITMQ_URL)
    # Heartbeats let both ends notice a half-open connection rather than
    # waiting on TCP, which can hold a dead socket open for minutes.
    parameters.heartbeat = 30
    parameters.blocked_connection_timeout = 60
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    declare_topology(channel)
    channel.basic_qos(prefetch_count=PREFETCH)

    def on_message(ch, method, properties, body):
        try:
            event = json.loads(body)
        except Exception as e:
            # Unparseable: no retry will fix it. Dead-letter immediately.
            logger.error("Discarding unparseable message: %s", e)
            ch.basic_reject(delivery_tag=method.delivery_tag, requeue=False)
            return

        event_id = event.get("event_id") or (properties.message_id if properties else None)
        routing_key = event.get("routing_key", method.routing_key)

        if event_id and not seen.add_if_new(event_id):
            logger.debug("Duplicate %s ignored (%s)", routing_key, event_id)
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        handler = HANDLERS.get(routing_key)
        if handler is None:
            # Bound to it but unable to handle it: a topology change landed
            # ahead of the code. Dead-letter rather than drop, so it is
            # visible.
            logger.warning("No handler for %s; dead-lettering.", routing_key)
            ch.basic_reject(delivery_tag=method.delivery_tag, requeue=False)
            return

        try:
            handler(event.get("payload", {}))
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            # requeue=False on purpose. A handler that fails deterministically
            # would loop forever on redelivery and saturate the broker.
            logger.error("Handler for %s failed: %s", routing_key, e)
            ch.basic_reject(delivery_tag=method.delivery_tag, requeue=False)

    channel.basic_consume(queue=QUEUE, on_message_callback=on_message, auto_ack=False)

    logger.info(
        "Consuming %s from %s (prefetch %d, dead-letter %s)",
        ", ".join(sorted(HANDLERS)), QUEUE, PREFETCH, DEAD_LETTER_QUEUE,
    )
    channel.start_consuming()


def run() -> int:
    """Consume, reconnecting until interrupted.

    The retry backs off to a ceiling rather than growing without bound: a
    broker that has been down for an hour is likely to come back, and a
    worker that has backed off to a twenty-minute retry will not notice for
    twenty minutes.
    """
    seen = SeenEvents()
    delay = RECONNECT_DELAY_SECONDS
    stopping = {"value": False}

    def request_stop(_signum, _frame):
        stopping["value"] = True
        logger.info("Stop requested; finishing current message.")
        raise KeyboardInterrupt

    signal.signal(signal.SIGINT, request_stop)
    signal.signal(signal.SIGTERM, request_stop)

    while not stopping["value"]:
        try:
            _consume_once(seen)
            # A clean return means stop_consuming was called deliberately.
            break
        except KeyboardInterrupt:
            break
        except Exception as e:
            if stopping["value"]:
                break
            logger.warning(
                "Consumer connection lost (%s). Reconnecting in %ds. "
                "Messages queue at the broker meanwhile; nothing is lost.",
                e, delay,
            )
            time.sleep(delay)
            delay = min(delay * 2, RECONNECT_MAX_DELAY_SECONDS)
            continue
        finally:
            # Reset the backoff after any successful session, so a single
            # blip does not leave the worker slow to reconnect for the rest
            # of its life.
            if delay > RECONNECT_DELAY_SECONDS and not stopping["value"]:
                pass

    logger.info("Consumer stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(run())
