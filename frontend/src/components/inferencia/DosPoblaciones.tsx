import { useState, type ReactNode } from 'react';

const teal = {
  50: '#f0fdfa',
  100: '#ccfbf1',
  500: '#14b8a6',
  600: '#0d9488',
  700: '#0f766e',
};

const BADGE = {
  Esencial: { bg: '#ede9fe', color: '#6d28d9' },
  Comun: { bg: '#dcfce7', color: '#15803d' },
  Clinico: { bg: '#ffedd5', color: '#c2410c' },
  Avanzado: { bg: '#fce7f3', color: '#be185d' },
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
  icon: ReactNode;
};

const cards: Card[] = [
  {
    id: 'medias-ind',
    badge: 'Esencial',
    difficulty: 'Facil',
    title: 'Medias independientes',
    description:
      'Compara el promedio de una variable numerica entre dos grupos distintos que no tienen relacion entre si.',
    tags: ['Hombres vs. Mujeres', 'Tratamiento vs. Control'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <circle cx="8" cy="8" r="3" />
        <path d="M3 20v-1a4 4 0 0 1 4-4h2" />
        <circle cx="16" cy="8" r="3" />
        <path d="M21 20v-1a4 4 0 0 0-4-4h-2" />
      </svg>
    ),
  },
  {
    id: 'medias-emp',
    badge: 'Comun',
    difficulty: 'Facil',
    title: 'Medias emparejadas',
    description:
      'Analiza cambios en el promedio de un mismo grupo evaluado en dos momentos diferentes o parejas vinculadas.',
    tags: ['Antes vs. Despues', 'Ojo derecho vs. Izquierdo'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <path d="M4 8h12" />
        <path d="M12 4l4 4-4 4" />
        <path d="M20 16H8" />
        <path d="M12 12l-4 4 4 4" />
      </svg>
    ),
  },
  {
    id: 'prop-ind',
    badge: 'Comun',
    difficulty: 'Intermedio',
    title: 'Proporciones independientes',
    description:
      'Compara porcentajes o frecuencias de una caracteristica cualitativa entre dos grupos independientes.',
    tags: ['% Fumadores por ciudad', 'Eficacia de vacuna A vs. B'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <path d="M12 2 A10 10 0 0 1 22 12" />
        <path d="M22 12 A10 10 0 1 1 12 2" opacity=".35" />
        <line x1="12" y1="2" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: 'prop-emp',
    badge: 'Clinico',
    difficulty: 'Intermedio',
    title: 'Proporciones emparejadas',
    description:
      'Evalua si hubo un cambio significativo en una proporcion dentro del mismo grupo (prueba de McNemar).',
    tags: ['Sintomas pre/post', 'Diagnostico medico vs. IA'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <rect x="3" y="4" width="8" height="6" rx="1.5" />
        <rect x="13" y="14" width="8" height="6" rx="1.5" />
        <path d="M11 7h2a4 4 0 0 1 4 4v3" />
        <path d="M13 17h-2a4 4 0 0 1-4-4V10" />
      </svg>
    ),
  },
  {
    id: 'tasas',
    badge: 'Avanzado',
    difficulty: 'Avanzado',
    title: 'Tasas de incidencia',
    description:
      'Compara la velocidad de aparicion de nuevos eventos de salud entre dos poblaciones expuestas y no expuestas.',
    tags: ['Casos por persona-ano', 'Riesgo relativo en cohortes'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <polyline points="3 17 7 10 11 13 15 6 21 9" />
        <line x1="3" y1="20" x2="21" y2="20" />
      </svg>
    ),
  },
];

interface DosPoblacionesProps {
  onBack?: () => void;
  onContinuarChat?: () => void;
  onSelect?: (methodId: string) => void;
}

export default function DosPoblaciones({ onBack, onContinuarChat, onSelect }: DosPoblacionesProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

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
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1a1f2e', margin: 0 }}>Dos poblaciones</h1>
        </div>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '6px 0 0 14px' }}>
          Compare parametros entre dos grupos para evaluar diferencias estadisticamente significativas
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
          className="dos-poblaciones-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '16px',
            animation: 'unaPoblacionFadeUp 0.45s ease-out both',
          }}
        >
          {cards.map((card, index) => {
            const isHovered = hovered === card.id;
              const isSelected = selectedMethod === card.id;
            const badge = BADGE[card.badge] ?? BADGE.Comun;
            const diffColor = DIFF[card.difficulty] ?? DIFF.Facil;

            return (
              <button
                key={card.id}
                type="button"
                onMouseEnter={() => setHovered(card.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  setSelectedMethod(card.id);
                  onSelect?.(card.id);
                }}
                style={{
                  background: '#fff',
                  border: isSelected ? `2px solid ${teal[600]}` : isHovered ? '2px solid #d1fae5' : '2px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all .22s ease',
                  boxShadow: isSelected
                    ? '0 8px 20px rgba(13,148,136,0.14), 0 2px 6px rgba(0,0,0,.03)'
                    : isHovered
                      ? '0 4px 16px rgba(16,185,129,.08), 0 2px 6px rgba(0,0,0,.03)'
                      : 'none',
                  transform: isSelected || isHovered ? 'translateY(-2px)' : 'none',
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
                    color: isSelected || isHovered ? teal[700] : '#1a1f2e',
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
                      color: isSelected ? teal[700] : teal[600],
                    }}
                  >
                    {isSelected ? 'Metodo seleccionado' : 'Seleccionar metodo'}
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

          <div
            style={{
              background: 'linear-gradient(135deg, #0d9488, #0f766e)',
              borderRadius: '16px',
              padding: '22px',
              color: '#fff',
              minHeight: '340px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 12px 24px rgba(13,148,136,0.18)',
              animation: `unaPoblacionFadeUp 0.45s ease-out ${cards.length * 70}ms both`,
            }}
          >
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, lineHeight: 1.2 }}>
                No estas seguro de que prueba usar?
              </h3>
              <p style={{ margin: '12px 0 0', fontSize: '13px', lineHeight: 1.6, color: 'rgba(255,255,255,.9)' }}>
                Describe tus variables y el tipo de comparacion. El asistente IA puede sugerir la prueba mas adecuada para tus dos poblaciones.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onContinuarChat?.()}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: '10px',
                background: '#fff',
                color: '#0f766e',
                fontWeight: 700,
                fontSize: '13px',
                padding: '11px 14px',
                cursor: 'pointer',
              }}
            >
              Consultar al asistente
            </button>
          </div>
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
          .dos-poblaciones-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 760px) {
          .dos-poblaciones-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
