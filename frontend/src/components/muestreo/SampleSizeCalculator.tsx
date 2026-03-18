import { useState, useEffect } from 'react';

/* ─────────────── Data ─────────────── */

interface CategoryItem {
  name: string;
  desc: string;
  tag: string;
  formula: string;
}

interface Category {
  id: string;
  label: string;
  description: string;
  icon: JSX.Element;
  items: CategoryItem[];
}

const categories: Record<string, Category> = {
  intervalos: {
    id: 'intervalos',
    label: 'Intervalos de Confianza',
    description:
      'Determina el tamaño de muestra necesario para estimar un parámetro con un nivel de precisión deseado.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        <path d="M12 8v4l2 2" />
      </svg>
    ),
    items: [
      { name: 'Media', desc: 'Estimar el promedio de una variable continua (ej. presión arterial, IMC).', tag: 'Común', formula: 'n = (Z²·σ²) / E²' },
      { name: 'Proporción', desc: 'Estimar una proporción poblacional (ej. prevalencia de diabetes).', tag: 'Muy común', formula: 'n = (Z²·p·q) / E²' },
      { name: 'Odds Ratio', desc: 'Estimar el OR en estudios de casos y controles.', tag: 'Epidemiología', formula: 'Método de Woolf' },
      { name: 'Riesgo Relativo', desc: 'Estimar el RR en estudios de cohorte o ensayos clínicos.', tag: 'Epidemiología', formula: 'Método de Katz' },
      { name: 'Concordancia', desc: 'Estimar el índice Kappa entre dos observadores o métodos.', tag: 'Validación', formula: 'Método de Donner & Eliasziw' },
      { name: 'Pruebas Diagnósticas', desc: 'Estimar sensibilidad, especificidad u otros parámetros de una prueba.', tag: 'Diagnóstico', formula: 'Método de Buderer' },
    ],
  },
  contraste: {
    id: 'contraste',
    label: 'Contraste de Hipótesis',
    description:
      'Calcula el tamaño de muestra necesario para detectar diferencias significativas entre grupos con una potencia estadística adecuada.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h4l3-9 4 18 3-9h4" />
      </svg>
    ),
    items: [
      { name: 'Comparación de Medias', desc: 'Comparar promedios entre dos o más grupos (ej. T-test, ANOVA).', tag: 'Muy común', formula: 'n = 2·(Zα+Zβ)²·σ² / d²' },
      { name: 'Comparación de Proporciones', desc: 'Comparar porcentajes entre grupos (ej. tasas de curación).', tag: 'Muy común', formula: 'Método de Fleiss' },
      { name: 'Estudios de Casos y Controles', desc: 'Diseños retrospectivos que comparan exposición entre enfermos y sanos.', tag: 'Epidemiología', formula: 'Método de Kelsey' },
      { name: 'Estudios de Cohorte', desc: 'Diseños prospectivos que siguen expuestos y no expuestos.', tag: 'Epidemiología', formula: 'Método de Kelsey' },
      { name: 'Estudios de Equivalencia', desc: 'Demostrar que dos tratamientos tienen efectos similares.', tag: 'Ensayos clínicos', formula: 'Margen de equivalencia δ' },
      { name: 'Pruebas Diagnósticas (Hipótesis)', desc: 'Comparar rendimiento diagnóstico entre dos pruebas (grupos independientes o emparejados).', tag: 'Diagnóstico', formula: 'χ² / McNemar' },
      { name: 'Calidad de Lotes', desc: 'Verificar si un lote cumple un estándar de calidad aceptable.', tag: 'Especializado', formula: 'LQAS' },
      { name: 'Supervivencia', desc: 'Estudios de tiempo hasta un evento (ej. mortalidad, recaída).', tag: 'Avanzado', formula: 'Método de Schoenfeld' },
      { name: 'Coeficiente de Correlación', desc: 'Detectar asociación lineal significativa entre dos variables.', tag: 'Estadístico', formula: 'Transformación Z de Fisher' },
    ],
  },
};

/* Tag colors — hex values matching the original design exactly */
const tagColors: Record<string, { bg: string; text: string; border: string }> = {
  'Muy común':        { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  'Común':            { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  'Epidemiología':    { bg: '#e0f2fe', text: '#075985', border: '#bae6fd' },
  'Validación':       { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  'Diagnóstico':      { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' },
  'Ensayos clínicos': { bg: '#fce7f3', text: '#9d174d', border: '#fbcfe8' },
  'Especializado':    { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
  'Avanzado':         { bg: '#fff1f2', text: '#9f1239', border: '#fecdd3' },
  'Estadístico':      { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
};

/* ─────────────── Component ─────────────── */

interface SampleSizeCalculatorProps {
  onBack: () => void;
  onSelectItem?: (category: string, item: string) => void;
}

export function SampleSizeCalculator({ onBack, onSelectItem }: SampleSizeCalculatorProps) {
  const [activeTab, setActiveTab] = useState<string>('intervalos');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Re-trigger fade animation on tab change
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [activeTab]);

  const active = categories[activeTab];

  return (
    <div
      className="min-h-full flex flex-col"
      style={{ background: '#fafbfc', fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}
    >
      {/* Google Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ───── Header area ───── */}
      <div className="max-w-[1200px] w-full mx-auto px-16 pt-10">

        {/* Back button — modern pill style */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 cursor-pointer transition-all duration-200 focus:outline-none"
            style={{
              padding: '7px 14px 7px 10px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: 'white',
              color: '#10b981',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ecfdf5';
              e.currentTarget.style.borderColor = '#a7f3d0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Muestreo</span>
            <span style={{ color: '#d1d5db', fontWeight: 400, margin: '0 2px' }}>/</span>
            <span style={{ color: '#374151', fontWeight: 500 }}>Cálculo de tamaños de muestra</span>
          </button>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1
            className="m-0 font-bold tracking-tight"
            style={{ fontSize: 27, color: '#111827', letterSpacing: '-0.025em' }}
          >
            Cálculo de Tamaños de Muestra
          </h1>
          <p
            className="mt-2 leading-relaxed"
            style={{ fontSize: 15, color: '#6b7280' }}
          >
            Selecciona el enfoque y tipo de cálculo según tu diseño de estudio.
          </p>
        </div>

        {/* AI Suggestion Banner */}
        <div
          className="flex items-center gap-4 mb-9 cursor-pointer group"
          style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #ecfdf5 100%)',
            border: '1px solid #a7f3d0',
            borderRadius: 14,
            padding: '18px 22px',
          }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0 group-hover:brightness-90 transition-all duration-200"
            style={{ background: '#10b981', borderRadius: 10, width: 36, height: 36 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0" style={{ fontSize: 13.5, color: '#065f46', lineHeight: 1.6 }}>
            <span className="font-semibold">¿No sabes cuál elegir?</span>{' '}
            <span className="opacity-85">
              Describe tu estudio al Asistente IA y te ayudará a seleccionar la fórmula correcta y los parámetros adecuados.
            </span>
          </div>
          <div className="flex-shrink-0 opacity-50 group-hover:opacity-80 transition-opacity duration-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* ───── Tabs ───── */}
        <div
          className="flex gap-1 mb-9"
          style={{ background: '#f3f4f6', borderRadius: 12, padding: 4 }}
        >
          {Object.values(categories).map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className="flex-1 flex items-center justify-center gap-2 border-none cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none"
                style={{
                  padding: '12px 20px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  background: isActive ? 'white' : 'transparent',
                  color: isActive ? '#111827' : '#6b7280',
                  boxShadow: isActive
                    ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'
                    : 'none',
                }}
              >
                <span
                  className="flex transition-colors duration-200"
                  style={{ color: isActive ? '#10b981' : '#9ca3af' }}
                >
                  {cat.icon}
                </span>
                {cat.label}
                <span
                  className="transition-all duration-200"
                  style={{
                    background: isActive ? '#ecfdf5' : '#e5e7eb',
                    color: isActive ? '#059669' : '#6b7280',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 20,
                  }}
                >
                  {cat.items.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ───── Content area ───── */}
      <div className="flex-1 max-w-[1200px] w-full mx-auto px-16 pb-14">

        {/* Category description */}
        <p
          className="mb-7"
          style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}
        >
          {active.description}
        </p>

        {/* Cards Grid — animated on tab switch */}
        <div
          key={animKey}
          className="grid gap-6"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            animation: 'sscFadeSlideUp 0.35s ease-out both',
          }}
        >
          {active.items.map((item, i) => {
            const itemKey = `${activeTab}-${i}`;
            const isHovered = hoveredItem === itemKey;
            const tc = tagColors[item.tag] || tagColors['Común'];

            return (
              <button
                key={itemKey}
                onMouseEnter={() => setHoveredItem(itemKey)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => onSelectItem?.(activeTab, item.name)}
                className="group relative text-left flex flex-col justify-between cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                style={{
                  background: 'white',
                  border: isHovered ? '1.5px solid #10b981' : '1.5px solid #e5e7eb',
                  borderRadius: 14,
                  padding: '20px 22px',
                  minHeight: 160,
                  transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                  boxShadow: isHovered
                    ? '0 8px 25px rgba(16, 185, 129, 0.12), 0 4px 10px rgba(0,0,0,0.04)'
                    : '0 1px 3px rgba(0,0,0,0.05)',
                  animation: `sscFadeSlideUp 0.35s ease-out ${i * 45}ms both`,
                }}
              >
                {/* Top */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3
                      className="m-0 font-bold tracking-tight transition-colors duration-200"
                      style={{
                        fontSize: 15,
                        color: isHovered ? '#059669' : '#111827',
                      }}
                    >
                      {item.name}
                    </h3>
                    <span
                      className="whitespace-nowrap"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: 20,
                        background: tc.bg,
                        color: tc.text,
                        border: `1px solid ${tc.border}`,
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>
                  <p
                    className="m-0"
                    style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55 }}
                  >
                    {item.desc}
                  </p>
                </div>

                {/* Bottom */}
                <div
                  className="flex items-center justify-between"
                  style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}
                >
                  <code
                    style={{
                      fontSize: 11,
                      color: '#9ca3af',
                      fontFamily: "'DM Mono', 'SF Mono', monospace",
                      background: '#f9fafb',
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {item.formula}
                  </code>
                  <span
                    className="inline-flex items-center gap-1 transition-all duration-200"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isHovered ? '#10b981' : '#d1d5db',
                      transform: isHovered ? 'translateX(2px)' : 'translateX(0)',
                    }}
                  >
                    Calcular
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes sscFadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(14px);
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
