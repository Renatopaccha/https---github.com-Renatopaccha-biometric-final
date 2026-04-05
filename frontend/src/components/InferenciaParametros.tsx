import { useCallback, useEffect, useState } from 'react';
import UnaPoblacion from './inferencia/UnaPoblacion';
import DosPoblaciones from './inferencia/DosPoblaciones';
import InferenciaMedia from './inferencia/InferenciaMedia';
import InferenciaProporcion from './inferencia/InferenciaProporcion';
import InferenciaPearson from './inferencia/InferenciaPearson';
import InferenciaPercentil from './inferencia/InferenciaPercentil';
import InferenciaTasaIncidencia from './inferencia/InferenciaTasaIncidencia';
import InferenciaIndicePosicion from './inferencia/InferenciaIndicePosicion';
import InferenciaMediasIndep from './inferencia/InferenciaMediasIndep';
import { useDataContext } from '../context/DataContext';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

const teal = {
  50: '#f0fdfa',
  100: '#ccfbf1',
  500: '#14b8a6',
  600: '#0d9488',
  700: '#0f766e',
};

const cards = [
  {
    id: 'una-poblacion',
    title: 'Una poblacion',
    description:
      'Estimacion por intervalos de confianza y contrastes de hipotesis para la media, proporcion y varianza de una unica poblacion. Esencial para validar supuestos clinicos con una sola muestra.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
      </svg>
    ),
  },
  {
    id: 'dos-poblaciones',
    title: 'Dos poblaciones',
    description:
      'Comparacion de medias, proporciones y varianzas entre dos grupos independientes o muestras apareadas. Incluye prueba t de Student, Welch y analisis de diferencias entre tratamientos.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <circle cx="8" cy="8" r="3.5" />
        <path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h1" />
        <circle cx="16" cy="8" r="3.5" />
        <path d="M21 20v-1.5A4.5 4.5 0 0 0 16.5 14h-1" />
      </svg>
    ),
  },
  {
    id: 'comparacion-no-parametrica',
    title: 'Comparacion no parametrica',
    description:
      'Pruebas de hipotesis sin supuesto de normalidad: Mann-Whitney, Wilcoxon, Kruskal-Wallis y Friedman. Ideal cuando los datos son ordinales o no cumplen distribucion normal.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <polyline points="3 17 7 11 11 14 15 8 21 13" />
        <line x1="3" y1="20" x2="21" y2="20" />
      </svg>
    ),
  },
  {
    id: 'contraste-normalidad',
    title: 'Contraste de normalidad',
    description:
      'Verifica si los datos siguen distribucion normal mediante Shapiro-Wilk, Kolmogorov-Smirnov y Lilliefors. Paso previo fundamental antes de aplicar pruebas parametricas.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <path d="M3 18 C5 18 6 10 9 7 C10.5 5.5 11 5 12 5 C13 5 13.5 5.5 15 7 C18 10 19 18 21 18" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
  },
];

interface InferenciaParametrosProps {
  onNavigate?: (view: string, chatId?: string) => void;
  resetSignal?: number;
}

export function InferenciaParametros({ onNavigate, resetSignal = 0 }: InferenciaParametrosProps) {
  const [activeCard, setActiveCard] = useState('una-poblacion');
  const [subView, setSubView] = useState<'hub' | 'una-poblacion' | 'dos-poblaciones' | 'media' | 'proporcion' | 'correlacion' | 'percentiles' | 'tasa-incidencia' | 'indice-posicion' | 'medias-independientes'>('hub');
  const { sessionId } = useDataContext();
  const [allExcelData, setAllExcelData] = useState<any[] | null>(null);
  const [loadingExcel, setLoadingExcel] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (!sessionId) {
      setAllExcelData(null);
      return;
    }

    setLoadingExcel(true);
    try {
      const countRes = await fetch(`${API_BASE_URL}/data?session_id=${sessionId}&skip=0&limit=1`);
      if (!countRes.ok) {
        setAllExcelData(null);
        setLoadingExcel(false);
        return;
      }

      const countResult = await countRes.json();
      const total = countResult.total_rows || 0;
      if (total === 0) {
        setAllExcelData(null);
        setLoadingExcel(false);
        return;
      }

      const chunkSize = 1000;
      let allFetchedRows: any[] = [];
      let currentSkip = 0;

      while (currentSkip < total) {
        const fetchLimit = Math.min(chunkSize, total - currentSkip);
        const response = await fetch(`${API_BASE_URL}/data?session_id=${sessionId}&skip=${currentSkip}&limit=${fetchLimit}`);
        if (!response.ok) break;

        const result = await response.json();
        if (result.data && result.data.length > 0) {
          allFetchedRows = [...allFetchedRows, ...result.data];
        }
        currentSkip += fetchLimit;
      }

      setAllExcelData(allFetchedRows.length > 0 ? allFetchedRows : null);
    } catch {
      setAllExcelData(null);
    }
    setLoadingExcel(false);
  }, [sessionId]);

  useEffect(() => {
    if ((subView === 'media' || subView === 'proporcion' || subView === 'correlacion' || subView === 'percentiles' || subView === 'tasa-incidencia' || subView === 'indice-posicion' || subView === 'medias-independientes') && sessionId && !allExcelData) {
      fetchAllData();
    }
  }, [subView, sessionId, allExcelData, fetchAllData]);

  useEffect(() => {
    if (!sessionId) {
      setAllExcelData(null);
    }
  }, [sessionId]);

  useEffect(() => {
    setSubView('hub');
    setActiveCard('una-poblacion');
  }, [resetSignal]);

  if (subView === 'una-poblacion') {
    return (
      <UnaPoblacion
        onBack={() => setSubView('hub')}
        onSelect={(methodId) => {
          if (methodId === 'media') {
            setSubView('media');
          } else if (methodId === 'proporcion') {
            setSubView('proporcion');
          } else if (methodId === 'correlacion') {
            setSubView('correlacion');
          } else if (methodId === 'percentiles') {
            setSubView('percentiles');
          } else if (methodId === 'tasa-incidencia') {
            setSubView('tasa-incidencia');
          } else if (methodId === 'indice-posicion') {
            setSubView('indice-posicion');
          }
        }}
      />
    );
  }

  if (subView === 'dos-poblaciones') {
    return (
      <DosPoblaciones
        onBack={() => setSubView('hub')}
        onContinuarChat={() => onNavigate?.('asistente')}
        onSelect={(methodId) => {
          if (methodId === 'medias-ind') {
            setSubView('medias-independientes');
          }
        }}
      />
    );
  }

  if (subView === 'medias-independientes') {
    return (
      <InferenciaMediasIndep
        onBack={() => setSubView('dos-poblaciones')}
        datosExcel={allExcelData}
        loadingExcel={loadingExcel}
        onContinuarChat={() => onNavigate?.('asistente')}
      />
    );
  }

  if (subView === 'media') {
    return (
      <InferenciaMedia
        onBack={() => setSubView('una-poblacion')}
        datosExcel={allExcelData}
        loadingExcel={loadingExcel}
        onContinuarChat={() => onNavigate?.('asistente')}
      />
    );
  }

  if (subView === 'proporcion') {
    return (
      <InferenciaProporcion
        onBack={() => setSubView('una-poblacion')}
        datosExcel={allExcelData}
        loadingExcel={loadingExcel}
        onContinuarChat={() => onNavigate?.('asistente')}
      />
    );
  }

  if (subView === 'correlacion') {
    return (
      <InferenciaPearson
        onBack={() => setSubView('una-poblacion')}
        datosExcel={allExcelData}
        loadingExcel={loadingExcel}
        onContinuarChat={() => onNavigate?.('asistente')}
      />
    );
  }

  if (subView === 'percentiles') {
    return (
      <InferenciaPercentil
        onBack={() => setSubView('una-poblacion')}
        datosExcel={allExcelData}
        loadingExcel={loadingExcel}
        onContinuarChat={() => onNavigate?.('asistente')}
      />
    );
  }

  if (subView === 'tasa-incidencia') {
    return (
      <InferenciaTasaIncidencia
        onBack={() => setSubView('una-poblacion')}
        datosExcel={allExcelData}
        loadingExcel={loadingExcel}
        onContinuarChat={() => onNavigate?.('asistente')}
      />
    );
  }

  if (subView === 'indice-posicion') {
    return (
      <InferenciaIndicePosicion
        onBack={() => setSubView('una-poblacion')}
        datosExcel={allExcelData}
        loadingExcel={loadingExcel}
        onContinuarChat={() => onNavigate?.('asistente')}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: '100%',
        background: '#f4f6f8',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        padding: 0,
      }}
    >
      <div
        style={{
          padding: '32px clamp(20px, 4vw, 40px) 20px',
          background: '#fff',
          borderBottom: '1px solid #e8eaed',
          animation: 'inferenciaFadeUp 0.45s ease-out both',
        }}
      >
        <div style={{ maxWidth: '920px', width: '100%', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '4px',
                height: '30px',
                borderRadius: '4px',
                background: teal[600],
                flexShrink: 0,
              }}
            />
            <h1
              style={{
                fontSize: '26px',
                fontWeight: '700',
                color: '#1a1f2e',
                margin: 0,
              }}
            >
              Inferencia sobre parametros
            </h1>
          </div>
          <p
            style={{
              color: '#6b7280',
              fontSize: '14px',
              marginTop: '6px',
              marginLeft: '14px',
              marginBottom: 0,
            }}
          >
            Seleccione el tipo de inferencia estadistica que desea realizar
          </p>
        </div>
      </div>

      <div
        style={{
          padding: '32px clamp(20px, 4vw, 40px)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            maxWidth: '920px',
            width: '100%',
            margin: '0 auto',
            animation: 'inferenciaFadeUp 0.45s ease-out both',
          }}
        >
          {cards.map((card, index) => {
            const isActive = activeCard === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setActiveCard(card.id);
                  if (card.id === 'una-poblacion') {
                    setSubView('una-poblacion');
                  } else if (card.id === 'dos-poblaciones') {
                    setSubView('dos-poblaciones');
                  }
                }}
                style={{
                  background: '#fff',
                  border: isActive ? `2px solid ${teal[600]}` : '1.5px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '28px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.18s, border-color 0.18s, transform 0.12s',
                  boxShadow: isActive ? '0 4px 18px rgba(13,148,136,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
                  transform: isActive ? 'translateY(-1px)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  textAlign: 'left',
                  animation: `inferenciaFadeUp 0.45s ease-out ${index * 80}ms both`,
                }}
              >
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    background: isActive ? teal[100] : teal[50],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: teal[600],
                  }}
                >
                  {card.icon}
                </div>

                <h3
                  style={{
                    margin: 0,
                    fontSize: '15.5px',
                    fontWeight: '600',
                    color: isActive ? teal[700] : '#1a1f2e',
                  }}
                >
                  {card.title}
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: '13.5px',
                    color: '#6b7280',
                    lineHeight: '1.65',
                    flexGrow: 1,
                  }}
                >
                  {card.description}
                </p>

                {isActive && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: teal[600],
                      fontSize: '13.5px',
                      fontWeight: '500',
                      marginTop: '2px',
                    }}
                  >
                    Abrir herramienta
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes inferenciaFadeUp {
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

export default InferenciaParametros;