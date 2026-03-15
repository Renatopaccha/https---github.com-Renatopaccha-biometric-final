import { useState } from 'react';
import { MuestreoHub } from './MuestreoHub';
import { SampleSizeCalculator } from './SampleSizeCalculator';

export type MuestreoView = 'hub' | 'calculo-tamano' | 'seleccion-muestras' | 'randomizacion' | 'muestras-complejas';

interface MuestreoProps {
  onNavigate?: (view: string, chatId?: string) => void;
}

export function Muestreo({ onNavigate }: MuestreoProps) {
  const [currentView, setCurrentView] = useState<MuestreoView>('hub');

  const renderView = () => {
    switch (currentView) {
      case 'hub':
        return <MuestreoHub onSelectView={setCurrentView} />;
      case 'calculo-tamano':
        return <SampleSizeCalculator onBack={() => setCurrentView('hub')} />;
      // Future sub-views:
      // case 'seleccion-muestras':
      //   return <SeleccionMuestrasView onBack={() => setCurrentView('hub')} />;
      // case 'randomizacion':
      //   return <RandomizacionView onBack={() => setCurrentView('hub')} />;
      // case 'muestras-complejas':
      //   return <MuestrasComplejasView onBack={() => setCurrentView('hub')} />;
      default:
        return <MuestreoHub onSelectView={setCurrentView} />;
    }
  };

  return <div className="h-full">{renderView()}</div>;
}
