"""Publishing payment events to RabbitMQ.

The single rule this module exists to enforce: **a broker outage must never
fail a payment.** A seller standing at a stall does not care that our message
bus is down, and a confirmation that fails because a queue was unreachable
would be the worst possible trade — we would have taken a working system and
made it depend on a new one.

So every publish is best-effort and non-blocking on failure. If the broker is
unreachable the event is logged and dropped, the caller is told nothing, and
the payment completes. This is a deliberate durability choice and it has a
consequence worth stating plainly: **events are not the system of record.**
Postgres is. Every event describes a row that is already committed, so a lost
event costs a consumer a notification, never the truth. Anything that needs
guaranteed history reads the database.

Delivery is at-least-once. Publisher confirms are on, so the broker
acknowledges persistence before we consider a publish done, and a retried
publish reuses the same `event_id` — which is what makes consumer-side
idempotency possible.

Connection handling is lazy and self-healing: a connection is opened on first
use and rebuilt if it has dropped. `pika.BlockingConnection` is not
thread-safe, so a lock serialises access. That is the right trade at this
volume; if publish throughput ever becomes the constraint, the fix is a
connection pool or an async client, not sharing a channel across threads.
"""

import json
import logging
import threading
from typing import Optional

from app.core.config import settings
from app.events.contracts import EXCHANGE, EXCHANGE_TYPE, Event

logger = logging.getLogger(__name__)

# Time to wait for a broker that is not answering. Deliberately short: this
# sits behind a request a seller is waiting on, and a slow publish is
# indistinguishable to them from a slow payment.
CONNECT_TIMEOUT_SECONDS = 2
PUBLISH_RETRY_ATTEMPTS = 2


class EventPublisher:
    """Best-effort AMQP publisher. Never raises to its caller."""

    def __init__(self) -> None:
        self._connection = None
        self._channel = None
        self._lock = threading.Lock()
        # Set once the broker has proved unreachable, so a down broker costs
        # one timeout rather than one per payment. Cleared on the next
        # successful connect.
        self._degraded = False

    # -- connection -------------------------------------------------------

    def _connect(self) -> bool:
        """Open a connection and declare the exchange. Returns success."""
        try:
            import pika

            parameters = pika.URLParameters(settings.RABBITMQ_URL)
            parameters.socket_timeout = CONNECT_TIMEOUT_SECONDS
            parameters.blocked_connection_timeout = CONNECT_TIMEOUT_SECONDS

            self._connection = pika.BlockingConnection(parameters)
            self._channel = self._connection.channel()
            # Durable: the exchange must survive a broker restart, or the
            # first restart silently unbinds every consumer.
            self._channel.exchange_declare(
                exchange=EXCHANGE, exchange_type=EXCHANGE_TYPE, durable=True
            )
            # Broker acknowledges persistence before a publish returns.
            self._channel.confirm_delivery()

            if self._degraded:
                logger.info("Event broker reachable again; resuming publishing.")
            self._degraded = False
            return True
        except Exception as e:
            if not self._degraded:
                # Logged once per outage, not once per payment.
                logger.warning(
                    "Event broker unreachable (%s). Payments continue; events "
                    "are being dropped until it returns. Postgres remains the "
                    "system of record.", e,
                )
            self._degraded = True
            self._connection = None
            self._channel = None
            return False

    def _ensure_channel(self) -> bool:
        if self._channel is not None and self._connection is not None:
            try:
                if self._connection.is_open and self._channel.is_open:
                    return True
            except Exception:
                pass
        return self._connect()

    # -- publishing -------------------------------------------------------

    def publish(self, event: Event) -> bool:
        """Publish one event. Returns whether it reached the broker.

        Callers are free to ignore the return value, and most should: there
        is nothing useful to do about a dropped notification in the middle of
        confirming a payment.
        """
        if not settings.EVENTS_ENABLED:
            return False

        body = json.dumps(event.to_dict(), separators=(",", ":")).encode()

        with self._lock:
            for attempt in range(PUBLISH_RETRY_ATTEMPTS):
                if not self._ensure_channel():
                    return False
                try:
                    import pika

                    self._channel.basic_publish(
                        exchange=EXCHANGE,
                        routing_key=event.routing_key,
                        body=body,
                        properties=pika.BasicProperties(
                            # Survive a broker restart. An event describing a
                            # committed payment should not evaporate because
                            # the broker was bounced.
                            delivery_mode=2,
                            content_type="application/json",
                            message_id=event.event_id,
                            type=event.routing_key,
                            app_id="soundbox",
                        ),
                        mandatory=False,
                    )
                    return True
                except Exception as e:
                    # A stale connection surfaces as a publish failure. Drop
                    # it and let the next attempt rebuild.
                    self._connection = None
                    self._channel = None
                    if attempt == PUBLISH_RETRY_ATTEMPTS - 1:
                        logger.warning(
                            "Dropped event %s (%s): %s",
                            event.routing_key, event.event_id, e,
                        )
                        return False
        return False

    def close(self) -> None:
        with self._lock:
            try:
                if self._connection is not None and self._connection.is_open:
                    self._connection.close()
            except Exception as e:
                logger.debug("Error closing event connection: %s", e)
            finally:
                self._connection = None
                self._channel = None


# One publisher per process. A connection per request would spend more time
# in TCP and TLS setup than in publishing.
_publisher: Optional[EventPublisher] = None
_publisher_lock = threading.Lock()


def get_publisher() -> EventPublisher:
    global _publisher
    if _publisher is None:
        with _publisher_lock:
            if _publisher is None:
                _publisher = EventPublisher()
    return _publisher


def publish(event: Event) -> bool:
    """Module-level convenience. Never raises."""
    try:
        return get_publisher().publish(event)
    except Exception as e:
        logger.warning("Event publishing failed unexpectedly: %s", e)
        return False
