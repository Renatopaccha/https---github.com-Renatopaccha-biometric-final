import { useState } from 'react';
import { DescriptiveStatsHub } from './stats/DescriptiveStatsHub';
import { TablaResumenView } from './stats/TablaResumenView';
import { TablasFrecuenciaView } from './stats/TablasFrecuenciaView';
import { TablasContingenciaView } from './stats/TablasContingenciaView';
import { CorrelacionesView } from './stats/CorrelacionesView';
import { TablaInteligenteView } from './stats/TablaInteligenteView';

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
        return <CorrelacionesView onBack={() => setCurrentView('hub')} />;
      case 'tabla-inteligente':
        return <TablaInteligenteView onBack={() => setCurrentView('hub')} />;
      default:
        return <DescriptiveStatsHub onSelectView={setCurrentView} />;
    }
  };

  return <div className="h-full">{renderView()}</div>;
}