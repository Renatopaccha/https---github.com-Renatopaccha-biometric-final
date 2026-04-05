import { useState } from 'react';

const teal = {
  50: '#f0fdfa',
  100: '#ccfbf1',
  200: '#99f6e4',
  500: '#14b8a6',
  600: '#0d9488',
  700: '#0f766e',
};

const BADGE = {
  Basico: { bg: '#e0f2fe', color: '#0369a1' },
  Comun: { bg: '#dcfce7', color: '#15803d' },
  'Muy comun': { bg: '#fef9c3', color: '#a16207' },
  Avanzado: { bg: '#fce7f3', color: '#be185d' },
  Esencial: { bg: '#ede9fe', color: '#6d28d9' },
  Clinico: { bg: '#ffedd5', color: '#c2410c' },
} as const;

const DIFF = {
  Facil: '#22c55e',
  Intermedio: '#f59e0b',
  Avanzado: '#ef4444',
} as const;

type Card = {
  id: string;
  badge: keyof typeof BADGE;
  difficulty: keyof typeof DIFF;
  title: string;
  description: string;
  tags: string[];
  icon: React.ReactNode;
};

const cards: Card[] = [
  {
    id: 'media',
    badge: 'Esencial',
    difficulty: 'Facil',
    title: 'Media',
    description:
      'Estima el valor promedio de una variable cuantitativa en la poblacion mediante intervalos de confianza y prueba t/z. Permite contrastar si la media poblacional es igual a un valor de referencia.',
    tags: ['Presion arterial media', 'Peso y talla', 'Glucemia en ayunas'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="7" x2="20" y2="7" strokeDasharray="3 2" opacity=".45" />
        <line x1="4" y1="17" x2="20" y2="17" strokeDasharray="3 2" opacity=".45" />
        <circle cx="9" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="14" cy="12" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'proporcion',
    badge: 'Muy comun',
    difficulty: 'Facil',
    title: 'Proporcion',
    description:
      'Calcula intervalos de confianza y realiza pruebas de hipotesis para proporciones poblacionales. Clave para estimar prevalencia e incidencia acumulada de enfermedades en una muestra.',
    tags: ['Prevalencia de obesidad', 'Cobertura vacunal', 'Frecuencia de sintomas'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <path d="M12 2 A10 10 0 0 1 22 12" />
        <path d="M22 12 A10 10 0 1 1 12 2" opacity=".35" />
        <line x1="12" y1="2" x2="12" y2="12" />
        <line x1="22" y1="12" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: 'percentiles',
    badge: 'Comun',
    difficulty: 'Facil',
    title: 'Percentiles',
    description:
      'Estima los valores que dividen la distribucion en partes iguales con sus intervalos de confianza. Fundamental para construir valores de referencia clinicos y curvas de crecimiento poblacional.',
    tags: ['Curvas de crecimiento', 'Valores de referencia', 'IMC por edad'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <line x1="3" y1="9" x2="21" y2="9" strokeDasharray="3 2" opacity=".4" />
        <line x1="3" y1="15" x2="21" y2="15" strokeDasharray="3 2" opacity=".4" />
        <circle cx="12" cy="9" r="2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="15" r="2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'correlacion',
    badge: 'Comun',
    difficulty: 'Intermedio',
    title: 'Correlacion',
    description:
      'Cuantifica el grado de asociacion lineal entre dos variables cuantitativas en una sola poblacion. Incluye el coeficiente de Pearson con su intervalo de confianza y prueba de significacion.',
    tags: ['IMC y presion arterial', 'Edad y hemoglobina', 'Dosis-respuesta'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <line x1="3" y1="20" x2="21" y2="20" />
        <line x1="3" y1="20" x2="3" y2="4" />
        <circle cx="6" cy="17" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="9" cy="14" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="15" cy="9" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="18" cy="7" r="1.4" fill="currentColor" stroke="none" />
        <line x1="5" y1="18" x2="19" y2="6.5" strokeDasharray="3 2" opacity=".5" />
      </svg>
    ),
  },
  {
    id: 'tasa-incidencia',
    badge: 'Clinico',
    difficulty: 'Intermedio',
    title: 'Tasa de incidencia',
    description:
      'Estima la velocidad de aparicion de nuevos eventos de salud en la poblacion por unidad de tiempo-persona. Permite construir intervalos de confianza y contrastar tasas con valores de referencia.',
    tags: ['Estudios de cohorte', 'Brotes epidemicos', 'Mortalidad por causa'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <polyline points="3 17 7 10 11 13 15 6 21 9" />
        <line x1="3" y1="20" x2="21" y2="20" />
        <circle cx="7" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="11" cy="13" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="6" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'indice-posicion',
    badge: 'Avanzado',
    difficulty: 'Avanzado',
    title: 'Indice de posicion',
    description:
      'Analiza la posicion relativa de un individuo o grupo dentro de la distribucion poblacional mediante cuartiles, deciles e indices de concentracion. Util para detectar desigualdades en salud.',
    tags: ['Desigualdad en salud', 'Quintiles socioeconomicos', 'Indice de Gini'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <rect x="3" y="14" width="4" height="7" rx="1" />
        <rect x="10" y="9" width="4" height="12" rx="1" />
        <rect x="17" y="4" width="4" height="17" rx="1" />
        <line x1="2" y1="3" x2="22" y2="3" strokeDasharray="3 2" opacity=".3" />
      </svg>
    ),
  },
];

interface UnaPoblacionProps {
  onSelect?: (methodId: string) => void;
  onBack?: () => void;
}

export default function UnaPoblacion({ onSelect, onBack }: UnaPoblacionProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      style={{
        minHeight: '100%',
        background: '#fafbfc',
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div
        style={{
          padding: '32px 40px 20px',
          background: '#fff',
          borderBottom: '1px solid #e8eaed',
          animation: 'unaPoblacionFadeUp 0.45s ease-out both',
        }}
      >
        <button
          type="button"
          onClick={() => onBack?.()}
          style={{
            fontSize: '13px',
            color: '#0d9488',
            fontWeight: 600,
            margin: '0 0 12px',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: onBack ? 'pointer' : 'default',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
          aria-label="Volver a inferencia sobre parametros"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Inferencia sobre parametros
        </button>

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
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1a1f2e', margin: 0 }}>Una poblacion</h1>
        </div>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '6px 0 0 14px' }}>
          Seleccione el parametro que desea estimar o contrastar
        </p>
      </div>

      <div
        style={{
          padding: '28px 28px 60px',
          maxWidth: '1100px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div
          className="una-poblacion-grid"
          style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '16px',
          animation: 'unaPoblacionFadeUp 0.45s ease-out both',
        }}
      >
        {cards.map((card, index) => {
          const isHovered = hovered === card.id;
          const badge = BADGE[card.badge] ?? BADGE.Basico;
          const diffColor = DIFF[card.difficulty] ?? DIFF.Facil;

          return (
            <button
              key={card.id}
              type="button"
              onMouseEnter={() => setHovered(card.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect?.(card.id)}
              style={{
                background: '#fff',
                border: isHovered ? '2px solid #d1fae5' : '2px solid #e5e7eb',
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all .22s ease',
                boxShadow: isHovered ? '0 4px 16px rgba(16,185,129,.08), 0 2px 6px rgba(0,0,0,.03)' : 'none',
                transform: isHovered ? 'translateY(-2px)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                textAlign: 'left',
                animation: `unaPoblacionFadeUp 0.45s ease-out ${index * 70}ms both`,
                minHeight: '340px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: isHovered ? teal[100] : teal[50],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: teal[600],
                    flexShrink: 0,
                    transition: 'background 0.18s',
                  }}
                >
                  {card.icon}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 9px',
                      borderRadius: '20px',
                      background: badge.bg,
                      color: badge.color,
                    }}
                  >
                    {card.badge}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: diffColor,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{card.difficulty}</span>
                  </div>
                </div>
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 600,
                  color: isHovered ? teal[700] : '#1a1f2e',
                  transition: 'color 0.18s',
                }}
              >
                {card.title}
              </h3>

              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#6b7280',
                  lineHeight: '1.65',
                  flexGrow: 1,
                }}
              >
                {card.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '11px',
                      padding: '3px 9px',
                      borderRadius: '20px',
                      background: '#f3f4f6',
                      color: '#4b5563',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #f3f4f6',
                  paddingTop: '12px',
                  marginTop: '2px',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: teal[600],
                  }}
                >
                  Seleccionar metodo
                </span>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: isHovered ? teal[600] : teal[50],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.18s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isHovered ? '#fff' : teal[600]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
        </div>
      </div>

      <style>{`
        @keyframes unaPoblacionFadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1100px) {
          .una-poblacion-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 760px) {
          .una-poblacion-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}