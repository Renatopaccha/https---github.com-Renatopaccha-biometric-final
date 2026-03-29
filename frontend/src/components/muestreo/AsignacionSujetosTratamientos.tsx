/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  BIOMETRIC — Asignación de Sujetos a Tratamientos                   ║
  ║                                                                      ║
  ║  Dos métodos (idénticos a EpiDat):                                  ║
  ║                                                                      ║
  ║  A) Grupos de igual tamaño                                          ║
  ║     · N debe ser múltiplo de k                                      ║
  ║     · Barajar sujetos 1..N (Fisher-Yates) y repartir en k grupos   ║
  ║     · Cada grupo recibe exactamente N/k sujetos                     ║
  ║                                                                      ║
  ║  B) Grupos equilibrados (Block Randomization)                       ║
  ║     · N debe ser múltiplo de k                                      ║
  ║     · Dividir en N/k bloques de tamaño k                           ║
  ║     · Dentro de cada bloque se permuta aleatoriamente la            ║
  ║       asignación de grupos → garantiza balance secuencial           ║
  ║     · Equivalente a la randomización por bloques permutados         ║
  ║       (Zelen 1974) usada en ensayos clínicos                        ║
  ║                                                                      ║
  ║  Salida Excel: Grupo | Selección (formato largo, igual a EpiDat)    ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/

import { useState, useMemo } from "react";

/* ══════════════════════════════ ALGORITMOS ══════════════════════════════ */

/** Fisher-Yates in-place */
function shuffle(arr: any[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Grupos de igual tamaño
 * Baraja 1..N y reparte en k grupos iguales.
 * Devuelve Array<{grupo, sujetos[]}> ordenado por número de sujeto dentro de cada grupo.
 */
function asignarIgualTamanio(N: number, k: number) {
  const orden = shuffle(Array.from({ length: N }, (_, i) => i + 1));
  const tamGrupo = N / k;
  return Array.from({ length: k }, (_, gi) => ({
    grupo: gi + 1,
    sujetos: orden.slice(gi * tamGrupo, (gi + 1) * tamGrupo).sort((a: any, b: any) => a - b),
  }));
}

/**
 * Grupos equilibrados — Randomización por bloques permutados (Zelen 1974)
 * Divide los N sujetos en N/k bloques de tamaño k.
 * Dentro de cada bloque, la asignación de grupos se permuta aleatoriamente.
 * Garantiza que en cualquier punto del reclutamiento los grupos estén balanceados.
 */
function asignarEquilibrado(N: number, k: number) {
  const numBloques = N / k;
  // Mapa grupo → sujetos asignados
  const grupos = Array.from({ length: k }, (_, gi) => ({ grupo: gi + 1, sujetos: [] as number[] }));

  for (let b = 0; b < numBloques; b++) {
    // Permutación aleatoria de [0, 1, …, k-1] dentro del bloque
    const asignBloque = shuffle(Array.from({ length: k }, (_, i) => i));
    for (let pos = 0; pos < k; pos++) {
      const sujetoId = b * k + pos + 1;      // sujeto 1..N
      const grupoIdx = asignBloque[pos];     // índice del grupo (0-based)
      grupos[grupoIdx].sujetos.push(sujetoId);
    }
  }
  return grupos.map(g => ({ ...g, sujetos: g.sujetos.sort((a, b) => a - b) }));
}

/* ══════════════════════════════ EXPORT EXCEL ══════════════════════════════ */
async function exportarExcel(sheets: any[], nombre: string) {
  if (!(window as any).XLSX) await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  const XLSX = (window as any).XLSX;
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ nombre: n, datos }) => {
    const ws = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(wb, ws, String(n).slice(0, 31));
  });
  XLSX.writeFile(wb, `${nombre}.xlsx`);
}

/* ══════════════════════════════ PALETA ══════════════════════════════ */
const PAL = [
  { bg:"#ecfdf5", brd:"#6ee7b7", txt:"#065f46", dot:"#10b981", light:"#d1fae5" },
  { bg:"#eff6ff", brd:"#93c5fd", txt:"#1e3a8a", dot:"#3b82f6", light:"#dbeafe" },
  { bg:"#fdf4ff", brd:"#d8b4fe", txt:"#581c87", dot:"#a855f7", light:"#ede9fe" },
  { bg:"#fff7ed", brd:"#fdba74", txt:"#7c2d12", dot:"#f97316", light:"#ffedd5" },
  { bg:"#fefce8", brd:"#fde047", txt:"#713f12", dot:"#eab308", light:"#fef9c3" },
];
const gc = (i: number) => PAL[i % PAL.length];

/* ══════════════════════════════ ÍCONOS ══════════════════════════════ */
const Si = ({ d, w = 16 }: { d: string, w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: d }} />
);
const BackIcon  = () => <Si w={15} d='<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>' />;
const DlIcon    = () => <Si d='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' />;
const RstIcon   = () => <Si w={15} d='<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>' />;
const SpkIcon   = () => <Si w={14} d='<path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/>' />;
const CalcIcon  = () => <Si w={17} d='<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/>' />;
const FlaskIcon = () => <Si w={20} d='<path d="M6 2v6l-4 6a4 4 0 0 0 3.26 6.33A4 4 0 0 0 9 19l1-1 1 1a4 4 0 0 0 3.74.33A4 4 0 0 0 18 14l-4-6V2"/><line x1="6" y1="2" x2="18" y2="2"/><line x1="9" y1="12" x2="15" y2="12"/>' />;
const InfoIcon  = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>;
const ChkIcon   = () => <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const ShuffleIcon = () => <Si w={16} d='<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>' />;
const GridIcon  = () => <Si w={16} d='<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' />;

const FILAS_PAG = 50;

/* ══════════════════════════════ COMPONENTE PRINCIPAL ══════════════════════════════ */
export default function AsignacionSujetosTratamientos({ onBack }: { onBack?: () => void }) {

  const [k,       setK]       = useState(3);       // Número de grupos (2–5)
  const [N,       setN]       = useState("");       // Número total de sujetos
  const [tipoG,   setTipoG]   = useState("igual"); // "igual" | "equilibrado"
  const [tabAct,  setTab]     = useState("combinada");
  const [pagina,  setPagina]  = useState(1);
  const [res,     setRes]     = useState<any>(null);
  const [loading, setLoad]    = useState(false);
  const [descLoad,setDesc]    = useState(false);
  const [err,     setErr]     = useState("");

  const Nint = parseInt(N);

  /* ══════════════════════════════ VALIDACIÓN ══════════════════════════════ */
  const errMsg = useMemo(() => {
    if (!N || N === "") return "";
    if (isNaN(Nint) || Nint < k)       return `El número de sujetos debe ser al menos ${k} (uno por grupo).`;
    if (Nint > 10000)                  return "El número de sujetos no puede superar 10 000.";
    if (Nint % k !== 0)                return `El número de sujetos debe ser múltiplo de ${k}. Prueba con ${Math.ceil(Nint / k) * k} o ${Math.floor(Nint / k) * k || k}.`;
    return "";
  }, [N, Nint, k]);

  const canCalc = N !== "" && !isNaN(Nint) && Nint >= k && Nint <= 10000 && Nint % k === 0;

  /* Sugerencias de múltiplos */
  const sugerencias = useMemo(() => {
    if (!N || N === "" || isNaN(Nint) || Nint % k === 0) return [];
    const base = Math.floor(Nint / k);
    const opts = [];
    if (base > 0) opts.push(base * k);
    opts.push((base + 1) * k);
    return opts;
  }, [N, Nint, k]);

  /* ══════════════════════════════ CÁLCULO ══════════════════════════════ */
  function handleCalc() {
    if (!canCalc || errMsg) return;
    setLoad(true); setErr(""); setTab("combinada"); setPagina(1);
    setTimeout(() => {
      try {
        const grupos = tipoG === "igual"
          ? asignarIgualTamanio(Nint, k)
          : asignarEquilibrado(Nint, k);

        // Tabla combinada (vista en pantalla): una fila por sujeto, ordenada por N° sujeto
        const combinada = [];
        for (let s = 1; s <= Nint; s++) {
          const g = grupos.find(gr => gr.sujetos.includes(s));
          combinada.push({ "N° sujeto": s, "Grupo asignado": g ? `Grupo ${g.grupo}` : "—" });
        }

        // Tabla larga para Excel (igual que EpiDat)
        const excelLargo = grupos.flatMap(g =>
          g.sujetos.map(s => ({ "Grupo": g.grupo, "Selección": s }))
        );

        setRes({ grupos, combinada, excelLargo, N: Nint, k, tipoG, tamGrupo: Nint / k });
      } catch (ex: any) { setErr("Error al generar la asignación: " + ex.message); }
      setLoad(false);
    }, 60);
  }

  function handleReset() { setN(""); setRes(null); setErr(""); setTab("combinada"); setPagina(1); }

  async function handleDesc() {
    if (!res) return; setDesc(true);
    try {
      await exportarExcel([
        { nombre: "Asignación", datos: res.excelLargo },
        { nombre: "Vista por sujeto", datos: res.combinada },
      ], `asignacion_k${res.k}_N${res.N}_${res.tipoG}`);
    } catch (ex) { setErr("No se pudo generar el archivo."); }
    setDesc(false);
  }

  /* Datos de la pestaña activa */
  const datosTab = res
    ? tabAct === "combinada"
      ? res.combinada
      : res.grupos.find((g: any) => `grupo_${g.grupo}` === tabAct)?.sujetos.map((s: any, i: number) => ({ "N° en grupo": i + 1, "N° de sujeto": s })) ?? []
    : [];

  const tPags  = Math.max(1, Math.ceil(datosTab.length / FILAS_PAG));
  const fPag   = datosTab.slice((pagina - 1) * FILAS_PAG, pagina * FILAS_PAG);
  const cols   = datosTab.length > 0 ? Object.keys(datosTab[0]) : [];

  /* ══════════════════════════════ RENDER ══════════════════════════════ */
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#fafbfc", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes cinematicFadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .at-stagger-1{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.04s}
        .at-stagger-2{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.08s}
        .at-stagger-3{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.12s}
        .at-stagger-4{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.16s}
        .at-stagger-5{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.20s}
        .at-btn-cin{transition:all .3s cubic-bezier(.16,1,.3,1)!important}
        .at-btn-cin:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 8px 20px rgba(16,185,129,.18)!important}
        .rh:hover{background:#ecfdf5!important}
        .tbtn:hover{opacity:.8}
        .kbtn:hover{transform:scale(1.06)}
        input[type=number]{outline:none;-moz-appearance:textfield}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
      `}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* Breadcrumb */}
        <div className="at-stagger-1" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <span onClick={onBack || (() => window.history.back())} style={{ color: "#10b981", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><BackIcon /> Muestreo</span>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#374151", fontWeight: 600 }}>Asignación de Sujetos a Tratamientos</span>
        </div>

        {/* Título */}
        <div className="at-stagger-1" style={{ display: "flex", alignItems: "flex-start", gap: 15, marginBottom: 6 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#10b981" }}>
            <FlaskIcon />
          </div>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, margin: 0, color: "#111827", letterSpacing: "-.02em" }}>Asignación de Sujetos a Tratamientos</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0", lineHeight: 1.5 }}>
              Randomización de sujetos a grupos de tratamiento · Garantiza asignación imparcial en estudios experimentales
            </p>
          </div>
        </div>

        {/* Banner IA */}
        <div className="at-stagger-2" style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", border: "1px solid #a7f3d0", borderRadius: 12, padding: "11px 15px", margin: "16px 0 24px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#065f46" }}>
          <div style={{ background: "#10b981", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}><SpkIcon /></div>
          <span>
            <b>Asistente IA:</b> Usa <b>Grupos de igual tamaño</b> para randomización simple (cada sujeto tiene la misma probabilidad de ir a cualquier grupo).
            Usa <b>Grupos equilibrados</b> (randomización por bloques, Zelen 1974) en ensayos clínicos donde el reclutamiento es secuencial, ya que garantiza balance en cualquier punto del estudio.
          </span>
        </div>

        {/* ══ FORMULARIO ══ */}
        <div className="at-stagger-3" style={{ background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: "26px 26px 20px", boxShadow: "0 4px 20px rgba(0,0,0,.04)" }}>

          <SLbl step="Paso 1" label="Número de grupos de tratamiento" />
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>
            Selecciona entre 2 y 5 grupos. Cada grupo recibirá una cantidad igual de sujetos.
          </p>

          {/* Selector visual de k */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            {[2, 3, 4, 5].map(n => {
              const col = gc(n - 2);
              const isActive = k === n;
              return (
                <button key={n} className="kbtn"
                  onClick={() => { setK(n); setN(""); setRes(null); setErr(""); }}
                  style={{ flex: 1, padding: "16px 10px", border: isActive ? `2px solid ${col.dot}` : "2px solid #e5e7eb", borderRadius: 14, cursor: "pointer", background: isActive ? col.bg : "white", fontFamily: "inherit", transition: "all .18s", boxShadow: isActive ? `0 4px 14px ${col.dot}30` : "none" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: isActive ? col.dot : "#d1d5db", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{n}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? col.txt : "#9ca3af", marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>grupo{n > 1 ? "s" : ""}</div>
                  {isActive && (
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 3 }}>
                      {Array.from({ length: n }).map((_, i) => (
                        <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: gc(i).dot }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <Divider />
          <SLbl step="Paso 2" label="Número total de sujetos" />
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px", lineHeight: 1.5 }}>
            El total debe ser <b>múltiplo de {k}</b> para garantizar grupos iguales. Cada grupo recibirá{" "}
            {N && !isNaN(Nint) && Nint % k === 0
              ? <b style={{ color: "#10b981" }}>{Nint / k} sujetos</b>
              : <span style={{ color: "#9ca3af" }}>N/{k} sujetos</span>}.
          </p>

          <div style={{ maxWidth: 420 }}>
            <div style={{ display: "flex", alignItems: "center", border: errMsg ? "2px solid #fca5a5" : N && !errMsg && canCalc ? "2px solid #10b981" : "2px solid #e5e7eb", borderRadius: 12, background: "white", overflow: "hidden", transition: "all .2s", boxShadow: N && !errMsg && canCalc ? "0 0 0 3px rgba(16,185,129,.08)" : errMsg ? "0 0 0 3px rgba(252,165,165,.15)" : "none" }}>
              <input
                type="number" min={k} step={k} value={N}
                onChange={e => { setN(e.target.value); setRes(null); setPagina(1); setErr(""); }}
                placeholder={`Ej: ${k * 7} (múltiplo de ${k})`}
                style={{ flex: 1, border: "none", outline: "none", padding: "13px 16px", fontSize: 15, fontFamily: "'DM Mono','DM Sans',sans-serif", background: "transparent", color: "#111827", fontWeight: 600 }} />
              {N && !isNaN(Nint) && Nint % k === 0 && (
                <span style={{ padding: "0 14px", fontSize: 12, fontWeight: 700, color: "#10b981", whiteSpace: "nowrap" }}>
                  {Nint / k}/grupo
                </span>
              )}
            </div>

            {/* Error */}
            {errMsg && (
              <div style={{ marginTop: 8, fontSize: 13, color: "#dc2626", fontWeight: 600, display: "flex", alignItems: "flex-start", gap: 6 }}>
                <span>⚠️</span>
                <div>
                  {errMsg}
                  {sugerencias.length > 0 && (
                    <div style={{ marginTop: 5, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ color: "#6b7280", fontWeight: 500 }}>Prueba con:</span>
                      {sugerencias.map(s => (
                        <button key={s} onClick={() => { setN(String(s)); setRes(null); setErr(""); }}
                          style={{ padding: "2px 10px", borderRadius: 20, border: "1.5px solid #10b981", background: "#f0fdf4", color: "#059669", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resumen rápido de grupos si todo OK */}
            {canCalc && !errMsg && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Array.from({ length: k }).map((_, i) => {
                  const col = gc(i);
                  return (
                    <div key={i} style={{ background: col.bg, border: `1px solid ${col.brd}`, borderRadius: 9, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: col.dot }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: col.txt }}>Grupo {i + 1}</span>
                      <span style={{ fontSize: 12, color: col.dot, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{Nint / k} sujetos</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Divider />
          <SLbl step="Paso 3" label="Tipo de grupos a crear" />
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>
            Elige el método de randomización. Ambos generan grupos exactamente iguales en tamaño.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 680 }}>
            {[
              {
                id: "igual",
                icon: <ShuffleIcon />,
                titulo: "Grupos de igual tamaño",
                desc: "Se barajan aleatoriamente los N sujetos (Fisher-Yates) y se reparten en k grupos. Cada sujeto tiene igual probabilidad de ir a cualquier grupo.",
                cuando: "Estudios con reclutamiento completo antes de asignar.",
                color: { bg: "#ecfdf5", brd: "#10b981", txt: "#065f46", dot: "#10b981" },
              },
              {
                id: "equilibrado",
                icon: <GridIcon />,
                titulo: "Grupos equilibrados",
                desc: "Randomización por bloques permutados (Zelen 1974). Los sujetos se dividen en N/k bloques de tamaño k. Dentro de cada bloque se permuta aleatoriamente el orden de grupos.",
                cuando: "Ensayos clínicos con reclutamiento secuencial.",
                color: { bg: "#eff6ff", brd: "#3b82f6", txt: "#1e3a8a", dot: "#3b82f6" },
              },
            ].map(t => (
              <div key={t.id}
                onClick={() => { setTipoG(t.id); setRes(null); }}
                style={{ padding: 18, borderRadius: 14, cursor: "pointer", border: tipoG === t.id ? `2px solid ${t.color.dot}` : "2px solid #e5e7eb", background: tipoG === t.id ? t.color.bg : "white", transition: "all .2s", boxShadow: tipoG === t.id ? `0 4px 14px ${t.color.dot}25` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: tipoG === t.id ? t.color.dot : "#f3f4f6", color: tipoG === t.id ? "white" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s", flexShrink: 0 }}>
                    {t.icon}
                  </div>
                  <div style={{ width: 19, height: 19, borderRadius: "50%", border: tipoG === t.id ? `6px solid ${t.color.dot}` : "2px solid #d1d5db", flexShrink: 0, transition: "all .2s", marginLeft: "auto" }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: tipoG === t.id ? t.color.txt : "#374151", marginBottom: 6 }}>{t.titulo}</div>
                <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.55, marginBottom: 8 }}>{t.desc}</div>
                <div style={{ fontSize: 11, color: tipoG === t.id ? t.color.dot : "#9ca3af", fontStyle: "italic", display: "flex", alignItems: "flex-start", gap: 5 }}>
                  <span style={{ marginTop: 1 }}>💡</span> {t.cuando}
                </div>
                {tipoG === t.id && (
                  <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: t.color.dot, display: "flex", alignItems: "center", gap: 4 }}>
                    <ChkIcon /> Seleccionado
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Botones acción */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className={canCalc&&!loading?"at-btn-cin":""} onClick={handleCalc} disabled={!canCalc || loading}
            style={{ flex: 1, padding: "13px 20px", borderRadius: 12, border: "none", cursor: canCalc && !loading ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, transition: "all .25s", background: canCalc ? "linear-gradient(135deg,#10b981,#059669)" : "#e5e7eb", color: canCalc ? "white" : "#9ca3af", boxShadow: canCalc ? "0 4px 14px rgba(16,185,129,.3)" : "none" }}
            onMouseDown={e => { if (canCalc) (e.currentTarget as any).style.transform = "scale(0.98)"; }}
            onMouseUp={e => { (e.currentTarget as any).style.transform = "scale(1)"; }}>
            {loading ? <><Spin sm={false} /> Asignando...</> : <><CalcIcon /> {res ? "Re-randomizar" : "Generar asignación"}</>}
          </button>
          <button onClick={handleReset}
            style={{ padding: "13px 18px", borderRadius: 12, border: "2px solid #e5e7eb", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: "white", color: "#6b7280", display: "flex", alignItems: "center", gap: 6 }}>
            <RstIcon /> Limpiar
          </button>
        </div>
        {err && <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 11, padding: "11px 15px", marginTop: 14, fontSize: 13, color: "#dc2626" }}>❌ {err}</div>}

        {/* ══════════════════════════════ RESULTADO ══════════════════════════════ */}
        {res && (
          <div style={{ marginTop: 28, animation: "slideUp .4s cubic-bezier(.16,1,.3,1)" }}>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
              <KPIc label="Total sujetos"  val={res.N}                        color="#10b981" bg="#ecfdf5" brd="#6ee7b7" />
              <KPIc label="Grupos (k)"     val={res.k}                        color="#a855f7" bg="#fdf4ff" brd="#d8b4fe" />
              <KPIc label="Sujetos/grupo"  val={res.tamGrupo}                 color="#f97316" bg="#fff7ed" brd="#fdba74" />
              <KPIc label="Método"         val={res.tipoG === "igual" ? "Igual" : "Bloques"} color="#3b82f6" bg="#eff6ff" brd="#93c5fd" />
              {res.grupos.map((g: any, i: number) => {
                const col = gc(i);
                return (
                  <div key={g.grupo} style={{ background: col.bg, border: `1.5px solid ${col.brd}`, borderRadius: 13, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: col.dot, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: col.dot }} />Grupo {g.grupo}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: col.txt, fontFamily: "'DM Mono',monospace" }}>{g.sujetos.length}</div>
                    <div style={{ fontSize: 10, color: col.dot, fontWeight: 600, marginTop: 2 }}>sujetos</div>
                  </div>
                );
              })}
            </div>

            {/* Visualización tipo EpiDat — tarjetas por grupo */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
                Número de los sujetos seleccionados por grupo:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {res.grupos.map((g: any, i: number) => {
                  const col = gc(i);
                  return (
                    <div key={g.grupo} style={{ borderRadius: 14, overflow: "hidden", border: `2px solid ${col.brd}`, boxShadow: `0 2px 10px ${col.dot}18` }}>
                      {/* Header */}
                      <div style={{ background: col.dot, padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "white", letterSpacing: "-.01em" }}>Grupo {g.grupo}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.85)", fontFamily: "'DM Mono',monospace" }}>
                          {g.sujetos.length} sujeto{g.sujetos.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {/* Grid de sujetos */}
                      <div style={{ background: col.bg, padding: "12px 16px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {g.sujetos.map((s: any) => (
                            <div key={s}
                              style={{ background: "white", border: `1.5px solid ${col.brd}`, borderRadius: 8, padding: "6px 11px", fontSize: 14, fontWeight: 700, color: col.txt, fontFamily: "'DM Mono',monospace", minWidth: 36, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Descarga */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>Tabla de asignación detallada</span>
              <button onClick={handleDesc} disabled={descLoad}
                style={{ padding: "11px 20px", borderRadius: 12, border: "2px solid #10b981", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit", background: descLoad ? "#f0fdf4" : "white", color: "#10b981", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 8px rgba(16,185,129,.12)", transition: "all .2s" }}
                onMouseEnter={e => (e.currentTarget as any).style.background = "#ecfdf5"}
                onMouseLeave={e => { if (!descLoad) (e.currentTarget as any).style.background = "white"; }}>
                {descLoad ? <><Spin sm /> Descargando...</> : <><DlIcon /> Descargar Excel</>}
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 3, overflowX: "auto", background: "#f3f4f6", borderRadius: "14px 14px 0 0", padding: "6px 6px 0" }}>
              <button onClick={() => { setTab("combinada"); setPagina(1); }} className="tbtn"
                style={{ padding: "9px 16px", border: "none", borderRadius: "9px 9px 0 0", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap", transition: "all .2s", background: tabAct === "combinada" ? "white" : "transparent", color: tabAct === "combinada" ? "#111827" : "#6b7280" }}>
                🗂 Vista por sujeto{" "}
                <span style={{ marginLeft: 6, background: tabAct === "combinada" ? "#ecfdf5" : "#e5e7eb", color: tabAct === "combinada" ? "#059669" : "#9ca3af", fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 20 }}>{res.N}</span>
              </button>
              {res.grupos.map((g: any, i: number) => {
                const col = gc(i); const isA = tabAct === `grupo_${g.grupo}`;
                return (
                  <button key={g.grupo} onClick={() => { setTab(`grupo_${g.grupo}`); setPagina(1); }} className="tbtn"
                    style={{ padding: "9px 13px", border: "none", borderRadius: "9px 9px 0 0", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap", transition: "all .2s", background: isA ? "white" : "transparent", color: isA ? col.txt : "#6b7280" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: col.dot, display: "inline-block", marginRight: 5 }} />
                    Grupo {g.grupo}
                    <span style={{ marginLeft: 5, background: isA ? col.bg : "#e5e7eb", color: isA ? col.txt : "#9ca3af", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>{g.sujetos.length}</span>
                  </button>
                );
              })}
            </div>

            {/* Tabla */}
            <div style={{ background: "white", border: "2px solid #6ee7b7", borderTop: "none", borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
              {cols.length === 0 ? (
                <div style={{ padding: 28, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Sin datos</div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          {cols.map(c => (
                            <th key={c} style={{ padding: "10px 20px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fPag.map((fila: any, ri: number) => {
                          // detectar grupo para colorear
                          const grupoStr = fila["Grupo asignado"];
                          const gi = grupoStr
                            ? res.grupos.findIndex((g: any) => `Grupo ${g.grupo}` === grupoStr)
                            : tabAct !== "combinada"
                              ? res.grupos.findIndex((g: any) => `grupo_${g.grupo}` === tabAct)
                              : -1;
                          const col = gi >= 0 ? gc(gi) : null;
                          return (
                            <tr key={ri} className="rh" style={{ background: ri % 2 === 0 ? "white" : "#fafbfc", transition: "background .12s" }}>
                              {cols.map(c => (
                                <td key={c} style={{ padding: "10px 20px", borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap", fontFamily: c === "N° sujeto" || c === "N° en grupo" || c === "N° de sujeto" ? "'DM Mono',monospace" : "inherit", fontWeight: c === "N° sujeto" || c === "N° de sujeto" ? 700 : 400, color: c === "N° sujeto" ? "#10b981" : "#374151" }}>
                                  {c === "Grupo asignado" && col
                                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: col.bg, padding: "2px 10px", borderRadius: 20, border: `1px solid ${col.brd}`, fontSize: 12, fontWeight: 700, color: col.txt }}>
                                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: col.dot }} />{fila[c]}
                                    </span>
                                    : fila[c] ?? "—"}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {tPags > 1 && <PaginComp pagina={pagina} totalPags={tPags} setPagina={setPagina} total={datosTab.length} />}
                </>
              )}
            </div>

            {/* Interpretación */}
            <div style={{ marginTop: 18, background: "white", border: "1.5px solid #e5e7eb", borderRadius: 14, padding: "16px 20px", display: "flex", gap: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}><SpkIcon /></div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.65 }}>
                <b style={{ color: "#065f46" }}>Interpretación:</b>{" "}
                Se asignaron <b>{res.N} sujetos</b> a <b>{res.k} grupos</b> de <b>{res.tamGrupo} sujetos cada uno</b> mediante{" "}
                {res.tipoG === "igual"
                  ? <>randomización simple (<b>Fisher-Yates</b>): los sujetos 1–{res.N} se barajaron aleatoriamente y se repartieron en grupos iguales.</>
                  : <>randomización por bloques permutados (<b>Zelen 1974</b>): se crearon {res.N / res.k} bloques de {res.k} sujetos y dentro de cada bloque se permutó aleatoriamente la asignación a grupos, garantizando balance secuencial.</>
                }
                {" "}<span style={{ color: "#d97706" }}>Registra el número de lista de randomización junto al protocolo del estudio para garantizar reproducibilidad y trazabilidad.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════ SUB-COMPONENTES ══════════════════════════════ */

function SLbl({ step, label }: { step: string, label: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#10b981", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 18, height: 2, background: "#10b981", borderRadius: 2 }} />{step} · {label}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#f3f4f6", margin: "4px 0 22px" }} />;
}

function KPIc({ label, val, color, bg, brd }: { label: string, val: any, color: string, bg: string, brd: string }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${brd}`, borderRadius: 13, padding: "12px 15px" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "'DM Mono',monospace" }}>{val}</div>
      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function Spin({ sm }: { sm?: boolean }) {
  const s = sm ? 14 : 17;
  return <span style={{ width: s, height: s, border: `${sm ? 2 : 3}px solid rgba(16,185,129,.3)`, borderTopColor: "#10b981", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />;
}

function PaginComp({ pagina, totalPags, setPagina, total }: { pagina: number, totalPags: number, setPagina: any, total: number }) {
  function gP(c: number, t: number) {
    if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
    if (c <= 4) return [1, 2, 3, 4, 5, "…", t];
    if (c >= t - 3) return [1, "…", t - 4, t - 3, t - 2, t - 1, t];
    return [1, "…", c - 1, c, c + 1, "…", t];
  }
  const PB = ({ l, d, f }: { l: string, d: boolean, f: any }) => (
    <button onClick={f} disabled={d} style={{ width: 34, height: 34, border: "1.5px solid #e5e7eb", borderRadius: 8, cursor: d ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, background: "white", color: d ? "#d1d5db" : "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>{l}</button>
  );
  return (
    <div style={{ padding: "14px 22px", borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
      <span style={{ fontSize: 12, color: "#9ca3af" }}>Filas {(pagina - 1) * FILAS_PAG + 1}–{Math.min(pagina * FILAS_PAG, total)} de {total.toLocaleString()}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <PB l="«" d={pagina === 1}          f={() => setPagina(1)} />
        <PB l="‹" d={pagina === 1}          f={() => setPagina((p: number) => Math.max(1, p - 1))} />
        {gP(pagina, totalPags).map((p, i) =>
          p === "…"
            ? <span key={`e${i}`} style={{ padding: "0 6px", color: "#9ca3af" }}>…</span>
            : <button key={p} onClick={() => setPagina(p)} style={{ width: 34, height: 34, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: pagina === p ? "#10b981" : "#f3f4f6", color: pagina === p ? "white" : "#6b7280" }}>{p}</button>
        )}
        <PB l="›" d={pagina === totalPags} f={() => setPagina((p: number) => Math.min(totalPags, p + 1))} />
        <PB l="»" d={pagina === totalPags} f={() => setPagina(totalPags)} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#6b7280" }}>
        Ir a{" "}
        <input type="number" min={1} max={totalPags} placeholder={String(pagina)}
          onKeyDown={e => { if (e.key === "Enter") { const v = parseInt((e.target as any).value); if (v >= 1 && v <= totalPags) { setPagina(v); (e.target as any).value = ""; } } }}
          style={{ width: 50, padding: "5px 8px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", textAlign: "center" }} />
      </div>
    </div>
  );
}
