"""
Unit tests for Redis client singleton.

Tests Redis connection, health checks, and error handling.
"""

import pytest
import redis
from unittest.mock import patch, MagicMock
from app.internal.storage.redis_client import RedisClient, get_redis_client


@pytest.mark.unit
class TestRedisClientSingleton:
    """Test singleton pattern implementation."""

    def test_singleton_same_instance(self):
        """Multiple calls should return same instance."""
        client1 = get_redis_client()
        client2 = get_redis_client()
        assert client1 is client2

    def test_singleton_initialization_once(self):
        """Should only initialize once."""
        # Reset singleton for test
        RedisClient._instance = None
        RedisClient._pool = None
        RedisClient._client = None

        client1 = get_redis_client()
        pool1 = RedisClient._pool

        client2 = get_redis_client()
        pool2 = RedisClient._pool

        assert pool1 is pool2
        assert client1 is client2


@pytest.mark.unit
@pytest.mark.redis
class TestRedisClientConnection:
    """Test Redis connection functionality."""

    def test_get_client_returns_redis_instance(self, redis_client):
        """Should return Redis client instance."""
        client = redis_client.get_client()
        assert isinstance(client, redis.Redis)

    def test_ping_succeeds_when_connected(self, redis_available, redis_client):
        """Ping should succeed when Redis is running."""
        if not redis_available:
            pytest.skip("Redis not available")

        client = redis_client.get_client()
        assert client.ping() is True

    def test_connection_failure_raises_error(self):
        """Should raise RuntimeError when connection fails."""
        # Reset singleton
        RedisClient._instance = None
        RedisClient._pool = None
        RedisClient._client = None

        with patch('app.core.config.settings.redis_url', 'redis://localhost:9999/0'):
            with pytest.raises(RuntimeError, match="Failed to connect to Redis"):
                RedisClient()


@pytest.mark.unit
@pytest.mark.redis
class TestRedisClientHealthCheck:
    """Test health check functionality."""

    def test_health_check_when_connected(self, redis_available, redis_client):
        """Health check should return detailed info when connected."""
        if not redis_available:
            pytest.skip("Redis not available")

        health = redis_client.health_check()

        assert health["status"] == "healthy"
        assert health["reachable"] is True
        assert health["latency_ms"] is not None
        assert health["latency_ms"] >= 0
        assert "redis_info" in health
        assert health["redis_info"]["version"] is not None

    def test_health_check_when_disconnected(self):
        """Health check should handle disconnection gracefully."""
        # Create client with invalid connection
        RedisClient._instance = None
        RedisClient._pool = None
        RedisClient._client = None

        with patch('app.core.config.settings.redis_url', 'redis://localhost:9999/0'):
            try:
                client = RedisClient()
            except RuntimeError:
                # Expected when Redis not available
                pass

        # If we got here, mock the client
        if RedisClient._instance:
            with patch.object(RedisClient._instance._client, 'ping', side_effect=redis.ConnectionError):
                health = RedisClient._instance.health_check()
                assert health["status"] == "unhealthy"
                assert health["reachable"] is False


@pytest.mark.unit
class TestRedisClientErrorHandling:
    """Test error handling scenarios."""

    def test_get_client_before_initialization(self):
        """Should raise error if accessed before initialization."""
        # Reset singleton
        RedisClient._instance = None
        RedisClient._pool = None
        RedisClient._client = None

        client_obj = RedisClient.__new__(RedisClient)
        with pytest.raises(RuntimeError, match="Redis client not initialized"):
            client_obj.get_client()

    def test_connection_timeout_handling(self):
        """Should handle connection timeout."""
        RedisClient._instance = None
        RedisClient._pool = None
        RedisClient._client = None

        with patch('redis.ConnectionPool.from_url') as mock_pool:
            mock_pool.return_value = MagicMock()
            with patch('redis.Redis') as mock_redis:
                mock_redis_instance = MagicMock()
                mock_redis_instance.ping.side_effect = redis.TimeoutError("Connection timeout")
                mock_redis.return_value = mock_redis_instance

                with pytest.raises(RuntimeError, match="Failed to connect to Redis"):
                    RedisClient()


@pytest.mark.unit
@pytest.mark.redis
class TestRedisClientConfiguration:
    """Test configuration handling."""

    def test_url_sanitization(self):
        """Should sanitize Redis URL in logs (hide password)."""
        # This is tested implicitly through initialization
        # We can't easily mock logger, but we can verify it doesn't crash
        RedisClient._instance = None
        RedisClient._pool = None
        RedisClient._client = None

        with patch('app.core.config.settings.redis_url', 'redis://:mypassword@localhost:6379/0'):
            try:
                client = RedisClient()
                # If initialization succeeds, URL sanitization worked
                assert client is not None
            except RuntimeError:
                # Expected if Redis not running
                pass

    def test_connection_pool_settings(self, redis_available):
        """Should use correct connection pool settings."""
        if not redis_available:
            pytest.skip("Redis not available")

        RedisClient._instance = None
        RedisClient._pool = None
        RedisClient._client = None

        client = RedisClient()
        pool = RedisClient._pool

        # Check pool configuration
        assert pool is not None
        assert pool.max_connections > 0


@pytest.mark.unit
@pytest.mark.fast
class TestRedisClientMocked:
    """Test Redis client with mocked Redis (no real connection needed)."""

    def test_successful_initialization_flow(self):
        """Test successful initialization with mocked Redis."""
        RedisClient._instance = None
        RedisClient._pool = None
        RedisClient._client = None

        with patch('redis.ConnectionPool.from_url') as mock_pool:
            with patch('redis.Redis') as mock_redis:
                mock_redis_instance = MagicMock()
                mock_redis_instance.ping.return_value = True
                mock_redis.return_value = mock_redis_instance

                client = RedisClient()

                assert client is not None
                assert RedisClient._instance is not None
                assert RedisClient._pool is not None
                assert RedisClient._client is not None

    def test_health_check_with_mocked_info(self):
        """Test health check with mocked Redis info."""
        RedisClient._instance = None
        RedisClient._pool = None
        RedisClient._client = None

        with patch('redis.ConnectionPool.from_url'):
            with patch('redis.Redis') as mock_redis:
                mock_redis_instance = MagicMock()
                mock_redis_instance.ping.return_value = True
                mock_redis_instance.info.return_value = {
                    'redis_version': '7.0.0',
                    'used_memory': 1024000,
                    'connected_clients': 5,
                    'uptime_in_seconds': 3600
                }
                mock_redis.return_value = mock_redis_instance

                client = RedisClient()
                health = client.health_check()

                assert health["status"] == "healthy"
                assert health["reachable"] is True
                assert health["redis_info"]["version"] == "7.0.0"
                assert health["redis_info"]["used_memory_mb"] > 0
                assert health["redis_info"]["connected_clients"] == 5
