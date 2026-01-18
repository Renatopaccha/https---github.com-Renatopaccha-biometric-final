"""
Data cleaning endpoints.
Provides API routes for data quality assessment and cleaning operations.
"""

from fastapi import APIRouter, HTTPException, Query

from app.services.cleaning_service import CleaningService
from app.internal.data_manager import data_manager
from app.schemas.cleaning import (
    QualityReportResponse,
    DatasetHealthReport,
    NullHandlingRequest,
    NullHandlingResponse,
    DuplicateRemovalRequest,
    DuplicateRemovalResponse,
    ColumnTypeChangeRequest,
    ColumnTypeChangeResponse,
    ColumnFilterRequest,
    ColumnFilterResponse,
    RowDeletionRequest,
    RowDeletionResponse,
    # Null Handling Simulation
    SimulationRequest,
    SimulationResponse,
    DistributionChange,
    SamplePreview,
    # Missing Values Studio
    MissingSimulatorRequest,
    MissingSimulatorResponse,
    MissingApplyRequest,
    MissingApplyResponse,
    UndoRequest,
    UndoResponse,
    HistoryResponse,
    HistoryItem,
    IntentionalMissingResponse,
    ImpactMetrics,
    EmptyRowsResponse
)
from app.core.errors import SessionNotFoundException, InvalidColumnError, BiometricException

router = APIRouter()


@router.get("/quality", response_model=QualityReportResponse)
async def get_quality_report(
    session_id: str = Query(..., description="Session ID of the dataset")
) -> QualityReportResponse:
    """
    Get comprehensive dataset health report with intelligent diagnostics.
    
    Analyzes the dataset and returns:
    - Overall completeness score (0-100%)
    - Column-level quality metrics
    - Outlier detection using IQR method
    - Type inconsistency detection
    - Actionable suggestions per column
    - Health status indicators
    
    Args:
        session_id: The session identifier
        
    Returns:
        QualityReportResponse with comprehensive health metrics
        
    Raises:
        HTTPException 404: If session not found or expired
    """
    # Retrieve DataFrame
    try:
        df = data_manager.get_dataframe(session_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    
    # Generate comprehensive health report
    report_data = CleaningService.get_data_quality_report(df)
    
    return QualityReportResponse(
        success=True,
        message="Dataset health report generated successfully",
        session_id=session_id,
        report=DatasetHealthReport(**report_data)
    )


@router.post("/nulls", response_model=NullHandlingResponse)
async def handle_missing_values(request: NullHandlingRequest) -> NullHandlingResponse:
    """
    Handle missing values in a specific column.
    
    Applies the specified method to handle nulls:
    - drop: Remove rows with null values
    - mean: Fill with column mean (numeric only)
    - median: Fill with column median (numeric only)
    - mode: Fill with most frequent value
    - ffill: Forward fill
    - bfill: Backward fill
    - constant: Fill with specified constant value
    
    **IMPORTANT**: This operation modifies the dataset in the session.
    
    Args:
        request: NullHandlingRequest with session_id, column, method, and optional fill_value
        
    Returns:
        NullHandlingResponse with cleaning results
        
    Raises:
        HTTPException 404: If session not found
        HTTPException 400: If column doesn't exist or operation is invalid
    """
    # Retrieve DataFrame
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    
    # Create version snapshot before modifying
    action_summary = f"Handle nulls in '{request.column}' using {request.method}"
    data_manager.create_version(request.session_id, df, action_summary)
    
    # Apply cleaning
    try:
        df_clean, nulls_before, rows_affected = CleaningService.handle_missing_values(
            df,
            request.column,
            request.method,
            request.fill_value
        )
    except (InvalidColumnError, BiometricException) as e:
        raise HTTPException(
            status_code=e.status_code if hasattr(e, 'status_code') else 400,
            detail=e.message if hasattr(e, 'message') else str(e)
        )
    
    # Update DataFrame in session
    data_manager.update_dataframe(request.session_id, df_clean)
    
    # Log audit entry
    if rows_affected > 0:
        data_manager.add_audit_entry(
            request.session_id,
            f"Handled {nulls_before} null values in column '{request.column}' using method '{request.method}'"
        )
    
    # Count nulls after
    nulls_after = int(df_clean[request.column].isna().sum())
    
    return NullHandlingResponse(
        success=True,
        message=f"Missing values handled successfully using method '{request.method}'",
        session_id=request.session_id,
        column=request.column,
        method=request.method,
        nulls_before=nulls_before,
        nulls_after=nulls_after,
        rows_affected=rows_affected
    )


@router.post("/duplicates", response_model=DuplicateRemovalResponse)
async def remove_duplicates(request: DuplicateRemovalRequest) -> DuplicateRemovalResponse:
    """
    Remove duplicate rows from the dataset.
    
    Identifies and removes duplicate rows based on:
    - All columns (if subset is None)
    - Specified subset of columns
    
    **IMPORTANT**: This operation modifies the dataset in the session.
    
    Args:
        request: DuplicateRemovalRequest with session_id, optional subset, and keep strategy
        
    Returns:
        DuplicateRemovalResponse with removal results
        
    Raises:
        HTTPException 404: If session not found
        HTTPException 400: If subset columns don't exist
    """
    # Retrieve DataFrame
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    
    rows_before = len(df)
    
    # Remove duplicates
    try:
        keep_param = request.keep if request.keep != False else False
        df_clean, duplicates_removed = CleaningService.remove_duplicates(
            df,
            request.subset,
            keep_param
        )
    except (InvalidColumnError, BiometricException) as e:
        raise HTTPException(
            status_code=e.status_code if hasattr(e, 'status_code') else 400,
            detail=e.message if hasattr(e, 'message') else str(e)
        )
    
    # Update DataFrame in session
    data_manager.update_dataframe(request.session_id, df_clean)
    
    # Log audit entry
    if duplicates_removed > 0:
        subset_info = f" (columns: {request.subset})" if request.subset else " (all columns)"
        data_manager.add_audit_entry(
            request.session_id,
            f"Removed {duplicates_removed} duplicate rows{subset_info}"
        )
    
    rows_after = len(df_clean)
    
    return DuplicateRemovalResponse(
        success=True,
        message=f"Removed {duplicates_removed} duplicate rows",
        session_id=request.session_id,
        duplicates_removed=duplicates_removed,
        rows_before=rows_before,
        rows_after=rows_after
    )


@router.post("/column-type", response_model=ColumnTypeChangeResponse)
async def change_column_type(request: ColumnTypeChangeRequest) -> ColumnTypeChangeResponse:
    """
    Change the data type of a column.
    
    Converts column to specified type:
    - int: Integer
    - float: Floating point
    - string: Text
    - datetime: Date/time
    - bool: Boolean
    
    **IMPORTANT**: This operation modifies the dataset in the session.
    
    Args:
        request: ColumnTypeChangeRequest with session_id, column, new_type, and error handling
        
    Returns:
        ColumnTypeChangeResponse with conversion results
        
    Raises:
        HTTPException 404: If session not found
        HTTPException 400: If column doesn't exist or conversion fails
    """
    # Retrieve DataFrame
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    
    # Change type
    try:
        df_clean, old_type, conversion_errors = CleaningService.change_column_type(
            df,
            request.column,
            request.new_type,
            request.errors
        )
    except (InvalidColumnError, BiometricException) as e:
        raise HTTPException(
            status_code=e.status_code if hasattr(e, 'status_code') else 400,
            detail=e.message if hasattr(e, 'message') else str(e)
        )
    
    # Update DataFrame in session
    data_manager.update_dataframe(request.session_id, df_clean)
    
    new_type_actual = str(df_clean[request.column].dtype)
    
    return ColumnTypeChangeResponse(
        success=True,
        message=f"Column '{request.column}' type changed from {old_type} to {new_type_actual}",
        session_id=request.session_id,
        column=request.column,
        old_type=old_type,
        new_type=new_type_actual,
        conversion_errors=conversion_errors
    )


@router.post("/filter-columns", response_model=ColumnFilterResponse)
async def filter_columns(request: ColumnFilterRequest) -> ColumnFilterResponse:
    """
    Keep only specified columns, removing all others.
    
    Useful for:
    - Removing irrelevant columns
    - Selecting features for analysis
    - Simplifying the dataset
    
    **IMPORTANT**: This operation modifies the dataset in the session.
    
    Args:
        request: ColumnFilterRequest with session_id and columns_to_keep
        
    Returns:
        ColumnFilterResponse with filtering results
        
    Raises:
        HTTPException 404: If session not found
        HTTPException 400: If columns don't exist or trying to remove all columns
    """
    # Retrieve DataFrame
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    
    columns_before = len(df.columns)
    
    # Filter columns
    try:
        df_clean, columns_removed = CleaningService.filter_columns(
            df,
            request.columns_to_keep
        )
    except (InvalidColumnError, BiometricException) as e:
        raise HTTPException(
            status_code=e.status_code if hasattr(e, 'status_code') else 400,
            detail=e.message if hasattr(e, 'message') else str(e)
        )
    
    # Update DataFrame in session
    data_manager.update_dataframe(request.session_id, df_clean)
    
    # Log audit entry
    if len(columns_removed) > 0:
        removed_list = columns_removed[:3] + (['...'] if len(columns_removed) > 3 else [])
        data_manager.add_audit_entry(
            request.session_id,
            f"Removed {len(columns_removed)} irrelevant columns: {', '.join(removed_list)}"
        )
    
    columns_after = len(df_clean.columns)
    
    return ColumnFilterResponse(
        success=True,
        message=f"Removed {len(columns_removed)} columns, kept {columns_after} columns",
        session_id=request.session_id,
        columns_removed=columns_removed,
        columns_kept=request.columns_to_keep,
        columns_before=columns_before,
        columns_after=columns_after
    )


@router.post("/delete-rows", response_model=RowDeletionResponse)
async def delete_rows(request: RowDeletionRequest) -> RowDeletionResponse:
    """
    Delete specific rows from the dataset by index.
    
    **IMPORTANT**: 
    - Indices must be zero-based integer indices corresponding to the current state of the dataset.
    - After deletion, the index is reset, so remaining rows will shift indices.
    - This operation modifies the dataset in the session.
    
    Args:
        request: RowDeletionRequest with session_id and list of row_indices
        
    Returns:
        RowDeletionResponse with result statistics
        
    Raises:
        HTTPException 404: If session not found
        HTTPException 500: If deletion fails
    """
    # Retrieve DataFrame
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    
    # Delete rows
    try:
        df_clean, rows_deleted = CleaningService.delete_rows(
            df,
            request.row_indices
        )
    except BiometricException as e:
        raise HTTPException(
            status_code=e.status_code if hasattr(e, 'status_code') else 500,
            detail=e.message if hasattr(e, 'message') else str(e)
        )
    
    # Update DataFrame in session
    data_manager.update_dataframe(request.session_id, df_clean)
    
    # Log audit entry
    if rows_deleted > 0:
        data_manager.add_audit_entry(
            request.session_id,
            f"Deleted {rows_deleted} rows (indices: {request.row_indices[:5]}{'...' if len(request.row_indices) > 5 else ''})"
        )
    
    rows_remaining = len(df_clean)
    
    return RowDeletionResponse(
        success=True,
        message=f"Successfully deleted {rows_deleted} rows",
        session_id=request.session_id,
        rows_deleted=rows_deleted,
        rows_remaining=rows_remaining
    )

# ==================== NULL HANDLING SIMULATION ====================

@router.post("/nulls/simulate", response_model=SimulationResponse)
async def simulate_null_handling(request: SimulationRequest) -> SimulationResponse:
    """
    Simulate null handling without modifying the dataset.
    
    Provides a detailed impact report showing:
    - Number of rows that would be affected
    - Percentage of information loss (for drop method)
    - Statistical distribution changes (for numeric columns)
    - Sample preview of before/after transformations
    
    This is a read-only operation - the original DataFrame is not modified.
    
    Args:
        request: SimulationRequest with session_id, column, method, and optional fill_value
        
    Returns:
        SimulationResponse with detailed impact report
        
    Raises:
        HTTPException 404: If session not found
        HTTPException 400: If column doesn't exist or method is invalid
    """
    # Retrieve DataFrame
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    
    # Run simulation
    try:
        report = CleaningService.simulate_null_handling(
            df,
            request.column,
            request.method,
            request.fill_value
        )
    except (InvalidColumnError, BiometricException) as e:
        raise HTTPException(
            status_code=e.status_code if hasattr(e, 'status_code') else 400,
            detail=e.message if hasattr(e, 'message') else str(e)
        )
    
    # Build response message
    if report["information_loss_percent"] > 0:
        message = f"Simulation complete: {report['rows_affected']} rows would be affected ({report['information_loss_percent']:.1f}% information loss)"
    else:
        message = f"Simulation complete: {report['rows_affected']} values would be filled"
    
    # Convert sample_preview to SamplePreview objects
    sample_previews = [SamplePreview(**sample) for sample in report["sample_preview"]]
    
    # Convert distribution_change if present
    distribution_change = None
    if report["distribution_change"]:
        distribution_change = DistributionChange(**report["distribution_change"])
    
    return SimulationResponse(
        success=True,
        message=message,
        session_id=request.session_id,
        column=request.column,
        method=request.method,
        rows_affected=report["rows_affected"],
        information_loss_percent=report["information_loss_percent"],
        distribution_change=distribution_change,
        sample_preview=sample_previews
    )


# ==================== MISSING VALUES STUDIO ====================

@router.post("/missing/preview", response_model=MissingSimulatorResponse)
async def preview_missing_actions(request: MissingSimulatorRequest) -> MissingSimulatorResponse:
    """
    Simulate missing value actions without modifying the dataset.
    
    Provides preview of impact metrics and sample data showing
    what the result would look like if actions were applied.
    """
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    
    actions_dict = [action.dict() for action in request.actions]
    
    try:
        impact, preview_data, preview_columns, total_rows = CleaningService.simulate_missing_actions(
            df,
            actions_dict,
            skip=request.preview.skip,
            limit=request.preview.limit
        )
    except BiometricException as e:
        raise HTTPException(
            status_code=e.status_code if hasattr(e, 'status_code') else 500,
            detail=e.message if hasattr(e, 'message') else str(e)
        )
    
    if impact["rows_removed"] > 0:
        message = f"Simulation complete: {impact['rows_removed']} rows would be removed ({impact['row_loss_pct']:.1f}% loss)"
    else:
        total_filled = sum(impact["filled_counts"].values())
        message = f"Simulation complete: {total_filled} values would be filled"
    
    return MissingSimulatorResponse(
        success=True,
        message=message,
        session_id=request.session_id,
        impact=ImpactMetrics(**impact),
        preview_data=preview_data,
        preview_columns=preview_columns,
        preview_total_rows=total_rows
    )


@router.post("/missing/apply", response_model=MissingApplyResponse)
async def apply_missing_actions(request: MissingApplyRequest) -> MissingApplyResponse:
    """
    Apply missing value actions and create version snapshot.
    """
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    
    actions_summary = f"Applied {len(request.actions)} missing value action(s)"
    version_id = data_manager.create_version(request.session_id, df, actions_summary)
    
    actions_dict = [action.dict() for action in request.actions]
    
    try:
        df_result, impact = CleaningService.apply_missing_actions(df, actions_dict)
    except BiometricException as e:
        raise HTTPException(
            status_code=e.status_code if hasattr(e, 'status_code') else 500,
            detail=e.message if hasattr(e, 'message') else str(e)
        )
    
    # PERFORMANCE OPTIMIZATION: Batch collect all intentional missing data
    # to avoid N+1 file I/O operations (one save per column)
    intentional_missing_batch = {}
    for action in request.actions:
        if action.type == "mark_intentional":
            for col in action.columns:
                if col in df_result.columns:
                    na_indices = df_result[df_result[col].isna()].index.tolist()
                    intentional_missing_batch[col] = na_indices

    # Save all intentional missing data in one operation
    if intentional_missing_batch:
        data_manager.set_intentional_missing_batch(request.session_id, intentional_missing_batch)
    
    data_manager.update_dataframe(request.session_id, df_result)
    
    message = f"Applied changes: {impact['rows_removed']} rows removed, {sum(impact['filled_counts'].values())} values filled"
    
    return MissingApplyResponse(
        success=True,
        message=message,
        session_id=request.session_id,
        version_id=version_id,
        impact=ImpactMetrics(**impact)
    )


@router.post("/undo", response_model=UndoResponse)
async def undo_last_operation(request: UndoRequest) -> UndoResponse:
    """
    Undo the last applied operation.
    """
    try:
        df_restored = data_manager.undo_last_change(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    history = data_manager.get_history(request.session_id)
    current_version = len(history) - 1 if history else 0
    
    return UndoResponse(
        success=True,
        message=f"Restored to version {current_version}",
        session_id=request.session_id,
        version_id=current_version
    )


@router.get("/history", response_model=HistoryResponse)
async def get_version_history(session_id: str = Query(...)) -> HistoryResponse:
    """Get version history."""
    try:
        _ = data_manager.get_dataframe(session_id)
    except SessionNotFoundException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    
    history = data_manager.get_history(session_id)
    current_version = len(history) - 1 if history else 0
    history_items = [HistoryItem(**item) for item in history]
    
    return HistoryResponse(
        success=True,
        message=f"Found {len(history)} version(s)",
        session_id=session_id,
        current_version=current_version,
        history=history_items
    )


@router.get("/intentional", response_model=IntentionalMissingResponse)
async def get_intentional_missing(session_id: str = Query(...)) -> IntentionalMissingResponse:
    """Get intentional missing metadata."""
    try:
        _ = data_manager.get_dataframe(session_id)
    except SessionNotFoundException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    
    intentional_missing = data_manager.get_intentional_missing(session_id)
    
    return IntentionalMissingResponse(
        success=True,
        message="Intentional missing metadata retrieved",
        session_id=session_id,
        intentional_missing=intentional_missing
    )


@router.get("/empty-rows", response_model=EmptyRowsResponse)
async def detect_empty_rows(
    session_id: str = Query(..., description="Session ID of the dataset")
) -> EmptyRowsResponse:
    """
    Detect completely empty rows (all values are NaN/None).
    
    Provides a preview of empty rows for user audit before deletion.
    User can review the list and then call /delete-rows to remove them.
    
    Args:
        session_id: Session identifier
        
    Returns:
        EmptyRowsResponse with indices, count, and preview of empty rows
    """
    try:
        df = data_manager.get_dataframe(session_id)
    except SessionNotFoundException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    
    # Detect empty rows
    result = CleaningService.detect_empty_rows(df)
    
    total = result['total_empty']
    message = f"Found {total} completely empty row{'s' if total != 1 else ''}"
    if total == 0:
        message = "No empty rows detected"
    
    return EmptyRowsResponse(
        success=True,
        message=message,
        session_id=session_id,
        empty_row_indices=result['empty_row_indices'],
        total_empty=result['total_empty'],
        preview=result['preview']
    )
