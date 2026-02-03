/**
 * TypeScript types for Descriptive Statistics API
 * Matches backend schemas from app/schemas/stats.py
 */

// =============================================================================
// SMART TABLE - Nested 4-Category Structure
// =============================================================================

/**
 * Central Tendency Statistics
 */
export interface CentralTendencyStats {
    mean: number | null;
    median: number | null;
    mode: number | number[] | null;
    trimmed_mean_5: number | null;
    sum: number | null;
    geometric_mean: number | null;
}

/**
 * Dispersion Statistics
 */
export interface DispersionStats {
    std_dev: number | null;
    variance: number | null;
    min: number | null;      // Minimum value
    max: number | null;      // Maximum value  
    range: number | null;    // Range (max - min) - "Recorrido" in UI
    iqr: number | null;
    cv: number | null;  // Coefficient of Variation (%)
    sem: number | null; // Standard Error of the Mean
}

/**
 * Percentile Statistics
 */
export interface PercentileStats {
    q1: number | null;
    q3: number | null;
    p5: number | null;
    p95: number | null;
    deciles: Record<string, number> | null;  // {"10": 28.8, "20": 32.4, ...}
}

/**
 * Shape Statistics (Distribution Form)
 */
export interface ShapeStats {
    skewness: number | null;
    kurtosis: number | null;
    normality_test: string;  // "Normal" | "No Normal" | "Indeterminado"
    normality_p_value: number | null;
    test_used: string | null;  // "Shapiro-Wilk" | "Kolmogorov-Smirnov"
}

/**
 * Complete column statistics in nested 4-category structure
 */
export interface SmartTableColumnStats {
    variable: string;
    n: number;
    missing: number;
    central_tendency: CentralTendencyStats;
    dispersion: DispersionStats;
    percentiles: PercentileStats;
    shape: ShapeStats;
    custom_percentiles_data?: Record<string, number>;
}

/**
 * Smart Table API Request
 */
export interface SmartTableRequest {
    session_id: string;
    columns?: string[] | null;
    custom_percentiles?: number[];
    group_by?: string | null;  // Column to segment results by
}

/**
 * Smart Table API Response
 */
export interface SmartTableResponse {
    success: boolean;
    message: string;
    session_id: string;
    analyzed_columns: string[];
    segments: string[];  // Array of segment names (e.g., ["General"] or ["General", "Male", "Female"])
    group_by: string | null;  // Column used for segmentation (null if no segmentation)
    statistics: Record<string, Record<string, SmartTableColumnStats>>;  // {variable: {segment: stats}}
}

// =============================================================================
// ADVANCED ANALYSIS TYPES
// =============================================================================

export interface NormalityTest {
    shapiro_statistic: number | null;
    shapiro_p_value: number | null;
    kolmogorov_statistic: number | null;
    kolmogorov_p_value: number | null;
    anderson_statistic: number | null;
    anderson_critical_values: number[] | null;
    conclusion: string; // "Normal" | "No Normal" | "Indeterminado"
    interpretation: string;
}

export interface OutlierAnalysis {
    iqr_outliers_count: number;
    iqr_outliers_indices: number[];
    zscore_outliers_count: number;
    zscore_outliers_indices: number[];
    mad_outliers_count: number;
    mad_outliers_indices: number[];
    iqr_lower_bound: number | null;
    iqr_upper_bound: number | null;
}

export interface ConfidenceInterval {
    lower: number;
    upper: number;
    confidence_level: number; // 0.95
}

// =============================================================================
// COLUMN STATISTICS
// =============================================================================

export interface ColumnStatistics {
    // Basic counts
    count: number;
    missing: number;

    // Central tendency and dispersion
    mean: number | null;
    median: number | null;
    std: number | null;
    variance: number | null;

    // Range
    min: number | null;
    max: number | null;

    // Quartiles
    q1: number | null;
    q3: number | null;
    iqr: number | null;

    // Shape
    skewness: number | null;
    kurtosis: number | null;

    // Advanced metrics
    sem: number | null;
    cv: number | null;
    range: number | null;
    ci_95: ConfidenceInterval | null;

    // New metrics (synced with backend)
    sum: number | null;
    geometric_mean: number | null;
    mode: number | number[] | null;  // Can be single value or multimodal array

    // Additional percentiles
    p5: number | null;
    p10: number | null;
    p90: number | null;
    p95: number | null;

    // Advanced analyses
    normality: NormalityTest | null;
    outliers: OutlierAnalysis | null;
}

// =============================================================================
// TABLE 1 (GROUP COMPARISON)
// =============================================================================

export interface Table1Row {
    variable: string;
    total: string | null;
    groups: Record<string, string>; // {"Control (n=50)": "45.2 ± 12.3", ...}
    p_value: string;
    test_used: string;
    is_significant: boolean;
}

// =============================================================================
// SUMMARY TABLE
// =============================================================================

export interface SummaryStatRow {
    variable: string;
    n: number;
    media: number | null;
    mediana: number | null;
    desvio_estandar: number | null;
    minimo: number | null;
    maximo: number | null;
    q1: number | null;
    q3: number | null;
    is_binary: boolean;
    is_normal: boolean | null;
    normality_p_value: number | null;
}

export interface SummaryStatsRequest {
    session_id: string;
    variables: string[];
}

export interface SummaryInsight {
    type: 'success' | 'info' | 'warning' | 'error';
    title: string;
    description: string;
}

export interface SummaryStatsResponse {
    success: boolean;
    message: string;
    session_id: string;
    data: SummaryStatRow[];
    analyzed_variables: string[];
    insights: SummaryInsight[];
}

// =============================================================================
// FREQUENCY TABLES
// =============================================================================

export interface FrequencyRow {
    categoria: string;
    frecuencia: number;
    porcentaje: number;
    porcentaje_acumulado: number;
}

export interface FrequencyTableResult {
    variable: string;
    rows: FrequencyRow[];
    total: number;
}

export interface FrequencyResponse {
    success: boolean;
    message: string;
    session_id: string;
    segments: string[];
    tables: Record<string, FrequencyTableResult[]>;
    segment_by: string | null;
}

// =============================================================================
// CONTINGENCY TABLES (CROSSTAB)
// =============================================================================

export interface ContingencyCellData {
    count: number;
    row_percent: number;
    col_percent: number;
    total_percent: number;
}

export interface ContingencyTableRequest {
    session_id: string;
    row_variable: string;
    col_variable: string;
    segment_by?: string | null;
}

// Resultado de una tabla individual de contingencia
export interface ContingencyTableResult {
    row_variable: string;
    col_variable: string;
    row_categories: string[];
    col_categories: string[];
    cells: Record<string, Record<string, ContingencyCellData>>;
    row_totals: Record<string, ContingencyCellData>;
    col_totals: Record<string, ContingencyCellData>;
    grand_total: number;
}

// Respuesta completa con soporte para segmentación (multi-tabla)
export interface ContingencyTableResponse {
    success: boolean;
    message: string;
    session_id: string;
    row_variable: string;
    col_variable: string;
    segments: string[];  // Lista de segmentos disponibles: ['General', 'Male', 'Female']
    tables: Record<string, ContingencyTableResult>;  // Diccionario de tablas por segmento
    segment_by: string | null;  // Variable usada para segmentar (null si no hay segmentación)
}

// =============================================================================
// API REQUEST/RESPONSE
// =============================================================================

export interface DescriptiveStatsRequest {
    session_id: string;
    columns?: string[];
    group_by?: string;
    include_normality?: boolean;
    include_outliers?: boolean;
    include_ci?: boolean;
}

export interface DescriptiveStatsResponse {
    success: boolean;
    message: string;
    session_id: string;
    statistics: Record<string, ColumnStatistics>;
    analyzed_columns: string[];
    table1_data: Table1Row[] | null;
    group_variable: string | null;
    groups: string[] | null;
}

// =============================================================================
// HELPER TYPES FOR UI
// =============================================================================

export interface VariableOption {
    value: string;
    label: string;
    type: 'numeric' | 'categorical';
}

export type AnalysisType = 'tabla1' | 'normalidad' | 'outliers' | 'tablas-cruzadas';
