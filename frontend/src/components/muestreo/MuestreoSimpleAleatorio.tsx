/*
  ╔══════════════════════════════════════════════════════════════════╗
  ║  BIOMETRIC — Muestreo Simple Aleatorio                          ║
  ║  Selección aleatoria sin reemplazo                              ║
  ║                                                                  ║
  ║  🔌 PUNTO DE INTEGRACIÓN CON EXCEL (buscar: EXCEL_HOOK)         ║
  ║  El componente acepta la prop `datosExcel` que es un array      ║
  ║  de objetos proveniente de SheetJS. Cuando esta prop está       ║
  ║  presente, el modo "Desde mi tabla" queda habilitado y usa      ║
  ║  esos datos en lugar de generar números de 1 a N.               ║
  ║                                                                  ║
  ║  Ejemplo de uso desde tu app:                                   ║
  ║  <MuestreoSimpleAleatorio datosExcel={filasDelExcel} />         ║
  ╚══════════════════════════════════════════════════════════════════╝
*/

import { useState, useMemo } from "react";

/* ═══════════════════════════════════════════════════
   UTILIDAD — Fisher-Yates shuffle sin reemplazo
   ═══════════════════════════════════════════════════ */
function muestraAleatoria(poblacion: any[], n: number) {
  const arr = [...poblacion];
  const resultado = [];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
    resultado.push(arr[i]);
  }
  return resultado;
}

/* ═══════════════════════════════════════════════════
   UTILIDAD — Exportar a Excel con SheetJS (CDN)
   Se carga dinámicamente solo cuando el usuario descarga
   ═══════════════════════════════════════════════════ */
async function exportarExcel(datos: any[], nombreArchivo: string) {
  // @ts-ignore
  if (!window.XLSX) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  // @ts-ignore
  const XLSX = window.XLSX;
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Muestra Aleatoria");
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}

/* ═══════════════════════════════════════════════════
   ÍCONOS
   ═══════════════════════════════════════════════════ */
const BackIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);
const ShuffleIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
    <line x1="4" y1="4" x2="9" y2="9" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const ResetIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
  </svg>
);
const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
  </svg>
);
const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
  </svg>
);
const TableIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" />
  </svg>
);
const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const SortIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <polyline points="3 6 4 7 6 4" /><polyline points="3 12 4 13 6 10" /><polyline points="3 18 4 19 6 16" />
  </svg>
);

/* ═══════════════════════════════════════════════════
   CONSTANTES DE PAGINACIÓN
   ═══════════════════════════════════════════════════ */
const FILAS_POR_PAGINA = 50;
const PREVIEW_LIMITE   = 2000; // si n > esto, mostrar solo preview

/* ═══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════
   Props:
   - datosExcel: Array<Object> | null  ← EXCEL_HOOK
     Cuando tu componente de carga de Excel tenga los datos,
     pásalos aquí. Cada fila es un objeto { col1: val, col2: val }.
     Si es null o undefined, el modo "Desde mi tabla" aparece
     deshabilitado con un mensaje indicando que no hay datos cargados.
   ═══════════════════════════════════════════════════ */
export default function MuestreoSimpleAleatorio({ datosExcel = null, loadingExcel = false, onBack }: { datosExcel?: any[] | null, loadingExcel?: boolean, onBack?: () => void }) {
  /* ── Modo de entrada ──────────────────────────── */
  const [modo, setModo] = useState("manual"); // "manual" | "excel"

  /* ── Entradas manuales ────────────────────────── */
  const [N, setN] = useState("");
  const [n, setN_] = useState("");
  const [ordenar, setOrdenar] = useState(false);
  // eslint-disable-next-line
  const [semilla, setSemilla] = useState(""); // opcional // eslint-disable-line

  /* ── Estado de resultado ──────────────────────── */
  const [muestra, setMuestra]     = useState<any[] | null>(null);  // array de filas seleccionadas
  const [pagina, setPagina]       = useState(1);
  const [descargando, setDesc]    = useState(false);
  const [error, setError]         = useState("");
  const [calculando, setCalc]     = useState(false);

  /* ── Validación ───────────────────────────────── */
  const vN = parseInt(N);
  const vn = parseInt(n);
  const poblacionTotal = modo === "excel" && datosExcel ? datosExcel.length : vN;

  const errores = useMemo(() => {
    if (modo === "manual") {
      if (N === "" || n === "") return "";
      if (isNaN(vN) || vN < 2) return "El tamaño de la población debe ser al menos 2.";
      if (isNaN(vn) || vn < 1) return "El tamaño de la muestra debe ser al menos 1.";
      if (vn >= vN) return "La muestra debe ser menor que la población.";
      if (vN > 10_000_000) return "El tamaño máximo de población es 10.000.000.";
    }
    if (modo === "excel") {
      if (!datosExcel || datosExcel.length === 0) return "";
      if (n === "") return "";
      if (isNaN(vn) || vn < 1) return "El tamaño de la muestra debe ser al menos 1.";
      if (vn >= datosExcel.length) return `La muestra (${vn}) debe ser menor que la tabla cargada (${datosExcel.length} filas).`;
    }
    return "";
  }, [N, n, modo, datosExcel, vN, vn]);

  const canCalc = errores === "" &&
    (modo === "manual" ? N !== "" && n !== "" : datosExcel && datosExcel.length > 0 && n !== "");

  /* ── Calcular ─────────────────────────────────── */
  function handleCalc() {
    if (!canCalc) return;
    setCalc(true);
    setError("");
    setPagina(1);

    // Pequeño delay para mostrar loading en poblaciones grandes
    setTimeout(() => {
      try {
        if (modo === "manual") {
          // Generar array [1, 2, ..., N] y seleccionar n
          const poblacion = Array.from({ length: vN }, (_, i) => ({ "N°": i + 1 }));
          let resultado = muestraAleatoria(poblacion, vn);
          if (ordenar) resultado = resultado.sort((a, b) => a["N°"] - b["N°"]);
          // Agregar columna de orden de selección
          setMuestra(resultado.map((r, i) => ({ "Orden selección": i + 1, ...r })));
        } else if (datosExcel) {
          // EXCEL_HOOK — usar datosExcel directamente
          let resultado = muestraAleatoria(datosExcel, vn);
          if (ordenar) {
            // Ordenar por la primera columna numérica disponible, o por índice
            const primeraCol = Object.keys(resultado[0])[0];
            resultado = resultado.sort((a, b) => {
              const va = parseFloat(a[primeraCol]), vb = parseFloat(b[primeraCol]);
              return isNaN(va) || isNaN(vb) ? String(a[primeraCol]).localeCompare(String(b[primeraCol])) : va - vb;
            });
          }
          setMuestra(resultado.map((r, i) => ({ "Orden selección": i + 1, ...r })));
        }
      } catch (e: any) {
        setError("Error al generar la muestra: " + e.message);
      }
      setCalc(false);
    }, muestra ? 0 : 80);
  }

  function handleReset() {
    setN(""); setN_(""); setOrdenar(false); setSemilla("");
    setMuestra(null); setPagina(1); setError(""); setCalc(false);
  }

  /* ── Paginación ───────────────────────────────── */
  const esGrande      = muestra && muestra.length > PREVIEW_LIMITE;
  const datosVista    = esGrande ? muestra!.slice(0, PREVIEW_LIMITE) : muestra;
  const totalPaginas  = datosVista ? Math.ceil(datosVista.length / FILAS_POR_PAGINA) : 1;
  const filasPagina   = datosVista
    ? datosVista.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA)
    : [];
  const columnas      = muestra && muestra.length > 0 ? Object.keys(muestra[0]) : [];

  /* ── Descargar ────────────────────────────────── */
  async function handleDescargar() {
    if (!muestra) return;
    setDesc(true);
    try {
      await exportarExcel(muestra, `muestra_aleatoria_n${muestra.length}`);
    } catch (e) {
      setError("No se pudo generar el archivo Excel.");
    }
    setDesc(false);
  }

  /* ── Estadísticas rápidas ─────────────────────── */
  const pct = muestra ? ((muestra.length / poblacionTotal) * 100).toFixed(1) : null;

  /* ════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════ */
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#fafbfc", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .row-hover:hover { background: #ecfdf5 !important; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        input[type=number] { -moz-appearance:textfield; }
      `}</style>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* ── Breadcrumb ── */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:22, fontSize:13, color:"#6b7280", fontWeight:500 }}>
          <span onClick={onBack} style={{ color:"#10b981", display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
            <BackIcon /> Selección de Muestras
          </span>
          <span style={{ color:"#d1d5db" }}>/</span>
          <span style={{ color:"#374151", fontWeight:600 }}>Muestreo Simple Aleatorio</span>
        </div>

        {/* ── Título ── */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:15, marginBottom:6 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:"linear-gradient(135deg,#ecfdf5,#d1fae5)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:22 }}>🎲</div>
          <div>
            <h1 style={{ fontSize:23, fontWeight:800, margin:0, color:"#111827", letterSpacing:"-.02em" }}>Muestreo Simple Aleatorio</h1>
            <p style={{ fontSize:14, color:"#6b7280", margin:"4px 0 0", lineHeight:1.5 }}>Selección aleatoria sin reemplazo · Cada sujeto tiene igual probabilidad de ser elegido</p>
          </div>
        </div>

        {/* ── Banner IA ── */}
        <div style={{ background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)", border:"1px solid #a7f3d0", borderRadius:12, padding:"11px 15px", margin:"16px 0 24px", display:"flex", alignItems:"center", gap:10, fontSize:13, color:"#065f46" }}>
          <div style={{ background:"#10b981", borderRadius:7, width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", color:"white", flexShrink:0 }}><SparkleIcon /></div>
          <span><b>Asistente IA:</b> Usa este método cuando tu población sea homogénea y tengas un listado completo. Si tu n calculado supera el 10% de la población, considera aplicar corrección por finitud.</span>
        </div>

        {/* ── Modo de entrada ── */}
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#6b7280", marginBottom:9 }}>Fuente de datos</div>
          <div style={{ display:"flex", gap:4, background:"#f3f4f6", borderRadius:12, padding:4 }}>
            {[
              { id:"manual", icon:"✏️", label:"Entrada manual", desc:"Indica N y n directamente" },
              { id:"excel",  icon:"📊", label:"Desde mi tabla",  desc: loadingExcel ? "Cargando datos..." : (datosExcel ? `${datosExcel.length.toLocaleString()} filas cargadas` : "Sin datos cargados") },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => { if (m.id === "excel" && !datosExcel) return; setModo(m.id); setMuestra(null); setError(""); }}
                disabled={m.id === "excel" && !datosExcel}
                style={{
                  flex:1, padding:"11px 14px", border:"none", borderRadius:9,
                  cursor: m.id === "excel" && !datosExcel ? "not-allowed" : "pointer",
                  fontSize:13, fontWeight:600, fontFamily:"inherit",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  transition:"all .2s",
                  background: modo === m.id ? "white" : "transparent",
                  color: m.id === "excel" && !datosExcel ? "#d1d5db" : modo === m.id ? "#111827" : "#6b7280",
                  boxShadow: modo === m.id ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                  opacity: m.id === "excel" && !datosExcel ? 0.6 : 1,
                }}
              >
                <span style={{ fontSize:16 }}>{m.icon}</span>
                <div style={{ textAlign:"left" }}>
                  <div>{m.label}</div>
                  <div style={{ fontSize:11, fontWeight:500, color: modo === m.id ? "#6b7280" : "#9ca3af", marginTop:1 }}>{m.desc}</div>
                </div>
                {/* ── EXCEL_HOOK ── Cuando datosExcel no es null, este botón se activa automáticamente */}
                {m.id === "excel" && loadingExcel && (
                  <span style={{ marginLeft:"auto", background:"#fef3c7", color:"#b45309", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20 }}>Cargando...</span>
                )}
                {m.id === "excel" && !loadingExcel && datosExcel && (
                  <span style={{ marginLeft:"auto", background:"#ecfdf5", color:"#059669", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20 }}>Listo</span>
                )}
                {m.id === "excel" && !loadingExcel && !datosExcel && (
                  <span style={{ marginLeft:"auto", background:"#f3f4f6", color:"#9ca3af", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20, whiteSpace:"nowrap" }}>Carga tabla primero</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Formulario ── */}
        <div style={{ background:"white", borderRadius:16, border:"1.5px solid #e5e7eb", padding:"24px 24px 10px", boxShadow:"0 1px 4px rgba(0,0,0,.03)" }}>

          {/* ─ Sección Paso 1 ─ */}
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#10b981", marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:18, height:2, background:"#10b981", borderRadius:2 }} />
            Paso 1 · Parámetros de la muestra
          </div>

          <div style={{ display:"grid", gridTemplateColumns: modo === "excel" && datosExcel ? "1fr" : "1fr 1fr", gap:16 }}>

            {/* N — solo en manual */}
            {modo === "manual" && (
              <FieldNum
                label="Tamaño de la población (N)"
                tooltip="Número total de individuos en tu población de estudio. Ejemplo: total de pacientes en el registro hospitalario."
                value={N} onChange={(v: string) => { setN(v); setMuestra(null); }}
                placeholder="Ej: 5594"
                hint="Total de sujetos de donde se extraerá la muestra"
              />
            )}

            {/* Info Excel — cuando hay datos */}
            {modo === "excel" && datosExcel && (
              <div style={{ background:"#f0fdf4", border:"1.5px solid #a7f3d0", borderRadius:12, padding:"14px 16px", marginBottom:4, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:22 }}>📊</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#065f46" }}>Tabla cargada correctamente</div>
                  <div style={{ fontSize:13, color:"#059669", marginTop:2 }}>
                    <b>{datosExcel.length.toLocaleString()}</b> filas · <b>{Object.keys(datosExcel[0]).length}</b> columnas disponibles
                  </div>
                </div>
              </div>
            )}

            {/* n */}
            <FieldNum
              label={`Tamaño de la muestra (n)${modo === "excel" && datosExcel ? ` — máx. ${(datosExcel.length - 1).toLocaleString()}` : ""}`}
              tooltip="Número de sujetos que deseas seleccionar aleatoriamente. Debe ser menor que N. Si aún no lo tienes, usa el módulo Cálculo de Tamaños de Muestra."
              value={n} onChange={(v: string) => { setN_(v); setMuestra(null); }}
              placeholder="Ej: 210"
              hint="Número de sujetos a seleccionar"
            />
          </div>

          {/* Porcentaje de muestreo informativo */}
          {(modo === "manual" ? (N !== "" && n !== "" && !errores) : (datosExcel && n !== "" && !errores)) && (
            <div style={{ background:"#f9fafb", borderRadius:10, padding:"10px 14px", marginBottom:18, display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#374151" }}>
              <span style={{ color:"#10b981", display:"flex" }}><InfoIcon /></span>
              <span>
                <b>Fracción de muestreo:</b> {vn} / {poblacionTotal.toLocaleString()} = <b style={{ color: vn / poblacionTotal > 0.1 ? "#d97706" : "#10b981" }}>{(vn / poblacionTotal * 100).toFixed(2)}%</b>
                {vn / poblacionTotal > 0.1 && <span style={{ color:"#d97706", marginLeft:8 }}>⚠️ Considera corrección por finitud (n·N/(N+n))</span>}
              </span>
            </div>
          )}

          {/* ─ Sección Paso 2 ─ */}
          <div style={{ height:1, background:"#f3f4f6", margin:"4px 0 18px" }} />
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#10b981", marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:18, height:2, background:"#10b981", borderRadius:2 }} />
            Paso 2 · Opciones de presentación
          </div>

          {/* Ordenar muestra */}
          <div
            onClick={() => setOrdenar(!ordenar)}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 15px", borderRadius:12, cursor:"pointer", border: ordenar ? "2px solid #10b981" : "2px solid #e5e7eb", background: ordenar ? "#f0fdf4" : "white", transition:"all .2s", marginBottom:16, userSelect:"none" }}
          >
            <div style={{ width:21, height:21, borderRadius:6, border: ordenar ? "2px solid #10b981" : "2px solid #d1d5db", background: ordenar ? "#10b981" : "white", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s", flexShrink:0 }}>
              {ordenar && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ color: ordenar ? "#10b981" : "#6b7280" }}><SortIcon /></span>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color: ordenar ? "#065f46" : "#374151" }}>Ordenar muestra seleccionada</div>
                <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>
                  {modo === "manual" ? "Presenta los números seleccionados en orden ascendente" : "Ordena las filas seleccionadas por la primera columna"}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Error de validación ── */}
        {errores && (
          <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:11, padding:"11px 15px", marginTop:14, fontSize:13, color:"#dc2626", fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
            ⚠️ {errores}
          </div>
        )}

        {/* ── Botones ── */}
        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          <button
            onClick={handleCalc}
            disabled={!canCalc || !!errores || calculando}
            style={{
              flex:1, padding:"13px 20px", borderRadius:12, border:"none",
              cursor: canCalc && !errores ? "pointer" : "not-allowed",
              fontSize:15, fontWeight:700, fontFamily:"inherit",
              display:"flex", alignItems:"center", justifyContent:"center", gap:9,
              transition:"all .25s",
              background: canCalc && !errores ? "linear-gradient(135deg,#10b981,#059669)" : "#e5e7eb",
              color: canCalc && !errores ? "white" : "#9ca3af",
              boxShadow: canCalc && !errores ? "0 4px 14px rgba(16,185,129,.3)" : "none",
            }}
            onMouseDown={(e) => { if (canCalc) e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {calculando
              ? <><span style={{ width:18, height:18, border:"3px solid rgba(255,255,255,.4)", borderTopColor:"white", borderRadius:"50%", animation:"spin .7s linear infinite" }} /> Generando...</>
              : <><ShuffleIcon /> {muestra ? "Regenerar muestra" : "Generar muestra aleatoria"}</>
            }
          </button>
          <button onClick={handleReset} style={{ padding:"13px 18px", borderRadius:12, border:"2px solid #e5e7eb", cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit", background:"white", color:"#6b7280", display:"flex", alignItems:"center", gap:6 }}>
            <ResetIcon /> Limpiar
          </button>
        </div>

        {/* ── Error de ejecución ── */}
        {error && (
          <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:11, padding:"11px 15px", marginTop:14, fontSize:13, color:"#dc2626" }}>
            ❌ {error}
          </div>
        )}

        {/* ══════════════════════════════════════════
            RESULTADO
            ══════════════════════════════════════════ */}
        {muestra && (
          <div style={{ marginTop:28, animation:"slideUp .4s cubic-bezier(.16,1,.3,1)" }}>

            {/* ── Header del resultado ── */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:12 }}>

              {/* Estadísticas */}
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {[
                  { label:"Seleccionados",     val: muestra.length.toLocaleString(),                     col:"#10b981" },
                  { label:"Población total",   val: poblacionTotal.toLocaleString(),                     col:"#6b7280" },
                  { label:"Fracción muest.",   val: (muestra.length / poblacionTotal * 100).toFixed(1) + "%", col: muestra.length / poblacionTotal > 0.1 ? "#d97706" : "#059669" },
                ].map((s) => (
                  <div key={s.label} style={{ background:"white", border:"1.5px solid #e5e7eb", borderRadius:11, padding:"10px 16px" }}>
                    <div style={{ fontSize:18, fontWeight:800, color:s.col, fontFamily:"'DM Mono',monospace", letterSpacing:"-.02em" }}>{s.val}</div>
                    <div style={{ fontSize:11, color:"#9ca3af", fontWeight:600, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
                {ordenar && (
                  <div style={{ background:"#ecfdf5", border:"1.5px solid #a7f3d0", borderRadius:11, padding:"10px 16px", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ color:"#10b981" }}><SortIcon /></span>
                    <div style={{ fontSize:11, color:"#059669", fontWeight:700 }}>Ordenada</div>
                  </div>
                )}
              </div>

              {/* Botón descargar */}
              <button
                onClick={handleDescargar}
                disabled={descargando}
                style={{
                  padding:"11px 20px", borderRadius:12, border:"2px solid #10b981",
                  cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit",
                  background: descargando ? "#f0fdf4" : "white", color:"#10b981",
                  display:"flex", alignItems:"center", gap:8, transition:"all .2s",
                  boxShadow:"0 2px 8px rgba(16,185,129,.12)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#ecfdf5"; }}
                onMouseLeave={(e) => { if (!descargando) e.currentTarget.style.background = "white"; }}
              >
                {descargando
                  ? <><span style={{ width:15, height:15, border:"2px solid rgba(16,185,129,.3)", borderTopColor:"#10b981", borderRadius:"50%", animation:"spin .7s linear infinite" }} />Descargando...</>
                  : <><DownloadIcon /> Descargar Excel (.xlsx)</>
                }
              </button>
            </div>

            {/* ── Aviso de preview ── */}
            {esGrande && (
              <div style={{ background:"#fffbeb", border:"1.5px solid #fde68a", borderRadius:11, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"flex-start", gap:10, fontSize:13, color:"#92400e", lineHeight:1.5 }}>
                <span style={{ fontSize:18, flexShrink:0 }}>⚡</span>
                <div>
                  <b>Muestra grande detectada ({muestra.length.toLocaleString()} filas)</b><br />
                  Se muestran en pantalla las primeras <b>{PREVIEW_LIMITE.toLocaleString()}</b> filas. Descarga el Excel para ver la muestra completa con todos los datos.
                </div>
              </div>
            )}

            {/* ── Tabla ── */}
            <div style={{ background:"white", border:"2px solid #6ee7b7", borderRadius:16, overflow:"hidden" }}>

              {/* Cabecera de tabla con info de paginación */}
              <div style={{ background:"linear-gradient(135deg,#ecfdf5,#d1fae5)", padding:"16px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ color:"#059669" }}><TableIcon /></span>
                  <span style={{ fontSize:14, fontWeight:700, color:"#065f46" }}>
                    Muestra aleatoria generada
                  </span>
                  <span style={{ background:"white", color:"#10b981", fontSize:12, fontWeight:700, padding:"2px 10px", borderRadius:20, border:"1px solid #a7f3d0" }}>
                    n = {muestra.length.toLocaleString()}
                  </span>
                </div>
                <span style={{ fontSize:12, color:"#059669", fontWeight:600 }}>
                  {esGrande ? `Mostrando 1–${PREVIEW_LIMITE.toLocaleString()} de ${muestra.length.toLocaleString()}` : `Página ${pagina} de ${totalPaginas}`}
                </span>
              </div>

              {/* Scroll horizontal para tablas anchas */}
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ background:"#f9fafb" }}>
                      {columnas.map((col: string) => (
                        <th key={col} style={{
                          padding:"10px 18px", textAlign:"left", fontWeight:700,
                          fontSize:11, color:"#6b7280", textTransform:"uppercase",
                          letterSpacing:".05em", borderBottom:"1px solid #e5e7eb",
                          whiteSpace:"nowrap",
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filasPagina.map((fila: any, i) => {
                      const indexReal = (pagina - 1) * FILAS_POR_PAGINA + i;
                      return (
                        <tr
                          key={indexReal}
                          className="row-hover"
                          style={{ background: i % 2 === 0 ? "white" : "#fafbfc", transition:"background .12s" }}
                        >
                          {columnas.map((col: string) => (
                            <td key={col} style={{
                              padding:"10px 18px", borderBottom:"1px solid #f3f4f6",
                              color: col === "Orden selección" ? "#10b981" : col === "N°" ? "#065f46" : "#374151",
                              fontWeight: col === "Orden selección" || col === "N°" ? 700 : 400,
                              fontFamily: col === "Orden selección" || col === "N°" ? "'DM Mono',monospace" : "inherit",
                              whiteSpace:"nowrap",
                            }}>
                              {fila[col] ?? "—"}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Paginación ── */}
              {totalPaginas > 1 && (
                <div style={{ padding:"14px 22px", borderTop:"1px solid #f3f4f6", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                  {/* Info */}
                  <span style={{ fontSize:12, color:"#9ca3af", fontWeight:500 }}>
                    Filas {(pagina - 1) * FILAS_POR_PAGINA + 1}–{Math.min(pagina * FILAS_POR_PAGINA, (datosVista || []).length).toLocaleString()} de {(datosVista || []).length.toLocaleString()}
                  </span>

                  {/* Controles */}
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <PagBtn onClick={() => setPagina(1)}        disabled={pagina === 1}            label="«" />
                    <PagBtn onClick={() => setPagina(p => p-1)} disabled={pagina === 1}            label={<ChevronLeft />} />

                    {/* Páginas cercanas */}
                    {getPaginas(pagina, totalPaginas).map((p, i) =>
                      p === "…" ? (
                        <span key={`e${i}`} style={{ padding:"0 6px", color:"#9ca3af", fontSize:13 }}>…</span>
                      ) : (
                        <button key={p} onClick={() => setPagina(p as number)} style={{
                          width:34, height:34, border:"none", borderRadius:8, cursor:"pointer",
                          fontSize:13, fontWeight:700, fontFamily:"inherit", transition:"all .15s",
                          background: pagina === p ? "#10b981" : "#f3f4f6",
                          color: pagina === p ? "white" : "#6b7280",
                        }}>{p}</button>
                      )
                    )}

                    <PagBtn onClick={() => setPagina(p => p+1)} disabled={pagina === totalPaginas} label={<ChevronRight />} />
                    <PagBtn onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas} label="»" />
                  </div>

                  {/* Ir a página */}
                  <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:"#6b7280" }}>
                    Ir a pág.
                    <input
                      type="number" min={1} max={totalPaginas}
                      onKeyDown={(e: any) => { if (e.key === "Enter") { const v = parseInt(e.target.value); if (v >= 1 && v <= totalPaginas) { setPagina(v); e.target.value = ""; } } }}
                      placeholder={String(pagina)}
                      style={{ width:54, padding:"5px 8px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:12, fontFamily:"inherit", outline:"none", textAlign:"center" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Interpretación ── */}
            <div style={{ marginTop:18, background:"white", border:"1.5px solid #e5e7eb", borderRadius:14, padding:"16px 20px", display:"flex", gap:10 }}>
              <div style={{ width:26, height:26, borderRadius:8, background:"#10b981", display:"flex", alignItems:"center", justifyContent:"center", color:"white", flexShrink:0 }}><SparkleIcon /></div>
              <div style={{ fontSize:13, color:"#374151", lineHeight:1.65 }}>
                <b style={{ color:"#065f46" }}>Interpretación:</b> Se seleccionaron aleatoriamente <b>{muestra.length.toLocaleString()}</b> sujetos de una población de <b>{poblacionTotal?.toLocaleString()}</b>, representando el <b style={{ color: muestra.length / poblacionTotal > 0.1 ? "#d97706" : "#10b981" }}>{pct}%</b> de la población total.
                {muestra.length / poblacionTotal > 0.1 && <span style={{ color:"#d97706" }}> Dado que la fracción de muestreo supera el 10%, se recomienda aplicar el <b>factor de corrección por finitud</b> al calcular los errores estándar: FPC = √((N−n)/(N−1)).</span>}
                {ordenar && <span> La muestra fue ordenada ascendentemente para facilitar su localización en el listado original.</span>}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SUB-COMPONENTES
   ═══════════════════════════════════════════════════ */
function FieldNum({ label, tooltip, value, onChange, placeholder, hint }: { label: string, tooltip?: string, value: string, onChange: (v: string) => void, placeholder: string, hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
        <label style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{label}</label>
        {tooltip && (
          <Tooltip text={tooltip}>
            <span style={{ color:"#9ca3af", display:"flex" }}><InfoIcon /></span>
          </Tooltip>
        )}
      </div>
      <div style={{
        display:"flex", alignItems:"center",
        border: focused ? "2px solid #10b981" : "2px solid #e5e7eb",
        borderRadius:10, background:"white", overflow:"hidden",
        transition:"all .2s",
        boxShadow: focused ? "0 0 0 3px rgba(16,185,129,.1)" : "none",
      }}>
        <input
          type="number" value={value} step="1" min="1"
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{ flex:1, border:"none", outline:"none", padding:"11px 14px", fontSize:14, fontFamily:"'DM Sans',sans-serif", background:"transparent", color:"#111827" }}
        />
      </div>
      {hint && <p style={{ fontSize:12, color:"#9ca3af", margin:"5px 0 0", lineHeight:1.4 }}>{hint}</p>}
    </div>
  );
}

function Tooltip({ children, text }: { children: React.ReactNode, text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} style={{ position:"relative", display:"inline-flex", cursor:"help" }}>
      {children}
      {show && (
        <span style={{ position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)", background:"#1f2937", color:"#f9fafb", fontSize:12, lineHeight:1.5, padding:"9px 13px", borderRadius:10, width:250, zIndex:200, boxShadow:"0 10px 30px rgba(0,0,0,.2)", pointerEvents:"none", fontWeight:400 }}>
          {text}
          <span style={{ position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"6px solid transparent", borderRight:"6px solid transparent", borderTop:"6px solid #1f2937" }} />
        </span>
      )}
    </span>
  );
}

function PagBtn({ onClick, disabled, label }: { onClick: () => void, disabled: boolean, label: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:34, height:34, border:"1.5px solid #e5e7eb", borderRadius:8,
      cursor: disabled ? "not-allowed" : "pointer", fontSize:13, fontWeight:600,
      fontFamily:"inherit", background:"white", color: disabled ? "#d1d5db" : "#6b7280",
      display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s",
    }}>
      {label}
    </button>
  );
}

function getPaginas(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total-4, total-3, total-2, total-1, total];
  return [1, "…", current-1, current, current+1, "…", total];
}
