/*
  ╔══════════════════════════════════════════════════════════════════╗
  ║  BIOMETRIC — Selección de Muestras                              ║
  ║  7 métodos de muestreo probabilístico                           ║
  ║  Diseño basado en el sistema de diseño Biometric                ║
  ╚══════════════════════════════════════════════════════════════════╝
*/

import { useState } from "react";

/* ═══════════════════════════════════════════════════
   DATOS DE LOS MÉTODOS DE MUESTREO
   ═══════════════════════════════════════════════════ */
const METODOS = [
  {
    id: "simple",
    titulo: "Muestreo Simple Aleatorio",
    descripcion: "Cada sujeto de la población tiene la misma probabilidad de ser seleccionado. Se usa cuando la población es homogénea y tienes acceso a un listado completo.",
    usos: ["Estudios de prevalencia", "Encuestas de opinión", "Control de calidad"],
    badge: "Básico",
    badgeColor: { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" },
    icon: "🎲",
    iconBg: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
    dificultad: "Fácil",
    cuando: "Cuando tienes un listado completo de la población y esta es relativamente homogénea.",
    ejemplo: "Seleccionar 100 pacientes al azar de un registro hospitalario de 2.000.",
  },
  {
    id: "sistematico",
    titulo: "Muestreo Sistemático",
    descripcion: "Se selecciona cada k-ésimo elemento de una lista ordenada. Práctico cuando tienes una lista larga y necesitas una muestra distribuida uniformemente.",
    usos: ["Registros médicos ordenados", "Historias clínicas", "Líneas de producción"],
    badge: "Común",
    badgeColor: { bg: "#eff6ff", text: "#3b82f6", border: "#bfdbfe" },
    icon: "📋",
    iconBg: "linear-gradient(135deg, #eff6ff, #dbeafe)",
    dificultad: "Fácil",
    cuando: "Cuando tienes una lista ordenada y quieres seleccionar elementos con intervalos regulares.",
    ejemplo: "Seleccionar cada 5to expediente de un archivo de 500 historias clínicas.",
  },
  {
    id: "estratificado",
    titulo: "Muestreo Aleatorio Estratificado",
    descripcion: "La población se divide en subgrupos (estratos) homogéneos y se toma una muestra aleatoria de cada uno. Garantiza representación de todos los grupos.",
    usos: ["Estudios por grupos de edad", "Análisis por sexo o etnia", "Encuestas nacionales"],
    badge: "Muy común",
    badgeColor: { bg: "#fdf4ff", text: "#a855f7", border: "#e9d5ff" },
    icon: "🗂️",
    iconBg: "linear-gradient(135deg, #fdf4ff, #f3e8ff)",
    dificultad: "Intermedio",
    cuando: "Cuando la población tiene subgrupos con características distintas y quieres asegurar su representación.",
    ejemplo: "Estratificar por grupo etario (niños, adultos, adultos mayores) y muestrear dentro de cada grupo.",
  },
  {
    id: "conglomerados-mono",
    titulo: "Muestreo por Conglomerados Monoetápico",
    descripcion: "Se seleccionan aleatoriamente grupos (conglomerados) completos como unidad muestral. Todos los individuos del conglomerado seleccionado son incluidos.",
    usos: ["Estudios por escuelas o comunidades", "Barrios o municipios", "Hospitales o clínicas"],
    badge: "Epidemiología",
    badgeColor: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
    icon: "🏘️",
    iconBg: "linear-gradient(135deg, #fff7ed, #ffedd5)",
    dificultad: "Intermedio",
    cuando: "Cuando no tienes un listado de individuos pero sí de grupos naturales (escuelas, barrios, consultorios).",
    ejemplo: "Seleccionar 10 escuelas al azar e incluir a todos los estudiantes de esas escuelas.",
  },
  {
    id: "conglomerados-bi",
    titulo: "Muestreo por Conglomerados Bietápico",
    descripcion: "Primero se seleccionan conglomerados y luego se hace un segundo muestreo dentro de cada conglomerado elegido. Más eficiente que el monoetápico.",
    usos: ["Encuestas nacionales de salud", "Estudios multicentro", "Investigación comunitaria"],
    badge: "Avanzado",
    badgeColor: { bg: "#fefce8", text: "#ca8a04", border: "#fde68a" },
    icon: "🏗️",
    iconBg: "linear-gradient(135deg, #fefce8, #fef3c7)",
    dificultad: "Avanzado",
    cuando: "Cuando la población está distribuida en muchas unidades geográficas y no es factible encuestar a todos dentro de cada conglomerado.",
    ejemplo: "Seleccionar 20 barrios y dentro de cada barrio elegir 15 hogares al azar.",
  },
  {
    id: "conglomerados-mono-est",
    titulo: "Conglomerados Monoetápico Estratificado",
    descripcion: "Combina la estratificación con el muestreo por conglomerados en una sola etapa. Los conglomerados se agrupan en estratos antes de ser seleccionados.",
    usos: ["Encuestas regionales", "Estudios por nivel socioeconómico", "Investigación multicéntrica"],
    badge: "Complejo",
    badgeColor: { bg: "#f0f9ff", text: "#0284c7", border: "#bae6fd" },
    icon: "🗺️",
    iconBg: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
    dificultad: "Avanzado",
    cuando: "Cuando tienes conglomerados con características muy distintas entre sí y quieres asegurar la representación de cada tipo.",
    ejemplo: "Estratificar hospitales por nivel (I, II, III) y seleccionar conglomerados dentro de cada nivel.",
  },
  {
    id: "conglomerados-bi-est",
    titulo: "Conglomerados Bietápico Estratificado",
    descripcion: "El método más completo: estratificación + selección de conglomerados en primera etapa + muestreo de individuos en segunda etapa. Estándar en encuestas nacionales.",
    usos: ["ENSANUT y encuestas nacionales", "Estudios OPS/OMS", "Investigación poblacional compleja"],
    badge: "Experto",
    badgeColor: { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
    icon: "🌐",
    iconBg: "linear-gradient(135deg, #fdf2f8, #fce7f3)",
    dificultad: "Experto",
    cuando: "Para estudios poblacionales a gran escala donde se necesita máxima eficiencia estadística y representatividad geográfica.",
    ejemplo: "ENSANUT: estratificar por provincia → seleccionar sectores censales → seleccionar hogares → seleccionar individuos.",
  },
];

const DIFICULTAD_COLORS: any = {
  "Fácil":      { dot: "#10b981", text: "#059669", bg: "#ecfdf5" },
  "Intermedio": { dot: "#f59e0b", text: "#d97706", bg: "#fefce8" },
  "Avanzado":   { dot: "#f97316", text: "#ea580c", bg: "#fff7ed" },
  "Experto":    { dot: "#ef4444", text: "#dc2626", bg: "#fef2f2" },
};

/* ═══════════════════════════════════════════════════
   ÍCONOS
   ═══════════════════════════════════════════════════ */
const BackIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);
const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const SparkleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);
const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/* ═══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════ */
export default function SeleccionMuestras({ onBack, onNavigate }: { onBack?: () => void, onNavigate?: (view: string) => void }) {
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [detalle, setDetalle] = useState<string | null>(null); // id del método expandido
  const [hover, setHover] = useState<string | null>(null);

  const FILTROS = [
    { id: "todos",    label: "Todos",         count: 7 },
    { id: "basico",   label: "Básico",        count: 2 },
    { id: "complejo", label: "Conglomerados", count: 4 },
  ];

  const metodosFiltrados = METODOS.filter((m) => {
    const matchBusqueda = busqueda === "" ||
      m.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    const matchFiltro =
      filtro === "todos" ||
      (filtro === "basico" && ["simple", "sistematico", "estratificado"].includes(m.id)) ||
      (filtro === "complejo" && m.id.includes("conglomerados"));
    return matchBusqueda && matchFiltro;
  });

  const metodoCurrent = detalle ? METODOS.find((m) => m.id === detalle) : null;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#fafbfc", minHeight: "100vh", color: "#111827" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideRight { from { opacity:0; transform:translateX(24px) } to { opacity:1; transform:translateX(0) } }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 28px 60px" }}>

        {/* ── Breadcrumb ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <span onClick={onBack} style={{ color: "#10b981", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <BackIcon /> Muestreo
          </span>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#374151", fontWeight: 600 }}>Selección de Muestras</span>
        </div>

        {/* ── Encabezado ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 6, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 24 }}>
              👥
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "#111827", letterSpacing: "-.025em" }}>Selección de Muestras</h1>
              <p style={{ fontSize: 14, color: "#6b7280", margin: "5px 0 0", lineHeight: 1.5 }}>
                7 métodos de muestreo probabilístico · Elige el adecuado según tu diseño de estudio
              </p>
            </div>
          </div>

          {/* Contador */}
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            {[
              { label: "Métodos disponibles", value: "7", color: "#10b981" },
              { label: "Listos para usar", value: "7", color: "#059669" },
            ].map((s) => (
              <div key={s.label} style={{ background: "white", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Banner IA ── */}
        <div style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", border: "1px solid #a7f3d0", borderRadius: 12, padding: "12px 16px", margin: "18px 0 24px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#065f46", cursor: "pointer" }}>
          <div style={{ background: "#10b981", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}><SparkleIcon /></div>
          <span><b>Asistente IA:</b> ¿No sabes qué método elegir? Cuéntame las características de tu población y el tipo de estudio, y te recomendaré el método de muestreo más adecuado.</span>
          <span style={{ marginLeft: "auto", color: "#10b981", flexShrink: 0 }}><ArrowRight /></span>
        </div>

        {/* ── Barra de búsqueda + filtros ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap", alignItems: "center" }}>
          {/* Búsqueda */}
          <div style={{ flex: "1 1 260px", display: "flex", alignItems: "center", gap: 10, background: "white", border: "1.5px solid #e5e7eb", borderRadius: 11, padding: "10px 14px", transition: "border-color .2s" }}>
            <span style={{ color: "#9ca3af", display: "flex", flexShrink: 0 }}><SearchIcon /></span>
            <input
              type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar método de muestreo..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "inherit", color: "#111827", background: "transparent" }}
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 0 }}><CloseIcon /></button>
            )}
          </div>

          {/* Filtros */}
          <div style={{ display: "flex", gap: 6, background: "#f3f4f6", borderRadius: 11, padding: 4 }}>
            {FILTROS.map((f) => (
              <button key={f.id} onClick={() => setFiltro(f.id)} style={{
                padding: "8px 14px", border: "none", borderRadius: 8,
                cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all .2s ease",
                background: filtro === f.id ? "white" : "transparent",
                color: filtro === f.id ? "#111827" : "#6b7280",
                boxShadow: filtro === f.id ? "0 1px 3px rgba(0,0,0,.08)" : "none",
              }}>
                {f.label}
                <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: filtro === f.id ? "#ecfdf5" : "#e5e7eb", color: filtro === f.id ? "#059669" : "#9ca3af" }}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Layout principal ── */}
        <div style={{ display: "grid", gridTemplateColumns: detalle ? "1fr 400px" : "1fr", gap: 20, alignItems: "start" }}>

          {/* ── Grid de tarjetas ── */}
          <div style={{ display: "grid", gridTemplateColumns: detalle ? "1fr 1fr" : "repeat(3, 1fr)", gap: 16 }}>
            {metodosFiltrados.length === 0 ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Sin resultados</div>
                <div style={{ fontSize: 14 }}>Intenta con otro término de búsqueda</div>
              </div>
            ) : metodosFiltrados.map((m, i) => {
              const dc = DIFICULTAD_COLORS[m.dificultad];
              const isSelected = detalle === m.id;
              const isHovered = hover === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setDetalle(detalle === m.id ? null : m.id)}
                  onMouseEnter={() => setHover(m.id)}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    background: isSelected ? "white" : "white",
                    border: isSelected ? "2px solid #10b981" : isHovered ? "2px solid #d1fae5" : "2px solid #e5e7eb",
                    borderRadius: 16, padding: 20, cursor: "pointer",
                    transition: "all .22s ease",
                    boxShadow: isSelected
                      ? "0 8px 25px rgba(16,185,129,.12), 0 2px 8px rgba(0,0,0,.04)"
                      : isHovered ? "0 4px 16px rgba(16,185,129,.08), 0 2px 6px rgba(0,0,0,.03)" : "none",
                    animation: `slideUp .3s ease ${i * 0.05}s both`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Selección activa */}
                  {isSelected && (
                    <div style={{ position: "absolute", top: 12, right: 12, width: 22, height: 22, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                      <CheckIcon />
                    </div>
                  )}

                  {/* Icono + Badge */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 13, background: isSelected ? "linear-gradient(135deg,#ecfdf5,#d1fae5)" : m.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transition: "all .2s" }}>
                      {m.icon}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: m.badgeColor.bg, color: m.badgeColor.text, border: `1px solid ${m.badgeColor.border}` }}>
                        {m.badge}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: dc.bg, color: dc.text, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: dc.dot, display: "inline-block" }} />
                        {m.dificultad}
                      </span>
                    </div>
                  </div>

                  {/* Título */}
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: isSelected ? "#065f46" : "#111827", margin: "0 0 8px", lineHeight: 1.3, transition: "color .2s" }}>
                    {m.titulo}
                  </h3>

                  {/* Descripción */}
                  <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px", lineHeight: 1.55 }}>
                    {m.descripcion}
                  </p>

                  {/* Tags de usos */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                    {m.usos.map((uso) => (
                      <span key={uso} style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", background: "#f3f4f6", padding: "3px 9px", borderRadius: 20 }}>
                        {uso}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f3f4f6", paddingTop: 13, marginTop: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? "#10b981" : "#9ca3af", transition: "color .2s" }}>
                      {isSelected ? "Ver detalle ↓" : "Seleccionar método"}
                    </span>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: isSelected ? "#10b981" : isHovered ? "#ecfdf5" : "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", color: isSelected ? "white" : "#10b981", transition: "all .2s", transform: isHovered && !isSelected ? "translateX(2px)" : "none" }}>
                      <ArrowRight />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Panel de detalle ── */}
          {metodoCurrent && (
            <div style={{ position: "sticky", top: 20, background: "white", border: "2px solid #10b981", borderRadius: 20, overflow: "hidden", animation: "slideRight .3s cubic-bezier(.16,1,.3,1)" }}>

              {/* Header del panel */}
              <div style={{ background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", padding: "22px 24px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 2px 8px rgba(16,185,129,.15)" }}>
                    {metodoCurrent.icon}
                  </div>
                  <button onClick={() => setDetalle(null)} style={{ background: "rgba(255,255,255,.7)", border: "none", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280" }}>
                    <CloseIcon />
                  </button>
                </div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#065f46", margin: "0 0 5px", lineHeight: 1.3 }}>{metodoCurrent.titulo}</h2>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: metodoCurrent.badgeColor.bg, color: metodoCurrent.badgeColor.text, border: `1px solid ${metodoCurrent.badgeColor.border}` }}>
                    {metodoCurrent.badge}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: DIFICULTAD_COLORS[metodoCurrent.dificultad].bg, color: DIFICULTAD_COLORS[metodoCurrent.dificultad].text, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: DIFICULTAD_COLORS[metodoCurrent.dificultad].dot }} />
                    {metodoCurrent.dificultad}
                  </span>
                </div>
              </div>

              {/* Cuerpo del panel */}
              <div style={{ padding: "20px 24px" }}>

                {/* ¿Cuándo usarlo? */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#10b981", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 16, height: 2, background: "#10b981", borderRadius: 2 }} />
                    ¿Cuándo usarlo?
                  </div>
                  <div style={{ background: "#f9fafb", borderRadius: 11, padding: "13px 15px", fontSize: 13, color: "#374151", lineHeight: 1.6, border: "1px solid #f3f4f6" }}>
                    {metodoCurrent.cuando}
                  </div>
                </div>

                {/* Ejemplo práctico */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#10b981", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 16, height: 2, background: "#10b981", borderRadius: 2 }} />
                    Ejemplo práctico
                  </div>
                  <div style={{ background: "linear-gradient(135deg,#f0fdf4,#ecfdf5)", borderRadius: 11, padding: "13px 15px", fontSize: 13, color: "#065f46", lineHeight: 1.6, border: "1px solid #d1fae5" }}>
                    <span style={{ display: "block", marginBottom: 3, fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: ".05em" }}>💡 Ejemplo</span>
                    {metodoCurrent.ejemplo}
                  </div>
                </div>

                {/* Usos frecuentes */}
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#10b981", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 16, height: 2, background: "#10b981", borderRadius: 2 }} />
                    Usos frecuentes
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {metodoCurrent.usos.map((uso) => (
                      <div key={uso} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#374151" }}>
                        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#10b981" }}>
                          <CheckIcon />
                        </span>
                        {uso}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info tip */}
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "11px 13px", marginBottom: 20, display: "flex", gap: 8, fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                  <span style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }}><InfoIcon /></span>
                  <span>En muestras complejas es fundamental considerar el <b>efecto de diseño (DEFF)</b> al calcular el tamaño de muestra y los errores estándar.</span>
                </div>

                {/* Botón de acción */}
                <button style={{
                  width: "100%", padding: "13px 20px", borderRadius: 12, border: "none",
                  cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  background: "linear-gradient(135deg,#10b981,#059669)", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 4px 14px rgba(16,185,129,.3)", transition: "all .25s",
                }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                  onClick={() => {
                    if (onNavigate) {
                      if (metodoCurrent.id === "simple") onNavigate('muestreo-simple-aleatorio');
                      if (metodoCurrent.id === "sistematico") onNavigate('muestreo-sistematico');
                      if (metodoCurrent.id === "estratificado") onNavigate('muestreo-estratificado');
                      if (metodoCurrent.id === "conglomerados-mono") onNavigate('muestreo-conglomerados-monoetapico');
                      // Add other routings here
                    }
                  }}
                >
                  Abrir herramienta <ArrowRight />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Sección comparativa ── */}
        {!detalle && (
          <div style={{ marginTop: 40, animation: "fadeIn .4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ height: 2, flex: 1, background: "#f3f4f6", borderRadius: 2 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".08em", whiteSpace: "nowrap" }}>
                Guía rápida de selección
              </span>
              <div style={{ height: 2, flex: 1, background: "#f3f4f6", borderRadius: 2 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                { emoji: "✅", titulo: "Población homogénea y lista disponible", metodo: "Muestreo Simple Aleatorio o Sistemático", color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
                { emoji: "🎯", titulo: "Necesitas representar subgrupos clave", metodo: "Muestreo Aleatorio Estratificado", color: "#a855f7", bg: "#faf5ff", border: "#e9d5ff" },
                { emoji: "🏙️", titulo: "Población geográficamente dispersa", metodo: "Muestreo por Conglomerados (Bi o Mono etápico)", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
              ].map((g) => (
                <div key={g.titulo} style={{ background: g.bg, border: `1.5px solid ${g.border}`, borderRadius: 14, padding: "16px 18px" }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{g.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, lineHeight: 1.4 }}>{g.titulo}</div>
                  <div style={{ fontSize: 12, color: g.color, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <ArrowRight /> {g.metodo}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
