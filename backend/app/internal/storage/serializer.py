"""
DataFrame serialization with multiple backends (pyarrow, pickle).
Handles compression and size limits for efficient Redis storage.
"""

import pandas as pd
import pickle
import zlib
import time
import logging
from typing import Tuple, Literal, Dict
from io import BytesIO

from app.core.config import settings
from app.core.errors import BiometricException

logger = logging.getLogger(__name__)

# Try importing pyarrow (optional dependency)
try:
    import pyarrow as pa
    import pyarrow.parquet as pq
    PYARROW_AVAILABLE = True
except ImportError:
    PYARROW_AVAILABLE = False
    logger.warning("[Serializer] pyarrow not available, will use pickle fallback")


class DataFrameSerializer:
    """
    Handles DataFrame serialization/deserialization with compression.

    Supports:
    - pyarrow (recommended): ~3-5x faster than pickle, better compression
    - pickle + zlib: fallback option
    """

    @staticmethod
    def serialize(
        df: pd.DataFrame,
        method: Literal["pyarrow", "pickle"] = None
    ) -> Tuple[bytes, Dict]:
        """
        Serialize DataFrame to bytes with compression.

        Args:
            df: DataFrame to serialize
            method: Serialization method ("pyarrow" or "pickle"). If None, uses settings.

        Returns:
            Tuple[bytes, metadata]: Serialized bytes and metadata dict

        Raises:
            BiometricException: If serialization fails or DF exceeds size limit
        """
        start_time = time.time()

        # Determine method
        if method is None:
            method = settings.serialization_method

        # Check DataFrame size estimate (rough memory usage)
        estimated_size_mb = df.memory_usage(deep=True).sum() / (1024 * 1024)
        if estimated_size_mb > settings.max_dataframe_size_mb:
            raise BiometricException(
                f"DataFrame too large ({estimated_size_mb:.2f} MB). "
                f"Maximum allowed: {settings.max_dataframe_size_mb} MB",
                413
            )

        try:
            # Choose serialization method
            if method == "pyarrow" and PYARROW_AVAILABLE:
                serialized_bytes = DataFrameSerializer._serialize_pyarrow(df)
                actual_method = "pyarrow"
            else:
                # Fallback to pickle if pyarrow not available
                if method == "pyarrow" and not PYARROW_AVAILABLE:
                    logger.debug(f"[Serializer] PyArrow requested but not available, using pickle")
                serialized_bytes = DataFrameSerializer._serialize_pickle(df)
                actual_method = "pickle"

            elapsed_ms = (time.time() - start_time) * 1000
            compressed_size_mb = len(serialized_bytes) / (1024 * 1024)

            # Calculate compression ratio
            compression_ratio = estimated_size_mb / compressed_size_mb if compressed_size_mb > 0 else 1.0

            metadata = {
                "method": actual_method,
                "compressed_size_bytes": len(serialized_bytes),
                "compressed_size_mb": round(compressed_size_mb, 3),
                "original_size_mb": round(estimated_size_mb, 3),
                "compression_ratio": round(compression_ratio, 2),
                "serialization_time_ms": round(elapsed_ms, 2),
                "shape": df.shape,
                "columns": df.columns.tolist(),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "compression_enabled": settings.compression_enabled,
                "compression_codec": settings.compression_codec if settings.compression_enabled else None
            }

            logger.debug(
                f"[Serializer] Serialized {df.shape} DataFrame with {actual_method}: "
                f"{compressed_size_mb:.2f} MB ({compression_ratio:.1f}x compression) "
                f"in {elapsed_ms:.2f}ms"
            )

            return serialized_bytes, metadata

        except BiometricException:
            raise
        except Exception as e:
            logger.error(f"[Serializer] Serialization failed: {e}")
            raise BiometricException(f"Failed to serialize DataFrame: {str(e)}", 500)

    @staticmethod
    def _serialize_pyarrow(df: pd.DataFrame) -> bytes:
        """
        Serialize using Apache Arrow + Parquet format.

        Advantages:
        - ~3-5x faster than pickle
        - Better compression (especially for numeric data)
        - Column-oriented storage (efficient for analytics)
        """
        # Convert to Arrow Table (preserve index)
        table = pa.Table.from_pandas(df, preserve_index=True)

        # Serialize to Parquet bytes with compression
        buffer = BytesIO()

        # Choose compression codec
        compression = None
        if settings.compression_enabled:
            compression = settings.compression_codec

        pq.write_table(
            table,
            buffer,
            compression=compression,
            use_dictionary=True,  # Efficient for categorical data
            write_statistics=False,  # Skip stats to reduce size
            compression_level=None  # Use default compression level
        )

        return buffer.getvalue()

    @staticmethod
    def _serialize_pickle(df: pd.DataFrame) -> bytes:
        """
        Serialize using pickle + zlib compression.

        Fallback option when pyarrow is not available.
        """
        pickled = pickle.dumps(df, protocol=pickle.HIGHEST_PROTOCOL)

        if settings.compression_enabled:
            # Compress with zlib (level 6 = good balance)
            compressed = zlib.compress(pickled, level=6)
            return compressed

        return pickled

    @staticmethod
    def deserialize(
        data: bytes,
        method: Literal["pyarrow", "pickle"] = None
    ) -> pd.DataFrame:
        """
        Deserialize bytes to DataFrame.

        Args:
            data: Serialized bytes
            method: Method used for serialization. If None, auto-detects.

        Returns:
            pd.DataFrame: Deserialized DataFrame

        Raises:
            BiometricException: If deserialization fails
        """
        start_time = time.time()

        # Determine method
        if method is None:
            method = settings.serialization_method

        try:
            # Try to deserialize with specified method
            if method == "pyarrow" and PYARROW_AVAILABLE:
                df = DataFrameSerializer._deserialize_pyarrow(data)
                actual_method = "pyarrow"
            else:
                # Try pickle
                df = DataFrameSerializer._deserialize_pickle(data)
                actual_method = "pickle"

            elapsed_ms = (time.time() - start_time) * 1000
            logger.debug(
                f"[Serializer] Deserialized {df.shape} DataFrame with {actual_method} "
                f"in {elapsed_ms:.2f}ms"
            )

            return df

        except Exception as e:
            # If primary method fails, try fallback
            if method == "pyarrow":
                logger.warning(f"[Serializer] PyArrow deserialization failed, trying pickle: {e}")
                try:
                    df = DataFrameSerializer._deserialize_pickle(data)
                    logger.info("[Serializer] Successfully deserialized with pickle fallback")
                    return df
                except Exception as e2:
                    logger.error(f"[Serializer] Pickle fallback also failed: {e2}")

            logger.error(f"[Serializer] Deserialization failed: {e}")
            raise BiometricException(f"Failed to deserialize DataFrame: {str(e)}", 500)

    @staticmethod
    def _deserialize_pyarrow(data: bytes) -> pd.DataFrame:
        """Deserialize pyarrow/parquet bytes."""
        buffer = BytesIO(data)
        table = pq.read_table(buffer)
        df = table.to_pandas()

        # Restore index if it was preserved
        if '__index_level_0__' in df.columns:
            df.set_index('__index_level_0__', inplace=True)
            df.index.name = None

        return df

    @staticmethod
    def _deserialize_pickle(data: bytes) -> pd.DataFrame:
        """Deserialize pickle bytes (with optional zlib decompression)."""
        try:
            # Try decompressing first (if data was compressed)
            decompressed = zlib.decompress(data)
            df = pickle.loads(decompressed)
        except zlib.error:
            # Data wasn't compressed, load directly
            df = pickle.loads(data)

        return df

    @staticmethod
    def estimate_size_mb(df: pd.DataFrame) -> float:
        """
        Estimate DataFrame size in memory (MB).

        Args:
            df: DataFrame to estimate

        Returns:
            float: Estimated size in MB
        """
        return df.memory_usage(deep=True).sum() / (1024 * 1024)
