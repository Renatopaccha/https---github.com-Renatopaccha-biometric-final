/**
 * TypeScript interfaces for API requests and responses
 * Updated to support multi-sheet Excel uploads and data cleaning operations
 */

// ===== Dataset Metadata =====
export interface DatasetMetadata {
    rows: number;
    columns: number;
    column_names: string[];
    dtypes: { [key: string]: string };
    missing_values: { [key: string]: number };
}

// ===== Upload API - Multi-Sheet Support =====
export interface SheetPreview {
    sheet_name: string;
    rows: number;
    columns: number;
    column_names: string[];
    preview_data: Array<Record<string, any>>;
    missing_count: number;
    is_suggested: boolean;
    score: number;
}

export interface UploadResponseReady {
    success: boolean;
    message: string;
    status: 'ready';
    session_id: string;
    filename: string;
    metadata: DatasetMetadata;
}

export interface UploadResponseSelectionRequired {
    success: boolean;
    message: string;
    status: 'selection_required';
    temp_id: string;
    filename: string;
    total_sheets: number;
    sheets: SheetPreview[];
}

// Union type for upload response
export type UploadResponse = UploadResponseReady | UploadResponseSelectionRequired;

// Sheet selection request/response
export interface SheetSelectionRequest {
    temp_id: string;
    selected_sheets: string[];
    merge: boolean;
}

export interface SheetSelectionResponse {
    success: boolean;
    message: string;
    status: 'ready';
    session_id: string;
    filename: string;
    selected_sheets: string[];
    merged: boolean;
    metadata: DatasetMetadata;
}

// ===== Data API =====
export interface DataResponse {
    success: boolean;
    message: string;
    session_id: string;
    total_rows: number;
    returned_rows: number;
    data: DataRow[];
    columns: string[];
}

export interface DataRow {
    [key: string]: any;
}

// ===== Stats API =====
export interface DescriptiveStatsRequest {
    session_id: string;
    columns?: string[] | null;
}

export interface ColumnStatistics {
    count: number;
    missing: number;
    mean: number | null;
    median: number | null;
    std: number | null;
    variance: number | null;
    min: number | null;
    max: number | null;
    q1: number | null;
    q3: number | null;
    iqr: number | null;
    skewness: number | null;
    kurtosis: number | null;
}

export interface DescriptiveStatsResponse {
    success: boolean;
    message: string;
    session_id: string;
    statistics: { [columnName: string]: ColumnStatistics };
    analyzed_columns: string[];
}

// ===== Error Response =====
export interface ErrorResponse {
    error: string;
    message: string;
    path: string;
}

// ===== Data Cleaning & Quality Diagnostics =====

// Quality status type
export type QualityStatus = 'ok' | 'info' | 'warning' | 'critical';

export interface OutlierBounds {
    lower: number;
    upper: number;
}

export interface ColumnQuality {
    column_name: string;
    data_type: string;
    completeness: number; // 0-100
    missing_count: number;
    unique_count: number;
    min_value?: number | null;
    max_value?: number | null;
    outlier_count: number;
    outlier_bounds?: OutlierBounds | null;
    inconsistency_count: number;
    status: QualityStatus;
    suggestion: string;
}

export interface DatasetHealthReport {
    total_rows: number;
    total_columns: number;
    overall_completeness: number; // 0-100
    total_anomalies: number;
    total_inconsistencies: number;
    duplicate_rows: number;
    duplicate_rows_indices: number[];
    columns: Record<string, ColumnQuality>;
}

export interface QualityReportResponse {
    success: boolean;
    message: string;
    session_id: string;
    report: DatasetHealthReport;
}

// Null handling operations
export type NullHandlingMethod = 'drop' | 'mean' | 'median' | 'mode' | 'ffill' | 'bfill' | 'constant' | 'custom_value' | 'date_interpolation';

export interface NullHandlingRequest {
    session_id: string;
    column: string;
    method: NullHandlingMethod;
    fill_value?: string | number;
}

export interface NullHandlingResponse {
    success: boolean;
    message: string;
    session_id: string;
    column: string;
    method: string;
    nulls_before: number;
    nulls_after: number;
    rows_affected: number;
}

// Duplicate removal operations
export type DuplicateKeepStrategy = 'first' | 'last' | false;

export interface DuplicateRemovalRequest {
    session_id: string;
    subset?: string[] | null;
    keep: DuplicateKeepStrategy;
}

export interface DuplicateRemovalResponse {
    success: boolean;
    message: string;
    session_id: string;
    duplicates_removed: number;
    rows_before: number;
    rows_after: number;
}

// Column type change operations
export type ColumnDataType = 'int' | 'float' | 'string' | 'datetime' | 'bool';

export interface ColumnTypeChangeRequest {
    session_id: string;
    column: string;
    new_type: ColumnDataType;
    errors?: 'raise' | 'coerce' | 'ignore';
}

export interface ColumnTypeChangeResponse {
    success: boolean;
    message: string;
    session_id: string;
    column: string;
    old_type: string;
    new_type: string;
    conversion_errors: number;
}

// Column filtering operations
export interface ColumnFilterRequest {
    session_id: string;
    columns_to_keep: string[];
}

export interface ColumnFilterResponse {
    success: boolean;
    message: string;
    session_id: string;
    columns_removed: string[];
    columns_kept: string[];
    columns_before: number;
    columns_after: number;
}

export interface RowDeletionRequest {
    session_id: string;
    row_indices: number[];
}

export interface RowDeletionResponse {
    success: boolean;
    rows_deleted: number;
    rows_remaining: number;
}

// ===== Null Handling Simulation =====
export interface DistributionChange {
    mean_before: number | null;
    mean_after: number | null;
    std_before: number | null;
    std_after: number | null;
}

export interface SamplePreview {
    row_index: number;
    value_before: any;
    value_after: any;
}

export interface SimulationRequest {
    session_id: string;
    column: string;
    method: NullHandlingMethod;
    fill_value?: string | number;
}

export interface SimulationResponse {
    success: boolean;
    message: string;
    session_id: string;
    column: string;
    method: string;
    rows_affected: number;
    information_loss_percent: number;
    distribution_change: DistributionChange | null;
    sample_preview: SamplePreview[];
}


// ===== Undo Operations =====
export interface UndoRequest {
    session_id: string;
}

export interface UndoResponse {
    success: boolean;
    message: string;
    session_id: string;
    version_id: number;
}

// ===== Column Filtering =====
export interface ColumnFilterRequest {
    session_id: string;
    columns_to_keep: string[];
}

export interface ColumnFilterResponse {
    success: boolean;
    columns_removed: string[];
    columns_kept: string[];
}

// ===== Empty Rows Detection =====
export interface EmptyRowsResponse {
    success: boolean;
    message: string;
    session_id: string;
    empty_row_indices: number[];
    total_empty: number;
    preview: Record<string, any>[];
}
