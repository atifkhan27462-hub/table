"""
High-Performance In-Memory & Redis-Compatible TTL Cache Layer.
Provides sub-millisecond retrieval for read-heavy endpoints:
- Menu Catalog & Categories
- AI Sommelier & Concierge Pairings
- Executive Analytics Aggregates
- Restaurant Configuration
"""
import time
import json
import hashlib
from typing import Any, Callable, Dict, Optional, Tuple
from app.core.logging import logger


class FastMemoryCache:
    def __init__(self):
        self._store: Dict[str, Tuple[Any, float]] = {}
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if not entry:
            self._misses += 1
            return None
        val, expiry = entry
        if expiry and time.time() > expiry:
            del self._store[key]
            self._misses += 1
            return None
        self._hits += 1
        return val

    def set(self, key: str, value: Any, ttl_seconds: int = 60) -> None:
        expiry = time.time() + ttl_seconds if ttl_seconds > 0 else 0
        self._store[key] = (value, expiry)

    def delete(self, key: str) -> None:
        if key in self._store:
            del self._store[key]

    def clear_prefix(self, prefix: str) -> int:
        keys_to_delete = [k for k in self._store.keys() if k.startswith(prefix)]
        for k in keys_to_delete:
            del self._store[k]
        return len(keys_to_delete)

    def clear(self) -> None:
        self._store.clear()

    def stats(self) -> Dict[str, Any]:
        return {
            "entries": len(self._store),
            "hits": self._hits,
            "misses": self._misses,
            "hit_ratio": (self._hits / (self._hits + self._misses)) if (self._hits + self._misses) > 0 else 0.0,
        }


# Singleton cache instance
fast_cache = FastMemoryCache()


def hash_cache_key(*args: Any) -> str:
    serialized = ":".join(str(a) for a in args)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]
