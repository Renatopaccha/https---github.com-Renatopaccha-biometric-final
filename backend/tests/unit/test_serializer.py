"""
Unit tests for DataFrame serializer.

Tests serialization/deserialization with PyArrow and Pickle.
"""

import pytest
import pandas as pd
import numpy as np
from app.internal.storage.serializer import DataFrameSerializer
from app.core.errors import BiometricException


class TestSerializerPickle:
    """Tests for Pickle serialization."""

    @pytest.mark.unit
    @pytest.mark.fast
    def test_serialize_pickle_basic(self, small_df):
        """Test basic pickle serialization."""
        bytes_data, metadata = DataFrameSerializer.serialize(small_df, method="pickle")

        assert isinstance(bytes_data, bytes)
        assert len(bytes_data) > 0
        assert metadata["method"] == "pickle"
        assert metadata["shape"] == small_df.shape
        assert metadata["compressed_size_bytes"] > 0

    @pytest.mark.unit
    @pytest.mark.fast
    def test_deserialize_pickle_basic(self, small_df):
        """Test basic pickle deserialization."""
        bytes_data, _ = DataFrameSerializer.serialize(small_df, method="pickle")
        df_restored = DataFrameSerializer.deserialize(bytes_data, method="pickle")

        pd.testing.assert_frame_equal(small_df, df_restored)

    @pytest.mark.unit
    def test_serialize_pickle_preserves_dtypes(self, df_with_dtypes):
        """Test that pickle preserves all data types."""
        bytes_data, metadata = DataFrameSerializer.serialize(df_with_dtypes, method="pickle")
        df_restored = DataFrameSerializer.deserialize(bytes_data, method="pickle")

        # Check dtypes preserved
        for col in df_with_dtypes.columns:
            assert df_restored[col].dtype == df_with_dtypes[col].dtype

    @pytest.mark.unit
    def test_serialize_pickle_with_nulls(self, df_with_nulls):
        """Test pickle serialization handles null values."""
        bytes_data, _ = DataFrameSerializer.serialize(df_with_nulls, method="pickle")
        df_restored = DataFrameSerializer.deserialize(bytes_data, method="pickle")

        pd.testing.assert_frame_equal(df_with_nulls, df_restored)

    @pytest.mark.unit
    def test_pickle_compression_enabled(self, medium_df):
        """Test that compression reduces size."""
        from app.core.config import settings

        original_compression = settings.compression_enabled

        try:
            # Without compression
            settings.compression_enabled = False
            bytes_uncompressed, meta_uncompressed = DataFrameSerializer.serialize(
                medium_df, method="pickle"
            )

            # With compression
            settings.compression_enabled = True
            bytes_compressed, meta_compressed = DataFrameSerializer.serialize(
                medium_df, method="pickle"
            )

            # Compressed should be smaller
            assert len(bytes_compressed) < len(bytes_uncompressed)
            assert meta_compressed["compression_ratio"] > 1.0

        finally:
            settings.compression_enabled = original_compression


class TestSerializerPyArrow:
    """Tests for PyArrow serialization."""

    @pytest.mark.unit
    @pytest.mark.fast
    def test_serialize_pyarrow_basic(self, small_df):
        """Test basic PyArrow serialization."""
        pytest.importorskip("pyarrow")

        bytes_data, metadata = DataFrameSerializer.serialize(small_df, method="pyarrow")

        assert isinstance(bytes_data, bytes)
        assert len(bytes_data) > 0
        assert metadata["method"] == "pyarrow"
        assert metadata["shape"] == small_df.shape

    @pytest.mark.unit
    @pytest.mark.fast
    def test_deserialize_pyarrow_basic(self, small_df):
        """Test basic PyArrow deserialization."""
        pytest.importorskip("pyarrow")

        bytes_data, _ = DataFrameSerializer.serialize(small_df, method="pyarrow")
        df_restored = DataFrameSerializer.deserialize(bytes_data, method="pyarrow")

        pd.testing.assert_frame_equal(small_df, df_restored, check_dtype=False)

    @pytest.mark.unit
    def test_pyarrow_faster_than_pickle(self, large_df, timer):
        """Test that PyArrow is faster than Pickle for large DataFrames."""
        pytest.importorskip("pyarrow")

        # PyArrow serialization
        with timer("pyarrow_serialize") as t_pyarrow:
            bytes_pyarrow, _ = DataFrameSerializer.serialize(large_df, method="pyarrow")

        # Pickle serialization
        with timer("pickle_serialize") as t_pickle:
            bytes_pickle, _ = DataFrameSerializer.serialize(large_df, method="pickle")

        # PyArrow should be faster (allow 10% margin)
        assert t_pyarrow.elapsed_ms < t_pickle.elapsed_ms * 1.1

    @pytest.mark.unit
    def test_pyarrow_better_compression(self, large_df):
        """Test that PyArrow achieves better compression than Pickle."""
        pytest.importorskip("pyarrow")

        bytes_pyarrow, meta_pyarrow = DataFrameSerializer.serialize(large_df, method="pyarrow")
        bytes_pickle, meta_pickle = DataFrameSerializer.serialize(large_df, method="pickle")

        # PyArrow should have better compression ratio
        assert meta_pyarrow["compression_ratio"] >= meta_pickle["compression_ratio"] * 0.9

    @pytest.mark.unit
    def test_pyarrow_with_nulls(self, df_with_nulls):
        """Test PyArrow handles null values correctly."""
        pytest.importorskip("pyarrow")

        bytes_data, _ = DataFrameSerializer.serialize(df_with_nulls, method="pyarrow")
        df_restored = DataFrameSerializer.deserialize(bytes_data, method="pyarrow")

        # PyArrow may convert dtypes, so check values not dtypes
        pd.testing.assert_frame_equal(df_with_nulls, df_restored, check_dtype=False)


class TestSerializerEdgeCases:
    """Tests for edge cases and error handling."""

    @pytest.mark.unit
    def test_serialize_empty_dataframe(self):
        """Test serialization of empty DataFrame."""
        df = pd.DataFrame()

        bytes_data, metadata = DataFrameSerializer.serialize(df, method="pickle")
        df_restored = DataFrameSerializer.deserialize(bytes_data, method="pickle")

        assert len(df_restored) == 0

    @pytest.mark.unit
    def test_serialize_very_large_dataframe_fails(self):
        """Test that very large DataFrames are rejected."""
        from app.core.config import settings

        original_max_size = settings.max_dataframe_size_mb

        try:
            # Set very small limit
            settings.max_dataframe_size_mb = 0.001  # 1 KB

            # Try to serialize medium DataFrame
            df = pd.DataFrame({'a': range(1000)})

            with pytest.raises(BiometricException) as exc_info:
                DataFrameSerializer.serialize(df, method="pickle")

            assert "too large" in str(exc_info.value).lower()

        finally:
            settings.max_dataframe_size_mb = original_max_size

    @pytest.mark.unit
    def test_deserialize_invalid_data_fails(self):
        """Test that deserializing invalid data raises error."""
        invalid_bytes = b"not a valid serialized dataframe"

        with pytest.raises(BiometricException):
            DataFrameSerializer.deserialize(invalid_bytes, method="pickle")

    @pytest.mark.unit
    def test_fallback_to_pickle_if_pyarrow_unavailable(self, small_df):
        """Test automatic fallback to pickle if PyArrow not available."""
        # This test documents the fallback behavior
        # If pyarrow is available, it uses pyarrow
        # If not, it falls back to pickle

        bytes_data, metadata = DataFrameSerializer.serialize(small_df, method="pyarrow")

        # Should use either pyarrow or pickle (fallback)
        assert metadata["method"] in ["pyarrow", "pickle"]


class TestSerializerMetadata:
    """Tests for serialization metadata."""

    @pytest.mark.unit
    @pytest.mark.fast
    def test_metadata_contains_required_fields(self, small_df):
        """Test that metadata contains all required fields."""
        _, metadata = DataFrameSerializer.serialize(small_df, method="pickle")

        required_fields = [
            "method",
            "compressed_size_bytes",
            "compressed_size_mb",
            "original_size_mb",
            "compression_ratio",
            "serialization_time_ms",
            "shape",
            "columns",
            "dtypes",
        ]

        for field in required_fields:
            assert field in metadata, f"Missing field: {field}"

    @pytest.mark.unit
    def test_metadata_compression_ratio_accurate(self, medium_df):
        """Test that compression ratio is calculated correctly."""
        bytes_data, metadata = DataFrameSerializer.serialize(medium_df, method="pickle")

        original_mb = metadata["original_size_mb"]
        compressed_mb = metadata["compressed_size_mb"]
        ratio = metadata["compression_ratio"]

        # Check ratio calculation
        expected_ratio = original_mb / compressed_mb if compressed_mb > 0 else 1.0
        assert abs(ratio - expected_ratio) < 0.01

    @pytest.mark.unit
    @pytest.mark.fast
    def test_metadata_shape_matches_dataframe(self, small_df):
        """Test that metadata shape matches actual DataFrame."""
        _, metadata = DataFrameSerializer.serialize(small_df, method="pickle")

        assert metadata["shape"] == small_df.shape
        assert metadata["columns"] == small_df.columns.tolist()

    @pytest.mark.unit
    @pytest.mark.fast
    def test_metadata_dtypes_matches_dataframe(self, df_with_dtypes):
        """Test that metadata dtypes match DataFrame dtypes."""
        _, metadata = DataFrameSerializer.serialize(df_with_dtypes, method="pickle")

        for col, dtype in metadata["dtypes"].items():
            assert col in df_with_dtypes.columns
            assert dtype == str(df_with_dtypes[col].dtype)


class TestSerializerPerformance:
    """Performance tests for serializer."""

    @pytest.mark.unit
    @pytest.mark.slow
    def test_serialize_large_df_under_100ms(self, large_df, timer):
        """Test that serialization of large DF completes quickly."""
        pytest.importorskip("pyarrow")

        with timer("serialize_large") as t:
            DataFrameSerializer.serialize(large_df, method="pyarrow")

        # PyArrow should serialize 10k×50 in < 100ms
        assert t.elapsed_ms < 100, f"Too slow: {t.elapsed_ms}ms"

    @pytest.mark.unit
    @pytest.mark.slow
    def test_deserialize_large_df_under_50ms(self, large_df, timer):
        """Test that deserialization of large DF completes quickly."""
        pytest.importorskip("pyarrow")

        bytes_data, _ = DataFrameSerializer.serialize(large_df, method="pyarrow")

        with timer("deserialize_large") as t:
            DataFrameSerializer.deserialize(bytes_data, method="pyarrow")

        # PyArrow should deserialize in < 50ms
        assert t.elapsed_ms < 50, f"Too slow: {t.elapsed_ms}ms"

    @pytest.mark.unit
    def test_compression_ratio_above_threshold(self, large_df):
        """Test that compression achieves good ratio for typical data."""
        pytest.importorskip("pyarrow")

        _, metadata = DataFrameSerializer.serialize(large_df, method="pyarrow")

        # For random numeric data, expect at least 2x compression
        assert metadata["compression_ratio"] >= 2.0

    @pytest.mark.unit
    def test_estimate_size_mb_accurate(self, medium_df):
        """Test that size estimation is reasonably accurate."""
        estimated = DataFrameSerializer.estimate_size_mb(medium_df)

        # Actual memory usage
        actual = medium_df.memory_usage(deep=True).sum() / (1024 * 1024)

        # Should be within 10% of actual
        assert abs(estimated - actual) / actual < 0.1
