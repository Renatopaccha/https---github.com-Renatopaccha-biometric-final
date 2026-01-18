"""
Pytest fixtures and configuration for Biometric Backend tests.

This module provides shared fixtures for all test suites:
- Sample DataFrames
- Redis client (if available)
- Backend instances
- Test sessions
"""

import pytest
import pandas as pd
import numpy as np
import sys
import os
from typing import Dict, Generator
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# ===== Configuration =====

def pytest_configure(config):
    """Configure pytest environment."""
    # Create logs directory
    logs_dir = Path(__file__).parent / "logs"
    logs_dir.mkdir(exist_ok=True)


# ===== Fixtures: Sample DataFrames =====

@pytest.fixture
def small_df() -> pd.DataFrame:
    """
    Small DataFrame (10 rows × 3 columns) for fast tests.
    """
    return pd.DataFrame({
        'id': range(1, 11),
        'value': np.random.rand(10),
        'category': ['A', 'B', 'C'] * 3 + ['A']
    })


@pytest.fixture
def medium_df() -> pd.DataFrame:
    """
    Medium DataFrame (1,000 rows × 10 columns) for realistic tests.
    """
    np.random.seed(42)
    return pd.DataFrame({
        f'col_{i}': np.random.rand(1000) for i in range(10)
    })


@pytest.fixture
def large_df() -> pd.DataFrame:
    """
    Large DataFrame (10,000 rows × 50 columns) for performance tests.
    """
    np.random.seed(42)
    return pd.DataFrame({
        f'col_{i}': np.random.rand(10000) for i in range(50)
    })


@pytest.fixture
def df_with_nulls() -> pd.DataFrame:
    """
    DataFrame with missing values for null handling tests.
    """
    df = pd.DataFrame({
        'a': [1, 2, np.nan, 4, 5],
        'b': [np.nan, 2, 3, np.nan, 5],
        'c': [1, 2, 3, 4, 5]
    })
    return df


@pytest.fixture
def df_with_dtypes() -> pd.DataFrame:
    """
    DataFrame with multiple data types for dtype tests.
    """
    return pd.DataFrame({
        'int_col': [1, 2, 3, 4, 5],
        'float_col': [1.1, 2.2, 3.3, 4.4, 5.5],
        'str_col': ['a', 'b', 'c', 'd', 'e'],
        'bool_col': [True, False, True, False, True],
        'datetime_col': pd.date_range('2024-01-01', periods=5)
    })


# ===== Fixtures: Redis =====

@pytest.fixture(scope="session")
def redis_available() -> bool:
    """
    Check if Redis is available for testing.

    Returns:
        bool: True if Redis is reachable
    """
    try:
        from app.internal.storage.redis_client import get_redis_client

        client = get_redis_client()
        return client.ping()
    except Exception:
        return False


@pytest.fixture
def redis_client():
    """
    Get Redis client for tests (skip if not available).
    """
    pytest.importorskip("redis")

    try:
        from app.internal.storage.redis_client import get_redis_client

        client = get_redis_client()
        if not client.ping():
            pytest.skip("Redis not available")

        yield client

    except Exception as e:
        pytest.skip(f"Redis not available: {e}")


@pytest.fixture
def clean_redis(redis_client):
    """
    Clean Redis database before and after test.

    WARNING: This flushes the entire database. Only use in test environment.
    """
    # Clean before test
    redis_client.get_client().flushdb()

    yield redis_client

    # Clean after test
    redis_client.get_client().flushdb()


# ===== Fixtures: Storage Backends =====

@pytest.fixture
def in_memory_backend():
    """
    Create InMemoryBackend instance for testing.
    """
    from app.internal.storage.in_memory_backend import InMemoryBackend

    backend = InMemoryBackend()

    yield backend

    # Cleanup: delete all test sessions
    try:
        backend.cleanup_expired_sessions()
        backend.cleanup_expired_temp_storage()
    except Exception:
        pass


@pytest.fixture
def redis_backend(clean_redis):
    """
    Create RedisBackend instance for testing (requires Redis).
    """
    pytest.importorskip("redis")

    from app.internal.storage.redis_backend import RedisBackend

    try:
        backend = RedisBackend()
        yield backend
    except Exception as e:
        pytest.skip(f"Redis backend not available: {e}")


@pytest.fixture(params=["inmemory", "redis"])
def any_backend(request, in_memory_backend, redis_backend):
    """
    Parametrized fixture that runs tests on both backends.

    This allows writing backend-agnostic tests that verify
    both InMemoryBackend and RedisBackend behave identically.
    """
    if request.param == "inmemory":
        return in_memory_backend
    elif request.param == "redis":
        return redis_backend


# ===== Fixtures: Test Sessions =====

@pytest.fixture
def test_session_id() -> str:
    """
    Generate unique test session ID.
    """
    import uuid
    return f"test-{uuid.uuid4()}"


@pytest.fixture
def created_session(any_backend, small_df, test_session_id):
    """
    Create a test session in any backend.

    Automatically cleaned up after test.
    """
    session_id = test_session_id
    any_backend.create_session(session_id, small_df, "test.csv", ttl_seconds=300)

    yield session_id

    # Cleanup
    try:
        any_backend.delete_session(session_id)
    except Exception:
        pass


# ===== Fixtures: Data Manager =====

@pytest.fixture
def data_manager():
    """
    Get DataManager singleton instance.
    """
    from app.internal.data_manager import data_manager
    return data_manager


# ===== Fixtures: Settings Override =====

@pytest.fixture
def override_settings():
    """
    Temporarily override settings for tests.

    Usage:
        def test_with_redis(override_settings):
            override_settings(redis_enabled=True)
            # ... test code ...
    """
    original_values = {}

    def _override(**kwargs):
        from app.core.config import settings

        for key, value in kwargs.items():
            if hasattr(settings, key):
                original_values[key] = getattr(settings, key)
                setattr(settings, key, value)

    yield _override

    # Restore original values
    from app.core.config import settings
    for key, value in original_values.items():
        setattr(settings, key, value)


# ===== Fixtures: Performance Timing =====

@pytest.fixture
def timer():
    """
    Timer fixture for performance tests.

    Usage:
        def test_performance(timer):
            with timer("operation_name") as t:
                # ... code to time ...

            assert t.elapsed_ms < 100, "Too slow"
    """
    from contextlib import contextmanager
    import time

    class Timer:
        def __init__(self, name: str = "operation"):
            self.name = name
            self.start_time = None
            self.end_time = None
            self.elapsed_ms = None

        def __enter__(self):
            self.start_time = time.time()
            return self

        def __exit__(self, *args):
            self.end_time = time.time()
            self.elapsed_ms = (self.end_time - self.start_time) * 1000
            print(f"[TIMER] {self.name}: {self.elapsed_ms:.2f}ms")

    @contextmanager
    def _timer(name: str = "operation"):
        t = Timer(name)
        with t:
            yield t

    return _timer


# ===== Helper Functions =====

def assert_dataframes_equal(df1: pd.DataFrame, df2: pd.DataFrame, check_dtype: bool = True):
    """
    Assert that two DataFrames are equal.

    More robust than pd.testing.assert_frame_equal for our use case.
    """
    import pandas.testing as pdt

    pdt.assert_frame_equal(df1, df2, check_dtype=check_dtype, check_index_type=False)


# ===== Pytest Hooks =====

def pytest_collection_modifyitems(config, items):
    """
    Automatically mark tests based on their location.
    """
    for item in items:
        # Add marker based on path
        if "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        elif "load" in str(item.fspath):
            item.add_marker(pytest.mark.load)

        # Add redis marker if test uses redis fixtures
        if "redis" in item.fixturenames:
            item.add_marker(pytest.mark.redis)


def pytest_report_header(config):
    """
    Add custom header to pytest output.
    """
    return [
        "Biometric Backend Test Suite",
        "=" * 60,
        "Testing Redis migration (Etapas 1-3)",
    ]
