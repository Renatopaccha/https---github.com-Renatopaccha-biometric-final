"""
Storage backend abstraction module.
Provides pluggable storage implementations for DataFrame session management.
"""

from app.internal.storage.backend import StorageBackend
from app.internal.storage.in_memory_backend import InMemoryBackend

# Import RedisBackend only if redis is available
try:
    from app.internal.storage.redis_backend import RedisBackend
    REDIS_BACKEND_AVAILABLE = True
except (ImportError, RuntimeError):
    RedisBackend = None
    REDIS_BACKEND_AVAILABLE = False

__all__ = [
    "StorageBackend",
    "InMemoryBackend",
    "RedisBackend",
    "REDIS_BACKEND_AVAILABLE",
]
