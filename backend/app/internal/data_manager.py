"""
DataManager: Disk-based DataFrame storage with versioning support.
Implements singleton pattern for centralized, thread-safe data management.

Enhanced with version control allowing undo/redo of data cleaning operations.
Each session maintains history of transformations for audit and rollback.

Storage Structure:
    - storage/sessions/{session_id}/current.pkl - Active DataFrame
    - storage/sessions/{session_id}/versions/{n}.pkl - Historical versions
    - storage/sessions/{session_id}/meta.json - Metadata (version info, intentional missing)
    - storage/temp/{temp_id}.pkl - Temporary multi-sheet Excel storage
"""

import threading
import uuid
import pickle
import json
import os
import glob
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import pandas as pd

from app.core.config import settings
from app.core.errors import SessionNotFoundException


class DataManager:
    """
    Singleton class for managing DataFrame sessions with disk persistence and versioning.
    
    Associates uploaded DataFrames with unique session IDs and stores them
    with version history. Supports undo/redo operations and tracks intentional NAs.
    """
    
    _instance: Optional["DataManager"] = None
    _lock: threading.Lock = threading.Lock()
    
    def __new__(cls) -> "DataManager":
        """Ensure only one instance exists (Singleton pattern)."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize_storage()
                    cls._instance._session_lock = threading.Lock()
        return cls._instance
    
    def _initialize_storage(self) -> None:
        """Create storage directories if they don't exist."""
        backend_dir = Path(__file__).parent.parent.parent.resolve()
        
        self._storage_dir = backend_dir / "storage"
        self._sessions_dir = self._storage_dir / "sessions"
        self._temp_dir = self._storage_dir / "temp"
        
        print(f"[DEBUG] DataManager initializing with versioning support...")
        print(f"[DEBUG] Storage directory: {self._storage_dir}")
        
        self._sessions_dir.mkdir(parents=True, exist_ok=True)
        self._temp_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"[DEBUG] ✓ Storage directories initialized")
    
    def _get_session_dir(self, session_id: str) -> Path:
        """Get session directory path."""
        return self._sessions_dir / session_id
    
    def _get_session_current_path(self, session_id: str) -> Path:
        """Get path to current DataFrame."""
        return self._get_session_dir(session_id) / "current.pkl"
    
    def _get_session_versions_dir(self, session_id: str) -> Path:
        """Get versions directory path."""
        return self._get_session_dir(session_id) / "versions"
    
    def _get_session_meta_path(self, session_id: str) -> Path:
        """Get metadata file path."""
        return self._get_session_dir(session_id) / "meta.json"
    
    def _get_temp_path(self, temp_id: str) -> Path:
        """Get absolute file path for temporary storage."""
        return self._temp_dir / f"{temp_id}.pkl"
    
    def _migrate_old_session(self, old_path: Path, session_id: str) -> None:
        """Migrate old .pkl session to new directory structure."""
        print(f"[DEBUG] Migrating old session format: {session_id}")
        
        # Load old data
        with open(old_path, 'rb') as f:
            old_data = pickle.load(f)
        
        # Create new structure
        session_dir = self._get_session_dir(session_id)
        session_dir.mkdir(parents=True, exist_ok=True)
        
        versions_dir = self._get_session_versions_dir(session_id)
        versions_dir.mkdir(parents=True, exist_ok=True)
        
        # Save current
        current_path = self._get_session_current_path(session_id)
        with open(current_path, 'wb') as f:
            pickle.dump(old_data, f, protocol=pickle.HIGHEST_PROTOCOL)
        
        # Initialize metadata
        meta = {
            "current_version": 0,
            "history": [],
            "intentional_missing": {},
            "migrated_from_legacy": True,
            "migration_date": datetime.now().isoformat(),
            "audit_log": []  # Audit trail for data transformations
        }
        
        meta_path = self._get_session_meta_path(session_id)
        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)
        
        # Delete old file
        old_path.unlink()
        
        print(f"[DEBUG] ✓ Session migrated successfully")
    
    def _load_session_data(self, session_id: str) -> Optional[Dict]:
        """Load session data, handling both old and new formats."""
        # Check for new format first
        current_path = self._get_session_current_path(session_id)
        
        if current_path.exists():
            with open(current_path, 'rb') as f:
                return pickle.load(f)
        
        # Check for old format and migrate
        old_path = self._sessions_dir / f"{session_id}.pkl"
        if old_path.exists():
            self._migrate_old_session(old_path, session_id)
            # Load migrated data
            with open(current_path, 'rb') as f:
                return pickle.load(f)
        
        return None
    
    def _save_session_data(self, session_id: str, data: Dict) -> None:
        """Save session data."""
        current_path = self._get_session_current_path(session_id)
        current_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(current_path, 'wb') as f:
            pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)
    
    def _load_metadata(self, session_id: str) -> Dict:
        """Load session metadata."""
        meta_path = self._get_session_meta_path(session_id)
        
        if meta_path.exists():
            with open(meta_path, 'r') as f:
                return json.load(f)
        
        # Return default metadata
        return {
            "current_version": 0,
            "history": [],
            "intentional_missing": {}
        }
    
    def _save_metadata(self, session_id: str, meta: Dict) -> None:
        """Save session metadata."""
        meta_path = self._get_session_meta_path(session_id)
        meta_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)
    
    def _cleanup_old_versions(self, session_id: str, max_versions: int = 5) -> None:
        """
        Remove old version snapshots beyond the maximum limit.
        
        Keeps only the most recent max_versions snapshots to prevent disk bloat.
        
        Args:
            session_id: Session identifier
            max_versions: Maximum number of versions to keep (default: 5)
        """
        versions_dir = self._get_session_versions_dir(session_id)
        
        if not versions_dir.exists():
            return
        
        # Get all version files sorted by version number
        version_files = sorted(versions_dir.glob("*.pkl"))
        
        # Calculate how many to delete
        num_to_delete = len(version_files) - max_versions
        
        if num_to_delete > 0:
            # Delete oldest versions
            for version_file in version_files[:num_to_delete]:
                version_file.unlink()
                print(f"[DEBUG] Deleted old snapshot: {version_file.name}")
    
    def create_version(self, session_id: str, df: pd.DataFrame, action_summary: str) -> int:
        """
        Create a new version snapshot before applying changes.
        
        Maintains a rolling window of maximum 5 versions for disk efficiency.
        When creating the 6th version, the oldest snapshot is automatically deleted.
        
        Args:
            session_id: Session identifier
            df: DataFrame to version
            action_summary: Description of action being applied
            
        Returns:
            int: New version ID
        """
        print(f"[DEBUG] Creating version for session: {session_id}")
        
        with self._session_lock:
            # Ensure versions directory exists
            versions_dir = self._get_session_versions_dir(session_id)
            versions_dir.mkdir(parents=True, exist_ok=True)
            
            # Load metadata
            meta = self._load_metadata(session_id)
            
            # Increment version
            new_version = meta["current_version"] + 1
            
            # Save version snapshot
            version_path = versions_dir / f"{new_version:04d}.pkl"
            session_data = self._load_session_data(session_id)
            
            with open(version_path, 'wb') as f:
                pickle.dump(session_data, f, protocol=pickle.HIGHEST_PROTOCOL)
            
            # Update metadata
            meta["current_version"] = new_version
            meta["history"].append({
                "version_id": new_version,
                "timestamp": datetime.now().isoformat(),
                "action_summary": action_summary,
                "rows_before": len(session_data["dataframe"]) if session_data else 0,
                "rows_after": len(df)
            })
            
            self._save_metadata(session_id, meta)
            
            # Enforce snapshot limit (keep only last 5 versions)
            self._cleanup_old_versions(session_id, max_versions=5)
            
            print(f"[DEBUG] ✓ Created version {new_version}")
            
            return new_version
    
    def undo_last_change(self, session_id: str) -> pd.DataFrame:
        """
        Undo last operation by restoring previous version.
        
        Args:
            session_id: Session identifier
            
        Returns:
            pd.DataFrame: Restored DataFrame
            
        Raises:
            ValueError: If no version history exists
        """
        print(f"[DEBUG] Undoing last operation for session: {session_id}")
        
        with self._session_lock:
            meta = self._load_metadata(session_id)
            
            if meta["current_version"] == 0:
                raise ValueError("No version history to undo")
            
            # Get previous version
            prev_version = meta["current_version"]
            versions_dir = self._get_session_versions_dir(session_id)
            version_path = versions_dir / f"{prev_version:04d}.pkl"
            
            if not version_path.exists():
                raise ValueError(f"Version {prev_version} not found")
            
            # Load previous version
            with open(version_path, 'rb') as f:
                prev_data = pickle.load(f)
            
            # Restore as current
            self._save_session_data(session_id, prev_data)
            
            # Update metadata
            meta["current_version"] = prev_version - 1
            self._save_metadata(session_id, meta)
            
            print(f"[DEBUG] ✓ Restored version {prev_version}")
            
            return prev_data["dataframe"].copy()
    
    def get_history(self, session_id: str) -> List[Dict]:
        """Get version history for session."""
        meta = self._load_metadata(session_id)
        return meta.get("history", [])
    
    def get_intentional_missing(self, session_id: str) -> Dict[str, List[int]]:
        """Get intentional missing values metadata."""
        meta = self._load_metadata(session_id)
        return meta.get("intentional_missing", {})
    
    def set_intentional_missing(self, session_id: str, column: str, row_indices: List[int]) -> None:
        """Set intentional missing values for a column."""
        with self._session_lock:
            meta = self._load_metadata(session_id)
            
            if "intentional_missing" not in meta:
                meta["intentional_missing"] = {}
            
            meta["intentional_missing"][column] = sorted(row_indices)
            self._save_metadata(session_id, meta)
    
    # ===== Core Session Methods =====
    
    def create_session(self, dataframe: pd.DataFrame, filename: str) -> str:
        """Create a new session with the provided DataFrame."""
        session_id = str(uuid.uuid4())
        expiration = datetime.now() + timedelta(minutes=settings.session_timeout_minutes)
        
        print(f"[DEBUG] Creating session: {session_id}")
        
        session_data = {
            "dataframe": dataframe,
            "filename": filename,
            "created_at": datetime.now(),
            "expires_at": expiration,
            "last_accessed": datetime.now(),
        }
        
        with self._session_lock:
            # Create session directory structure
            session_dir = self._get_session_dir(session_id)
            session_dir.mkdir(parents=True, exist_ok=True)
            
            versions_dir = self._get_session_versions_dir(session_id)
            versions_dir.mkdir(parents=True, exist_ok=True)
            
            # Save current
            self._save_session_data(session_id, session_data)
            
            # Initialize metadata
            meta = {
                "current_version": 0,
                "history": [],
                "intentional_missing": {},
                "audit_log": []  # Audit trail for data transformations
            }
            self._save_metadata(session_id, meta)
            
            # Add initial audit entry
            initial_rows = len(dataframe)
            self.add_audit_entry(
                session_id,
                f"Session created. Original file: '{filename}'. Initial rows: {initial_rows}"
            )
        
        print(f"[DEBUG] ✓ Session created: {session_id}")
        return session_id
    
    def get_dataframe(self, session_id: str) -> pd.DataFrame:
        """Retrieve DataFrame for a given session ID."""
        print(f"[DEBUG] Getting dataframe for session: {session_id}")
        
        with self._session_lock:
            session_data = self._load_session_data(session_id)
            
            if session_data is None:
                raise SessionNotFoundException(session_id)
            
            # Check expiration
            if datetime.now() > session_data["expires_at"]:
                print(f"[DEBUG] Session expired: {session_id}")
                # Clean up session directory
                session_dir = self._get_session_dir(session_id)
                if session_dir.exists():
                    shutil.rmtree(session_dir)
                raise SessionNotFoundException(session_id)
            
            # Update last accessed
            session_data["last_accessed"] = datetime.now()
            self._save_session_data(session_id, session_data)
            
            return session_data["dataframe"].copy()
    
    def update_dataframe(self, session_id: str, dataframe: pd.DataFrame) -> None:
        """Update the DataFrame for an existing session."""
        print(f"[DEBUG] Updating dataframe for session: {session_id}")
        
        with self._session_lock:
            session_data = self._load_session_data(session_id)
            
            if session_data is None:
                raise SessionNotFoundException(session_id)
            
            if datetime.now() > session_data["expires_at"]:
                raise SessionNotFoundException(session_id)
            
            session_data["dataframe"] = dataframe
            session_data["last_accessed"] = datetime.now()
            self._save_session_data(session_id, session_data)
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session and all its versions."""
        print(f"[DEBUG] Deleting session: {session_id}")
        
        with self._session_lock:
            session_dir = self._get_session_dir(session_id)
            
            if session_dir.exists():
                shutil.rmtree(session_dir)
                print(f"[DEBUG] ✓ Session deleted: {session_id}")
                return True
            
            return False
    
    def get_session_metadata(self, session_id: str) -> Dict:
        """Get metadata for a session without retrieving the full DataFrame."""
        with self._session_lock:
            session_data = self._load_session_data(session_id)
            
            if session_data is None:
                raise SessionNotFoundException(session_id)
            
            if datetime.now() > session_data["expires_at"]:
                raise SessionNotFoundException(session_id)
            
            df = session_data["dataframe"]
            
            return {
                "session_id": session_id,
                "filename": session_data["filename"],
                "created_at": session_data["created_at"].isoformat(),
                "expires_at": session_data["expires_at"].isoformat(),
                "last_accessed": session_data["last_accessed"].isoformat(),
                "shape": {"rows": df.shape[0], "columns": df.shape[1]},
                "columns": df.columns.tolist(),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            }
    
    # ===== Cleanup Methods =====
    
    def cleanup_expired_sessions(self) -> int:
        """Remove all expired session directories."""
        print(f"[DEBUG] Running cleanup for expired sessions...")
        
        now = datetime.now()
        removed_count = 0
        
        with self._session_lock:
            # Find all session directories
            for session_dir in self._sessions_dir.iterdir():
                if not session_dir.is_dir():
                    continue
                
                session_id = session_dir.name
                session_data = self._load_session_data(session_id)
                
                if session_data is None or now > session_data.get("expires_at", now):
                    print(f"[DEBUG] Removing expired session: {session_id}")
                    shutil.rmtree(session_dir)
                    removed_count += 1
        
        if removed_count > 0:
            print(f"[DEBUG] ✓ Cleaned up {removed_count} expired sessions")
        
        return removed_count
    
    # ===== Temporary Storage Methods =====
    
    def create_temp_storage(self, sheets_dict: Dict[str, pd.DataFrame], filename: str) -> str:
        """Create temporary storage for multi-sheet Excel file."""
        temp_id = f"temp-{uuid.uuid4()}"
        expiration = datetime.now() + timedelta(minutes=30)
        
        temp_data = {
            "sheets": sheets_dict,
            "filename": filename,
            "created_at": datetime.now(),
            "expires_at": expiration,
        }
        
        with self._session_lock:
            temp_path = self._get_temp_path(temp_id)
            with open(temp_path, 'wb') as f:
                pickle.dump(temp_data, f, protocol=pickle.HIGHEST_PROTOCOL)
        
        return temp_id
    
    def get_temp_storage(self, temp_id: str) -> Dict:
        """Retrieve temporary storage data."""
        with self._session_lock:
            temp_path = self._get_temp_path(temp_id)
            
            if not temp_path.exists():
                raise SessionNotFoundException(temp_id)
            
            with open(temp_path, 'rb') as f:
                temp_data = pickle.load(f)
            
            if datetime.now() > temp_data["expires_at"]:
                temp_path.unlink()
                raise SessionNotFoundException(temp_id)
            
            return temp_data
    
    def delete_temp_storage(self, temp_id: str) -> bool:
        """Delete temporary storage file."""
        with self._session_lock:
            temp_path = self._get_temp_path(temp_id)
            
            if temp_path.exists():
                temp_path.unlink()
                return True
            
            return False
    
    def cleanup_expired_temp_storage(self) -> int:
        """Remove all expired temporary storage files."""
        now = datetime.now()
        removed_count = 0
        
        with self._session_lock:
            for temp_file in self._temp_dir.glob("*.pkl"):
                try:
                    with open(temp_file, 'rb') as f:
                        temp_data = pickle.load(f)
                    
                    if now > temp_data["expires_at"]:
                        temp_file.unlink()
                        removed_count += 1
                except:
                    # Corrupted file
                    temp_file.unlink()
                    removed_count += 1
        
        return removed_count
    
    def add_audit_entry(self, session_id: str, entry: str) -> None:
        """
        Add an entry to the audit log for this session.
        
        Args:
            session_id: Session identifier
            entry: Human-readable description of the operation performed
        """
        try:
            meta = self._load_metadata(session_id)
            if meta is None:
                print(f"[WARN] Cannot add audit entry - session {session_id} not found")
                return
            
            # Ensure audit_log exists (backward compatibility)
            if "audit_log" not in meta:
                meta["audit_log"] = []
            
            # Add timestamped entry
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            timestamped_entry = f"[{timestamp}] {entry}"
            meta["audit_log"].append(timestamped_entry)
            
            # Save updated metadata
            self._save_metadata(session_id, meta)
            print(f"[DEBUG] Audit entry added for session {session_id}: {entry}")
        except Exception as e:
            print(f"[ERROR] Failed to add audit entry: {e}")
    
    def get_audit_log(self, session_id: str) -> List[str]:
        """
        Retrieve the complete audit log for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            List of timestamped audit entries
        """
        meta = self._load_metadata(session_id)
        if meta is None:
            raise SessionNotFoundException(session_id)
        
        # Return audit log if exists, otherwise empty list (backward compatibility)
        return meta.get("audit_log", [])
    
    def get_initial_row_count(self, session_id: str) -> Optional[int]:
        """
        Extract initial row count from the first audit log entry.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Initial row count if available, None otherwise
        """
        audit_log = self.get_audit_log(session_id)
        if not audit_log:
            return None
        
        # Parse first entry: "Session created. Original file: '...'. Initial rows: N"
        first_entry = audit_log[0]
        try:
            if "Initial rows:" in first_entry:
                parts = first_entry.split("Initial rows:")
                if len(parts) > 1:
                    return int(parts[1].strip())
        except:
            pass
        
        return None


# Global singleton instance
data_manager = DataManager()
