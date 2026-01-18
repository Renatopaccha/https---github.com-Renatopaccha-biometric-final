"""
Integration tests for RedisBackend.

Prerequisites:
    1. Start Redis: docker-compose up redis -d
    2. Install dependencies: pip install redis pyarrow
    3. Run tests: python test_redis_backend.py

These tests verify that RedisBackend implements the StorageBackend protocol correctly.
"""

import sys
import pandas as pd
import numpy as np
from datetime import datetime

# Add backend to path
sys.path.insert(0, '/home/user/https---github.com-Renatopaccha-biometric-final/backend')

def test_redis_availability():
    """Test if Redis is available and connectable."""
    print("\n[TEST] Redis Availability")
    print("=" * 60)

    try:
        from app.internal.storage.redis_client import get_redis_client

        client = get_redis_client()
        assert client.is_available(), "Redis client not available"
        assert client.ping(), "Redis ping failed"

        print("✓ Redis is available and reachable")
        return True

    except Exception as e:
        print(f"✗ Redis not available: {e}")
        print("\nTo start Redis:")
        print("  docker-compose up redis -d")
        return False


def test_serializer():
    """Test DataFrame serialization with PyArrow and pickle."""
    print("\n[TEST] Serializer (PyArrow + Pickle)")
    print("=" * 60)

    from app.internal.storage.serializer import DataFrameSerializer

    # Create test DataFrame
    df = pd.DataFrame({
        'int_col': [1, 2, 3, 4, 5],
        'float_col': [1.1, 2.2, 3.3, 4.4, 5.5],
        'str_col': ['a', 'b', 'c', 'd', 'e'],
        'bool_col': [True, False, True, False, True]
    })

    # Test PyArrow serialization
    try:
        print("\n1. Testing PyArrow serialization...")
        bytes_data, metadata = DataFrameSerializer.serialize(df, method="pyarrow")
        print(f"   ✓ Serialized: {metadata['compressed_size_mb']} MB")
        print(f"   ✓ Compression ratio: {metadata['compression_ratio']}x")
        print(f"   ✓ Time: {metadata['serialization_time_ms']} ms")

        df_restored = DataFrameSerializer.deserialize(bytes_data, method="pyarrow")
        assert df.equals(df_restored), "DataFrames not equal after pyarrow roundtrip"
        print("   ✓ Deserialization successful")

    except ImportError:
        print("   ⚠ PyArrow not available, skipping")

    # Test Pickle serialization
    print("\n2. Testing Pickle serialization...")
    bytes_data, metadata = DataFrameSerializer.serialize(df, method="pickle")
    print(f"   ✓ Serialized: {metadata['compressed_size_mb']} MB")
    print(f"   ✓ Compression ratio: {metadata['compression_ratio']}x")

    df_restored = DataFrameSerializer.deserialize(bytes_data, method="pickle")
    assert df.equals(df_restored), "DataFrames not equal after pickle roundtrip"
    print("   ✓ Deserialization successful")

    print("\n✓ All serializer tests passed")


def test_redis_backend_basic():
    """Test basic RedisBackend operations."""
    print("\n[TEST] RedisBackend Basic Operations")
    print("=" * 60)

    from app.internal.storage.redis_backend import RedisBackend
    from app.core.errors import SessionNotFoundException

    backend = RedisBackend()
    print("✓ RedisBackend initialized")

    # Test create session
    print("\n1. Testing create_session...")
    df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
    session_id = "test-session-" + datetime.now().strftime("%Y%m%d%H%M%S")

    backend.create_session(session_id, df, "test.csv", ttl_seconds=300)
    print(f"   ✓ Session created: {session_id}")

    # Test session exists
    print("\n2. Testing session_exists...")
    assert backend.session_exists(session_id), "Session should exist"
    print("   ✓ Session exists")

    # Test get_dataframe
    print("\n3. Testing get_dataframe...")
    df_retrieved = backend.get_dataframe(session_id)
    assert df.equals(df_retrieved), "DataFrames should match"
    print("   ✓ DataFrame retrieved correctly")

    # Test update_dataframe
    print("\n4. Testing update_dataframe...")
    df_modified = df.copy()
    df_modified['c'] = [7, 8, 9]
    backend.update_dataframe(session_id, df_modified)

    df_check = backend.get_dataframe(session_id)
    assert 'c' in df_check.columns, "Column 'c' should exist"
    print("   ✓ DataFrame updated correctly")

    # Test metadata
    print("\n5. Testing get_metadata...")
    metadata = backend.get_metadata(session_id)
    assert metadata['filename'] == 'test.csv', "Filename should match"
    assert metadata['shape']['rows'] == 3, "Rows should match"
    assert metadata['shape']['columns'] == 3, "Columns should match"
    print(f"   ✓ Metadata: {metadata['shape']}")

    # Test delete_session
    print("\n6. Testing delete_session...")
    assert backend.delete_session(session_id), "Delete should succeed"
    assert not backend.session_exists(session_id), "Session should not exist after delete"
    print("   ✓ Session deleted")

    print("\n✓ All basic tests passed")


def test_redis_backend_versioning():
    """Test RedisBackend versioning and undo."""
    print("\n[TEST] RedisBackend Versioning & Undo")
    print("=" * 60)

    from app.internal.storage.redis_backend import RedisBackend

    backend = RedisBackend()
    session_id = "test-version-" + datetime.now().strftime("%Y%m%d%H%M%S")

    # Create initial session
    df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
    backend.create_session(session_id, df, "test.csv", ttl_seconds=300)
    print(f"✓ Session created: {session_id}")

    # Create version before modification
    print("\n1. Testing create_version...")
    version_id = backend.create_version(session_id, df, "Before adding column C")
    print(f"   ✓ Version created: {version_id}")

    # Modify DataFrame
    df_modified = df.copy()
    df_modified['c'] = [7, 8, 9]
    backend.update_dataframe(session_id, df_modified)
    print("   ✓ DataFrame modified")

    # Check modification persisted
    df_check = backend.get_dataframe(session_id)
    assert 'c' in df_check.columns, "Column 'c' should exist"
    print("   ✓ Modification persisted")

    # Test undo
    print("\n2. Testing undo_last_change...")
    df_restored = backend.undo_last_change(session_id)
    assert 'c' not in df_restored.columns, "Column 'c' should not exist after undo"
    assert df_restored['a'].tolist() == [1, 2, 3], "Original data should be restored"
    print("   ✓ Undo successful")

    # Test history
    print("\n3. Testing get_history...")
    history = backend.get_history(session_id)
    assert len(history) == 1, f"Should have 1 version, got {len(history)}"
    print(f"   ✓ History: {len(history)} version(s)")

    # Cleanup
    backend.delete_session(session_id)
    print("\n✓ All versioning tests passed")


def test_redis_backend_audit_log():
    """Test RedisBackend audit logging."""
    print("\n[TEST] RedisBackend Audit Log")
    print("=" * 60)

    from app.internal.storage.redis_backend import RedisBackend

    backend = RedisBackend()
    session_id = "test-audit-" + datetime.now().strftime("%Y%m%d%H%M%S")

    # Create session
    df = pd.DataFrame({'a': [1, 2, 3]})
    backend.create_session(session_id, df, "test.csv", ttl_seconds=300)

    # Get initial audit log
    audit_log = backend.get_audit_log(session_id)
    assert len(audit_log) == 1, "Should have 1 initial audit entry"
    print(f"✓ Initial audit log: {len(audit_log)} entries")

    # Add custom entry
    backend.add_audit_entry(session_id, "Test operation performed")
    audit_log = backend.get_audit_log(session_id)
    assert len(audit_log) == 2, "Should have 2 audit entries"
    print("✓ Audit entry added")

    # Test get_initial_row_count
    initial_rows = backend.get_initial_row_count(session_id)
    assert initial_rows == 3, f"Initial rows should be 3, got {initial_rows}"
    print(f"✓ Initial row count: {initial_rows}")

    # Cleanup
    backend.delete_session(session_id)
    print("\n✓ All audit log tests passed")


def test_redis_backend_intentional_missing():
    """Test RedisBackend intentional missing values."""
    print("\n[TEST] RedisBackend Intentional Missing Values")
    print("=" * 60)

    from app.internal.storage.redis_backend import RedisBackend

    backend = RedisBackend()
    session_id = "test-missing-" + datetime.now().strftime("%Y%m%d%H%M%S")

    # Create session
    df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
    backend.create_session(session_id, df, "test.csv", ttl_seconds=300)

    # Set intentional missing (single column)
    print("\n1. Testing set_intentional_missing...")
    backend.set_intentional_missing(session_id, 'a', [0, 2])
    intentional = backend.get_intentional_missing(session_id)
    assert 'a' in intentional, "Column 'a' should be in intentional_missing"
    assert intentional['a'] == [0, 2], "Indices should match"
    print(f"   ✓ Intentional missing: {intentional}")

    # Set intentional missing (batch)
    print("\n2. Testing set_intentional_missing_batch...")
    backend.set_intentional_missing_batch(session_id, {
        'a': [0, 1, 2],
        'b': [1]
    })
    intentional = backend.get_intentional_missing(session_id)
    assert intentional['a'] == [0, 1, 2], "Column 'a' indices should be updated"
    assert intentional['b'] == [1], "Column 'b' should be added"
    print(f"   ✓ Batch update: {intentional}")

    # Cleanup
    backend.delete_session(session_id)
    print("\n✓ All intentional missing tests passed")


def test_redis_backend_temp_storage():
    """Test RedisBackend temporary storage for multi-sheet Excel."""
    print("\n[TEST] RedisBackend Temporary Storage")
    print("=" * 60)

    from app.internal.storage.redis_backend import RedisBackend

    backend = RedisBackend()
    temp_id = "test-temp-" + datetime.now().strftime("%Y%m%d%H%M%S")

    # Create temp storage
    print("\n1. Testing create_temp_storage...")
    sheets_dict = {
        'Sheet1': pd.DataFrame({'a': [1, 2, 3]}),
        'Sheet2': pd.DataFrame({'b': [4, 5, 6]})
    }
    backend.create_temp_storage(temp_id, sheets_dict, "test.xlsx", ttl_seconds=300)
    print(f"   ✓ Temp storage created: {temp_id}")

    # Get temp storage
    print("\n2. Testing get_temp_storage...")
    temp_data = backend.get_temp_storage(temp_id)
    assert len(temp_data['sheets']) == 2, "Should have 2 sheets"
    assert 'Sheet1' in temp_data['sheets'], "Sheet1 should exist"
    assert temp_data['sheets']['Sheet1']['a'].tolist() == [1, 2, 3], "Sheet1 data should match"
    print(f"   ✓ Temp storage retrieved: {len(temp_data['sheets'])} sheets")

    # Delete temp storage
    print("\n3. Testing delete_temp_storage...")
    assert backend.delete_temp_storage(temp_id), "Delete should succeed"
    print("   ✓ Temp storage deleted")

    print("\n✓ All temp storage tests passed")


def test_redis_backend_health():
    """Test RedisBackend health check."""
    print("\n[TEST] RedisBackend Health Check")
    print("=" * 60)

    from app.internal.storage.redis_backend import RedisBackend

    backend = RedisBackend()

    # Health check
    health = backend.health_check()
    print(f"\nHealth Status:")
    print(f"  Backend: {health['backend_type']}")
    print(f"  Reachable: {health['reachable']}")
    print(f"  Latency: {health.get('latency_ms', 'N/A')} ms")
    print(f"  Active Sessions: {health.get('active_sessions', 0)}")

    if health['reachable'] and 'redis_info' in health:
        info = health['redis_info']
        print(f"\nRedis Info:")
        print(f"  Version: {info.get('version', 'unknown')}")
        print(f"  Memory: {info.get('used_memory_mb', 0):.2f} MB")
        print(f"  Clients: {info.get('connected_clients', 0)}")

    assert health['reachable'], "Redis should be reachable"
    print("\n✓ Health check passed")


def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("REDIS BACKEND INTEGRATION TESTS")
    print("="*60)

    # Check Redis availability first
    if not test_redis_availability():
        print("\n❌ Redis not available. Cannot run tests.")
        print("\nStart Redis with:")
        print("  docker-compose up redis -d")
        return False

    try:
        # Run all tests
        test_serializer()
        test_redis_backend_basic()
        test_redis_backend_versioning()
        test_redis_backend_audit_log()
        test_redis_backend_intentional_missing()
        test_redis_backend_temp_storage()
        test_redis_backend_health()

        print("\n" + "="*60)
        print("🎉 ALL TESTS PASSED")
        print("="*60)
        print("\n✅ RedisBackend implementation is working correctly!")
        print("✅ Ready for Etapa 3 (activate Redis in production)")

        return True

    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        return False

    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
