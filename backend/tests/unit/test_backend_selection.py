"""
Unit tests for backend selection logic in DataManager.

Tests the feature flag mechanism for switching between InMemory and Redis backends.
"""

import pytest
import os
from unittest.mock import patch, MagicMock
from app.internal.data_manager import DataManager
from app.internal.storage.in_memory_backend import InMemoryBackend


@pytest.mark.unit
@pytest.mark.fast
class TestBackendSelectionInMemory:
    """Test InMemory backend selection."""

    def test_inmemory_when_redis_disabled(self):
        """Should use InMemory backend when REDIS_ENABLED=false."""
        with patch('app.core.config.settings.redis_enabled', False):
            dm = DataManager()
            backend_type = dm.get_backend_type()
            backend_class = dm.backend.__class__.__name__

            assert backend_type == "inmemory"
            assert backend_class == "InMemoryBackend"

    def test_inmemory_is_default(self):
        """InMemory should be the default backend."""
        with patch('app.core.config.settings.redis_enabled', False):
            dm = DataManager()
            assert isinstance(dm.backend, InMemoryBackend)

    def test_backend_health_inmemory(self):
        """Health check should work for InMemory backend."""
        with patch('app.core.config.settings.redis_enabled', False):
            dm = DataManager()
            health = dm.get_backend_health()

            assert health["backend_type"] == "inmemory"
            assert health["reachable"] is True
            assert "storage_dirs" in health


@pytest.mark.unit
@pytest.mark.redis
class TestBackendSelectionRedis:
    """Test Redis backend selection."""

    def test_redis_when_enabled_and_available(self, redis_available):
        """Should use Redis backend when REDIS_ENABLED=true and Redis is running."""
        if not redis_available:
            pytest.skip("Redis not available")

        with patch('app.core.config.settings.redis_enabled', True):
            with patch('app.core.config.settings.storage_fallback_to_memory', False):
                dm = DataManager()
                backend_type = dm.get_backend_type()

                assert backend_type == "redis"
                assert dm.backend.__class__.__name__ == "RedisBackend"

    def test_redis_enabled_flag(self, redis_available):
        """is_redis_enabled() should return True when using Redis."""
        if not redis_available:
            pytest.skip("Redis not available")

        with patch('app.core.config.settings.redis_enabled', True):
            with patch('app.core.config.settings.storage_fallback_to_memory', False):
                dm = DataManager()
                assert dm.is_redis_enabled() is True

    def test_backend_health_redis(self, redis_available):
        """Health check should work for Redis backend."""
        if not redis_available:
            pytest.skip("Redis not available")

        with patch('app.core.config.settings.redis_enabled', True):
            with patch('app.core.config.settings.storage_fallback_to_memory', False):
                dm = DataManager()
                health = dm.get_backend_health()

                assert health["backend_type"] == "redis"
                assert health["reachable"] is True
                assert "latency_ms" in health
                assert "redis_info" in health


@pytest.mark.unit
class TestBackendFallback:
    """Test graceful fallback mechanism."""

    def test_fallback_to_inmemory_when_redis_unavailable(self):
        """Should fallback to InMemory when Redis enabled but unavailable."""
        with patch('app.core.config.settings.redis_enabled', True):
            with patch('app.core.config.settings.storage_fallback_to_memory', True):
                with patch('app.core.config.settings.redis_url', 'redis://localhost:9999/0'):
                    # Invalid port should cause connection failure
                    dm = DataManager()
                    backend_type = dm.get_backend_type()

                    # Should fallback to inmemory
                    assert backend_type == "inmemory"
                    assert dm.backend.__class__.__name__ == "InMemoryBackend"

    def test_no_fallback_raises_error(self):
        """Should raise error when Redis unavailable and fallback disabled."""
        with patch('app.core.config.settings.redis_enabled', True):
            with patch('app.core.config.settings.storage_fallback_to_memory', False):
                with patch('app.core.config.settings.redis_url', 'redis://localhost:9999/0'):
                    with patch('app.internal.storage.REDIS_BACKEND_AVAILABLE', True):
                        with pytest.raises(RuntimeError, match="Redis"):
                            DataManager()

    def test_fallback_logs_warning(self):
        """Should log warning when falling back to InMemory."""
        with patch('app.core.config.settings.redis_enabled', True):
            with patch('app.core.config.settings.storage_fallback_to_memory', True):
                with patch('app.core.config.settings.redis_url', 'redis://localhost:9999/0'):
                    with patch('app.internal.data_manager.logger') as mock_logger:
                        dm = DataManager()
                        # Check that warning was logged (if fallback occurred)
                        if dm.get_backend_type() == "inmemory":
                            assert mock_logger.warning.called or mock_logger.error.called


@pytest.mark.unit
@pytest.mark.fast
class TestBackendInterface:
    """Test backend interface methods."""

    def test_get_backend_type_returns_string(self):
        """get_backend_type() should return valid string."""
        with patch('app.core.config.settings.redis_enabled', False):
            dm = DataManager()
            backend_type = dm.get_backend_type()

            assert isinstance(backend_type, str)
            assert backend_type in ["inmemory", "redis"]

    def test_is_redis_enabled_returns_bool(self):
        """is_redis_enabled() should return boolean."""
        with patch('app.core.config.settings.redis_enabled', False):
            dm = DataManager()
            is_redis = dm.is_redis_enabled()

            assert isinstance(is_redis, bool)

    def test_get_backend_health_returns_dict(self):
        """get_backend_health() should return dict with required keys."""
        with patch('app.core.config.settings.redis_enabled', False):
            dm = DataManager()
            health = dm.get_backend_health()

            assert isinstance(health, dict)
            assert "backend_type" in health
            assert "reachable" in health

    def test_backend_health_includes_latency_for_redis(self, redis_available):
        """Redis backend health should include latency metrics."""
        if not redis_available:
            pytest.skip("Redis not available")

        with patch('app.core.config.settings.redis_enabled', True):
            with patch('app.core.config.settings.storage_fallback_to_memory', False):
                dm = DataManager()
                if dm.get_backend_type() == "redis":
                    health = dm.get_backend_health()
                    assert "latency_ms" in health
                    assert isinstance(health["latency_ms"], (int, float))


@pytest.mark.unit
class TestBackendSwitching:
    """Test runtime backend switching scenarios."""

    def test_backend_persists_across_calls(self):
        """Backend should remain same instance across multiple calls."""
        with patch('app.core.config.settings.redis_enabled', False):
            dm = DataManager()
            backend1 = dm.backend
            backend2 = dm.backend

            assert backend1 is backend2

    def test_singleton_uses_same_backend(self):
        """Multiple DataManager instances should use same backend (singleton)."""
        with patch('app.core.config.settings.redis_enabled', False):
            dm1 = DataManager()
            dm2 = DataManager()

            # Both should be same instance (singleton pattern)
            assert dm1 is dm2
            assert dm1.backend is dm2.backend


@pytest.mark.unit
@pytest.mark.fast
class TestBackendConfiguration:
    """Test backend configuration validation."""

    def test_redis_backend_requires_redis_package(self):
        """Redis backend should check for redis package availability."""
        with patch('app.core.config.settings.redis_enabled', True):
            with patch('app.core.config.settings.storage_fallback_to_memory', False):
                with patch('app.internal.storage.REDIS_BACKEND_AVAILABLE', False):
                    with pytest.raises(RuntimeError, match="Redis"):
                        DataManager()

    def test_pyarrow_available_for_serialization(self):
        """PyArrow should be available for Redis serialization."""
        try:
            import pyarrow
            assert pyarrow is not None
        except ImportError:
            pytest.fail("PyArrow not available but required for Redis backend")

    def test_serialization_settings_valid(self):
        """Serialization settings should have valid values."""
        from app.core.config import settings

        assert settings.serialization_method in ["pyarrow", "pickle"]
        assert settings.compression_enabled in [True, False]
        if settings.compression_enabled:
            assert settings.compression_codec in ["snappy", "gzip", "lz4", "zstd"]


@pytest.mark.unit
@pytest.mark.fast
class TestBackendHealthEndpoint:
    """Test health check methods for API endpoint."""

    def test_health_check_structure(self):
        """Health check should return properly structured data."""
        with patch('app.core.config.settings.redis_enabled', False):
            dm = DataManager()
            health = dm.get_backend_health()

            # Required fields
            assert "backend_type" in health
            assert "reachable" in health

            # Type validation
            assert isinstance(health["backend_type"], str)
            assert isinstance(health["reachable"], bool)

    def test_combined_health_info(self):
        """Should combine backend type, reachability, and health info."""
        with patch('app.core.config.settings.redis_enabled', False):
            dm = DataManager()

            backend_type = dm.get_backend_type()
            is_redis = dm.is_redis_enabled()
            health = dm.get_backend_health()

            # All methods should work together
            assert backend_type == health["backend_type"]
            assert is_redis == (backend_type == "redis")
