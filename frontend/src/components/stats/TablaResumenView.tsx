import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ActionToolbar } from './ActionToolbar';
import { useDataContext } from '../../context/DataContext';
import { getSummaryStats } from '../../api/stats';
import { sendChatMessage } from '../../api/ai';
import { getOptimizedTableContext } from '../../utils/aiContext';
import type { SummaryStatRow, SummaryInsight } from '../../types/stats';

interface TablaResumenViewProps {
  onBack: () => void;
  onNavigateToChat?: (chatId?: string) => void;
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return value.toFixed(digits);
}

function formatPrevalence(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${(value * 100).toFixed(1)}%`;
}

function formatPValue(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  if (value < 0.001) return '< 0.001';
  return value.toFixed(3);
}

// Componente Badge para distribución con Tooltip
function NormalityBadge({ isNormal, pValue }: { isNormal: boolean | null; pValue: number | null }) {
  if (isNormal === null) {
    return <span className="text-xs text-slate-400 italic">N/A</span>;
  }

  return (
    <div className="relative group inline-block">
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-help ${isNormal
        ? 'bg-green-100 text-green-800 border border-green-200'
        : 'bg-amber-100 text-amber-800 border border-amber-200'
        }`}>
        {isNormal ? '✓ Normal' : '⚠ Asimétrica'}
      </span>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10 shadow-lg">
        <div className="font-semibold mb-1">Test Shapiro-Wilk</div>
        <div>p-value: {formatPValue(pValue)}</div>
        <div className="text-slate-300 mt-1">
          {isNormal ? 'No se rechaza normalidad' : 'Se rechaza normalidad (p ≤ 0.05)'}
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
      </div>
    </div>
  );
}

// Componente para mostrar icono según tipo de insight
function InsightIcon({ type }: { type: string }) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />;
    default:
      return <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />;
  }
}

// Componente para barra de completitud
function CompletenessBar({ value, max }: { value: number; max: number }) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  const color = percentage >= 90 ? 'bg-green-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs text-slate-500 font-mono">{percentage}%</span>
    </div>
  );
}

export function TablaResumenView({ onBack, onNavigateToChat }: TablaResumenViewProps) {
  const { sessionId, totalRows } = useDataContext();
  const [data, setData] = useState<SummaryStatRow[]>([]);
  const [insights, setInsights] = useState<SummaryInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Interpretation State
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [contextSent, setContextSent] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      if (!sessionId) {
        setData([]);
        setInsights([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Enviar array vacío para que el backend seleccione automáticamente TODAS las numéricas
        const response = await getSummaryStats(sessionId, []);
        setData(response.data);
        setInsights(response.insights || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
        console.error('Error fetching summary stats:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSummary();
  }, [sessionId]);

  // Función para exportar a Excel usando xlsx
  const handleExportExcel = () => {
    if (data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      // Transformar datos a formato legible para Excel con encabezados en español
      const excelData = data.map((row: SummaryStatRow) => ({
        'Variable': row.variable,
        'Tipo': row.is_binary ? 'Binaria (Si/No)' : 'Numérica',
        'N': row.n,
        'Media / Prevalencia': row.is_binary
          ? (row.media !== null ? `${(row.media * 100).toFixed(1)}%` : '-')
          : (row.media !== null ? row.media : '-'),
        'Mediana': row.is_binary ? '-' : (row.mediana !== null ? row.mediana : '-'),
        'Desviación Estándar': row.is_binary ? '-' : (row.desvio_estandar !== null ? row.desvio_estandar : '-'),
        'Mínimo': row.is_binary ? '-' : (row.minimo !== null ? row.minimo : '-'),
        'Máximo': row.is_binary ? '-' : (row.maximo !== null ? row.maximo : '-'),
        'Q1 (25%)': row.is_binary ? '-' : (row.q1 !== null ? row.q1 : '-'),
        'Q3 (75%)': row.is_binary ? '-' : (row.q3 !== null ? row.q3 : '-'),
        'Nulos': Math.max(0, totalRows - row.n),
      }));

      // Crear worksheet desde los datos
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Ajustar anchos de columna para mejor visualización
      worksheet['!cols'] = [
        { wch: 25 }, // Variable
        { wch: 16 }, // Tipo
        { wch: 10 }, // N
        { wch: 18 }, // Media
        { wch: 12 }, // Mediana
        { wch: 18 }, // Desviación Estándar
        { wch: 12 }, // Mínimo
        { wch: 12 }, // Máximo
        { wch: 12 }, // Q1
        { wch: 12 }, // Q3
        { wch: 10 }, // Nulos
      ];

      // Crear workbook y agregar la hoja
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen Estadístico');

      // Descargar el archivo .xlsx
      XLSX.writeFile(workbook, 'Resumen_Estadistico.xlsx');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al exportar a Excel. Por favor, intenta de nuevo.');
    }
  };

  // Exportar a PDF
  const handleExportPDF = async () => {
    if (data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      const jsPDFModule = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');

      // jsPDF 2.x exports as default, but we need to handle both cases
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen Estadístico', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      const tableData = data.map((row) => {
        const completeness = totalRows > 0 ? `${((row.n / totalRows) * 100).toFixed(1)}%` : '-';
        const distribution = row.is_binary
          ? 'N/A'
          : row.is_normal === null
            ? 'N/A'
            : row.is_normal
              ? 'Normal'
              : 'Asimétrica';

        return [
          row.variable,
          completeness,
          distribution,
          row.n.toString(),
          row.is_binary ? formatPrevalence(row.media) : formatNumber(row.media),
          row.is_binary ? '-' : formatNumber(row.mediana),
          row.is_binary ? '-' : formatNumber(row.desvio_estandar),
          row.is_binary ? '-' : formatNumber(row.minimo),
          row.is_binary ? '-' : formatNumber(row.maximo)
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Variable', 'Completitud', 'Distribución', 'N', 'Media', 'Mediana', 'Desv. Estándar', 'Mín', 'Máx']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [243, 244, 246],
          textColor: [31, 41, 55],
          lineColor: [209, 213, 219],
          lineWidth: 0.1,
          fontStyle: 'bold'
        },
        bodyStyles: {
          lineColor: [209, 213, 219],
          lineWidth: 0.1,
          textColor: [55, 65, 81]
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, cellPadding: 2 }
      });

      doc.save('Resumen_Estadistico.pdf');
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar a PDF. Por favor, intenta de nuevo.');
    }
  };

  const handleAIInterpretation = async () => {
    if (analysisResult || isAnalyzing) return; // Ya existe o está cargando

    setIsAnalyzing(true);
    try {
      const tableContext = getOptimizedTableContext(data, totalRows);
      const prompt = `Analiza la siguiente tabla de estadísticas descriptivas. Resume en 3 puntos clave los hallazgos más relevantes para un reporte clínico:\n\n${tableContext}`;

      const response = await sendChatMessage({
        session_id: sessionId || undefined,
        chat_id: activeChatId || undefined, // Reuse existing chat if available
        message: prompt,
        history: [] // No necesitamos historial previo para esto
      });

      if (response.success) {
        setAnalysisResult(response.response);
        setContextSent(true);

        // Capture chat_id for reuse
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

  const handleContinueToChat = async () => {
    if (!onNavigateToChat || !sessionId) return;

    let finalChatId = activeChatId;

    try {
      setIsNavigating(true);

      // 1. Preparar el contexto completo
      const tableContext = getOptimizedTableContext(data, totalRows);
      const interpretationContext = analysisResult
        ? `\n\nInterpretación Previa Realizada:\n${analysisResult}`
        : '\n\n(El usuario aún no ha solicitado una interpretación automática)';

      const handoffMessage = `**SYSTEM CONTEXT HANDOFF**
    
Estás recibiendo el contexto de la sesión actual de "Tabla Resumen" para asistir al usuario.
    
DATOS ESTRUCTURADOS:
${tableContext}
${interpretationContext}

INSTRUCCIÓN:
El usuario ha sido transferido al chat principal. Mantén este contexto en memoria para responder preguntas sobre estas variables. Saluda brevemente confirmando que tienes los datos.`;

      // 2. Enviar al backend (esperar confirmación) - reuse activeChatId
      const response = await sendChatMessage({
        session_id: sessionId,
        chat_id: activeChatId || undefined,
        message: handoffMessage,
        history: []
      });

      // Capture final chat_id
      if (response.chat_id) {
        finalChatId = response.chat_id;
        setActiveChatId(response.chat_id);
      }

      setContextSent(true);

    } catch (error) {
      console.error("Error transfiriendo contexto:", error);
      // Continuamos de todas formas para no bloquear al usuario
    } finally {
      // 3. Navegar siempre, incluso si falló el pre-calentamiento
      setIsNavigating(false);
      onNavigateToChat(finalChatId || undefined);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6 shadow-sm">
        <div className="flex items-center gap-4">
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
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tabla Resumen del Dataset</h2>
            </div>
            <p className="text-slate-600 leading-relaxed ml-4">Estadísticas descriptivas automáticas para variables numéricas</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Panel de Insights */}
          {insights.length > 0 && !isLoading && (
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl border border-teal-200 shadow-sm">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Hallazgos Automáticos</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {insights.slice(0, 6).map((insight, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 bg-white rounded-lg p-3 border ${insight.type === 'error' ? 'border-red-200' :
                        insight.type === 'warning' ? 'border-amber-200' :
                          insight.type === 'success' ? 'border-green-200' : 'border-blue-200'
                        }`}
                    >
                      <InsightIcon type={insight.type} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{insight.title}</div>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{insight.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Panel de Análisis IA */}
          {(analysisResult || isAnalyzing) && (
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-200 shadow-sm relative overflow-hidden transition-all duration-300">
              {/* Background decoration */}
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
                      {isAnalyzing ? 'Analizando datos...' : 'Análisis de Inteligencia Artificial'}
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
                      {/* Renderizamos el texto con saltos de línea */}
                      {analysisResult!.split('\n').map((line, i) => (
                        <p key={i} className="mb-2 last:mb-0">{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tabla */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-b from-slate-100 to-slate-50 border-b-2 border-slate-300">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-bold text-slate-700 tracking-tight">Variable</th>
                    <th className="text-center px-4 py-4 text-sm font-bold text-slate-700 tracking-tight">Completitud</th>
                    <th className="text-center px-4 py-4 text-sm font-bold text-slate-700 tracking-tight">Distribución</th>
                    <th className="text-center px-6 py-4 text-sm font-bold text-slate-700 tracking-tight">N</th>
                    <th className="text-center px-6 py-4 text-sm font-bold text-slate-700 tracking-tight">Media</th>
                    <th className="text-center px-6 py-4 text-sm font-bold text-slate-700 tracking-tight">Mediana</th>
                    <th className="text-center px-6 py-4 text-sm font-bold text-slate-700 tracking-tight">Desv. Estándar</th>
                    <th className="text-center px-6 py-4 text-sm font-bold text-slate-700 tracking-tight">Mín</th>
                    <th className="text-center px-6 py-4 text-sm font-bold text-slate-700 tracking-tight">Máx</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-sm text-slate-600">
                        Cargando estadísticas...
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-sm text-slate-600">
                        No hay datos para mostrar.
                      </td>
                    </tr>
                  ) : data.map((row, index) => (
                    <tr key={index} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${row.is_binary ? 'bg-purple-50/30' : ''}`}>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {row.variable}
                        {row.is_binary && (
                          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Binaria</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <CompletenessBar value={row.n} max={totalRows} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        {row.is_binary ? (
                          <span className="text-xs text-slate-400 italic">N/A</span>
                        ) : (
                          <NormalityBadge isNormal={row.is_normal} pValue={row.normality_p_value} />
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 text-center font-mono">{row.n}</td>
                      {/* Media y DE: resaltadas si es Normal */}
                      <td className={`px-6 py-4 text-sm text-center font-mono ${row.is_binary ? '' :
                        row.is_normal === true ? 'font-bold text-teal-700 bg-teal-50' :
                          row.is_normal === false ? 'text-slate-400' : 'text-slate-900'
                        }`}>
                        {row.is_binary ? (
                          <span className="text-purple-700 font-semibold">{formatPrevalence(row.media)}</span>
                        ) : (
                          formatNumber(row.media)
                        )}
                      </td>
                      {/* Mediana: resaltada si NO es Normal */}
                      <td className={`px-6 py-4 text-sm text-center font-mono ${row.is_binary ? '' :
                        row.is_normal === false ? 'font-bold text-orange-700 bg-orange-50' :
                          row.is_normal === true ? 'text-slate-400' : 'text-slate-900'
                        }`}>
                        {row.is_binary ? '-' : formatNumber(row.mediana)}
                      </td>
                      {/* DE: resaltada si es Normal */}
                      <td className={`px-6 py-4 text-sm text-center font-mono ${row.is_binary ? '' :
                        row.is_normal === true ? 'font-bold text-teal-700 bg-teal-50' :
                          row.is_normal === false ? 'text-slate-400' : 'text-slate-900'
                        }`}>
                        {row.is_binary ? '-' : formatNumber(row.desvio_estandar)}
                      </td>
                      {/* Mín/Máx: resaltados si NO es Normal */}
                      <td className={`px-6 py-4 text-sm text-center font-mono ${row.is_binary ? '' :
                        row.is_normal === false ? 'font-bold text-orange-700 bg-orange-50' :
                          row.is_normal === true ? 'text-slate-400' : 'text-slate-900'
                        }`}>
                        {row.is_binary ? '-' : formatNumber(row.minimo)}
                      </td>
                      <td className={`px-6 py-4 text-sm text-center font-mono ${row.is_binary ? '' :
                        row.is_normal === false ? 'font-bold text-orange-700 bg-orange-50' :
                          row.is_normal === true ? 'text-slate-400' : 'text-slate-900'
                        }`}>
                        {row.is_binary ? '-' : formatNumber(row.maximo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-8 py-4 bg-gradient-to-b from-slate-50 to-slate-100 border-t border-slate-200">
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Guía de interpretación:</strong> Test de normalidad Shapiro-Wilk (α=0.05).
                <span className="text-teal-700 font-medium"> Celdas teal</span> = métricas recomendadas para distribución normal (Media, DE).
                <span className="text-orange-700 font-medium"> Celdas naranja</span> = métricas recomendadas para distribución asimétrica (Mediana, Rangos).
                Variables <span className="text-purple-700 font-medium">binarias</span> muestran prevalencia.
              </p>
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
        </div>
      </div>
    </div>
  );
}
