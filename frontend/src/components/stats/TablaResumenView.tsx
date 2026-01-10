import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ActionToolbar } from './ActionToolbar';
import { useDataContext } from '../../context/DataContext';
import { getSummaryStats } from '../../api/stats';
import type { SummaryStatRow, SummaryInsight } from '../../types/stats';

interface TablaResumenViewProps {
  onBack: () => void;
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
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-help ${
        isNormal 
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

export function TablaResumenView({ onBack }: TablaResumenViewProps) {
  const { sessionId, totalRows } = useDataContext();
  const [data, setData] = useState<SummaryStatRow[]>([]);
  const [insights, setInsights] = useState<SummaryInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (data.length === 0) return;

    // Transformar datos a formato legible para Excel con encabezados en español
    const excelData = data.map((row: SummaryStatRow) => ({
      'Variable': row.variable,
      'Tipo': row.is_binary ? 'Binaria (Si/No)' : 'Numérica',
      'N': row.n,
      'Media / Prevalencia': row.is_binary 
        ? (row.media !== null ? `${(row.media * 100).toFixed(1)}%` : '-')
        : row.media,
      'Mediana': row.is_binary ? '-' : row.mediana,
      'Desviación Estándar': row.is_binary ? '-' : row.desvio_estandar,
      'Mínimo': row.is_binary ? '-' : row.minimo,
      'Máximo': row.is_binary ? '-' : row.maximo,
      'Q1 (25%)': row.is_binary ? '-' : row.q1,
      'Q3 (75%)': row.is_binary ? '-' : row.q3,
      'Nulos': Math.max(0, totalRows - row.n),
    }));

    // Crear worksheet desde los datos
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustar anchos de columna para mejor visualización
    worksheet['!cols'] = [
      { wch: 25 }, // Variable
      { wch: 16 }, // Tipo
      { wch: 10 }, // N
      { wch: 12 }, // Media
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
                      className={`flex items-start gap-3 bg-white rounded-lg p-3 border ${
                        insight.type === 'error' ? 'border-red-200' :
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
                      <td className={`px-6 py-4 text-sm text-center font-mono ${
                        row.is_binary ? '' : 
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
                      <td className={`px-6 py-4 text-sm text-center font-mono ${
                        row.is_binary ? '' :
                        row.is_normal === false ? 'font-bold text-orange-700 bg-orange-50' : 
                        row.is_normal === true ? 'text-slate-400' : 'text-slate-900'
                      }`}>
                        {row.is_binary ? '-' : formatNumber(row.mediana)}
                      </td>
                      {/* DE: resaltada si es Normal */}
                      <td className={`px-6 py-4 text-sm text-center font-mono ${
                        row.is_binary ? '' :
                        row.is_normal === true ? 'font-bold text-teal-700 bg-teal-50' : 
                        row.is_normal === false ? 'text-slate-400' : 'text-slate-900'
                      }`}>
                        {row.is_binary ? '-' : formatNumber(row.desvio_estandar)}
                      </td>
                      {/* Mín/Máx: resaltados si NO es Normal */}
                      <td className={`px-6 py-4 text-sm text-center font-mono ${
                        row.is_binary ? '' :
                        row.is_normal === false ? 'font-bold text-orange-700 bg-orange-50' : 
                        row.is_normal === true ? 'text-slate-400' : 'text-slate-900'
                      }`}>
                        {row.is_binary ? '-' : formatNumber(row.minimo)}
                      </td>
                      <td className={`px-6 py-4 text-sm text-center font-mono ${
                        row.is_binary ? '' :
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

            <ActionToolbar onExportExcel={handleExportExcel} />
          </div>
        </div>
      </div>
    </div>
  );
}