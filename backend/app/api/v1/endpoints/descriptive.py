"""
Descriptive statistics endpoint.
Retrieves DataFrame from session and calculates comprehensive descriptive statistics
using the core.py statistical engine.
"""

from fastapi import APIRouter, HTTPException, status
from typing import List, Optional

from app.schemas.stats import (
    DescriptiveStatsRequest,
    DescriptiveStatsResponse,
    SummaryStatsRequest,
    SummaryStatsResponse,
    FrequencyRequest,
    FrequencyResponse,
    ContingencyTableRequest,
    ContingencyTableResponse,
    CorrelationRequest,
    CorrelationResponse,
)
from app.services.descriptive_service import (
    DescriptiveService, 
    calculate_summary_stats, 
    generate_summary_insights,
    calculate_frequency_stats
)
from app.services.contingency_service import ContingencyService
from app.services.contingency_service import ContingencyService
from app.internal.data_manager import data_manager
from app.core.errors import (
    SessionNotFoundException,
    InvalidColumnError,
    NonNumericColumnError
)

router = APIRouter()


@router.post("/descriptive", response_model=DescriptiveStatsResponse)
async def calculate_descriptive_stats(request: DescriptiveStatsRequest) -> DescriptiveStatsResponse:
    """
    Calculate comprehensive descriptive statistics for specified columns.
    
    **Features:**
    - **Univariate Analysis**: Detailed statistics for each variable
      - Central tendency: mean, median
      - Dispersion: std, variance, IQR, SEM, CV
      - Range: min, max, quartiles, percentiles
      - Shape: skewness, kurtosis
      - Confidence intervals (95%)
      - Normality tests (Shapiro-Wilk, Kolmogorov-Smirnov, Anderson-Darling)
      - Outlier detection (IQR, Z-Score, MAD methods)
    
    - **Group Comparison (Table 1)**: When `group_by` is provided
      - Automatic test selection (T-Student/Mann-Whitney for 2 groups, ANOVA/Kruskal for >2)
      - P-values with significance indicators
      - Formatted statistics (Mean ± SD, Median [IQR])
    
    Args:
        request: DescriptiveStatsRequest containing:
            - session_id: Dataset session identifier
            - columns: Optional list of specific columns (default: all numeric)
            - group_by: Optional grouping variable for Table 1
            - include_normality: Include normality tests (default: True)
            - include_outliers: Include outlier detection (default: True)
            - include_ci: Include confidence intervals (default: True)
        
    Returns:
        DescriptiveStatsResponse with:
            - statistics: Dict of ColumnStatistics for each variable
            - analyzed_columns: List of analyzed column names
            - table1_data: List of Table1Row (if group_by provided)
            - group_variable: Name of grouping variable
            - groups: List of unique group names
        
    Raises:
        HTTPException 404: If session not found or expired
        HTTPException 400: If columns are invalid or non-numeric
        HTTPException 500: If calculation fails
    """
    # 1. Retrieve DataFrame from session
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    
    # 2. Validate group_by column if provided
    if request.group_by and request.group_by not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Group column '{request.group_by}' not found in dataset"
        )
    
    # 3. Calculate statistics using refactored service
    try:
        statistics, table1_data = DescriptiveService.calculate_descriptive_stats(
            df=df,
            columns=request.columns,
            group_by=request.group_by,
            include_normality=request.include_normality,
            include_outliers=request.include_outliers,
            include_ci=request.include_ci
        )
    except InvalidColumnError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    except NonNumericColumnError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating statistics: {str(e)}"
        )
    
    # 4. Determine analyzed columns
    analyzed_columns = list(statistics.keys())
    
    # 5. Extract group information (if applicable)
    groups: Optional[List[str]] = None
    if request.group_by and request.group_by in df.columns:
        try:
            groups = sorted(df[request.group_by].dropna().unique().astype(str).tolist())
        except Exception:
            groups = None
    
    # 6. Build response message
    message_parts = [f"Statistics calculated for {len(analyzed_columns)} variable(s)"]
    if request.group_by:
        message_parts.append(f"with group comparison by '{request.group_by}'")
    if request.include_normality:
        message_parts.append("including normality tests")
    if request.include_outliers:
        message_parts.append("and outlier detection")
    
    message = " ".join(message_parts)
    
    # 7. Return comprehensive response
    return DescriptiveStatsResponse(
        success=True,
        message=message,
        session_id=request.session_id,
        statistics=statistics,
        analyzed_columns=analyzed_columns,
        table1_data=table1_data,
        group_variable=request.group_by,
        groups=groups
    )


@router.post("/summary", response_model=SummaryStatsResponse)
async def calculate_summary(request: SummaryStatsRequest) -> SummaryStatsResponse:
    """Calculate summary statistics table for the given variables."""
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )

    try:
        rows = calculate_summary_stats(df=df, variables=request.variables)
    except InvalidColumnError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating summary statistics: {str(e)}",
        )

    analyzed_variables = [r.get("variable") for r in rows if r.get("variable") is not None]
    
    # Generar insights automáticos
    total_rows = len(df)
    insights = generate_summary_insights(rows, total_rows)

    return SummaryStatsResponse(
        success=True,
        message=f"Summary statistics calculated for {len(analyzed_variables)} variable(s)",
        session_id=request.session_id,
        data=rows,
        analyzed_variables=analyzed_variables,
        insights=insights,
    )


@router.post("/frequency", response_model=FrequencyResponse)
async def calculate_frequency(request: FrequencyRequest) -> FrequencyResponse:
    """Calculate frequency tables for categorical variables, optionally segmented."""
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )

    try:
        result = calculate_frequency_stats(
            df=df, 
            variables=request.variables,
            segment_by=request.segment_by
        )
    except InvalidColumnError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating frequency statistics: {str(e)}",
        )

    num_vars = len(request.variables)
    num_segments = len(result["segments"])
    
    return FrequencyResponse(
        success=True,
        message=f"Frequency tables calculated for {num_vars} variable(s) across {num_segments} segment(s)",
        session_id=request.session_id,
        segments=result["segments"],
        tables=result["tables"],
        segment_by=request.segment_by,
    )


@router.post("/contingency", response_model=ContingencyTableResponse)
async def calculate_contingency_table(request: ContingencyTableRequest) -> ContingencyTableResponse:
    """
    Calculate contingency table (crosstab) for two categorical variables.
    
    **Features:**
    - **Absolute Frequencies**: Count (N) for each cell intersection
    - **Row Percentages**: Percentage relative to row total
    - **Column Percentages**: Percentage relative to column total
    - **Total Percentages**: Percentage relative to grand total
    - **Marginal Totals**: Row and column totals with percentages
    
    **Use Cases:**
    - Cross-tabulation of two categorical variables
    - Gender vs Treatment Group
    - Disease Status vs Age Group
    - Education Level vs Occupation
    
    Args:
        request: ContingencyTableRequest containing:
            - session_id: Dataset session identifier
            - row_variable: Categorical variable for rows
            - col_variable: Categorical variable for columns
    
    Returns:
        ContingencyTableResponse with:
            - cells: Dict[row_cat][col_cat] -> CellData with 4 metrics
            - row_totals: Marginal totals for each row
            - col_totals: Marginal totals for each column
            - row_categories: List of row category names
            - col_categories: List of column category names
            - grand_total: Total N
    
    Raises:
        HTTPException 404: If session not found or expired
        HTTPException 400: If variables are invalid, don't exist, or have too many categories
        HTTPException 500: If calculation fails
    """
    # 1. Retrieve DataFrame from session
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    
    # 2. Validate variables are suitable for contingency analysis
    try:
        ContingencyService.validate_categorical_variable(df, request.row_variable)
        ContingencyService.validate_categorical_variable(df, request.col_variable)
        
        # Validate segment_by if provided
        if request.segment_by:
            ContingencyService.validate_categorical_variable(df, request.segment_by)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # 3. Calculate segmented contingency tables
    try:
        tables_dict, segments = ContingencyService.calculate_segmented_contingency(
            df=df,
            row_variable=request.row_variable,
            col_variable=request.col_variable,
            segment_by=request.segment_by
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating contingency table: {str(e)}"
        )
    
    # 4. Build ContingencyTableResult objects from raw tuples
    from app.schemas.stats import ContingencyTableResult
    
    tables = {}
    for segment_name, table_data in tables_dict.items():
        (cells, row_totals, col_totals, row_categories, col_categories, grand_total) = table_data
        
        tables[segment_name] = ContingencyTableResult(
            row_variable=request.row_variable,
            col_variable=request.col_variable,
            row_categories=row_categories,
            col_categories=col_categories,
            cells=cells,
            row_totals=row_totals,
            col_totals=col_totals,
            grand_total=grand_total
        )
    
    # 5. Get first table for backward compatibility (legacy fields)
    first_segment = segments[0]
    first_table = tables[first_segment]
    
    # 6. Build success message
    if request.segment_by:
        message = (
            f"Contingency tables calculated: {request.row_variable} vs {request.col_variable}, "
            f"segmented by {request.segment_by} ({len(segments)} segments)"
        )
    else:
        message = (
            f"Contingency table calculated: {request.row_variable} ({len(first_table.row_categories)} categories) "
            f"vs {request.col_variable} ({len(first_table.col_categories)} categories), "
            f"N = {first_table.grand_total}"
        )
    
    # 7. Return comprehensive response with segmentation support
    return ContingencyTableResponse(
        success=True,
        message=message,
        session_id=request.session_id,
        # New segmentation fields
        segments=segments,
        tables=tables,
        segment_by=request.segment_by,
        # Legacy fields (for backward compatibility - use first table data)
        row_variable=first_table.row_variable,
        col_variable=first_table.col_variable,
        row_categories=first_table.row_categories,
        col_categories=first_table.col_categories,
        cells=first_table.cells,
        row_totals=first_table.row_totals,
        col_totals=first_table.col_totals,
        grand_total=first_table.grand_total
    )


@router.post("/correlations", response_model=CorrelationResponse)
async def calculate_correlations_endpoint(request: CorrelationRequest) -> CorrelationResponse:
    """
    Calculate correlation matrices for numeric variables with multiple methods.
    
    **Features:**
    - **Multiple Methods**: Pearson (linear), Spearman (monotonic), Kendall (rank)
    - **Pairwise Complete Observations**: Uses only valid pairs for each correlation
    - **Significance Testing**: Automatic p-value calculation for hypothesis testing
    - **Segmentation**: Optional grouping by categorical variable
    
    **Correlation Methods:**
    - **Pearson**: Measures linear correlation. Assumes normality and homoscedasticity.
      Best for: Continuous variables with linear relationships.
    - **Spearman**: Measures monotonic correlation using ranks. Non-parametric.
      Best for: Ordinal data or non-normally distributed continuous variables.
    - **Kendall**: Measures concordance between rankings. More robust for small samples.
      Best for: Small sample sizes or data with many tied ranks.
    
    **Interpretation:**
    - |r| = 1.0: Perfect correlation
    - |r| >= 0.7: Strong correlation
    - 0.4 <= |r| < 0.7: Moderate correlation
    - 0.2 <= |r| < 0.4: Weak correlation
    - |r| < 0.2: Very weak or no correlation
    - Positive r: Variables move together
    - Negative r: Variables move inversely
    
    **P-value Significance:**
    - p < 0.001: *** (highly significant)
    - p < 0.01: ** (very significant)
    - p < 0.05: * (significant)
    - p >= 0.05: Not significant
    
    Args:
        request: CorrelationRequest containing:
            - session_id: Dataset session identifier
            - columns: List of numeric variables (minimum 2)
            - methods: List of correlation methods to apply
            - group_by: Optional categorical variable for segmentation
    
    Returns:
        CorrelationResponse with:
            - tables: Nested dict {segment: {method: CorrelationMatrixResult}}
            - segments: List of segment names
            - analyzed_columns: Variables included in analysis
    
    Raises:
        HTTPException 404: If session not found or expired
        HTTPException 400: If columns invalid, non-numeric, or insufficient data
        HTTPException 500: If calculation fails
    
    Examples:
        ```python
        # Request for Pearson correlation between Age, BMI, and Glucose
        {
            "session_id": "abc123",
            "columns": ["age", "bmi", "glucose"],
            "methods": ["pearson"],
            "group_by": null
        }
        
        # Request for all methods segmented by gender
        {
            "session_id": "abc123",
            "columns": ["age", "bmi"],
            "methods": ["pearson", "spearman", "kendall"],
            "group_by": "gender"
        }
        ```
    """
    # 1. Retrieve DataFrame from session
    try:
        df = data_manager.get_dataframe(request.session_id)
    except SessionNotFoundException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message
        )
    
    # 2. Validate columns exist
    missing_cols = [col for col in request.columns if col not in df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Columns not found in dataset: {', '.join(missing_cols)}"
        )
    
    # 3. Validate group_by if provided
    segments = ["General"]
    if request.group_by:
        if request.group_by not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Group column '{request.group_by}' not found in dataset"
            )
        try:
            group_segments = sorted(df[request.group_by].dropna().unique().astype(str).tolist())
            if len(group_segments) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Group column '{request.group_by}' has no valid values"
                )
            segments = ["General", *group_segments]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error processing group column: {str(e)}"
            )
    
    # 4. Calculate correlations using core function
    try:
        from app.internal.stats.core import calculate_correlations
        
        # Convert FilterRule objects to dicts for core function
        filters_dict = [
            {"column": f.column, "operator": f.operator, "value": f.value}
            for f in request.filters
        ] if request.filters else []
        
        result = calculate_correlations(
            df=df,
            columns=request.columns,
            methods=request.methods,
            group_by=request.group_by,
            filters=filters_dict,
            filter_logic=request.filter_logic
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating correlations: {str(e)}"
        )
    
    # 5. Convert raw result to Pydantic models
    from app.schemas.stats import CorrelationMatrixResult, CorrelationPairData
    
    tables = {}
    for segment in segments:
        tables[segment] = {}
        for method in request.methods:
            matrix_data = result[method][segment]
            
            # Convert nested lists to CorrelationPairData dict structure
            matrix_dict = {}
            for i, var1 in enumerate(matrix_data["variables"]):
                matrix_dict[var1] = {}
                for j, var2 in enumerate(matrix_data["variables"]):
                    r_val = matrix_data["matrix"][i][j]
                    p_val = matrix_data["p_values"][i][j]
                    n_val = matrix_data["sample_sizes"][i][j]
                    
                    matrix_dict[var1][var2] = CorrelationPairData(
                        r=r_val,
                        p_value=p_val,
                        n=n_val,
                        is_significant=(p_val is not None and p_val < 0.05)
                    )
            
            tables[segment][method] = CorrelationMatrixResult(
                method=method,
                variables=matrix_data["variables"],
                matrix=matrix_dict
            )
    
    # 6. Build success message
    if request.group_by:
        message = (
            f"Correlation matrices calculated: {len(request.columns)} variables, "
            f"{len(request.methods)} method(s), segmented by {request.group_by} ({len(segments)} segments)"
        )
    else:
        message = (
            f"Correlation matrices calculated: {len(request.columns)} variables "
            f"using {len(request.methods)} method(s)"
        )
    
    # 7. Return comprehensive response
    return CorrelationResponse(
        success=True,
        message=message,
        session_id=request.session_id,
        segments=segments,
        tables=tables,
        segment_by=request.group_by,
        analyzed_columns=request.columns
    )
