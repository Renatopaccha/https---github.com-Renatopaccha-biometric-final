import { Calculator, Users, Shuffle, BarChart2 } from 'lucide-react';

type MuestreoView = 'calculo-tamano' | 'seleccion-muestras' | 'randomizacion' | 'muestras-complejas';

interface MuestreoHubProps {
  onSelectView: (view: MuestreoView) => void;
}

const muestreoCards = [
  {
    id: 'calculo-tamano' as MuestreoView,
    title: 'Cálculo de tamaños de muestra',
    description:
      'Función esencial para determinar el número de sujetos necesarios antes de recolectar datos. Universal e indispensable para estudiantes de tesis e investigadores.',
    icon: Calculator,
  },
  {
    id: 'seleccion-muestras' as MuestreoView,
    title: 'Selección de muestras',
    description:
      'Herramientas para aplicar métodos de muestreo probabilístico: aleatorio simple, estratificado, por conglomerados y sistemático.',
    icon: Users,
  },
  {
    id: 'randomizacion' as MuestreoView,
    title: 'Asignación a tratamientos (Randomización)',
    description:
      'Generación de secuencias de asignación aleatoria, ideal para ensayos clínicos y estudios experimentales rigurosos.',
    icon: Shuffle,
  },
  {
    id: 'muestras-complejas' as MuestreoView,
    title: 'Estimación con muestras complejas',
    description:
      'Análisis avanzado para datos provenientes de encuestas nacionales de salud (con factores de expansión, estratos y conglomerados).',
    icon: BarChart2,
  },
];

export function MuestreoHub({ onSelectView }: MuestreoHubProps) {
  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-10 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-8 bg-gradient-to-b from-teal-500 to-teal-600 rounded-full"></div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Muestreo</h1>
          </div>
          <p className="text-slate-600 text-lg leading-relaxed ml-4">
            Seleccione la herramienta de muestreo que desea utilizar
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-6xl w-full">
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            style={{ animation: 'muestreoFadeUp 0.45s ease-out both' }}
          >
            {muestreoCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  onClick={() => onSelectView(card.id)}
                  className="group bg-white rounded-xl border-2 border-slate-200 p-8 text-left transition-all hover:shadow-xl hover:border-teal-500 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  style={{
                    animation: `muestreoFadeUp 0.45s ease-out ${index * 80}ms both`,
                  }}
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

                    {/* Arrow on hover */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center text-sm text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Abrir herramienta</span>
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Keyframes injected via style tag */}
      <style>{`
        @keyframes muestreoFadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
