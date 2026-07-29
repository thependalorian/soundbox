"""Caching for expensive read-only assemblies.

`redis==5.0.1` was declared and running for months without being imported by
anything. This is what it was for.

Scope, deliberately narrow: **derived, read-only aggregates only.** Never a
payment, a balance, an alert status, or anything a person acts on directly.
The reason is specific rather than stylistic — a cached payment status is a
stale payment status, and the entire argument for this product is that a
seller can trust what it says. Aggregates are different: a concentration
index that is five minutes old is still true about five minutes ago, and the
response says which.

Every cached response carries `cachedAt` and `ageSeconds`. A reader who
cannot tell a fresh figure from a cached one will treat both as live, and for
a document going to a supervisor that is the expensive mistake.

Failure is always soft. If Redis is unreachable the caller computes normally;
a cache that can break the thing it accelerates is worse than no cache.
"""

import hashlib
import json
import logging
from datetime import datetime
from typing import Any, Callable, Dict

from app.core.config import settings

logger = logging.getLogger(__name__)

# Assemblies are expensive but not volatile. Five minutes keeps a dashboard
# responsive while staying short enough that nobody makes a decision on a
# figure old enough to matter.
DEFAULT_TTL_SECONDS = 300

KEY_PREFIX = "soundbox:cache:"

_client = None
_unavailable = False


def _get_client():
    """Lazily connect. One failure marks the cache unavailable for the process.

    Retrying a dead Redis on every request would add its connect timeout to
    every response — turning a cache into a latency source, which is the
    opposite of the point.
    """
    global _client, _unavailable
    if _unavailable:
        return None
    if _client is not None:
        return _client
    if not settings.REDIS_URL:
        _unavailable = True
        return None
    try:
        import redis

        _client = redis.from_url(
            settings.REDIS_URL,
            socket_connect_timeout=2,
            socket_timeout=2,
            decode_responses=True,
        )
        _client.ping()
        return _client
    except Exception as e:
        logger.warning("Cache unavailable (%s). Computing every request.", e)
        _unavailable = True
        return None


def _key(namespace: str, params: Dict[str, Any]) -> str:
    """A key that changes when any parameter does.

    Parameters are hashed rather than concatenated so a window, a merchant
    filter and a horizon cannot collide into one key — two different
    questions sharing a cache entry is a wrong answer, not a slow one.
    """
    material = json.dumps(params, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(material.encode()).hexdigest()[:16]
    return f"{KEY_PREFIX}{namespace}:{digest}"


def get_or_compute(
    namespace: str,
    params: Dict[str, Any],
    compute: Callable[[], Dict],
    ttl: int = DEFAULT_TTL_SECONDS,
) -> Dict:
    """Return a cached assembly, or compute and store one.

    The response is annotated either way, so a caller can always tell what it
    is holding.
    """
    client = _get_client()
    key = _key(namespace, params)

    if client is not None:
        try:
            cached = client.get(key)
            if cached:
                payload = json.loads(cached)
                stored_at = payload.get("cachedAt")
                age = None
                if stored_at:
                    age = int((datetime.utcnow() - datetime.fromisoformat(stored_at)).total_seconds())
                payload["fromCache"] = True
                payload["ageSeconds"] = age
                return payload
        except Exception as e:
            logger.warning("Cache read failed for %s: %s", namespace, e)

    result = compute()

    # Errors are not cached. Caching a failure means a transient database
    # blip is served for the next five minutes.
    if isinstance(result, dict) and result.get("status") == "error":
        result["fromCache"] = False
        return result

    result["cachedAt"] = datetime.utcnow().isoformat()
    result["fromCache"] = False
    result["ageSeconds"] = 0

    if client is not None:
        try:
            client.setex(key, ttl, json.dumps(result, default=str))
        except Exception as e:
            logger.warning("Cache write failed for %s: %s", namespace, e)

    return result


# Namespaces whose figures are derived from the anomaly rule thresholds, and
# which therefore go stale the moment an operator changes one. Kept as a list
# rather than left to each call site because the failure mode is silent: a
# threshold moves, the queue changes, and a cached flag rate keeps reporting
# the old world for up to the TTL. Adding a rule-dependent cached endpoint
# means adding it here.
RULE_DEPENDENT_NAMESPACES = (
    "nps_dashboard",
    "nps_integrity",
    "nps_resilience",
    "market_availability",
)


def invalidate_rule_dependent() -> int:
    """Drop every cached figure that a rule or policy change invalidates."""
    return sum(invalidate(ns) for ns in RULE_DEPENDENT_NAMESPACES)


def invalidate(namespace: str) -> int:
    """Drop every entry in a namespace. Returns how many were removed.

    Used when configuration changes underneath a cached figure — a rule
    threshold moving makes a cached alert-rate misleading rather than merely
    old.
    """
    client = _get_client()
    if client is None:
        return 0
    try:
        pattern = f"{KEY_PREFIX}{namespace}:*"
        keys = list(client.scan_iter(match=pattern, count=200))
        if not keys:
            return 0
        return int(client.delete(*keys))
    except Exception as e:
        logger.warning("Cache invalidation failed for %s: %s", namespace, e)
        return 0


def health() -> Dict:
    """Whether the cache is actually working, for the operations view."""
    client = _get_client()
    if client is None:
        return {"available": False, "detail": "Not configured or unreachable; every request is computed."}
    try:
        info = client.info("server")
        return {
            "available": True,
            "redisVersion": info.get("redis_version"),
            "keys": client.dbsize(),
            "ttlSeconds": DEFAULT_TTL_SECONDS,
        }
    except Exception as e:
        return {"available": False, "detail": str(e)}
