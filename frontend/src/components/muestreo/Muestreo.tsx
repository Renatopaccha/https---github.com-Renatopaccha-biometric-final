import { useState, useEffect, useCallback } from 'react';
import { useDataContext } from '../../context/DataContext';
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
import { CohortStudiesCalculator } from './CohortStudiesCalculator';
import { EquivalenceStudiesCalculator } from './EquivalenceStudiesCalculator';
import { DiagnosticTestHypothesisCalculator } from './DiagnosticTestHypothesisCalculator';
import { LotQualityCalculator } from './LotQualityCalculator';
import { SurvivalCalculator } from './SurvivalCalculator';
import { CorrelationCalculator } from './CorrelationCalculator';

import SeleccionMuestras from './SeleccionMuestras';
import MuestreoSimpleAleatorio from './MuestreoSimpleAleatorio';
import MuestreoSistematico from './MuestreoSistematico';
import MuestreoEstratificado from './MuestreoEstratificado';
import MuestreoConglomeradosMonoetapico from './MuestreoConglomeradosMonoetapico';
import MuestreoConglomeradosBietapico from './MuestreoConglomeradosBietapico';

export type MuestreoView =
  | 'hub'
  | 'calculo-tamano'
  | 'media'
  | 'proporcion'
  | 'odds-ratio'
  | 'riesgo-relativo'
  | 'concordancia'
  | 'pruebas-diagnosticas'
  | 'pruebas-diagnosticas-hipotesis'
  | 'calidad-lotes'
  | 'supervivencia'
  | 'casos-controles'
  | 'estudios-cohorte'
  | 'estudios-equivalencia'
  | 'coeficiente-correlacion'
  | 'comparacion-medias'
  | 'comparacion-proporciones'
  | 'seleccion-muestras'
  | 'muestreo-simple-aleatorio'
  | 'muestreo-sistematico'
  | 'muestreo-estratificado'
  | 'muestreo-conglomerados-monoetapico'
  | 'muestreo-conglomerados-bietapico'
  | 'randomizacion'
  | 'muestras-complejas';

interface MuestreoProps {
  onNavigate?: (view: string, chatId?: string) => void;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

export function Muestreo({ onNavigate }: MuestreoProps) {
  const [currentView, setCurrentView] = useState<MuestreoView>('hub');
  const { sessionId, data, totalRows } = useDataContext();

  // ── Estado para almacenar TODOS los datos del Excel ──
  const [allExcelData, setAllExcelData] = useState<any[] | null>(null);
  const [loadingExcel, setLoadingExcel] = useState(false);

  // ── Cargar todos los datos del Excel cuando hay sesión activa ──
  // Paso 1: obtener total_rows del API (no depender del contexto que puede estar vacío)
  // Paso 2: fetch de TODOS los datos con ese total
  const fetchAllData = useCallback(async () => {
    console.log("Muestreo: fetchAllData called. sessionId:", sessionId);
    if (!sessionId) {
      setAllExcelData(null);
      return;
    }
    setLoadingExcel(true);
    try {
      // Primer fetch para saber cuántas filas hay
      const countRes = await fetch(
        `${API_BASE_URL}/data?session_id=${sessionId}&skip=0&limit=1`
      );
      if (!countRes.ok) {
        setAllExcelData(null);
        setLoadingExcel(false);
        return;
      }
      const countResult = await countRes.json();
      console.log("Muestreo: countResult:", countResult);
      const total = countResult.total_rows || 0;
      if (total === 0) {
        console.log("Muestreo: total is 0, setting allExcelData to null");
        setAllExcelData(null);
        setLoadingExcel(false);
        return;
      }

      console.log("Muestreo: fetching all", total, "rows in chunks...");

      // Segundo paso: fetch en bloques de 1000 debido a restricción del backend (le=1000)
      const chunkSize = 1000;
      let allFetchedRows: any[] = [];
      let currentSkip = 0;

      while (currentSkip < total) {
        const fetchLimit = Math.min(chunkSize, total - currentSkip);
        const response = await fetch(
          `${API_BASE_URL}/data?session_id=${sessionId}&skip=${currentSkip}&limit=${fetchLimit}`
        );
        
        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.length > 0) {
            allFetchedRows = [...allFetchedRows, ...result.data];
          }
        } else {
          console.error("Muestreo: fetch chunk failed with status", response.status);
          break; // Salir en caso de primer error para no loopear infinitamente
        }
        currentSkip += fetchLimit;
      }

      if (allFetchedRows.length > 0) {
        console.log("Muestreo: successfully fetched", allFetchedRows.length, "rows in total");
        setAllExcelData(allFetchedRows);
      } else {
        setAllExcelData(null);
      }
    } catch (err) {
      console.error('Error fetching all data for sampling:', err);
      setAllExcelData(null);
    }
    setLoadingExcel(false);
  }, [sessionId]);

  // Cuando la vista cambia a un método de muestreo que requiere todos los datos, cargar todos los datos
  useEffect(() => {
    if ((currentView === 'muestreo-simple-aleatorio' || currentView === 'muestreo-sistematico' || currentView === 'muestreo-estratificado' || currentView === 'muestreo-conglomerados-monoetapico' || currentView === 'muestreo-conglomerados-bietapico') && sessionId && !allExcelData) {
      fetchAllData();
    }
  }, [currentView, sessionId, allExcelData, fetchAllData]);

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
    } else if (item === 'Pruebas Diagnósticas (Hipótesis)' || item === 'Pruebas Diagnósticas — Hipótesis') {
      setCurrentView('pruebas-diagnosticas-hipotesis');
    } else if (item === 'Calidad de Lotes') {
      setCurrentView('calidad-lotes');
    } else if (item === 'Supervivencia') {
      setCurrentView('supervivencia');
    } else if (item === 'Comparación de Medias') {
      setCurrentView('comparacion-medias');
    } else if (item === 'Comparación de Proporciones') {
      setCurrentView('comparacion-proporciones');
    } else if (item === 'Estudios de Casos y Controles') {
      setCurrentView('casos-controles');
    } else if (item === 'Estudios de Cohorte' || item === 'Estudios de Cohortes') {
      setCurrentView('estudios-cohorte');
    } else if (item === 'Estudios de Equivalencia') {
      setCurrentView('estudios-equivalencia');
    } else if (item === 'Coeficiente de Correlación') {
      setCurrentView('coeficiente-correlacion');
    } else if (item === 'Selección de Muestras') {
      setCurrentView('seleccion-muestras');
    }
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
      case 'pruebas-diagnosticas-hipotesis':
        return <DiagnosticTestHypothesisCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'calidad-lotes':
        return <LotQualityCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'supervivencia':
        return <SurvivalCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'comparacion-medias':
        return <ComparisonMeansCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'comparacion-proporciones':
        return <ComparisonProportionsCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'casos-controles':
        return <CaseControlCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'estudios-cohorte':
        return <CohortStudiesCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'estudios-equivalencia':
        return <EquivalenceStudiesCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'coeficiente-correlacion':
        return <CorrelationCalculator onBack={() => setCurrentView('calculo-tamano')} />;
      case 'seleccion-muestras':
        return <SeleccionMuestras onBack={() => setCurrentView('hub')} onNavigate={(view) => setCurrentView(view as MuestreoView)} />;
      case 'muestreo-simple-aleatorio':
        return <MuestreoSimpleAleatorio onBack={() => setCurrentView('seleccion-muestras')} datosExcel={allExcelData} loadingExcel={loadingExcel} />;
      case 'muestreo-sistematico':
        return <MuestreoSistematico onBack={() => setCurrentView('seleccion-muestras')} datosExcel={allExcelData} loadingExcel={loadingExcel} />;
      case 'muestreo-estratificado':
        return <MuestreoEstratificado onBack={() => setCurrentView('seleccion-muestras')} datosExcel={allExcelData} loadingExcel={loadingExcel} />;
      case 'muestreo-conglomerados-monoetapico':
        return <MuestreoConglomeradosMonoetapico onBack={() => setCurrentView('seleccion-muestras')} datosExcel={allExcelData} loadingExcel={loadingExcel} />;
      case 'muestreo-conglomerados-bietapico':
        return <MuestreoConglomeradosBietapico onBack={() => setCurrentView('seleccion-muestras')} datosExcel={allExcelData} loadingExcel={loadingExcel} />;
      // Future sub-views:
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
