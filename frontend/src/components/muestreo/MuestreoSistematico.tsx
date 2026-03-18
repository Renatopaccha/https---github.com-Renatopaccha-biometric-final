/*
  ╔══════════════════════════════════════════════════════════════════╗
  ║  BIOMETRIC — Muestreo Sistemático                               ║
  ║  Selección de cada k-ésimo elemento con inicio aleatorio        ║
  ╚══════════════════════════════════════════════════════════════════╝
*/

import React, { useState, useMemo } from "react";

/* ═══════════════════════════════════════════════════
   EXPORT EXCEL (lazy — carga SheetJS solo al descargar)
   ═══════════════════════════════════════════════════ */
async function exportarExcel(datos: any[], nombre: string) {
  if (!(window as any).XLSX) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const XLSX = (window as any).XLSX;
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Muestra Sistemática");
  XLSX.writeFile(wb, `${nombre}.xlsx`);
}

/* ═══════════════════════════════════════════════════
   ÍCONOS
   ═══════════════════════════════════════════════════ */
const Ico = ({ d, w = 16 }: { d: string[], w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d.map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const BackIcon     = () => <Ico w={15} d={["M19 12H5M12 19l-7-7 7-7"]} />;
const DownloadIcon = () => <Ico d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"]} />;
const ResetIcon    = () => <Ico w={15} d={["M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8","M3 3v5h5"]} />;
const SparkleIcon  = () => <Ico w={14} d={["M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"]} />;
const InfoIcon     = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>;
const SortIcon     = () => <Ico w={14} d={["M8 6h13","M8 12h13","M8 18h13","M3 6l1 1 2-3","M3 12l1 1 2-3","M3 18l1 1 2-3"]} />;
const TableIcon    = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>;
const CalcIcon     = () => <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/></svg>;

/* ═══════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════ */
const FILAS_PAG    = 50;
const PREVIEW_MAX  = 2000;

interface Props {
  datosExcel?: any[] | null;
  loadingExcel?: boolean;
  onBack?: () => void;
}

/* ════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════════════════ */
export default function MuestreoSistematico({ datosExcel = null, loadingExcel = false, onBack }: Props) {
  const [modo,      setModo]    = useState("manual");
  const [N,         setN]       = useState("");
  const [n,         setN_]      = useState("");
  const [ordenar,   setOrdenar] = useState(false);
  const [resultado, setResult]  = useState<any>(null); // { muestra, intervalo, inicio }
  const [pagina,    setPagina]  = useState(1);
  const [cargando,  setLoad]    = useState(false);
  const [descarga,  setDesc]    = useState(false);
  const [error,     setError]   = useState("");

  const vN = parseInt(N);
  const vn = parseInt(n);
  const popTotal = modo === "excel" && datosExcel ? datosExcel.length : vN;

  /* ── Validación ── */
  const errorMsg = useMemo(() => {
    if (modo === "manual") {
      if (N === "" || n === "") return "";
      if (isNaN(vN) || vN < 2)  return "La población debe tener al menos 2 sujetos.";
      if (isNaN(vn) || vn < 1)  return "La muestra debe tener al menos 1 sujeto.";
      if (vn >= vN)              return "La muestra debe ser menor que la población.";
      if (Math.floor(vN / vn) < 1) return "Intervalo k=0: la muestra es demasiado grande para esta población.";
    }
    if (modo === "excel" && datosExcel) {
      if (n === "") return "";
      if (isNaN(vn) || vn < 1) return "La muestra debe tener al menos 1 sujeto.";
      if (vn >= datosExcel.length) return `La muestra (${vn}) debe ser menor que la tabla (${datosExcel.length} filas).`;
    }
    return "";
  }, [N, n, modo, datosExcel, vN, vn]);

  const canCalc = !errorMsg &&
    (modo === "manual" ? N !== "" && n !== "" : datosExcel && datosExcel.length > 0 && n !== "");

  const k_preview = canCalc && !errorMsg ? Math.floor(popTotal / vn) : null;

  /* ── Calcular ── */
  function handleCalc() {
    if (!canCalc) return;
    setLoad(true); setError(""); setPagina(1);
    setTimeout(() => {
      try {
        const poblacion = modo === "manual"
          ? Array.from({ length: vN }, (_, i) => ({ "N°": i + 1 }))
          : datosExcel!;
        let { muestra, intervalo, inicio } = muestreoistematico_fn(poblacion, vn);
        // Limpiar clave interna si modo manual
        if (modo === "manual") {
          muestra = muestra.map(({ _idx_original, ...r }: any) => r);
        } else if (ordenar) {
          // Para Excel: reordenar por posición original
          muestra = [...muestra].sort((a, b) => a._idx_original - b._idx_original);
        }
        if (modo === "manual" && ordenar) {
          muestra = [...muestra].sort((a, b) => a["N°"] - b["N°"]);
        }
        const final = muestra.map((r, i) => {
          const { _idx_original, ...limpio } = r;
          return { "Orden selección": i + 1, "Pos. en población": _idx_original ?? r["N°"], ...limpio };
        });
        setResult({ muestra: final, intervalo, inicio });
      } catch (e: any) { setError("Error al generar la muestra: " + e.message); }
      setLoad(false);
    }, 60);
  }

  function muestreoistematico_fn(poblacion: any[], n: number) {
    const N = poblacion.length;
    const k = Math.floor(N / n);
    const r = Math.floor(Math.random() * k) + 1;
    const resultado = [];
    for (let i = 0; i < n; i++) {
        const idx = r - 1 + i * k;
        if (idx < N) resultado.push({ ...poblacion[idx], _idx_original: idx + 1 });
    }
    return { muestra: resultado, intervalo: k, inicio: r };
  }

  function handleReset() {
    setN(""); setN_(""); setOrdenar(false);
    setResult(null); setPagina(1); setError("");
  }

  /* ── Paginación ── */
  const esGrande   = resultado && resultado.muestra.length > PREVIEW_MAX;
  const vistaData  = resultado ? (esGrande ? resultado.muestra.slice(0, PREVIEW_MAX) : resultado.muestra) : [];
  const totalPags  = Math.ceil(vistaData.length / FILAS_PAG);
  const filasPag   = vistaData.slice((pagina - 1) * FILAS_PAG, pagina * FILAS_PAG);
  const columnas   = resultado && resultado.muestra.length > 0 ? Object.keys(resultado.muestra[0]) : [];

  async function handleDescargar() {
    if (!resultado) return;
    setDesc(true);
    try { await exportarExcel(resultado.muestra, `muestra_sistematica_k${resultado.intervalo}_r${resultado.inicio}`); }
    catch (e) { setError("No se pudo generar el archivo."); }
    setDesc(false);
  }

  /* ════ RENDER ════ */
  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#fafbfc", minHeight:"100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .rh:hover{background:#ecfdf5!important}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        input[type=number]{-moz-appearance:textfield}
      `}</style>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"28px 24px 60px" }}>

        {/* Breadcrumb */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:22, fontSize:13, color:"#6b7280", fontWeight:500 }}>
          <span onClick={onBack} style={{ color:"#10b981", display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}><BackIcon/> Selección de Muestras</span>
          <span style={{ color:"#d1d5db" }}>/</span>
          <span style={{ color:"#374151", fontWeight:600 }}>Muestreo Sistemático</span>
        </div>

        {/* Título */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:15, marginBottom:6 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:"linear-gradient(135deg,#eff6ff,#dbeafe)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:22 }}>📋</div>
          <div>
            <h1 style={{ fontSize:23, fontWeight:800, margin:0, color:"#111827", letterSpacing:"-.02em" }}>Muestreo Sistemático</h1>
            <p style={{ fontSize:14, color:"#6b7280", margin:"4px 0 0", lineHeight:1.5 }}>Selecciona cada k-ésimo elemento con inicio aleatorio · Sistemático regular</p>
          </div>
        </div>

        {/* Banner IA */}
        <div style={{ background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)", border:"1px solid #a7f3d0", borderRadius:12, padding:"11px 15px", margin:"16px 0 24px", display:"flex", alignItems:"center", gap:10, fontSize:13, color:"#065f46" }}>
          <div style={{ background:"#10b981", borderRadius:7, width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", color:"white", flexShrink:0 }}><SparkleIcon/></div>
          <span><b>Asistente IA:</b> Ideal para listados ordenados (historias clínicas, registros hospitalarios). El intervalo k = N/n se calcula automáticamente y el punto de inicio es aleatorio para garantizar representatividad.</span>
        </div>

        {/* Modo de entrada */}
        <ModoSelector modo={modo} setModo={setModo} datosExcel={datosExcel} loadingExcel={loadingExcel} onSwitch={() => { setResult(null); setError(""); }}/>

        {/* Visualización del intervalo — antes del formulario */}
        {k_preview !== null && !errorMsg && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
            {[
              { label:"Intervalo (k = N/n)", val: k_preview, desc:"Cada cuántos sujetos se selecciona uno", col:"#10b981", bg:"#ecfdf5", border:"#a7f3d0" },
              { label:"Población (N)",       val: popTotal.toLocaleString(), desc:"Total de sujetos disponibles", col:"#374151", bg:"#f9fafb", border:"#e5e7eb" },
              { label:"Muestra deseada (n)", val: vn,          desc:"Sujetos a seleccionar",         col:"#374151", bg:"#f9fafb", border:"#e5e7eb" },
            ].map(s => (
              <div key={s.label} style={{ background:s.bg, border:`1.5px solid ${s.border}`, borderRadius:13, padding:"14px 16px" }}>
                <div style={{ fontSize:24, fontWeight:800, color:s.col, fontFamily:"'DM Mono',monospace", letterSpacing:"-.02em" }}>{s.val}</div>
                <div style={{ fontSize:12, fontWeight:700, color:s.col, marginTop:3 }}>{s.label}</div>
                <div style={{ fontSize:11, color:"#9ca3af", marginTop:2, lineHeight:1.4 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario */}
        <div style={{ background:"white", borderRadius:16, border:"1.5px solid #e5e7eb", padding:"24px 24px 12px", boxShadow:"0 1px 4px rgba(0,0,0,.03)" }}>
          <SectionLabel step="Paso 1" label="Parámetros de la muestra"/>

          <div style={{ display:"grid", gridTemplateColumns: modo==="excel"&&datosExcel ? "1fr" : "1fr 1fr", gap:16 }}>
            {modo === "manual" && (
              <FieldNum label="Tamaño de la población (N)" value={N} onChange={v=>{setN(v);setResult(null);}} placeholder="Ej: 5594"
                hint="Total de sujetos en el listado" tooltip="Número total de individuos en tu población ordenada. Por ejemplo: total de historias clínicas disponibles."/>
            )}
            {modo === "excel" && datosExcel && (
              <ExcelInfo rows={datosExcel.length} cols={Object.keys(datosExcel[0]).length}/>
            )}
            <FieldNum label={`Tamaño de la muestra (n)${modo==="excel"&&datosExcel?` — máx. ${datosExcel.length-1}`:""}`}
              value={n} onChange={v=>{setN_(v);setResult(null);}} placeholder="Ej: 210"
              hint="Número de sujetos a seleccionar"
              tooltip="Número de sujetos que deseas en tu muestra. El intervalo k se calcula automáticamente como k = floor(N/n)."/>
          </div>

          {/* Aviso de intervalo */}
          {k_preview !== null && !errorMsg && (
            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"11px 15px", marginBottom:16, fontSize:13, color:"#1e40af", display:"flex", gap:8, alignItems:"flex-start" }}>
              <span style={{ color:"#3b82f6", flexShrink:0, marginTop:1 }}><InfoIcon/></span>
              <span>El sistema seleccionará <b>1 sujeto de cada {k_preview}</b>. El punto de inicio (r) se elige al azar entre 1 y {k_preview}, luego se toman los sujetos en las posiciones r, r+{k_preview}, r+{k_preview*2}, …</span>
            </div>
          )}

          <div style={{ height:1, background:"#f3f4f6", margin:"4px 0 18px" }}/>
          <SectionLabel step="Paso 2" label="Opciones de presentación"/>

          <CheckToggle checked={ordenar} onChange={()=>setOrdenar(!ordenar)}
            label="Ordenar muestra por posición original"
            desc="Presenta los sujetos en el orden en que aparecían en la lista original (ascendente)"
            icon={<SortIcon/>}/>
        </div>

        {errorMsg && <ErrBanner msg={errorMsg}/>}

        {/* Botones */}
        <BotonesAccion canCalc={canCalc&&!errorMsg} loading={cargando}
          labelCalc={resultado ? "Regenerar muestra" : "Generar muestra sistemática"}
          onCalc={handleCalc} onReset={handleReset}/>

        {error && <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:11, padding:"11px 15px", marginTop:14, fontSize:13, color:"#dc2626" }}>❌ {error}</div>}

        {/* Resultado */}
        {resultado && (
          <div style={{ marginTop:28, animation:"slideUp .4s cubic-bezier(.16,1,.3,1)" }}>

            {/* Stats row */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:12 }}>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {[
                  { label:"Seleccionados",      val: resultado.muestra.length.toLocaleString(), col:"#10b981" },
                  { label:"Intervalo (k)",       val: resultado.intervalo,                       col:"#3b82f6" },
                  { label:"Inicio aleatorio (r)",val: resultado.inicio,                          col:"#8b5cf6" },
                  { label:"Fracción muestral",   val: (resultado.muestra.length/popTotal*100).toFixed(1)+"%", col: resultado.muestra.length/popTotal>0.1?"#d97706":"#059669" },
                ].map(s => (
                  <div key={s.label} style={{ background:"white", border:"1.5px solid #e5e7eb", borderRadius:11, padding:"10px 16px" }}>
                    <div style={{ fontSize:18, fontWeight:800, color:s.col, fontFamily:"'DM Mono',monospace" }}>{s.val}</div>
                    <div style={{ fontSize:11, color:"#9ca3af", fontWeight:600, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <BtnDescargar loading={descarga} onClick={handleDescargar}/>
            </div>

            {esGrande && <AvGrande n={resultado.muestra.length} preview={PREVIEW_MAX}/>}

            {/* Tabla */}
            <TablaResultado
              columnas={columnas} filasPag={filasPag} pagina={pagina} totalPags={totalPags}
              setPagina={setPagina} vistaData={vistaData} titulo="Muestra sistemática"
              badge={`k=${resultado.intervalo} · r=${resultado.inicio} · n=${resultado.muestra.length}`}
              esGrande={esGrande} total={resultado.muestra.length}/>

            {/* Interpretación */}
            <InterpBanner>
              Se aplicó muestreo sistemático regular sobre una población de <b>{popTotal.toLocaleString()}</b> sujetos.
              El intervalo calculado fue <b>k = {resultado.intervalo}</b> y el punto de inicio aleatorio fue <b>r = {resultado.inicio}</b>,
              resultando en <b>{resultado.muestra.length.toLocaleString()}</b> sujetos seleccionados en las posiciones {resultado.inicio}, {resultado.inicio + resultado.intervalo}, {resultado.inicio + resultado.intervalo*2}…
              {resultado.muestra.length/popTotal > 0.1 && <span style={{ color:"#d97706" }}> La fracción de muestreo supera el 10%, considera aplicar corrección por finitud.</span>}
            </InterpBanner>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SUB-COMPONENTES COMPARTIDOS
   ═══════════════════════════════════════════════════ */
export function SectionLabel({ step, label }: any) {
  return (
    <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#10b981", marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>
      <span style={{ width:18, height:2, background:"#10b981", borderRadius:2 }}/>
      {step} · {label}
    </div>
  );
}

export function FieldNum({ label, tooltip, value, onChange, placeholder, hint, disabled }: any) {
  const [focused, setF] = useState(false);
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
        <label style={{ fontSize:13, fontWeight:600, color: disabled?"#9ca3af":"#374151" }}>{label}</label>
        {tooltip && <Tooltip2 text={tooltip}><span style={{ color:"#9ca3af", display:"flex" }}><InfoIcon/></span></Tooltip2>}
      </div>
      <div style={{ display:"flex", alignItems:"center", border: focused?"2px solid #10b981":"2px solid #e5e7eb", borderRadius:10, background: disabled?"#f9fafb":"white", overflow:"hidden", transition:"all .2s", boxShadow: focused?"0 0 0 3px rgba(16,185,129,.1)":"none", opacity: disabled?0.6:1 }}>
        <input type="number" step="1" min="1" value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} placeholder={placeholder} disabled={disabled}
          style={{ flex:1, border:"none", outline:"none", padding:"11px 14px", fontSize:14, fontFamily:"'DM Sans',sans-serif", background:"transparent", color: disabled?"#9ca3af":"#111827" }}/>
      </div>
      {hint && <p style={{ fontSize:12, color:"#9ca3af", margin:"5px 0 0", lineHeight:1.4 }}>{hint}</p>}
    </div>
  );
}

export function Tooltip2({ children, text }: any) {
  const [show, setShow] = useState(false);
  return (
    <span onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} style={{ position:"relative", display:"inline-flex", cursor:"help" }}>
      {children}
      {show && (
        <span style={{ position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)", background:"#1f2937", color:"#f9fafb", fontSize:12, lineHeight:1.5, padding:"9px 13px", borderRadius:10, width:250, zIndex:300, boxShadow:"0 10px 30px rgba(0,0,0,.2)", pointerEvents:"none", fontWeight:400 }}>
          {text}<span style={{ position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"6px solid transparent", borderRight:"6px solid transparent", borderTop:"6px solid #1f2937" }}/>
        </span>
      )}
    </span>
  );
}

export function CheckToggle({ checked, onChange, label, desc, icon }: any) {
  return (
    <div onClick={onChange} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 15px", borderRadius:12, cursor:"pointer", border: checked?"2px solid #10b981":"2px solid #e5e7eb", background: checked?"#f0fdf4":"white", transition:"all .2s", marginBottom:16, userSelect:"none" }}>
      <div style={{ width:21, height:21, borderRadius:6, border: checked?"2px solid #10b981":"2px solid #d1d5db", background: checked?"#10b981":"white", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s", flexShrink:0 }}>
        {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {icon && <span style={{ color: checked?"#10b981":"#6b7280" }}>{icon}</span>}
        <div>
          <div style={{ fontSize:14, fontWeight:600, color: checked?"#065f46":"#374151" }}>{label}</div>
          {desc && <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{desc}</div>}
        </div>
      </div>
    </div>
  );
}

export function ModoSelector({ modo, setModo, datosExcel, loadingExcel, onSwitch }: any) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#6b7280", marginBottom:9 }}>Fuente de datos</div>
      <div style={{ display:"flex", gap:4, background:"#f3f4f6", borderRadius:12, padding:4 }}>
        {[{ id:"manual",icon:"✏️",label:"Entrada manual",desc:"Indica N y n directamente" },
          { id:"excel", icon:"📊",label:"Desde mi tabla", desc: loadingExcel?"Cargando datos...":datosExcel?`${datosExcel.length.toLocaleString()} filas cargadas`:"Sin datos cargados" }
        ].map(m => (
          <button key={m.id} onClick={()=>{ if(m.id==="excel"&&!datosExcel)return; setModo(m.id); onSwitch(); }}
            disabled={m.id==="excel"&&!datosExcel}
            style={{ flex:1, padding:"11px 14px", border:"none", borderRadius:9, cursor:m.id==="excel"&&!datosExcel?"not-allowed":"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .2s", background:modo===m.id?"white":"transparent", color:m.id==="excel"&&!datosExcel?"#d1d5db":modo===m.id?"#111827":"#6b7280", boxShadow:modo===m.id?"0 1px 3px rgba(0,0,0,.08)":"none", opacity:m.id==="excel"&&!datosExcel?0.6:1 }}>
            <span style={{ fontSize:16 }}>{m.icon}</span>
            <div style={{ textAlign:"left" }}>
              <div>{m.label}</div>
              <div style={{ fontSize:11, fontWeight:500, color:modo===m.id?"#6b7280":"#9ca3af", marginTop:1 }}>{m.desc}</div>
            </div>
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
  );
}

export function ExcelInfo({ rows, cols }: any) {
  return (
    <div style={{ background:"#f0fdf4", border:"1.5px solid #a7f3d0", borderRadius:12, padding:"14px 16px", marginBottom:4, display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ fontSize:22 }}>📊</div>
      <div>
        <div style={{ fontSize:14, fontWeight:700, color:"#065f46" }}>Tabla cargada correctamente</div>
        <div style={{ fontSize:13, color:"#059669", marginTop:2 }}><b>{rows.toLocaleString()}</b> filas · <b>{cols}</b> columnas</div>
      </div>
    </div>
  );
}

export function ErrBanner({ msg }: any) {
  return (
    <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:11, padding:"11px 15px", marginTop:14, fontSize:13, color:"#dc2626", fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
      ⚠️ {msg}
    </div>
  );
}

export function BotonesAccion({ canCalc, loading, labelCalc, onCalc, onReset }: any) {
  const Spinner = () => <span style={{ width:17, height:17, border:"3px solid rgba(255,255,255,.4)", borderTopColor:"white", borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }}/>;
  return (
    <div style={{ display:"flex", gap:10, marginTop:16 }}>
      <button onClick={onCalc} disabled={!canCalc||loading}
        style={{ flex:1, padding:"13px 20px", borderRadius:12, border:"none", cursor:canCalc&&!loading?"pointer":"not-allowed", fontSize:15, fontWeight:700, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:9, transition:"all .25s", background:canCalc?"linear-gradient(135deg,#10b981,#059669)":"#e5e7eb", color:canCalc?"white":"#9ca3af", boxShadow:canCalc?"0 4px 14px rgba(16,185,129,.3)":"none" }}
        onMouseDown={e=>{if(canCalc)e.currentTarget.style.transform="scale(0.98)"}} onMouseUp={e=>{e.currentTarget.style.transform="scale(1)"}}>
        {loading ? <><Spinner/> Generando...</> : <><CalcIcon/> {labelCalc}</>}
      </button>
      <button onClick={onReset} style={{ padding:"13px 18px", borderRadius:12, border:"2px solid #e5e7eb", cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit", background:"white", color:"#6b7280", display:"flex", alignItems:"center", gap:6 }}>
        <ResetIcon/> Limpiar
      </button>
    </div>
  );
}

export function BtnDescargar({ loading, onClick }: any) {
  const Spinner = () => <span style={{ width:14, height:14, border:"2px solid rgba(16,185,129,.3)", borderTopColor:"#10b981", borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }}/>;
  return (
    <button onClick={onClick} disabled={loading}
      style={{ padding:"11px 20px", borderRadius:12, border:"2px solid #10b981", cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit", background:loading?"#f0fdf4":"white", color:"#10b981", display:"flex", alignItems:"center", gap:8, transition:"all .2s", boxShadow:"0 2px 8px rgba(16,185,129,.12)" }}
      onMouseEnter={e=>{e.currentTarget.style.background="#ecfdf5"}} onMouseLeave={e=>{if(!loading)e.currentTarget.style.background="white"}}>
      {loading ? <><Spinner/> Descargando...</> : <><DownloadIcon/> Descargar Excel (.xlsx)</>}
    </button>
  );
}

export function AvGrande({ n, preview }: any) {
  return (
    <div style={{ background:"#fffbeb", border:"1.5px solid #fde68a", borderRadius:11, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"flex-start", gap:10, fontSize:13, color:"#92400e", lineHeight:1.5 }}>
      <span style={{ fontSize:18, flexShrink:0 }}>⚡</span>
      <div><b>Muestra grande ({n.toLocaleString()} filas)</b><br/>Se muestran las primeras <b>{preview.toLocaleString()}</b> filas. Descarga el Excel para los datos completos.</div>
    </div>
  );
}

export function TablaResultado({ columnas, filasPag, pagina, totalPags, setPagina, vistaData, titulo, badge, esGrande, total }: any) {
  function getPags(cur: number, tot: number) {
    if (tot <= 7) return Array.from({length:tot},(_,i)=>i+1);
    if (cur <= 4) return [1,2,3,4,5,"…",tot];
    if (cur >= tot-3) return [1,"…",tot-4,tot-3,tot-2,tot-1,tot];
    return [1,"…",cur-1,cur,cur+1,"…",tot];
  }
  return (
    <div style={{ background:"white", border:"2px solid #6ee7b7", borderRadius:16, overflow:"hidden" }}>
      <div style={{ background:"linear-gradient(135deg,#ecfdf5,#d1fae5)", padding:"16px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:"#059669" }}><TableIcon/></span>
          <span style={{ fontSize:14, fontWeight:700, color:"#065f46" }}>{titulo}</span>
          <span style={{ background:"white", color:"#10b981", fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20, border:"1px solid #a7f3d0" }}>{badge}</span>
        </div>
        <span style={{ fontSize:12, color:"#059669", fontWeight:600 }}>
          {esGrande ? `Mostrando 1–${Math.min(vistaData.length,PREVIEW_MAX).toLocaleString()} de ${total.toLocaleString()}` : `Página ${pagina} de ${totalPags}`}
        </span>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f9fafb" }}>
              {columnas.map((c: string) => (
                <th key={c} style={{ padding:"10px 18px", textAlign:"left", fontWeight:700, fontSize:11, color:"#6b7280", textTransform:"uppercase", letterSpacing:".05em", borderBottom:"1px solid #e5e7eb", whiteSpace:"nowrap" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filasPag.map((fila: any, i: number) => (
              <tr key={i} className="rh" style={{ background: i%2===0?"white":"#fafbfc", transition:"background .12s" }}>
                {columnas.map((c: string) => (
                  <td key={c} style={{ padding:"10px 18px", borderBottom:"1px solid #f3f4f6", color: c==="Orden selección"?"#10b981":c==="N°"||c==="Pos. en población"?"#065f46":"#374151", fontWeight: c==="Orden selección"||c==="N°"||c==="Pos. en población"?700:400, fontFamily: c==="Orden selección"||c==="N°"||c==="Pos. en población"?"'DM Mono',monospace":"inherit", whiteSpace:"nowrap" }}>
                    {fila[c]??"-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPags > 1 && (
        <div style={{ padding:"14px 22px", borderTop:"1px solid #f3f4f6", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <span style={{ fontSize:12, color:"#9ca3af" }}>Filas {((pagina-1)*FILAS_PAG+1).toLocaleString()}–{Math.min(pagina*FILAS_PAG,vistaData.length).toLocaleString()} de {vistaData.length.toLocaleString()}</span>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            {[["«",1],["‹","prev"]].map(([l,a])=><PBtn key={l} label={l} disabled={pagina===1} onClick={()=>setPagina(a==="prev"?(p: number)=>Math.max(1,p-1):1)}/>)}
            {getPags(pagina,totalPags).map((p,i)=> p==="…"
              ? <span key={`e${i}`} style={{ padding:"0 6px", color:"#9ca3af", fontSize:13 }}>…</span>
              : <button key={p as number} onClick={()=>setPagina(p as number)} style={{ width:34, height:34, border:"none", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", background:pagina===p?"#10b981":"#f3f4f6", color:pagina===p?"white":"#6b7280" }}>{p}</button>
            )}
            {[["›","next"],["»",totalPags]].map(([l,a])=><PBtn key={l} label={l} disabled={pagina===totalPags} onClick={()=>setPagina(a==="next"?(p: number)=>Math.min(totalPags,p+1):totalPags)}/>)}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:"#6b7280" }}>
            Ir a pág.
            <input type="number" min={1} max={totalPags} placeholder={String(pagina)}
              onKeyDown={e=>{ if(e.key==="Enter"){const v=parseInt((e.target as HTMLInputElement).value);if(v>=1&&v<=totalPags){setPagina(v);(e.target as HTMLInputElement).value=""}} }}
              style={{ width:54, padding:"5px 8px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:12, fontFamily:"inherit", outline:"none", textAlign:"center" }}/>
          </div>
        </div>
      )}
    </div>
  );
}

export function InterpBanner({ children }: any) {
  return (
    <div style={{ marginTop:18, background:"white", border:"1.5px solid #e5e7eb", borderRadius:14, padding:"16px 20px", display:"flex", gap:10 }}>
      <div style={{ width:26, height:26, borderRadius:8, background:"#10b981", display:"flex", alignItems:"center", justifyContent:"center", color:"white", flexShrink:0 }}><SparkleIcon/></div>
      <div style={{ fontSize:13, color:"#374151", lineHeight:1.65 }}><b style={{ color:"#065f46" }}>Interpretación:</b> {children}</div>
    </div>
  );
}

function PBtn({ label, disabled, onClick }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width:34, height:34, border:"1.5px solid #e5e7eb", borderRadius:8, cursor:disabled?"not-allowed":"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit", background:"white", color:disabled?"#d1d5db":"#6b7280", display:"flex", alignItems:"center", justifyContent:"center" }}>
      {label}
    </button>
  );
}
