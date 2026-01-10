import { Table2, Bell, AlertTriangle, Grid3x3 } from 'lucide-react';

interface ActionCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
}

interface DescriptiveStatsLandingProps {
  onSelectAnalysis: (type: string) => void;
}

export function DescriptiveStatsLanding({ onSelectAnalysis }: DescriptiveStatsLandingProps) {
  const actionCards: ActionCard[] = [
    {
      id: 'tabla1',
      title: 'Resumen Clínico (Tabla 1)',
      description: 'Generación automática de demografía, medias y frecuencias formateadas para publicación científica (APA).',
      icon: Table2,
      action: () => onSelectAnalysis('tabla1')
    },
    {
      id: 'normalidad',
      title: 'Pruebas de Normalidad',
      description: 'Evaluar la distribución de datos mediante Shapiro-Wilk, Kolmogorov-Smirnov y gráficos Q-Q.',
      icon: Bell,
      action: () => onSelectAnalysis('normalidad')
    },
    {
      id: 'outliers',
      title: 'Detección de Outliers',
      description: 'Identificar valores atípicos univariados usando rango intercuartílico (IQR) y Z-Score.',
      icon: AlertTriangle,
      action: () => onSelectAnalysis('outliers')
    },
    {
      id: 'tablas-cruzadas',
      title: 'Tablas Cruzadas',
      description: 'Analizar la relación entre dos variables categóricas (Chi-cuadrado y porcentajes).',
      icon: Grid3x3,
      action: () => onSelectAnalysis('tablas-cruzadas')
    }
  ];

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-gray-900 mb-2">Estadística Descriptiva</h1>
          <p className="text-gray-600">
            Seleccione el tipo de análisis que desea realizar sobre su dataset actual.
          </p>
        </div>
      </div>

      {/* Main Content - Action Cards Grid */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-5xl w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {actionCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  onClick={card.action}
                  className="group bg-white rounded-lg border-2 border-gray-200 p-8 text-left transition-all hover:shadow-lg hover:border-teal-500 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  <div className="flex flex-col h-full">
                    {/* Icon */}
                    <div className="w-14 h-14 bg-teal-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
                      <Icon className="w-7 h-7 text-teal-600" />
                    </div>

                    {/* Title */}
                    <h3 className="text-gray-900 mb-3 group-hover:text-teal-700 transition-colors">
                      {card.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-600 leading-relaxed flex-1">
                      {card.description}
                    </p>

                    {/* Arrow indicator on hover */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-sm text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Comenzar análisis</span>
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Helper Text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Dataset actual: <span className="text-gray-700">estudio_glucosa_2024.csv</span> • 150 filas • 12 columnas
            </p>
          </div>
        </div>
      </div>

      {/* Optional Footer Guidance */}
      <div className="bg-white border-t border-gray-200 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <div className="w-5 h-5 bg-teal-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-teal-600 text-xs">i</span>
            </div>
            <p>
              <strong className="text-gray-900">Sugerencia:</strong> Para un análisis exploratorio completo, se recomienda comenzar con "Resumen Clínico (Tabla 1)" seguido de "Pruebas de Normalidad".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
