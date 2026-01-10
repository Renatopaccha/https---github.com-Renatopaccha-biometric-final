"""
Pydantic schemas for data retrieval operations.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, validator

from app.schemas.base import BaseResponse


class DataRequest(BaseModel):
    """Request model for data retrieval with pagination."""
    
    session_id: str = Field(..., description="Session ID of the uploaded dataset")
    skip: int = Field(default=0, ge=0, description="Number of rows to skip (for pagination)")
    limit: int = Field(default=100, le=1000, description="Maximum number of rows to return")
    
    @validator('session_id')
    def validate_session_id(cls, v: str) -> str:
        """Ensure session_id is not empty."""
        if not v or not v.strip():
            raise ValueError("session_id cannot be empty")
        return v.strip()
    
    @validator('limit')
    def validate_limit(cls, v: int) -> int:
        """Ensure limit is reasonable."""
        if v <= 0:
            raise ValueError("limit must be greater than 0")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "skip": 0,
                "limit": 100
            }
        }


class DataResponse(BaseResponse):
    """Response model for data retrieval."""
    
    session_id: str = Field(..., description="Session ID of the dataset")
    total_rows: int = Field(..., description="Total number of rows in the dataset")
    returned_rows: int = Field(..., description="Number of rows returned in this response")
    data: List[Dict[str, Any]] = Field(..., description="Data rows as list of dictionaries")
    columns: List[str] = Field(..., description="Column names in the dataset")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Data retrieved successfully",
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "total_rows": 1000,
                "returned_rows": 100,
                "columns": ["id", "name", "age", "score"],
                "data": [
                    {"id": 1, "name": "John", "age": 25, "score": 85.5},
                    {"id": 2, "name": "Jane", "age": 30, "score": 92.0}
                ]
            }
        }
