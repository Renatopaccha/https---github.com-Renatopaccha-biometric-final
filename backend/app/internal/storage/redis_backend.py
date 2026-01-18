"""
RedisBackend: Redis-based DataFrame storage with distributed locking and TTL.

Implements StorageBackend interface using Redis for stateless, scalable storage.

Key Structure:
    biometric:{session_id}:meta            - Session metadata (JSON)
    biometric:{session_id}:df:current      - Current DataFrame (serialized bytes)
    biometric:{session_id}:df:v:{n}        - Version N snapshot
    biometric:{session_id}:versions        - List of version IDs
    biometric:{session_id}:lock            - Distributed lock
    biometric:temp:{temp_id}               - Temporary storage
"""

import json
import time
import uuid
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional
import pandas as pd

from app.core.config import settings
from app.core.errors import SessionNotFoundException, BiometricException
from app.internal.storage.redis_client import get_redis_client
from app.internal.storage.serializer import DataFrameSerializer

logger = logging.getLogger(__name__)


class RedisBackend:
    """
    Redis-based storage backend with automatic TTL and distributed locking.

    Features:
    - Automatic expiration (TTL) for all session keys
    - Distributed locks for atomic version operations
    - PyArrow/Pickle serialization with compression
    - Efficient key naming pattern
    """

    # Key prefix
    KEY_PREFIX = "biometric"

    # Compiled regex for extracting initial row count from audit log
    _INITIAL_ROWS_PATTERN = re.compile(r'Initial rows:\s*(\d+)')

    def __init__(self):
        """Initialize Redis backend and connection."""
        try:
            self.redis = get_redis_client().get_client()
            logger.info("[RedisBackend] Initialized successfully")
        except Exception as e:
            logger.error(f"[RedisBackend] Failed to initialize: {e}")
            raise RuntimeError(f"RedisBackend initialization failed: {e}")

    # ===== Key Generation =====

    def _key(self, session_id: str, resource: str) -> str:
        """Generate Redis key for a resource."""
        return f"{self.KEY_PREFIX}:{session_id}:{resource}"

    def _temp_key(self, temp_id: str) -> str:
        """Generate Redis key for temporary storage."""
        return f"{self.KEY_PREFIX}:temp:{temp_id}"

    def _version_key(self, session_id: str, version_id: int) -> str:
        """Generate Redis key for version snapshot."""
        return f"{self.KEY_PREFIX}:{session_id}:df:v:{version_id:04d}"

    # ===== Lock Management =====

    def _acquire_lock(self, session_id: str, timeout: int = None) -> Optional[str]:
        """
        Acquire distributed lock for session.

        Args:
            session_id: Session identifier
            timeout: Lock timeout in seconds (default: settings.redis_lock_ttl_seconds)

        Returns:
            Lock identifier if acquired, None otherwise
        """
        if timeout is None:
            timeout = settings.redis_lock_ttl_seconds

        lock_key = self._key(session_id, "lock")
        lock_value = str(uuid.uuid4())

        # Retry with exponential backoff
        for attempt in range(settings.redis_lock_retry_attempts):
            # Try to acquire lock (SETNX)
            acquired = self.redis.set(lock_key, lock_value, nx=True, ex=timeout)

            if acquired:
                logger.debug(f"[RedisBackend] Lock acquired for {session_id}")
                return lock_value

            # Wait before retry
            if attempt < settings.redis_lock_retry_attempts - 1:
                delay = settings.redis_lock_retry_delay_ms / 1000 * (2 ** attempt)
                time.sleep(delay)

        logger.warning(f"[RedisBackend] Failed to acquire lock for {session_id}")
        return None

    def _release_lock(self, session_id: str, lock_value: str) -> bool:
        """
        Release distributed lock if we own it.

        Args:
            session_id: Session identifier
            lock_value: Lock identifier from acquire_lock

        Returns:
            bool: True if lock was released
        """
        lock_key = self._key(session_id, "lock")

        # Check if we still own the lock
        current_value = self.redis.get(lock_key)
        if current_value and current_value.decode() == lock_value:
            self.redis.delete(lock_key)
            logger.debug(f"[RedisBackend] Lock released for {session_id}")
            return True

        return False

    # ===== TTL Management =====

    def _touch_keys(self, session_id: str, ttl_seconds: int) -> int:
        """
        Refresh TTL for all keys related to a session.

        Args:
            session_id: Session identifier
            ttl_seconds: New TTL in seconds

        Returns:
            int: Number of keys updated
        """
        # Pattern to match all session keys
        pattern = f"{self.KEY_PREFIX}:{session_id}:*"

        # Get all matching keys
        keys = list(self.redis.scan_iter(match=pattern, count=100))

        if not keys:
            return 0

        # Update TTL for each key
        count = 0
        for key in keys:
            # Skip lock keys
            if key.decode().endswith(":lock"):
                continue

            self.redis.expire(key, ttl_seconds)
            count += 1

        logger.debug(f"[RedisBackend] Refreshed TTL for {count} keys (session: {session_id})")
        return count

    # ===== Session Management =====

    def create_session(
        self,
        session_id: str,
        dataframe: pd.DataFrame,
        filename: str,
        ttl_seconds: int
    ) -> None:
        """Create a new session with the given DataFrame."""
        logger.debug(f"[RedisBackend] Creating session: {session_id}")

        try:
            # Serialize DataFrame
            df_bytes, ser_meta = DataFrameSerializer.serialize(dataframe)

            # Create metadata
            metadata = {
                "session_id": session_id,
                "filename": filename,
                "created_at": datetime.now().isoformat(),
                "expires_at": datetime.now().timestamp() + ttl_seconds,
                "last_accessed": datetime.now().isoformat(),
                "current_version": 0,
                "history": [],
                "intentional_missing": {},
                "audit_log": [],
                "shape": list(dataframe.shape),
                "columns": dataframe.columns.tolist(),
                "dtypes": {col: str(dtype) for col, dtype in dataframe.dtypes.items()},
                "serialization": ser_meta
            }

            # Save to Redis with TTL
            meta_key = self._key(session_id, "meta")
            df_key = self._key(session_id, "df:current")
            versions_key = self._key(session_id, "versions")

            # Use pipeline for atomic operations
            pipe = self.redis.pipeline()
            pipe.set(meta_key, json.dumps(metadata))
            pipe.expire(meta_key, ttl_seconds)
            pipe.set(df_key, df_bytes)
            pipe.expire(df_key, ttl_seconds)
            pipe.rpush(versions_key, 0)  # Version 0
            pipe.expire(versions_key, ttl_seconds)
            pipe.execute()

            # Add initial audit entry
            self.add_audit_entry(
                session_id,
                f"Session created. Original file: '{filename}'. Initial rows: {len(dataframe)}"
            )

            logger.info(f"[RedisBackend] ✓ Session created: {session_id}")

        except Exception as e:
            logger.error(f"[RedisBackend] Failed to create session: {e}")
            raise BiometricException(f"Failed to create session: {str(e)}", 500)

    def get_dataframe(self, session_id: str) -> pd.DataFrame:
        """Retrieve DataFrame for session, updating last_accessed."""
        logger.debug(f"[RedisBackend] Getting dataframe for session: {session_id}")

        try:
            # Check if session exists
            meta_key = self._key(session_id, "meta")
            if not self.redis.exists(meta_key):
                raise SessionNotFoundException(session_id)

            # Get DataFrame bytes
            df_key = self._key(session_id, "df:current")
            df_bytes = self.redis.get(df_key)

            if not df_bytes:
                raise SessionNotFoundException(session_id)

            # Deserialize
            df = DataFrameSerializer.deserialize(df_bytes)

            # Update last_accessed and refresh TTL
            metadata = self._load_metadata(session_id)
            metadata["last_accessed"] = datetime.now().isoformat()
            self._save_metadata(session_id, metadata)
            self._touch_keys(session_id, settings.redis_session_ttl_seconds)

            return df.copy()

        except SessionNotFoundException:
            raise
        except Exception as e:
            logger.error(f"[RedisBackend] Failed to get dataframe: {e}")
            raise BiometricException(f"Failed to get dataframe: {str(e)}", 500)

    def update_dataframe(self, session_id: str, dataframe: pd.DataFrame) -> None:
        """Update the current DataFrame for a session."""
        logger.debug(f"[RedisBackend] Updating dataframe for session: {session_id}")

        try:
            # Check if session exists
            if not self.session_exists(session_id):
                raise SessionNotFoundException(session_id)

            # Serialize DataFrame
            df_bytes, ser_meta = DataFrameSerializer.serialize(dataframe)

            # Update DataFrame and metadata
            df_key = self._key(session_id, "df:current")
            self.redis.set(df_key, df_bytes)
            self.redis.expire(df_key, settings.redis_session_ttl_seconds)

            # Update metadata
            metadata = self._load_metadata(session_id)
            metadata["last_accessed"] = datetime.now().isoformat()
            metadata["shape"] = list(dataframe.shape)
            metadata["serialization"] = ser_meta
            self._save_metadata(session_id, metadata)

            # Refresh TTL
            self._touch_keys(session_id, settings.redis_session_ttl_seconds)

        except SessionNotFoundException:
            raise
        except Exception as e:
            logger.error(f"[RedisBackend] Failed to update dataframe: {e}")
            raise BiometricException(f"Failed to update dataframe: {str(e)}", 500)

    def delete_session(self, session_id: str) -> bool:
        """Delete a session and all its versions."""
        logger.debug(f"[RedisBackend] Deleting session: {session_id}")

        try:
            # Get all keys matching pattern
            pattern = f"{self.KEY_PREFIX}:{session_id}:*"
            keys = list(self.redis.scan_iter(match=pattern, count=100))

            if not keys:
                return False

            # Delete all keys
            self.redis.delete(*keys)

            logger.info(f"[RedisBackend] ✓ Session deleted: {session_id} ({len(keys)} keys)")
            return True

        except Exception as e:
            logger.error(f"[RedisBackend] Failed to delete session: {e}")
            return False

    def session_exists(self, session_id: str) -> bool:
        """Check if a session exists and hasn't expired."""
        meta_key = self._key(session_id, "meta")
        return self.redis.exists(meta_key) > 0

    def touch_session(self, session_id: str, ttl_seconds: int) -> None:
        """Refresh TTL for a session."""
        self._touch_keys(session_id, ttl_seconds)

    # ===== Metadata =====

    def _load_metadata(self, session_id: str) -> Dict:
        """Load session metadata from Redis."""
        meta_key = self._key(session_id, "meta")
        meta_json = self.redis.get(meta_key)

        if not meta_json:
            raise SessionNotFoundException(session_id)

        return json.loads(meta_json.decode())

    def _save_metadata(self, session_id: str, metadata: Dict) -> None:
        """Save session metadata to Redis."""
        meta_key = self._key(session_id, "meta")
        self.redis.set(meta_key, json.dumps(metadata))
        self.redis.expire(meta_key, settings.redis_session_ttl_seconds)

    def get_metadata(self, session_id: str) -> Dict:
        """Get session metadata without loading the full DataFrame."""
        try:
            metadata = self._load_metadata(session_id)

            return {
                "session_id": metadata["session_id"],
                "filename": metadata["filename"],
                "created_at": metadata["created_at"],
                "expires_at": datetime.fromtimestamp(metadata["expires_at"]).isoformat(),
                "last_accessed": metadata["last_accessed"],
                "shape": {"rows": metadata["shape"][0], "columns": metadata["shape"][1]},
                "columns": metadata["columns"],
                "dtypes": metadata["dtypes"],
            }

        except SessionNotFoundException:
            raise
        except Exception as e:
            logger.error(f"[RedisBackend] Failed to get metadata: {e}")
            raise BiometricException(f"Failed to get metadata: {str(e)}", 500)

    def update_metadata(self, session_id: str, metadata: Dict) -> None:
        """Update session metadata (merge with existing)."""
        try:
            current = self._load_metadata(session_id)
            current.update(metadata)
            self._save_metadata(session_id, current)

        except Exception as e:
            logger.error(f"[RedisBackend] Failed to update metadata: {e}")
            raise BiometricException(f"Failed to update metadata: {str(e)}", 500)

    # ===== Versioning =====

    def create_version(
        self,
        session_id: str,
        dataframe: pd.DataFrame,
        action_summary: str,
        max_versions: int = 5
    ) -> int:
        """Create a version snapshot with distributed locking."""
        logger.debug(f"[RedisBackend] Creating version for session: {session_id}")

        # Acquire lock
        lock_value = self._acquire_lock(session_id)
        if not lock_value:
            raise BiometricException("Failed to acquire lock for versioning", 409)

        try:
            # Load metadata
            metadata = self._load_metadata(session_id)
            current_version = metadata.get("current_version", 0)
            new_version = current_version + 1

            # Serialize current DataFrame as snapshot
            df_bytes, ser_meta = DataFrameSerializer.serialize(dataframe)

            # Save version snapshot
            version_key = self._version_key(session_id, new_version)
            self.redis.set(version_key, df_bytes)
            self.redis.expire(version_key, settings.redis_session_ttl_seconds)

            # Update versions list
            versions_key = self._key(session_id, "versions")
            self.redis.rpush(versions_key, new_version)
            self.redis.expire(versions_key, settings.redis_session_ttl_seconds)

            # Enforce max_versions (keep only last N)
            versions_count = self.redis.llen(versions_key)
            if versions_count > max_versions:
                to_remove = versions_count - max_versions
                for _ in range(to_remove):
                    old_version = self.redis.lpop(versions_key)
                    if old_version:
                        old_key = self._version_key(session_id, int(old_version))
                        self.redis.delete(old_key)

            # Update metadata
            metadata["current_version"] = new_version
            metadata["history"].append({
                "version_id": new_version,
                "timestamp": datetime.now().isoformat(),
                "action_summary": action_summary,
                "rows_before": metadata["shape"][0],
                "rows_after": len(dataframe)
            })

            self._save_metadata(session_id, metadata)

            logger.info(f"[RedisBackend] ✓ Created version {new_version} for session {session_id}")
            return new_version

        finally:
            # Always release lock
            self._release_lock(session_id, lock_value)

    def undo_last_change(self, session_id: str) -> pd.DataFrame:
        """Undo last operation by restoring previous version."""
        logger.debug(f"[RedisBackend] Undoing last operation for session: {session_id}")

        # Acquire lock
        lock_value = self._acquire_lock(session_id)
        if not lock_value:
            raise BiometricException("Failed to acquire lock for undo", 409)

        try:
            metadata = self._load_metadata(session_id)
            current_version = metadata.get("current_version", 0)

            if current_version == 0:
                raise ValueError("No version history to undo")

            # Load previous version
            version_key = self._version_key(session_id, current_version)
            version_bytes = self.redis.get(version_key)

            if not version_bytes:
                raise ValueError(f"Version {current_version} not found")

            # Deserialize
            df_restored = DataFrameSerializer.deserialize(version_bytes)

            # Update current DataFrame
            df_key = self._key(session_id, "df:current")
            df_bytes, ser_meta = DataFrameSerializer.serialize(df_restored)
            self.redis.set(df_key, df_bytes)
            self.redis.expire(df_key, settings.redis_session_ttl_seconds)

            # Update metadata
            metadata["current_version"] = current_version - 1
            metadata["last_accessed"] = datetime.now().isoformat()
            metadata["shape"] = list(df_restored.shape)
            metadata["serialization"] = ser_meta
            self._save_metadata(session_id, metadata)

            logger.info(f"[RedisBackend] ✓ Restored version {current_version} for session {session_id}")
            return df_restored.copy()

        finally:
            # Always release lock
            self._release_lock(session_id, lock_value)

    def get_history(self, session_id: str) -> List[Dict]:
        """Get version history for session."""
        metadata = self._load_metadata(session_id)
        return metadata.get("history", [])

    # ===== Intentional Missing Values =====

    def get_intentional_missing(self, session_id: str) -> Dict[str, List[int]]:
        """Get intentional missing values metadata."""
        metadata = self._load_metadata(session_id)
        return metadata.get("intentional_missing", {})

    def set_intentional_missing(self, session_id: str, column: str, row_indices: List[int]) -> None:
        """Set intentional missing values for a column."""
        metadata = self._load_metadata(session_id)

        if "intentional_missing" not in metadata:
            metadata["intentional_missing"] = {}

        metadata["intentional_missing"][column] = sorted(row_indices)
        self._save_metadata(session_id, metadata)

    def set_intentional_missing_batch(self, session_id: str, columns_data: Dict[str, List[int]]) -> None:
        """Set intentional missing values for multiple columns."""
        metadata = self._load_metadata(session_id)

        if "intentional_missing" not in metadata:
            metadata["intentional_missing"] = {}

        for column, row_indices in columns_data.items():
            metadata["intentional_missing"][column] = sorted(row_indices)

        self._save_metadata(session_id, metadata)

    # ===== Audit Log =====

    def add_audit_entry(self, session_id: str, entry: str) -> None:
        """Add an entry to the audit log."""
        try:
            metadata = self._load_metadata(session_id)

            if "audit_log" not in metadata:
                metadata["audit_log"] = []

            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            timestamped_entry = f"[{timestamp}] {entry}"
            metadata["audit_log"].append(timestamped_entry)

            self._save_metadata(session_id, metadata)

        except Exception as e:
            logger.error(f"[RedisBackend] Failed to add audit entry: {e}")

    def get_audit_log(self, session_id: str) -> List[str]:
        """Retrieve complete audit log."""
        metadata = self._load_metadata(session_id)
        return metadata.get("audit_log", [])

    def get_initial_row_count(self, session_id: str) -> Optional[int]:
        """Extract initial row count from first audit log entry."""
        audit_log = self.get_audit_log(session_id)
        if not audit_log:
            return None

        first_entry = audit_log[0]
        try:
            match = self._INITIAL_ROWS_PATTERN.search(first_entry)
            if match:
                return int(match.group(1))
        except (ValueError, AttributeError):
            pass

        return None

    # ===== Temporary Storage =====

    def create_temp_storage(
        self,
        temp_id: str,
        sheets_dict: Dict[str, pd.DataFrame],
        filename: str,
        ttl_seconds: int = 1800
    ) -> None:
        """Create temporary storage for multi-sheet Excel."""
        try:
            # Serialize all sheets
            serialized_sheets = {}
            for sheet_name, df in sheets_dict.items():
                df_bytes, _ = DataFrameSerializer.serialize(df)
                serialized_sheets[sheet_name] = df_bytes.hex()  # Store as hex string

            temp_data = {
                "sheets": serialized_sheets,
                "filename": filename,
                "created_at": datetime.now().isoformat(),
                "expires_at": datetime.now().timestamp() + ttl_seconds,
            }

            # Save to Redis with TTL
            temp_key = self._temp_key(temp_id)
            self.redis.set(temp_key, json.dumps(temp_data))
            self.redis.expire(temp_key, ttl_seconds)

        except Exception as e:
            logger.error(f"[RedisBackend] Failed to create temp storage: {e}")
            raise BiometricException(f"Failed to create temp storage: {str(e)}", 500)

    def get_temp_storage(self, temp_id: str) -> Dict:
        """Retrieve temporary storage data."""
        try:
            temp_key = self._temp_key(temp_id)
            temp_json = self.redis.get(temp_key)

            if not temp_json:
                raise SessionNotFoundException(temp_id)

            temp_data = json.loads(temp_json.decode())

            # Deserialize all sheets
            sheets_dict = {}
            for sheet_name, hex_bytes in temp_data["sheets"].items():
                df_bytes = bytes.fromhex(hex_bytes)
                sheets_dict[sheet_name] = DataFrameSerializer.deserialize(df_bytes)

            return {
                "sheets": sheets_dict,
                "filename": temp_data["filename"],
                "created_at": temp_data["created_at"],
                "expires_at": datetime.fromtimestamp(temp_data["expires_at"]).isoformat(),
            }

        except SessionNotFoundException:
            raise
        except Exception as e:
            logger.error(f"[RedisBackend] Failed to get temp storage: {e}")
            raise BiometricException(f"Failed to get temp storage: {str(e)}", 500)

    def delete_temp_storage(self, temp_id: str) -> bool:
        """Delete temporary storage."""
        temp_key = self._temp_key(temp_id)
        return self.redis.delete(temp_key) > 0

    # ===== Cleanup =====

    def cleanup_expired_sessions(self) -> int:
        """
        Remove expired sessions (Redis handles this automatically with TTL).

        This method is a no-op for Redis since TTL handles expiration.
        Included for interface compatibility.
        """
        # Redis automatically expires keys, no manual cleanup needed
        logger.debug("[RedisBackend] Cleanup not needed (Redis TTL handles expiration)")
        return 0

    def cleanup_expired_temp_storage(self) -> int:
        """Remove expired temp storage (Redis TTL handles this automatically)."""
        # Redis automatically expires keys
        logger.debug("[RedisBackend] Temp cleanup not needed (Redis TTL handles expiration)")
        return 0

    # ===== Health/Stats =====

    def get_active_sessions_count(self) -> int:
        """Get count of active sessions."""
        try:
            # Count keys matching session pattern
            pattern = f"{self.KEY_PREFIX}:*:meta"
            keys = list(self.redis.scan_iter(match=pattern, count=100))
            return len(keys)

        except Exception as e:
            logger.error(f"[RedisBackend] Failed to count sessions: {e}")
            return 0

    def health_check(self) -> Dict:
        """Perform health check on Redis backend."""
        start_time = time.time()

        try:
            # Ping Redis
            self.redis.ping()

            # Get info
            info = self.redis.info()

            latency_ms = (time.time() - start_time) * 1000

            return {
                "backend_type": "redis",
                "reachable": True,
                "latency_ms": round(latency_ms, 2),
                "active_sessions": self.get_active_sessions_count(),
                "redis_info": {
                    "version": info.get("redis_version", "unknown"),
                    "used_memory_mb": info.get("used_memory", 0) / (1024 * 1024),
                    "connected_clients": info.get("connected_clients", 0),
                    "total_commands_processed": info.get("total_commands_processed", 0),
                }
            }

        except Exception as e:
            return {
                "backend_type": "redis",
                "reachable": False,
                "error": str(e)
            }
