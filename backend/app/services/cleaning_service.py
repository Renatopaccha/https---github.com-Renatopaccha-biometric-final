"""
CleaningService: Data cleaning and preprocessing operations.
Provides methods for handling missing values, duplicates, and data type conversions.
Includes intelligent quality diagnostics with outlier detection and health scoring.
"""

from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
import re

from app.core.errors import InvalidColumnError, BiometricException


class CleaningService:
    """
    Service class for data cleaning operations and quality diagnostics.
    All methods are static as this service is stateless.
    """
    
    @staticmethod
    def get_data_quality_report(df: pd.DataFrame) -> Dict:
        """
        Generate comprehensive dataset health report with intelligent diagnostics.
        
        Analyzes:
        - Global completeness score (weighted by data volume)
        - Outlier detection using IQR method for numeric columns
        - Type inconsistencies (mixed types in object columns)
        - Column-level quality metrics and suggestions
        
        Args:
            df: Input DataFrame
            
        Returns:
            Dict: Comprehensive health report with column-level diagnostics
        """
        total_rows = len(df)
        total_columns = len(df.columns)
        
        # Count duplicate rows and get indices
        # keep=False marks ALL duplicates as True, capturing all instances
        duplicates_mask = df.duplicated(keep=False)
        duplicate_rows = int(df.duplicated().sum()) # Standard count (excluding first occurrence usually, but wait)
        # If we use keep=False, we get indices of ALL rows involved in duplication. 
        # But 'duplicate_rows' typically means "how many rows can be removed".
        # df.duplicated() defaults to keep='first', so it counts redundant rows.
        # The indices list should probably enable highlighting ALL duplicates.
        duplicate_rows_indices = df[duplicates_mask].index.tolist()
        
        # Initialize counters
        total_anomalies = 0
        total_inconsistencies = 0
        total_valid_cells = 0
        total_cells = total_rows * total_columns
        
        # Column-level analysis
        columns_quality = {}
        
        for col in df.columns:
            col_quality = CleaningService._analyze_column_quality(df, col, total_rows)
            columns_quality[col] = col_quality
            
            # Aggregate metrics
            total_anomalies += col_quality["outlier_count"]
            total_inconsistencies += col_quality["inconsistency_count"]
            total_valid_cells += (total_rows - col_quality["missing_count"])
        
        # Calculate overall completeness
        overall_completeness = (total_valid_cells / total_cells * 100) if total_cells > 0 else 0.0
        
        return {
            "total_rows": total_rows,
            "total_columns": total_columns,
            "overall_completeness": round(overall_completeness, 2),
            "total_anomalies": total_anomalies,
            "total_inconsistencies": total_inconsistencies,
            "duplicate_rows": duplicate_rows,
            "duplicate_rows_indices": duplicate_rows_indices,
            "columns": columns_quality
        }
    
    @staticmethod
    def _analyze_column_quality(df: pd.DataFrame, column: str, total_rows: int) -> Dict:
        """
        Analyze quality metrics for a single column.
        
        Args:
            df: DataFrame
            column: Column name
            total_rows: Total rows in dataset
            
        Returns:
            Dict: Column quality metrics
        """
        col_data = df[column]
        data_type = str(col_data.dtype)
        
        # Basic metrics
        missing_count = int(col_data.isna().sum())
        non_null_data = col_data.dropna()
        unique_count = int(non_null_data.nunique())
        completeness = ((total_rows - missing_count) / total_rows * 100) if total_rows > 0 else 0.0
        
        # Initialize
        min_value = None
        max_value = None
        outlier_count = 0
        outlier_bounds = None
        inconsistency_count = 0
        
        # Numeric analysis
        if pd.api.types.is_numeric_dtype(col_data):
            min_value = float(non_null_data.min()) if len(non_null_data) > 0 else None
            max_value = float(non_null_data.max()) if len(non_null_data) > 0 else None
            outlier_count, outlier_bounds = CleaningService._detect_outliers_iqr(non_null_data)
        
        # Object/String analysis - detect type inconsistencies
        elif data_type == 'object':
            inconsistency_count = CleaningService._detect_type_inconsistencies(non_null_data)
        
        # Determine status and suggestion
        status, suggestion = CleaningService._get_column_status_and_suggestion(
            completeness, missing_count, outlier_count, inconsistency_count, data_type
        )
        
        return {
            "column_name": column,
            "data_type": data_type,
            "completeness": round(completeness, 2),
            "missing_count": missing_count,
            "unique_count": unique_count,
            "min_value": min_value,
            "max_value": max_value,
            "outlier_count": outlier_count,
            "outlier_bounds": outlier_bounds,
            "inconsistency_count": inconsistency_count,
            "suggestion": suggestion,
            "status": status
        }
    
    @staticmethod
    def _detect_outliers_iqr(series: pd.Series) -> Tuple[int, Optional[Dict[str, float]]]:
        """
        Detect outliers using the IQR (Interquartile Range) method.
        
        Formula:
        - Q1 = 25th percentile
        - Q3 = 75th percentile
        - IQR = Q3 - Q1
        - Outliers: values < Q1 - 1.5*IQR or > Q3 + 1.5*IQR
        
        Args:
            series: Pandas Series (numeric, non-null)
            
        Returns:
            Tuple[int, Optional[Dict]]: (count, bounds_dict)
        """
        if len(series) < 4:  # Need at least 4 values for quartiles
            return 0, None
        
        try:
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            
            if IQR == 0:  # All values are the same
                return 0, None
            
            lower_bound = float(Q1 - 1.5 * IQR)
            upper_bound = float(Q3 + 1.5 * IQR)
            
            outliers = ((series < lower_bound) | (series > upper_bound)).sum()
            
            return int(outliers), {"lower": lower_bound, "upper": upper_bound}
            
        except Exception:
            return 0, None
    
    @staticmethod
    def _detect_type_inconsistencies(series: pd.Series) -> int:
        """
        Detect type inconsistencies in object/string columns.
        
        Checks if column contains mixed types:
        - Numbers mixed with text
        - Dates mixed with other strings
        
        Args:
            series: Pandas Series (object type, non-null)
            
        Returns:
            int: Number of inconsistent values
        """
        if len(series) == 0:
            return 0
        
        try:
            # Convert to string for analysis
            str_series = series.astype(str)
            
            # Pattern matching
            numeric_pattern = r'^-?\d+\.?\d*$'
            date_pattern = r'\d{4}[-/]\d{2}[-/]\d{2}'
            
            is_numeric = str_series.str.match(numeric_pattern, na=False)
            is_date = str_series.str.contains(date_pattern, na=False)
            is_text = ~(is_numeric | is_date)
            
            # Count types
            num_numeric = is_numeric.sum()
            num_date = is_date.sum()
            num_text = is_text.sum()
            
            # Inconsistency: if we have multiple types with significant presence
            types_present = sum([num_numeric > 0, num_date > 0, num_text > 0])
            
            if types_present > 1:
                # Count minority type as inconsistencies
                counts = [num_numeric, num_date, num_text]
                counts_nonzero = [c for c in counts if c > 0]
                if len(counts_nonzero) > 1:
                    return int(min(counts_nonzero))  # Minority type count
            
            return 0
            
        except Exception:
            return 0
    
    @staticmethod
    def _get_column_status_and_suggestion(
        completeness: float,
        missing_count: int,
        outlier_count: int,
        inconsistency_count: int,
        data_type: str
    ) -> Tuple[str, str]:
        """
        Determine column status and provide actionable suggestion.
        
        Args:
            completeness: Completeness percentage
            missing_count: Number of missing values
            outlier_count: Number of outliers
            inconsistency_count: Number of type inconsistencies
            data_type: Column data type
            
        Returns:
            Tuple[status, suggestion]
        """
        # Critical: Column is mostly empty
        if completeness < 50:
            return ("critical", f"Consider removing column (only {completeness:.1f}% complete)")
        
        # Warning: High missing rate
        if completeness < 70:
            return ("warning", f"Fill or drop {missing_count} missing values ({100-completeness:.1f}% missing)")
        
        # Info: Has inconsistencies
        if inconsistency_count > 0:
            if data_type == 'object':
                return ("info", f"Convert to numeric or clean {inconsistency_count} inconsistent values")
            
        # Info: Has outliers
        if outlier_count > 0:
            return ("info", f"Review or remove {outlier_count} outliers beyond IQR range")
        
        # Warning: Has some missing
        if missing_count > 0:
            return ("warning", f"Fill or drop {missing_count} missing values")
        
        # OK: No issues
        return ("ok", "No cleaning needed")
    
    @staticmethod
    def handle_missing_values(
        df: pd.DataFrame,
        column: str,
        method: str,
        fill_value: Optional[any] = None
    ) -> Tuple[pd.DataFrame, int, int]:
        """
        Handle missing values in a specific column.
        
        Args:
            df: Input DataFrame
            column: Column name to clean
            method: Method to use ('drop', 'mean', 'median', 'mode', 'ffill', 'bfill', 'constant', 'custom_value', 'date_interpolation')
            fill_value: Value to use for 'constant' or 'custom_value' methods (accepts str, int, float)
            
        Returns:
            Tuple[DataFrame, nulls_before, rows_affected]
            
        Raises:
            InvalidColumnError: If column doesn't exist
            BiometricException: If operation fails
        """
        # Validate column exists
        if column not in df.columns:
            raise InvalidColumnError(column, df.columns.tolist())
        
        # Count nulls before
        nulls_before = int(df[column].isna().sum())
        
        if nulls_before == 0:
            # No nulls to handle
            return df.copy(), 0, 0
        
        # Create a copy to avoid modifying original
        df_clean = df.copy()
        
        try:
            if method == "drop":
                # Drop rows with nulls in this column
                df_clean = df_clean.dropna(subset=[column])
                rows_affected = nulls_before
                
            elif method == "mean":
                # Fill with mean (numeric only)
                if not pd.api.types.is_numeric_dtype(df_clean[column]):
                    raise BiometricException(
                        f"Cannot use 'mean' on non-numeric column '{column}'",
                        400
                    )
                fill_val = df_clean[column].mean()
                df_clean[column].fillna(fill_val, inplace=True)
                rows_affected = nulls_before
                
            elif method == "median":
                # Fill with median (numeric only)
                if not pd.api.types.is_numeric_dtype(df_clean[column]):
                    raise BiometricException(
                        f"Cannot use 'median' on non-numeric column '{column}'",
                        400
                    )
                fill_val = df_clean[column].median()
                df_clean[column].fillna(fill_val, inplace=True)
                rows_affected = nulls_before
                
            elif method == "mode":
                # Fill with mode (most frequent value)
                mode_values = df_clean[column].mode()
                if len(mode_values) > 0:
                    df_clean[column].fillna(mode_values[0], inplace=True)
                    rows_affected = nulls_before
                else:
                    rows_affected = 0
                    
            elif method == "ffill":
                # Forward fill
                df_clean[column].fillna(method='ffill', inplace=True)
                rows_affected = nulls_before
                
            elif method == "bfill":
                # Backward fill
                df_clean[column].fillna(method='bfill', inplace=True)
                rows_affected = nulls_before
                
            elif method in ["constant", "custom_value"]:
                # Fill with constant/custom value (accepts str, int, float)
                if fill_value is None:
                    raise BiometricException(f"fill_value is required for method='{method}'", 400)
                
                # Type coercion based on column dtype
                try:
                    if pd.api.types.is_numeric_dtype(df_clean[column]):
                        # Convert to numeric
                        fill_val = pd.to_numeric(fill_value)
                    elif pd.api.types.is_datetime64_any_dtype(df_clean[column]):
                        # Convert to datetime
                        fill_val = pd.to_datetime(fill_value)
                    else:
                        # Keep as-is (string)
                        fill_val = fill_value
                    
                    df_clean[column].fillna(fill_val, inplace=True)
                    rows_affected = nulls_before
                except (ValueError, TypeError) as e:
                    raise BiometricException(
                        f"Cannot convert fill_value '{fill_value}' to column type {df_clean[column].dtype}: {str(e)}",
                        400
                    )
                
            elif method == "date_interpolation":
                # Interpolation for datetime columns
                if not pd.api.types.is_datetime64_any_dtype(df_clean[column]):
                    raise BiometricException(
                        f"Cannot use 'date_interpolation' on non-datetime column '{column}'",
                        400
                    )
                # Convert to numeric (timestamp), interpolate, convert back
                df_clean[column] = pd.to_datetime(
                    df_clean[column].astype('int64').interpolate(method='linear'),
                    unit='ns'
                )
                rows_affected = nulls_before
                
            else:
                raise BiometricException(f"Unknown method: {method}", 400)
            
            return df_clean, nulls_before, rows_affected
            
        except BiometricException:
            raise
        except Exception as e:
            raise BiometricException(f"Error handling missing values: {str(e)}", 500)
    
    @staticmethod
    def remove_duplicates(
        df: pd.DataFrame,
        subset: Optional[List[str]] = None,
        keep: str = "first"
    ) -> Tuple[pd.DataFrame, int]:
        """
        Remove duplicate rows from DataFrame.
        
        Args:
            df: Input DataFrame
            subset: Columns to consider for duplicates (None = all columns)
            keep: Which duplicates to keep ('first', 'last', or False for removing all)
            
        Returns:
            Tuple[DataFrame, duplicates_removed]
            
        Raises:
            InvalidColumnError: If subset columns don't exist
            BiometricException: If operation fails
        """
        # Validate subset columns if provided
        if subset is not None:
            for col in subset:
                if col not in df.columns:
                    raise InvalidColumnError(col, df.columns.tolist())
        
        rows_before = len(df)
        
        try:
            # Remove duplicates
            df_clean = df.drop_duplicates(subset=subset, keep=keep)
            rows_after = len(df_clean)
            duplicates_removed = rows_before - rows_after
            
            return df_clean, duplicates_removed
            
        except Exception as e:
            raise BiometricException(f"Error removing duplicates: {str(e)}", 500)
    
    @staticmethod
    def change_column_type(
        df: pd.DataFrame,
        column: str,
        new_type: str,
        errors: str = "coerce"
    ) -> Tuple[pd.DataFrame, str, int]:
        """
        Change the data type of a column.
        
        Args:
            df: Input DataFrame
            column: Column name
            new_type: Target type ('int', 'float', 'string', 'datetime', 'bool')
            errors: How to handle errors ('raise', 'coerce', 'ignore')
            
        Returns:
            Tuple[DataFrame, old_type, conversion_errors]
            
        Raises:
            InvalidColumnError: If column doesn't exist
            BiometricException: If conversion fails
        """
        # Validate column exists
        if column not in df.columns:
            raise InvalidColumnError(column, df.columns.tolist())
        
        old_type = str(df[column].dtype)
        df_clean = df.copy()
        conversion_errors = 0
        
        try:
            if new_type == "int":
                # Convert to integer
                if errors == "coerce":
                    df_clean[column] = pd.to_numeric(df_clean[column], errors='coerce')
                    conversion_errors = int(df_clean[column].isna().sum())
                    df_clean[column] = df_clean[column].astype('Int64')  # Nullable integer
                else:
                    df_clean[column] = df_clean[column].astype('int64')
                    
            elif new_type == "float":
                # Convert to float
                df_clean[column] = pd.to_numeric(df_clean[column], errors=errors)
                if errors == "coerce":
                    conversion_errors = int(df_clean[column].isna().sum())
                    
            elif new_type == "string":
                # Convert to string
                df_clean[column] = df_clean[column].astype(str)
                
            elif new_type == "datetime":
                # Convert to datetime
                df_clean[column] = pd.to_datetime(df_clean[column], errors=errors)
                if errors == "coerce":
                    conversion_errors = int(df_clean[column].isna().sum())
                    
            elif new_type == "bool":
                # Convert to boolean
                df_clean[column] = df_clean[column].astype(bool)
                
            else:
                raise BiometricException(f"Unknown type: {new_type}", 400)
            
            return df_clean, old_type, conversion_errors
            
        except BiometricException:
            raise
        except Exception as e:
            raise BiometricException(f"Error converting column type: {str(e)}", 500)
    

    @staticmethod
    def filter_columns(
        df: pd.DataFrame,
        columns_to_keep: List[str]
    ) -> Tuple[pd.DataFrame, List[str]]:
        """
        Keep only specified columns, removing all others.
        
        Args:
            df: Input DataFrame
            columns_to_keep: List of columns to keep
            
        Returns:
            Tuple[DataFrame, columns_removed]
            
        Raises:
            InvalidColumnError: If any column in columns_to_keep doesn't exist
            BiometricException: If trying to remove all columns
        """
        # Validate all columns exist
        for col in columns_to_keep:
            if col not in df.columns:
                raise InvalidColumnError(col, df.columns.tolist())
        
        if len(columns_to_keep) == 0:
            raise BiometricException("Must keep at least one column", 400)
        
        # Get columns that will be removed
        columns_removed = [col for col in df.columns if col not in columns_to_keep]
        
        # Filter DataFrame
        df_clean = df[columns_to_keep].copy()
        
        return df_clean, columns_removed

    @staticmethod
    def delete_rows(
        df: pd.DataFrame,
        row_indices: List[int]
    ) -> Tuple[pd.DataFrame, int]:
        """
        Delete specific rows by index.
        
        Args:
            df: Input DataFrame
            row_indices: List of row indices to delete
            
        Returns:
            Tuple[DataFrame, rows_deleted]
            
        Raises:
            BiometricException: If operation fails
        """
        rows_before = len(df)
        
        try:
            # Filter out indices that don't exist to avoid errors
            valid_indices = [idx for idx in row_indices if idx in df.index]
            
            if not valid_indices:
                return df.copy(), 0
                
            # Drop rows
            df_clean = df.drop(index=valid_indices)
            
            # Reset index to ensure sequential indexing (CRITICAL for pagination)
            df_clean = df_clean.reset_index(drop=True)
            
            rows_after = len(df_clean)
            rows_deleted = rows_before - rows_after
            
            return df_clean, rows_deleted
            
        except Exception as e:
            raise BiometricException(f"Error deleting rows: {str(e)}", 500)
    
    @staticmethod
    def simulate_null_handling(
        df: pd.DataFrame,
        column: str,
        method: str,
        fill_value: Optional[any] = None
    ) -> Dict:
        """
        Simulate null handling without modifying the original DataFrame.
        
        Provides a detailed impact report showing what would happen if the
        specified null handling method were applied.
        
        Args:
            df: Input DataFrame
            column: Column name to simulate cleaning
            method: Method to simulate
            fill_value: Value for constant/custom_value methods
            
        Returns:
            Dict containing:
                - rows_affected: Number of rows that would change
                - information_loss_percent: Data loss percentage (for drop method)
                - distribution_change: Statistical changes (for numeric columns)
                - sample_preview: List of before/after examples (max 5 rows)
                
        Raises:
            InvalidColumnError: If column doesn't exist
            BiometricException: If simulation fails
        """
        # Validate column exists
        if column not in df.columns:
            raise InvalidColumnError(column, df.columns.tolist())
        
        try:
            # Work on a copy to avoid mutations
            df_simulated = df.copy()
            
            # Count nulls before
            nulls_before = int(df_simulated[column].isna().sum())
            rows_before = len(df_simulated)
            
            if nulls_before == 0:
                return {
                    "rows_affected": 0,
                    "information_loss_percent": 0.0,
                    "distribution_change": None,
                    "sample_preview": []
                }
            
            # Get indices of null values for preview
            null_indices = df_simulated[df_simulated[column].isna()].index.tolist()
            sample_indices = null_indices[:5]  # Max 5 samples
            
            # Apply the method to simulation copy
            df_simulated, _, rows_affected = CleaningService.handle_missing_values(
                df_simulated, column, method, fill_value
            )
            
            # Calculate information loss (for drop method)
            rows_after = len(df_simulated)
            rows_removed = rows_before - rows_after
            information_loss_percent = (rows_removed / rows_before * 100) if rows_before > 0 else 0.0
            
            # Calculate distribution change (numeric columns only)
            distribution_change = None
            if pd.api.types.is_numeric_dtype(df[column]):
                try:
                    col_before = df[column].dropna()
                    col_after = df_simulated[column].dropna()
                    
                    if len(col_before) > 0 and len(col_after) > 0:
                        distribution_change = {
                            "mean_before": float(col_before.mean()),
                            "mean_after": float(col_after.mean()),
                            "std_before": float(col_before.std()),
                            "std_after": float(col_after.std())
                        }
                except Exception:
                    # If stats calculation fails, skip it
                    pass
            
            # Generate sample preview (Before vs After)
            sample_preview = []
            for idx in sample_indices:
                if idx in df.index:
                    value_before = df.loc[idx, column]
                    
                    # For drop method, row might not exist in simulated df
                    if idx in df_simulated.index:
                        value_after = df_simulated.loc[idx, column]
                    else:
                        value_after = "[ROW DROPPED]"
                    
                    sample_preview.append({
                        "row_index": int(idx),
                        "value_before": None if pd.isna(value_before) else value_before,
                        "value_after": None if pd.isna(value_after) else value_after
                    })
            
            return {
                "rows_affected": rows_affected,
                "information_loss_percent": round(information_loss_percent, 2),
                "distribution_change": distribution_change,
                "sample_preview": sample_preview
            }
            
        except BiometricException:
            raise
        except Exception as e:
            raise BiometricException(f"Error simulating null handling: {str(e)}", 500)
    
    # ===== MISSING VALUES STUDIO METHODS =====
    
    @staticmethod
    def simulate_missing_actions(
        df: pd.DataFrame,
        actions: List[Dict],
        skip: int = 0,
        limit: int = 15
    ) -> Tuple[Dict, List[Dict], List[str], int]:
        """
        Simulate missing value actions without persisting changes.
        
        Args:
            df: Input DataFrame
            actions: List of action dictionaries
            skip: Rows to skip for preview
            limit: Rows to return for preview
            
        Returns:
            Tuple of (impact_metrics, preview_data, preview_columns, total_rows)
        """
        try:
            # Create working copy
            df_simulated = df.copy()
            
            # Track changes
            rows_before = len(df)
            missing_before = {col: int(df[col].isna().sum()) for col in df.columns}
            filled_counts = {}
            marked_intentional = {}
            
            # Apply each action
            for action in actions:
                action_type = action.get("type")
                columns = action.get("columns", [])
                method = action.get("method")
                fill_value = action.get("fill_value")
                
                if action_type == "impute":
                    for col in columns:
                        if col not in df_simulated.columns:
                            continue
                        
                        before_null = df_simulated[col].isna().sum()
                        df_simulated = CleaningService._apply_imputation(
                            df_simulated, col, method, fill_value
                        )
                        after_null = df_simulated[col].isna().sum()
                        filled_counts[col] = int(before_null - after_null)
                
                elif action_type == "drop_rows":
                    # Drop rows with NA in any of the specified columns
                    mask = df_simulated[columns].isna().any(axis=1)
                    df_simulated = df_simulated[~mask].reset_index(drop=True)
                
                elif action_type == "mark_intentional":
                    # Track which rows are marked as intentional (don't modify data)
                    for col in columns:
                        if col in df_simulated.columns:
                            na_indices = df_simulated[df_simulated[col].isna()].index.tolist()
                            marked_intentional[col] = len(na_indices)
            
            rows_after = len(df_simulated)
            rows_removed = rows_before - rows_after
            row_loss_pct = (rows_removed / rows_before * 100) if rows_before > 0 else 0.0
            
            # Calculate affected variables (columns losing non-NA data in removed rows)
            affected_variables = CleaningService._calculate_affected_variables(
                df, df_simulated
            )
            
            # Missing counts after actions
            missing_after = {col: int(df_simulated[col].isna().sum()) for col in df_simulated.columns}
            
            # Build impact metrics
            impact = {
                "rows_before": rows_before,
                "rows_after": rows_after,
                "rows_removed": rows_removed,
                "row_loss_pct": round(row_loss_pct, 2),
                "affected_variables": affected_variables,
                "filled_counts": filled_counts,
                "missing_before": missing_before,
                "missing_after": missing_after,
                "marked_intentional": marked_intentional
            }
            
            # Generate preview
            preview_df = df_simulated.iloc[skip:skip+limit]
            preview_data = preview_df.replace({np.nan: None}).to_dict(orient="records")
            preview_columns = df_simulated.columns.tolist()
            
            return impact, preview_data, preview_columns, rows_after
            
        except Exception as e:
            raise BiometricException(f"Error simulating missing actions: {str(e)}", 500)
    
    @staticmethod
    def apply_missing_actions(df: pd.DataFrame, actions: List[Dict]) -> Tuple[pd.DataFrame, Dict]:
        """
        Apply missing value actions and return modified DataFrame with impact metrics.
        
        Args:
            df: Input DataFrame
            actions: List of action dictionaries
            
        Returns:
            Tuple of (modified_df, impact_metrics)
        """
        try:
            df_result = df.copy()
            
            rows_before = len(df)
            missing_before = {col: int(df[col].isna().sum()) for col in df.columns}
            filled_counts = {}
            marked_intentional = {}
            
            # Apply each action
            for action in actions:
                action_type = action.get("type")
                columns = action.get("columns", [])
                method = action.get("method")
                fill_value = action.get("fill_value")
                
                if action_type == "impute":
                    for col in columns:
                        if col not in df_result.columns:
                            continue
                        
                        before_null = df_result[col].isna().sum()
                        df_result = CleaningService._apply_imputation(
                            df_result, col, method, fill_value
                        )
                        after_null = df_result[col].isna().sum()
                        filled_counts[col] = int(before_null - after_null)
                
                elif action_type == "drop_rows":
                    mask = df_result[columns].isna().any(axis=1)
                    df_result = df_result[~mask].reset_index(drop=True)
                
                elif action_type == "mark_intentional":
                    # Metadata tracking only (handled by DataManager in endpoint)
                    for col in columns:
                        if col in df_result.columns:
                            na_indices = df_result[df_result[col].isna()].index.tolist()
                            marked_intentional[col] = len(na_indices)
            
            rows_after = len(df_result)
            rows_removed = rows_before - rows_after
            row_loss_pct = (rows_removed / rows_before * 100) if rows_before > 0 else 0.0
            
            affected_variables = CleaningService._calculate_affected_variables(df, df_result)
            
            missing_after = {col: int(df_result[col].isna().sum()) for col in df_result.columns}
            
            impact = {
                "rows_before": rows_before,
                "rows_after": rows_after,
                "rows_removed": rows_removed,
                "row_loss_pct": round(row_loss_pct, 2),
                "affected_variables": affected_variables,
                "filled_counts": filled_counts,
                "missing_before": missing_before,
                "missing_after": missing_after,
                "marked_intentional": marked_intentional
            }
            
            return df_result, impact
            
        except Exception as e:
            raise BiometricException(f"Error applying missing actions: {str(e)}", 500)
    
    @staticmethod
    def _apply_imputation(df: pd.DataFrame, column: str, method: str, fill_value=None) -> pd.DataFrame:
        """
        Apply imputation method to a column.
        
        Args:
            df: DataFrame
            column: Column name
            method: Imputation method
            fill_value: Value for constant method
            
        Returns:
            Modified DataFrame
        """
        col_data = df[column]
        dtype = col_data.dtype
        
        # Validate numeric methods
        if method in ["mean", "median"] and not pd.api.types.is_numeric_dtype(dtype):
            raise BiometricException(
                f"Method '{method}' requires numeric column, but '{column}' is {dtype}",
                422
            )
        
        if method == "mean":
            df[column] = col_data.fillna(col_data.mean())
        
        elif method == "median":
            df[column] = col_data.fillna(col_data.median())
        
        elif method == "mode":
            mode_vals = col_data.mode()
            if len(mode_vals) > 0:
                df[column] = col_data.fillna(mode_vals[0])
        
        elif method == "ffill":
            df[column] = col_data.fillna(method='ffill')
        
        elif method == "bfill":
            df[column] = col_data.fillna(method='bfill')
        
        elif method == "constant":
            if fill_value is None:
                raise BiometricException("fill_value is required for constant method", 422)
            df[column] = col_data.fillna(fill_value)
        
        return df
    
    @staticmethod
    def _calculate_affected_variables(df_before: pd.DataFrame, df_after: pd.DataFrame) -> int:
        """
        Calculate number of columns that lost non-NA values in removed rows.
        
        Args:
            df_before: Original DataFrame
            df_after: DataFrame after actions
            
        Returns:
            Count of affected columns
        """
        if len(df_before) == len(df_after):
            return 0
        
        # Find removed indices
        removed_indices = set(df_before.index) - set(df_after.index)
        
        if not removed_indices:
            return 0
        
        # Count columns with non-NA values in removed rows
        affected = 0
        for col in df_before.columns:
            non_na_in_removed = df_before.loc[list(removed_indices), col].notna().sum()
            if non_na_in_removed > 0:
                affected += 1
        
        return affected

    @staticmethod
    def detect_empty_rows(df: pd.DataFrame) -> Dict:
        """
        Detect rows with insufficient information (less than 2 non-null values).
        
        This is more practical than detecting only completely empty rows,
        as it catches rows with just one irrelevant value (e.g., only "Consent: No").
        
        Returns preview of empty/insufficient rows for user audit before deletion.
        
        Args:
            df: Input DataFrame
            
        Returns:
            Dict with empty_row_indices, total_empty, and preview
        """
        # Count non-null values per row
        non_null_counts = df.notnull().sum(axis=1)
        
        # Identify rows with fewer than 2 real data points (0 or 1 values)
        empty_rows_mask = non_null_counts < 2
        empty_indices = df[empty_rows_mask].index.tolist()
        total_empty = len(empty_indices)
        
        # Create preview (show up to 10 empty/insufficient rows for user review)
        preview = []
        if total_empty > 0:
            preview_df = df.loc[empty_indices[:10]].copy()
            # Add row index for reference
            preview_df['__row_index__'] = preview_df.index
            # Add non-null count for transparency
            preview_df['__non_null_count__'] = non_null_counts.loc[empty_indices[:10]]
            preview = preview_df.to_dict('records')
        
        return {
            "empty_row_indices": empty_indices,
            "total_empty": total_empty,
            "preview": preview
        }


