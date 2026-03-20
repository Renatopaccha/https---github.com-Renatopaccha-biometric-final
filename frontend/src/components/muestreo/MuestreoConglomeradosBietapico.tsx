import { useState, useMemo, useEffect } from "react";

/* ═══════════════════════════════════════════════════
   ALGORITMOS DE MUESTREO
   ═══════════════════════════════════════════════════ */

function seleccionarIndicesAleatorios(total, k, semilla = null) {
  const indices = Array.from({ length: total }, (_, i) => i);
  if (semilla !== null) {
    let seed = semilla;
    const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < Math.min(k, total); i++) {
      const j = i + Math.floor(random() * (total - i));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
  } else {
    for (let i = 0; i < Math.min(k, total); i++) {
      const j = i + Math.floor(Math.random() * (total - i));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
  }
  return indices.slice(0, Math.min(k, total)).sort((a, b) => a - b);
}

function seleccionarPPS(conglomerados, k, semilla = null) {
  const totalMi = conglomerados.reduce((s, c) => s + c.Mi, 0);
  if (totalMi === 0) return [];
  let acumulado = 0;
  const intervalos = conglomerados.map(c => {
    const inicio = acumulado;
    acumulado += c.Mi / totalMi;
    return { inicio, fin: acumulado, idx: conglomerados.indexOf(c) };
  });
  const seleccionados = new Set();
  let seed = semilla;
  const random = () => {
    if (seed !== null) { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    return Math.random();
  };
  let intentos = 0;
  while (seleccionados.size < k && intentos < k * 10) {
    const r = random();
    const encontrado = intervalos.find(int => r >= int.inicio && r < int.fin);
    if (encontrado && !seleccionados.has(encontrado.idx)) seleccionados.add(encontrado.idx);
    intentos++;
  }
  while (seleccionados.size < k) { const idx = Math.floor(random() * conglomerados.length); seleccionados.add(idx); }
  return Array.from(seleccionados).sort((a, b) => a - b);
}

function seleccionarElementos(filas, m, semilla = null) {
  if (!filas || filas.length === 0) return [];
  const indices = seleccionarIndicesAleatorios(filas.length, Math.min(m, filas.length), semilla);
  return indices.map(i => filas[i]);
}

function generarSemilla() { return Math.floor(Math.random() * 1000000); }

/* ═══════════════════════════════════════════════════
   EXPORT EXCEL
   ═══════════════════════════════════════════════════ */
async function exportarExcel(sheets, nombre) {
  if (!window.XLSX) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const XLSX = window.XLSX;
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(sheets.completo);
  XLSX.utils.book_append_sheet(wb, ws1, "Muestra completa");
  sheets.conglomerados.forEach(c => {
    const nombreHoja = `Cong_${String(c.nombre).slice(0, 24)}`.replace(/[\\\/\?\*\[\]]/g, "_");
    const ws = XLSX.utils.json_to_sheet(c.filas);
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  });
  const ws3 = XLSX.utils.json_to_sheet(sheets.resumen);
  XLSX.utils.book_append_sheet(wb, ws3, "Resumen");
  XLSX.writeFile(wb, `${nombre}.xlsx`);
}

/* ═══════════════════════════════════════════════════
   ÍCONOS
   ═══════════════════════════════════════════════════ */
const I = (d, w = 16) => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const BackIcon = () => I(<><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></>, 15);
const DownloadIcon = () => I(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>);
const ResetIcon = () => I(<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>, 15);
const SparkleIcon = () => I(<path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />, 14);
const GridIcon = () => I(<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>, 18);
const CalcIcon = () => <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="8" y2="10.01" /><line x1="12" y1="10" x2="12" y2="10.01" /><line x1="16" y1="10" x2="16" y2="10.01" /><line x1="8" y1="14" x2="8" y2="14.01" /><line x1="12" y1="14" x2="12" y2="14.01" /><line x1="16" y1="14" x2="16" y2="14.01" /><line x1="8" y1="18" x2="16" y2="18" /></svg>;
const DiceIcon = () => I(<><rect x="2" y="2" width="20" height="20" rx="3" /><circle cx="8" cy="8" r="1.5" fill="currentColor" /><circle cx="16" cy="8" r="1.5" fill="currentColor" /><circle cx="8" cy="16" r="1.5" fill="currentColor" /><circle cx="16" cy="16" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></>, 15);
const UserIcon = () => I(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>, 16);
const DatabaseIcon = () => I(<><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>, 16);
const CheckIcon = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const TableIcon = () => I(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" /></>, 16);
const LayersIcon = () => I(<><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>, 16);
const SpinIcon = () => <span style={{ width: 17, height: 17, border: "3px solid rgba(255,255,255,.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />;

/* ═══════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════ */
const FILAS_PAG = 50;
const PREVIEW_MAX = 2000;

/* ═══════════════════════════════════════════════════
   COLORES - VERDE CÁLIDO DE BIOMETRIC
   ═══════════════════════════════════════════════════ */
const COLORES = [
  { bg: "#E8F5E9", border: "#A5D6A7", text: "#1B5E20", dot: "#2ECC71" },
  { bg: "#E3F2FD", border: "#90CAF9", text: "#0D47A1", dot: "#3B82F6" },
  { bg: "#FFF3E0", border: "#FFCC80", text: "#E65100", dot: "#F97316" },
  { bg: "#F3E5F5", border: "#CE93D8", text: "#4A148C", dot: "#A855F7" },
  { bg: "#E0F7FA", border: "#80DEEA", text: "#006064", dot: "#14B8A6" },
  { bg: "#FFF8E1", border: "#FFE082", text: "#F57F17", dot: "#EAB308" },
  { bg: "#FCE4EC", border: "#F48FB1", text: "#880E4F", dot: "#EC4899" },
  { bg: "#E8EAF6", border: "#9FA8DA", text: "#283593", dot: "#6366F1" },
];
const colCong = (i) => COLORES[i % COLORES.length];

const PRIMARY = {
  main: "#2ECC71",
  dark: "#27AE60",
  light: "#E8F5E9",
  text: "#1B5E20",
  border: "#A5D6A7"
};

interface Props {
  datosExcel?: any[] | null;
  loadingExcel?: boolean;
  onBack?: () => void;
}

/* ════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════════════════ */
export default function MuestreoConglomeradosBietapico({ datosExcel = null, loadingExcel = false, onBack }: Props) {
  console.log("Rendering MuestreoConglomeradosBietapico", { datosExcel: datosExcel?.length, loadingExcel, onBack });
  const tieneExcel = datosExcel && datosExcel.length > 0;

  const [modoDatos, setModoDatos] = useState(tieneExcel ? "excel" : "manual");
  const [tipoDatos, setTipoDatos] = useState("individual");

  const [conglomeradosMan, setCongMan] = useState([
    { nombre: "Conglomerado 1", Mi: "", mi: "" },
    { nombre: "Conglomerado 2", Mi: "", mi: "" },
  ]);

  const [colConglomerado, setColCong] = useState("");
  const [colNombre, setColNombre] = useState("");
  const [colTamano, setColTamano] = useState("");
  const [colMuestra, setColMuestra] = useState("");

  const [parametros, setParametros] = useState({ n: "", k: "", m: "" });
  const [paramsSeleccionados, setParamsSel] = useState([]);

  const [modoTamaño, setModoTamaño] = useState("igual");
  const [valorFraccion, setValorFraccion] = useState("");

  const [metodoSeleccion, setMetodoSel] = useState("pps");

  const [semilla, setSemilla] = useState("");
  const [usarSemilla, setUsarSemilla] = useState(false);
  const [ordenar, setOrdenar] = useState(false);

  const [resultado, setResult] = useState(null);
  const [tabActivo, setTabActivo] = useState("combinada");
  const [paginas, setPaginas] = useState({});
  const [cargando, setLoad] = useState(false);
  const [descarga, setDesc] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tieneExcel) setModoDatos("excel");
  }, [tieneExcel]);

  const columnasExcel = tieneExcel ? Object.keys(datosExcel[0]) : [];

  const conglomeradosIndividual = useMemo(() => {
    if (!tieneExcel || !colConglomerado) return [];
    const grupos = {};
    datosExcel.forEach((fila, idx) => {
      const val = String(fila[colConglomerado] ?? "Sin valor");
      if (!grupos[val]) grupos[val] = [];
      grupos[val].push({ ...fila, __idx: idx + 1 });
    });
    return Object.entries(grupos).sort(([a], [b]) => String(a).localeCompare(String(b)))
      .map(([nombre, filas]) => ({ nombre, Mi: filas.length, mi: null, filas, esIndividual: true }));
  }, [datosExcel, colConglomerado, tieneExcel]);

  const conglomeradosAgrupado = useMemo(() => {
    if (!tieneExcel || !colNombre || !colTamano) return [];
    return datosExcel.map((fila, idx) => {
      const nombre = String(fila[colNombre] ?? `Fila ${idx + 1}`);
      const Mi = parseFloat(fila[colTamano]);
      const mi = colMuestra ? (parseFloat(fila[colMuestra]) || null) : null;
      return { nombre, Mi: isNaN(Mi) || Mi < 1 ? 0 : Math.floor(Mi), mi: mi && !isNaN(mi) && mi > 0 ? Math.floor(mi) : null, esAgrupado: true };
    }).filter(c => c.Mi > 0);
  }, [datosExcel, colNombre, colTamano, colMuestra, tieneExcel]);

  const conglomeradosActivos = useMemo(() => {
    if (modoDatos === "manual") {
      return conglomeradosMan.filter(c => c.Mi && parseInt(c.Mi) > 0)
        .map((c, i) => ({ nombre: c.nombre || `Conglomerado ${i + 1}`, Mi: parseInt(c.Mi), mi: c.mi && parseInt(c.mi) > 0 ? parseInt(c.mi) : null, esManual: true }));
    }
    return tipoDatos === "individual" ? conglomeradosIndividual : conglomeradosAgrupado;
  }, [modoDatos, tipoDatos, conglomeradosMan, conglomeradosIndividual, conglomeradosAgrupado]);

  const stats = useMemo(() => {
    if (conglomeradosActivos.length === 0) return null;
    const totalElementos = conglomeradosActivos.reduce((s, c) => s + c.Mi, 0);
    return { totalElementos, totalCong: conglomeradosActivos.length, promedioMi: totalElementos / conglomeradosActivos.length };
  }, [conglomeradosActivos]);

  const parametroCalculado = useMemo(() => {
    if (paramsSeleccionados.length !== 2) return null;
    const [p1, p2] = paramsSeleccionados;
    const v1 = parseInt(parametros[p1]);
    const v2 = parseInt(parametros[p2]);
    if (isNaN(v1) || isNaN(v2) || v1 <= 0 || v2 <= 0) return null;
    if ((p1 === "k" && p2 === "m") || (p1 === "m" && p2 === "k")) return { param: "n", valor: v1 * v2, formula: `n = k × m = ${Math.min(v1, v2)} × ${Math.max(v1, v2)} = ${v1 * v2}` };
    if ((p1 === "n" && p2 === "k") || (p1 === "k" && p2 === "n")) { const n = p1 === "n" ? v1 : v2, k = p1 === "k" ? v1 : v2; return { param: "m", valor: Math.ceil(n / k), formula: `m = n / k = ${n} / ${k} = ${Math.ceil(n / k)}` }; }
    if ((p1 === "n" && p2 === "m") || (p1 === "m" && p2 === "n")) { const n = p1 === "n" ? v1 : v2, m = p1 === "m" ? v1 : v2; return { param: "k", valor: Math.ceil(n / m), formula: `k = n / m = ${n} / ${m} = ${Math.ceil(n / m)}` }; }
    return null;
  }, [paramsSeleccionados, parametros]);

  const errorMsg = useMemo(() => {
    if (conglomeradosActivos.length === 0 && modoDatos === "manual") return "";
    if (conglomeradosActivos.length === 0) return modoDatos === "excel" && tipoDatos === "individual" && !colConglomerado ? "" : modoDatos === "excel" && tipoDatos === "agrupado" && (!colNombre || !colTamano) ? "" : "No se detectaron conglomerados válidos.";
    if (paramsSeleccionados.length !== 2) return "Debes seleccionar exactamente 2 parámetros.";
    const [p1, p2] = paramsSeleccionados;
    const v1 = parseInt(parametros[p1]), v2 = parseInt(parametros[p2]);
    if (isNaN(v1) || v1 <= 0) return `Ingresa un valor válido para ${getParamLabel(p1)}.`;
    if (isNaN(v2) || v2 <= 0) return `Ingresa un valor válido para ${getParamLabel(p2)}.`;
    if (paramsSeleccionados.includes("k") && parseInt(parametros.k) >= stats.totalCong) return `k debe ser menor que ${stats.totalCong}.`;
    if (paramsSeleccionados.includes("n") && parseInt(parametros.n) >= stats.totalElementos) return `n debe ser menor que ${stats.totalElementos.toLocaleString()}.`;
    if (paramsSeleccionados.includes("m")) {
      const m = parseInt(parametros.m);
      const minMi = Math.min(...conglomeradosActivos.map(c => c.Mi));
      if (m > minMi) return `m (${m}) no puede ser mayor que el conglomerado más pequeño (${minMi}).`;
    }
    if (modoTamaño === "fraccion" && (!valorFraccion || parseFloat(valorFraccion) <= 0 || parseFloat(valorFraccion) > 1)) return "La fracción debe estar entre 0 y 1.";
    if (usarSemilla && !semilla) return "Ingresa una semilla para reproducibilidad.";
    return "";
  }, [modoDatos, tipoDatos, conglomeradosActivos, parametros, paramsSeleccionados, stats, colConglomerado, colNombre, colTamano, modoTamaño, valorFraccion, usarSemilla, semilla]);

  const canCalc = conglomeradosActivos.length > 0 && paramsSeleccionados.length === 2 && !errorMsg;

  function getParamLabel(p) { return { n: "Tamaño de muestra (n)", k: "Conglomerados (k)", m: "Elementos por conglomerado (m)" }[p]; }

  function toggleParam(p) {
    if (paramsSeleccionados.includes(p)) setParamsSel(prev => prev.filter(x => x !== p));
    else if (paramsSeleccionados.length < 2) setParamsSel(prev => [...prev, p]);
    else setParamsSel([paramsSeleccionados[1], p]);
    setResult(null);
  }

  function updateParam(p, val) { setParametros(prev => ({ ...prev, [p]: val })); setResult(null); }
  function addConglomerado() { setCongMan(prev => [...prev, { nombre: `Conglomerado ${prev.length + 1}`, Mi: "", mi: "" }]); }
  function removeConglomerado(i) { if (conglomeradosMan.length <= 2) return; setCongMan(prev => prev.filter((_, idx) => idx !== i)); setResult(null); }
  function updateConglomerado(i, campo, val) { setCongMan(prev => prev.map((c, idx) => idx === i ? { ...c, [campo]: val } : c)); setResult(null); }

  function handleCalc() {
    if (!canCalc) return;
    setLoad(true);
    setError("");
    setPaginas({});
    setTimeout(() => {
      try {
        const seed = usarSemilla && semilla ? parseInt(semilla) : null;
        let kFinal, mFinal;
        if (paramsSeleccionados.includes("k") && paramsSeleccionados.includes("m")) { kFinal = parseInt(parametros.k); mFinal = parseInt(parametros.m); }
        else if (paramsSeleccionados.includes("k") && paramsSeleccionados.includes("n")) { kFinal = parseInt(parametros.k); mFinal = Math.ceil(parseInt(parametros.n) / kFinal); }
        else { mFinal = parseInt(parametros.m); kFinal = Math.ceil(parseInt(parametros.n) / mFinal); }
        kFinal = Math.min(kFinal, conglomeradosActivos.length - 1);

        const indicesSeleccionados = metodoSeleccion === "pps" ? seleccionarPPS(conglomeradosActivos, kFinal, seed) : seleccionarIndicesAleatorios(conglomeradosActivos.length, kFinal, seed);
        const conglomeradosSeleccionados = indicesSeleccionados.map(i => conglomeradosActivos[i]);

        let ordenGlobal = 1;
        const conglomeradosResultado = conglomeradosSeleccionados.map((c, idx) => {
          let mEste;
          if (modoTamaño === "igual") mEste = mFinal;
          else if (modoTamaño === "fraccion") mEste = Math.ceil(c.Mi * parseFloat(valorFraccion));
          else mEste = c.mi || mFinal;
          const mUsar = Math.min(mEste, c.Mi);

          let filasData;
          if (c.esIndividual && c.filas) {
            const filasSeleccionadas = seleccionarElementos(c.filas, mUsar, seed ? seed + idx : null);
            filasData = filasSeleccionadas.map(f => { const { __idx, ...rest } = f; return rest; });
          } else {
            filasData = Array.from({ length: mUsar }, (_, j) => ({ "N°": j + 1 }));
          }

          if (ordenar && filasData.length > 0) {
            const col1 = Object.keys(filasData[0])[0];
            filasData.sort((a, b) => { const va = parseFloat(a[col1]), vb = parseFloat(b[col1]); return isNaN(va) || isNaN(vb) ? String(a[col1]).localeCompare(String(b[col1])) : va - vb; });
          }

          const filasConMeta = filasData.map(fila => ({ "Orden": ordenGlobal++, "Conglomerado": c.nombre, ...fila }));
          return { nombre: c.nombre, Mi: c.Mi, miSeleccionados: filasConMeta.length, filas: filasConMeta, color: idx };
        });

        const muestraCompleta = conglomeradosResultado.flatMap(c => c.filas);
        const resumen = conglomeradosResultado.map(c => ({ "Conglomerado": c.nombre, "Tamaño (Mi)": c.Mi, "Seleccionados (mi)": c.miSeleccionados, "Fracción": ((c.miSeleccionados / c.Mi) * 100).toFixed(1) + "%" }));

        setResult({ conglomerados: conglomeradosResultado, completo: muestraCompleta, resumen, kSeleccionados: conglomeradosResultado.length, nTotal: muestraCompleta.length, mPorConglomerado: mFinal, totalConglomerados: conglomeradosActivos.length, metodoSeleccion, semillaUsada: seed, modoTamaño, valorFraccion });
        setTabActivo("combinada");
      } catch (e) { setError("Error al generar la muestra: " + e.message); }
      setLoad(false);
    }, 100);
  }

  function handleReset() {
    setParametros({ n: "", k: "", m: "" }); setParamsSel([]); setSemilla(""); setUsarSemilla(false); setResult(null); setPaginas({}); setError("");
    setCongMan([{ nombre: "Conglomerado 1", Mi: "", mi: "" }, { nombre: "Conglomerado 2", Mi: "", mi: "" }]);
    setColCong(""); setColNombre(""); setColTamano(""); setColMuestra("");
    setModoTamaño("igual"); setValorFraccion("");
  }

  async function handleDescargar() {
    if (!resultado) return;
    setDesc(true);
    try { await exportarExcel({ completo: resultado.completo, conglomerados: resultado.conglomerados, resumen: resultado.resumen }, `muestra_bietapica_k${resultado.kSeleccionados}_n${resultado.nTotal}`); }
    catch (e) { setError("No se pudo generar el archivo."); }
    setDesc(false);
  }

  function getPagTab(id) { return paginas[id] || 1; }
  function setPagTab(id, p) { setPaginas(prev => ({ ...prev, [id]: p })); }

  const datosTab = resultado ? (tabActivo === "combinada" ? resultado.completo : resultado.conglomerados.find(c => c.nombre === tabActivo)?.filas ?? []) : [];
  const esGrande = datosTab.length > PREVIEW_MAX;
  const vistaData = esGrande ? datosTab.slice(0, PREVIEW_MAX) : datosTab;
  const paginaAct = getPagTab(tabActivo);
  const totalPags = Math.ceil(vistaData.length / FILAS_PAG);
  const filasPag = vistaData.slice((paginaAct - 1) * FILAS_PAG, paginaAct * FILAS_PAG);
  const columnas = vistaData.length > 0 ? Object.keys(vistaData[0]) : [];

  /* ═════ RENDER ═════ */
  console.log("About to render JSX");
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#fafbfc", minHeight: "100vh" }}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        input[type=number]{-moz-appearance:textfield}
        .tab-cong:hover{background:#f9fafb}
      `}</style>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 13, color: "#7F8C8D", fontWeight: 500 }}>
          <span style={{ color: PRIMARY.main, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }} onClick={onBack}><BackIcon /> Selección de Muestras</span>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#2C3E50", fontWeight: 600 }}>Muestreo por Conglomerados Bietápico</span>
        </div>

        {/* Título */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 15, marginBottom: 6 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg,${PRIMARY.light},${PRIMARY.main}20)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2px solid ${PRIMARY.border}` }}><LayersIcon /></div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 23, fontWeight: 800, margin: 0, color: "#2C3E50", letterSpacing: "-.02em" }}>Muestreo por Conglomerados Bietápico</h1>
            <p style={{ fontSize: 14, color: "#7F8C8D", margin: "4px 0 0", lineHeight: 1.5 }}>Dos etapas: selecciona conglomerados y luego elementos dentro de cada uno</p>
          </div>
          {tieneExcel && <div style={{ display: "flex", alignItems: "center", gap: 6, background: PRIMARY.light, border: `1px solid ${PRIMARY.border}`, borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: PRIMARY.dark }}><TableIcon /> Excel detectado ({datosExcel.length.toLocaleString()} filas)</div>}
        </div>

        {/* Banner IA */}
        <div style={{ background: `linear-gradient(135deg,${PRIMARY.light},#f0fdf4)`, border: `1px solid ${PRIMARY.border}`, borderRadius: 12, padding: "11px 15px", margin: "16px 0 24px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: PRIMARY.text }}>
          <div style={{ background: PRIMARY.main, borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}><SparkleIcon /></div>
          <span><b>Asistente IA:</b> El muestreo bietápico reduce costos al estudiar solo una muestra dentro de cada conglomerado. Usa <b>PPS</b> para dar mayor probabilidad a conglomerados más grandes.</span>
        </div>

        {/* PASO 1: FUENTE DE DATOS */}
        <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: "22px 24px 18px", boxShadow: "0 1px 4px rgba(0,0,0,.03)", marginBottom: 16 }}>
          <SLabel step="Paso 1" label="Fuente de datos" />

          <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 18 }}>
            <button onClick={() => { setModoDatos("manual"); setResult(null); }} style={modoBtnStyle(modoDatos === "manual", PRIMARY)}>
              <span style={{ fontSize: 16 }}>✏️</span>
              <div style={{ textAlign: "left" }}><div>Definir manualmente</div><div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", marginTop: 1 }}>Nombra conglomerados y tamaños</div></div>
            </button>
            <button onClick={() => { if (tieneExcel) { setModoDatos("excel"); setResult(null); } }} disabled={!tieneExcel} style={modoBtnStyle(modoDatos === "excel", PRIMARY, !tieneExcel)}>
              <span style={{ fontSize: 16 }}>📊</span>
              <div style={{ textAlign: "left" }}><div>Desde mi tabla</div><div style={{ fontSize: 11, fontWeight: 500, color: modoDatos === "excel" ? "#6b7280" : "#9ca3af", marginTop: 1 }}>{tieneExcel ? `${datosExcel.length.toLocaleString()} filas` : "Sin datos"}</div></div>
              {tieneExcel && modoDatos === "excel" && <span style={badgeStyle(PRIMARY.light, PRIMARY.dark)}>Activo</span>}
            </button>
          </div>

          {modoDatos === "manual" && (
            <div>
              <p style={{ fontSize: 13, color: "#7F8C8D", margin: "0 0 14px" }}>Define cada conglomerado con su nombre y tamaño (Mi). Opcionalmente define el tamaño de muestra (mi) para cada uno.</p>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8 }}>
                {["Nombre", "Tamaño (Mi)", "Muestra (mi)", ""].map((h, i) => <div key={i} style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em", paddingLeft: i === 0 ? 2 : 0 }}>{h}</div>)}
              </div>
              {conglomeradosMan.map((c, i) => {
                const col = colCong(i);
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: col.bg, border: `1.5px solid ${col.border}`, borderRadius: 10, padding: "3px 3px 3px 10px" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.dot, flexShrink: 0 }} />
                      <input value={c.nombre} onChange={ev => updateConglomerado(i, "nombre", ev.target.value)} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, fontWeight: 600, color: col.text, padding: "8px 4px" }} />
                    </div>
                    <input type="number" value={c.Mi} onChange={ev => updateConglomerado(i, "Mi", ev.target.value)} placeholder="Ej: 100" min="1" style={inputStyle} />
                    <input type="number" value={c.mi} onChange={ev => updateConglomerado(i, "mi", ev.target.value)} placeholder="Opcional" min="1" style={inputStyle} />
                    <button onClick={() => removeConglomerado(i)} disabled={conglomeradosMan.length <= 2} style={{ width: 36, height: 36, border: "1.5px solid #e5e7eb", borderRadius: 9, cursor: conglomeradosMan.length <= 2 ? "not-allowed" : "pointer", background: "white", color: conglomeradosMan.length <= 2 ? "#d1d5db" : "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>×</button>
                  </div>
                );
              })}
              <button onClick={addConglomerado} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", border: `1.5px dashed ${PRIMARY.border}`, borderRadius: 10, background: PRIMARY.light, color: PRIMARY.dark, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Agregar conglomerado</button>
            </div>
          )}

          {modoDatos === "excel" && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#2C3E50", margin: "0 0 10px" }}>Tipo de entrada de datos</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button onClick={() => { setTipoDatos("individual"); setResult(null); setColCong(""); }} style={tipoBtnStyle(tipoDatos === "individual", PRIMARY)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: tipoDatos === "individual" ? PRIMARY.main : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", color: tipoDatos === "individual" ? "white" : "#6b7280" }}><UserIcon /></div>
                      <div><div style={{ fontSize: 14, fontWeight: 700, color: tipoDatos === "individual" ? PRIMARY.text : "#374151" }}>Datos individuales</div><div style={{ fontSize: 11, color: "#7F8C8D" }}>1 variable (conglomerados)</div></div>
                    </div>
                    <div style={{ fontSize: 12, color: "#7F8C8D" }}>Cada fila es un individuo. Selecciona la columna que indica a qué conglomerado pertenece.</div>
                  </button>
                  <button onClick={() => { setTipoDatos("agrupado"); setResult(null); setColNombre(""); setColTamano(""); setColMuestra(""); }} style={tipoBtnStyle(tipoDatos === "agrupado", PRIMARY)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: tipoDatos === "agrupado" ? PRIMARY.main : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", color: tipoDatos === "agrupado" ? "white" : "#6b7280" }}><DatabaseIcon /></div>
                      <div><div style={{ fontSize: 14, fontWeight: 700, color: tipoDatos === "agrupado" ? PRIMARY.text : "#374151" }}>Datos agregados</div><div style={{ fontSize: 11, color: "#7F8C8D" }}>3 variables (nombre, Mi, m*)</div></div>
                    </div>
                    <div style={{ fontSize: 12, color: "#7F8C8D" }}>Cada fila es un conglomerado. Selecciona nombre, tamaño y muestra opcional.</div>
                  </button>
                </div>
              </div>

              {tipoDatos === "individual" && (
                <div>
                  <div style={{ maxWidth: 320 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#2C3E50", display: "block", marginBottom: 7 }}>Columna de conglomerados</label>
                    <select value={colConglomerado} onChange={e => { setColCong(e.target.value); setResult(null); }} style={selectStyle}><option value="">Seleccionar columna…</option>{columnasExcel.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  </div>
                  {conglomeradosIndividual.length > 0 && <div style={{ marginTop: 12, background: PRIMARY.light, border: `1.5px solid ${PRIMARY.border}`, borderRadius: 12, padding: "14px 16px" }}><div style={{ fontSize: 13, fontWeight: 700, color: PRIMARY.text, marginBottom: 8 }}>📊 {conglomeradosIndividual.length} conglomerados · {conglomeradosIndividual.reduce((s, c) => s + c.Mi, 0).toLocaleString()} elementos</div><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{conglomeradosIndividual.slice(0, 5).map((c, i) => { const col = colCong(i); return <span key={c.nombre} style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>{c.nombre} ({c.Mi})</span>; })}{conglomeradosIndividual.length > 5 && <span style={{ fontSize: 11, color: "#9ca3af", padding: "3px 9px" }}>+{conglomeradosIndividual.length - 5} más</span>}</div></div>}
                </div>
              )}

              {tipoDatos === "agrupado" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div><label style={{ fontSize: 12, fontWeight: 600, color: "#2C3E50", display: "block", marginBottom: 6 }}>Conglomerados (nombre)</label><select value={colNombre} onChange={e => { setColNombre(e.target.value); setResult(null); }} style={selectStyle}><option value="">Seleccionar…</option>{columnasExcel.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label style={{ fontSize: 12, fontWeight: 600, color: "#2C3E50", display: "block", marginBottom: 6 }}>Tamaño (Mi)</label><select value={colTamano} onChange={e => { setColTamano(e.target.value); setResult(null); }} style={selectStyle}><option value="">Seleccionar…</option>{columnasExcel.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", display: "block", marginBottom: 6 }}>Muestra (m) · Opcional</label><select value={colMuestra} onChange={e => { setColMuestra(e.target.value); setResult(null); }} style={selectStyle}><option value="">No especificar</option>{columnasExcel.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  </div>
                  {conglomeradosAgrupado.length > 0 && <div style={{ background: PRIMARY.light, border: `1.5px solid ${PRIMARY.border}`, borderRadius: 12, padding: "14px 16px" }}><div style={{ fontSize: 13, fontWeight: 700, color: PRIMARY.text, marginBottom: 8 }}>📊 {conglomeradosAgrupado.length} conglomerados · {conglomeradosAgrupado.reduce((s, c) => s + c.Mi, 0).toLocaleString()} elementos</div><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{conglomeradosAgrupado.slice(0, 5).map((c, i) => { const col = colCong(i); return <span key={c.nombre} style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>{c.nombre} ({c.Mi}{c.mi ? `, m=${c.mi}` : ""})</span>; })}{conglomeradosAgrupado.length > 5 && <span style={{ fontSize: 11, color: "#9ca3af", padding: "3px 9px" }}>+{conglomeradosAgrupado.length - 5} más</span>}</div></div>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PASO 2: PARÁMETROS (2 de 3) */}
        <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: "22px 24px 18px", boxShadow: "0 1px 4px rgba(0,0,0,.03)", marginBottom: 16 }}>
          <SLabel step="Paso 2" label="Parámetros de muestreo (elige 2)" />
          <p style={{ fontSize: 13, color: "#7F8C8D", margin: "0 0 14px" }}>Selecciona <b>exactamente 2 parámetros</b>. El tercero se calculará automáticamente.</p>

          {stats && <div style={{ display: "flex", gap: 16, marginBottom: 16, padding: "12px 16px", background: PRIMARY.light, borderRadius: 10, border: `1px solid ${PRIMARY.border}` }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: PRIMARY.main, fontFamily: "'DM Mono',monospace" }}>{stats.totalCong}</div><div style={{ fontSize: 11, color: PRIMARY.text }}>Conglomerados</div></div>
            <div style={{ width: 1, background: PRIMARY.border }} />
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#2C3E50", fontFamily: "'DM Mono',monospace" }}>{stats.totalElementos.toLocaleString()}</div><div style={{ fontSize: 11, color: PRIMARY.text }}>Elementos</div></div>
            <div style={{ width: 1, background: PRIMARY.border }} />
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#7F8C8D", fontFamily: "'DM Mono',monospace" }}>{stats.promedioMi.toFixed(1)}</div><div style={{ fontSize: 11, color: PRIMARY.text }}>Promedio Mi</div></div>
          </div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { id: "n", label: "Tamaño de muestra (n)", desc: "Total de elementos en la muestra", placeholder: "Ej: 200" },
              { id: "k", label: "Conglomerados (k)", desc: "Número de conglomerados a seleccionar", placeholder: stats ? `1-${stats.totalCong - 1}` : "Ej: 5" },
              { id: "m", label: "Elementos por conglomerado (m)", desc: "Elementos a seleccionar en cada uno", placeholder: "Ej: 15" },
            ].map(p => {
              const isSelected = paramsSeleccionados.includes(p.id);
              const isCalculated = parametroCalculado?.param === p.id;
              return (
                <div key={p.id} onClick={() => toggleParam(p.id)} style={{ padding: "14px", borderRadius: 12, cursor: "pointer", border: isCalculated ? `2px dashed ${PRIMARY.main}` : isSelected ? `2px solid ${PRIMARY.main}` : "2px solid #e5e7eb", background: isCalculated ? "#f0fdf4" : isSelected ? PRIMARY.light : "white", transition: "all .2s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: isSelected || isCalculated ? `5px solid ${PRIMARY.main}` : "2px solid #d1d5db", background: isSelected || isCalculated ? PRIMARY.main : "white", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>{isSelected || isCalculated ? <CheckIcon /> : ""}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isSelected || isCalculated ? PRIMARY.text : "#374151" }}>{p.label}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#7F8C8D", marginBottom: 8 }}>{p.desc}</div>
                  <input type="number" value={isCalculated ? parametroCalculado.valor : parametros[p.id]} onChange={e => updateParam(p.id, e.target.value)} onClick={e => e.stopPropagation()} placeholder={p.placeholder} disabled={isCalculated} min="1" style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "'DM Mono',monospace", outline: "none", background: isCalculated ? "#f0fdf4" : "white", color: isCalculated ? PRIMARY.main : "#111827" }} />
                  {isCalculated && <div style={{ marginTop: 6, fontSize: 10, color: PRIMARY.main, fontWeight: 600 }}>✓ {parametroCalculado.formula}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* PASO 3: TAMAÑO DE MUESTRA POR CONGLOMERADO */}
        <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: "22px 24px 18px", boxShadow: "0 1px 4px rgba(0,0,0,.03)", marginBottom: 16 }}>
          <SLabel step="Paso 3" label="Tamaño de muestra por conglomerado" />
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[
              { id: "igual", icon: "📏", label: "Muestra igual para todos", desc: "Todos los conglomerados: m elementos" },
              { id: "fraccion", icon: "📊", label: "Fracción fija para todos", desc: "Proporción igual para todos" },
              { id: "definir", icon: "✏️", label: "Definir tamaño de cada uno", desc: "Usar valores específicos (mi)" },
            ].map(opt => (
              <div key={opt.id} onClick={() => { setModoTamaño(opt.id); setResult(null); }} style={{ padding: "14px", borderRadius: 12, cursor: "pointer", border: modoTamaño === opt.id ? `2px solid ${PRIMARY.main}` : "2px solid #e5e7eb", background: modoTamaño === opt.id ? PRIMARY.light : "white", transition: "all .2s" }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{opt.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: modoTamaño === opt.id ? PRIMARY.text : "#374151", marginBottom: 4 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "#7F8C8D" }}>{opt.desc}</div>
                {modoTamaño === opt.id && <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: PRIMARY.main, display: "flex", alignItems: "center", gap: 4 }}><CheckIcon /> Seleccionado</div>}
              </div>
            ))}
          </div>

          {modoTamaño === "fraccion" && (
            <div style={{ marginTop: 12, padding: "12px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#2C3E50", display: "block", marginBottom: 6 }}>Fracción de muestreo (entre 0 y 1)</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="number" value={valorFraccion} onChange={e => { setValorFraccion(e.target.value); setResult(null); }} placeholder="Ej: 0.15" step="0.01" min="0" max="1" style={{ flex: 1, maxWidth: 150, padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "'DM Mono',monospace", outline: "none" }} />
                <span style={{ fontSize: 12, color: "#7F8C8D" }}>Cada conglomerado aportará: mi = Mi × fracción</span>
              </div>
            </div>
          )}

          {modoTamaño === "definir" && (
            <div style={{ marginTop: 12, padding: "12px 14px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a" }}>
              <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                <b>📌 Modo definido:</b> Se usará el valor <b>mi</b> específico de cada conglomerado. Defínelo en la tabla del Paso 1 o usa la columna "Muestra (m)" en datos agregados.
              </div>
            </div>
          )}
        </div>

        {/* PASO 4: MÉTODO Y OPCIONES */}
        <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: "22px 24px 18px", boxShadow: "0 1px 4px rgba(0,0,0,.03)", marginBottom: 16 }}>
          <SLabel step="Paso 4" label="Método de selección y opciones" />

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#2C3E50", display: "block", marginBottom: 8 }}>Seleccionar conglomerados usando:</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => { setMetodoSel("pps"); setResult(null); }} style={metodoBtnStyle(metodoSeleccion === "pps", PRIMARY)}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>📊</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: metodoSeleccion === "pps" ? PRIMARY.text : "#374151", marginBottom: 4 }}>Probabilidades proporcionales al tamaño (PPS)</div>
                <div style={{ fontSize: 11, color: "#7F8C8D" }}>Conglomerados más grandes tienen mayor probabilidad</div>
              </button>
              <button onClick={() => { setMetodoSel("aleatorio"); setResult(null); }} style={metodoBtnStyle(metodoSeleccion === "aleatorio", PRIMARY)}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>🎲</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: metodoSeleccion === "aleatorio" ? PRIMARY.text : "#374151", marginBottom: 4 }}>Selección aleatoria simple</div>
                <div style={{ fontSize: 11, color: "#7F8C8D" }}>Todos tienen la misma probabilidad</div>
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div onClick={() => { setUsarSemilla(!usarSemilla); setResult(null); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: usarSemilla ? `2px solid ${PRIMARY.main}` : "2px solid #e5e7eb", background: usarSemilla ? PRIMARY.light : "white", transition: "all .2s", userSelect: "none" }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, border: usarSemilla ? `2px solid ${PRIMARY.main}` : "2px solid #d1d5db", background: usarSemilla ? PRIMARY.main : "white", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>{usarSemilla && <CheckIcon />}</div>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: usarSemilla ? PRIMARY.text : "#374151" }}>Usar semilla para reproducibilidad</div><div style={{ fontSize: 11, color: "#7F8C8D", marginTop: 1 }}>Permite reproducir exactamente la misma selección</div></div>
            </div>
            {usarSemilla && (
              <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ flex: 1, maxWidth: 180 }}><label style={{ fontSize: 12, fontWeight: 600, color: "#2C3E50", display: "block", marginBottom: 6 }}>Semilla</label><input type="number" value={semilla} onChange={e => { setSemilla(e.target.value); setResult(null); }} placeholder="Ej: 12345" style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 14, outline: "none", color: "#111827" }} /></div>
                <button onClick={() => setSemilla(String(generarSemilla()))} style={{ padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${PRIMARY.main}`, background: "white", color: PRIMARY.main, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}><DiceIcon /> Generar</button>
              </div>
            )}
          </div>

          <div onClick={() => setOrdenar(!ordenar)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: ordenar ? `2px solid ${PRIMARY.main}` : "2px solid #e5e7eb", background: ordenar ? PRIMARY.light : "white", transition: "all .2s", userSelect: "none" }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, border: ordenar ? `2px solid ${PRIMARY.main}` : "2px solid #d1d5db", background: ordenar ? PRIMARY.main : "white", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>{ordenar && <CheckIcon />}</div>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: ordenar ? PRIMARY.text : "#374151" }}>Ordenar elementos dentro de cada conglomerado</div><div style={{ fontSize: 11, color: "#7F8C8D", marginTop: 1 }}>Presenta las filas ordenadas</div></div>
          </div>
        </div>

        {/* Error */}
        {errorMsg && <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 11, padding: "11px 15px", marginBottom: 14, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>⚠️ {errorMsg}</div>}

        {/* Botones */}
        <div style={{ display: "flex", gap: 10, marginBottom: resultado ? 24 : 0 }}>
          <button onClick={handleCalc} disabled={!canCalc || cargando} style={{ flex: 1, padding: "13px 20px", borderRadius: 12, border: "none", cursor: canCalc && !cargando ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, transition: "all .25s", background: canCalc ? `linear-gradient(135deg,${PRIMARY.main},${PRIMARY.dark})` : "#e5e7eb", color: canCalc ? "white" : "#9ca3af", boxShadow: canCalc ? `0 4px 14px rgba(46,204,113,.3)` : "none" }}>
            {cargando ? <><SpinIcon />Generando...</> : <><CalcIcon />{resultado ? "Regenerar muestra" : "Generar muestra bietápica"}</>}
          </button>
          <button onClick={handleReset} style={{ padding: "13px 18px", borderRadius: 12, border: "2px solid #e5e7eb", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: "white", color: "#7F8C8D", display: "flex", alignItems: "center", gap: 6 }}><ResetIcon /> Limpiar</button>
        </div>

        {/* RESULTADO */}
        {resultado && (
          <div style={{ marginTop: 24, animation: "slideUp .4s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 20 }}>
              {resultado.conglomerados.map((c, i) => {
                const col = colCong(i);
                return (
                  <div key={c.nombre} style={{ background: col.bg, border: `1.5px solid ${col.border}`, borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: col.dot, marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: col.dot }} />{c.nombre}</div>
                    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}><div><span style={{ fontSize: 18, fontWeight: 800, color: col.text, fontFamily: "'DM Mono',monospace" }}>{c.miSeleccionados}</span><span style={{ fontSize: 11, color: col.dot, marginLeft: 4 }}>de {c.Mi}</span></div></div>
                    <div style={{ fontSize: 10, color: col.dot, fontWeight: 600, marginTop: 2 }}>seleccionados</div>
                  </div>
                );
              })}
              <div style={{ background: "white", border: `2px solid ${PRIMARY.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: PRIMARY.main, marginBottom: 4 }}>TOTAL MUESTRA</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: PRIMARY.text, fontFamily: "'DM Mono',monospace" }}>{resultado.nTotal.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: PRIMARY.dark, fontWeight: 600, marginTop: 2 }}>de {resultado.kSeleccionados} conglomerados</div>
              </div>
            </div>

            <div style={{ background: PRIMARY.light, border: `1.5px solid ${PRIMARY.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: PRIMARY.text }}>
              📋 Método: <b>{resultado.metodoSeleccion === "pps" ? "PPS (Probabilidades Proporcionales al Tamaño)" : "Aleatorio Simple"}</b>
              <span> · Tamaño: <b>{resultado.modoTamaño === "igual" ? "Muestra igual" : resultado.modoTamaño === "fraccion" ? `Fracción ${resultado.valorFraccion}` : "Definido por conglomerado"}</b></span>
              {resultado.semillaUsada && <span> · Semilla: <b>{resultado.semillaUsada}</b></span>}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#2C3E50" }}>Vista de la muestra generada</span>
              <button onClick={handleDescargar} disabled={descarga} style={{ padding: "11px 20px", borderRadius: 12, border: `2px solid ${PRIMARY.main}`, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit", background: descarga ? PRIMARY.light : "white", color: PRIMARY.main, display: "flex", alignItems: "center", gap: 8, boxShadow: `0 2px 8px rgba(46,204,113,.12)` }}>
                {descarga ? <><SpinIcon /> Descargando...</> : <><DownloadIcon /> Descargar Excel</>}
              </button>
            </div>

            <div style={{ display: "flex", gap: 4, overflowX: "auto", background: "#f3f4f6", borderRadius: "14px 14px 0 0", padding: "6px 6px 0" }}>
              <button onClick={() => setTabActivo("combinada")} style={tabStyle(tabActivo === "combinada", null, PRIMARY)}>🗂 Muestra completa<span style={{ marginLeft: 6, background: tabActivo === "combinada" ? PRIMARY.light : "#e5e7eb", color: tabActivo === "combinada" ? PRIMARY.text : "#9ca3af", fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 20 }}>{resultado.nTotal}</span></button>
              {resultado.conglomerados.map((c, i) => {
                const col = colCong(i);
                return <button key={c.nombre} onClick={() => setTabActivo(c.nombre)} style={tabStyle(tabActivo === c.nombre, col, PRIMARY)}><span style={{ width: 7, height: 7, borderRadius: "50%", background: col.dot, display: "inline-block", marginRight: 5 }} />{c.nombre}<span style={{ marginLeft: 6, background: tabActivo === c.nombre ? col.bg : "#e5e7eb", color: tabActivo === c.nombre ? col.text : "#9ca3af", fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 20 }}>{c.miSeleccionados}</span></button>;
              })}
            </div>

            {esGrande && <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", padding: "11px 18px", fontSize: 13, color: "#92400e" }}><span style={{ fontSize: 18 }}>⚡</span> <b>Datos grandes ({datosTab.length.toLocaleString()} filas)</b> · Mostrando las primeras {PREVIEW_MAX.toLocaleString()}. Descarga el Excel para datos completos.</div>}
            <div style={{ background: "white", border: `2px solid ${PRIMARY.border}`, borderTop: esGrande ? "none" : `2px solid ${PRIMARY.border}`, borderRadius: esGrande ? "0 0 14px 14px" : "14px", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: "#f9fafb" }}>{columnas.map(c => <th key={c} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#7F8C8D", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{c}</th>)}</tr></thead>
                  <tbody>
                    {filasPag.map((fila, i) => (
                      <tr key={i} className="rh" style={{ background: i % 2 === 0 ? "white" : "#fafbfc", transition: "background .12s" }}>
                        {columnas.map(c => {
                          const isCong = c === "Conglomerado";
                          const congIdx = isCong ? resultado.conglomerados.findIndex(cong => cong.nombre === fila[c]) : -1;
                          const col = congIdx >= 0 ? colCong(congIdx) : null;
                          return <td key={c} style={{ padding: "10px 16px", borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap", color: c === "Orden" ? PRIMARY.main : isCong && col ? col.text : "#2C3E50", fontWeight: c === "Orden" ? 700 : isCong ? 600 : 400, fontFamily: c === "Orden" || c === "N°" ? "'DM Mono',monospace" : "inherit" }}>{isCong && col ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: col.bg, padding: "2px 9px", borderRadius: 20, border: `1px solid ${col.border}` }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: col.dot }} />{fila[c]}</span> : fila[c] ?? "-"}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPags > 1 && <PaginacionComp pagina={paginaAct} totalPags={totalPags} setPagina={p => setPagTab(tabActivo, p)} vistaData={vistaData} />}
            </div>

            <div style={{ marginTop: 18, background: "white", border: "1.5px solid #e5e7eb", borderRadius: 14, padding: "16px 20px", display: "flex", gap: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: PRIMARY.main, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}><SparkleIcon /></div>
              <div style={{ fontSize: 13, color: "#2C3E50", lineHeight: 1.65 }}>
                <b style={{ color: PRIMARY.text }}>Interpretación:</b> Se aplicó muestreo bietápico con <b>{resultado.kSeleccionados} conglomerados</b> seleccionados por <b>{resultado.metodoSeleccion === "pps" ? "PPS" : "aleatorio simple"}</b>.
                Dentro de cada conglomerado se seleccionaron elementos según <b>{resultado.modoTamaño === "igual" ? "muestra igual" : resultado.modoTamaño === "fraccion" ? "fracción fija" : "valores definidos"}</b>, obteniendo <b>{resultado.nTotal.toLocaleString()} elementos</b>.
                {resultado.semillaUsada && <span> Semilla: <b>{resultado.semillaUsada}</b>.</span>}
                <br /><br /><span style={{ color: "#7F8C8D", fontSize: 12 }}>Nota: Este diseño requiere corrección por diseño al calcular intervalos de confianza.</span>
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
function SLabel({ step, label }) { return <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#2ECC71", marginBottom: 14, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 16, height: 2, background: "#2ECC71", borderRadius: 2 }} />{step} · {label}</div>; }

const inputStyle = { border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", color: "#111827" };
const selectStyle = { width: "100%", padding: "11px 36px 11px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontFamily: "inherit", appearance: "none", outline: "none", cursor: "pointer", background: "white", color: "#111827" };

function modoBtnStyle(isActive, PRIMARY, disabled = false) { return { flex: 1, padding: "12px 16px", border: "none", borderRadius: 9, cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s", background: isActive ? "white" : "transparent", color: disabled ? "#d1d5db" : isActive ? "#111827" : "#6b7280", boxShadow: isActive ? "0 1px 3px rgba(0,0,0,.08)" : "none", opacity: disabled ? 0.6 : 1 }; }
function tipoBtnStyle(isActive, PRIMARY) { return { padding: "14px 16px", borderRadius: 12, cursor: "pointer", border: isActive ? `2px solid ${PRIMARY.main}` : "2px solid #e5e7eb", background: isActive ? PRIMARY.light : "white", transition: "all .2s", textAlign: "left" }; }
function metodoBtnStyle(isActive, PRIMARY) { return { padding: "14px", borderRadius: 12, cursor: "pointer", border: isActive ? `2px solid ${PRIMARY.main}` : "2px solid #e5e7eb", background: isActive ? PRIMARY.light : "white", transition: "all .2s", textAlign: "center" }; }
function badgeStyle(bg, color) { return { marginLeft: "auto", background: bg, color, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }; }
function tabStyle(isActive, col, PRIMARY) { return { padding: "9px 16px", border: "none", borderRadius: "9px 9px 0 0", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap", transition: "all .2s", background: isActive ? "white" : "transparent", color: isActive && col ? col.text : isActive ? PRIMARY.text : "#6b7280", boxShadow: isActive ? "0 -1px 0 white" : undefined }; }

function PaginacionComp({ pagina, totalPags, setPagina, vistaData }) {
  function getPags(cur, tot) { if (tot <= 7) return Array.from({ length: tot }, (_, i) => i + 1); if (cur <= 4) return [1, 2, 3, 4, 5, "…", tot]; if (cur >= tot - 3) return [1, "…", tot - 4, tot - 3, tot - 2, tot - 1, tot]; return [1, "…", cur - 1, cur, cur + 1, "…", tot]; }
  return (
    <div style={{ padding: "14px 20px", borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
      <span style={{ fontSize: 12, color: "#9ca3af" }}>Filas {((pagina - 1) * FILAS_PAG + 1)}–{Math.min(pagina * FILAS_PAG, vistaData.length)} de {vistaData.length.toLocaleString()}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>{getPags(pagina, totalPags).map((p, i) => p === "…" ? <span key={`e${i}`} style={{ padding: "0 6px", color: "#9ca3af", fontSize: 13 }}>…</span> : <button key={p} onClick={() => setPagina(p)} style={{ width: 32, height: 32, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: pagina === p ? "#2ECC71" : "#f3f4f6", color: pagina === p ? "white" : "#6b7280" }}>{p}</button>)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#7F8C8D" }}>Ir a pág. <input type="number" min={1} max={totalPags} placeholder={String(pagina)} onKeyDown={e => { if (e.key === "Enter") { const v = parseInt(e.target.value); if (v >= 1 && v <= totalPags) { setPagina(v); e.target.value = ""; } } }} style={{ width: 50, padding: "5px 8px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", textAlign: "center" }} /></div>
    </div>
  );
}