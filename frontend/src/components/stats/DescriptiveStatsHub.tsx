import { Table2, BarChart3, Grid3x3, Workflow, Sparkles } from 'lucide-react';
import { StatsView } from '../DescriptiveStats';

interface DescriptiveStatsHubProps {
  onSelectView: (view: StatsView) => void;
}

const statsCards = [
  {
    id: 'tabla-resumen' as StatsView,
    title: 'Tabla Resumen',
    description: 'Vista general de estadísticas descriptivas para todas las variables numéricas',
    icon: Table2,
    color: 'teal'
  },
  {
    id: 'frecuencia' as StatsView,
    title: 'Tablas de Frecuencia',
    description: 'Análisis de distribución de variables categóricas con conteos y porcentajes',
    icon: BarChart3,
    color: 'blue'
  },
  {
    id: 'contingencia' as StatsView,
    title: 'Tablas de Contingencia',
    description: 'Análisis de relación entre dos variables categóricas (crosstabs)',
    icon: Grid3x3,
    color: 'purple'
  },
  {
    id: 'correlaciones' as StatsView,
    title: 'Correlaciones',
    description: 'Matriz de correlación y análisis de asociación entre variables numéricas',
    icon: Workflow,
    color: 'indigo'
  },
  {
    id: 'tabla-inteligente' as StatsView,
    title: 'Tabla Inteligente',
    description: 'Configuración avanzada de estadísticos personalizados con IA',
    icon: Sparkles,
    color: 'teal'
  }
];

export function DescriptiveStatsHub({ onSelectView }: DescriptiveStatsHubProps) {
  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-10 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-8 bg-gradient-to-b from-teal-500 to-teal-600 rounded-full"></div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Estadística Descriptiva</h1>
          </div>
          <p className="text-slate-600 text-lg leading-relaxed ml-4">
            Seleccione el tipo de análisis descriptivo que desea realizar
          </p>
        </div>
      </div>

      {/* Main Content - Cards Grid */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-6xl w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  onClick={() => onSelectView(card.id)}
                  className="group bg-white rounded-xl border-2 border-slate-200 p-8 text-left transition-all hover:shadow-xl hover:border-teal-500 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  <div className="flex flex-col h-full">
                    {/* Icon */}
                    <div className="w-14 h-14 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl flex items-center justify-center mb-5 group-hover:from-teal-100 group-hover:to-teal-200 transition-colors shadow-sm">
                      <Icon className="w-7 h-7 text-teal-600" />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-teal-700 transition-colors tracking-tight">
                      {card.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-slate-600 leading-relaxed flex-1">
                      {card.description}
                    </p>

                    {/* Arrow indicator on hover */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center text-sm text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Abrir análisis</span>
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dataset Info */}
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-slate-600">
                Dataset actual: <span className="font-medium text-slate-900">estudio_glucosa_2024.csv</span> 
                <span className="mx-2 text-slate-400">•</span> 
                <span className="text-slate-700">150 filas</span>
                <span className="mx-2 text-slate-400">•</span>
                <span className="text-slate-700">12 columnas</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}