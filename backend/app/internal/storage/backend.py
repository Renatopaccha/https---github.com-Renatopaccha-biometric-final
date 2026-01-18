"""
Storage backend abstraction for DataFrame session management.
Defines the interface that all storage implementations must follow.
"""

from typing import Protocol, Dict, List, Optional
import pandas as pd


class StorageBackend(Protocol):
    """
    Protocol defining the interface for session storage backends.

    All implementations (InMemory, Redis, etc.) must implement these methods.
    This allows DataManager to be storage-agnostic and swap backends easily.
    """

    # ===== Session Management =====

    def create_session(
        self,
        session_id: str,
        dataframe: pd.DataFrame,
        filename: str,
        ttl_seconds: int
    ) -> None:
        """
        Create a new session with the given DataFrame.

        Args:
            session_id: Unique session identifier
            dataframe: DataFrame to store
            filename: Original filename
            ttl_seconds: Time-to-live in seconds
        """
        ...

    def get_dataframe(self, session_id: str) -> pd.DataFrame:
        """
        Retrieve DataFrame for session, updating last_accessed and refreshing TTL.

        Args:
            session_id: Session identifier

        Returns:
            pd.DataFrame: The stored DataFrame (copy)

        Raises:
            SessionNotFoundException: If session doesn't exist or expired
        """
        ...

    def update_dataframe(self, session_id: str, dataframe: pd.DataFrame) -> None:
        """
        Update the current DataFrame for a session.

        Args:
            session_id: Session identifier
            dataframe: New DataFrame to store

        Raises:
            SessionNotFoundException: If session doesn't exist
        """
        ...

    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session and all its versions.

        Args:
            session_id: Session identifier

        Returns:
            bool: True if deleted, False if not found
        """
        ...

    def session_exists(self, session_id: str) -> bool:
        """
        Check if a session exists and hasn't expired.

        Args:
            session_id: Session identifier

        Returns:
            bool: True if exists and valid
        """
        ...

    def touch_session(self, session_id: str, ttl_seconds: int) -> None:
        """
        Refresh TTL for a session (update expiration time).

        Args:
            session_id: Session identifier
            ttl_seconds: New TTL in seconds
        """
        ...

    # ===== Metadata =====

    def get_metadata(self, session_id: str) -> Dict:
        """
        Get session metadata without loading the full DataFrame.

        Args:
            session_id: Session identifier

        Returns:
            Dict: Metadata including shape, columns, dtypes, etc.

        Raises:
            SessionNotFoundException: If session doesn't exist
        """
        ...

    def update_metadata(self, session_id: str, metadata: Dict) -> None:
        """
        Update session metadata (merge with existing).

        Args:
            session_id: Session identifier
            metadata: Metadata dictionary to merge/update
        """
        ...

    # ===== Versioning =====

    def create_version(
        self,
        session_id: str,
        dataframe: pd.DataFrame,
        action_summary: str,
        max_versions: int = 5
    ) -> int:
        """
        Create a version snapshot before applying changes.

        Args:
            session_id: Session identifier
            dataframe: DataFrame to snapshot
            action_summary: Description of action
            max_versions: Maximum versions to keep (rolling window)

        Returns:
            int: New version ID
        """
        ...

    def undo_last_change(self, session_id: str) -> pd.DataFrame:
        """
        Undo last operation by restoring previous version.

        Args:
            session_id: Session identifier

        Returns:
            pd.DataFrame: Restored DataFrame

        Raises:
            ValueError: If no version history exists
            SessionNotFoundException: If session doesn't exist
        """
        ...

    def get_history(self, session_id: str) -> List[Dict]:
        """
        Get version history for session.

        Args:
            session_id: Session identifier

        Returns:
            List[Dict]: List of history entries
        """
        ...

    # ===== Intentional Missing Values =====

    def get_intentional_missing(self, session_id: str) -> Dict[str, List[int]]:
        """
        Get intentional missing values metadata.

        Args:
            session_id: Session identifier

        Returns:
            Dict mapping column names to row indices
        """
        ...

    def set_intentional_missing(
        self,
        session_id: str,
        column: str,
        row_indices: List[int]
    ) -> None:
        """
        Set intentional missing values for a column.

        Args:
            session_id: Session identifier
            column: Column name
            row_indices: List of row indices with intentional NAs
        """
        ...

    def set_intentional_missing_batch(
        self,
        session_id: str,
        columns_data: Dict[str, List[int]]
    ) -> None:
        """
        Set intentional missing values for multiple columns (batch operation).

        Args:
            session_id: Session identifier
            columns_data: Dict mapping column names to row indices
        """
        ...

    # ===== Audit Log =====

    def add_audit_entry(self, session_id: str, entry: str) -> None:
        """
        Add an entry to the audit log.

        Args:
            session_id: Session identifier
            entry: Human-readable log entry
        """
        ...

    def get_audit_log(self, session_id: str) -> List[str]:
        """
        Retrieve complete audit log.

        Args:
            session_id: Session identifier

        Returns:
            List[str]: Timestamped audit entries
        """
        ...

    def get_initial_row_count(self, session_id: str) -> Optional[int]:
        """
        Extract initial row count from the first audit log entry.

        Args:
            session_id: Session identifier

        Returns:
            Initial row count if available, None otherwise
        """
        ...

    # ===== Temporary Storage (Multi-sheet Excel) =====

    def create_temp_storage(
        self,
        temp_id: str,
        sheets_dict: Dict[str, pd.DataFrame],
        filename: str,
        ttl_seconds: int = 1800
    ) -> None:
        """
        Create temporary storage for multi-sheet Excel.

        Args:
            temp_id: Temporary identifier
            sheets_dict: Dict mapping sheet names to DataFrames
            filename: Original filename
            ttl_seconds: TTL (default 30 minutes)
        """
        ...

    def get_temp_storage(self, temp_id: str) -> Dict:
        """
        Retrieve temporary storage data.

        Args:
            temp_id: Temporary identifier

        Returns:
            Dict with 'sheets', 'filename', 'created_at', 'expires_at'

        Raises:
            SessionNotFoundException: If temp_id not found or expired
        """
        ...

    def delete_temp_storage(self, temp_id: str) -> bool:
        """
        Delete temporary storage.

        Args:
            temp_id: Temporary identifier

        Returns:
            bool: True if deleted
        """
        ...

    # ===== Cleanup =====

    def cleanup_expired_sessions(self) -> int:
        """
        Remove all expired sessions (manual cleanup for backends without auto-expiration).

        Returns:
            int: Number of sessions cleaned up
        """
        ...

    def cleanup_expired_temp_storage(self) -> int:
        """
        Remove all expired temporary storage.

        Returns:
            int: Number of temp files cleaned up
        """
        ...

    # ===== Health/Stats =====

    def get_active_sessions_count(self) -> int:
        """
        Get count of active (non-expired) sessions.

        Returns:
            int: Number of active sessions
        """
        ...

    def health_check(self) -> Dict:
        """
        Perform health check on storage backend.

        Returns:
            Dict with status, backend_type, latency, errors, etc.
        """
        ...
