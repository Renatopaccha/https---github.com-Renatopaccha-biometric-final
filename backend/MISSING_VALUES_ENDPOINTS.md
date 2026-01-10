"""
Complete all backend endpoints with Missing Values Studio support.

The backend infrastructure is now complete. The Missing Values Studio endpoints
need to be added at the end of /app/api/v1/endpoints/cleaning.py (after line 378).

Here's the code to append:
"""

# Add to the END of /Users/preciosdeliquidacion/Documents/Biometric/backend/app/api/v1/endpoints/cleaning.py:

```python

# ==================== MISSING VALUES STUDIO ====================

@router.post("/missing/preview", response_model=MissingSimulatorResponse)
async def preview_missing_actions(request: MissingSimulatorRequest) -> MissingSimulatorResponse:
    """
    Simulate missing value actions without modifying the dataset.
    
    Provides preview of impact metrics and sample data showing
    what the result would look like if actions were applied.
    
    Returns:
        MissingSimulatorResponse with impact metrics and preview sample
    """
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    
    # Convert pydantic models to dicts for service layer
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
    
    # Build summary message
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
    
    This modifies the dataset and creates a version for undo.
    
    Returns:
        MissingApplyResponse with impact metrics and new version ID
    """
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    
    # Create version BEFORE applying changes
    actions_summary = f"Applied {len(request.actions)} missing value action(s)"
    version_id = data_manager.create_version(request.session_id, df, actions_summary)
    
    # Convert and apply actions
    actions_dict = [action.dict() for action in request.actions]
    
    try:
        df_result, impact = CleaningService.apply_missing_actions(df, actions_dict)
    except BiometricException as e:
        raise HTTPException(
            status_code=e.status_code if hasattr(e, 'status_code') else 500,
            detail=e.message if hasattr(e, 'message') else str(e)
        )
    
    # Handle mark_intentional metadata
    for action in request.actions:
        if action.type == "mark_intentional":
            for col in action.columns:
                if col in df_result.columns:
                    na_indices = df_result[df_result[col].isna()].index.tolist()
                    data_manager.set_intentional_missing(request.session_id, col, na_indices)
    
    # Update dataframe
    data_manager.update_dataframe(request.session_id, df_result)
    
    message = f"Successfully applied changes. {impact['rows_removed']} rows removed, " \
              f"{sum(impact['filled_counts'].values())} values filled"
    
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
    Undo the last applied operation by restoring previous version.
    
    Returns:
        UndoResponse with restored version ID
    """
    try:
        df_restored = data_manager.undo(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Get current version after undo
    history = data_manager.get_history(request.session_id)
    current_version = len(history) - 1 if history else 0
    
    return UndoResponse(
        success=True,
        message=f"Successfully restored to version {current_version}",
        session_id=request.session_id,
        version_id=current_version
    )


@router.get("/history", response_model=HistoryResponse)
async def get_version_history(
    session_id: str = Query(..., description="Session ID")
) -> HistoryResponse:
    """
    Get version history for a session.
    
    Returns list of all versions with metadata.
    """
    try:
        # Verify session exists
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
async def get_intentional_missing(
    session_id: str = Query(..., description="Session ID")
) -> IntentionalMissingResponse:
    """
    Get intentional missing value metadata.
    
    Returns map of columns to row indices marked as intentionally missing.
    """
    try:
        # Verify session exists
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
```
