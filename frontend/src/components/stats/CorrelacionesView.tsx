import { ArrowLeft, ChevronDown, Plus, Trash2, Filter, ChevronRight, Play } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ActionToolbar } from './ActionToolbar';
import { useCorrelations, CorrelationResponse } from '../../hooks/useCorrelations';
import { useDataContext } from '../../context/DataContext';

interface CorrelacionesViewProps {
  onBack: () => void;
}

const numericVariables = [
  'FormularioN°',
  'Edad (años cumpl)',
  'Peso [Kg]',
  'Talla (cm)',
  'Talla (m)',
  'IMC',
  'Glucosa [mg/dL]',
  'Presión Arterial [mmHg]'
];

type CorrelationMethod = 'comparar_todos' | 'pearson' | 'spearman' | 'kendall';

interface FilterRule {
  variable: string;
  operator: '=' | '≠' | '>' | '<' | '≥' | '≤';
  value: number;
}

export function CorrelacionesView({ onBack }: CorrelacionesViewProps) {
  // Context and hooks
  const { sessionId, columns: availableColumns } = useDataContext();
  const { calculateCorrelations, loading, error } = useCorrelations();

  // State for correlation data
  const [correlationData, setCorrelationData] = useState<CorrelationResponse | null>(null);

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

  // Get numeric variables from available columns
  const numericVariables = availableColumns.length > 0 ? availableColumns : [
    'FormularioN°', 'Edad (años cumpl)', 'Peso [Kg]', 'Talla (cm)',
    'Talla (m)', 'IMC', 'Glucosa [mg/dL]', 'Presión Arterial [mmHg]'
  ];

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
    setFilterRules([...filterRules, { variable: numericVariables[0], operator: '>', value: 0 }]);
  };

  const removeLastRule = () => {
    if (filterRules.length > 0) {
      setFilterRules(filterRules.slice(0, -1));
    }
  };

  const clearAllRules = () => {
    setFilterRules([]);
  };

  const updateRule = (index: number, field: keyof FilterRule, value: any) => {
    const newRules = [...filterRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setFilterRules(newRules);
  };

  // Handle correlation generation
  const handleGenerate = async () => {
    if (!sessionId || selectedVars.length < 2) {
      console.error('Need session ID and at least 2 variables');
      return;
    }

    const methods = method === 'comparar_todos'
      ? ['pearson', 'spearman', 'kendall']
      : [method];

    const result = await calculateCorrelations(
      sessionId,
      selectedVars,
      methods,
      segmentBy || null
    );

    if (result) {
      setCorrelationData(result);
      // If comparing all methods, set active tab to first method
      if (method === 'comparar_todos') {
        setActiveMethodTab('pearson');
      }
    }
  };

  const getSignificance = (p: number): string => {
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
  };

  // Determine which tabs to show
  const showMethodTabs = method === 'comparar_todos';
  const showSegmentTabs = segmentBy !== '';

  // Segment options based on actual data from API (dynamic)
  const segmentOptions = correlationData && correlationData.segments.length > 0
    ? correlationData.segments
    : ['General'];

  // Auto-update activeSegmentTab when correlationData changes
  useEffect(() => {
    if (correlationData && correlationData.segments.length > 0) {
      // Always set to first available segment when new data arrives
      setActiveSegmentTab(correlationData.segments[0]);
    }
  }, [correlationData]);

  // Reset activeSegmentTab when user changes segmentBy selector
  useEffect(() => {
    setActiveSegmentTab('General');
  }, [segmentBy]);
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
                <div className="absolute top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-10">
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
                  <button
                    onClick={() => {
                      setSegmentBy('Género');
                      setActiveSegmentTab('General');
                      setShowSegmentDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-900"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Género
                  </button>
                  <button
                    onClick={() => {
                      setSegmentBy('Grupo_Control');
                      setActiveSegmentTab('General');
                      setShowSegmentDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-900"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Grupo Control
                  </button>
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
                  {filterRules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                      <select
                        value={rule.variable}
                        onChange={(e) => updateRule(index, 'variable', e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {numericVariables.map((variable: string) => (
                          <option key={variable} value={variable}>{variable}</option>
                        ))}
                      </select>

                      <select
                        value={rule.operator}
                        onChange={(e) => updateRule(index, 'operator', e.target.value as any)}
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
                          onChange={(e) => updateRule(index, 'value', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1.5 bg-white border border-slate-300 rounded-l text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                          style={{ fontFamily: 'JetBrains Mono, Roboto Mono, monospace' }}
                          step="0.01"
                        />
                        <div className="flex flex-col border border-l-0 border-slate-300 rounded-r overflow-hidden">
                          <button
                            onClick={() => updateRule(index, 'value', rule.value + 1)}
                            className="px-1 py-0 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs leading-none"
                          >
                            +
                          </button>
                          <button
                            onClick={() => updateRule(index, 'value', rule.value - 1)}
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

          {/* Generate Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={selectedVars.length < 2 || !sessionId || loading}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2 shadow-sm"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Generar Correlaciones
                </>
              )}
            </button>
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
                <strong>Método activo:</strong> {showMethodTabs ? methodLabels[activeMethodTab] : methodLabels[method]}
                {showSegmentTabs && ` • Segmento: ${activeSegmentTab}`}
              </p>
            </div>

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

                <tbody>
                  {!correlationData && (
                    <tr>
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
                            <p>Seleccione variables y haga clic en "Generar Correlaciones" para comenzar</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {correlationData && selectedVars.map((rowVar, rowIndex) => {
                    const currentMethod = showMethodTabs ? activeMethodTab : (method === 'comparar_todos' ? 'pearson' : method as 'pearson' | 'spearman' | 'kendall');
                    const currentSegment = showSegmentTabs ? activeSegmentTab : 'General';
                    const matrixData = correlationData.tables[currentSegment]?.[currentMethod]?.matrix;

                    if (!matrixData) return null;

                    return (
                      <tr key={rowVar} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}>
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
                          const isStrongCorrelation = pairData.r !== null && Math.abs(pairData.r) > 0.7 && !isDiagonal;

                          return (
                            <td key={colVar} className="px-6 py-2 text-center border-b border-slate-200">
                              <div className="py-2">
                                <div
                                  className={`pb-2 border-b border-slate-200 ${isDiagonal ? 'text-slate-400' : isStrongCorrelation ? 'text-slate-900' : 'text-slate-900'}`}
                                  style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: isDiagonal ? 500 : isStrongCorrelation ? 700 : 600, fontSize: '14px' }}
                                >
                                  {pairData.r !== null ? pairData.r.toFixed(3) : '—'}
                                  {significance && <span className="text-teal-600 ml-0.5">{significance}</span>}
                                </div>

                                <div className="text-slate-700 py-2 border-b border-slate-200 leading-relaxed" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 600, fontSize: '13px' }}>
                                  {pairData.p_value !== null ? (pairData.p_value < 0.001 ? '< 0.001' : pairData.p_value.toFixed(3)) : '—'}
                                </div>

                                <div className="text-slate-700 pt-2 leading-relaxed" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 600, fontSize: '13px' }}>
                                  {pairData.n !== null ? pairData.n : '—'}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-8 py-5 bg-gradient-to-b from-slate-50 to-slate-100 border-t-2 border-slate-300">
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-700 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Método: {showMethodTabs ? methodLabels[activeMethodTab] : methodLabels[method]}
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