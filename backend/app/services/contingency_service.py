"""
Service for contingency table (crosstab) calculations.

Provides pure data structure generation for categorical variable cross-tabulation.
"""

from typing import Dict, List, Tuple
import pandas as pd
import numpy as np

from app.schemas.stats import ContingencyCellData


class ContingencyService:
    """Service for calculating contingency tables (crosstabs)."""
    
    @staticmethod
    def calculate_segmented_contingency(
        df: pd.DataFrame,
        row_variable: str,
        col_variable: str,
        segment_by: str = None
    ) -> Tuple[Dict[str, Tuple], List[str]]:
        """
        Calculate contingency tables with optional segmentation.
        
        Args:
            df: Input DataFrame
            row_variable: Column name for row variable (categorical)
            col_variable: Column name for column variable (categorical)
            segment_by: Optional column name to segment results
            
        Returns:
            Tuple containing:
                - tables_dict: Dict[segment_name] -> tuple of table data
                - segments: List of segment names
                
        Raises:
            ValueError: If segment_by column doesn't exist or is invalid
        """
        # Case 1: No segmentation - return single 'General' table
        if segment_by is None or segment_by == '':
            table_data = ContingencyService.calculate_contingency_table(
                df=df,
                row_variable=row_variable,
                col_variable=col_variable
            )
            return {'General': table_data}, ['General']
        
        # Case 2: Segmentation requested
        # Validate segment_by column exists
        if segment_by not in df.columns:
            raise ValueError(f"Segment variable '{segment_by}' not found in dataset")
        
        # Get unique segment values (sorted, excluding nulls)
        segment_values = sorted(df[segment_by].dropna().unique().astype(str).tolist())
        
        if len(segment_values) == 0:
            raise ValueError(f"Segment variable '{segment_by}' has no valid values")
        
        # Calculate table for each segment
        tables_dict = {}
        for segment_value in segment_values:
            # Filter dataframe for this segment
            df_segment = df[df[segment_by] == segment_value].copy()
            
            # Skip if segment has no data
            if len(df_segment) == 0:
                continue
            
            # Calculate contingency table for this segment
            try:
                table_data = ContingencyService.calculate_contingency_table(
                    df=df_segment,
                    row_variable=row_variable,
                    col_variable=col_variable
                )
                tables_dict[segment_value] = table_data
            except ValueError:
                # Skip segments where calculation fails (e.g., no valid data)
                continue
        
        if len(tables_dict) == 0:
            raise ValueError(f"No valid tables could be calculated for segmentation by '{segment_by}'")
        
        return tables_dict, segment_values
    
    @staticmethod
    def calculate_contingency_table(
        df: pd.DataFrame,
        row_variable: str,
        col_variable: str
    ) -> Tuple[
        Dict[str, Dict[str, ContingencyCellData]],
        Dict[str, ContingencyCellData],
        Dict[str, ContingencyCellData],
        List[str],
        List[str],
        int
    ]:
        """
        Calculate contingency table with counts and percentages.
        
        Args:
            df: Input DataFrame
            row_variable: Column name for row variable (categorical)
            col_variable: Column name for column variable (categorical)
            
        Returns:
            Tuple containing:
                - cells: Dict[row_cat][col_cat] -> ContingencyCellData
                - row_totals: Dict[row_cat] -> ContingencyCellData
                - col_totals: Dict[col_cat] -> ContingencyCellData
                - row_categories: List of row category names
                - col_categories: List of column category names
                - grand_total: Total count
                
        Raises:
            ValueError: If variables don't exist or aren't categorical
        """
        # Validate variables exist
        if row_variable not in df.columns:
            raise ValueError(f"Row variable '{row_variable}' not found in dataset")
        if col_variable not in df.columns:
            raise ValueError(f"Column variable '{col_variable}' not found in dataset")
        
        # Remove rows with nulls in either variable
        df_clean = df[[row_variable, col_variable]].dropna()
        
        if len(df_clean) == 0:
            raise ValueError("No valid data after removing null values")
        
        # Convert to string to ensure categorical treatment
        df_clean[row_variable] = df_clean[row_variable].astype(str)
        df_clean[col_variable] = df_clean[col_variable].astype(str)
        
        # Create crosstab with absolute frequencies
        crosstab = pd.crosstab(
            df_clean[row_variable],
            df_clean[col_variable],
            margins=False
        )
        
        # Get categories (sorted for consistency)
        row_categories = sorted(crosstab.index.tolist())
        col_categories = sorted(crosstab.columns.tolist())
        
        # Calculate grand total
        grand_total = int(crosstab.sum().sum())
        
        # Calculate row and column totals
        row_sums = crosstab.sum(axis=1)
        col_sums = crosstab.sum(axis=0)
        
        # Initialize result structures
        cells: Dict[str, Dict[str, ContingencyCellData]] = {}
        row_totals: Dict[str, ContingencyCellData] = {}
        col_totals: Dict[str, ContingencyCellData] = {}
        
        # Calculate cell data
        for row_cat in row_categories:
            cells[row_cat] = {}
            
            for col_cat in col_categories:
                # Get count
                count = int(crosstab.loc[row_cat, col_cat])
                
                # Calculate percentages
                row_total = row_sums[row_cat]
                col_total = col_sums[col_cat]
                
                row_percent = round((count / row_total * 100), 2) if row_total > 0 else 0.0
                col_percent = round((count / col_total * 100), 2) if col_total > 0 else 0.0
                total_percent = round((count / grand_total * 100), 2) if grand_total > 0 else 0.0
                
                # Create cell data
                cells[row_cat][col_cat] = ContingencyCellData(
                    count=count,
                    row_percent=row_percent,
                    col_percent=col_percent,
                    total_percent=total_percent
                )
        
        # Calculate row totals
        for row_cat in row_categories:
            row_total = int(row_sums[row_cat])
            
            row_totals[row_cat] = ContingencyCellData(
                count=row_total,
                row_percent=100.0,  # Always 100% of its own row
                col_percent=round((row_total / grand_total * 100), 2),
                total_percent=round((row_total / grand_total * 100), 2)
            )
        
        # Calculate column totals
        for col_cat in col_categories:
            col_total = int(col_sums[col_cat])
            
            col_totals[col_cat] = ContingencyCellData(
                count=col_total,
                row_percent=round((col_total / grand_total * 100), 2),
                col_percent=100.0,  # Always 100% of its own column
                total_percent=round((col_total / grand_total * 100), 2)
            )
        
        return (
            cells,
            row_totals,
            col_totals,
            row_categories,
            col_categories,
            grand_total
        )
    
    @staticmethod
    def validate_categorical_variable(df: pd.DataFrame, variable: str, max_categories: int = 50) -> None:
        """
        Validate that a variable is suitable for contingency table analysis.
        
        Args:
            df: Input DataFrame
            variable: Variable name to validate
            max_categories: Maximum allowed unique categories
            
        Raises:
            ValueError: If variable is not suitable
        """
        if variable not in df.columns:
            raise ValueError(f"Variable '{variable}' not found in dataset")
        
        # Check if variable has too many unique values
        unique_count = df[variable].nunique()
        
        if unique_count > max_categories:
            raise ValueError(
                f"Variable '{variable}' has {unique_count} unique values. "
                f"Maximum allowed is {max_categories}. "
                f"Consider using a different variable or grouping categories."
            )
        
        if unique_count < 2:
            raise ValueError(
                f"Variable '{variable}' has only {unique_count} unique value(s). "
                f"At least 2 categories are required."
            )
