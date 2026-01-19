import { ArrowLeft, ChevronDown, Plus, Trash2, Filter, ChevronRight, Play } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx-js-style';
import { ActionToolbar } from './ActionToolbar';
import { useCorrelations, CorrelationResponse, FilterRule } from '../../hooks/useCorrelations';
import { useDataContext } from '../../context/DataContext';


interface CorrelacionesViewProps {
  onBack: () => void;
}

// Academic-style cell background - softer, educational look
const getCellBackground = (value: number | null, isDiagonal: boolean): string => {
  if (isDiagonal) {
    return 'bg-blue-50/80'; // Soft blue highlight for diagonal
  }
  if (value === null) {
    return 'bg-white';
  }
  const absVal = Math.abs(value);
  if (absVal >= 0.7) {
    return 'bg-blue-50/60'; // Slight highlight for strong correlations
  }
  return 'bg-white';
};

// Get coefficient text color based on strength
const getCoefColor = (value: number | null, isDiagonal: boolean): string => {
  if (isDiagonal) {
    return 'text-blue-600'; // Blue for diagonal
  }
  if (value === null) {
    return 'text-slate-400';
  }
  const absVal = Math.abs(value);
  if (absVal >= 0.7) {
    return 'text-blue-600 font-bold'; // Strong = bold blue
  }
  if (absVal >= 0.3) {
    return 'text-slate-800'; // Moderate = dark text
  }
  return 'text-slate-500'; // Weak = lighter text
};

// Legacy function kept for compatibility
const getCellStyles = (value: number | null, isDiagonal: boolean): string => {
  if (isDiagonal || value === null) {
    return 'bg-slate-50 text-slate-400';
  }

  if (value <= -0.7) {
    return 'bg-rose-500/90 text-white';
  }

  if (value <= -0.3) {
    return 'bg-rose-200 text-rose-900';
  }

  if (value < 0.3) {
    return 'bg-slate-50 text-slate-400';
  }

  if (value < 0.7) {
    return 'bg-indigo-200 text-indigo-900';
  }

  return 'bg-indigo-500/90 text-white';
};

const getCorrelationClassification = (r: number | null): { label: string; tone: 'positive' | 'negative' | 'neutral' } => {
  if (r === null) {
    return { label: 'Neutra', tone: 'neutral' };
  }

  const absR = Math.abs(r);

  if (absR < 0.3) {
    return { label: 'Neutra', tone: 'neutral' };
  }

  if (absR < 0.7) {
    return { label: 'Moderada', tone: r >= 0 ? 'positive' : 'negative' };
  }

  return { label: r >= 0 ? 'Fuerte Positiva' : 'Fuerte Negativa', tone: r >= 0 ? 'positive' : 'negative' };
};

type CorrelationMethod = 'comparar_todos' | 'pearson' | 'spearman' | 'kendall';

// Excel styles for correlation matrix - academic look
const excelStyles = {
  header: {
    fill: { fgColor: { rgb: "F2F2F2" } },
    font: { bold: true, color: { rgb: "444746" }, sz: 11 },
    border: {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "medium", color: { rgb: "9CA3AF" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } }
    },
    alignment: { horizontal: "center", vertical: "center" }
  },
  diagonal: {
    fill: { fgColor: { rgb: "EBF8FF" } }, // Light blue for diagonal
    font: { bold: true, color: { rgb: "2563EB" }, sz: 10 },
    border: {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } }
    },
    alignment: { horizontal: "center", vertical: "center" }
  },
  strong: {
    fill: { fgColor: { rgb: "DBEAFE" } }, // Soft blue for strong correlations
    font: { bold: true, color: { rgb: "1D4ED8" }, sz: 10 },
    border: {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } }
    },
    alignment: { horizontal: "center", vertical: "center" }
  },
  cell: {
    font: { sz: 10, color: { rgb: "374151" } },
    border: {
      top: { style: "thin", color: { rgb: "E5E7EB" } },
      bottom: { style: "thin", color: { rgb: "E5E7EB" } },
      left: { style: "thin", color: { rgb: "E5E7EB" } },
      right: { style: "thin", color: { rgb: "E5E7EB" } }
    },
    alignment: { horizontal: "center", vertical: "center" }
  },
  variableLabel: {
    fill: { fgColor: { rgb: "F8FAFC" } },
    font: { bold: true, color: { rgb: "1E293B" }, sz: 10 },
    border: {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } }
    },
    alignment: { horizontal: "left", vertical: "center" }
  }
};

// FilterRule interface is now imported from the hook

export function CorrelacionesView({ onBack }: CorrelacionesViewProps) {
  // Context and hooks
  const { sessionId, columns: availableColumns } = useDataContext();
  const { correlationData, calculateCorrelations, loading, error } = useCorrelations();

  // UI state
  const [selectedVars, setSelectedVars] = useState<string[]>([]);
  const [method, setMethod] = useState<CorrelationMethod>('pearson');
  const [segmentBy, setSegmentBy] = useState<string>('');
  const [filterActive, setFilterActive] = useState(false);
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [activeMethodTab, setActiveMethodTab] = useState<'pearson' | 'spearman' | 'kendall'>('pearson');
  const [activeSegmentTab, setActiveSegmentTab] = useState<string>('General');

  const [showVarsDropdown, setShowVarsDropdown] = useState(false);
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [showSegmentDropdown, setShowSegmentDropdown] = useState(false);

  const varsRef = useRef<HTMLDivElement>(null);
  const methodRef = useRef<HTMLDivElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);

  // Create stable key for selectedVars to avoid unnecessary re-renders
  const selectedVarsKey = useMemo(() => selectedVars.join(','), [selectedVars]);

  // Effect to trigger calculation automatically with debounce
  useEffect(() => {
    // 1. Avoid firing if not enough variables
    if (selectedVars.length < 2 || !sessionId) {
      return;
    }

    // 2. Manual debounce (500ms)
    const timer = setTimeout(() => {
      const methods = method === 'comparar_todos'
        ? ['pearson', 'spearman', 'kendall']
        : [method];

      // Prepare filters only if active
      const activeFilters = filterActive ? filterRules : [];

      calculateCorrelations(
        sessionId,
        selectedVars,
        methods,
        segmentBy || null,
        activeFilters,  // Pass filters
        filterLogic     // Pass filter logic
      ).then((result) => {
        if (result && method === 'comparar_todos') {
          setActiveMethodTab('pearson');
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedVarsKey, method, segmentBy, sessionId, calculateCorrelations, filterActive, filterRules, filterLogic]);

  // Fetch columns from context when component mounts (if empty)
  const { refreshData } = useDataContext();
  useEffect(() => {
    if (sessionId && availableColumns.length === 0) {
      console.log('[CorrelacionesView] Columns empty, fetching from API...');
      refreshData(0, 1); // Fetch minimal data just to get columns
    }
  }, [sessionId, availableColumns.length, refreshData]);

  // Use actual columns from context (no hardcoded fallback)
  const numericVariables = availableColumns;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (varsRef.current && !varsRef.current.contains(event.target as Node)) {
        setShowVarsDropdown(false);
      }
      if (methodRef.current && !methodRef.current.contains(event.target as Node)) {
        setShowMethodDropdown(false);
      }
      if (segmentRef.current && !segmentRef.current.contains(event.target as Node)) {
        setShowSegmentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleVariable = (variable: string) => {
    setSelectedVars(prev =>
      prev.includes(variable) ? prev.filter(v => v !== variable) : [...prev, variable]
    );
  };

  const methodLabels = {
    comparar_todos: 'Comparar Todos (Pearson / Spearman / Kendall)',
    pearson: 'Coeficiente de Pearson',
    spearman: 'rho de Spearman',
    kendall: 'tau de Kendall'
  };

  const addFilterRule = () => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Date.now().toString();
    setFilterRules([...filterRules, { id, column: numericVariables[0], operator: '>', value: 0 }]);
  };

  const removeLastRule = () => {
    if (filterRules.length > 0) {
      setFilterRules(filterRules.slice(0, -1));
    }
  };

  const clearAllRules = () => {
    setFilterRules([]);
  };

  const updateRule = (id: string, field: keyof FilterRule, value: any) => {
    setFilterRules(prevRules => prevRules.map(rule => (rule.id === id ? { ...rule, [field]: value } : rule)));
  };

  const getSignificance = (p: number): string => {
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
  };

  const numericTextClass = selectedVars.length > 10
    ? 'text-[11px]'
    : selectedVars.length <= 5
      ? 'text-[14px]'
      : 'text-[12px]';

  // Determine which tabs to show
  // In 'comparar_todos' mode, we show all 3 matrices vertically instead of using tabs
  const showMethodTabs = false; // No method tabs - show inline for comparar_todos
  const showSegmentTabs = segmentBy !== '';

  // Generate unique key for tbody to force complete re-mount on data change
  // Includes session_id to ensure uniqueness across different data loads
  const tbodyKey = correlationData
    ? `data-${showMethodTabs ? activeMethodTab : method}-${activeSegmentTab}-${selectedVars.length}-${correlationData.session_id}`
    : 'empty';

  // Segment options based on actual data from API (dynamic)
  const segmentOptions = (correlationData?.segments?.length ?? 0) > 0
    ? correlationData!.segments
    : ['General'];

  // Auto-update activeSegmentTab when correlationData changes
  useEffect(() => {
    if (correlationData?.segments && correlationData.segments.length > 0) {
      // Always set to first available segment when new data arrives
      setActiveSegmentTab(correlationData.segments[0]);
    }
  }, [correlationData]);

  // Reset activeSegmentTab when user changes segmentBy selector
  useEffect(() => {
    setActiveSegmentTab('General');
  }, [segmentBy]);

  // Helper function to render table rows - eliminates IIFE for better React reconciliation
  // methodOverride: For 'comparar_todos' mode, we pass each method explicitly
  // Academic-style design with educational clarity
  const renderTableRows = (methodOverride?: 'pearson' | 'spearman' | 'kendall') => {
    if (!correlationData) {
      // Loading/error states are handled in the outer conditional
      return null;
    }

    // Use methodOverride if provided (for Compare All mode), otherwise fall back to selected method
    const currentMethod = methodOverride
      ? methodOverride
      : (method === 'comparar_todos' ? 'pearson' : method as 'pearson' | 'spearman' | 'kendall');
    const availableSegments = correlationData?.segments || ['General'];
    const currentSegment = showSegmentTabs
      ? (availableSegments.includes(activeSegmentTab) ? activeSegmentTab : availableSegments[0])
      : activeSegmentTab; // Always use activeSegmentTab for proper tracking
    const matrixData = correlationData?.tables?.[currentSegment]?.[currentMethod]?.matrix;

    // Determine metric label based on method
    const metricLabel = currentMethod === 'pearson' ? 'Coeficiente (r)'
      : currentMethod === 'spearman' ? 'Coeficiente (ρ)'
        : 'Coeficiente (τ)';

    if (!matrixData) {
      return (
        <tr key="no-data-row">
          <td colSpan={selectedVars.length + 2} className="px-6 py-8 text-center bg-amber-50/30">
            <p className="text-amber-700 text-base font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              ⚠️ No hay datos disponibles para esta combinación de método y segmento.
            </p>
            <p className="text-amber-600 text-sm mt-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Intente generar las correlaciones nuevamente o seleccione otra configuración.
            </p>
          </td>
        </tr>
      );
    }

    return selectedVars.map((rowVar, rowIndex) => (
      <tr key={`${currentSegment}-${currentMethod}-${rowVar}`}>
        {/* Variable Name Column */}
        <td
          className="py-6 px-6 align-middle text-slate-900 border-r border-b border-slate-200"
          style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '15px', fontWeight: 500 }}
        >
          {rowVar}
        </td>

        {/* Metrics Labels Column */}
        <td className="py-6 px-6 align-middle border-r border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col gap-3 text-slate-600" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}>
            <span>{metricLabel}</span>
            <span>p-valor</span>
            <span>N (pares)</span>
          </div>
        </td>

        {/* Data Cells for each column variable */}
        {selectedVars.map((colVar) => {
          const pairData = matrixData[rowVar]?.[colVar];
          const isDiagonal = rowVar === colVar;

          if (!pairData) {
            return (
              <td
                key={colVar}
                className="py-6 px-6 text-center align-middle border-r border-b border-slate-200 last:border-r-0"
              >
                <div className="flex flex-col gap-3 items-center justify-center text-slate-400" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}>
                  <span>—</span>
                  <span>—</span>
                  <span>—</span>
                </div>
              </td>
            );
          }

          const significance = pairData.p_value !== null ? getSignificance(pairData.p_value) : '';
          const cellBg = getCellBackground(pairData.r, isDiagonal);
          const coefColorClass = getCoefColor(pairData.r, isDiagonal);

          return (
            <td
              key={colVar}
              className={`py-6 px-6 text-center align-middle border-r border-b border-slate-200 last:border-r-0 ${cellBg}`}
            >
              <div className="flex flex-col gap-3 items-center justify-center">
                {/* Coefficient with significance stars */}
                <span
                  className={`text-lg ${coefColorClass}`}
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  {pairData.r !== null ? pairData.r.toFixed(3) : '—'}
                  {significance && (
                    <span className="ml-1 text-amber-600 font-semibold">{significance}</span>
                  )}
                </span>

                {/* p-value */}
                <span
                  className="text-slate-600"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}
                >
                  {pairData.p_value !== null
                    ? (pairData.p_value < 0.001 ? '< 0,001' : pairData.p_value.toFixed(3).replace('.', ','))
                    : '—'}
                </span>

                {/* N (sample size) */}
                <span
                  className="text-slate-600"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}
                >
                  {pairData.n !== null ? pairData.n.toLocaleString('es-ES') : '—'}
                </span>
              </div>
            </td>
          );
        })}
      </tr>
    ));
  };

  // =====================================================
  // EXPORT FUNCTIONS
  // =====================================================

  // Export to Excel with academic styling
  const handleExportExcel = () => {
    if (!correlationData || selectedVars.length < 2) {
      alert('No hay datos de correlación para exportar. Selecciona al menos 2 variables.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const methodsToExport = method === 'comparar_todos'
      ? ['pearson', 'spearman', 'kendall'] as const
      : [method as 'pearson' | 'spearman' | 'kendall'];

    const methodNames: Record<string, string> = {
      pearson: 'Pearson (r)',
      spearman: 'Spearman (ρ)',
      kendall: 'Kendall (τ)'
    };

    for (const currentMethod of methodsToExport) {
      const ws: XLSX.WorkSheet = {};
      let rowNum = 0;

      // Get matrix data for current segment and method
      const matrixData = correlationData?.tables?.[activeSegmentTab]?.[currentMethod]?.matrix;

      if (!matrixData) continue;

      // Title row
      const titleCellRef = XLSX.utils.encode_cell({ r: rowNum, c: 0 });
      ws[titleCellRef] = {
        v: `Matriz de Correlación - ${methodNames[currentMethod]}`,
        t: 's',
        s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'left' } }
      };
      rowNum += 2;

      // Header row (empty cell + variable names)
      const headerCellRef = XLSX.utils.encode_cell({ r: rowNum, c: 0 });
      ws[headerCellRef] = { v: 'Variable', t: 's', s: excelStyles.header };

      selectedVars.forEach((variable, colIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowNum, c: colIdx + 1 });
        ws[cellRef] = { v: variable, t: 's', s: excelStyles.header };
      });
      rowNum++;

      // Data rows
      for (const rowVar of selectedVars) {
        // Variable name in first column
        const labelCellRef = XLSX.utils.encode_cell({ r: rowNum, c: 0 });
        ws[labelCellRef] = { v: rowVar, t: 's', s: excelStyles.variableLabel };

        // Correlation values
        selectedVars.forEach((colVar, colIdx) => {
          const pairData = matrixData[rowVar]?.[colVar];
          const isDiagonal = rowVar === colVar;
          const cellRef = XLSX.utils.encode_cell({ r: rowNum, c: colIdx + 1 });

          const value = pairData?.r !== null && pairData?.r !== undefined
            ? pairData.r.toFixed(3)
            : '—';

          // Apply conditional styling
          let cellStyle = excelStyles.cell;
          if (isDiagonal) {
            cellStyle = excelStyles.diagonal;
          } else if (pairData?.r !== null && Math.abs(pairData.r) >= 0.7) {
            cellStyle = excelStyles.strong;
          }

          ws[cellRef] = {
            v: pairData?.r !== null ? pairData.r : '',
            t: pairData?.r !== null ? 'n' : 's',
            s: cellStyle,
            z: '0.000' // Number format
          };
        });

        rowNum++;
      }

      // Add significance legend
      rowNum += 2;
      const legendRef = XLSX.utils.encode_cell({ r: rowNum, c: 0 });
      ws[legendRef] = {
        v: 'Leyenda: * p < 0.05, ** p < 0.01, *** p < 0.001',
        t: 's',
        s: { font: { italic: true, sz: 9, color: { rgb: '6B7280' } } }
      };

      // Set range
      ws['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: rowNum, c: selectedVars.length }
      });

      // Column widths
      ws['!cols'] = [
        { wch: 20 }, // Variable names column
        ...selectedVars.map(() => ({ wch: 12 }))
      ];

      // Add sheet to workbook
      const sheetName = method === 'comparar_todos'
        ? methodNames[currentMethod].substring(0, 31)
        : 'Correlaciones';

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    // Generate filename
    const filename = `Correlaciones_${method === 'comparar_todos' ? 'Comparativo' : methodNames[method as keyof typeof methodNames]}${segmentBy ? `_${activeSegmentTab}` : ''}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Export to PDF with professional formatting
  const handleExportPDF = async () => {
    if (!correlationData || selectedVars.length < 2) {
      alert('No hay datos de correlación para exportar. Selecciona al menos 2 variables.');
      return;
    }

    // Dynamic imports
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: selectedVars.length > 5 ? 'landscape' : 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Correlaciones', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Metadata
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Variables: ${selectedVars.join(', ')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    if (segmentBy) {
      doc.text(`Segmento activo: ${activeSegmentTab}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
    yPos += 10;

    // Methods to export
    const methodsToExport = method === 'comparar_todos'
      ? ['pearson', 'spearman', 'kendall'] as const
      : [method as 'pearson' | 'spearman' | 'kendall'];

    const methodNames: Record<string, string> = {
      pearson: 'Correlación de Pearson (r)',
      spearman: 'Correlación de Spearman (ρ)',
      kendall: 'Correlación de Kendall (τ)'
    };

    for (const currentMethod of methodsToExport) {
      const matrixData = correlationData?.tables?.[activeSegmentTab]?.[currentMethod]?.matrix;

      if (!matrixData) continue;

      // Method title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(methodNames[currentMethod], 14, yPos);
      yPos += 8;

      // Build table data
      const tableHead = ['Variable', ...selectedVars];
      const tableBody: string[][] = [];

      for (const rowVar of selectedVars) {
        const row: string[] = [rowVar];

        for (const colVar of selectedVars) {
          const pairData = matrixData[rowVar]?.[colVar];
          const significance = pairData?.p_value !== null && pairData?.p_value !== undefined
            ? getSignificance(pairData.p_value)
            : '';

          const value = pairData?.r !== null && pairData?.r !== undefined
            ? `${pairData.r.toFixed(3)}${significance}`
            : '—';

          row.push(value);
        }

        tableBody.push(row);
      }

      // Generate table
      autoTable(doc, {
        startY: yPos,
        head: [tableHead],
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [242, 242, 242],
          textColor: [68, 71, 70],
          lineColor: [209, 213, 219],
          lineWidth: 0.1,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center'
        },
        bodyStyles: {
          lineColor: [209, 213, 219],
          lineWidth: 0.1,
          textColor: [55, 65, 81],
          fontSize: 8,
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold' } // Variable column
        },
        margin: { left: 14, right: 14 },
        styles: { cellPadding: 2 },
        didParseCell: (data) => {
          // Highlight diagonal cells
          if (data.section === 'body' && data.column.index === data.row.index + 1) {
            data.cell.styles.fillColor = [235, 248, 255]; // Light blue
            data.cell.styles.textColor = [37, 99, 235];
            data.cell.styles.fontStyle = 'bold';
          }

          // Highlight strong correlations
          if (data.section === 'body' && data.column.index > 0) {
            const cellValue = String(data.cell.raw || '');
            const numValue = parseFloat(cellValue.replace(/[*]/g, ''));
            if (!isNaN(numValue) && Math.abs(numValue) >= 0.7 && data.column.index !== data.row.index + 1) {
              data.cell.styles.fillColor = [219, 234, 254]; // Soft blue
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // New page if needed
      if (yPos > doc.internal.pageSize.getHeight() - 40 && currentMethod !== methodsToExport[methodsToExport.length - 1]) {
        doc.addPage();
        yPos = 20;
      }
    }

    // Footer legend
    if (yPos < doc.internal.pageSize.getHeight() - 30) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(107, 114, 128);
      doc.text('Leyenda: * p < 0.05, ** p < 0.01, *** p < 0.001', 14, yPos + 5);
    }

    // Save PDF
    const filename = `Correlaciones_${method === 'comparar_todos' ? 'Comparativo' : method}${segmentBy ? `_${activeSegmentTab}` : ''}.pdf`;
    doc.save(filename);
  };

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
                Correlación Global
              </h2>
            </div>
            <p className="text-slate-600 leading-relaxed ml-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Matriz de correlación con coeficiente (r), p-valor y N por pares
            </p>
          </div>
        </div>

        {/* Top Control Bars */}
        <div className="ml-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Bar 1: Variables Selector */}
            <div className="relative" ref={varsRef}>
              <label className="text-xs font-medium text-slate-700 mb-1.5 block" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Seleccionar Variables
              </label>
              <button
                onClick={() => setShowVarsDropdown(!showVarsDropdown)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm shadow-sm"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                <span className="text-slate-700 flex-1 text-left">
                  {selectedVars.length === 0
                    ? 'Seleccionar variables (Mín. 2)'
                    : `${selectedVars.length} variables seleccionadas`}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {showVarsDropdown && (
                <div className="absolute top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                  {numericVariables.map((variable: string) => (
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
                  ))}
                </div>
              )}
            </div>

            {/* Bar 2: Method Selector */}
            <div className="relative" ref={methodRef}>
              <label className="text-xs font-medium text-slate-700 mb-1.5 block" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Método de Correlación
              </label>
              <button
                onClick={() => setShowMethodDropdown(!showMethodDropdown)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm shadow-sm"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                <span className="text-slate-900 flex-1 text-left font-medium">{methodLabels[method]}</span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {showMethodDropdown && (
                <div className="absolute top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      setMethod('comparar_todos');
                      setShowMethodDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-200 ${method === 'comparar_todos' ? 'bg-teal-50 text-teal-900 font-medium' : 'text-slate-900'}`}
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Comparar Todos (Pearson / Spearman / Kendall)
                  </button>
                  <button
                    onClick={() => {
                      setMethod('pearson');
                      setShowMethodDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm ${method === 'pearson' ? 'bg-teal-50 text-teal-900 font-medium' : 'text-slate-900'}`}
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Coeficiente de Pearson
                  </button>
                  <button
                    onClick={() => {
                      setMethod('spearman');
                      setShowMethodDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm ${method === 'spearman' ? 'bg-teal-50 text-teal-900 font-medium' : 'text-slate-900'}`}
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    rho de Spearman
                  </button>
                  <button
                    onClick={() => {
                      setMethod('kendall');
                      setShowMethodDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm ${method === 'kendall' ? 'bg-teal-50 text-teal-900 font-medium' : 'text-slate-900'}`}
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    tau de Kendall
                  </button>
                </div>
              )}
            </div>

            {/* Bar 3: Segment By */}
            <div className="relative" ref={segmentRef}>
              <label className="text-xs font-medium text-slate-700 mb-1.5 block" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Segmentar por (Opcional)
              </label>
              <button
                onClick={() => setShowSegmentDropdown(!showSegmentDropdown)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm shadow-sm"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                <span className="text-slate-700 flex-1 text-left">
                  {segmentBy === '' ? 'Sin segmentación' : segmentBy}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {showSegmentDropdown && (
                <div className="absolute top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                  <button
                    onClick={() => {
                      setSegmentBy('');
                      setActiveSegmentTab('General');
                      setShowSegmentDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-600 italic"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Sin segmentación
                  </button>
                  {availableColumns.map((col) => (
                    <button
                      key={col}
                      onClick={() => {
                        setSegmentBy(col);
                        setActiveSegmentTab('General');
                        setShowSegmentDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-900"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Advanced Filter Section */}
          <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
            >
              <Filter className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900 flex-1 text-left" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Filtros Avanzados
              </h3>
              {filterActive && filterRules.length > 0 && (
                <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {filterRules.length} regla{filterRules.length !== 1 ? 's' : ''}
                </span>
              )}
              <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isFilterExpanded ? 'rotate-90' : ''}`} />
            </button>

            {isFilterExpanded && (
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActive}
                      onChange={(e) => setFilterActive(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-medium text-slate-700" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Activar Filtro</span>
                  </label>
                </div>

                {/* Filter Logic */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-slate-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Combinar reglas con:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={filterLogic === 'AND'}
                      onChange={() => setFilterLogic('AND')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-medium text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Y (AND)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={filterLogic === 'OR'}
                      onChange={() => setFilterLogic('OR')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-medium text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>O (OR)</span>
                  </label>
                </div>

                {/* Filter Rules */}
                <div className="space-y-2 mb-3">
                  {filterRules.map((rule) => (
                    <div key={rule.id} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                      <select
                        value={rule.column}
                        onChange={(e) => updateRule(rule.id, 'column', e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {numericVariables.map((variable: string) => (
                          <option key={variable} value={variable}>{variable}</option>
                        ))}
                      </select>

                      <select
                        value={rule.operator}
                        onChange={(e) => updateRule(rule.id, 'operator', e.target.value as any)}
                        className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                        style={{ fontFamily: 'JetBrains Mono, Roboto Mono, monospace' }}
                      >
                        <option value="=">=</option>
                        <option value="≠">≠</option>
                        <option value=">">{'>'}</option>
                        <option value="<">{'<'}</option>
                        <option value="≥">≥</option>
                        <option value="≤">≤</option>
                      </select>

                      <div className="flex items-center">
                        <input
                          type="number"
                          value={rule.value}
                          onChange={(e) => updateRule(rule.id, 'value', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1.5 bg-white border border-slate-300 rounded-l text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                          style={{ fontFamily: 'JetBrains Mono, Roboto Mono, monospace' }}
                          step="0.01"
                        />
                        <div className="flex flex-col border border-l-0 border-slate-300 rounded-r overflow-hidden">
                          <button
                            onClick={() => updateRule(rule.id, 'value', rule.value + 1)}
                            className="px-1 py-0 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs leading-none"
                          >
                            +
                          </button>
                          <button
                            onClick={() => updateRule(rule.id, 'value', rule.value - 1)}
                            className="px-1 py-0 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs leading-none border-t border-slate-300"
                          >
                            −
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Filter Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={addFilterRule}
                    className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs hover:bg-teal-700 transition-colors flex items-center gap-1.5 shadow-sm"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    <Plus className="w-3 h-3" />
                    Agregar Regla
                  </button>
                  <button
                    onClick={removeLastRule}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-xs hover:bg-slate-300 transition-colors flex items-center gap-1.5"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    <Trash2 className="w-3 h-3" />
                    Eliminar Última
                  </button>
                  <button
                    onClick={clearAllRules}
                    className="px-3 py-1.5 text-red-600 rounded text-xs hover:bg-red-50 transition-colors"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Limpiar Reglas
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content with Tabs */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          {/* Tabbed Navigation */}
          {(showMethodTabs || showSegmentTabs) && (
            <div className="mb-6">
              {/* Method Tabs */}
              {showMethodTabs && (
                <div className="bg-white rounded-t-lg border-b-0">
                  <div className="flex items-center gap-1 px-4 border-b border-slate-200">
                    {(['pearson', 'spearman', 'kendall'] as const).map((methodTab) => (
                      <button
                        key={methodTab}
                        onClick={() => setActiveMethodTab(methodTab)}
                        className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeMethodTab === methodTab
                          ? 'text-slate-900'
                          : 'text-slate-600 hover:text-slate-900'
                          }`}
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {methodTab === 'pearson' ? 'Pearson' : methodTab === 'spearman' ? 'Spearman' : 'Kendall'}
                        {activeMethodTab === methodTab && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Segment Tabs */}
              {showSegmentTabs && (
                <div className={`bg-white ${showMethodTabs ? 'border-t border-slate-200' : 'rounded-t-lg'}`}>
                  <div className="flex items-center gap-1 px-4 border-b border-slate-200">
                    <span className="text-xs text-slate-600 mr-2 py-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      Segmentado por: {segmentBy}
                    </span>
                    {segmentOptions.map((segment) => (
                      <button
                        key={segment}
                        onClick={() => setActiveSegmentTab(segment)}
                        className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeSegmentTab === segment
                          ? 'text-slate-900'
                          : 'text-slate-600 hover:text-slate-900'
                          }`}
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {segment}
                        {activeSegmentTab === segment && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Table */}
          <div className={`bg-white ${showMethodTabs || showSegmentTabs ? 'rounded-b-xl' : 'rounded-xl'} shadow-lg border border-slate-200 overflow-hidden`}>
            <div className="px-8 py-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                <strong>Método activo:</strong> {methodLabels[method]}
                {` • Segmento: `}<strong>{activeSegmentTab}</strong>
              </p>
            </div>

            {/* Conditional rendering: Compare All vs Single Method */}
            {method === 'comparar_todos' ? (
              // COMPARE ALL MODE: Render 3 matrices vertically
              <div className="space-y-8">
                {(['pearson', 'spearman', 'kendall'] as const).map((subMethod) => (
                  <div key={subMethod} className="overflow-x-auto">
                    {/* Method Header - Academic Style */}
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-300">
                      <h4 className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {subMethod === 'pearson' ? 'Correlación de Pearson (r)' : subMethod === 'spearman' ? 'Correlación de Spearman (ρ)' : 'Correlación de Kendall (τ)'}
                      </h4>
                    </div>
                    {/* Academic Correlation Table */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm mx-4 my-4">
                      <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f2f2f2' }}>
                            <th
                              className="py-4 px-6 text-left border-r border-b border-slate-200"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '15px', color: '#444746' }}
                            >
                              Variable
                            </th>
                            <th
                              className="py-4 px-6 text-left border-r border-b border-slate-200"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '15px', color: '#444746' }}
                            >
                              Métrica
                            </th>
                            {selectedVars.map((variable, idx) => (
                              <th
                                key={variable}
                                className={`py-4 px-6 text-center border-b border-slate-200 ${idx < selectedVars.length - 1 ? 'border-r' : ''}`}
                                style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '15px', color: '#444746', minWidth: '140px' }}
                              >
                                {variable}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody key={`${tbodyKey}-${subMethod}`}>
                          {!correlationData ? (
                            <tr key="status-row">
                              <td colSpan={selectedVars.length + 2} className="px-6 py-12 text-center">
                                <div className="text-slate-500" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                  {loading ? (
                                    <div className="flex items-center justify-center gap-3">
                                      <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                                      <span>Calculando correlaciones...</span>
                                    </div>
                                  ) : error ? (
                                    <div className="text-red-600">
                                      <p className="font-medium">Error al calcular correlaciones</p>
                                      <p className="text-sm mt-1">{error}</p>
                                    </div>
                                  ) : (
                                    <p>Seleccione al menos 2 variables numéricas para calcular correlaciones</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            renderTableRows(subMethod)
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // SINGLE METHOD MODE: Render one table with academic styling
              <div className="overflow-x-auto">
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm mx-4 my-4">
                  <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f2f2f2' }}>
                        <th
                          className="py-4 px-6 text-left border-r border-b border-slate-200"
                          style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '15px', color: '#444746' }}
                        >
                          Variable
                        </th>
                        <th
                          className="py-4 px-6 text-left border-r border-b border-slate-200"
                          style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '15px', color: '#444746' }}
                        >
                          Métrica
                        </th>
                        {selectedVars.map((variable, idx) => (
                          <th
                            key={variable}
                            className={`py-4 px-6 text-center border-b border-slate-200 ${idx < selectedVars.length - 1 ? 'border-r' : ''}`}
                            style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '15px', color: '#444746', minWidth: '140px' }}
                          >
                            {variable}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody key={tbodyKey}>
                      {!correlationData ? (
                        <tr key="status-row">
                          <td colSpan={selectedVars.length + 2} className="px-6 py-12 text-center">
                            <div className="text-slate-500" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                              {loading ? (
                                <div className="flex items-center justify-center gap-3">
                                  <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                                  <span>Calculando correlaciones...</span>
                                </div>
                              ) : error ? (
                                <div className="text-red-600">
                                  <p className="font-medium">Error al calcular correlaciones</p>
                                  <p className="text-sm mt-1">{error}</p>
                                </div>
                              ) : (
                                <p>Seleccione al menos 2 variables numéricas para calcular correlaciones (Auto-cálculo)</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        renderTableRows()
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="px-8 py-4 border-t border-slate-200 bg-white">
              <div className="space-y-3">
                <div className="h-3 rounded-full bg-gradient-to-r from-rose-500 via-slate-100 to-indigo-500" />
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-slate-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  <span>Correlación Negativa (-1)</span>
                  <span>Sin Relación (0)</span>
                  <span>Correlación Positiva (+1)</span>
                </div>
              </div>
            </div>

            <div className="px-8 py-5 bg-gradient-to-b from-slate-50 to-slate-100 border-t-2 border-slate-300">
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-700 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Método: {methodLabels[method]}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Se resalta r cuando p {'<'} 0.05 (*), p {'<'} 0.01 (**) y p {'<'} 0.001 (***).
                    {filterActive && ` • Filtro activo: ${filterRules.length} regla(s) con lógica ${filterLogic}.`}
                  </p>
                </div>
                <div>
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    ✓ Formato publicación
                  </span>
                </div>
              </div>
            </div>

            <ActionToolbar
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
            />
          </div>
        </div>
      </div>
    </div >
  );
}
