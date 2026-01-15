"""
Upload endpoints: Handle dataset file uploads with multi-sheet Excel support.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, status

from app.services.upload_service import UploadService
from app.internal.data_manager import data_manager
from app.schemas.upload import (
    UploadResponseReady,
    UploadResponseSelectionRequired,
    SheetPreview,
    DatasetMetadata,
    SheetSelectionRequest,
    SheetSelectionResponse
)
from app.core.errors import FileProcessingError, SessionNotFoundException
from app.core.config import settings

router = APIRouter()


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload a dataset file (CSV or Excel).
    
    Handles two scenarios:
    1. CSV or single-sheet Excel: Returns "ready" status with session_id
    2. Multi-sheet Excel: Returns "selection_required" status with sheet previews
    
    Args:
        file: Uploaded file (CSV, XLSX, or XLS format)
        
    Returns:
        UploadResponseReady or UploadResponseSelectionRequired
        
    Raises:
        HTTPException 400: If file format is invalid or parsing fails
        HTTPException 413: If file exceeds size limit
    """
    # Validate file extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
    
    file_extension = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if f".{file_extension}" not in settings.allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File format '.{file_extension}' not supported. Allowed: {', '.join(settings.allowed_extensions)}"
        )
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read file: {str(e)}"
        )
    
    # Check file size
    file_size_mb = len(content) / (1024 * 1024)
    if file_size_mb > settings.max_upload_size_mb:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({file_size_mb:.2f} MB) exceeds limit of {settings.max_upload_size_mb} MB"
        )
    
    # Process file
    try:
        is_multi_sheet, result = UploadService.process_file(content, file.filename)
    except FileProcessingError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    except Exception as e:
        # Catch any unexpected errors (e.g., missing libraries, corrupted files)
        error_msg = str(e)
        
        # Provide helpful messages for common errors
        if "xlrd" in error_msg.lower():
            detail = "Missing xlrd library for .xls files. Please contact support."
        elif "openpyxl" in error_msg.lower():
            detail = "Missing openpyxl library for .xlsx files. Please contact support."
        elif "no module named" in error_msg.lower():
            detail = f"Server configuration error: {error_msg}"
        else:
            detail = f"Unexpected error processing file: {error_msg}"
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )
    
    # SCENARIO 1: Single DataFrame (CSV or single-sheet Excel)
    if not is_multi_sheet:
        df = result
        UploadService.validate_dataframe(df, file.filename)
        
        # Create session
        session_id = data_manager.create_session(df, file.filename)
        
        # Prepare metadata
        metadata = DatasetMetadata(
            rows=df.shape[0],
            columns=df.shape[1],
            column_names=df.columns.tolist(),
            dtypes={col: str(dtype) for col, dtype in df.dtypes.items()},
            missing_values={col: int(df[col].isna().sum()) for col in df.columns}
        )
        
        return UploadResponseReady(
            success=True,
            message=f"File '{file.filename}' uploaded successfully",
            status="ready",
            session_id=session_id,
            filename=file.filename,
            metadata=metadata
        )
    
    # SCENARIO 2: Multi-sheet Excel
    else:
        sheets_dict = result
        
        # Generate previews for all sheets
        sheet_previews = []
        scores = {}
        
        for sheet_name, df in sheets_dict.items():
            preview = UploadService.get_sheet_preview(df, sheet_name, rows=5)
            sheet_previews.append(preview)
            scores[sheet_name] = preview["score"]
        
        # Determine suggested sheet (highest score)
        if scores:
            suggested_sheet = max(scores, key=scores.get)
            for preview in sheet_previews:
                if preview["sheet_name"] == suggested_sheet:
                    preview["is_suggested"] = True
                    break
        
        # Store temporarily
        temp_id = data_manager.create_temp_storage(sheets_dict, file.filename)
        
        return UploadResponseSelectionRequired(
            success=True,
            message=f"File '{file.filename}' has {len(sheets_dict)} sheets. Please select sheets to import.",
            status="selection_required",
            temp_id=temp_id,
            filename=file.filename,
            total_sheets=len(sheets_dict),
            sheets=[SheetPreview(**preview) for preview in sheet_previews]
        )


@router.post("/upload/select-sheets", response_model=SheetSelectionResponse)
async def select_sheets(request: SheetSelectionRequest) -> SheetSelectionResponse:
    """
    Process selected sheets from a multi-sheet Excel file.
    
    Retrieves sheets from temporary storage, optionally merges them,
    and creates a final session.
    
    Args:
        request: SheetSelectionRequest with temp_id and selected_sheets
        
    Returns:
        SheetSelectionResponse with final session_id and metadata
        
    Raises:
        HTTPException 404: If temp_id not found or expired
        HTTPException 400: If selected sheets are invalid or merge fails
    """
    # Retrieve temporary storage
    try:
        temp_data = data_manager.get_temp_storage(request.temp_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=f"Temporary upload session not found or expired. Please upload again."
        )
    
    sheets_dict = temp_data["sheets"]
    filename = temp_data["filename"]
    
    # Validate selected sheets exist
    for sheet_name in request.selected_sheets:
        if sheet_name not in sheets_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sheet '{sheet_name}' not found in file. Available sheets: {list(sheets_dict.keys())}"
            )
    
    if len(request.selected_sheets) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one sheet must be selected"
        )
    
    # Get selected DataFrames
    selected_dfs = [sheets_dict[name] for name in request.selected_sheets]
    
    # Merge or use single
    try:
        if request.merge and len(selected_dfs) > 1:
            final_df = UploadService.merge_sheets(selected_dfs, request.selected_sheets)
            merged = True
        else:
            final_df = selected_dfs[0]  # Use first selected
            merged = False
    except FileProcessingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    
    # Validate final DataFrame
    try:
        UploadService.validate_dataframe(final_df, filename)
    except FileProcessingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    
    # Create final session
    session_id = data_manager.create_session(final_df, filename)
    
    # Clean up temporary storage
    data_manager.delete_temp_storage(request.temp_id)
    
    # Prepare metadata
    metadata = DatasetMetadata(
        rows=final_df.shape[0],
        columns=final_df.shape[1],
        column_names=final_df.columns.tolist(),
        dtypes={col: str(dtype) for col, dtype in final_df.dtypes.items()},
        missing_values={col: int(final_df[col].isna().sum()) for col in final_df.columns}
    )
    
    return SheetSelectionResponse(
        success=True,
        message=f"Selected sheets processed successfully",
        status="ready",
        session_id=session_id,
        filename=filename,
        selected_sheets=request.selected_sheets,
        merged=merged,
        metadata=metadata
    )
