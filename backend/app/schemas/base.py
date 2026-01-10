"""
Base Pydantic schemas for consistent API responses.
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class BaseResponse(BaseModel):
    """Base response model with common fields."""
    
    success: bool = Field(default=True, description="Whether the operation was successful")
    message: Optional[str] = Field(default=None, description="Optional message or status update")


class ErrorResponse(BaseModel):
    """Standard error response format."""
    
    error: str = Field(..., description="Error type or class name")
    message: str = Field(..., description="Human-readable error message")
    path: str = Field(..., description="Request path that caused the error")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "SessionNotFoundException",
                "message": "Session 'abc-123' not found or expired",
                "path": "/api/v1/stats/descriptive"
            }
        }
