import { Settings2, Play, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

interface ConfigurationPanelProps {
  analysisType: string;
  onGenerate: () => void;
  onBack: () => void;
}

export function ConfigurationPanel({ analysisType, onGenerate, onBack }: ConfigurationPanelProps) {
  const [selectedVariables, setSelectedVariables] = useState<string[]>(['edad', 'imc', 'glucosa']);
  const [groupBy, setGroupBy] = useState('grupo_control');
  const [formatoAcademico, setFormatoAcademico] = useState(true);
  const [mostrarNormalidad, setMostrarNormalidad] = useState(true);
  const [detectarOutliers, setDetectarOutliers] = useState(false);

  const availableVariables = [
    { value: 'edad', label: 'Edad [años]' },
    { value: 'imc', label: 'Índice de Masa Corporal' },
    { value: 'glucosa', label: 'Glucosa [mg/dL]' },
    { value: 'presion_arterial', label: 'Presión Arterial [mmHg]' },
    { value: 'colesterol', label: 'Colesterol Total [mg/dL]' },
    { value: 'hemoglobina', label: 'Hemoglobina [g/dL]' },
  ];

  const toggleVariable = (value: string) => {
    setSelectedVariables(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const getAnalysisTitle = () => {
    const titles: Record<string, string> = {
      'tabla1': 'Resumen Clínico (Tabla 1)',
      'normalidad': 'Pruebas de Normalidad',
      'outliers': 'Detección de Outliers',
      'tablas-cruzadas': 'Tablas Cruzadas'
    };
    return titles[analysisType] || 'Análisis';
  };

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a opciones
        </button>
        
        <div className="flex items-center gap-2 mb-2">
          <Settings2 className="w-5 h-5 text-teal-600" />
          <h2 className="text-gray-900">Configuración</h2>
        </div>
        <p className="text-xs text-gray-600">
          {getAnalysisTitle()}
        </p>
      </div>

      {/* Configuration Form */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Variable Selector */}
        <div>
          <label className="text-sm text-gray-900 mb-3 block">
            Variables a Analizar
          </label>
          <div className="space-y-2">
            {availableVariables.map((variable) => (
              <label
                key={variable.value}
                className="flex items-start gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedVariables.includes(variable.value)}
                  onChange={() => toggleVariable(variable.value)}
                  className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <div className="text-sm text-gray-900">{variable.label}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Grouping Selector - only for tabla1 */}
        {analysisType === 'tabla1' && (
          <div>
            <label className="text-sm text-gray-900 mb-3 block">
              Agrupar por (Opcional)
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Sin agrupación</option>
              <option value="grupo_control">Grupo (Control vs Tratamiento)</option>
              <option value="genero">Género</option>
              <option value="estado_salud">Estado de Salud</option>
            </select>
          </div>
        )}

        {/* Toggles */}
        <div className="space-y-4 pt-2">
          {analysisType === 'tabla1' && (
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  checked={formatoAcademico}
                  onChange={(e) => setFormatoAcademico(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-teal-600 peer-focus:ring-2 peer-focus:ring-teal-500 transition-colors">
                  <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${formatoAcademico ? 'translate-x-5' : ''}`}></div>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-900">Formato Académico (Tabla 1)</div>
                <div className="text-xs text-gray-600">Estilo APA para publicaciones</div>
              </div>
            </label>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={mostrarNormalidad}
                onChange={(e) => setMostrarNormalidad(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-teal-600 peer-focus:ring-2 peer-focus:ring-teal-500 transition-colors">
                <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${mostrarNormalidad ? 'translate-x-5' : ''}`}></div>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-900">Mostrar Pruebas de Normalidad</div>
              <div className="text-xs text-gray-600">Shapiro-Wilk y Q-Q plots</div>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={detectarOutliers}
                onChange={(e) => setDetectarOutliers(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-teal-600 peer-focus:ring-2 peer-focus:ring-teal-500 transition-colors">
                <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${detectarOutliers ? 'translate-x-5' : ''}`}></div>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-900">Detectar Outliers</div>
              <div className="text-xs text-gray-600">Método IQR y visualización</div>
            </div>
          </label>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-6 border-t border-gray-200">
        <button
          onClick={onGenerate}
          className="w-full px-5 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          <span>Generar Estadísticas</span>
        </button>
        
        <div className="mt-3 text-xs text-gray-500 text-center">
          {selectedVariables.length} variable{selectedVariables.length !== 1 ? 's' : ''} seleccionada{selectedVariables.length !== 1 ? 's' : ''}
        </div>
      </div>
    </aside>
  );
}