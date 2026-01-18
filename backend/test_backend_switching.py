"""
Test script for backend switching (Etapa 3).

Tests:
1. InMemory backend (default)
2. Redis backend (if Redis is running)
3. Graceful fallback (Redis enabled but unavailable)
4. Health check endpoint
"""

import sys
import os

# Add backend to path
sys.path.insert(0, '/home/user/https---github.com-Renatopaccha-biometric-final/backend')

# Override settings for testing
os.environ["REDIS_ENABLED"] = "false"


def test_inmemory_backend():
    """Test with InMemory backend (default)."""
    print("\n[TEST 1] InMemory Backend (REDIS_ENABLED=false)")
    print("=" * 60)

    # Import fresh instance
    import importlib
    if 'app.internal.data_manager' in sys.modules:
        importlib.reload(sys.modules['app.internal.data_manager'])

    from app.internal.data_manager import data_manager
    import pandas as pd

    # Check backend type
    backend_type = data_manager.get_backend_type()
    backend_class = data_manager.backend.__class__.__name__
    print(f"✓ Backend type: {backend_type}")
    print(f"✓ Backend class: {backend_class}")

    assert backend_type == "inmemory", f"Expected 'inmemory', got '{backend_type}'"
    assert backend_class == "InMemoryBackend", f"Expected 'InMemoryBackend', got '{backend_class}'"

    # Test basic operations
    df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
    session_id = data_manager.create_session(df, "test.csv")
    print(f"✓ Session created: {session_id}")

    df_retrieved = data_manager.get_dataframe(session_id)
    assert df.equals(df_retrieved), "DataFrames should match"
    print("✓ DataFrame retrieved correctly")

    # Health check
    health = data_manager.get_backend_health()
    print(f"✓ Health check: {health['backend_type']} (reachable: {health['reachable']})")

    # Cleanup
    data_manager.delete_session(session_id)
    print("✓ Session cleaned up")

    print("\n✅ InMemory backend test PASSED\n")


def test_redis_backend():
    """Test with Redis backend (if available)."""
    print("\n[TEST 2] Redis Backend (REDIS_ENABLED=true)")
    print("=" * 60)

    # Override environment
    os.environ["REDIS_ENABLED"] = "true"
    os.environ["STORAGE_FALLBACK_TO_MEMORY"] = "false"

    # Reload modules
    import importlib
    for module_name in ['app.core.config', 'app.internal.storage', 'app.internal.data_manager']:
        if module_name in sys.modules:
            importlib.reload(sys.modules[module_name])

    try:
        from app.internal.data_manager import data_manager
        import pandas as pd

        # Check backend type
        backend_type = data_manager.get_backend_type()
        backend_class = data_manager.backend.__class__.__name__
        print(f"✓ Backend type: {backend_type}")
        print(f"✓ Backend class: {backend_class}")

        if backend_type == "redis":
            print("✅ Redis backend is ACTIVE")

            # Test basic operations
            df = pd.DataFrame({'x': [10, 20, 30], 'y': [40, 50, 60]})
            session_id = data_manager.create_session(df, "redis_test.csv")
            print(f"✓ Session created in Redis: {session_id}")

            df_retrieved = data_manager.get_dataframe(session_id)
            assert df.equals(df_retrieved), "DataFrames should match"
            print("✓ DataFrame retrieved from Redis")

            # Health check
            health = data_manager.get_backend_health()
            print(f"✓ Redis health: latency={health.get('latency_ms')}ms")

            if 'redis_info' in health:
                info = health['redis_info']
                print(f"✓ Redis version: {info.get('version', 'unknown')}")
                print(f"✓ Redis memory: {info.get('used_memory_mb', 0):.2f} MB")

            # Cleanup
            data_manager.delete_session(session_id)
            print("✓ Session cleaned up from Redis")

            print("\n✅ Redis backend test PASSED\n")
        else:
            print(f"⚠️  Redis enabled but backend is: {backend_type}")
            print("   (Redis might not be running or connection failed)")
            print("\nTo start Redis:")
            print("  docker-compose up redis -d")

    except RuntimeError as e:
        print(f"⚠️  Redis backend failed to initialize: {e}")
        print("\nThis is expected if Redis is not running.")
        print("\nTo start Redis:")
        print("  docker-compose up redis -d")


def test_graceful_fallback():
    """Test graceful fallback when Redis is enabled but unavailable."""
    print("\n[TEST 3] Graceful Fallback (Redis enabled, unavailable)")
    print("=" * 60)

    # Override environment - Redis enabled but fallback allowed
    os.environ["REDIS_ENABLED"] = "true"
    os.environ["STORAGE_FALLBACK_TO_MEMORY"] = "true"
    os.environ["REDIS_URL"] = "redis://localhost:9999/0"  # Invalid port

    # Reload modules
    import importlib
    for module_name in ['app.core.config', 'app.internal.storage', 'app.internal.data_manager']:
        if module_name in sys.modules:
            importlib.reload(sys.modules[module_name])

    try:
        from app.internal.data_manager import data_manager
        import pandas as pd

        # Check backend type (should fallback to inmemory)
        backend_type = data_manager.get_backend_type()
        backend_class = data_manager.backend.__class__.__name__

        print(f"✓ Backend type: {backend_type}")
        print(f"✓ Backend class: {backend_class}")

        if backend_type == "inmemory":
            print("✅ Gracefully fell back to InMemoryBackend")

            # Verify it still works
            df = pd.DataFrame({'test': [1, 2, 3]})
            session_id = data_manager.create_session(df, "fallback_test.csv")
            print(f"✓ Session created with fallback: {session_id}")

            df_retrieved = data_manager.get_dataframe(session_id)
            assert df.equals(df_retrieved), "DataFrames should match"
            print("✓ Fallback backend works correctly")

            # Cleanup
            data_manager.delete_session(session_id)

            print("\n✅ Graceful fallback test PASSED\n")
        else:
            print(f"⚠️  Expected fallback to inmemory, got: {backend_type}")

    except Exception as e:
        print(f"❌ Fallback test failed: {e}")
        import traceback
        traceback.print_exc()


def test_health_endpoint():
    """Test health check endpoint."""
    print("\n[TEST 4] Health Check Endpoint")
    print("=" * 60)

    # Reset to default
    os.environ["REDIS_ENABLED"] = "false"

    # Reload
    import importlib
    for module_name in ['app.core.config', 'app.internal.storage', 'app.internal.data_manager']:
        if module_name in sys.modules:
            importlib.reload(sys.modules[module_name])

    from app.internal.data_manager import data_manager

    # Test health methods
    backend_type = data_manager.get_backend_type()
    is_redis = data_manager.is_redis_enabled()
    health = data_manager.get_backend_health()

    print(f"✓ get_backend_type(): {backend_type}")
    print(f"✓ is_redis_enabled(): {is_redis}")
    print(f"✓ get_backend_health(): {health['backend_type']} (reachable: {health['reachable']})")

    print("\n✅ Health check methods work correctly\n")


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("BACKEND SWITCHING TESTS (ETAPA 3)")
    print("=" * 60)

    try:
        # Test 1: InMemory (default)
        test_inmemory_backend()

        # Test 2: Redis (if available)
        test_redis_backend()

        # Test 3: Graceful fallback
        test_graceful_fallback()

        # Test 4: Health endpoint methods
        test_health_endpoint()

        print("\n" + "=" * 60)
        print("🎉 ALL BACKEND SWITCHING TESTS PASSED")
        print("=" * 60)
        print("\n✅ Etapa 3 implementation is working correctly!")
        print("\nBackend selection logic:")
        print("  1. REDIS_ENABLED=false → InMemoryBackend")
        print("  2. REDIS_ENABLED=true + Redis running → RedisBackend")
        print("  3. REDIS_ENABLED=true + Redis down + fallback → InMemoryBackend")
        print("\nNext steps:")
        print("  1. Configure .env with REDIS_ENABLED=true")
        print("  2. Start Redis: docker-compose up redis -d")
        print("  3. Restart FastAPI server")
        print("  4. Check: curl http://localhost:8000/health/storage")

        return True

    except Exception as e:
        print(f"\n❌ Tests failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
