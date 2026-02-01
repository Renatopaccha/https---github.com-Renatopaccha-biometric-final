import { ArrowLeft, ChevronDown, Info, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ActionToolbar } from './ActionToolbar';
import { getSmartTableStats } from '../../api/stats';
import { useDataContext } from '../../context/DataContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import type { SmartTableColumnStats, SmartTableResponse } from '../../types/stats';

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
  const { sessionId, columns: allColumns } = useDataContext();

  // Use all columns as available variables (backend will validate which are numeric)
  const availableVars = allColumns || [];

  // Selected variables
  const [selectedVars, setSelectedVars] = useState<string[]>([]);
  const [showVarsDropdown, setShowVarsDropdown] = useState(false);

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

  const varsRef = useRef<HTMLDivElement>(null);

  // Auto-select first 3 variables on mount
  useEffect(() => {
    if (availableVars.length > 0 && selectedVars.length === 0) {
      setSelectedVars(availableVars.slice(0, Math.min(3, availableVars.length)));
    }
  }, [availableVars]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (varsRef.current && !varsRef.current.contains(event.target as Node)) {
        setShowVarsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data when variables change
  const fetchData = useCallback(async () => {
    if (!sessionId || selectedVars.length === 0) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getSmartTableStats(
        sessionId,
        selectedVars,
        percentiles.customPercentileEnabled ? [customPercentileValue] : undefined
      );
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
      console.error('Smart Table fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, selectedVars, percentiles.customPercentileEnabled, customPercentileValue]);

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

  // Get statistics for a variable
  const getStats = (variable: string): SmartTableColumnStats | null => {
    if (!data?.statistics) return null;
    return data.statistics[variable] || null;
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

        {/* Variable Selector */}
        <div className="ml-4">
          <div className="relative max-w-md" ref={varsRef}>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Variables Numéricas a Analizar
            </label>
            <button
              onClick={() => setShowVarsDropdown(!showVarsDropdown)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm shadow-sm"
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
              <div className="absolute top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
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

          {/* Results Table */}
          {isLoading ? (
            <TableSkeleton rows={6} cols={selectedVars.length + 1} />
          ) : selectedVars.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12 text-center">
              <p className="text-slate-500" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Selecciona al menos una variable para ver los estadísticos
              </p>
            </div>
          ) : data && (
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
              onExportExcel={() => console.log('Export Excel')}
              onExportPDF={() => console.log('Export PDF')}
              onAIInterpretation={() => console.log('AI Interpretation')}
              onContinueToChat={() => console.log('Continue to Chat')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
