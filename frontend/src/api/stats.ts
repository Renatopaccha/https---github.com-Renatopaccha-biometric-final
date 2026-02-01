/**
 * API Service for Descriptive Statistics
 * Handles all HTTP requests to /api/v1/stats endpoints
 */

import type {
    DescriptiveStatsRequest,
    DescriptiveStatsResponse,
    SummaryStatsResponse,
    FrequencyResponse,
    ContingencyTableRequest,
    ContingencyTableResponse,
    SmartTableRequest,
    SmartTableResponse,
} from '../types/stats';

// Backend base URL - adjust according to your environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fetch descriptive statistics for a dataset
 * 
 * @param request - Request parameters including session_id, columns, group_by, etc.
 * @returns Promise with comprehensive statistical analysis
 * @throws Error if request fails
 */
export async function fetchDescriptiveStats(
    request: DescriptiveStatsRequest
): Promise<DescriptiveStatsResponse> {
    // ✅ CORRECCIÓN: Ruta correcta según el backend
    // Router prefix: /stats
    // Endpoint: /descriptive
    // Full path: /api/v1/stats/descriptive
    const response = await fetch(`${API_BASE_URL}/api/v1/stats/descriptive`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            detail: 'Unknown error occurred',
        }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data: DescriptiveStatsResponse = await response.json();
    return data;
}

/**
 * Convenience function for univariate analysis (no grouping)
 * 
 * @param sessionId - Dataset session identifier
 * @param columns - Optional array of column names to analyze
 * @param options - Optional flags for normality, outliers, CI
 */
export async function fetchUnivariateStats(
    sessionId: string,
    columns?: string[],
    options?: {
        includeNormality?: boolean;
        includeOutliers?: boolean;
        includeCi?: boolean;
    }
): Promise<DescriptiveStatsResponse> {
    return fetchDescriptiveStats({
        session_id: sessionId,
        columns,
        include_normality: options?.includeNormality ?? true,
        include_outliers: options?.includeOutliers ?? true,
        include_ci: options?.includeCi ?? true,
    });
}

export async function getSummaryStats(
    sessionId: string,
    variables: string[]
): Promise<SummaryStatsResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/stats/summary`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            variables,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            detail: 'Unknown error occurred',
        }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data: SummaryStatsResponse = await response.json();
    return data;
}

/**
 * Convenience function for Table 1 generation (with grouping)
 * 
 * @param sessionId - Dataset session identifier
 * @param groupBy - Column name to group by
 * @param columns - Optional array of column names to include
 */
export async function fetchTable1Stats(
    sessionId: string,
    groupBy: string,
    columns?: string[]
): Promise<DescriptiveStatsResponse> {
    return fetchDescriptiveStats({
        session_id: sessionId,
        columns,
        group_by: groupBy,
        include_normality: true,
        include_outliers: true,
        include_ci: true,
    });
}

/**
 * Fetch frequency tables for categorical variables
 * 
 * @param sessionId - Dataset session identifier
 * @param variables - Array of categorical variable names to analyze
 * @returns Promise with frequency tables
 */
export async function getFrequencyStats(
    sessionId: string,
    variables: string[],
    segmentBy?: string
): Promise<FrequencyResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/stats/frequency`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            variables,
            segment_by: segmentBy || null,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            detail: 'Unknown error occurred',
        }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data: FrequencyResponse = await response.json();
    return data;
}

/**
 * Fetch contingency table (crosstab) for two categorical variables
 * 
 * @param sessionId - Dataset session identifier
 * @param rowVariable - Variable for table rows
 * @param colVariable - Variable for table columns
 * @param segmentBy - Optional variable to segment results by
 * @returns Promise with contingency table(s) including counts and percentages
 */
export async function getCrosstabStats(
    sessionId: string,
    rowVariable: string,
    colVariable: string,
    segmentBy?: string
): Promise<ContingencyTableResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/stats/contingency`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            row_variable: rowVariable,
            col_variable: colVariable,
            segment_by: segmentBy || null,
        } as ContingencyTableRequest),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            detail: 'Unknown error occurred',
        }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data: ContingencyTableResponse = await response.json();
    return data;
}


/**
 * Fetch Smart Table statistics with nested 4-category structure
 * 
 * @param sessionId - Dataset session identifier  
 * @param columns - Optional array of numeric column names to analyze
 * @returns Promise with SmartTableResponse containing nested statistics
 * 
 * Categories returned:
 * - central_tendency: mean, median, mode, trimmed_mean_5
 * - dispersion: std_dev, variance, range, iqr, cv, sem
 * - percentiles: q1, q3, p5, p95, deciles
 * - shape: skewness, kurtosis, normality_test, normality_p_value, test_used
 */
export async function getSmartTableStats(
    sessionId: string,
    columns?: string[],
    customPercentiles?: number[]
): Promise<SmartTableResponse> {
    const requestBody: SmartTableRequest = {
        session_id: sessionId,
        columns: columns ?? null,
        custom_percentiles: customPercentiles,
    };

    const response = await fetch(`${API_BASE_URL}/api/v1/stats/smart-table`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            detail: 'Unknown error occurred',
        }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data: SmartTableResponse = await response.json();
    return data;
}
