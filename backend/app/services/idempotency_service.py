import json
import threading
import time
from typing import Any, Dict, Optional, Tuple
from app.core.logging import logger
from app.core.redis import get_redis_client


class IdempotencyService:
    """
    Enterprise Idempotency Engine for critical dining table transactions.
    Guarantees exactly-once processing for order placements, preventing accidental
    double-clicks, network re-transmissions, and concurrent race conditions.
    """

    _MEMORY_STORE: Dict[str, Tuple[Dict[str, Any], float]] = {}
    _IN_FLIGHT_KEYS: Dict[str, float] = {}
    _LOCK = threading.Lock()
    DEFAULT_TTL_SECONDS = 86400  # 24 hours

    @classmethod
    def get_existing_result(cls, idempotency_key: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves cached response if the idempotency key was previously processed.
        Checks Redis first, falling back to in-memory TTL store.
        """
        if not idempotency_key:
            return None

        # 1. Try Redis
        try:
            r = get_redis_client()
            if r is not None:
                cached = r.get(f"idempotency:{idempotency_key}")
                if cached:
                    logger.info(f"Idempotency cache hit (Redis) for key: {idempotency_key[:12]}...")
                    return json.loads(cached)
        except Exception as e:
            logger.debug(f"Redis idempotency lookup skipped: {e}")

        # 2. Try In-Memory Store
        with cls._LOCK:
            cls._prune_expired()
            if idempotency_key in cls._MEMORY_STORE:
                data, expiry = cls._MEMORY_STORE[idempotency_key]
                if time.time() < expiry:
                    logger.info(f"Idempotency cache hit (Memory) for key: {idempotency_key[:12]}...")
                    return data
                else:
                    del cls._MEMORY_STORE[idempotency_key]

        return None

    @classmethod
    def acquire_lock(cls, idempotency_key: str, timeout_seconds: float = 30.0) -> bool:
        """
        Acquires an atomic lock on an idempotency key to prevent concurrent in-flight duplicates.
        Returns True if lock acquired, False if key is already being processed.
        """
        if not idempotency_key:
            return True

        # Try Redis lock with SETNX
        try:
            r = get_redis_client()
            if r is not None:
                acquired = r.set(
                    f"idempotency:lock:{idempotency_key}",
                    "PROCESSING",
                    nx=True,
                    ex=int(timeout_seconds),
                )
                if not acquired:
                    return False
        except Exception as e:
            logger.debug(f"Redis lock skipped: {e}")

        # In-Memory Lock
        with cls._LOCK:
            now = time.time()
            if idempotency_key in cls._IN_FLIGHT_KEYS:
                lock_time = cls._IN_FLIGHT_KEYS[idempotency_key]
                if now - lock_time < timeout_seconds:
                    return False
            cls._IN_FLIGHT_KEYS[idempotency_key] = now

        return True

    @classmethod
    def record_result(
        cls,
        idempotency_key: str,
        result_data: Dict[str, Any],
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
    ) -> None:
        """
        Persists completed transaction output associated with this idempotency key.
        """
        if not idempotency_key:
            return

        # 1. Save to Redis
        try:
            r = get_redis_client()
            if r is not None:
                r.set(
                    f"idempotency:{idempotency_key}",
                    json.dumps(result_data, default=str),
                    ex=ttl_seconds,
                )
                r.delete(f"idempotency:lock:{idempotency_key}")
        except Exception as e:
            logger.debug(f"Redis idempotency record skipped: {e}")

        # 2. Save to In-Memory
        with cls._LOCK:
            cls._MEMORY_STORE[idempotency_key] = (result_data, time.time() + ttl_seconds)
            cls._IN_FLIGHT_KEYS.pop(idempotency_key, None)

    @classmethod
    def release_lock(cls, idempotency_key: str) -> None:
        """Releases in-flight processing lock in case of error."""
        if not idempotency_key:
            return
        try:
            r = get_redis_client()
            if r is not None:
                r.delete(f"idempotency:lock:{idempotency_key}")
        except Exception:
            pass

        with cls._LOCK:
            cls._IN_FLIGHT_KEYS.pop(idempotency_key, None)

    @classmethod
    def _prune_expired(cls) -> None:
        now = time.time()
        expired = [k for k, (_, exp) in cls._MEMORY_STORE.items() if now >= exp]
        for k in expired:
            cls._MEMORY_STORE.pop(k, None)
        expired_locks = [k for k, t in cls._IN_FLIGHT_KEYS.items() if now - t > 60]
        for k in expired_locks:
            cls._IN_FLIGHT_KEYS.pop(k, None)
