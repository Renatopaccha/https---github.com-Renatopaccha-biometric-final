import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ActionToolbar } from './ActionToolbar';

interface TablaInteligenteViewProps {
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
  'Presión Arterial [mmHg]',
  'Colesterol [mg/dL]'
];

// Mock statistical data - now includes all possible statistics
const generateRowData = (variable: string) => ({
  variable,
  n: 5594,
  media: Math.random() * 100 + 20,
  mediana: Math.random() * 100 + 20,
  moda: Math.random() * 100 + 20,
  suma: Math.random() * 10000 + 1000,
  mediaGeometrica: Math.random() * 100 + 20,
  ic95Media: `[${(Math.random() * 100 + 20).toFixed(2)}, ${(Math.random() * 100 + 40).toFixed(2)}]`,
  desvTipica: Math.random() * 15 + 5,
  varianza: Math.random() * 200 + 20,
  coefVariacion: Math.random() * 30 + 10,
  minimo: Math.random() * 20 + 1,
  maximo: Math.random() * 100 + 80,
  recorrido: Math.random() * 80 + 50,
  rangoIntercuartilico: Math.random() * 20 + 10,
  errorEstMedia: Math.random() * 2 + 0.5,
  q25: Math.random() * 50 + 20,
  q50: Math.random() * 60 + 30,
  q75: Math.random() * 80 + 50,
  d10: Math.random() * 30 + 10,
  d20: Math.random() * 40 + 15,
  d30: Math.random() * 50 + 20,
  d40: Math.random() * 55 + 25,
  d60: Math.random() * 70 + 40,
  d70: Math.random() * 75 + 45,
  d80: Math.random() * 85 + 55,
  d90: Math.random() * 95 + 70,
  percentiles: '5: 22.5, 95: 89.3, 99: 95.2',
  asimetria: (Math.random() - 0.5) * 2,
  curtosis: (Math.random() - 0.5) * 2,
  pruebaNormalidad: Math.random() * 0.5
});

export function TablaInteligenteView({ onBack }: TablaInteligenteViewProps) {
  const [selectedVars, setSelectedVars] = useState<string[]>(['Edad (años cumpl)', 'Peso [Kg]', 'IMC']);
  const [segmentBy, setSegmentBy] = useState<string>('');
  const [activeSegmentTab, setActiveSegmentTab] = useState<string>('General');
  const [showVarsDropdown, setShowVarsDropdown] = useState(false);

  const varsRef = useRef<HTMLDivElement>(null);

  // Statistics selection state
  const [tendenciaCentral, setTendenciaCentral] = useState({
    n: true,
    media: true,
    mediana: false,
    moda: false,
    suma: false,
    mediaGeometrica: false,
    ic95Media: true
  });

  const [dispersion, setDispersion] = useState({
    desvTipica: true,
    varianza: false,
    coefVariacion: true,
    minimo: false,
    maximo: false,
    recorrido: false,
    rangoIntercuartilico: false,
    errorEstMedia: false
  });

  const [percentiles, setPercentiles] = useState({
    cuartiles: false,
    deciles: false,
    personalizados: false
  });

  const [formaDistribucion, setFormaDistribucion] = useState({
    asimetria: false,
    curtosis: false,
    pruebaNormalidad: true
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (varsRef.current && !varsRef.current.contains(event.target as Node)) {
        setShowVarsDropdown(false);
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

  // Generate data for selected variables
  const tableData = selectedVars.map(variable => generateRowData(variable));

  // Build column list based on selected statistics
  const getSelectedColumns = () => {
    const columns: Array<{ key: string; label: string; category: string }> = [];
    
    // Always show Variable column
    columns.push({ key: 'variable', label: 'Variable', category: 'base' });
    
    // Tendencia Central
    if (tendenciaCentral.n) columns.push({ key: 'n', label: 'N', category: 'tendencia' });
    if (tendenciaCentral.media) columns.push({ key: 'media', label: 'Media', category: 'tendencia' });
    if (tendenciaCentral.mediana) columns.push({ key: 'mediana', label: 'Mediana', category: 'tendencia' });
    if (tendenciaCentral.moda) columns.push({ key: 'moda', label: 'Moda', category: 'tendencia' });
    if (tendenciaCentral.suma) columns.push({ key: 'suma', label: 'Suma', category: 'tendencia' });
    if (tendenciaCentral.mediaGeometrica) columns.push({ key: 'mediaGeometrica', label: 'Media Geométrica', category: 'tendencia' });
    if (tendenciaCentral.ic95Media) columns.push({ key: 'ic95Media', label: 'IC 95% (Media)', category: 'tendencia' });
    
    // Dispersión
    if (dispersion.desvTipica) columns.push({ key: 'desvTipica', label: 'Desviación Típica', category: 'dispersion' });
    if (dispersion.varianza) columns.push({ key: 'varianza', label: 'Varianza', category: 'dispersion' });
    if (dispersion.coefVariacion) columns.push({ key: 'coefVariacion', label: 'Coef. Variación (%)', category: 'dispersion' });
    if (dispersion.minimo) columns.push({ key: 'minimo', label: 'Mínimo', category: 'dispersion' });
    if (dispersion.maximo) columns.push({ key: 'maximo', label: 'Máximo', category: 'dispersion' });
    if (dispersion.recorrido) columns.push({ key: 'recorrido', label: 'Recorrido (Rango)', category: 'dispersion' });
    if (dispersion.rangoIntercuartilico) columns.push({ key: 'rangoIntercuartilico', label: 'Rango Intercuartílico', category: 'dispersion' });
    if (dispersion.errorEstMedia) columns.push({ key: 'errorEstMedia', label: 'Error Est. Media', category: 'dispersion' });
    
    // Percentiles
    if (percentiles.cuartiles) {
      columns.push({ key: 'q25', label: 'Q1 (25%)', category: 'percentiles' });
      columns.push({ key: 'q50', label: 'Q2 (50%)', category: 'percentiles' });
      columns.push({ key: 'q75', label: 'Q3 (75%)', category: 'percentiles' });
    }
    if (percentiles.deciles) {
      columns.push({ key: 'd10', label: 'D1 (10%)', category: 'percentiles' });
      columns.push({ key: 'd20', label: 'D2 (20%)', category: 'percentiles' });
      columns.push({ key: 'd30', label: 'D3 (30%)', category: 'percentiles' });
      columns.push({ key: 'd40', label: 'D4 (40%)', category: 'percentiles' });
      columns.push({ key: 'd60', label: 'D6 (60%)', category: 'percentiles' });
      columns.push({ key: 'd70', label: 'D7 (70%)', category: 'percentiles' });
      columns.push({ key: 'd80', label: 'D8 (80%)', category: 'percentiles' });
      columns.push({ key: 'd90', label: 'D9 (90%)', category: 'percentiles' });
    }
    if (percentiles.personalizados) columns.push({ key: 'percentiles', label: 'Percentiles (Pers.)', category: 'percentiles' });
    
    // Forma y Distribución
    if (formaDistribucion.asimetria) columns.push({ key: 'asimetria', label: 'Asimetría', category: 'forma' });
    if (formaDistribucion.curtosis) columns.push({ key: 'curtosis', label: 'Curtosis', category: 'forma' });
    if (formaDistribucion.pruebaNormalidad) columns.push({ key: 'pruebaNormalidad', label: 'Prueba Normalidad (p)', category: 'forma' });
    
    return columns;
  };

  const columns = getSelectedColumns();

  const getCellValue = (row: any, columnKey: string) => {
    const value = row[columnKey];
    if (columnKey === 'variable') return value;
    if (columnKey === 'n') return value;
    if (columnKey === 'ic95Media' || columnKey === 'percentiles') return value;
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value;
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
                Tabla Inteligente
              </h2>
            </div>
            <p className="text-slate-600 leading-relaxed ml-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Configura exactamente qué métricas deseas calcular, al estilo de software estadístico profesional
            </p>
          </div>
        </div>

        {/* Control Bars */}
        <div className="ml-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Variables Selector */}
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
                    ? 'Seleccionar variables (Mín. 1)' 
                    : `${selectedVars.length} variables seleccionadas`}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {showVarsDropdown && (
                <div className="absolute top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                  {numericVariables.map((variable) => (
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

            {/* Segment By */}
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1.5 block flex items-center gap-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Segmentar por (Opcional)
              </label>
              <select
                value={segmentBy}
                onChange={(e) => setSegmentBy(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                <option value="">(General - Sin Segmentar)</option>
                <option value="genero">Género</option>
                <option value="grupo">Grupo Control</option>
                <option value="estado">Estado de Salud</option>
              </select>
            </div>
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
                Seleccione los estadísticos a calcular:
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
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tendenciaCentral.n}
                      onChange={(e) => setTendenciaCentral({ ...tendenciaCentral, n: e.target.checked })}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>N (Conteo)</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tendenciaCentral.media}
                      onChange={(e) => setTendenciaCentral({ ...tendenciaCentral, media: e.target.checked })}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Media</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tendenciaCentral.mediana}
                      onChange={(e) => setTendenciaCentral({ ...tendenciaCentral, mediana: e.target.checked })}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Mediana</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tendenciaCentral.moda}
                      onChange={(e) => setTendenciaCentral({ ...tendenciaCentral, moda: e.target.checked })}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Moda</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tendenciaCentral.suma}
                      onChange={(e) => setTendenciaCentral({ ...tendenciaCentral, suma: e.target.checked })}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Suma</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tendenciaCentral.mediaGeometrica}
                      onChange={(e) => setTendenciaCentral({ ...tendenciaCentral, mediaGeometrica: e.target.checked })}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Media Geométrica</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tendenciaCentral.ic95Media}
                      onChange={(e) => setTendenciaCentral({ ...tendenciaCentral, ic95Media: e.target.checked })}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>IC 95% (Media)</span>
                  </label>
                </div>

                {/* Dispersión */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700 mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 10h4M13 10h4M10 3v4M10 13v4" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span className="font-medium">Dispersión</span>
                  </div>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispersion.desvTipica}
                      onChange={(e) => setDispersion({ ...dispersion, desvTipica: e.target.checked })}
                      className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Desviación Típica</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispersion.varianza}
                      onChange={(e) => setDispersion({ ...dispersion, varianza: e.target.checked })}
                      className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Varianza</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispersion.coefVariacion}
                      onChange={(e) => setDispersion({ ...dispersion, coefVariacion: e.target.checked })}
                      className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Coef. Variación (%)</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispersion.minimo}
                      onChange={(e) => setDispersion({ ...dispersion, minimo: e.target.checked })}
                      className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Mínimo</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispersion.maximo}
                      onChange={(e) => setDispersion({ ...dispersion, maximo: e.target.checked })}
                      className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Máximo</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispersion.recorrido}
                      onChange={(e) => setDispersion({ ...dispersion, recorrido: e.target.checked })}
                      className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Recorrido (Rango)</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispersion.rangoIntercuartilico}
                      onChange={(e) => setDispersion({ ...dispersion, rangoIntercuartilico: e.target.checked })}
                      className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Rango Intercuartílico</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispersion.errorEstMedia}
                      onChange={(e) => setDispersion({ ...dispersion, errorEstMedia: e.target.checked })}
                      className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Error Est. Media</span>
                  </label>
                </div>

                {/* Percentiles */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-red-700 mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <rect x="2" y="8" width="16" height="4" />
                    </svg>
                    <span className="font-medium">Percentiles</span>
                  </div>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={percentiles.cuartiles}
                      onChange={(e) => setPercentiles({ ...percentiles, cuartiles: e.target.checked })}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Cuartiles (25, 50, 75)</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={percentiles.deciles}
                      onChange={(e) => setPercentiles({ ...percentiles, deciles: e.target.checked })}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Deciles (10, 20...90)</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={percentiles.personalizados}
                      onChange={(e) => setPercentiles({ ...percentiles, personalizados: e.target.checked })}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Personalizados (ej: 5, 95, 99)</span>
                  </label>
                  
                  {percentiles.personalizados && (
                    <input
                      type="text"
                      placeholder="ej: 5, 95, 99"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    />
                  )}
                </div>

                {/* Forma y Distribución */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-yellow-700 mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2 L14 10 L18 18 L10 14 L2 18 L6 10 Z" />
                    </svg>
                    <span className="font-medium">Forma y Dist.</span>
                  </div>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formaDistribucion.asimetria}
                      onChange={(e) => setFormaDistribucion({ ...formaDistribucion, asimetria: e.target.checked })}
                      className="rounded border-gray-300 text-yellow-700 focus:ring-yellow-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Asimetría (Skewness)</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formaDistribucion.curtosis}
                      onChange={(e) => setFormaDistribucion({ ...formaDistribucion, curtosis: e.target.checked })}
                      className="rounded border-gray-300 text-yellow-700 focus:ring-yellow-500"
                    />
                    <span className="text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Curtosis</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formaDistribucion.pruebaNormalidad}
                      onChange={(e) => setFormaDistribucion({ ...formaDistribucion, pruebaNormalidad: e.target.checked })}
                      className="rounded border-gray-300 text-yellow-700 focus:ring-yellow-500"
                    />
                    <span className="text-gray-900 flex items-center gap-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      Prueba Normalidad (p)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Segmentation Tabs */}
          {segmentBy && (
            <div className="bg-white rounded-t-lg border-b-0">
              <div className="flex items-center gap-1 px-4 border-b border-slate-200">
                <span className="text-xs text-slate-600 mr-2 py-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Segmentado por: {segmentBy === 'genero' ? 'Género' : segmentBy === 'grupo' ? 'Grupo Control' : 'Estado de Salud'}
                </span>
                {segmentBy === 'genero' ? (
                  <>
                    {['General', 'Masculino', 'Femenino'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveSegmentTab(tab)}
                        className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                          activeSegmentTab === tab ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                        }`}
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {tab}
                        {activeSegmentTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>}
                      </button>
                    ))}
                  </>
                ) : segmentBy === 'grupo' ? (
                  <>
                    {['General', 'Control', 'Tratamiento'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveSegmentTab(tab)}
                        className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                          activeSegmentTab === tab ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                        }`}
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {tab}
                        {activeSegmentTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {['General', 'Saludable', 'En Riesgo'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveSegmentTab(tab)}
                        className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                          activeSegmentTab === tab ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                        }`}
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {tab}
                        {activeSegmentTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Results Table */}
          <div className={`bg-white ${segmentBy ? 'rounded-b-xl' : 'rounded-xl'} shadow-lg border border-slate-200 overflow-hidden`}>
            <div className="px-6 py-4 bg-gradient-to-r from-teal-50 via-blue-50 to-indigo-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Tabla Estadística Personalizada
                </h3>
                {segmentBy && (
                  <span className="text-xs text-slate-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Vista: {activeSegmentTab}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gradient-to-b from-blue-50 to-blue-100 sticky top-0">
                  <tr>
                    <th
                      className="px-6 py-4 text-left font-bold text-blue-900 border-b-2 border-blue-300 sticky left-0 bg-blue-50 z-10"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, minWidth: '180px' }}
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
                  {selectedVars.length === 0 ? (
                    <tr>
                      <td colSpan={selectedVars.length + 1} className="px-6 py-12 text-center text-slate-500" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        Selecciona al menos una variable para ver los estadísticos
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* Tendencia Central Section */}
                      {(tendenciaCentral.n || tendenciaCentral.media || tendenciaCentral.mediana || 
                        tendenciaCentral.moda || tendenciaCentral.suma || tendenciaCentral.mediaGeometrica || 
                        tendenciaCentral.ic95Media) && (
                        <>
                          <tr className="bg-slate-100">
                            <td 
                              colSpan={selectedVars.length + 1} 
                              className="px-6 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-100"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                            >
                              Tendencia Central
                            </td>
                          </tr>
                          
                          {tendenciaCentral.n && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                N
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.n}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {tendenciaCentral.media && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                Media
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.media.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {tendenciaCentral.mediana && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                Mediana
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.mediana.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {tendenciaCentral.moda && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                Moda
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.moda.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {tendenciaCentral.suma && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                Suma
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.suma.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {tendenciaCentral.mediaGeometrica && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                Media Geométrica
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.mediaGeometrica.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {tendenciaCentral.ic95Media && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                IC 95%
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.ic95Media}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </>
                      )}

                      {/* Dispersión Section */}
                      {(dispersion.desvTipica || dispersion.varianza || dispersion.coefVariacion || 
                        dispersion.minimo || dispersion.maximo || dispersion.recorrido || 
                        dispersion.rangoIntercuartilico || dispersion.errorEstMedia) && (
                        <>
                          <tr className="bg-slate-100">
                            <td 
                              colSpan={selectedVars.length + 1} 
                              className="px-6 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-100"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                            >
                              Dispersión
                            </td>
                          </tr>
                          
                          {dispersion.desvTipica && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                D.E.
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.desvTipica.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {dispersion.varianza && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                Varianza
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.varianza.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {dispersion.coefVariacion && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                CV %
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.coefVariacion.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {dispersion.minimo && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                Mínimo
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.minimo.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {dispersion.maximo && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                Máximo
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.maximo.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {dispersion.recorrido && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                Recorrido
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.recorrido.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {dispersion.rangoIntercuartilico && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                IQR
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.rangoIntercuartilico.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {dispersion.errorEstMedia && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                Error Est. Media
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.errorEstMedia.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </>
                      )}

                      {/* Percentiles Section */}
                      {(percentiles.cuartiles || percentiles.deciles || percentiles.personalizados) && (
                        <>
                          <tr className="bg-slate-100">
                            <td 
                              colSpan={selectedVars.length + 1} 
                              className="px-6 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-100"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                            >
                              Percentiles
                            </td>
                          </tr>
                          
                          {percentiles.cuartiles && (
                            <>
                              <tr className="bg-white hover:bg-slate-50/50">
                                <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                  Q1 (25%)
                                </td>
                                {selectedVars.map((variable) => {
                                  const data = generateRowData(variable);
                                  return (
                                    <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                      {data.q25.toFixed(2)}
                                    </td>
                                  );
                                })}
                              </tr>
                              <tr className="bg-white hover:bg-slate-50/50">
                                <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                  Q2 (50%)
                                </td>
                                {selectedVars.map((variable) => {
                                  const data = generateRowData(variable);
                                  return (
                                    <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                      {data.q50.toFixed(2)}
                                    </td>
                                  );
                                })}
                              </tr>
                              <tr className="bg-white hover:bg-slate-50/50">
                                <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                  Q3 (75%)
                                </td>
                                {selectedVars.map((variable) => {
                                  const data = generateRowData(variable);
                                  return (
                                    <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                      {data.q75.toFixed(2)}
                                    </td>
                                  );
                                })}
                              </tr>
                            </>
                          )}
                          
                          {percentiles.deciles && (
                            <>
                              {[10, 20, 30, 40, 60, 70, 80, 90].map((d) => (
                                <tr key={d} className="bg-white hover:bg-slate-50/50">
                                  <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                    D{d / 10} ({d}%)
                                  </td>
                                  {selectedVars.map((variable) => {
                                    const data = generateRowData(variable);
                                    const key = `d${d}` as keyof typeof data;
                                    return (
                                      <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                        {typeof data[key] === 'number' ? (data[key] as number).toFixed(2) : '-'}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </>
                          )}
                          
                          {percentiles.personalizados && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                Personalizados
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.percentiles}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </>
                      )}

                      {/* Forma y Distribución Section */}
                      {(formaDistribucion.asimetria || formaDistribucion.curtosis || formaDistribucion.pruebaNormalidad) && (
                        <>
                          <tr className="bg-slate-100">
                            <td 
                              colSpan={selectedVars.length + 1} 
                              className="px-6 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-100"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                            >
                              Forma y Dist.
                            </td>
                          </tr>
                          
                          {formaDistribucion.asimetria && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                Asimetría
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.asimetria.toFixed(3)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {formaDistribucion.curtosis && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                Curtosis
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {data.curtosis.toFixed(3)}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          
                          {formaDistribucion.pruebaNormalidad && (
                            <tr className="bg-white hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 border-b border-slate-200 sticky left-0 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                P-Normalidad
                              </td>
                              {selectedVars.map((variable) => {
                                const data = generateRowData(variable);
                                return (
                                  <td key={variable} className="px-6 py-3 text-sm text-slate-900 text-center border-b border-slate-200" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, Roboto Mono, monospace', fontWeight: 500 }}>
                                    {'<0.001'}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-gradient-to-b from-slate-50 to-slate-100 border-t-2 border-slate-300">
              <p className="text-xs text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                <strong>Nota:</strong> Los estadísticos mostrados se calculan dinámicamente según las opciones seleccionadas. 
                Marca o desmarca las casillas para personalizar tu tabla.
              </p>
            </div>

            <ActionToolbar />
          </div>
        </div>
      </div>
    </div>
  );
}
