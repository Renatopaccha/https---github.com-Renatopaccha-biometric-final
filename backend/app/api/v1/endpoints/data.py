"""
Data endpoint: Retrieve dataset rows for display in frontend.
Supports pagination for large datasets.
"""

from fastapi import APIRouter, HTTPException, Query

from app.schemas.data import DataRequest, DataResponse
from app.internal.data_manager import data_manager
from app.core.errors import SessionNotFoundException

router = APIRouter()


@router.get("/data", response_model=DataResponse)
async def get_data(
    session_id: str = Query(..., description="Session ID of the uploaded dataset"),
    skip: int = Query(default=0, ge=0, description="Number of rows to skip"),
    limit: int = Query(default=100, le=1000, description="Maximum rows to return")
) -> DataResponse:
    """
    Retrieve dataset rows for display and manipulation.
    
    Supports pagination for efficient handling of large datasets.
    Returns data as a list of dictionaries where each dictionary represents a row.
    
    Args:
        session_id: The session identifier
        skip: Number of rows to skip (default: 0)
        limit: Maximum number of rows to return (default: 100, max: 1000)
        
    Returns:
        DataResponse with paginated data and metadata
        
    Raises:
        HTTPException 404: If session not found or expired
        HTTPException 400: If pagination parameters are invalid
    """
    # Retrieve DataFrame from session
    try:
        df = data_manager.get_dataframe(session_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    
    # Get total row count
    total_rows = len(df)
    
    # Apply pagination
    paginated_df = df.iloc[skip:skip + limit]
    
    # Convert to list of dictionaries
    # Use pandas to_dict with 'records' orientation for row-based format
    # Replace NaN with None for proper JSON serialization
    data_records = paginated_df.where(paginated_df.notna(), None).to_dict('records')
    
    # Get column names
    columns = df.columns.tolist()
    
    return DataResponse(
        success=True,
        message=f"Retrieved {len(data_records)} rows out of {total_rows} total",
        session_id=session_id,
        total_rows=total_rows,
        returned_rows=len(data_records),
        data=data_records,
        columns=columns
    )
