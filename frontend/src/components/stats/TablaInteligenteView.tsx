import { ArrowLeft, ChevronDown, ChevronRight, Filter, Info, Loader2, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ActionToolbar } from './ActionToolbar';
import { getSmartTableStats } from '../../api/stats';
import { useDataContext } from '../../context/DataContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import type { SmartTableColumnStats, SmartTableResponse, FilterRule } from '../../types/stats';


// Export libraries (xlsx-js-style for styled exports)
import XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

// =============================================================================
// FILTER OPERATORS - Human Readable Labels
// =============================================================================
const filterOperators = [
  { value: '>', label: 'Mayor que' },
  { value: '<', label: 'Menor que' },
  { value: '>=', label: 'Mayor o igual' },
  { value: '<=', label: 'Menor o igual' },
  { value: '==', label: 'Igual a' },
  { value: '!=', label: 'Diferente de' },
] as const;

interface TablaInteligenteViewProps {
  onBack: () => void;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Formats a numeric value for display (APA standard: 2-3 decimal places)
 * Handles null, undefined, NaN, and Infinity
 */
function formatValue(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '-';
  if (typeof value !== 'number' || !isFinite(value)) return '-';
  return value.toFixed(decimals);
}

/**
 * Formats mode value (can be single value or array)
 */
function formatMode(mode: number | number[] | null | undefined): string {
  if (mode === null || mode === undefined) return '-';
  if (Array.isArray(mode)) {
    if (mode.length === 0) return '-';
    if (mode.length > 3) return `${mode.slice(0, 3).map(m => formatValue(m)).join(', ')}...`;
    return mode.map(m => formatValue(m)).join(', ');
  }
  return formatValue(mode);
}

/**
 * Gets normality badge style based on test result
 */
function getNormalityBadge(testResult: string): { bg: string; text: string; label: string } {
  switch (testResult) {
    case 'Normal':
      return { bg: 'bg-green-100', text: 'text-green-800', label: 'Normal' };
    case 'No Normal':
      return { bg: 'bg-red-100', text: 'text-red-800', label: 'No Normal' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Indeterminado' };
  }
}

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-teal-50 via-blue-50 to-indigo-50 border-b border-slate-200">
          <div className="h-6 bg-slate-200 rounded w-48"></div>
        </div>
        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr>
                {Array.from({ length: cols }).map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <div className="h-4 bg-slate-200 rounded"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, rowIdx) => (
                <tr key={rowIdx} className="border-b border-slate-100">
                  {Array.from({ length: cols }).map((_, colIdx) => (
                    <td key={colIdx} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TOOLTIP DEFINITIONS
// =============================================================================

const STAT_TOOLTIPS: Record<string, string> = {
  mean: "Promedio aritmético de todos los valores",
  median: "Valor central cuando los datos están ordenados",
  mode: "Valor(es) que aparece(n) con mayor frecuencia",
  trimmed_mean_5: "Media calculada eliminando el 5% de valores extremos de cada lado",
  sum: "Suma total de todos los valores de la variable",
  geometric_mean: "Media geométrica - útil para promediar tasas de cambio. Solo definida para valores positivos (>0)",
  std_dev: "Medida de dispersión. Un valor bajo indica datos cercanos a la media",
  variance: "Cuadrado de la desviación estándar",
  min: "Valor más pequeño observado en la variable",
  max: "Valor más grande observado en la variable",
  range: "Recorrido estadístico: diferencia entre el valor máximo y mínimo (Max - Min)",
  iqr: "Rango entre el percentil 25 y 75. Útil para detectar outliers",
  cv: "Desviación estándar relativa a la media (%). Permite comparar variabilidad entre variables",
  sem: "Error estándar de la media. Crucial en investigación médica para estimar la precisión de la media muestral",
  q1: "25% de los datos están por debajo de este valor",
  q3: "75% de los datos están por debajo de este valor",
  p5: "5% de los datos están por debajo de este valor",
  p95: "95% de los datos están por debajo de este valor",
  skewness: "Mide la asimetría de la distribución. 0 = simétrica, >0 = cola derecha, <0 = cola izquierda",
  kurtosis: "Mide la 'altura' de las colas. 0 = normal, >0 = colas pesadas, <0 = colas ligeras",
  normality_test: "Test estadístico para verificar si los datos siguen una distribución normal. Shapiro-Wilk para n<50, Kolmogorov-Smirnov para n≥50"
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TablaInteligenteView({ onBack }: TablaInteligenteViewProps) {
  const { sessionId, columns: allColumns, healthReport } = useDataContext();

  // Use all columns as available variables (backend will validate which are numeric)
  const availableVars = allColumns || [];

  // Get categorical columns for segmentation dropdown (from healthReport)
  const categoricalVars = useMemo(() => {
    if (!healthReport?.columns) return [];
    return Object.entries(healthReport.columns)
      .filter(([_, colInfo]) => {
        // Include object/string types or columns with few unique values
        const dtype = colInfo.data_type?.toLowerCase() || '';
        const uniqueCount = colInfo.unique_count || 0;
        const totalRows = healthReport.total_rows || 1;
        // Categorical if: string/object type, or <20 unique values, or <10% unique ratio
        return (
          dtype.includes('object') ||
          dtype.includes('str') ||
          dtype.includes('category') ||
          (uniqueCount <= 20 && uniqueCount > 1) ||
          (uniqueCount / totalRows < 0.1 && uniqueCount > 1)
        );
      })
      .map(([colName]) => colName);
  }, [healthReport]);

  // Selected variables
  const [selectedVars, setSelectedVars] = useState<string[]>([]);
  const [showVarsDropdown, setShowVarsDropdown] = useState(false);

  // Segmentation state
  const [segmentBy, setSegmentBy] = useState<string>('');
  const [showSegmentDropdown, setShowSegmentDropdown] = useState(false);
  const [activeSegment, setActiveSegment] = useState<string>('General');

  // Filter state
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [filterActive, setFilterActive] = useState(false);
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Data state
  const [data, setData] = useState<SmartTableResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Statistics selection state
  const [tendenciaCentral, setTendenciaCentral] = useState({
    n: true,
    media: true,
    mediana: true,
    moda: false,
    trimmed_mean_5: false,
    suma: false,
    media_geometrica: false,
  });

  const [dispersion, setDispersion] = useState({
    desvTipica: true,
    varianza: false,
    minimo: false,
    maximo: false,
    recorrido: false,
    coefVariacion: true,
    rangoIntercuartilico: true,
    errorEstMedia: true,
  });

  const [percentiles, setPercentiles] = useState({
    cuartiles: true,
    p5_p95: false,
    deciles: false,
    customPercentileEnabled: false,
  });

  // Custom percentile value (0-100)
  const [customPercentileValue, setCustomPercentileValue] = useState<number>(95);

  const [formaDistribucion, setFormaDistribucion] = useState({
    asimetria: false,
    curtosis: false,
    pruebaNormalidad: true,
  });

  // AI Interpretation State
  const [interpreting, setInterpreting] = useState(false);
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [showInterpretationModal, setShowInterpretationModal] = useState(false);

  const varsRef = useRef<HTMLDivElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);

  // NOTE: No auto-selection - let user choose which variables to analyze
  // (Previously auto-selected all variables on mount)

  // Helper functions for Select All / Deselect All
  const selectAllVariables = () => setSelectedVars([...availableVars]);
  const deselectAllVariables = () => setSelectedVars([]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (varsRef.current && !varsRef.current.contains(event.target as Node)) {
        setShowVarsDropdown(false);
      }
      if (segmentRef.current && !segmentRef.current.contains(event.target as Node)) {
        setShowSegmentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data when variables or segmentation change
  const fetchData = useCallback(async () => {
    if (!sessionId || selectedVars.length === 0) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Prepare active filters only if filter is enabled
      const activeFilters = filterActive && filterRules.length > 0 ? filterRules : undefined;

      const response = await getSmartTableStats(
        sessionId,
        selectedVars,
        percentiles.customPercentileEnabled ? [customPercentileValue] : undefined,
        segmentBy || undefined,
        activeFilters,
        filterLogic
      );
      setData(response);
      // Reset activeSegment to General when data changes
      setActiveSegment('General');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
      console.error('Smart Table fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, selectedVars, percentiles.customPercentileEnabled, customPercentileValue, segmentBy, filterActive, filterRules, filterLogic]);

  // Debounce fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const toggleVariable = (variable: string) => {
    setSelectedVars(prev =>
      prev.includes(variable) ? prev.filter(v => v !== variable) : [...prev, variable]
    );
  };

  // =====================================================
  // FILTER MANAGEMENT FUNCTIONS
  // =====================================================
  const addFilterRule = () => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Date.now().toString();
    const defaultColumn = availableVars.length > 0 ? availableVars[0] : '';
    setFilterRules([...filterRules, { id, column: defaultColumn, operator: '>', value: 0 }]);
  };

  const removeLastRule = () => {
    if (filterRules.length > 0) {
      setFilterRules(filterRules.slice(0, -1));
    }
  };

  const clearAllRules = () => {
    setFilterRules([]);
  };

  const updateRule = (id: string, field: keyof FilterRule, value: string | number) => {
    setFilterRules(prevRules => prevRules.map(rule => (
      rule.id === id ? { ...rule, [field]: value } : rule
    )));
  };

  // Get statistics for a variable, using activeSegment when segmented
  const getStats = (variable: string): SmartTableColumnStats | null => {
    if (!data?.statistics) return null;
    const varStats = data.statistics[variable];
    if (!varStats) return null;
    // Use activeSegment when segmented, otherwise 'General'
    const targetSegment = hasSegmentation ? activeSegment : 'General';
    return varStats[targetSegment] || null;
  };

  // Get all segments from data
  const segments = data?.segments || ['General'];
  const hasSegmentation = segmentBy && segments.length > 1;

  // =====================================================
  // EXPORT FUNCTIONS
  // =====================================================

  /**
   * Export table data to Excel (.xlsx) with professional corporate styling
   * Uses xlsx-js-style for cell styling support
   */
  const handleExportExcel = useCallback(() => {
    // Early validation
    if (!data || selectedVars.length === 0) {
      console.warn('Export Excel: No data or no selected variables');
      alert('No hay datos para exportar. Seleccione al menos una variable.');
      return;
    }

    try {
      console.log('Excel Export: Starting export...');

      // Compute targetSegment
      const targetSegment = hasSegmentation ? activeSegment : 'General';

      // Debug logging
      console.log('Excel Export Debug:', {
        selectedVars,
        targetSegment,
        hasSegmentation,
        segments: data.segments,
      });

      // =====================================================
      // 1. BUILD DATA TO EXPORT
      // =====================================================

      // Define statistics to export
      const allStats = [
        { key: 'n', label: 'N (Conteo)', getter: (s: SmartTableColumnStats) => s.n },
        { key: 'mean', label: 'Media', getter: (s: SmartTableColumnStats) => s.central_tendency?.mean },
        { key: 'median', label: 'Mediana', getter: (s: SmartTableColumnStats) => s.central_tendency?.median },
        {
          key: 'mode', label: 'Moda', getter: (s: SmartTableColumnStats) => {
            const m = s.central_tendency?.mode;
            return Array.isArray(m) ? m.join(', ') : m;
          }
        },
        { key: 'std_dev', label: 'Desviación Estándar', getter: (s: SmartTableColumnStats) => s.dispersion?.std_dev },
        { key: 'variance', label: 'Varianza', getter: (s: SmartTableColumnStats) => s.dispersion?.variance },
        { key: 'min', label: 'Mínimo', getter: (s: SmartTableColumnStats) => s.dispersion?.min },
        { key: 'max', label: 'Máximo', getter: (s: SmartTableColumnStats) => s.dispersion?.max },
        { key: 'range', label: 'Recorrido (Rango)', getter: (s: SmartTableColumnStats) => s.dispersion?.range },
        { key: 'iqr', label: 'Rango Intercuartil', getter: (s: SmartTableColumnStats) => s.dispersion?.iqr },
        { key: 'cv', label: 'Coef. de Variación (%)', getter: (s: SmartTableColumnStats) => s.dispersion?.cv },
        { key: 'sem', label: 'Error Estándar', getter: (s: SmartTableColumnStats) => s.dispersion?.sem },
        { key: 'q1', label: 'Q1 (25%)', getter: (s: SmartTableColumnStats) => s.percentiles?.q1 },
        { key: 'q3', label: 'Q3 (75%)', getter: (s: SmartTableColumnStats) => s.percentiles?.q3 },
        { key: 'skewness', label: 'Asimetría', getter: (s: SmartTableColumnStats) => s.shape?.skewness },
        { key: 'kurtosis', label: 'Curtosis', getter: (s: SmartTableColumnStats) => s.shape?.kurtosis },
        { key: 'normality_test', label: 'Test de Normalidad', getter: (s: SmartTableColumnStats) => s.shape?.normality_test },
      ];

      // Build data array for export
      const dataToExport: Record<string, string | number>[] = [];

      for (const stat of allStats) {
        const row: Record<string, string | number> = { 'Estadístico': stat.label };
        for (const variable of selectedVars) {
          const varStats = data.statistics[variable]?.[targetSegment];
          if (varStats) {
            const value = stat.getter(varStats);
            row[variable] = value !== null && value !== undefined
              ? (typeof value === 'number' ? Number(value.toFixed(4)) : String(value))
              : '-';
          } else {
            row[variable] = '-';
          }
        }
        dataToExport.push(row);
      }

      console.log('Excel Export: Built', dataToExport.length, 'rows');

      // =====================================================
      // 2. CREATE WORKSHEET
      // =====================================================

      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // Verify worksheet was created
      if (!ws || !ws['!ref']) {
        throw new Error('Failed to create worksheet');
      }

      console.log('Excel Export: Worksheet created, range:', ws['!ref']);

      // =====================================================
      // 3. APPLY STYLES (with defensive checks)
      // =====================================================

      try {
        const range = XLSX.utils.decode_range(ws['!ref']);

        // Style definitions
        const headerStyle = {
          fill: { fgColor: { rgb: '0F766E' } },
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'B0B0B0' } },
            bottom: { style: 'thin', color: { rgb: 'B0B0B0' } },
            left: { style: 'thin', color: { rgb: 'B0B0B0' } },
            right: { style: 'thin', color: { rgb: 'B0B0B0' } },
          },
        };

        const bodyStyle = {
          font: { color: { rgb: '334155' }, sz: 10 },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } },
          },
        };

        const firstColStyle = {
          ...bodyStyle,
          font: { bold: true, color: { rgb: '334155' }, sz: 10 },
          alignment: { horizontal: 'left', vertical: 'center' },
          fill: { fgColor: { rgb: 'F0FDFA' } },
        };

        // Iterate through cells safely
        for (let R = range.s.r; R <= range.e.r; R++) {
          for (let C = range.s.c; C <= range.e.c; C++) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });

            // IMPORTANT: Skip if cell doesn't exist
            if (!ws[cellRef]) continue;

            // Apply appropriate style
            if (R === 0) {
              // Header row
              ws[cellRef].s = headerStyle;
            } else if (C === 0) {
              // First column (statistic names)
              ws[cellRef].s = firstColStyle;
            } else {
              // Data cells
              ws[cellRef].s = bodyStyle;
            }
          }
        }

        console.log('Excel Export: Styles applied successfully');
      } catch (styleError) {
        console.warn('Excel Export: Style application failed, continuing without styles:', styleError);
        // Continue without styles - data will still export
      }

      // =====================================================
      // 4. SET COLUMN WIDTHS
      // =====================================================

      ws['!cols'] = [
        { wch: 25 }, // First column (Estadístico)
        ...selectedVars.map(() => ({ wch: 18 })),
      ];

      // =====================================================
      // 5. CREATE WORKBOOK AND DOWNLOAD
      // =====================================================

      const wb = XLSX.utils.book_new();
      const sheetName = hasSegmentation
        ? `Stats_${targetSegment}`.substring(0, 31)
        : 'Estadisticas';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate filename
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const filename = `Biometric_Analisis_${dateStr}.xlsx`;

      // Write file using browser-compatible method (Blob + download link)
      // This bypasses the fs.writeFileSync issue in xlsx-js-style
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Excel Export: Success! File saved as', filename);

    } catch (error) {
      console.error('Excel Export Error:', error);
      alert(`Error al exportar a Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }, [data, selectedVars, activeSegment, hasSegmentation]);

  /**
   * Export table data to PDF report with professional corporate styling
   */
  const handleExportPDF = useCallback(() => {
    if (!data || selectedVars.length === 0) {
      console.warn('Export PDF: No data or no selected variables');
      return;
    }

    try {
      // Compute targetSegment the same way as getStats
      const targetSegment = hasSegmentation ? activeSegment : 'General';

      console.log('PDF Export Debug:', {
        selectedVars: selectedVars.length,
        targetSegment,
        hasSegmentation
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = new jsPDF('landscape', 'mm', 'a4') as any;

      // =====================================================
      // CORPORATE COLOR PALETTE (Matching App Theme)
      // =====================================================
      const colors = {
        teal700: [15, 118, 110] as [number, number, number],   // Header background
        teal50: [240, 253, 250] as [number, number, number],   // Alternate row background
        slate700: [51, 65, 85] as [number, number, number],    // Body text
        slate400: [148, 163, 184] as [number, number, number], // Secondary text
        gray300: [209, 213, 219] as [number, number, number],  // Table borders
        white: [255, 255, 255] as [number, number, number],    // Header text
      };

      // =====================================================
      // DOCUMENT HEADER
      // =====================================================
      const segmentLabel = hasSegmentation ? ` - ${targetSegment}` : '';

      // Title with corporate color
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colors.teal700);
      doc.text(`Reporte de Análisis Bioestadístico${segmentLabel}`, 14, 20);

      // Subtitle/metadata
      const now = new Date();
      const dateFormatted = now.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colors.slate400);
      doc.text(`Generado: ${dateFormatted}`, 14, 28);

      // Variables info with icon-like bullet
      doc.setTextColor(...colors.slate700);
      doc.text(`● Variables analizadas: ${selectedVars.length}`, 14, 35);
      if (hasSegmentation) {
        doc.text(`● Segmento activo: ${targetSegment}`, 14, 41);
      }

      // Horizontal separator line
      const startY = hasSegmentation ? 46 : 40;
      doc.setDrawColor(...colors.gray300);
      doc.setLineWidth(0.3);
      doc.line(14, startY, doc.internal.pageSize.width - 14, startY);

      // =====================================================
      // TABLE CONFIGURATION
      // =====================================================

      // Define columns
      const columns = ['Estadístico', ...selectedVars];

      // Define all statistics (comprehensive list)
      const allStats = [
        { label: 'N (Conteo)', getter: (s: SmartTableColumnStats) => s.n },
        { label: 'Media', getter: (s: SmartTableColumnStats) => s.central_tendency?.mean },
        { label: 'Mediana', getter: (s: SmartTableColumnStats) => s.central_tendency?.median },
        { label: 'Desviación Estándar', getter: (s: SmartTableColumnStats) => s.dispersion?.std_dev },
        { label: 'Varianza', getter: (s: SmartTableColumnStats) => s.dispersion?.variance },
        { label: 'Mínimo', getter: (s: SmartTableColumnStats) => s.dispersion?.min },
        { label: 'Máximo', getter: (s: SmartTableColumnStats) => s.dispersion?.max },
        { label: 'Rango', getter: (s: SmartTableColumnStats) => s.dispersion?.range },
        { label: 'Coef. Variación (%)', getter: (s: SmartTableColumnStats) => s.dispersion?.cv },
        { label: 'Error Estándar', getter: (s: SmartTableColumnStats) => s.dispersion?.sem },
        { label: 'Q1 (25%)', getter: (s: SmartTableColumnStats) => s.percentiles?.q1 },
        { label: 'Q3 (75%)', getter: (s: SmartTableColumnStats) => s.percentiles?.q3 },
        { label: 'Rango Intercuartil', getter: (s: SmartTableColumnStats) => s.dispersion?.iqr },
        { label: 'Asimetría', getter: (s: SmartTableColumnStats) => s.shape?.skewness },
        { label: 'Curtosis', getter: (s: SmartTableColumnStats) => s.shape?.kurtosis },
        { label: 'Test Normalidad', getter: (s: SmartTableColumnStats) => s.shape?.normality_test },
      ];

      // Build table data
      const tableData = allStats.map(stat => {
        const row = [stat.label];
        selectedVars.forEach(variable => {
          const varStats = data.statistics[variable]?.[targetSegment];
          if (varStats) {
            const value = stat.getter(varStats);
            row.push(value !== null && value !== undefined
              ? (typeof value === 'number' ? value.toFixed(3) : String(value))
              : '-');
          } else {
            row.push('-');
          }
        });
        return row;
      });

      // =====================================================
      // GENERATE TABLE WITH CORPORATE STYLING
      // =====================================================
      autoTable(doc, {
        head: [columns],
        body: tableData,
        startY: startY + 4,
        theme: 'grid', // Clean grid theme
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          lineColor: colors.gray300,
          lineWidth: 0.1,
          textColor: colors.slate700,
        },
        headStyles: {
          fillColor: colors.teal700, // Teal-700 header
          textColor: colors.white,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          cellPadding: 4,
        },
        bodyStyles: {
          halign: 'center',
          valign: 'middle',
        },
        columnStyles: {
          0: {
            fontStyle: 'bold',
            halign: 'left',
            cellWidth: 40,
            fillColor: colors.teal50, // Light teal for first column
          },
        },
        alternateRowStyles: {
          fillColor: colors.teal50, // Teal-50 for alternate rows
        },
        tableLineColor: colors.gray300,
        tableLineWidth: 0.1,
        margin: { left: 14, right: 14 },
        didDrawPage: (hookData) => {
          // Add page header on subsequent pages
          if (hookData.pageNumber > 1) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(...colors.teal700);
            doc.text('Reporte de Análisis Bioestadístico (continuación)', 14, 14);
          }
        },
      });

      // =====================================================
      // PROFESSIONAL FOOTER ON ALL PAGES
      // =====================================================
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer line
        doc.setDrawColor(...colors.gray300);
        doc.setLineWidth(0.3);
        const footerY = doc.internal.pageSize.height - 15;
        doc.line(14, footerY, doc.internal.pageSize.width - 14, footerY);

        // Footer text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...colors.slate400);
        doc.text(
          `Biometric App - Análisis Estadístico | Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 8,
          { align: 'center' }
        );

        // Add date on left side of footer
        doc.text(
          dateFormatted,
          14,
          doc.internal.pageSize.height - 8
        );
      }

      // =====================================================
      // SAVE PDF
      // =====================================================
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const filename = `Biometric_Report_${dateStr}.pdf`;

      doc.save(filename);
      console.log('PDF Export: File saved as', filename);

    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Error al exportar a PDF. Inténtelo de nuevo.');
    }
  }, [data, selectedVars, activeSegment, hasSegmentation]);

  /**
   * AI Interpretation Handler
   */
  const handleIAInterpretation = async () => {
    if (!data || selectedVars.length === 0) return;

    setInterpreting(true);
    try {
      // 1. Filter stats to reduce token usage and noise
      // Create a simplified stats object containing only selected variables and the active segment
      const targetSegment = hasSegmentation ? activeSegment : 'General';
      const statsToSend = selectedVars.reduce((acc, varName) => {
        if (data.statistics[varName] && data.statistics[varName][targetSegment]) {
          acc[varName] = data.statistics[varName][targetSegment];
        }
        return acc;
      }, {} as any);

      // 2. Fetch interpretation from AI endpoint
      // Using API_BASE_URL logic similar to stats.ts
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_BASE_URL}/api/v1/ai/interpret-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats: statsToSend,
          segment: targetSegment
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setAiInterpretation(result.interpretation);
      setShowInterpretationModal(true);

    } catch (error) {
      console.error("Error interpretando tabla:", error);
      alert("Error al consultar a la IA. Por favor, intenta de nuevo.");
    } finally {
      setInterpreting(false);
    }
  };

  // Render tooltip wrapper
  const withTooltip = (label: string, tooltipKey: string, children: React.ReactNode) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            {children}
            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-teal-600 transition-colors" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-sm">
          <p>{STAT_TOOLTIPS[tooltipKey] || label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );


  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Volver al menú"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-6 bg-gradient-to-b from-teal-500 to-teal-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Tabla Inteligente
              </h2>
              {isLoading && <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />}
            </div>
            <p className="text-slate-600 leading-relaxed ml-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Estadísticas descriptivas avanzadas con estructura de 4 categorías
            </p>
          </div>
        </div>

        {/* ================================================================
            CONTROLS CONTAINER - Organized Layout
            ================================================================ */}
        <div className="space-y-4 mb-6">

          {/* ROW 1: Variables + Segmentation (Side by Side) */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

            {/* LEFT: Variable Selector */}
            <div className="relative w-full sm:w-80" ref={varsRef}>
              <label className="text-xs font-medium text-slate-700 mb-1.5 block" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Variables Numéricas a Analizar
              </label>
              <button
                onClick={() => setShowVarsDropdown(!showVarsDropdown)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm shadow-sm"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                <span className="text-slate-700 flex-1 text-left">
                  {selectedVars.length === 0
                    ? 'Seleccionar variables (Mín. 1)'
                    : `${selectedVars.length} variable(s) seleccionada(s)`}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {showVarsDropdown && (
                <div className="absolute top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-20 max-h-80 overflow-auto">
                  {/* Select All / Deselect All Buttons */}
                  <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-2 flex gap-2 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllVariables();
                      }}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-teal-50 text-teal-700 rounded hover:bg-teal-100 transition-colors"
                    >
                      Seleccionar todo
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deselectAllVariables();
                      }}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                    >
                      Deseleccionar todo
                    </button>
                  </div>

                  {availableVars.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      No hay variables numéricas disponibles
                    </div>
                  ) : (
                    availableVars.map((variable) => (
                      <label
                        key={variable}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedVars.includes(variable)}
                          onChange={() => toggleVariable(variable)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{variable}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Segmentation Dropdown */}
            <div className="relative w-full sm:w-64" ref={segmentRef}>
              <label className="text-xs font-medium text-slate-700 mb-1.5 block" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                <Users className="w-3.5 h-3.5 inline mr-1" />
                Segmentar por...
              </label>
              <button
                onClick={() => setShowSegmentDropdown(!showSegmentDropdown)}
                className={`w-full px-4 py-2.5 bg-white border rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm shadow-sm ${segmentBy ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-slate-300'}`}
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                <span className={`flex-1 text-left ${segmentBy ? 'text-indigo-700 font-medium' : 'text-slate-500'}`}>
                  {segmentBy || 'Sin segmentación'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {showSegmentDropdown && (
                <div className="absolute top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-20 max-h-64 overflow-auto">
                  {/* Option to clear segmentation */}
                  <button
                    onClick={() => {
                      setSegmentBy('');
                      setShowSegmentDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm ${!segmentBy ? 'bg-slate-100 font-medium' : ''}`}
                  >
                    <span className="text-slate-500 italic">Sin segmentación</span>
                  </button>

                  {categoricalVars.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      No hay variables categóricas disponibles
                    </div>
                  ) : (
                    categoricalVars.map((variable) => (
                      <button
                        key={variable}
                        onClick={() => {
                          setSegmentBy(variable);
                          setShowSegmentDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm ${segmentBy === variable ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-900'}`}
                      >
                        {variable}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active Segmentation Indicator */}
          {hasSegmentation && (
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                <Users className="w-3 h-3" />
                Segmentado por: {segmentBy} ({segments.length} grupos)
              </span>
            </div>
          )}

          {/* ROW 2: Advanced Filters Toolbar */}
          <div className="bg-slate-50/80 rounded-lg border border-slate-200 p-3">
            {/* Filter Header - Always Visible */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Toggle & Label */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Filtros
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer ml-2">
                  <input
                    type="checkbox"
                    checked={filterActive}
                    onChange={(e) => setFilterActive(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-600">Activar</span>
                </label>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-slate-300 hidden sm:block"></div>

              {/* Filter Logic Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Lógica:</span>
                <div className="flex items-center gap-1 bg-white rounded-md border border-slate-200 p-0.5">
                  <button
                    onClick={() => setFilterLogic('AND')}
                    className={`px-2 py-1 text-xs rounded transition-colors ${filterLogic === 'AND' ? 'bg-teal-100 text-teal-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    Y
                  </button>
                  <button
                    onClick={() => setFilterLogic('OR')}
                    className={`px-2 py-1 text-xs rounded transition-colors ${filterLogic === 'OR' ? 'bg-teal-100 text-teal-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    O
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-slate-300 hidden sm:block"></div>

              {/* Add Rule Button */}
              <button
                onClick={addFilterRule}
                className="px-3 py-1.5 bg-teal-600 text-white rounded-md text-xs hover:bg-teal-700 transition-colors flex items-center gap-1.5 shadow-sm"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Regla
              </button>

              {/* Clear Button (only if rules exist) */}
              {filterRules.length > 0 && (
                <button
                  onClick={clearAllRules}
                  className="px-3 py-1.5 text-red-600 text-xs hover:bg-red-50 rounded-md transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpiar ({filterRules.length})
                </button>
              )}
            </div>

            {/* Filter Rules - Horizontal Cards */}
            {filterRules.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                {filterRules.map((rule, index) => (
                  <div key={rule.id} className="flex items-center gap-1.5 px-2 py-1.5 bg-white rounded-md border border-slate-200 shadow-sm">
                    {/* Rule Number */}
                    <span className="text-xs text-slate-400 font-medium w-4 text-center">{index + 1}.</span>

                    {/* Column Selector */}
                    <select
                      value={rule.column}
                      onChange={(e) => updateRule(rule.id, 'column', e.target.value)}
                      className="w-[130px] px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      {availableVars.map((variable) => (
                        <option key={variable} value={variable}>{variable}</option>
                      ))}
                    </select>

                    {/* Operator Selector */}
                    <select
                      value={rule.operator}
                      onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}
                      className="w-[120px] px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      {filterOperators.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>

                    {/* Value Input */}
                    <input
                      type="number"
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, 'value', parseFloat(e.target.value) || 0)}
                      className="w-[70px] px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                      style={{ fontFamily: 'JetBrains Mono, Roboto Mono, monospace' }}
                      step="0.01"
                    />

                    {/* Remove Individual Rule */}
                    <button
                      onClick={() => setFilterRules(filterRules.filter(r => r.id !== rule.id))}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar regla"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-full mx-auto space-y-6">
          {/* Statistics Selection Panel */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200">
            <div className="px-8 py-5 border-b border-slate-200 bg-gradient-to-r from-teal-50 via-blue-50 to-indigo-50">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Seleccione los estadísticos a mostrar:
              </h3>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Tendencia Central */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-red-700 mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="8" />
                    </svg>
                    <span className="font-medium">Tendencia Central</span>
                  </div>

                  {[
                    { key: 'n', label: 'N (Conteo)', state: tendenciaCentral.n, setter: (v: boolean) => setTendenciaCentral({ ...tendenciaCentral, n: v }) },
                    { key: 'media', label: 'Media', state: tendenciaCentral.media, setter: (v: boolean) => setTendenciaCentral({ ...tendenciaCentral, media: v }) },
                    { key: 'mediana', label: 'Mediana', state: tendenciaCentral.mediana, setter: (v: boolean) => setTendenciaCentral({ ...tendenciaCentral, mediana: v }) },
                    { key: 'moda', label: 'Moda', state: tendenciaCentral.moda, setter: (v: boolean) => setTendenciaCentral({ ...tendenciaCentral, moda: v }) },
                    { key: 'trimmed_mean_5', label: 'Media Recortada 5%', state: tendenciaCentral.trimmed_mean_5, setter: (v: boolean) => setTendenciaCentral({ ...tendenciaCentral, trimmed_mean_5: v }) },
                    { key: 'suma', label: 'Suma', state: tendenciaCentral.suma, setter: (v: boolean) => setTendenciaCentral({ ...tendenciaCentral, suma: v }) },
                    { key: 'media_geometrica', label: 'Media Geométrica', state: tendenciaCentral.media_geometrica, setter: (v: boolean) => setTendenciaCentral({ ...tendenciaCentral, media_geometrica: v }) },
                  ].map(({ key, label, state, setter }) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state}
                        onChange={(e) => setter(e.target.checked)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{label}</span>
                    </label>
                  ))}
                </div>

                {/* Dispersión */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700 mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 10h4M13 10h4M10 3v4M10 13v4" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span className="font-medium">Dispersión</span>
                  </div>

                  {[
                    { key: 'desvTipica', label: 'Desviación Típica', state: dispersion.desvTipica, setter: (v: boolean) => setDispersion({ ...dispersion, desvTipica: v }) },
                    { key: 'varianza', label: 'Varianza', state: dispersion.varianza, setter: (v: boolean) => setDispersion({ ...dispersion, varianza: v }) },
                    { key: 'minimo', label: 'Mínimo', state: dispersion.minimo, setter: (v: boolean) => setDispersion({ ...dispersion, minimo: v }) },
                    { key: 'maximo', label: 'Máximo', state: dispersion.maximo, setter: (v: boolean) => setDispersion({ ...dispersion, maximo: v }) },
                    { key: 'recorrido', label: 'Recorrido (Rango)', state: dispersion.recorrido, setter: (v: boolean) => setDispersion({ ...dispersion, recorrido: v }) },
                    { key: 'coefVariacion', label: 'Coef. Variación (%)', state: dispersion.coefVariacion, setter: (v: boolean) => setDispersion({ ...dispersion, coefVariacion: v }) },
                    { key: 'rangoIntercuartilico', label: 'Rango Intercuartílico', state: dispersion.rangoIntercuartilico, setter: (v: boolean) => setDispersion({ ...dispersion, rangoIntercuartilico: v }) },
                    { key: 'errorEstMedia', label: 'Error Est. Media (SEM)', state: dispersion.errorEstMedia, setter: (v: boolean) => setDispersion({ ...dispersion, errorEstMedia: v }) },
                  ].map(({ key, label, state, setter }) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state}
                        onChange={(e) => setter(e.target.checked)}
                        className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                      />
                      <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{label}</span>
                    </label>
                  ))}
                </div>

                {/* Percentiles */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-blue-700 mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <rect x="2" y="8" width="16" height="4" />
                    </svg>
                    <span className="font-medium">Percentiles</span>
                  </div>

                  {[
                    { key: 'cuartiles', label: 'Cuartiles (Q1, Q3)', state: percentiles.cuartiles, setter: (v: boolean) => setPercentiles({ ...percentiles, cuartiles: v }) },
                    { key: 'p5_p95', label: 'P5 y P95', state: percentiles.p5_p95, setter: (v: boolean) => setPercentiles({ ...percentiles, p5_p95: v }) },
                    { key: 'deciles', label: 'Deciles (10, 20...90)', state: percentiles.deciles, setter: (v: boolean) => setPercentiles({ ...percentiles, deciles: v }) },
                  ].map(({ key, label, state, setter }) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state}
                        onChange={(e) => setter(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{label}</span>
                    </label>
                  ))}

                  {/* Custom Percentile Option */}
                  <div className="pt-2 border-t border-slate-200">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={percentiles.customPercentileEnabled}
                        onChange={(e) => setPercentiles({ ...percentiles, customPercentileEnabled: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Percentil Personalizado</span>
                    </label>
                    {percentiles.customPercentileEnabled && (
                      <div className="mt-2 ml-5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={customPercentileValue}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, Number(e.target.value)));
                            setCustomPercentileValue(val);
                          }}
                          className="w-20 px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="95"
                        />
                        <span className="ml-2 text-xs text-slate-500">P({customPercentileValue})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Forma y Distribución */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-yellow-700 mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2 L14 10 L18 18 L10 14 L2 18 L6 10 Z" />
                    </svg>
                    <span className="font-medium">Forma y Dist.</span>
                  </div>

                  {[
                    { key: 'asimetria', label: 'Asimetría (Skewness)', state: formaDistribucion.asimetria, setter: (v: boolean) => setFormaDistribucion({ ...formaDistribucion, asimetria: v }) },
                    { key: 'curtosis', label: 'Curtosis', state: formaDistribucion.curtosis, setter: (v: boolean) => setFormaDistribucion({ ...formaDistribucion, curtosis: v }) },
                    { key: 'pruebaNormalidad', label: 'Prueba Normalidad', state: formaDistribucion.pruebaNormalidad, setter: (v: boolean) => setFormaDistribucion({ ...formaDistribucion, pruebaNormalidad: v }) },
                  ].map(({ key, label, state, setter }) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state}
                        onChange={(e) => setter(e.target.checked)}
                        className="rounded border-gray-300 text-yellow-700 focus:ring-yellow-500"
                      />
                      <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-medium">Error al cargar datos</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Segment Tabs - Only show when segmented */}
          {!isLoading && !error && hasSegmentation && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1 px-4 border-b border-slate-200 overflow-x-auto">
                <span className="text-xs text-slate-500 mr-2 py-3 whitespace-nowrap">
                  Segmentado por: <span className="font-medium text-slate-700">{segmentBy}</span>
                </span>
                {segments.map((segment) => (
                  <button
                    key={segment}
                    onClick={() => setActiveSegment(segment)}
                    className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeSegment === segment
                      ? 'text-teal-700'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    {segment}
                    {activeSegment === segment && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results Table */}
          {isLoading ? (
            <TableSkeleton rows={6} cols={selectedVars.length + 1} />
          ) : selectedVars.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Selecciona variables para comenzar
                </h3>
                <p className="text-slate-500 text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Elige una o más variables numéricas del selector superior para visualizar la tabla inteligente con sus estadísticos descriptivos.
                </p>
              </div>
            </div>
          ) : data && (
            /* ============================================= */
            /* ORIGINAL TABLE VIEW - Stats rows × Variable columns */
            /* ============================================= */
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-teal-50 via-blue-50 to-indigo-50 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Resultados Estadísticos
                  </h3>
                  <span className="text-xs text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
                    {selectedVars.length} variable(s)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gradient-to-b from-blue-50 to-blue-100 sticky top-0">
                    <tr>
                      <th
                        className="px-6 py-4 text-left font-bold text-blue-900 border-b-2 border-blue-300 sticky left-0 bg-blue-50 z-10"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, minWidth: '200px' }}
                      >
                        Estadístico
                      </th>
                      {selectedVars.map((variable) => (
                        <th
                          key={variable}
                          className="px-6 py-4 text-center font-bold text-blue-900 border-b-2 border-blue-300"
                          style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, minWidth: '150px' }}
                        >
                          {variable}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {/* === TENDENCIA CENTRAL === */}
                    {(tendenciaCentral.n || tendenciaCentral.media || tendenciaCentral.mediana ||
                      tendenciaCentral.moda || tendenciaCentral.trimmed_mean_5 ||
                      tendenciaCentral.suma || tendenciaCentral.media_geometrica) && (
                        <>
                          <tr className="bg-red-50">
                            <td
                              colSpan={selectedVars.length + 1}
                              className="px-6 py-2 text-xs font-bold text-red-700 uppercase tracking-wider"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                            >
                              Tendencia Central
                            </td>
                          </tr>

                          {tendenciaCentral.n && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                N
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {stats?.n ?? '-'}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {tendenciaCentral.media && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Media', 'mean', <span>Media</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.central_tendency.mean)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {tendenciaCentral.mediana && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Mediana', 'median', <span>Mediana</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.central_tendency.median)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {tendenciaCentral.moda && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Moda', 'mode', <span>Moda</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatMode(stats?.central_tendency.mode)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {tendenciaCentral.trimmed_mean_5 && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Media Recortada 5%', 'trimmed_mean_5', <span>Media Recortada 5%</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.central_tendency.trimmed_mean_5)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {tendenciaCentral.suma && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Suma', 'sum', <span>Suma</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.central_tendency.sum)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {tendenciaCentral.media_geometrica && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Media Geométrica', 'geometric_mean', <span>Media Geométrica</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.central_tendency.geometric_mean)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </>
                      )}

                    {/* === DISPERSIÓN === */}
                    {(dispersion.desvTipica || dispersion.varianza || dispersion.minimo ||
                      dispersion.maximo || dispersion.recorrido || dispersion.coefVariacion ||
                      dispersion.rangoIntercuartilico || dispersion.errorEstMedia) && (
                        <>
                          <tr className="bg-purple-100" style={{ backgroundColor: '#f3e8ff' }}>
                            <td
                              colSpan={selectedVars.length + 1}
                              className="px-6 py-2 text-xs font-bold text-purple-800 uppercase tracking-wider"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#6b21a8' }}
                            >
                              Dispersión
                            </td>
                          </tr>

                          {dispersion.desvTipica && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Desviación Típica', 'std_dev', <span>Desviación Típica</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.dispersion.std_dev)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {dispersion.varianza && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Varianza', 'variance', <span>Varianza</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.dispersion.variance)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {dispersion.minimo && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Mínimo', 'min', <span>Mínimo</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.dispersion.min)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {dispersion.maximo && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Máximo', 'max', <span>Máximo</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.dispersion.max)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {dispersion.recorrido && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Recorrido', 'range', <span>Recorrido (Max - Min)</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.dispersion.range)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {dispersion.coefVariacion && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Coef. Variación (%)', 'cv', <span>Coef. Variación (%)</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.dispersion.cv)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {dispersion.recorrido && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Rango', 'range', <span>Rango</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.dispersion.range)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {dispersion.rangoIntercuartilico && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Rango Intercuartílico', 'iqr', <span>Rango Intercuartílico</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.dispersion.iqr)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {dispersion.errorEstMedia && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Error Est. Media (SEM)', 'sem', <span>Error Est. Media (SEM)</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.dispersion.sem, 3)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </>
                      )}

                    {/* === PERCENTILES === */}
                    {(percentiles.cuartiles || percentiles.p5_p95 || percentiles.deciles || percentiles.customPercentileEnabled) && (
                      <>
                        <tr className="bg-blue-50">
                          <td
                            colSpan={selectedVars.length + 1}
                            className="px-6 py-2 text-xs font-bold text-blue-700 uppercase tracking-wider"
                            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                          >
                            Percentiles
                          </td>
                        </tr>

                        {percentiles.cuartiles && (
                          <>
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Q1 (25%)', 'q1', <span>Q1 (25%)</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.percentiles.q1)}
                                  </td>
                                );
                              })}
                            </tr>
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Q3 (75%)', 'q3', <span>Q3 (75%)</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.percentiles.q3)}
                                  </td>
                                );
                              })}
                            </tr>
                          </>
                        )}

                        {percentiles.p5_p95 && (
                          <>
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('P5', 'p5', <span>P5</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.percentiles.p5)}
                                  </td>
                                );
                              })}
                            </tr>
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('P95', 'p95', <span>P95</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.percentiles.p95)}
                                  </td>
                                );
                              })}
                            </tr>
                          </>
                        )}

                        {percentiles.deciles && (
                          <>
                            {['10', '20', '30', '40', '50', '60', '70', '80', '90'].map((decile) => (
                              <tr key={decile} className="bg-white hover:bg-slate-50/50">
                                <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                  D{parseInt(decile) / 10} ({decile}%)
                                </td>
                                {selectedVars.map((variable) => {
                                  const stats = getStats(variable);
                                  return (
                                    <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                      {formatValue(stats?.percentiles.deciles?.[decile])}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </>
                        )}

                        {/* Custom Percentile Row */}
                        {percentiles.customPercentileEnabled && (
                          <tr className="bg-white hover:bg-slate-50/50">
                            <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                              <span className="text-blue-600 font-semibold">P({customPercentileValue})</span>
                            </td>
                            {selectedVars.map((variable) => {
                              const stats = getStats(variable);
                              const customKey = `P${customPercentileValue}`;
                              const customValue = stats?.custom_percentiles_data?.[customKey];
                              return (
                                <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                  {formatValue(customValue)}
                                </td>
                              );
                            })}
                          </tr>
                        )}
                      </>
                    )}

                    {/* === FORMA Y DISTRIBUCIÓN === */}
                    {(formaDistribucion.asimetria || formaDistribucion.curtosis || formaDistribucion.pruebaNormalidad) && (
                      <>
                        <tr className="bg-amber-50">
                          <td
                            colSpan={selectedVars.length + 1}
                            className="px-6 py-2 text-xs font-bold text-amber-700 uppercase tracking-wider"
                            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                          >
                            Forma y Distribución
                          </td>
                        </tr>

                        {formaDistribucion.asimetria && (
                          <tr className="bg-white hover:bg-slate-50/50">
                            <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                              {withTooltip('Asimetría', 'skewness', <span>Asimetría (Skewness)</span>)}
                            </td>
                            {selectedVars.map((variable) => {
                              const stats = getStats(variable);
                              return (
                                <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                  {formatValue(stats?.shape.skewness, 3)}
                                </td>
                              );
                            })}
                          </tr>
                        )}

                        {formaDistribucion.curtosis && (
                          <tr className="bg-white hover:bg-slate-50/50">
                            <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                              {withTooltip('Curtosis', 'kurtosis', <span>Curtosis</span>)}
                            </td>
                            {selectedVars.map((variable) => {
                              const stats = getStats(variable);
                              return (
                                <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                  {formatValue(stats?.shape.kurtosis, 3)}
                                </td>
                              );
                            })}
                          </tr>
                        )}

                        {formaDistribucion.pruebaNormalidad && (
                          <>
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                {withTooltip('Normalidad (p-valor)', 'normality_test', <span>Normalidad (p-valor)</span>)}
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200 font-mono">
                                    {formatValue(stats?.shape.normality_p_value, 4)}
                                  </td>
                                );
                              })}
                            </tr>
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white">
                                Resultado
                              </td>
                              {selectedVars.map((variable) => {
                                const stats = getStats(variable);
                                const badge = getNormalityBadge(stats?.shape.normality_test || 'Indeterminado');
                                return (
                                  <td key={variable} className="px-6 py-3 text-center border-b border-slate-200">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                                      {badge.label}
                                    </span>
                                    {stats?.shape.test_used && (
                                      <div className="text-xs text-slate-500 mt-1">
                                        ({stats.shape.test_used})
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          </>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Toolbar */}
          {data && selectedVars.length > 0 && (
            <ActionToolbar
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
              onAIInterpretation={handleIAInterpretation}
              isAnalyzing={interpreting}
              onContinueToChat={() => console.log('Continue to Chat')}
            />
          )}
        </div>
      </div>

      {/* AI Interpretation Result Modal */}
      <Dialog open={showInterpretationModal} onOpenChange={setShowInterpretationModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-teal-700">
              <Sparkles className="w-5 h-5" />
              Análisis Inteligente de Datos
            </DialogTitle>
            <DialogDescription>
              Interpretación generada automáticamente basada en las estadísticas descriptivas actuales.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 prose prose-slate prose-sm max-w-none bg-slate-50 p-6 rounded-lg border border-slate-100">
            {aiInterpretation ? (
              <ReactMarkdown
                components={{
                  h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-teal-800 mt-4 mb-2" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="text-slate-700" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
                }}
              >
                {aiInterpretation}
              </ReactMarkdown>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Generando análisis...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
