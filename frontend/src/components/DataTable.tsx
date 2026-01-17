import { Search, Filter, Trash2, Sparkles, AlertCircle, Loader2, ChevronLeft, ChevronRight, AlertTriangle, Copy } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { CleaningToolbar } from './cleaning/CleaningToolbar';
import { DataHealthDashboard } from './cleaning/DataHealthDashboard';
import { EditCellModal } from './cleaning/EditCellModal';
import { MissingDataSidebar } from './cleaning/MissingDataSidebar';
import { useDataContext } from '../context/DataContext';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { OutlierBounds } from '../types/api';
import { useDataCleaning } from '../hooks/useDataCleaning';

interface DataTableProps {
  sessionId: string;
  onReset?: () => void;
}

interface DataRow {
  [key: string]: any;
}

interface EditingCell {
  rowIndex: number;
  columnName: string;
  value: any;
  issueType: 'outlier' | 'null' | 'duplicate' | 'normal';
  bounds?: { lower: number; upper: number } | null;
}

const ITEMS_PER_PAGE = 50;

export function DataTable({ sessionId, onReset }: DataTableProps) {
  // Use Global DataContext
  const {
    data,
    columns,
    totalRows,
    isLoading,
    error,
    refreshData,
    healthReport,
    refreshHealthReport,
    setData
  } = useDataContext();

  const { deleteRows, undoLastChange } = useDataCleaning();

  // View State
  const [viewMode, setViewMode] = useState<'summary' | 'full'>('summary');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  // Selection State
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Initial Load (handled by context mostly, but we trigger specific views here)
  useEffect(() => {
    if (!sessionId) return;

    // Initial fetch based on view mode (defaults to summary)
    setCurrentPage(1);
    setViewMode('summary');

    // Fetch summary data (15 rows) and health report
    refreshData(0, 15);
    refreshHealthReport();
  }, [sessionId]);

  // Handle data fetching when view mode or page changes
  useEffect(() => {
    if (!sessionId) return;

    const limit = viewMode === 'summary' ? 15 : ITEMS_PER_PAGE;
    const skip = viewMode === 'summary' ? 0 : (currentPage - 1) * ITEMS_PER_PAGE;

    refreshData(skip, limit);
    // Clear selection on page change for safety/simplicity
    setSelectedRows(new Set());
  }, [viewMode, currentPage, sessionId]);

  useEffect(() => {
    if (healthReport) {
      if (healthReport.overall_completeness < 80 || healthReport.total_anomalies > 0) {
        setShowDiagnostic(true);
      }
    }
  }, [healthReport]);

  const handleCleaningComplete = () => {
    const limit = viewMode === 'summary' ? 15 : ITEMS_PER_PAGE;
    const skip = viewMode === 'summary' ? 0 : (currentPage - 1) * ITEMS_PER_PAGE;

    refreshData(skip, limit);
    refreshHealthReport();
    setSelectedRows(new Set());
  };

  // --- Logic for Heat Map ---
  // Convert duplicate_rows_indices to Set for O(1) lookup (performance optimization)
  const duplicateRowsSet = useMemo(
    () => new Set(healthReport?.duplicate_rows_indices || []),
    [healthReport?.duplicate_rows_indices]
  );

  // Memoize getCellStatus to avoid recreating function on every render
  const getCellStatus = useCallback((value: any, realRowIndex: number, columnName: string): {
    type: 'outlier' | 'null' | 'duplicate' | 'normal';
    colorClass: string;
    icon?: React.ReactNode;
    bounds?: { lower: number; upper: number } | null;
  } => {
    // 1. Check Nulls
    if (value === null || value === undefined || value === "") {
      return {
        type: 'null',
        colorClass: 'bg-red-50 hover:bg-red-100/50',
        icon: <AlertCircle className="w-3 h-3 text-red-400 absolute top-1 right-1" />
      };
    }

    if (!healthReport) return { type: 'normal', colorClass: '' };

    // 2. Check Duplicates (O(1) Set lookup instead of O(n) array.includes)
    if (duplicateRowsSet.has(realRowIndex)) {
      return {
        type: 'duplicate',
        colorClass: 'bg-amber-50 hover:bg-amber-100/50',
        icon: <Copy className="w-3 h-3 text-amber-400 absolute top-1 right-1" />
      };
    }

    // 3. Check Outliers
    const colQuality = healthReport.columns[columnName];
    if (colQuality && colQuality.outlier_bounds) {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        const { lower, upper } = colQuality.outlier_bounds;
        if (numValue < lower || numValue > upper) {
          return {
            type: 'outlier',
            colorClass: 'bg-orange-50 hover:bg-orange-100/50',
            icon: <AlertTriangle className="w-3 h-3 text-orange-400 absolute top-1 right-1" />,
            bounds: { lower, upper }
          };
        }
      }
    }

    return { type: 'normal', colorClass: '' };
  }, [healthReport, duplicateRowsSet]);

  const handleCellClick = (row: DataRow, index: number, mkColumn: string) => {
    // index here is the index within the current page's data array
    // We need absolute index for correct heatmap/duplicate lookups
    const absoluteIndex = viewMode === 'summary' ? index : ((currentPage - 1) * ITEMS_PER_PAGE) + index;

    const status = getCellStatus(row[mkColumn], absoluteIndex, mkColumn);

    setEditingCell({
      rowIndex: index, // Local page index for immediate state update
      columnName: mkColumn,
      value: row[mkColumn],
      issueType: status.type,
      bounds: status.bounds
    });
  };

  const handleSaveCell = (newValue: any) => {
    if (!editingCell) return;

    // Optimistic update in local context
    const newData = [...data];
    if (newData[editingCell.rowIndex]) {
      newData[editingCell.rowIndex] = {
        ...newData[editingCell.rowIndex],
        [editingCell.columnName]: newValue
      };
      setData(newData);
    }
  };

  // Selection Logic
  const toggleRowSelection = (absoluteIndex: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(absoluteIndex)) {
      newSelection.delete(absoluteIndex);
    } else {
      newSelection.add(absoluteIndex);
    }
    setSelectedRows(newSelection);
  };

  const toggleSelectAllPage = () => {
    const newSelection = new Set(selectedRows);
    const startIndex = viewMode === 'summary' ? 0 : (currentPage - 1) * ITEMS_PER_PAGE;

    // Check if all on current page are selected
    const allSelected = data.every((_, idx) => newSelection.has(startIndex + idx));

    if (allSelected) {
      // Deselect all on this page
      data.forEach((_, idx) => newSelection.delete(startIndex + idx));
    } else {
      // Select all on this page
      data.forEach((_, idx) => newSelection.add(startIndex + idx));
    }
    setSelectedRows(newSelection);
  };

  const handleDeleteRows = async () => {
    if (selectedRows.size === 0) return;

    const indices = Array.from(selectedRows);
    const result = await deleteRows({
      session_id: sessionId,
      row_indices: indices
    });

    if (result && result.success) {
      handleCleaningComplete();
    }
  };

  const handleUndo = async () => {
    const success = await undoLastChange(sessionId);
    if (success) {
      handleCleaningComplete();
    }
  };

  // Get columns with nulls for sidebar
  const columnsWithNulls = useMemo(() => {
    if (!healthReport) return [];
    return Object.values(healthReport.columns).filter(col => col.missing_count > 0);
  }, [healthReport]);

  // Visible Columns Logic
  const visibleColumns = useMemo(() => {
    if (viewMode === 'full' || !healthReport) return columns;

    const problemCols = Object.keys(healthReport.columns).filter(col => {
      const q = healthReport.columns[col];
      return q.outlier_count > 0 || q.inconsistency_count > 0 || q.missing_count > 0;
    });

    const first5 = columns.slice(0, 5);
    const combined = Array.from(new Set([...first5, ...problemCols]));

    // Sort combined to match original order
    return columns.filter(c => combined.includes(c));
  }, [columns, viewMode, healthReport]);

  const maxPages = Math.ceil(totalRows / ITEMS_PER_PAGE);

  // Calculate if all on current page are selected
  const isPageSelected = data.length > 0 && data.every((_, idx) => {
    const absIndex = viewMode === 'summary' ? idx : ((currentPage - 1) * ITEMS_PER_PAGE) + idx;
    return selectedRows.has(absIndex);
  });

  if (isLoading && data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
          <p className="text-red-600 font-medium">{error}</p>
          <Button variant="outline" onClick={() => refreshData()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Quality Diagnostic Dashboard */}
      {showDiagnostic && healthReport && (
        <DataHealthDashboard report={healthReport} />
      )}

      <div className="flex h-full gap-0">
        <div className="bg-white rounded-lg border border-gray-200 flex flex-col shadow-sm flex-1 overflow-hidden">
          {/* Toolbar */}
          <CleaningToolbar
            sessionId={sessionId}
            onDiagnosticToggle={() => setShowDiagnostic(!showDiagnostic)}
            showDiagnostic={showDiagnostic}
            onCleaningComplete={handleCleaningComplete}
            selectedCount={selectedRows.size}
            onDelete={handleDeleteRows}
            onUndo={handleUndo}
            onReset={onReset}
          />

          {/* Info Bar */}
          <div className="border-b border-gray-200 px-4 py-2 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Filas: <strong className="text-gray-900">{totalRows.toLocaleString()}</strong></span>
              <span>Cols: <strong className="text-gray-900">{columns.length}</strong></span>
              {healthReport && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                    Outliers: <strong>{healthReport.total_anomalies}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Duplicados: <strong>{healthReport.duplicate_rows}</strong>
                  </span>
                </>
              )}
              {selectedRows.size > 0 && (
                <span className="ml-4 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {selectedRows.size} seleccionada(s)
                </span>
              )}
            </div>

            {viewMode === 'full' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  Página {currentPage} de {maxPages || 1}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentPage(p => Math.min(maxPages, p + 1))}
                    disabled={currentPage >= maxPages || isLoading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Data Grid */}
          <div className="flex-1 overflow-auto relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
              </div>
            )}

            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-3 py-2 border-b border-r border-gray-200 w-10 text-center bg-gray-50">
                    <Checkbox
                      checked={isPageSelected}
                      onCheckedChange={toggleSelectAllPage}
                    />
                  </th>
                  <th className="px-3 py-2 border-b border-r border-gray-200 w-10 text-center bg-gray-50 text-gray-400 font-normal">#</th>
                  {visibleColumns.map((column) => (
                    <th
                      key={column}
                      className="text-left px-3 py-2 text-xs font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap bg-gray-50"
                    >
                      <div className="flex items-center gap-1">
                        {column}
                        {healthReport?.columns[column]?.status === 'warning' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {data.map((row, index) => {
                  const absoluteIndex = viewMode === 'summary' ? index : ((currentPage - 1) * ITEMS_PER_PAGE) + index;
                  // Highlight duplicate rows globally
                  const isDuplicateRow = healthReport?.duplicate_rows_indices.includes(absoluteIndex);
                  const isSelected = selectedRows.has(absoluteIndex);

                  return (
                    <tr key={index} className={`group ${isSelected ? 'bg-blue-50' : ''}`}>
                      <td className="px-3 py-2 border-b border-r border-gray-100 text-center bg-gray-50/30">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRowSelection(absoluteIndex)}
                        />
                      </td>
                      <td className="px-3 py-2 border-b border-r border-gray-100 text-xs text-center text-gray-400 bg-gray-50/50">
                        {absoluteIndex + 1}
                      </td>
                      {visibleColumns.map((column) => {
                        const value = row[column];
                        const status = getCellStatus(value, absoluteIndex, column);

                        return (
                          <td
                            key={column}
                            onClick={() => handleCellClick(row, index, column)}
                            className={`
                             px-3 py-2 border-b border-r border-gray-100 relative cursor-pointer transition-colors
                             text-gray-700 font-mono text-xs
                             ${status.colorClass}
                             ${!status.colorClass && !isSelected && 'hover:bg-blue-50/50'}
                             ${!status.colorClass && isDuplicateRow && !isSelected ? 'bg-amber-50/30' : ''}
                          `}
                          >
                            <span className="block truncate max-w-[200px]" title={String(value)}>
                              {value === null || value === undefined || value === ""
                                ? <span className="text-gray-300 italic">null</span>
                                : String(value)
                              }
                            </span>
                            {status.icon}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {data.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <p>No se encontraron datos para mostrar.</p>
              </div>
            )}
          </div>

          {/* Executive Summary Footer */}
          {viewMode === 'summary' && totalRows > 15 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2">
              <p className="text-sm text-gray-500">
                Mostrando vista previa de 15 filas. El conjunto de datos completo tiene {totalRows} filas.
              </p>
              <Button
                onClick={() => { setViewMode('full'); setCurrentPage(1); }}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Explorar y Limpiar Datos Completos
              </Button>
            </div>
          )}
        </div>

        {/* Missing Data Sidebar */}
        {showSidebar && (
          <MissingDataSidebar
            sessionId={sessionId}
            columnsWithNulls={columnsWithNulls}
            onClose={() => setShowSidebar(false)}
            onApply={() => {
              setShowSidebar(false);
              handleCleaningComplete();
            }}
          />
        )}
      </div>

      {/* Edit Modal */}
      {editingCell && (
        <EditCellModal
          isOpen={true}
          initialValue={editingCell.value}
          columnName={editingCell.columnName}
          issueType={editingCell.issueType}
          bounds={editingCell.bounds}
          onClose={() => setEditingCell(null)}
          onSave={handleSaveCell}
        />
      )}
    </div>
  );
}
