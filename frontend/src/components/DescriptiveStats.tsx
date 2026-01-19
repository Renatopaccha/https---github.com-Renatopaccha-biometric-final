import { useState } from 'react';
import { DescriptiveStatsHub } from './stats/DescriptiveStatsHub';
import { TablaResumenView } from './stats/TablaResumenView';
import { TablasFrecuenciaView } from './stats/TablasFrecuenciaView';
import { TablasContingenciaView } from './stats/TablasContingenciaView';
import { CorrelacionesView } from './stats/CorrelacionesView';
import { TablaInteligenteView } from './stats/TablaInteligenteView';
import ErrorBoundary from './ErrorBoundary';

export type StatsView = 'hub' | 'tabla-resumen' | 'frecuencia' | 'contingencia' | 'correlaciones' | 'tabla-inteligente';

export function DescriptiveStats({ onNavigate }: { onNavigate?: (view: any, chatId?: string) => void }) {
  const [currentView, setCurrentView] = useState<StatsView>('hub');

  const renderView = () => {
    switch (currentView) {
      case 'hub':
        return <DescriptiveStatsHub onSelectView={setCurrentView} />;
      case 'tabla-resumen':
        return <TablaResumenView
          onBack={() => setCurrentView('hub')}
          onNavigateToChat={(chatId) => onNavigate && onNavigate('asistente', chatId)}
        />;
      case 'frecuencia':
        return <TablasFrecuenciaView
          onBack={() => setCurrentView('hub')}
          onNavigateToChat={(chatId) => onNavigate && onNavigate('asistente', chatId)}
        />;
      case 'contingencia':
        return <TablasContingenciaView
          onBack={() => setCurrentView('hub')}
          onNavigateToChat={(chatId) => onNavigate && onNavigate('asistente', chatId)}
        />;
      case 'correlaciones':
        return (
          <ErrorBoundary
            fallback={(error, errorInfo, reset) => (
              <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
                <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                  <div className="flex items-center gap-4 border-b border-slate-200 pb-6 mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        Error en Correlaciones
                      </h2>
                      <p className="text-sm text-slate-600 mt-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        Ocurrió un problema al renderizar la vista de correlaciones
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-red-800 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        Detalles del error:
                      </p>
                      <pre className="text-xs text-red-700 bg-white p-3 rounded border border-red-300 overflow-auto max-h-32" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {error.toString()}
                      </pre>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-800 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        💡 Posibles soluciones:
                      </p>
                      <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        <li>Verifica que los datos estén cargados correctamente</li>
                        <li>Asegúrate de haber seleccionado variables numéricas</li>
                        <li>Intenta recargar la página o volver al inicio</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      onClick={reset}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all font-semibold shadow-md hover:shadow-lg"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      Reintentar
                    </button>
                    <button
                      onClick={() => setCurrentView('hub')}
                      className="flex-1 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      Volver al Inicio
                    </button>
                  </div>
                </div>
              </div>
            )}
          >
            <CorrelacionesView
              onBack={() => setCurrentView('hub')}
              onNavigateToChat={(chatId) => onNavigate && onNavigate('asistente', chatId)}
            />
          </ErrorBoundary>
        );
      case 'tabla-inteligente':
        return <TablaInteligenteView onBack={() => setCurrentView('hub')} />;
      default:
        return <DescriptiveStatsHub onSelectView={setCurrentView} />;
    }
  };

  return <div className="h-full">{renderView()}</div>;
}