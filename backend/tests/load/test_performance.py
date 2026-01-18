"""
Load and performance tests.

Tests system behavior under high load and stress conditions.
"""

import pytest
import pandas as pd
import numpy as np
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed


class TestPerformanceBenchmarks:
    """Performance benchmark tests."""

    @pytest.mark.load
    @pytest.mark.slow
    def test_create_session_performance(self, any_backend, medium_df, timer):
        """Test create_session performance."""
        with timer("create_session") as t:
            any_backend.create_session("perf-test-1", medium_df, "data.csv", ttl_seconds=300)

        # Should complete in < 50ms
        assert t.elapsed_ms < 50, f"Too slow: {t.elapsed_ms}ms"

        # Cleanup
        any_backend.delete_session("perf-test-1")


    @pytest.mark.load
    @pytest.mark.slow
    def test_get_dataframe_performance(self, any_backend, medium_df, timer):
        """Test get_dataframe performance."""
        session_id = "perf-test-2"

        # Setup
        any_backend.create_session(session_id, medium_df, "data.csv", ttl_seconds=300)

        # Benchmark
        with timer("get_dataframe") as t:
            any_backend.get_dataframe(session_id)

        # Should complete in < 30ms
        assert t.elapsed_ms < 30, f"Too slow: {t.elapsed_ms}ms"

        # Cleanup
        any_backend.delete_session(session_id)


    @pytest.mark.load
    @pytest.mark.slow
    def test_update_dataframe_performance(self, any_backend, medium_df, timer):
        """Test update_dataframe performance."""
        session_id = "perf-test-3"

        # Setup
        any_backend.create_session(session_id, medium_df, "data.csv", ttl_seconds=300)

        # Modify
        df_modified = medium_df.copy()
        df_modified["new_col"] = np.random.rand(len(df_modified))

        # Benchmark
        with timer("update_dataframe") as t:
            any_backend.update_dataframe(session_id, df_modified)

        # Should complete in < 40ms
        assert t.elapsed_ms < 40, f"Too slow: {t.elapsed_ms}ms"

        # Cleanup
        any_backend.delete_session(session_id)


    @pytest.mark.load
    @pytest.mark.slow
    def test_create_version_performance(self, any_backend, medium_df, timer):
        """Test create_version performance."""
        session_id = "perf-test-4"

        # Setup
        any_backend.create_session(session_id, medium_df, "data.csv", ttl_seconds=300)

        # Benchmark
        with timer("create_version") as t:
            any_backend.create_version(session_id, medium_df, "Test version")

        # Should complete in < 60ms
        assert t.elapsed_ms < 60, f"Too slow: {t.elapsed_ms}ms"

        # Cleanup
        any_backend.delete_session(session_id)


class TestThroughput:
    """Throughput tests (operations per second)."""

    @pytest.mark.load
    @pytest.mark.slow
    def test_read_throughput(self, any_backend, small_df):
        """Test read throughput (reads/second)."""
        session_id = "throughput-read"

        # Setup
        any_backend.create_session(session_id, small_df, "data.csv", ttl_seconds=300)

        # Measure throughput
        num_reads = 100
        start_time = time.time()

        for _ in range(num_reads):
            any_backend.get_dataframe(session_id)

        elapsed_time = time.time() - start_time
        throughput = num_reads / elapsed_time

        print(f"Read throughput: {throughput:.2f} reads/sec")

        # Should handle at least 50 reads/second
        assert throughput > 50, f"Low throughput: {throughput:.2f} reads/sec"

        # Cleanup
        any_backend.delete_session(session_id)


    @pytest.mark.load
    @pytest.mark.slow
    def test_write_throughput(self, any_backend, small_df):
        """Test write throughput (writes/second)."""
        num_writes = 50
        start_time = time.time()

        session_ids = []

        for i in range(num_writes):
            session_id = f"throughput-write-{i}"
            session_ids.append(session_id)
            any_backend.create_session(session_id, small_df, "data.csv", ttl_seconds=300)

        elapsed_time = time.time() - start_time
        throughput = num_writes / elapsed_time

        print(f"Write throughput: {throughput:.2f} writes/sec")

        # Should handle at least 30 writes/second
        assert throughput > 30, f"Low throughput: {throughput:.2f} writes/sec"

        # Cleanup
        for session_id in session_ids:
            any_backend.delete_session(session_id)


class TestConcurrency:
    """Concurrency and threading tests."""

    @pytest.mark.load
    @pytest.mark.concurrency
    @pytest.mark.slow
    def test_concurrent_reads(self, any_backend, medium_df):
        """Test concurrent reads from multiple threads."""
        session_id = "concurrent-reads"

        # Setup
        any_backend.create_session(session_id, medium_df, "data.csv", ttl_seconds=300)

        # Concurrent reads
        num_threads = 10
        reads_per_thread = 20
        errors = []

        def read_worker():
            try:
                for _ in range(reads_per_thread):
                    df = any_backend.get_dataframe(session_id)
                    assert len(df) == len(medium_df)
            except Exception as e:
                errors.append(e)

        # Execute
        threads = [threading.Thread(target=read_worker) for _ in range(num_threads)]
        start_time = time.time()

        for t in threads:
            t.start()

        for t in threads:
            t.join()

        elapsed_time = time.time() - start_time

        # Check no errors
        assert len(errors) == 0, f"Errors occurred: {errors}"

        # Log performance
        total_reads = num_threads * reads_per_thread
        throughput = total_reads / elapsed_time
        print(f"Concurrent read throughput: {throughput:.2f} reads/sec")

        # Cleanup
        any_backend.delete_session(session_id)


    @pytest.mark.load
    @pytest.mark.concurrency
    @pytest.mark.slow
    def test_concurrent_writes(self, any_backend, small_df):
        """Test concurrent writes from multiple threads."""
        num_threads = 10
        writes_per_thread = 10
        errors = []
        session_ids = []
        lock = threading.Lock()

        def write_worker(thread_id):
            try:
                for i in range(writes_per_thread):
                    session_id = f"concurrent-write-{thread_id}-{i}"
                    any_backend.create_session(session_id, small_df, "data.csv", ttl_seconds=300)

                    with lock:
                        session_ids.append(session_id)
            except Exception as e:
                errors.append(e)

        # Execute
        threads = [threading.Thread(target=write_worker, args=(i,)) for i in range(num_threads)]
        start_time = time.time()

        for t in threads:
            t.start()

        for t in threads:
            t.join()

        elapsed_time = time.time() - start_time

        # Check no errors
        assert len(errors) == 0, f"Errors occurred: {errors}"

        # Verify all sessions created
        assert len(session_ids) == num_threads * writes_per_thread

        # Log performance
        throughput = len(session_ids) / elapsed_time
        print(f"Concurrent write throughput: {throughput:.2f} writes/sec")

        # Cleanup
        for session_id in session_ids:
            try:
                any_backend.delete_session(session_id)
            except:
                pass


    @pytest.mark.load
    @pytest.mark.concurrency
    @pytest.mark.slow
    def test_concurrent_mixed_operations(self, any_backend, small_df):
        """Test concurrent mixed read/write/update operations."""
        num_workers = 20
        operations_per_worker = 10
        errors = []
        session_ids = []
        lock = threading.Lock()

        def mixed_worker(worker_id):
            try:
                session_id = f"mixed-{worker_id}"

                with lock:
                    session_ids.append(session_id)

                # Create
                any_backend.create_session(session_id, small_df, "data.csv", ttl_seconds=300)

                for i in range(operations_per_worker):
                    operation = i % 3

                    if operation == 0:
                        # Read
                        any_backend.get_dataframe(session_id)
                    elif operation == 1:
                        # Update
                        df = small_df.copy()
                        df[f"col_{i}"] = i
                        any_backend.update_dataframe(session_id, df)
                    else:
                        # Version
                        df = any_backend.get_dataframe(session_id)
                        any_backend.create_version(session_id, df, f"Version {i}")

            except Exception as e:
                errors.append(e)

        # Execute
        threads = [threading.Thread(target=mixed_worker, args=(i,)) for i in range(num_workers)]
        start_time = time.time()

        for t in threads:
            t.start()

        for t in threads:
            t.join()

        elapsed_time = time.time() - start_time

        # Check no errors
        assert len(errors) == 0, f"Errors occurred: {errors}"

        # Log performance
        total_ops = num_workers * (1 + operations_per_worker)  # 1 create + N operations
        throughput = total_ops / elapsed_time
        print(f"Mixed operations throughput: {throughput:.2f} ops/sec")

        # Cleanup
        for session_id in session_ids:
            try:
                any_backend.delete_session(session_id)
            except:
                pass


class TestStress:
    """Stress tests to find breaking points."""

    @pytest.mark.load
    @pytest.mark.slow
    def test_many_sessions_stress(self, any_backend, small_df):
        """Test handling of many sessions (stress test)."""
        num_sessions = 500  # Create 500 sessions
        session_ids = []

        try:
            # Create many sessions
            start_time = time.time()

            for i in range(num_sessions):
                session_id = f"stress-{i}"
                session_ids.append(session_id)
                any_backend.create_session(session_id, small_df, "data.csv", ttl_seconds=300)

                # Log progress
                if (i + 1) % 100 == 0:
                    print(f"Created {i + 1} sessions...")

            elapsed_time = time.time() - start_time

            print(f"Created {num_sessions} sessions in {elapsed_time:.2f}s")
            print(f"Average: {elapsed_time/num_sessions*1000:.2f}ms per session")

            # Verify all exist
            for session_id in session_ids:
                assert any_backend.session_exists(session_id)

            print(f"All {num_sessions} sessions verified")

        finally:
            # Cleanup
            print("Cleaning up...")
            for session_id in session_ids:
                try:
                    any_backend.delete_session(session_id)
                except:
                    pass


    @pytest.mark.load
    @pytest.mark.slow
    def test_large_dataframe_stress(self, any_backend):
        """Test handling of very large DataFrames."""
        # Create very large DataFrame (100k rows × 100 columns)
        large_df = pd.DataFrame({
            f'col_{i}': np.random.rand(100000) for i in range(100)
        })

        print(f"DataFrame size: {large_df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")

        session_id = "large-df-stress"

        try:
            # Time creation
            start_time = time.time()
            any_backend.create_session(session_id, large_df, "large.csv", ttl_seconds=300)
            create_time = (time.time() - start_time) * 1000

            print(f"Create time: {create_time:.2f}ms")

            # Time retrieval
            start_time = time.time()
            df_retrieved = any_backend.get_dataframe(session_id)
            retrieve_time = (time.time() - start_time) * 1000

            print(f"Retrieve time: {retrieve_time:.2f}ms")

            # Verify integrity
            assert len(df_retrieved) == len(large_df)
            assert len(df_retrieved.columns) == len(large_df.columns)

            # Should handle large DataFrame (allow more time)
            assert create_time < 2000, f"Create too slow: {create_time}ms"
            assert retrieve_time < 1000, f"Retrieve too slow: {retrieve_time}ms"

        finally:
            # Cleanup
            any_backend.delete_session(session_id)


class TestMemoryUsage:
    """Memory usage and leak tests."""

    @pytest.mark.load
    @pytest.mark.slow
    def test_no_memory_leak_on_repeated_operations(self, any_backend, medium_df):
        """Test that repeated operations don't cause memory leaks."""
        import gc
        import psutil
        import os

        process = psutil.Process(os.getpid())

        session_id = "memory-test"

        # Setup
        any_backend.create_session(session_id, medium_df, "data.csv", ttl_seconds=300)

        # Get initial memory
        gc.collect()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Perform many operations
        for i in range(100):
            df = any_backend.get_dataframe(session_id)
            df["new_col"] = i
            any_backend.update_dataframe(session_id, df)

        # Get final memory
        gc.collect()
        final_memory = process.memory_info().rss / 1024 / 1024  # MB

        memory_increase = final_memory - initial_memory

        print(f"Initial memory: {initial_memory:.2f} MB")
        print(f"Final memory: {final_memory:.2f} MB")
        print(f"Increase: {memory_increase:.2f} MB")

        # Memory increase should be reasonable (< 100 MB)
        assert memory_increase < 100, f"Possible memory leak: {memory_increase:.2f} MB"

        # Cleanup
        any_backend.delete_session(session_id)
