import time
from typing import Optional
import redis
from app.core.config import settings
from app.core.logging import logger

_redis_client: Optional[redis.Redis] = None
_redis_available: Optional[bool] = None
_last_check_time: float = 0.0


def get_redis_client() -> Optional[redis.Redis]:
    """Retrieve or initialize singleton Redis client with quick fallback when offline."""
    global _redis_client, _redis_available, _last_check_time
    now = time.time()
    if _redis_available is False and (now - _last_check_time < 30.0):
        return None

    if _redis_client is None:
        try:
            client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=0.2,
                socket_connect_timeout=0.2,
            )
            client.ping()
            _redis_client = client
            _redis_available = True
        except Exception:
            _redis_available = False
            _last_check_time = now
            return None
    return _redis_client


def check_redis_connection() -> bool:
    """Diagnostic check to verify Redis connectivity."""
    try:
        client = get_redis_client()
        if client is not None:
            return client.ping()
        return False
    except Exception as e:
        logger.debug(f"Redis connectivity check failed: {e}")
        return False
