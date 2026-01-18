"""
DataManager: Centralized DataFrame session management with pluggable storage backends.
Implements singleton pattern for thread-safe data management.

Enhanced with version control allowing undo/redo of data cleaning operations.
Each session maintains history of transformations for audit and rollback.

Architecture:
    - DataManager: Public API (singleton, unchanged interface)
    - StorageBackend: Pluggable storage interface (InMemory, Redis, etc.)
    - InMemoryBackend: Original disk-based storage implementation
"""

import threading
import uuid
from typing import Dict, List, Optional
import pandas as pd

from app.core.config import settings
from app.core.errors import SessionNotFoundException
from app.internal.storage import StorageBackend, InMemoryBackend


class DataManager:
    """
    Singleton class for managing DataFrame sessions with pluggable storage backends.

    Public API remains unchanged. All storage operations are delegated to a
    StorageBackend implementation (InMemoryBackend by default).

    This design allows swapping storage backends (e.g., Redis) without changing
    any code that uses DataManager.
    """

    _instance: Optional["DataManager"] = None
    _lock: threading.Lock = threading.Lock()

    def __new__(cls) -> "DataManager":
        """Ensure only one instance exists (Singleton pattern)."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize_backend()
        return cls._instance

    def _initialize_backend(self) -> None:
        """Initialize storage backend (InMemoryBackend for now, Redis in future)."""
        print(f"[DEBUG] DataManager initializing...")

        # For now, always use InMemoryBackend
        # In future (Etapa 3), we'll check settings.redis_enabled here
        self.backend: StorageBackend = InMemoryBackend()

        print(f"[DEBUG] ✓ DataManager initialized with {self.backend.__class__.__name__}")

    # ===== Core Session Methods (delegate to backend) =====

    def create_session(self, dataframe: pd.DataFrame, filename: str) -> str:
        """Create a new session with the provided DataFrame."""
        session_id = str(uuid.uuid4())
        ttl_seconds = settings.session_timeout_minutes * 60

        self.backend.create_session(session_id, dataframe, filename, ttl_seconds)

        return session_id

    def get_dataframe(self, session_id: str) -> pd.DataFrame:
        """Retrieve DataFrame for a given session ID."""
        return self.backend.get_dataframe(session_id)

    def update_dataframe(self, session_id: str, dataframe: pd.DataFrame) -> None:
        """Update the DataFrame for an existing session."""
        self.backend.update_dataframe(session_id, dataframe)

    def delete_session(self, session_id: str) -> bool:
        """Delete a session and all its versions."""
        return self.backend.delete_session(session_id)

    def get_session_metadata(self, session_id: str) -> Dict:
        """Get metadata for a session without retrieving the full DataFrame."""
        return self.backend.get_metadata(session_id)

    # ===== Versioning Methods (delegate to backend) =====

    def create_version(self, session_id: str, df: pd.DataFrame, action_summary: str) -> int:
        """Create a new version snapshot before applying changes."""
        return self.backend.create_version(session_id, df, action_summary)

    def undo_last_change(self, session_id: str) -> pd.DataFrame:
        """Undo last operation by restoring previous version."""
        return self.backend.undo_last_change(session_id)

    def get_history(self, session_id: str) -> List[Dict]:
        """Get version history for session."""
        return self.backend.get_history(session_id)

    # ===== Intentional Missing Values (delegate to backend) =====

    def get_intentional_missing(self, session_id: str) -> Dict[str, List[int]]:
        """Get intentional missing values metadata."""
        return self.backend.get_intentional_missing(session_id)

    def set_intentional_missing(self, session_id: str, column: str, row_indices: List[int]) -> None:
        """Set intentional missing values for a column."""
        self.backend.set_intentional_missing(session_id, column, row_indices)

    def set_intentional_missing_batch(self, session_id: str, columns_data: Dict[str, List[int]]) -> None:
        """Set intentional missing values for multiple columns at once."""
        self.backend.set_intentional_missing_batch(session_id, columns_data)

    # ===== Audit Log (delegate to backend) =====

    def add_audit_entry(self, session_id: str, entry: str) -> None:
        """Add an entry to the audit log for this session."""
        self.backend.add_audit_entry(session_id, entry)

    def get_audit_log(self, session_id: str) -> List[str]:
        """Retrieve the complete audit log for a session."""
        return self.backend.get_audit_log(session_id)

    def get_initial_row_count(self, session_id: str) -> Optional[int]:
        """Extract initial row count from the first audit log entry."""
        return self.backend.get_initial_row_count(session_id)

    # ===== Temporary Storage Methods (delegate to backend) =====

    def create_temp_storage(self, sheets_dict: Dict[str, pd.DataFrame], filename: str) -> str:
        """Create temporary storage for multi-sheet Excel file."""
        temp_id = f"temp-{uuid.uuid4()}"
        self.backend.create_temp_storage(temp_id, sheets_dict, filename, ttl_seconds=1800)
        return temp_id

    def get_temp_storage(self, temp_id: str) -> Dict:
        """Retrieve temporary storage data."""
        return self.backend.get_temp_storage(temp_id)

    def delete_temp_storage(self, temp_id: str) -> bool:
        """Delete temporary storage file."""
        return self.backend.delete_temp_storage(temp_id)

    # ===== Cleanup Methods (delegate to backend) =====

    def cleanup_expired_sessions(self) -> int:
        """Remove all expired session directories."""
        return self.backend.cleanup_expired_sessions()

    def cleanup_expired_temp_storage(self) -> int:
        """Remove all expired temporary storage files."""
        return self.backend.cleanup_expired_temp_storage()

    # ===== Health/Stats Methods (delegate to backend) =====

    def get_active_sessions_count(self) -> int:
        """Get count of active (non-expired) sessions."""
        return self.backend.get_active_sessions_count()


# Global singleton instance
data_manager = DataManager()
