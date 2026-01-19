"""
Redis client singleton with connection pooling and health checks.
Provides a centralized Redis connection for the RedisBackend.
"""

import logging
from typing import Optional
from urllib.parse import urlparse

from app.core.config import settings

logger = logging.getLogger(__name__)

# Try importing redis (optional dependency)
try:
    import redis
    from redis.connection import ConnectionPool
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("[Redis] redis-py not installed. RedisBackend will not be available.")


class RedisClient:
    """
    Singleton Redis client with connection pooling.

    Provides a thread-safe, reusable connection pool for Redis operations.
    Automatically handles connection pooling, health checks, and reconnection.
    """

    _instance: Optional["RedisClient"] = None
    _pool = None  # Type: Optional[ConnectionPool] when redis is available
    _client = None  # Type: Optional[redis.Redis] when redis is available

    def __new__(cls) -> "RedisClient":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            if REDIS_AVAILABLE:
                cls._instance._initialize()
            else:
                logger.error("[Redis] Cannot initialize: redis-py not available")
        return cls._instance

    def _initialize(self) -> None:
        """Initialize Redis connection pool."""
        try:
            logger.info(f"[Redis] Initializing connection pool: {self._sanitize_url(settings.redis_url)}")

            # Parse Redis URL to handle password properly
            parsed = urlparse(settings.redis_url)

            # Build connection pool parameters
            pool_kwargs = {
                "max_connections": settings.redis_max_connections,
                "socket_timeout": settings.redis_socket_timeout,
                "socket_connect_timeout": settings.redis_socket_connect_timeout,
                "retry_on_timeout": settings.redis_retry_on_timeout,
                "health_check_interval": settings.redis_health_check_interval,
                "decode_responses": False,  # We handle bytes for DataFrames
            }

            # Add password if provided in settings or URL
            if settings.redis_password:
                pool_kwargs["password"] = settings.redis_password
            elif parsed.password:
                pool_kwargs["password"] = parsed.password

            # Create connection pool from URL
            self._pool = ConnectionPool.from_url(
                settings.redis_url,
                **pool_kwargs
            )

            self._client = redis.Redis(connection_pool=self._pool)

            # Test connection
            self._client.ping()
            logger.info("[Redis] ✓ Connection pool initialized successfully")

        except Exception as e:
            logger.error(f"[Redis] ✗ Failed to initialize: {e}")
            self._client = None
            self._pool = None
            raise

    def _sanitize_url(self, url: str) -> str:
        """Sanitize Redis URL for logging (hide password)."""
        try:
            parsed = urlparse(url)
            if parsed.password:
                sanitized = url.replace(parsed.password, "***")
                return sanitized
            return url
        except Exception:
            return url

    def get_client(self) -> "redis.Redis":
        """
        Get Redis client instance.

        Returns:
            redis.Redis: Client instance

        Raises:
            RuntimeError: If Redis client not initialized
        """
        if not REDIS_AVAILABLE:
            raise RuntimeError("redis-py library is not installed. Install with: pip install redis")

        if self._client is None:
            raise RuntimeError("Redis client not initialized")

        return self._client

    def is_available(self) -> bool:
        """
        Check if Redis client is available and initialized.

        Returns:
            bool: True if client is ready to use
        """
        return REDIS_AVAILABLE and self._client is not None

    def ping(self) -> bool:
        """
        Check if Redis is reachable.

        Returns:
            bool: True if ping successful
        """
        if not self.is_available():
            return False

        try:
            return self._client.ping()
        except Exception as e:
            logger.error(f"[Redis] Ping failed: {e}")
            return False

    def get_info(self) -> dict:
        """
        Get Redis server info.

        Returns:
            dict: Redis INFO command output
        """
        if not self.is_available():
            return {}

        try:
            return self._client.info()
        except Exception as e:
            logger.error(f"[Redis] Failed to get info: {e}")
            return {}

    def get_memory_usage(self) -> int:
        """
        Get Redis memory usage in bytes.

        Returns:
            int: Memory usage in bytes, 0 if unavailable
        """
        info = self.get_info()
        return info.get("used_memory", 0)

    def flush_db(self) -> bool:
        """
        Flush current database (DANGEROUS - use only in tests).

        Returns:
            bool: True if successful
        """
        if not self.is_available():
            return False

        try:
            self._client.flushdb()
            logger.warning("[Redis] Database flushed (FLUSHDB executed)")
            return True
        except Exception as e:
            logger.error(f"[Redis] Failed to flush database: {e}")
            return False

    def close(self) -> None:
        """Close Redis connection pool."""
        if self._pool:
            self._pool.disconnect()
            logger.info("[Redis] Connection pool closed")
            self._client = None
            self._pool = None


# Global singleton instance (lazy initialization)
_redis_client_instance: Optional[RedisClient] = None


def get_redis_client() -> RedisClient:
    """
    Get the global RedisClient singleton instance.

    Returns:
        RedisClient: Singleton instance

    Raises:
        RuntimeError: If Redis is not available
    """
    global _redis_client_instance

    if _redis_client_instance is None:
        if not REDIS_AVAILABLE:
            raise RuntimeError(
                "Redis is not available. Install redis-py: pip install redis"
            )
        _redis_client_instance = RedisClient()

    return _redis_client_instance
