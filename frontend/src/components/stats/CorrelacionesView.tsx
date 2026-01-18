import { ArrowLeft, ChevronDown, Plus, Trash2, Filter, ChevronRight, Play } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { ActionToolbar } from './ActionToolbar';
import { useCorrelations, CorrelationResponse, FilterRule } from '../../hooks/useCorrelations';
import { useDataContext } from '../../context/DataContext';


interface CorrelacionesViewProps {
  onBack: () => void;
}

// Helper function to calculate heatmap color based on correlation coefficient
const getCorrelationColor = (r: number | null): string => {
  if (r === null) return 'transparent';

  // Clamp r between -1 and 1
  const clampedR = Math.max(-1, Math.min(1, r));

  // Interpolate between red (-1), white (0), and blue (+1)
  if (clampedR >= 0) {
    // Positive: white to blue
    const intensity = Math.round(clampedR * 255);
    return `rgba(37, 99, 235, ${clampedR * 0.6 + 0.1})`; // Blue with varying opacity
  } else {
    // Negative: white to red
    const intensity = Math.round(Math.abs(clampedR) * 255);
    return `rgba(220, 38, 38, ${Math.abs(clampedR) * 0.6 + 0.1})`; // Red with varying opacity
  }
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

    if (!matrixData) {
      return (
        <tr key="no-data-row">
          <td colSpan={selectedVars.length + 2} className="px-6 py-4 text-center border-b border-slate-200 bg-amber-50/30">
            <p className="text-amber-700 text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              ⚠️ No hay datos disponibles para esta combinación de método y segmento.
            </p>
            <p className="text-amber-600 text-xs mt-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Intente generar las correlaciones nuevamente o seleccione otra configuración.
            </p>
          </td>
        </tr>
      );
    }

    return selectedVars.map((rowVar, rowIndex) => (
      <tr key={`${currentSegment}-${currentMethod}-${rowVar}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}>
        <td className="px-6 py-3 text-slate-900 align-top border-b border-slate-200" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '14px' }}>
          {rowVar}
        </td>

        <td className="px-4 py-2 align-top border-b border-slate-200 bg-slate-50/30">
          <div className="flex flex-col py-2">
            <div className="text-slate-600 pb-2 border-b border-slate-200" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: '13px' }}>Coef. (r)</div>
            <div className="text-slate-600 py-2 border-b border-slate-200 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '12px' }}>p-valor</div>
            <div className="text-slate-600 pt-2 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '12px' }}>N</div>
          </div>
        </td>

        {selectedVars.map((colVar) => {
          const pairData = matrixData[rowVar]?.[colVar];
          if (!pairData) {
            return (
              <td key={colVar} className="px-6 py-2 text-center border-b border-slate-200">
                <div className="py-2">
                  <div className="text-slate-400 pb-2 border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500, fontSize: '14px' }}>—</div>
                  <div className="text-slate-400 py-2 border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500, fontSize: '13px' }}>—</div>
                  <div className="text-slate-400 pt-2" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500, fontSize: '13px' }}>—</div>
                </div>
              </td>
            );
          }

          const significance = pairData.p_value !== null ? getSignificance(pairData.p_value) : '';
          const isDiagonal = rowVar === colVar;
          const correlationClassification = getCorrelationClassification(pairData.r);
          const isStrongCorrelation = !isDiagonal && correlationClassification.label.startsWith('Fuerte');
          const shouldUseContrastText = !isDiagonal && correlationClassification.label.startsWith('Fuerte');
          const correlationTooltip = `Correlación: ${pairData.r !== null ? pairData.r.toFixed(2) : '—'} (${correlationClassification.label}) entre ${rowVar} y ${colVar}`;

          // Calculate heatmap background color
          const bgColor = getCorrelationColor(pairData.r);
          const textColor = shouldUseContrastText ? 'white' : 'inherit';

          return (
            <td
              key={colVar}
              className="px-6 py-2 text-center border-b border-slate-200 transition-colors"
              style={{ backgroundColor: bgColor }}
              title={correlationTooltip}
            >
              <div className="py-2">
                <div
                  className={`pb-2 border-b border-slate-200/50 ${isDiagonal ? 'text-slate-500' : ''}`}
                  style={{
                    fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace',
                    fontWeight: isDiagonal ? 500 : isStrongCorrelation ? 700 : 600,
                    fontSize: '14px',
                    color: !isDiagonal ? textColor : undefined
                  }}
                >
                  {pairData.r !== null ? pairData.r.toFixed(3) : '—'}
                  {significance && <span className="ml-0.5" style={{ color: shouldUseContrastText ? '#fef08a' : '#0d9488' }}>{significance}</span>}
                </div>

                <div
                  className="py-2 border-b border-slate-200/50 leading-relaxed"
                  style={{
                    fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: !isDiagonal ? textColor : '#64748b'
                  }}
                >
                  {pairData.p_value !== null ? (pairData.p_value < 0.001 ? '< 0.001' : pairData.p_value.toFixed(3)) : '—'}
                </div>

                <div
                  className="pt-2 leading-relaxed"
                  style={{
                    fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: !isDiagonal ? textColor : '#64748b'
                  }}
                >
                  {pairData.n !== null ? pairData.n : '—'}
                </div>
              </div>
            </td>
          );
        })}
      </tr>
    ));
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
                    {/* Method Header */}
                    <div className="px-6 py-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200">
                      <h4 className="text-base font-bold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {subMethod === 'pearson' ? 'Correlación de Pearson' : subMethod === 'spearman' ? 'rho de Spearman' : 'tau de Kendall'}
                      </h4>
                    </div>
                    {/* Correlation Table for this method */}
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-b from-slate-50 to-slate-100">
                          <th className="px-6 py-4 text-left text-slate-700 border-b border-slate-300" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '14px' }}>
                            Variable
                          </th>
                          <th className="px-6 py-4 text-center text-slate-700 border-b border-slate-300 bg-slate-50/50" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '14px' }}>
                            Métrica
                          </th>
                          {selectedVars.map((variable) => (
                            <th key={variable} className="px-6 py-4 text-center text-slate-700 border-b border-slate-300 min-w-[140px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '14px' }}>
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
                ))}
              </div>
            ) : (
              // SINGLE METHOD MODE: Render one table
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-b from-slate-50 to-slate-100">
                      <th className="px-6 py-4 text-left text-slate-700 border-b border-slate-300" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '14px' }}>
                        Variable
                      </th>
                      <th className="px-6 py-4 text-center text-slate-700 border-b border-slate-300 bg-slate-50/50" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '14px' }}>
                        Métrica
                      </th>
                      {selectedVars.map((variable) => (
                        <th key={variable} className="px-6 py-4 text-center text-slate-700 border-b border-slate-300 min-w-[140px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '14px' }}>
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
            )}

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

            <ActionToolbar />
          </div>
        </div>
      </div>
    </div>
  );
}
