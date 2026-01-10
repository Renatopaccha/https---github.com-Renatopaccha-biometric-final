"""
Pydantic schemas for file upload operations.
Supports both single-file and multi-sheet Excel scenarios.
"""

from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field

from app.schemas.base import BaseResponse


class DatasetMetadata(BaseModel):
    """Metadata about the uploaded dataset."""
    
    rows: int = Field(..., description="Number of rows in the dataset")
    columns: int = Field(..., description="Number of columns in the dataset")
    column_names: List[str] = Field(..., description="List of column names")
    dtypes: Dict[str, str] = Field(..., description="Data types for each column")
    missing_values: Dict[str, int] = Field(..., description="Count of missing values per column")


class SheetPreview(BaseModel):
    """Preview information for a single Excel sheet."""
    
    sheet_name: str = Field(..., description="Name of the sheet")
    rows: int = Field(..., description="Number of rows in this sheet")
    columns: int = Field(..., description="Number of columns in this sheet")
    column_names: List[str] = Field(..., description="Column names")
    preview_data: List[Dict[str, Any]] = Field(..., description="First 5 rows as preview")
    missing_count: int = Field(..., description="Total count of missing values")
    is_suggested: bool = Field(default=False, description="Whether this sheet is recommended")
    score: float = Field(..., description="Heuristic score (rows * columns * data_quality)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "sheet_name": "Sales_2024",
                "rows": 1500,
                "columns": 8,
                "column_names": ["date", "product", "amount", "customer"],
                "preview_data": [
                    {"date": "2024-01-01", "product": "Widget A", "amount": 150.00},
                    {"date": "2024-01-02", "product": "Widget B", "amount": 200.00}
                ],
                "missing_count": 12,
                "is_suggested": True,
                "score": 11850.5
            }
        }


class UploadResponseReady(BaseResponse):
    """Response when file is ready (CSV or single-sheet Excel)."""
    
    status: Literal["ready"] = Field(default="ready", description="Upload status")
    session_id: str = Field(..., description="Unique session identifier for the uploaded dataset")
    filename: str = Field(..., description="Original filename")
    metadata: DatasetMetadata = Field(..., description="Dataset metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "File uploaded successfully",
                "status": "ready",
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "filename": "sample_data.csv",
                "metadata": {
                    "rows": 100,
                    "columns": 5,
                    "column_names": ["age", "height", "weight", "gender", "score"],
                    "dtypes": {
                        "age": "int64",
                        "height": "float64",
                        "weight": "float64",
                        "gender": "object",
                        "score": "float64"
                    },
                    "missing_values": {
                        "age": 0,
                        "height": 2,
                        "weight": 1,
                        "gender": 0,
                        "score": 3
                    }
                }
            }
        }


class UploadResponseSelectionRequired(BaseResponse):
    """Response when multi-sheet Excel requires user selection."""
    
    status: Literal["selection_required"] = Field(
        default="selection_required",
        description="Upload status indicating sheet selection is needed"
    )
    temp_id: str = Field(..., description="Temporary ID for sheet selection process")
    filename: str = Field(..., description="Original filename")
    sheets: List[SheetPreview] = Field(..., description="List of available sheets with previews")
    total_sheets: int = Field(..., description="Total number of sheets in the file")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Multiple sheets detected. Please select sheets to import.",
                "status": "selection_required",
                "temp_id": "temp-550e8400-e29b-41d4-a716",
                "filename": "quarterly_report.xlsx",
                "total_sheets": 3,
                "sheets": [
                    {
                        "sheet_name": "Q1_Sales",
                        "rows": 1500,
                        "columns": 8,
                        "column_names": ["date", "product", "amount"],
                        "preview_data": [],
                        "missing_count": 12,
                        "is_suggested": True,
                        "score": 11850.5
                    }
                ]
            }
        }


# Union type for upload response
UploadResponse = Union[UploadResponseReady, UploadResponseSelectionRequired]


class SheetSelectionRequest(BaseModel):
    """Request to select and process specific sheets."""
    
    temp_id: str = Field(..., description="Temporary ID from initial upload")
    selected_sheets: List[str] = Field(..., description="List of sheet names to process")
    merge: bool = Field(default=False, description="Whether to concatenate selected sheets")
    
    class Config:
        json_schema_extra = {
            "example": {
                "temp_id": "temp-550e8400-e29b-41d4-a716",
                "selected_sheets": ["Q1_Sales", "Q2_Sales"],
                "merge": True
            }
        }


class SheetSelectionResponse(BaseResponse):
    """Response after sheet selection and processing."""
    
    status: Literal["ready"] = Field(default="ready", description="Status after selection")
    session_id: str = Field(..., description="Final session ID for the processed data")
    filename: str = Field(..., description="Original filename")
    selected_sheets: List[str] = Field(..., description="Sheets that were selected")
    merged: bool = Field(..., description="Whether sheets were merged")
    metadata: DatasetMetadata = Field(..., description="Final dataset metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Sheets processed successfully",
                "status": "ready",
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "filename": "quarterly_report.xlsx",
                "selected_sheets": ["Q1_Sales", "Q2_Sales"],
                "merged": True,
                "metadata": {
                    "rows": 3000,
                    "columns": 8,
                    "column_names": ["date", "product", "amount"],
                    "dtypes": {},
                    "missing_values": {}
                }
            }
        }
