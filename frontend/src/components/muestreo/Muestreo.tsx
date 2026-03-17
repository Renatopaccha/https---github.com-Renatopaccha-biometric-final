import { useState } from 'react';
import { MuestreoHub } from './MuestreoHub';
import { SampleSizeCalculator } from './SampleSizeCalculator';
import { MediaCalculator } from './MediaCalculator';
import { ProportionCalculator } from './ProportionCalculator';
import { OddsRatioCalculator } from './OddsRatioCalculator';
import { RelativeRiskCalculator } from './RelativeRiskCalculator';
import { ConcordanceCalculator } from './ConcordanceCalculator';
import { DiagnosticTestCalculator } from './DiagnosticTestCalculator';
import { ComparisonMeansCalculator } from './ComparisonMeansCalculator';
import { ComparisonProportionsCalculator } from './ComparisonProportionsCalculator';
import { CaseControlCalculator } from './CaseControlCalculator';

export type MuestreoView =
  | 'hub'
  | 'calculo-tamano'
  | 'media'
  | 'proporcion'
  | 'odds-ratio'
  | 'riesgo-relativo'
  | 'concordancia'
  | 'pruebas-diagnosticas'
  | 'casos-controles'
  | 'comparacion-medias'
  | 'comparacion-proporciones'
  | 'seleccion-muestras'
  | 'randomizacion'
  | 'muestras-complejas';

interface MuestreoProps {
  onNavigate?: (view: string, chatId?: string) => void;
}

export function Muestreo({ onNavigate }: MuestreoProps) {
  const [currentView, setCurrentView] = useState<MuestreoView>('hub');

  const handleSelectItem = (_category: string, item: string) => {
    if (item === 'Media') {
      setCurrentView('media');
    } else if (item === 'Proporción') {
      setCurrentView('proporcion');
    } else if (item === 'Odds Ratio') {
      setCurrentView('odds-ratio');
    } else if (item === 'Riesgo Relativo') {
      setCurrentView('riesgo-relativo');
    } else if (item === 'Concordancia') {
      setCurrentView('concordancia');
    } else if (item === 'Pruebas Diagnósticas') {
      setCurrentView('pruebas-diagnosticas');
    } else if (item === 'Comparación de Medias') {
      setCurrentView('comparacion-medias');
    } else if (item === 'Comparación de Proporciones') {
      setCurrentView('comparacion-proporciones');
    } else if (item === 'Estudios de Casos y Controles') {
      setCurrentView('casos-controles');
    }
    // Future calculators can be routed here
  };

  const renderView = () => {
    switch (currentView) {
      case 'hub':
        return <MuestreoHub onSelectView={setCurrentView} />;
      case 'calculo-tamano':
        return (
          <SampleSizeCalculator
            onBack={() => setCurrentView('hub')}
            onSelectItem={handleSelectItem}
          />
        );
      case 'media':
        return <MediaCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'proporcion':
        return <ProportionCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'odds-ratio':
        return <OddsRatioCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'riesgo-relativo':
        return <RelativeRiskCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'concordancia':
        return <ConcordanceCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'pruebas-diagnosticas':
        return <DiagnosticTestCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'comparacion-medias':
        return <ComparisonMeansCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'comparacion-proporciones':
        return <ComparisonProportionsCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'casos-controles':
        return <CaseControlCalculator onBack={() => setCurrentView('calculo-tamano')} />;
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
