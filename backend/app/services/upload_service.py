"""
UploadService: Handles file upload processing and validation.
Supports CSV and Excel formats with intelligent multi-sheet detection.
"""

import io
from pathlib import Path
from typing import Dict, List, Tuple
import pandas as pd

from app.core.errors import FileProcessingError


class UploadService:
    """Service class for processing uploaded dataset files with multi-sheet Excel support."""
    
    @staticmethod
    def process_file(file_content: bytes, filename: str) -> Tuple[bool, any]:
        """
        Process uploaded file and determine if it's single or multi-sheet.
        
        Args:
            file_content: Raw bytes of the uploaded file
            filename: Original filename with extension
            
        Returns:
            Tuple[bool, DataFrame or Dict]: 
                - (False, DataFrame) for single files (CSV or single-sheet Excel)
                - (True, Dict[str, DataFrame]) for multi-sheet Excel
            
        Raises:
            FileProcessingError: If file format is unsupported or parsing fails
        """
        file_extension = Path(filename).suffix.lower()
        
        try:
            if file_extension == ".csv":
                df = UploadService._process_csv(file_content, filename)
                return (False, df)  # Single DataFrame
            elif file_extension in [".xlsx", ".xls"]:
                return UploadService._process_excel(file_content, filename)
            else:
                raise FileProcessingError(
                    filename,
                    f"Unsupported file format '{file_extension}'. Supported formats: .csv, .xlsx, .xls"
                )
        except FileProcessingError:
            raise
        except Exception as e:
            raise FileProcessingError(filename, f"Unexpected error during parsing: {str(e)}")
    
    @staticmethod
    def _process_csv(file_content: bytes, filename: str) -> pd.DataFrame:
        """
        Parse CSV file content.
        
        Args:
            file_content: Raw CSV bytes
            filename: Filename for error messages
            
        Returns:
            pd.DataFrame: Parsed DataFrame
            
        Raises:
            FileProcessingError: If CSV parsing fails
        """
        try:
            # Try different encodings
            for encoding in ["utf-8", "latin-1", "iso-8859-1"]:
                try:
                    df = pd.read_csv(io.BytesIO(file_content), encoding=encoding)
                    return df
                except UnicodeDecodeError:
                    continue
            
            # If all encodings fail
            raise FileProcessingError(filename, "Unable to decode CSV with standard encodings")
            
        except pd.errors.EmptyDataError:
            raise FileProcessingError(filename, "CSV file is empty")
        except pd.errors.ParserError as e:
            raise FileProcessingError(filename, f"CSV parsing error: {str(e)}")
        except Exception as e:
            raise FileProcessingError(filename, f"CSV processing error: {str(e)}")
    
    @staticmethod
    def _process_excel(file_content: bytes, filename: str) -> Tuple[bool, any]:
        """
        Parse Excel file content and handle multi-sheet detection.
        
        Selects the appropriate engine based on file extension:
        - .xls (Excel 97-2003): Uses xlrd engine
        - .xlsx/.xlsm (Excel 2007+): Uses openpyxl engine
        
        Args:
            file_content: Raw Excel bytes
            filename: Filename for error messages and engine selection
            
        Returns:
            Tuple[bool, DataFrame or Dict]:
                - (False, DataFrame) for single-sheet Excel
                - (True, Dict[str, DataFrame]) for multi-sheet Excel
            
        Raises:
            FileProcessingError: If Excel parsing fails
        """
        try:
            # Determine engine based on file extension BEFORE attempting to read
            file_extension = filename.lower()
            
            if file_extension.endswith('.xls'):
                # Old Excel format (97-2003) - requires xlrd
                engine = 'xlrd'
            elif file_extension.endswith(('.xlsx', '.xlsm')):
                # Modern Excel format - uses openpyxl
                engine = 'openpyxl'
            else:
                # Shouldn't reach here due to validation, but default to openpyxl
                engine = 'openpyxl'
            
            # Read ALL sheets at once with the correct engine
            sheets_dict = pd.read_excel(
                io.BytesIO(file_content), 
                sheet_name=None, 
                engine=engine
            )
            
            # Filter out empty sheets
            non_empty_sheets = {
                name: df for name, df in sheets_dict.items()
                if not df.empty and df.shape[0] > 0
            }
            
            if len(non_empty_sheets) == 0:
                raise FileProcessingError(filename, "Excel file has no data (all sheets are empty)")
            
            if len(non_empty_sheets) == 1:
                # Single sheet - return directly
                single_df = list(non_empty_sheets.values())[0]
                return (False, single_df)
            else:
                # Multiple sheets - return dictionary
                return (True, non_empty_sheets)
                
        except FileProcessingError:
            # Re-raise our own errors
            raise
        except Exception as e:
            # Catch any pandas/engine errors and wrap them
            raise FileProcessingError(
                filename, 
                f"Excel parsing error (engine={engine}): {str(e)}"
            )

    
    @staticmethod
    def calculate_sheet_score(df: pd.DataFrame) -> float:
        """
        Calculate heuristic score for a sheet to determine "best" sheet.
        
        Score is based on:
        - Data volume (rows * columns)
        - Data quality (inversely proportional to null percentage)
        
        Args:
            df: DataFrame to score
            
        Returns:
            float: Heuristic score (higher is better)
        """
        rows, cols = df.shape
        total_cells = rows * cols
        
        if total_cells == 0:
            return 0.0
        
        # Count null values
        null_count = df.isna().sum().sum()
        null_percentage = null_count / total_cells
        
        # Data quality factor (between 0.5 and 1.0)
        # Even sheets with 100% nulls get some base score
        quality_factor = 1.0 - (null_percentage * 0.5)
        
        # Final score
        score = total_cells * quality_factor
        
        return float(score)
    
    @staticmethod
    def get_sheet_preview(df: pd.DataFrame, sheet_name: str, rows: int = 5) -> Dict:
        """
        Generate preview data for a sheet.
        
        Args:
            df: DataFrame to preview
            sheet_name: Name of the sheet
            rows: Number of rows to include in preview
            
        Returns:
            Dict: Preview information with metadata
        """
        preview_df = df.head(rows)
        
        # Convert preview to list of records
        preview_data = preview_df.where(preview_df.notna(), None).to_dict('records')
        
        # Calculate metrics
        null_count = int(df.isna().sum().sum())
        score = UploadService.calculate_sheet_score(df)
        
        return {
            "sheet_name": sheet_name,
            "rows": int(df.shape[0]),
            "columns": int(df.shape[1]),
            "column_names": df.columns.tolist(),
            "preview_data": preview_data,
            "missing_count": null_count,
            "score": score,
            "is_suggested": False  # Will be set by caller
        }
    
    @staticmethod
    def validate_dataframe(df: pd.DataFrame, filename: str) -> None:
        """
        Validate that the DataFrame meets basic requirements.
        
        Args:
            df: DataFrame to validate
            filename: Filename for error messages
            
        Raises:
            FileProcessingError: If validation fails
        """
        if df.empty:
            raise FileProcessingError(filename, "Dataset is empty (no rows)")
        
        if df.shape[1] == 0:
            raise FileProcessingError(filename, "Dataset has no columns")
        
        # Check for duplicate column names
        if df.columns.duplicated().any():
            duplicates = df.columns[df.columns.duplicated()].tolist()
            raise FileProcessingError(
                filename,
                f"Duplicate column names found: {duplicates}. Please ensure all columns have unique names."
            )
    
    @staticmethod
    def merge_sheets(sheets: List[pd.DataFrame], sheet_names: List[str]) -> pd.DataFrame:
        """
        Merge multiple sheets vertically (concatenate).
        
        Args:
            sheets: List of DataFrames to merge
            sheet_names: Names of the sheets (for error messages)
            
        Returns:
            pd.DataFrame: Merged DataFrame
            
        Raises:
            FileProcessingError: If sheets have incompatible structures
        """
        if len(sheets) == 0:
            raise FileProcessingError("merge", "No sheets to merge")
        
        if len(sheets) == 1:
            return sheets[0]
        
        # Check column compatibility
        first_columns = set(sheets[0].columns)
        for i, df in enumerate(sheets[1:], 1):
            if set(df.columns) != first_columns:
                raise FileProcessingError(
                    f"sheets_{sheet_names[i]}",
                    f"Cannot merge: Sheet '{sheet_names[i]}' has different columns than '{sheet_names[0]}'"
                )
        
        # Concatenate vertically
        try:
            merged_df = pd.concat(sheets, ignore_index=True)
            return merged_df
        except Exception as e:
            raise FileProcessingError("merge", f"Error merging sheets: {str(e)}")
