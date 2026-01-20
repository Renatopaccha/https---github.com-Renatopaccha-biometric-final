import { ArrowLeft, ChevronDown, Loader2, Sparkles, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import { ActionToolbar } from './ActionToolbar';
import { useDataContext } from '../../context/DataContext';
import { getCrosstabStats } from '../../api/stats';
import { sendChatMessage } from '../../api/ai';
import type { ContingencyTableResponse, ContingencyCellData, ContingencyTableResult } from '../../types/stats';

// Estilos para Excel WYSIWYG - Matching UI Design
const excelStyles = {
  mainHeader: {
    fill: { fgColor: { rgb: "D1E4FC" } },  // Blue soft (matching bg-blue-100)
    font: { bold: true, color: { rgb: "1F2937" }, sz: 11 },
    border: {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } }
    },
    alignment: { horizontal: "center", vertical: "center", wrapText: true }
  },
  categoryHeader: {
    fill: { fgColor: { rgb: "E3F2FD" } },  // Very light blue (matching bg-blue-50)
    font: { bold: true, sz: 10, color: { rgb: "1F2937" } },
    border: {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } }
    },
    alignment: { horizontal: "center", vertical: "center" }
  },
  metricLabel: {
    fill: { fgColor: { rgb: "F9FAFB" } },  // Very light gray
    font: { bold: false, sz: 9, color: { rgb: "4B5563" } },
    border: {
      top: { style: "thin", color: { rgb: "E5E7EB" } },
      bottom: { style: "thin", color: { rgb: "E5E7EB" } },
      left: { style: "thin", color: { rgb: "E5E7EB" } },
      right: { style: "thin", color: { rgb: "E5E7EB" } }
    },
    alignment: { horizontal: "left", vertical: "center", indent: 1 }
  },
  categoryCell: {
    font: { bold: true, sz: 10, color: { rgb: "1F2937" } },
    border: {
      top: { style: "thin", color: { rgb: "E5E7EB" } },
      bottom: { style: "thin", color: { rgb: "E5E7EB" } },
      left: { style: "thin", color: { rgb: "E5E7EB" } },
      right: { style: "thin", color: { rgb: "E5E7EB" } }
    },
    alignment: { horizontal: "left", vertical: "center" }
  },
  cellNumber: {
    font: { sz: 10 },
    border: {
      top: { style: "thin", color: { rgb: "E5E7EB" } },
      bottom: { style: "thin", color: { rgb: "E5E7EB" } },
      left: { style: "thin", color: { rgb: "E5E7EB" } },
      right: { style: "thin", color: { rgb: "E5E7EB" } }
    },
    alignment: { horizontal: "center", vertical: "center" }
  },
  totalRow: {
    fill: { fgColor: { rgb: "F1F5F9" } },  // Slate gray
    font: { bold: true, sz: 10 },
    border: {
      top: { style: "medium", color: { rgb: "9CA3AF" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } }
    },
    alignment: { horizontal: "center", vertical: "center" }
  }
};

interface TablasContingenciaViewProps {
  onBack: () => void;
  onNavigateToChat?: (chatId?: string) => void;
}

export function TablasContingenciaView({ onBack, onNavigateToChat }: TablasContingenciaViewProps) {
  const { sessionId, columns } = useDataContext();

  // State for variable selection
  const [rowVar, setRowVar] = useState<string>('');
  const [colVar, setColVar] = useState<string>('');
  const [segmentBy, setSegmentBy] = useState<string>('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['frecuencia', 'pct_fila', 'pct_columna', 'pct_total']);

  // State for active segment (horizontal tabs)
  const [activeSegment, setActiveSegment] = useState<string>('General');

  // State for data
  const [tableData, setTableData] = useState<ContingencyTableResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Interpretation State
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Dropdown states
  const [showRowDropdown, setShowRowDropdown] = useState(false);
  const [showColDropdown, setShowColDropdown] = useState(false);
  const [showSegmentDropdown, setShowSegmentDropdown] = useState(false);
  const [showMetricsDropdown, setShowMetricsDropdown] = useState(false);

  const rowRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(event.target as Node)) {
        setShowRowDropdown(false);
      }
      if (colRef.current && !colRef.current.contains(event.target as Node)) {
        setShowColDropdown(false);
      }
      if (segmentRef.current && !segmentRef.current.contains(event.target as Node)) {
        setShowSegmentDropdown(false);
      }
      if (metricsRef.current && !metricsRef.current.contains(event.target as Node)) {
        setShowMetricsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalized table data structure
  const normalizedTableData = tableData ? {
    segments: tableData.segments || ['General'],
    tables: tableData.tables || { 'General': tableData as any },
    segment_by: tableData.segment_by || null
  } : null;

  const currentTable = normalizedTableData?.tables[activeSegment];

  // Fetch data when variables change
  useEffect(() => {
    const fetchData = async () => {
      if (!sessionId || !rowVar || !colVar) {
        setTableData(null);
        return;
      }

      if (rowVar === colVar) {
        setError('Las variables de fila y columna deben ser diferentes');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getCrosstabStats(sessionId, rowVar, colVar, segmentBy || undefined);
        setTableData(response);

        // Set active segment dynamically based on response
        if (response.segments && response.segments.length > 0) {
          setActiveSegment(response.segments[0]); // Select first available segment
        } else {
          setActiveSegment('General'); // Fallback to 'General'
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al calcular tabla de contingencia');
        setTableData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, rowVar, colVar, segmentBy]);

  // Reset AI state when variables change
  useEffect(() => {
    setAnalysisResult(null);
    setActiveChatId(null);
  }, [rowVar, colVar, activeSegment]);

  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  };

  // ========================================================================
  // AI INTERPRETATION FUNCTIONS
  // ========================================================================

  // Helper: Generate context for AI from contingency table
  const generateContingencyContext = (): string => {
    if (!rowVar || !colVar || !currentTable) {
      return "No hay datos disponibles.";
    }

    let context = `Análisis de Contingencia (Cruce de Variables)${segmentBy ? ` - Segmento: ${activeSegment}` : ''}:\n\n`;
    context += `Variable de Fila: ${rowVar}\n`;
    context += `Variable de Columna: ${colVar}\n\n`;
    context += `Datos del Cruce:\n`;

    // Iterate through rows and columns
    currentTable.row_categories.forEach(rowCat => {
      context += `\nPara ${rowVar} = "${rowCat}":\n`;
      currentTable.col_categories.forEach(colCat => {
        const cellData = currentTable.cells[rowCat][colCat];
        context += `  - ${colVar} = "${colCat}": ${cellData.count} casos (${cellData.row_percent.toFixed(1)}% de fila, ${cellData.col_percent.toFixed(1)}% de columna)\n`;
      });
      const rowTotal = currentTable.row_totals[rowCat];
      context += `  Total: ${rowTotal.count} casos\n`;
    });

    // Add column totals
    context += `\nTotales por ${colVar}:\n`;
    currentTable.col_categories.forEach(colCat => {
      const colTotal = currentTable.col_totals[colCat];
      context += `  - ${colVar} = "${colCat}": ${colTotal.count} casos (${colTotal.col_percent.toFixed(1)}%)\n`;
    });

    context += `\nTotal General: ${currentTable.grand_total} casos\n`;

    // Add chi-square if available
    const tableWithStats = currentTable as any;
    if (tableWithStats.chi_square !== undefined && tableWithStats.p_value !== undefined) {
      context += `\nPrueba Chi-cuadrado:\n`;
      context += `  - χ² = ${tableWithStats.chi_square.toFixed(3)}\n`;
      context += `  - p-value = ${tableWithStats.p_value.toFixed(4)}\n`;
    }

    return context;
  };

  // Handler: AI interpretation
  const handleAIInterpretation = async () => {
    if (analysisResult || isAnalyzing) return; // Already analyzing or result exists

    if (!rowVar || !colVar) {
      alert('Selecciona las variables de fila y columna primero');
      return;
    }

    setIsAnalyzing(true);
    try {
      const contingencyContext = generateContingencyContext();
      const prompt = `Actúa como un experto bioestadístico. Analiza la siguiente tabla de contingencia entre '${rowVar}' y '${colVar}'.

Tu objetivo es determinar si parece haber una asociación o dependencia entre las variables basándote en la distribución de los datos.

Resalta las casillas con mayor frecuencia o desbalances notables. Si hay prueba Chi-cuadrado disponible, interpreta el p-value. Sé breve y concluyente.

${contingencyContext}`;

      const response = await sendChatMessage({
        session_id: sessionId || undefined,
        chat_id: activeChatId || undefined,
        message: prompt,
        history: []
      });

      if (response.success) {
        setAnalysisResult(response.response);
        if (response.chat_id) {
          setActiveChatId(response.chat_id);
        }
      } else {
        setError("No se pudo obtener la interpretación de IA.");
      }
    } catch (err) {
      console.error("AI Error:", err);
      setError("Error de conexión con el servicio de IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler: Continue to chat
  const handleContinueToChat = async () => {
    if (!onNavigateToChat || !sessionId) return;

    let finalChatId = activeChatId;

    try {
      setIsNavigating(true);

      // Si no hay análisis previo, enviar contexto silenciosamente
      if (!activeChatId) {
        const contingencyContext = generateContingencyContext();
        const interpretationContext = analysisResult
          ? `\n\nInterpretación Previa Realizada:\n${analysisResult}`
          : '\n\n(El usuario aún no ha solicitado una interpretación automática)';

        const handoffMessage = `**SYSTEM CONTEXT HANDOFF**
        
Estás recibiendo el contexto de la sesión actual de "Tablas de Contingencia" para asistir al usuario.

DATOS ESTRUCTURADOS:
${contingencyContext}
${interpretationContext}

INSTRUCCIÓN:
El usuario ha sido transferido al chat principal. Mantén este contexto en memoria para responder preguntas sobre la relación entre estas variables. Saluda brevemente confirmando que tienes los datos.`;

        const response = await sendChatMessage({
          session_id: sessionId,
          chat_id: activeChatId || undefined,
          message: handoffMessage,
          history: []
        });

        if (response.chat_id) {
          finalChatId = response.chat_id;
          setActiveChatId(response.chat_id);
        }
      }

    } catch (error) {
      console.error("Error transfiriendo contexto:", error);
    } finally {
      setIsNavigating(false);
      onNavigateToChat(finalChatId || undefined);
    }
  };

  // ========================================================================
  // EXPORT FUNCTIONS
  // ========================================================================

  // Helper: Get metric label
  const getMetricLabel = (metricKey: string): string => {
    const labels: Record<string, string> = {
      'frecuencia': 'N',
      'pct_fila': '% Fila',
      'pct_columna': '% Columna',
      'pct_total': '% Total'
    };
    return labels[metricKey] || metricKey;
  };

  // Helper: Get value from cell for metric
  const getCellValue = (data: ContingencyCellData, metricKey: string): number => {
    switch (metricKey) {
      case 'frecuencia': return data.count;
      case 'pct_fila': return data.row_percent;
      case 'pct_columna': return data.col_percent;
      case 'pct_total': return data.total_percent;
      default: return 0;
    }
  };

  // Exportar a Excel con diseño educativo (merged cells, double headers)
  const handleExportExcel = () => {
    if (!normalizedTableData || !currentTable) return;

    const wb = XLSX.utils.book_new();

    // Iterar sobre todos los segmentos
    normalizedTableData.segments.forEach(segmentName => {
      const table = normalizedTableData.tables[segmentName];
      if (!table) return;

      const ws: XLSX.WorkSheet = {};
      const merges: XLSX.Range[] = [];
      let rowNum = 0;

      const numColCategories = table.col_categories.length;
      const metricsCount = selectedMetrics.length;
      const totalCol = 2 + numColCategories;

      // ========================================================================
      // HEADER ROW 1: [Row Variable] | Métrica | [Col Variable (merged)] | TOTAL
      // ========================================================================

      // A1: Row variable name (merge with A2)
      const cellA1 = XLSX.utils.encode_cell({ r: 0, c: 0 });
      ws[cellA1] = { v: table.row_variable, t: 's', s: excelStyles.mainHeader };
      merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });

      // B1: "Métrica" (merge with B2)
      const cellB1 = XLSX.utils.encode_cell({ r: 0, c: 1 });
      ws[cellB1] = { v: 'Métrica', t: 's', s: excelStyles.mainHeader };
      merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });

      // C1: Column variable name (merged horizontally)
      const cellC1 = XLSX.utils.encode_cell({ r: 0, c: 2 });
      ws[cellC1] = { v: table.col_variable, t: 's', s: excelStyles.mainHeader };
      merges.push({ s: { r: 0, c: 2 }, e: { r: 0, c: 1 + numColCategories } });

      // Last column: "TOTAL" (merge vertically)
      const cellTotal1 = XLSX.utils.encode_cell({ r: 0, c: totalCol });
      ws[cellTotal1] = { v: 'TOTAL', t: 's', s: excelStyles.mainHeader };
      merges.push({ s: { r: 0, c: totalCol }, e: { r: 1, c: totalCol } });

      rowNum = 1;

      // ========================================================================
      // HEADER ROW 2: Column categories
      // ========================================================================

      table.col_categories.forEach((colCat, idx) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowNum, c: 2 + idx });
        ws[cellRef] = { v: String(colCat), t: 's', s: excelStyles.categoryHeader };
      });

      rowNum = 2;

      // ========================================================================
      // DATA ROWS: Each row category has N metric sub-rows
      // ========================================================================

      table.row_categories.forEach(rowCat => {
        const startRow = rowNum;

        selectedMetrics.forEach((metricKey, metricIdx) => {
          const metricLabel = getMetricLabel(metricKey);

          // Column A: Category name (merged vertically)
          const cellRefA = XLSX.utils.encode_cell({ r: rowNum, c: 0 });
          if (metricIdx === 0) {
            ws[cellRefA] = { v: String(rowCat), t: 's', s: excelStyles.categoryCell };
          } else {
            ws[cellRefA] = { v: '', t: 's', s: excelStyles.categoryCell };
          }

          // Column B: Metric label
          const cellRefB = XLSX.utils.encode_cell({ r: rowNum, c: 1 });
          ws[cellRefB] = { v: metricLabel, t: 's', s: excelStyles.metricLabel };

          // Data columns
          table.col_categories.forEach((colCat, colIdx) => {
            const cellData = table.cells[rowCat][colCat];
            const value = getCellValue(cellData, metricKey);
            const cellRef = XLSX.utils.encode_cell({ r: rowNum, c: colIdx + 2 });

            if (metricKey === 'frecuencia') {
              ws[cellRef] = { v: value, t: 'n', s: excelStyles.cellNumber };
            } else {
              ws[cellRef] = {
                v: value / 100,
                t: 'n',
                s: { ...excelStyles.cellNumber, numFmt: '0.00%' }
              };
            }
          });

          // Total column
          const totalData = table.row_totals[rowCat];
          const totalValue = getCellValue(totalData, metricKey);
          const cellRefTotal = XLSX.utils.encode_cell({ r: rowNum, c: totalCol });

          if (metricKey === 'frecuencia') {
            ws[cellRefTotal] = { v: totalValue, t: 'n', s: excelStyles.cellNumber };
          } else {
            ws[cellRefTotal] = {
              v: totalValue / 100,
              t: 'n',
              s: { ...excelStyles.cellNumber, numFmt: '0.00%' }
            };
          }

          rowNum++;
        });

        // Merge column A for this category (vertical merge across all metrics)
        if (metricsCount > 1) {
          merges.push({ s: { r: startRow, c: 0 }, e: { r: startRow + metricsCount - 1, c: 0 } });
        }
      });

      // ========================================================================
      // TOTAL ROW
      // ========================================================================

      const totalStartRow = rowNum;

      selectedMetrics.forEach((metricKey, metricIdx) => {
        const metricLabel = getMetricLabel(metricKey);

        // Column A: "TOTAL" (merged vertically)
        const cellRefA = XLSX.utils.encode_cell({ r: rowNum, c: 0 });
        if (metricIdx === 0) {
          ws[cellRefA] = { v: 'TOTAL', t: 's', s: excelStyles.totalRow };
        } else {
          ws[cellRefA] = { v: '', t: 's', s: excelStyles.totalRow };
        }

        // Column B: Metric label
        const cellRefB = XLSX.utils.encode_cell({ r: rowNum, c: 1 });
        ws[cellRefB] = { v: metricLabel, t: 's', s: excelStyles.totalRow };

        // Column totals
        table.col_categories.forEach((colCat, colIdx) => {
          const cellData = table.col_totals[colCat];
          const value = getCellValue(cellData, metricKey);
          const cellRef = XLSX.utils.encode_cell({ r: rowNum, c: colIdx + 2 });

          if (metricKey === 'frecuencia') {
            ws[cellRef] = { v: value, t: 'n', s: excelStyles.totalRow };
          } else {
            ws[cellRef] = {
              v: value / 100,
              t: 'n',
              s: { ...excelStyles.totalRow, numFmt: '0.00%' }
            };
          }
        });

        // Grand total
        const grandTotalValue = metricKey === 'frecuencia' ? table.grand_total : 100.0;
        const cellRefTotal = XLSX.utils.encode_cell({ r: rowNum, c: totalCol });

        if (metricKey === 'frecuencia') {
          ws[cellRefTotal] = { v: grandTotalValue, t: 'n', s: excelStyles.totalRow };
        } else {
          ws[cellRefTotal] = {
            v: grandTotalValue / 100,
            t: 'n',
            s: { ...excelStyles.totalRow, numFmt: '0.00%' }
          };
        }

        rowNum++;
      });

      // Merge TOTAL cell in column A
      if (metricsCount > 1) {
        merges.push({ s: { r: totalStartRow, c: 0 }, e: { r: totalStartRow + metricsCount - 1, c: 0 } });
      }

      // ========================================================================
      // FINALIZE WORKSHEET
      // ========================================================================

      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowNum - 1, c: totalCol } });
      ws['!merges'] = merges;
      ws['!cols'] = [
        { wch: 18 },
        { wch: 14 },
        ...table.col_categories.map(() => ({ wch: 12 })),
        { wch: 12 }
      ];
      ws['!rows'] = [
        { hpt: 24 },
        { hpt: 20 }
      ];

      const sheetName = String(segmentName).substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const fileName = `Tabla_Contingencia_${String(rowVar)}_x_${String(colVar)}${segmentBy ? `_por_${String(segmentBy)}` : ''}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Exportar a PDF
  const handleExportPDF = async () => {
    if (!normalizedTableData || !currentTable) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      // Importación dinámica de jspdf y autotable
      const jsPDFModule = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');

      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      const autoTable = autoTableModule.default;

      const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Tabla de Contingencia', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Subtítulo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${String(rowVar)} × ${String(colVar)}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    // Fecha
    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    if (segmentBy) {
      doc.text(`Segmentado por: ${segmentBy}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
    yPos += 10;

    // Iterar sobre todos los segmentos
    normalizedTableData.segments.forEach((segmentName, segIdx) => {
      const table = normalizedTableData.tables[segmentName];
      if (!table) return;

      // Título del segmento
      if (segmentBy && normalizedTableData.segments.length > 1) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Segmento: ${segmentName}`, 14, yPos);
        yPos += 6;
      }

      // Construir datos de la tabla en formato stacked
      const tableHeaders = ['', 'Métrica', ...table.col_categories, 'Total'];
      const tableData: any[] = [];

      // Filas de datos
      table.row_categories.forEach(rowCat => {
        selectedMetrics.forEach((metricKey, metricIdx) => {
          const metricLabel = getMetricLabel(metricKey);
          const row = [
            metricIdx === 0 ? rowCat : '',  // Solo mostrar categoría en primera fila
            metricLabel
          ];

          // Valores de columnas
          table.col_categories.forEach(colCat => {
            const cellData = table.cells[rowCat][colCat];
            const value = getCellValue(cellData, metricKey);
            row.push(metricKey === 'frecuencia' ? value.toString() : value.toFixed(2));
          });

          // Total de fila
          const totalData = table.row_totals[rowCat];
          const totalValue = getCellValue(totalData, metricKey);
          row.push(metricKey === 'frecuencia' ? totalValue.toString() : totalValue.toFixed(2));

          tableData.push(row);
        });
      });

      // Fila TOTAL
      selectedMetrics.forEach((metricKey, metricIdx) => {
        const metricLabel = getMetricLabel(metricKey);
        const row = [
          metricIdx === 0 ? 'TOTAL' : '',
          metricLabel
        ];

        // Totales de columnas
        table.col_categories.forEach(colCat => {
          const cellData = table.col_totals[colCat];
          const value = getCellValue(cellData, metricKey);
          row.push(metricKey === 'frecuencia' ? value.toString() : value.toFixed(2));
        });

        // Grand total
        const grandTotalValue = metricKey === 'frecuencia' ? table.grand_total : 100.0;
        row.push(grandTotalValue.toString());

        tableData.push(row);
      });

      autoTable(doc, {
        startY: yPos,
        head: [tableHeaders],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [243, 244, 246],
          textColor: [31, 41, 55],
          lineColor: [209, 213, 219],
          lineWidth: 0.1,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          lineColor: [209, 213, 219],
          lineWidth: 0.1,
          textColor: [55, 65, 81],
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 25 },
          1: { halign: 'left', cellWidth: 20 }
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, cellPadding: 2 },
        didParseCell: (data) => {
          // Resaltar fila TOTAL
          const dataRowIndex = data.row.index;
          const totalRowStart = table.row_categories.length * selectedMetrics.length;
          if (dataRowIndex >= totalRowStart) {
            data.cell.styles.fillColor = [229, 231, 235];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Nueva página si es necesario (y no es el último segmento)
      if (yPos > 250 && segIdx < normalizedTableData.segments.length - 1) {
        doc.addPage();
        yPos = 20;
      }
    });

      const fileName = `Tabla_Contingencia_${String(rowVar)}_x_${String(colVar)}${segmentBy ? `_por_${String(segmentBy)}` : ''}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar a PDF. Por favor, intenta de nuevo.');
    }
  };

  const metrics = [
    { value: 'frecuencia', label: 'N (Frecuencia)' },
    { value: 'pct_fila', label: '% Fila' },
    { value: 'pct_columna', label: '% Columna' },
    { value: 'pct_total', label: '% Total' }
  ];

  // Component for rendering individual cell metrics
  const MetricCell = ({ data, isTotal = false }: { data: ContingencyCellData; isTotal?: boolean }) => {
    const showN = selectedMetrics.includes('frecuencia');
    const showPctRow = selectedMetrics.includes('pct_fila');
    const showPctCol = selectedMetrics.includes('pct_columna');
    const showPctTotal = selectedMetrics.includes('pct_total');

    return (
      <div className="py-3">
        {showN && (
          <div className={`text-center mb-1 text-slate-900`} style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: isTotal ? 700 : 600, fontSize: '14px' }}>
            {data.count}
          </div>
        )}
        {showPctRow && (
          <div className="text-slate-700 text-center leading-relaxed" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: isTotal ? 700 : 600, fontSize: '13px' }}>
            {data.row_percent.toFixed(2)}%
          </div>
        )}
        {showPctCol && (
          <div className="text-slate-700 text-center leading-relaxed" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: isTotal ? 700 : 600, fontSize: '13px' }}>
            {data.col_percent.toFixed(2)}%
          </div>
        )}
        {showPctTotal && (
          <div className="text-slate-700 text-center leading-relaxed" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: isTotal ? 700 : 600, fontSize: '13px' }}>
            {data.total_percent.toFixed(2)}%
          </div>
        )}
      </div>
    );
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
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-6 bg-gradient-to-b from-teal-500 to-teal-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tablas de Contingencia</h2>
            </div>
            <p className="text-slate-600 leading-relaxed ml-4">Análisis de relación entre variables categóricas</p>
          </div>
        </div>

        {/* Control Bar */}
        <div className="flex items-center gap-3 ml-4 flex-wrap">
          {/* Row Variable Dropdown */}
          <div className="relative" ref={rowRef}>
            <button
              onClick={() => setShowRowDropdown(!showRowDropdown)}
              className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm min-w-[220px] shadow-sm"
            >
              <span className="text-slate-700">
                {rowVar ? `Fila: ${rowVar}` : 'Variable Fila'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-500 ml-auto" />
            </button>

            {showRowDropdown && (
              <div className="absolute top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                {columns.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500 italic">
                    No hay columnas disponibles
                  </div>
                ) : (
                  columns.map((column) => (
                    <button
                      key={column}
                      onClick={() => {
                        setRowVar(column);
                        setShowRowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-900"
                    >
                      {column}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Column Variable Dropdown */}
          <div className="relative" ref={colRef}>
            <button
              onClick={() => setShowColDropdown(!showColDropdown)}
              className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm min-w-[220px] shadow-sm"
            >
              <span className="text-slate-700">
                {colVar ? `Columna: ${colVar}` : 'Variable Columna'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-500 ml-auto" />
            </button>

            {showColDropdown && (
              <div className="absolute top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                {columns.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500 italic">
                    No hay columnas disponibles
                  </div>
                ) : (
                  columns.map((column) => (
                    <button
                      key={column}
                      onClick={() => {
                        setColVar(column);
                        setShowColDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-900"
                    >
                      {column}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Segment By Dropdown */}
          <div className="relative" ref={segmentRef}>
            <button
              onClick={() => setShowSegmentDropdown(!showSegmentDropdown)}
              className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm min-w-[220px] shadow-sm"
            >
              <span className="text-slate-700">
                {segmentBy ? `Segmentar por: ${segmentBy}` : 'Segmentar por: (opcional)'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-500 ml-auto" />
            </button>

            {showSegmentDropdown && (
              <div className="absolute top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                <button
                  onClick={() => {
                    setSegmentBy('');
                    setShowSegmentDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-600 italic"
                >
                  Sin segmentación
                </button>
                {columns
                  .filter(c => c !== rowVar && c !== colVar)
                  .map((column) => (
                    <button
                      key={column}
                      onClick={() => {
                        setSegmentBy(column);
                        setShowSegmentDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-900"
                    >
                      {column}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Metrics Dropdown */}
          <div className="relative" ref={metricsRef}>
            <button
              onClick={() => setShowMetricsDropdown(!showMetricsDropdown)}
              className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm min-w-[180px] shadow-sm"
            >
              <span className="text-slate-700">
                Métricas ({selectedMetrics.length})
              </span>
              <ChevronDown className="w-4 h-4 text-slate-500 ml-auto" />
            </button>

            {showMetricsDropdown && (
              <div className="absolute top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-10">
                {metrics.map((metric) => (
                  <label
                    key={metric.value}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes(metric.value)}
                      onChange={() => toggleMetric(metric.value)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-slate-900">{metric.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
              <span className="ml-3 text-slate-600">Calculando tabla de contingencia...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && (!rowVar || !colVar) && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-12 text-center">
              <div className="text-slate-400 mb-4">
                <ChevronDown className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">Selecciona las variables para analizar</h3>
              <p className="text-slate-500">Elige una variable para filas y otra para columnas</p>
            </div>
          )}

          {/* Segment Tabs */}
          {!loading && !error && normalizedTableData && normalizedTableData.segments.length > 1 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
              <div className="flex items-center gap-1 px-4 border-b border-slate-200 overflow-x-auto">
                <span className="text-xs text-slate-500 mr-2 py-3 whitespace-nowrap">
                  Segmentado por: <span className="font-medium text-slate-700">{normalizedTableData.segment_by}</span>
                </span>
                {normalizedTableData.segments.map((segment) => (
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

          {/* Panel de Análisis IA */}
          {(analysisResult || isAnalyzing) && (
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-200 shadow-sm relative overflow-hidden transition-all duration-300 mb-6">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>

              <div className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
                      {isAnalyzing ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {isAnalyzing ? 'Analizando relación entre variables...' : `Análisis de Relación: ${rowVar} vs ${colVar}`}
                    </h3>
                  </div>
                  {!isAnalyzing && (
                    <button
                      onClick={() => setAnalysisResult(null)}
                      className="p-1 hover:bg-black/5 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-5 border border-indigo-100 min-h-[100px]">
                  {isAnalyzing ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-4 bg-indigo-100 rounded w-3/4"></div>
                      <div className="h-4 bg-indigo-100 rounded w-1/2"></div>
                      <div className="h-4 bg-indigo-100 rounded w-5/6"></div>
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-indigo max-w-none text-slate-700">
                      {analysisResult!.split('\n').map((line, i) => (
                        <p key={i} className="mb-2 last:mb-0">{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contingency Table */}
          {!loading && !error && currentTable && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-teal-600 tracking-wide uppercase" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Tabla Cruzada
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight ml-2">
                    {currentTable.row_variable} × {currentTable.col_variable}
                  </h3>
                  <span className="ml-auto text-xs text-slate-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {normalizedTableData.segment_by && activeSegment !== 'General' && `${activeSegment} | `}N = {currentTable.grand_total}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  {/* Table Headers */}
                  <thead>
                    {/* Top-level header with column variable name */}
                    <tr className="bg-gradient-to-b from-blue-50 to-blue-100">
                      <th rowSpan={2} className="px-6 py-4 text-left text-slate-800 border-b-2 border-blue-300" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '15px' }}>
                        {currentTable.row_variable}
                      </th>
                      <th rowSpan={2} className="px-4 py-4 text-center text-slate-700 border-b-2 border-blue-300 bg-blue-50/50" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '14px' }}>
                        Métrica
                      </th>
                      <th colSpan={currentTable.col_categories.length} className="px-6 py-3 text-center text-slate-800 border-b border-blue-300" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '15px' }}>
                        {currentTable.col_variable}
                      </th>
                      <th rowSpan={2} className="px-6 py-4 text-center text-slate-800 border-b-2 border-blue-300 bg-blue-100" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '15px' }}>
                        TOTAL
                      </th>
                    </tr>
                    {/* Second-level header with categories */}
                    <tr className="bg-gradient-to-b from-blue-50 to-blue-100">
                      {currentTable.col_categories.map((colCat) => (
                        <th key={colCat} className="px-6 py-3 text-center text-slate-700 border-b-2 border-blue-300" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '14px' }}>
                          {colCat}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {/* Data Rows */}
                    {currentTable.row_categories.map((rowCat, index) => (
                      <tr key={rowCat} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                        {/* Row Label */}
                        <td className="px-6 py-2 text-slate-900 align-top border-b border-slate-200" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '14px' }}>
                          {rowCat}
                        </td>

                        {/* Metrics Label Column */}
                        <td className="px-4 py-2 align-top border-b border-slate-200 bg-slate-50/30">
                          <div className="flex flex-col gap-1 py-3">
                            {selectedMetrics.includes('frecuencia') && (
                              <div className="text-slate-600" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: '13px' }}>N</div>
                            )}
                            {selectedMetrics.includes('pct_fila') && (
                              <div className="text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '12px' }}>% Fila</div>
                            )}
                            {selectedMetrics.includes('pct_columna') && (
                              <div className="text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '12px' }}>% Columna</div>
                            )}
                            {selectedMetrics.includes('pct_total') && (
                              <div className="text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '12px' }}>% Total</div>
                            )}
                          </div>
                        </td>

                        {/* Data Cells */}
                        {currentTable.col_categories.map((colCat) => (
                          <td key={colCat} className="px-6 border-b border-slate-200">
                            <MetricCell data={currentTable.cells[rowCat][colCat]} />
                          </td>
                        ))}

                        {/* Row Total */}
                        <td className="px-6 border-b border-slate-200 bg-slate-50/30">
                          <MetricCell data={currentTable.row_totals[rowCat]} />
                        </td>
                      </tr>
                    ))}

                    {/* Total Row */}
                    <tr className="bg-gradient-to-b from-slate-100 to-slate-50 border-t-2 border-slate-400">
                      <td className="px-6 py-2 text-slate-900 align-top" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '14px' }}>
                        TOTAL
                      </td>
                      <td className="px-4 py-2 align-top bg-slate-100/50">
                        <div className="flex flex-col gap-1 py-3">
                          {selectedMetrics.includes('frecuencia') && (
                            <div className="text-slate-600" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: '13px' }}>N</div>
                          )}
                          {selectedMetrics.includes('pct_fila') && (
                            <div className="text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '12px' }}>% Fila</div>
                          )}
                          {selectedMetrics.includes('pct_columna') && (
                            <div className="text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '12px' }}>% Columna</div>
                          )}
                          {selectedMetrics.includes('pct_total') && (
                            <div className="text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '12px' }}>% Total</div>
                          )}
                        </div>
                      </td>

                      {/* Column Totals */}
                      {currentTable.col_categories.map((colCat) => (
                        <td key={colCat} className="px-6 bg-slate-100/50">
                          <MetricCell data={currentTable.col_totals[colCat]} isTotal />
                        </td>
                      ))}

                      {/* Grand Total */}
                      <td className="px-6 bg-slate-100">
                        <div className="py-3">
                          {selectedMetrics.includes('frecuencia') && (
                            <div className="text-center mb-1 text-slate-900" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 700, fontSize: '14px' }}>
                              {currentTable.grand_total}
                            </div>
                          )}
                          {selectedMetrics.includes('pct_fila') && (
                            <div className="text-slate-700 text-center leading-relaxed" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 700, fontSize: '13px' }}>
                              100.00%
                            </div>
                          )}
                          {selectedMetrics.includes('pct_columna') && (
                            <div className="text-slate-700 text-center leading-relaxed" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 700, fontSize: '13px' }}>
                              100.00%
                            </div>
                          )}
                          {selectedMetrics.includes('pct_total') && (
                            <div className="text-slate-700 text-center leading-relaxed" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 700, fontSize: '13px' }}>
                              100.00%
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <ActionToolbar
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                onAIInterpretation={handleAIInterpretation}
                onContinueToChat={handleContinueToChat}
                isAnalyzing={isAnalyzing}
                isNavigating={isNavigating}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}