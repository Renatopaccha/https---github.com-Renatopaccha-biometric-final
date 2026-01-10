"""
Pydantic schemas for data cleaning operations.
Defines request/response models for cleaning transformations and quality diagnostics.
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, validator

from app.schemas.base import BaseResponse


class OutlierBounds(BaseModel):
    """Lower and upper bounds for outlier detection using IQR."""
    lower: float = Field(..., description="Lower bound (Q1 - 1.5*IQR)")
    upper: float = Field(..., description="Upper bound (Q3 + 1.5*IQR)")


class ColumnQuality(BaseModel):
    """Detailed quality metrics for a single column."""
    
    column_name: str = Field(..., description="Column name")
    data_type: str = Field(..., description="Data type")
    completeness: float = Field(..., description="Completeness percentage (0-100)")
    missing_count: int = Field(..., description="Number of missing values")
    unique_count: int = Field(..., description="Number of unique values")
    min_value: Optional[float] = Field(None, description="Minimum value (numeric columns)")
    max_value: Optional[float] = Field(None, description="Maximum value (numeric columns)")
    outlier_count: int = Field(..., description="Number of outliers detected (IQR method)")
    outlier_bounds: Optional[OutlierBounds] = Field(None, description="IQR bounds for visualization")
    inconsistency_count: int = Field(..., description="Number of type inconsistencies")
    suggestion: str = Field(..., description="Recommended action")
    status: Literal["ok", "info", "warning", "critical"] = Field(
        ..., 
        description="Column health status"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "column_name": "height",
                "data_type": "float64",
                "completeness": 97.5,
                "missing_count": 25,
                "unique_count": 856,
                "min_value": 1.45,
                "max_value": 2.15,
                "outlier_count": 12,
                "outlier_bounds": {"lower": 1.50, "upper": 2.10},
                "inconsistency_count": 0,
                "suggestion": "Remove 12 outliers beyond IQR range",
                "status": "info"
            }
        }


class DatasetHealthReport(BaseModel):
    """Comprehensive health report for the entire dataset."""
    
    total_rows: int = Field(..., description="Total number of rows")
    total_columns: int = Field(..., description="Total number of columns")
    overall_completeness: float = Field(
        ..., 
        description="Global completeness score (0-100%)"
    )
    total_anomalies: int = Field(..., description="Total outliers across all columns")
    total_inconsistencies: int = Field(..., description="Total type inconsistencies")
    duplicate_rows: int = Field(..., description="Number of duplicate rows")
    duplicate_rows_indices: List[int] = Field(
        default=[], 
        description="Indices of duplicate rows for visualization"
    )
    columns: Dict[str, ColumnQuality] = Field(
        ..., 
        description="Quality metrics per column"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_rows": 1000,
                "total_columns": 8,
                "overall_completeness": 94.2,
                "total_anomalies": 47,
                "total_inconsistencies": 3,
                "duplicate_rows": 15,
                "columns": {
                    "height": {
                        "column_name": "height",
                        "data_type": "float64",
                        "completeness": 97.5,
                        "missing_count": 25,
                        "unique_count": 856,
                        "min_value": 1.45,
                        "max_value": 2.15,
                        "outlier_count": 12,
                        "inconsistency_count": 0,
                        "suggestion": "Remove 12 outliers beyond IQR range",
                        "status": "info"
                    }
                }
            }
        }


class QualityReportResponse(BaseResponse):
    """Response with comprehensive dataset health report."""
    
    session_id: str = Field(..., description="Session ID")
    report: DatasetHealthReport = Field(..., description="Dataset health report")



class NullHandlingRequest(BaseModel):
    """Request to handle missing values in a column."""
    
    session_id: str = Field(..., description="Session ID")
    column: str = Field(..., description="Column name to clean")
    method: Literal["drop", "mean", "median", "mode", "ffill", "bfill", "constant", "custom_value", "date_interpolation"] = Field(
        ..., 
        description="Method to handle nulls"
    )
    fill_value: Optional[str | float | int] = Field(
        None, 
        description="Value to fill (required for method='constant' or 'custom_value')"
    )
    
    @validator('fill_value')
    def validate_fill_value(cls, v, values):
        """Ensure fill_value is provided when method requires it."""
        method = values.get('method')
        if method in ['constant', 'custom_value'] and v is None:
            raise ValueError(f"fill_value is required when method='{method}'")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "column": "height",
                "method": "mean"
            }
        }


class NullHandlingResponse(BaseResponse):
    """Response after handling missing values."""
    
    session_id: str = Field(..., description="Session ID")
    column: str = Field(..., description="Column that was cleaned")
    method: str = Field(..., description="Method used")
    nulls_before: int = Field(..., description="Number of nulls before cleaning")
    nulls_after: int = Field(..., description="Number of nulls after cleaning")
    rows_affected: int = Field(..., description="Number of rows affected")


class DuplicateRemovalRequest(BaseModel):
    """Request to remove duplicate rows."""
    
    session_id: str = Field(..., description="Session ID")
    subset: Optional[List[str]] = Field(
        None,
        description="Columns to consider for identifying duplicates. If None, all columns are used."
    )
    keep: Literal["first", "last", False] = Field(
        default="first",
        description="Which duplicates to keep: 'first', 'last', or False (remove all)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "subset": ["patient_id", "date"],
                "keep": "first"
            }
        }


class DuplicateRemovalResponse(BaseResponse):
    """Response after removing duplicates."""
    
    session_id: str = Field(..., description="Session ID")
    duplicates_removed: int = Field(..., description="Number of duplicate rows removed")
    rows_before: int = Field(..., description="Total rows before removal")
    rows_after: int = Field(..., description="Total rows after removal")


class ColumnTypeChangeRequest(BaseModel):
    """Request to change column data type."""
    
    session_id: str = Field(..., description="Session ID")
    column: str = Field(..., description="Column name")
    new_type: Literal["int", "float", "string", "datetime", "bool"] = Field(
        ...,
        description="Target data type"
    )
    errors: Literal["raise", "coerce", "ignore"] = Field(
        default="coerce",
        description="How to handle conversion errors"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "column": "age",
                "new_type": "int",
                "errors": "coerce"
            }
        }


class ColumnTypeChangeResponse(BaseResponse):
    """Response after changing column type."""
    
    session_id: str = Field(..., description="Session ID")
    column: str = Field(..., description="Column that was modified")
    old_type: str = Field(..., description="Original data type")
    new_type: str = Field(..., description="New data type")
    conversion_errors: int = Field(..., description="Number of values that couldn't be converted")


class ColumnFilterRequest(BaseModel):
    """Request to filter (select/remove) columns."""
    
    session_id: str = Field(..., description="Session ID")
    columns_to_keep: List[str] = Field(..., description="Columns to keep in the dataset")
    
    @validator('columns_to_keep')
    def validate_not_empty(cls, v):
        """Ensure at least one column is kept."""
        if len(v) == 0:
            raise ValueError("Must keep at least one column")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "columns_to_keep": ["patient_id", "age", "gender", "diagnosis"]
            }
        }


class ColumnFilterResponse(BaseResponse):
    """Response after filtering columns."""
    
    session_id: str = Field(..., description="Session ID")
    columns_removed: List[str] = Field(..., description="Columns that were removed")
    columns_kept: List[str] = Field(..., description="Columns that remain")
    columns_before: int = Field(..., description="Number of columns before")
    columns_after: int = Field(..., description="Number of columns after")


class RowDeletionRequest(BaseModel):
    """Request to delete specific rows by index."""
    
    session_id: str = Field(..., description="Session ID")
    row_indices: List[int] = Field(..., description="List of row indices to delete")
    
    @validator('row_indices')
    def validate_indices(cls, v):
        """Ensure at least one index is provided."""
        if len(v) == 0:
            raise ValueError("Must provide at least one row index to delete")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "row_indices": [0, 5, 12]
            }
        }


class RowDeletionResponse(BaseResponse):
    """Response after deleting rows."""
    
    session_id: str = Field(..., description="Session ID")
    rows_deleted: int = Field(..., description="Number of rows deleted")
    rows_remaining: int = Field(..., description="Number of rows remaining in dataset")


# ==================== NULL HANDLING SIMULATION ====================

class SimulationRequest(BaseModel):
    """Request to simulate null handling without applying changes."""
    
    session_id: str = Field(..., description="Session ID")
    column: str = Field(..., description="Column name to simulate cleaning")
    method: Literal["drop", "mean", "median", "mode", "ffill", "bfill", "constant", "custom_value", "date_interpolation"] = Field(
        ...,
        description="Method to simulate"
    )
    fill_value: Optional[str | float | int] = Field(
        None,
        description="Value to use for 'constant' or 'custom_value' methods"
    )
    
    @validator('fill_value')
    def validate_fill_value_for_custom(cls, v, values):
        """Ensure fill_value is provided when method requires it."""
        method = values.get('method')
        if method in ['constant', 'custom_value'] and v is None:
            raise ValueError(f"fill_value is required when method='{method}'")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "column": "height",
                "method": "mean"
            }
        }


class DistributionChange(BaseModel):
    """Statistical distribution changes for numeric columns."""
    
    mean_before: Optional[float] = Field(None, description="Mean before imputation")
    mean_after: Optional[float] = Field(None, description="Mean after imputation")
    std_before: Optional[float] = Field(None, description="Standard deviation before")
    std_after: Optional[float] = Field(None, description="Standard deviation after")


class SamplePreview(BaseModel):
    """Before/After preview of a single row."""
    
    row_index: int = Field(..., description="Row index in original DataFrame")
    value_before: Any = Field(..., description="Value before transformation (None if null)")
    value_after: Any = Field(..., description="Value after transformation")


class SimulationResponse(BaseResponse):
    """Response from null handling simulation."""
    
    session_id: str = Field(..., description="Session ID")
    column: str = Field(..., description="Column being simulated")
    method: str = Field(..., description="Method being simulated")
    rows_affected: int = Field(..., description="Number of rows that would be affected")
    information_loss_percent: float = Field(
        ...,
        description="Percentage of data loss (relevant for drop method)"
    )
    distribution_change: Optional[DistributionChange] = Field(
        None,
        description="Statistical changes for numeric columns"
    )
    sample_preview: List[SamplePreview] = Field(
        ...,
        description="Sample of before/after transformations (max 5 rows)"
    )
    message: str = Field(..., description="Human-readable result summary")


# ==================== MISSING VALUES STUDIO ====================

class MissingActionType(str):
    """Types of actions for handling missing values."""
    IMPUTE = "impute"
    DROP_ROWS = "drop_rows"
    MARK_INTENTIONAL = "mark_intentional"


class MissingAction(BaseModel):
    """Configuration for a single missing value action."""
    
    type: Literal["impute", "drop_rows", "mark_intentional"] = Field(
        ..., 
        description="Type of action to perform"
    )
    columns: List[str] = Field(..., description="Target columns for this action")
    method: Optional[Literal["mean", "median", "mode", "ffill", "bfill", "constant"]] = Field(
        None,
        description="Imputation method (required for type='impute')"
    )
    fill_value: Optional[str | float] = Field(
        None,
        description="Value to fill (required for method='constant')"
    )
    
    @validator('columns')
    def validate_columns_not_empty(cls, v):
        """Ensure at least one column is specified."""
        if len(v) == 0:
            raise ValueError("Must specify at least one column")
        return v
    
    @validator('method')
    def validate_method_for_impute(cls, v, values):
        """Ensure method is provided for impute actions."""
        if values.get('type') == 'impute' and v is None:
            raise ValueError("Method is required for impute actions")
        return v
    
    @validator('fill_value')
    def validate_fill_value_for_constant(cls, v, values):
        """Ensure fill_value is provided for constant method."""
        if values.get('method') == 'constant' and v is None:
            raise ValueError("fill_value is required for method='constant'")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "type": "impute",
                "columns": ["height", "weight"],
                "method": "mean"
            }
        }


class PreviewParams(BaseModel):
    """Parameters for preview sample."""
    skip: int = Field(default=0, ge=0, description="Number of rows to skip")
    limit: int = Field(default=15, ge=1, le=100, description="Number of rows to return")


class ImpactMetrics(BaseModel):
    """Impact metrics from simulation."""
    
    rows_before: int = Field(..., description="Total rows before actions")
    rows_after: int = Field(..., description="Total rows after actions")
    rows_removed: int = Field(..., description="Number of rows removed")
    row_loss_pct: float = Field(..., description="Percentage of rows lost")
    affected_variables: int = Field(
        ..., 
        description="Number of columns with non-NA values lost in removed rows"
    )
    filled_counts: Dict[str, int] = Field(
        default={},
        description="Number of values filled per column"
    )
    missing_before: Dict[str, int] = Field(
        default={},
        description="Missing counts before actions per column"
    )
    missing_after: Dict[str, int] = Field(
        default={},
        description="Missing counts after actions per column"
    )
    marked_intentional: Dict[str, int] = Field(
        default={},
        description="Number of values marked as intentional per column"
    )


class MissingSimulatorRequest(BaseModel):
    """Request to simulate missing value actions."""
    
    session_id: str = Field(..., description="Session ID")
    actions: List[MissingAction] = Field(..., description="List of actions to simulate")
    preview: PreviewParams = Field(
        default_factory=PreviewParams,
        description="Preview sample parameters"
    )
    
    @validator('actions')
    def validate_actions_not_empty(cls, v):
        """Ensure at least one action is provided."""
        if len(v) == 0:
            raise ValueError("Must provide at least one action")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "actions": [
                    {
                        "type": "impute",
                        "columns": ["height"],
                        "method": "mean"
                    },
                    {
                        "type": "drop_rows",
                        "columns": ["patient_id"]
                    }
                ],
                "preview": {
                    "skip": 0,
                    "limit": 15
                }
            }
        }


class MissingSimulatorResponse(BaseResponse):
    """Response from missing value simulation."""
    
    session_id: str = Field(..., description="Session ID")
    impact: ImpactMetrics = Field(..., description="Impact metrics from simulation")
    preview_data: List[Dict[str, Any]] = Field(..., description="Sample preview data")
    preview_columns: List[str] = Field(..., description="Column names in preview")
    preview_total_rows: int = Field(..., description="Total rows in simulated result")
    message: str = Field(..., description="Human-readable result summary")


class MissingApplyRequest(MissingSimulatorRequest):
    """Request to apply missing value actions (same as simulator request)."""
    pass


class MissingApplyResponse(BaseResponse):
    """Response after applying missing value actions."""
    
    session_id: str = Field(..., description="Session ID")
    version_id: int = Field(...,description="New version ID after applying")
    impact: ImpactMetrics = Field(..., description="Impact metrics from application")
    message: str = Field(..., description="Human-readable result summary")


class UndoRequest(BaseModel):
    """Request to undo last operation."""
    session_id: str = Field(..., description="Session ID")


class UndoResponse(BaseResponse):
    """Response after undo operation."""
    
    session_id: str = Field(..., description="Session ID")
    version_id: int = Field(..., description="Version ID after undo")
    message: str = Field(..., description="Human-readable result summary")


class HistoryItem(BaseModel):
    """Single history entry for a version."""
    
    version_id: int = Field(..., description="Version identifier")
    timestamp: str = Field(..., description="ISO timestamp when created")
    action_summary: str = Field(..., description="Description of actions applied")
    rows_before: int = Field(..., description="Rows before this version")
    rows_after: int = Field(..., description="Rows after this version")


class HistoryResponse(BaseResponse):
    """Response with version history."""
    
    session_id: str = Field(..., description="Session ID")
    current_version: int = Field(..., description="Current active version")
    history: List[HistoryItem] = Field(..., description="List of versions")


class IntentionalMissingResponse(BaseResponse):
    """Response with intentional missing metadata."""
    
    session_id: str = Field(..., description="Session ID")
    intentional_missing: Dict[str, List[int]] = Field(
        ...,
        description="Map of column names to row indices marked as intentional"
    )


class EmptyRowsResponse(BaseResponse):
    """Response for empty rows detection."""
    
    session_id: str = Field(..., description="Session ID")
    empty_row_indices: List[int] = Field(..., description="List of empty row indices")
    total_empty: int = Field(..., description="Total number of empty rows found")
    preview: List[Dict[str, Any]] = Field(..., description="Preview of empty rows for user review")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Found 5 empty rows",
                "session_id": "abc123",
                "empty_row_indices": [10, 25, 47, 89, 102],
                "total_empty": 5,
                "preview": [
                    {"index": 10, "col1": None, "col2": None},
                    {"index": 25, "col1": None, "col2": None}
                ]
            }
        }

