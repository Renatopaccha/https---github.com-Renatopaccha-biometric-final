"""
End-to-end integration tests for full workflow.

Tests complete user workflows from upload to processing.
"""

import pytest
import pandas as pd
import numpy as np


class TestUploadWorkflow:
    """Tests for complete upload workflow."""

    @pytest.mark.integration
    def test_upload_process_retrieve_workflow(self, any_backend, medium_df):
        """
        Test complete workflow: upload → process → retrieve.

        This simulates a real user workflow.
        """
        session_id = "test-workflow-1"

        # 1. Upload (create session)
        any_backend.create_session(session_id, medium_df, "data.csv", ttl_seconds=300)

        assert any_backend.session_exists(session_id)

        # 2. Retrieve DataFrame
        df_retrieved = any_backend.get_dataframe(session_id)
        pd.testing.assert_frame_equal(medium_df, df_retrieved, check_dtype=False)

        # 3. Process (create version before modification)
        any_backend.create_version(session_id, df_retrieved, "Before cleaning")

        # 4. Modify DataFrame (simulate cleaning)
        df_modified = df_retrieved.copy()
        df_modified["new_column"] = np.random.rand(len(df_modified))

        # 5. Update
        any_backend.update_dataframe(session_id, df_modified)

        # 6. Verify modification persisted
        df_check = any_backend.get_dataframe(session_id)
        assert "new_column" in df_check.columns

        # 7. Undo
        df_restored = any_backend.undo_last_change(session_id)
        assert "new_column" not in df_restored.columns

        # Cleanup
        any_backend.delete_session(session_id)


    @pytest.mark.integration
    def test_multi_version_workflow(self, any_backend, small_df):
        """Test workflow with multiple versions."""
        session_id = "test-multi-version"

        # Create session
        any_backend.create_session(session_id, small_df, "data.csv", ttl_seconds=300)

        # Create 5 versions (max)
        for i in range(5):
            df = any_backend.get_dataframe(session_id)

            # Create version before modifying
            any_backend.create_version(session_id, df, f"Version {i+1}")

            # Modify
            df[f"col_{i}"] = range(len(df))
            any_backend.update_dataframe(session_id, df)

        # Verify history
        history = any_backend.get_history(session_id)
        assert len(history) == 5

        # Undo all versions
        for i in range(5):
            any_backend.undo_last_change(session_id)

        # Should be back to original
        df_final = any_backend.get_dataframe(session_id)
        pd.testing.assert_frame_equal(small_df, df_final, check_dtype=False)

        # Cleanup
        any_backend.delete_session(session_id)


class TestConcurrentUsers:
    """Tests for concurrent user sessions."""

    @pytest.mark.integration
    @pytest.mark.concurrency
    def test_multiple_sessions_isolated(self, any_backend, small_df, medium_df):
        """Test that multiple sessions are isolated from each other."""
        session_1 = "user-1-session"
        session_2 = "user-2-session"

        # Create two sessions
        any_backend.create_session(session_1, small_df, "user1.csv", ttl_seconds=300)
        any_backend.create_session(session_2, medium_df, "user2.csv", ttl_seconds=300)

        # Verify both exist
        assert any_backend.session_exists(session_1)
        assert any_backend.session_exists(session_2)

        # Verify data is isolated
        df1 = any_backend.get_dataframe(session_1)
        df2 = any_backend.get_dataframe(session_2)

        assert len(df1) == len(small_df)
        assert len(df2) == len(medium_df)
        assert len(df1) != len(df2)

        # Modify session 1
        df1["new_col"] = 1
        any_backend.update_dataframe(session_1, df1)

        # Verify session 2 unaffected
        df2_check = any_backend.get_dataframe(session_2)
        assert "new_col" not in df2_check.columns

        # Cleanup
        any_backend.delete_session(session_1)
        any_backend.delete_session(session_2)


    @pytest.mark.integration
    @pytest.mark.slow
    def test_many_concurrent_sessions(self, any_backend, small_df):
        """Test handling of many concurrent sessions."""
        num_sessions = 100
        session_ids = [f"concurrent-{i}" for i in range(num_sessions)]

        try:
            # Create 100 sessions
            for session_id in session_ids:
                any_backend.create_session(session_id, small_df, f"data_{session_id}.csv", ttl_seconds=300)

            # Verify all exist
            for session_id in session_ids:
                assert any_backend.session_exists(session_id)

            # Random operations on random sessions
            import random
            for _ in range(50):
                session_id = random.choice(session_ids)
                df = any_backend.get_dataframe(session_id)
                assert len(df) == len(small_df)

        finally:
            # Cleanup
            for session_id in session_ids:
                try:
                    any_backend.delete_session(session_id)
                except:
                    pass


class TestDataIntegrity:
    """Tests for data integrity across operations."""

    @pytest.mark.integration
    def test_dataframe_integrity_after_roundtrip(self, any_backend, df_with_dtypes):
        """Test that DataFrame integrity is preserved after save/load."""
        session_id = "integrity-test"

        # Create session
        any_backend.create_session(session_id, df_with_dtypes, "data.csv", ttl_seconds=300)

        # Retrieve
        df_retrieved = any_backend.get_dataframe(session_id)

        # Check values (allow dtype conversions)
        for col in df_with_dtypes.columns:
            if col == "datetime_col":
                # Datetime might need special handling
                pd.testing.assert_series_equal(
                    df_with_dtypes[col],
                    df_retrieved[col],
                    check_dtype=False
                )
            else:
                pd.testing.assert_series_equal(
                    df_with_dtypes[col],
                    df_retrieved[col],
                    check_dtype=False
                )

        # Cleanup
        any_backend.delete_session(session_id)


    @pytest.mark.integration
    def test_nulls_preserved_after_roundtrip(self, any_backend, df_with_nulls):
        """Test that null values are preserved correctly."""
        session_id = "nulls-test"

        # Original null positions
        original_nulls = {
            col: df_with_nulls[col].isna().sum()
            for col in df_with_nulls.columns
        }

        # Create session
        any_backend.create_session(session_id, df_with_nulls, "nulls.csv", ttl_seconds=300)

        # Retrieve
        df_retrieved = any_backend.get_dataframe(session_id)

        # Check nulls preserved
        for col in df_with_nulls.columns:
            assert df_retrieved[col].isna().sum() == original_nulls[col]

        # Cleanup
        any_backend.delete_session(session_id)


class TestAuditAndMetadata:
    """Tests for audit logging and metadata."""

    @pytest.mark.integration
    def test_audit_log_tracks_operations(self, any_backend, small_df):
        """Test that audit log records all operations."""
        session_id = "audit-test"

        # Create session (adds audit entry)
        any_backend.create_session(session_id, small_df, "data.csv", ttl_seconds=300)

        # Check initial audit log
        audit_log = any_backend.get_audit_log(session_id)
        assert len(audit_log) >= 1
        assert "Session created" in audit_log[0]

        # Add custom audit entry
        any_backend.add_audit_entry(session_id, "Custom operation performed")

        # Check updated audit log
        audit_log = any_backend.get_audit_log(session_id)
        assert len(audit_log) >= 2
        assert "Custom operation" in audit_log[-1]

        # Cleanup
        any_backend.delete_session(session_id)


    @pytest.mark.integration
    def test_metadata_updated_correctly(self, any_backend, small_df):
        """Test that metadata reflects current state."""
        session_id = "metadata-test"

        # Create session
        any_backend.create_session(session_id, small_df, "data.csv", ttl_seconds=300)

        # Get metadata
        metadata = any_backend.get_metadata(session_id)

        # Check metadata fields
        assert metadata["filename"] == "data.csv"
        assert metadata["session_id"] == session_id
        assert "shape" in metadata
        assert "columns" in metadata

        # Cleanup
        any_backend.delete_session(session_id)


class TestTempStorage:
    """Tests for temporary storage (multi-sheet Excel)."""

    @pytest.mark.integration
    def test_temp_storage_workflow(self, any_backend, small_df, medium_df):
        """Test complete temporary storage workflow."""
        temp_id = "temp-multi-sheet"

        # Create temp storage with multiple sheets
        sheets = {
            "Sheet1": small_df,
            "Sheet2": medium_df
        }

        any_backend.create_temp_storage(temp_id, sheets, "multi.xlsx", ttl_seconds=300)

        # Retrieve temp storage
        temp_data = any_backend.get_temp_storage(temp_id)

        # Verify sheets
        assert len(temp_data["sheets"]) == 2
        assert "Sheet1" in temp_data["sheets"]
        assert "Sheet2" in temp_data["sheets"]

        pd.testing.assert_frame_equal(
            temp_data["sheets"]["Sheet1"],
            small_df,
            check_dtype=False
        )

        # Delete temp storage
        assert any_backend.delete_temp_storage(temp_id)

        # Verify deleted
        with pytest.raises(Exception):
            any_backend.get_temp_storage(temp_id)


class TestErrorHandling:
    """Tests for error handling."""

    @pytest.mark.integration
    def test_get_nonexistent_session_fails(self, any_backend):
        """Test that getting non-existent session raises error."""
        from app.core.errors import SessionNotFoundException

        with pytest.raises(SessionNotFoundException):
            any_backend.get_dataframe("nonexistent-session")


    @pytest.mark.integration
    def test_update_nonexistent_session_fails(self, any_backend, small_df):
        """Test that updating non-existent session raises error."""
        from app.core.errors import SessionNotFoundException

        with pytest.raises(SessionNotFoundException):
            any_backend.update_dataframe("nonexistent-session", small_df)


    @pytest.mark.integration
    def test_undo_without_history_fails(self, any_backend, small_df):
        """Test that undo without history raises error."""
        session_id = "no-history"

        # Create session (no versions)
        any_backend.create_session(session_id, small_df, "data.csv", ttl_seconds=300)

        # Try to undo (should fail)
        with pytest.raises(ValueError):
            any_backend.undo_last_change(session_id)

        # Cleanup
        any_backend.delete_session(session_id)
