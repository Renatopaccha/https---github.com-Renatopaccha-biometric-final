import React, { useState, useMemo } from "react";

/* ═══════════════════════════════════════════════════
   ALGORITMO — Fisher-Yates sin reemplazo
   ═══════════════════════════════════════════════════ */
function seleccionar(arr: any[], m: number) {
  const a = [...arr];
  for (let i = 0; i < Math.min(m, a.length); i++) {
    const j = i + Math.floor(Math.random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, m);
}

/* ═══════════════════════════════════════════════════
   EXPORT EXCEL
   ═══════════════════════════════════════════════════ */
async function exportarExcel(sheets: any[], nombre: string) {
  if (!(window as any).XLSX) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const wb = (window as any).XLSX.utils.book_new();
  sheets.forEach(({ nombre: n, datos }: any) => {
    const ws = (window as any).XLSX.utils.json_to_sheet(datos);
    (window as any).XLSX.utils.book_append_sheet(wb, ws, String(n).slice(0, 31));
  });
  (window as any).XLSX.writeFile(wb, `${nombre}.xlsx`);
}

/* ═══════════════════════════════════════════════════
   PALETA DE COLORES
   ═══════════════════════════════════════════════════ */
const PAL = [
  { bg:"#ecfdf5", brd:"#6ee7b7", txt:"#065f46", dot:"#10b981" },
  { bg:"#eff6ff", brd:"#93c5fd", txt:"#1e3a8a", dot:"#3b82f6" },
  { bg:"#fdf4ff", brd:"#d8b4fe", txt:"#581c87", dot:"#a855f7" },
  { bg:"#fff7ed", brd:"#fdba74", txt:"#7c2d12", dot:"#f97316" },
  { bg:"#fefce8", brd:"#fde047", txt:"#713f12", dot:"#eab308" },
  { bg:"#fdf2f8", brd:"#f9a8d4", txt:"#831843", dot:"#ec4899" },
  { bg:"#f0f9ff", brd:"#7dd3fc", txt:"#0c4a6e", dot:"#0ea5e9" },
  { bg:"#f0fdf4", brd:"#86efac", txt:"#14532d", dot:"#22c55e" },
];
const gc = (i: number) => PAL[i % PAL.length];

/* ═══════════════════════════════════════════════════
   ÍCONOS
   ═══════════════════════════════════════════════════ */
const Si = ({ d, w = 16 }: { d: string; w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: d }}/>
);
const BackIcon   = () => <Si w={15} d='<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>' />;
const DlIcon     = () => <Si d='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' />;
const RstIcon    = () => <Si w={15} d='<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>' />;
const SpkIcon    = () => <Si w={14} d='<path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/>' />;
const InfoIcon   = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>;
const CalcIcon   = () => <Si w={17} d='<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/>' />;
const AddIcon    = () => <Si w={15} d='<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' />;
const TrashIcon  = () => <Si w={15} d='<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>' />;
const UsersIcon  = () => <Si w={20} d='<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' />;
const SortIcon   = () => <Si w={14} d='<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><polyline points="3 6 4 7 6 4"/><polyline points="3 12 4 13 6 10"/><polyline points="3 18 4 19 6 16"/>' />;

const FILAS_PAG  = 50;
const PREV_MAX   = 2000;

interface Props {
  datosExcel?: any[] | null;
  loadingExcel?: boolean;
  onBack?: () => void;
}

export default function ConglomeradosMonoetapico({ datosExcel = null, loadingExcel = false, onBack }: Props) {
  const [modo,       setModo]    = useState("manual");
  const [tipoEnt,    setTipoEnt] = useState("individual");
  const [colId,      setColId]   = useState("");
  const [colNom,     setColNom]  = useState("");
  const [colTam,     setColTam]  = useState("");
  const [manList,    setManList] = useState([
    { nombre:"Escuela A",     N:"320" },
    { nombre:"Escuela B",     N:"280" },
    { nombre:"Escuela C",     N:"410" },
    { nombre:"Consultorio 1", N:"190" },
    { nombre:"Consultorio 2", N:"250" },
  ]);
  const [calcMode,   setCalcM]   = useState("m_conglos");
  const [valorM,     setValorM]  = useState("");
  const [valorN,     setValorN]  = useState("");
  const [ordenar,    setOrdenar] = useState(false);
  const [res,        setRes]     = useState<any>(null);
  const [tabAct,     setTab]     = useState("combinada");
  const [pags,       setPags]    = useState<any>({});
  const [loading,    setLoad]    = useState(false);
  const [descLoading,setDesc]    = useState(false);
  const [err,        setErr]     = useState("");

  const colsExcel = datosExcel && datosExcel.length > 0 ? Object.keys(datosExcel[0]) : [];

  const conglosExcel = useMemo(() => {
    if (!datosExcel || !datosExcel.length) return [];
    if (tipoEnt === "individual") {
      if (!colId) return [];
      const g: any = {};
      datosExcel.forEach(f => {
        const v = String(f[colId] ?? "Sin valor");
        if (!g[v]) g[v] = [];
        g[v].push(f);
      });
      return Object.entries(g)
        .sort(([a],[b]) => String(a).localeCompare(String(b), undefined, { numeric:true }))
        .map(([nombre, filas]: any) => ({ nombre, N: filas.length, filas }));
    } else {
      if (!colNom || !colTam) return [];
      return datosExcel
        .filter(f => f[colNom] !== undefined && f[colNom] !== "")
        .map(f => ({ nombre:String(f[colNom]), N:Math.max(1, parseInt(f[colTam])||1), filas:[f] }))
        .sort((a,b) => String(a.nombre).localeCompare(String(b.nombre), undefined, { numeric:true }));
    }
  }, [datosExcel, tipoEnt, colId, colNom, colTam]);

  const listaBase = modo === "manual"
    ? manList.map(c => ({ nombre:c.nombre, N:parseInt(c.N)||0, filas:[] }))
    : conglosExcel;

  const M         = listaBase.length;
  const totalPob  = listaBase.reduce((s,c) => s+c.N, 0);
  const promedio  = M > 0 ? Math.round(totalPob / M) : 0;
  const vm        = parseInt(valorM);
  const vn        = parseInt(valorN);

  const errMsg = useMemo(() => {
    if (M < 2) {
      if (modo === "manual") return "Define al menos 2 conglomerados.";
      const necesitaCol = (tipoEnt === "individual" && !colId) || (tipoEnt === "agregado" && (!colNom || !colTam));
      if (necesitaCol) return "";
      return "Se necesitan al menos 2 conglomerados.";
    }
    if (modo === "manual" && manList.some(c => !c.nombre.trim() || !parseInt(c.N) || parseInt(c.N) < 1))
      return "Todos los conglomerados necesitan nombre y tamaño >= 1.";
    if (calcMode === "m_conglos") {
      if (valorM === "") return "";
      if (isNaN(vm) || vm < 1) return "Selecciona al menos 1 conglomerado.";
      if (vm >= M) return `Debes seleccionar menos de ${M} (total disponible).`;
    }
    if (calcMode === "n_total") {
      if (valorN === "") return "";
      if (isNaN(vn) || vn < 1) return "El tamaño deseado debe ser al menos 1.";
      if (promedio > 0 && Math.ceil(vn/promedio) >= M) return `Para n=${vn} se necesitarían >=${M} conglos., reduce n.`;
    }
    return "";
  }, [M, modo, manList, calcMode, valorM, valorN, vm, vn, promedio, tipoEnt, colId, colNom, colTam]);

  const canCalc = !errMsg && M >= 2 &&
    (calcMode === "m_conglos" ? valorM !== "" && vm >= 1 && vm < M : valorN !== "" && vn >= 1) &&
    (modo === "manual"
      ? manList.every(c => c.nombre.trim() && parseInt(c.N) >= 1)
      : (tipoEnt === "individual" ? !!colId : (!!colNom && !!colTam)));

  const mPreview = calcMode === "n_total" && vn > 0 && promedio > 0
    ? Math.min(Math.ceil(vn/promedio), M-1) : null;

  const addC    = ()        => setManList(p => [...p, { nombre:`Conglomerado ${p.length+1}`, N:"" }]);
  const rmC     = (i: number) => { if (manList.length <= 2) return; setManList(p => p.filter((_,j) => j!==i)); };
  const updC    = (i: number, k: string, v: string) => { setManList(p => p.map((c,j) => j===i?{...c,[k]:v}:c)); setRes(null); };

  function handleCalc() {
    if (!canCalc || errMsg) return;
    setLoad(true); setErr(""); setPags({}); setTab("combinada");
    setTimeout(() => {
      try {
        const m_real = calcMode === "m_conglos" ? vm : Math.min(Math.ceil(vn/promedio), M-1);
        let sel = seleccionar(listaBase, m_real);
        if (ordenar) sel = [...sel].sort((a: any, b: any) => String(a.nombre).localeCompare(String(b.nombre), undefined, { numeric:true }));

        let gOrd = 1;
        const cogRes = sel.map((c: any, idx) => {
          let filas: any[];
          if (modo === "manual") {
            filas = Array.from({length:c.N}, (_,k) => ({ "N° global":gOrd+k, "Conglomerado":c.nombre, "N° en conglo.":k+1 }));
          } else if (tipoEnt === "individual") {
            filas = c.filas.map((f: any,k: number) => ({ "N° global":gOrd+k, "Conglomerado":c.nombre, ...f }));
          } else {
            filas = [{ "N° global":gOrd, "Conglomerado":c.nombre, "Tamaño (N_c)":c.N, ...c.filas[0] }];
          }
          gOrd += filas.length;
          return { nombre:c.nombre, N:c.N, filas, colorIdx:idx };
        });

        const completo = cogRes.flatMap((c: any) => c.filas);
        const totalN   = cogRes.reduce((s: number, c: any) => s+c.N, 0);
        const resumen  = [
          ...cogRes.map((c: any) => ({ "Conglomerado":c.nombre, "Individuos (N_c)":c.N, "% muestra":((c.N/totalN)*100).toFixed(1)+"%" })),
          { "Conglomerado":"TOTAL", "Individuos (N_c)":totalN, "% muestra":"100%" },
        ];

        setRes({ conglos:cogRes, completo, resumen, M, m:m_real, totalN, promedio, fracC:((m_real/M)*100).toFixed(1), calcMode, inputN:calcMode==="n_total"?vn:null });
      } catch(e: any) { setErr("Error al generar la muestra: "+e.message); }
      setLoad(false);
    }, 80);
  }

  function handleReset() { setValorM(""); setValorN(""); setRes(null); setPags({}); setTab("combinada"); setErr(""); }

  async function handleDesc() {
    if (!res) return;
    setDesc(true);
    try {
      await exportarExcel([
        { nombre:"Muestra completa", datos:res.completo },
        { nombre:"Resumen",          datos:res.resumen },
        ...res.conglos.map((c: any) => ({ nombre:c.nombre.slice(0,31), datos:c.filas })),
      ], `conglos_mono_m${res.m}_n${res.totalN}`);
    } catch(e) { setErr("No se pudo generar el archivo."); }
    setDesc(false);
  }

  const getPag = (id: string)    => pags[id] || 1;
  const setPag = (id: string, p: number | ((prev: number) => number)) => setPags((prev: any) => ({...prev,[id]:typeof p === 'function' ? p(prev[id] || 1) : p}));

  const datosTab = res
    ? tabAct==="combinada" ? res.completo
      : tabAct==="resumen"  ? res.resumen
      : res.conglos.find((c: any)=>c.nombre===tabAct)?.filas ?? []
    : [];
  const esGrande = datosTab.length > PREV_MAX;
  const vData    = esGrande ? datosTab.slice(0, PREV_MAX) : datosTab;
  const pagAct   = getPag(tabAct);
  const tPags    = Math.max(1, Math.ceil(vData.length/FILAS_PAG));
  const fPag     = vData.slice((pagAct-1)*FILAS_PAG, pagAct*FILAS_PAG);
  const cols     = vData.length > 0 ? Object.keys(vData[0]) : [];

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#fafbfc", minHeight:"100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .rh:hover{background:#ecfdf5!important}
        .tbtn:hover{opacity:.8}
        input[type=number],input[type=text]{outline:none;-moz-appearance:textfield}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
      `}</style>
      <div style={{ maxWidth:920, margin:"0 auto", padding:"28px 24px 60px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:22, fontSize:13, color:"#6b7280", fontWeight:500 }}>
          <span onClick={onBack} style={{ color:"#10b981", display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}><BackIcon/> Selección de Muestras</span>
          <span style={{ color:"#d1d5db" }}>/</span>
          <span style={{ color:"#374151", fontWeight:600 }}>Conglomerados Monoetápico</span>
        </div>
        <div style={{ display:"flex", alignItems:"flex-start", gap:15, marginBottom:6 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#fff7ed,#ffedd5)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:"#f97316" }}><UsersIcon/></div>
          <div>
            <h1 style={{ fontSize:23, fontWeight:800, margin:0, color:"#111827", letterSpacing:"-.02em" }}>Conglomerados Monoetápico</h1>
            <p style={{ fontSize:14, color:"#6b7280", margin:"4px 0 0", lineHeight:1.5 }}>Selección aleatoria de grupos completos · Todos los individuos del grupo seleccionado son incluidos</p>
          </div>
        </div>
        <div style={{ background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)", border:"1px solid #a7f3d0", borderRadius:12, padding:"11px 15px", margin:"16px 0 24px", display:"flex", alignItems:"center", gap:10, fontSize:13, color:"#065f46" }}>
          <div style={{ background:"#10b981", borderRadius:7, width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", color:"white", flexShrink:0 }}><SpkIcon/></div>
          <span><b>Asistente IA:</b> Usa este método cuando tengas grupos naturales (escuelas, barrios, consultorios) y no dispongas de un listado individual completo. Al seleccionar el grupo, incluyes a TODOS sus miembros. Considera el efecto de diseño (DEFF) al analizar los resultados.</span>
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#6b7280", marginBottom:9 }}>Fuente de datos</div>
          <div style={{ display:"flex", gap:4, background:"#f3f4f6", borderRadius:12, padding:4 }}>
            {[
              { id:"manual", icon:"✏️", label:"Definir manualmente",  desc:"Escribe nombre y tamaño de cada conglomerado" },
              { id:"excel",  icon:"📊", label:"Desde mi tabla Excel",  desc:loadingExcel?"Cargando datos...":datosExcel?`${datosExcel.length.toLocaleString()} filas`:"Sin tabla cargada" },
            ].map(m => (
              <button key={m.id}
                onClick={() => { if(m.id==="excel"&&!datosExcel)return; setModo(m.id); setRes(null); setErr(""); }}
                disabled={m.id==="excel"&&(!datosExcel || loadingExcel)}
                style={{ flex:1, padding:"11px 14px", border:"none", borderRadius:9, cursor:m.id==="excel"&&!datosExcel?"not-allowed":"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .2s", background:modo===m.id?"white":"transparent", color:m.id==="excel"&&!datosExcel?"#d1d5db":modo===m.id?"#111827":"#6b7280", boxShadow:modo===m.id?"0 1px 3px rgba(0,0,0,.08)":"none", opacity:m.id==="excel"&&!datosExcel?0.6:1 }}>
                <span style={{ fontSize:16 }}>{m.icon}</span>
                <div style={{ textAlign:"left" }}>
                  <div>{m.label}</div>
                  <div style={{ fontSize:11, fontWeight:500, color:modo===m.id?"#6b7280":"#9ca3af", marginTop:1 }}>{m.desc}</div>
                </div>
                {m.id==="excel"&&datosExcel&&!loadingExcel&&<span style={{ marginLeft:"auto", background:"#ecfdf5", color:"#059669", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20 }}>Listo</span>}
                {m.id==="excel"&&!datosExcel&&!loadingExcel&&<span style={{ marginLeft:"auto", background:"#f3f4f6", color:"#9ca3af", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20, whiteSpace:"nowrap" }}>Carga tabla</span>}
              </button>
            ))}
          </div>
        </div>
        <div style={{ background:"white", borderRadius:16, border:"1.5px solid #e5e7eb", padding:"24px 24px 14px", boxShadow:"0 1px 4px rgba(0,0,0,.03)" }}>
          {modo === "manual" && (
            <>
              <SLbl step="Paso 1" label="Define tus conglomerados"/>
              <p style={{ fontSize:13, color:"#6b7280", margin:"0 0 14px", lineHeight:1.5 }}>
                Introduce el nombre y el número de individuos (N_c) de cada conglomerado (escuela, barrio, consultorio, etc).
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"2.5fr 1fr auto", gap:8, marginBottom:8 }}>
                {["Nombre del conglomerado","Individuos (N_c)",""].map((h,i)=>(
                  <div key={i} style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".05em" }}>{h}</div>
                ))}
              </div>
              {manList.map((c, i) => {
                const col = gc(i);
                return (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"2.5fr 1fr auto", gap:8, marginBottom:8, alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, background:col.bg, border:`1.5px solid ${col.brd}`, borderRadius:10, padding:"3px 3px 3px 12px" }}>
                      <span style={{ width:8, height:8, borderRadius:"50%", background:col.dot, flexShrink:0 }}/>
                      <input type="text" value={c.nombre} onChange={e=>updC(i,"nombre",e.target.value)} style={{ flex:1, border:"none", background:"transparent", fontSize:13, fontWeight:600, color:col.txt, fontFamily:"'DM Sans',sans-serif", padding:"9px 4px" }}/>
                    </div>
                    <input type="number" value={c.N} onChange={e=>updC(i,"N",e.target.value)} placeholder="Ej: 150" min="1" style={{ border:"1.5px solid #e5e7eb", borderRadius:10, padding:"10px 12px", fontSize:13, fontFamily:"inherit", color:"#111827", width:"100%" }}/>
                    <button onClick={()=>rmC(i)} disabled={manList.length<=2} style={{ width:36, height:36, border:"1.5px solid #e5e7eb", borderRadius:9, cursor:manList.length<=2?"not-allowed":"pointer", background:"white", color:manList.length<=2?"#d1d5db":"#ef4444", display:"flex", alignItems:"center", justifyContent:"center" }}><TrashIcon/></button>
                  </div>
                );
              })}
              <button onClick={addC} style={{ marginTop:6, display:"flex", alignItems:"center", gap:7, padding:"9px 16px", border:"1.5px dashed #d1fae5", borderRadius:10, background:"#f9fafb", color:"#10b981", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }} onMouseEnter={e=>e.currentTarget.style.background="#ecfdf5"} onMouseLeave={e=>e.currentTarget.style.background="#f9fafb"}><AddIcon/> Agregar conglomerado</button>
              {M>=2 && manList.every(c=>c.N&&parseInt(c.N)>=1) && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginTop:18 }}><SMini label="Conglomerados (M)" val={M} color="#f97316"/><SMini label="Total individuos (N)" val={totalPob.toLocaleString()} color="#374151"/><SMini label="Promedio N_c" val={promedio.toLocaleString()} color="#6b7280"/></div>
              )}
            </>
          )}
          {modo === "excel" && (
            <>
              <SLbl step="Paso 1" label="Tipo de datos en tu tabla"/>
              <p style={{ fontSize:13, color:"#6b7280", margin:"0 0 14px", lineHeight:1.5 }}>
                Elige cómo están organizados los datos. Esto determina qué columnas debes seleccionar.
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                {[
                  { id:"individual", emoji:"👤", titulo:"Datos individuales", desc:"Cada fila es UNA PERSONA. El sistema agrupa automáticamente y cuenta cuántos hay en cada conglomerado.", ej:"Ej: columnas Paciente, Escuela, Edad → elige la columna 'Escuela'", col:{ bg:"#ecfdf5", brd:"#10b981", txt:"#065f46", dot:"#10b981" } },
                  { id:"agregado",   emoji:"🏘️", titulo:"Datos agregados", desc:"Cada fila es UN CONGLOMERADO ya resumido. Seleccionas la columna de nombre y la de tamaño.", ej:"Ej: columnas Escuela, TotalAlumnos → elige ambas", col:{ bg:"#fff7ed", brd:"#f97316", txt:"#7c2d12", dot:"#f97316" } },
                ].map((t: any) => (
                  <div key={t.id} onClick={()=>{ setTipoEnt(t.id); setColId(""); setColNom(""); setColTam(""); setRes(null); }} style={{ padding:16, borderRadius:14, cursor:"pointer", border:tipoEnt===t.id?`2px solid ${t.col.brd}`:"2px solid #e5e7eb", background:tipoEnt===t.id?t.col.bg:"white", transition:"all .2s", boxShadow:tipoEnt===t.id?`0 4px 12px ${t.col.dot}30`:"none" }}>
                    <div style={{ fontSize:22, marginBottom:8 }}>{t.emoji}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:tipoEnt===t.id?t.col.txt:"#374151", marginBottom:5 }}>{t.titulo}</div>
                    <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.5, marginBottom:8 }}>{t.desc}</div>
                    <div style={{ fontSize:11, color:tipoEnt===t.id?t.col.dot:"#9ca3af", fontStyle:"italic", lineHeight:1.4 }}>{t.ej}</div>
                    {tipoEnt===t.id&&<div style={{ marginTop:10, fontSize:11, fontWeight:700, color:t.col.dot, display:"flex", alignItems:"center", gap:4 }}><svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Seleccionado</div>}
                  </div>
                ))}
              </div>
              {tipoEnt === "individual" ? (
                <ColSel label="Columna que identifica el conglomerado" hint="El sistema agrupará las filas con el mismo valor y contará cuántas hay en cada grupo (N_c)" tooltip="Elige la columna que indica a qué conglomerado pertenece cada persona. Por ejemplo 'Escuela' o 'Barrio'." val={colId} cols={colsExcel} onChange={(v: string)=>{ setColId(v); setRes(null); }} placeholder="Ej: Escuela, Barrio…"/>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <ColSel label="Columna con el nombre" hint="Debe contener el nombre o ID único" tooltip="Cada fila es un conglomerado distinto." val={colNom} cols={colsExcel} onChange={(v: string)=>{ setColNom(v); setRes(null); }} placeholder="Ej: Escuela…"/>
                  <ColSel label="Columna con el tamaño (N_c)" hint="Número de individuos de cada conglomerado" tooltip="Valores numéricos de cantidad." val={colTam} cols={colsExcel.filter(c=>c!==colNom)} onChange={(v: string)=>{ setColTam(v); setRes(null); }} placeholder="Ej: TotalAlumnos…"/>
                </div>
              )}
              {conglosExcel.length > 0 && (
                <div style={{ marginTop:6, background:"#f9fafb", border:"1px solid #f3f4f6", borderRadius:13, padding:"16px 18px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexWrap:"wrap", gap:10 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#374151" }}>✅ {conglosExcel.length} conglomerado{conglosExcel.length!==1?"s":""} detectados</span>
                    <div style={{ display:"flex", gap:10 }}><SMini label="Total individuos" val={totalPob.toLocaleString()} color="#10b981"/><SMini label="Promedio N_c" val={promedio.toLocaleString()} color="#6b7280"/></div>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                    {conglosExcel.slice(0,10).map((c: any,i: number)=>{
                      const col=gc(i);
                      return <div key={c.nombre} style={{ background:col.bg, border:`1px solid ${col.brd}`, borderRadius:9, padding:"6px 11px", display:"flex", alignItems:"center", gap:7 }}><span style={{ width:7, height:7, borderRadius:"50%", background:col.dot, flexShrink:0 }}/><span style={{ fontSize:12, fontWeight:600, color:col.txt }}>{c.nombre}</span><span style={{ fontSize:11, color:col.dot, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{c.N.toLocaleString()}</span></div>;
                    })}
                    {conglosExcel.length>10&&<div style={{ background:"#f3f4f6", border:"1px solid #e5e7eb", borderRadius:9, padding:"6px 11px", fontSize:12, color:"#9ca3af", fontWeight:600 }}>+{conglosExcel.length-10} más</div>}
                  </div>
                </div>
              )}
            </>
          )}
          {M >= 2 && (
            <>
              <Divider/>
              <SLbl step="Paso 2" label="¿Qué deseas definir?"/>
              <p style={{ fontSize:13, color:"#6b7280", margin:"0 0 14px", lineHeight:1.5 }}>
                Elige <b>una sola opción</b>: puedes partir del número de conglomerados que quieres seleccionar, o del total de individuos deseado.
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
                {[
                  { id:"m_conglos", titulo:"Número de conglomerados (m)", desc:"Defines cuántos conglomerados seleccionar.", badge:"Más directo", bc:"#3b82f6", bb:"#eff6ff" },
                  { id:"n_total",   titulo:"Tamaño deseado (n)", desc:"Defines cuántos individuos quieres en total.", badge:"Parte del n", bc:"#a855f7", bb:"#fdf4ff" },
                ].map(opt => (
                  <div key={opt.id} onClick={()=>{ setCalcM(opt.id); setValorM(""); setValorN(""); setRes(null); }} style={{ padding:15, borderRadius:13, cursor:"pointer", border:calcMode===opt.id?"2px solid #10b981":"2px solid #e5e7eb", background:calcMode===opt.id?"#f0fdf4":"white", transition:"all .2s", boxShadow:calcMode===opt.id?"0 4px 12px rgba(16,185,129,.1)":"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}><div style={{ width:19, height:19, borderRadius:"50%", border:calcMode===opt.id?"6px solid #10b981":"2px solid #d1d5db", flexShrink:0, transition:"all .2s" }}/><span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20, background:opt.bb, color:opt.bc }}>{opt.badge}</span></div>
                    <div style={{ fontSize:14, fontWeight:700, color:calcMode===opt.id?"#065f46":"#374151", marginBottom:5 }}>{opt.titulo}</div>
                    <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.5 }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ maxWidth:400 }}>
                {calcMode === "m_conglos" ? (
                  <>
                    <FNum label={`Conglomerados a seleccionar (m) — de ${M}`} value={valorM} onChange={(v: string)=>{setValorM(v);setRes(null);}} placeholder={`Ej: ${Math.max(1,Math.floor(M/2))}`} hint={`Entre 1 y ${M-1} conglomerados`} tooltip={`Se elegirán m conglomerados al azar.`}/>
                    {valorM&&!errMsg&&vm>=1&&vm<M&&<div style={{ background:"#f0fdf4", border:"1px solid #a7f3d0", borderRadius:10, padding:"11px 14px", marginTop:-8, marginBottom:18, fontSize:13, color:"#065f46", display:"flex", alignItems:"center", gap:8 }}><InfoIcon/><span>n esperado ≈ <b>{(vm*promedio).toLocaleString()}</b></span></div>}
                  </>
                ) : (
                  <>
                    <FNum label="Tamaño total deseado (n)" value={valorN} onChange={(v: string)=>{setValorN(v);setRes(null);}} placeholder="Ej: 500" hint="Se calculará cuántos conglomerados seleccionar" tooltip={`m = ⌈n / Ñ_c⌉`}/>
                    {valorN&&!errMsg&&vn>=1&&mPreview!==null&&<div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"11px 14px", marginTop:-8, marginBottom:18, fontSize:13, color:"#1e3a8a", display:"flex", alignItems:"center", gap:8 }}><InfoIcon/><span>Se seleccionarán <b>{mPreview} conglomerado{mPreview!==1?"s":""}</b></span></div>}
                  </>
                )}
              </div>
              <Divider/>
              <SLbl step="Paso 3" label="Opciones"/>
              <div onClick={()=>setOrdenar(!ordenar)} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 15px", borderRadius:12, cursor:"pointer", border:ordenar?"2px solid #10b981":"2px solid #e5e7eb", background:ordenar?"#f0fdf4":"white", transition:"all .2s", userSelect:"none", maxWidth:500 }}><div style={{ width:21, height:21, borderRadius:6, border:ordenar?"2px solid #10b981":"2px solid #d1d5db", background:ordenar?"#10b981":"white", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s", flexShrink:0 }}>{ordenar&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</div><div style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ color:ordenar?"#10b981":"#6b7280" }}><SortIcon/></span><div><div style={{ fontSize:14, fontWeight:600, color:ordenar?"#065f46":"#374151" }}>Ordenar seleccionados</div><div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>Presenta en orden alfabético</div></div></div></div>
            </>
          )}
        </div>
        {errMsg && <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:11, padding:"11px 15px", marginTop:14, fontSize:13, color:"#dc2626", fontWeight:600 }}>⚠️ {errMsg}</div>}
        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          <button onClick={handleCalc} disabled={!canCalc||loading} style={{ flex:1, padding:"13px 20px", borderRadius:12, border:"none", cursor:canCalc&&!loading?"pointer":"not-allowed", fontSize:15, fontWeight:700, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:9, transition:"all .25s", background:canCalc?"linear-gradient(135deg,#10b981,#059669)":"#e5e7eb", color:canCalc?"white":"#9ca3af", boxShadow:canCalc?"0 4px 14px rgba(16,185,129,.3)":"none" }}>{loading?<><Spin/> Generando...</>:<><CalcIcon/> {res?"Regenerar muestra":"Generar muestra por conglomerados"}</>}</button>
          <button onClick={handleReset} style={{ padding:"13px 18px", borderRadius:12, border:"2px solid #e5e7eb", cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit", background:"white", color:"#6b7280", display:"flex", alignItems:"center", gap:6 }}><RstIcon/> Limpiar</button>
        </div>
        {err&&<div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:11, padding:"11px 15px", marginTop:14, fontSize:13, color:"#dc2626" }}>❌ {err}</div>}
        {res && (
          <div style={{ marginTop:28, animation:"slideUp .4s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:10, marginBottom:20 }}>
              <KPIc label="Conglos. seleccionados" val={`${res.m}/${res.M}`} color="#f97316" bg="#fff7ed" brd="#fdba74"/>
              <KPIc label="Individuos en muestra" val={res.totalN.toLocaleString()} color="#10b981" bg="#ecfdf5" brd="#6ee7b7"/>
              <KPIc label="% de conglomerados" val={`${res.fracC}%`} color={parseFloat(res.fracC)>50?"#d97706":"#059669"} bg="#f9fafb" brd="#e5e7eb"/>
              {res.inputN&&<KPIc label="n solicitado → obtenido" val={`${res.inputN}→${res.totalN}`} color="#8b5cf6" bg="#fdf4ff" brd="#d8b4fe"/>}
              {res.conglos.map((c: any,i: number)=>{const col=gc(i);return(
                <div key={c.nombre} style={{ background:col.bg, border:`1.5px solid ${col.brd}`, borderRadius:13, padding:"12px 14px" }}><div style={{ fontSize:10, fontWeight:700, color:col.dot, marginBottom:4, display:"flex", alignItems:"center", gap:4, textTransform:"uppercase", letterSpacing:".05em" }}><span style={{ width:6, height:6, borderRadius:"50%", background:col.dot }}/>{c.nombre.slice(0,18)}</div><div style={{ fontSize:18, fontWeight:800, color:col.txt, fontFamily:"'DM Mono',monospace" }}>{c.N.toLocaleString()}</div><div style={{ fontSize:10, color:col.dot, fontWeight:600, marginTop:2 }}>individuos</div></div>
              );})}
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:0, flexWrap:"wrap", gap:10 }}><span style={{ fontSize:14, fontWeight:700, color:"#374151" }}>Muestra generada</span><BtnDsc loading={descLoading} onClick={handleDesc}/></div>
            <div style={{ display:"flex", gap:3, overflowX:"auto", background:"#f3f4f6", borderRadius:"14px 14px 0 0", padding:"6px 6px 0", marginTop:14 }}>
              {[ { id:"resumen", lbl:"📊 Resumen", badge:res.conglos.length, isA:tabAct==="resumen" }, { id:"combinada", lbl:"🗂 Muestra completa", badge:res.totalN, isA:tabAct==="combinada" } ].map((t: any)=>(
                <button key={t.id} onClick={()=>setTab(t.id)} className="tbtn" style={{ padding:"9px 16px", border:"none", borderRadius:"9px 9px 0 0", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit", whiteSpace:"nowrap", transition:"all .2s", background:t.isA?"white":"transparent", color:t.isA?"#111827":"#6b7280" }}>{t.lbl} <span style={{ marginLeft:6, background:t.isA?"#ecfdf5":"#e5e7eb", color:t.isA?"#059669":"#9ca3af", fontSize:11, fontWeight:700, padding:"1px 8px", borderRadius:20 }}>{t.badge.toLocaleString()}</span></button>
              ))}
              {res.conglos.map((c: any,i: number)=>{const col=gc(i);const isA=tabAct===c.nombre;return(
                <button key={c.nombre} onClick={()=>setTab(c.nombre)} className="tbtn" style={{ padding:"9px 13px", border:"none", borderRadius:"9px 9px 0 0", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit", whiteSpace:"nowrap", transition:"all .2s", background:isA?"white":"transparent", color:isA?col.txt:"#6b7280" }}><span style={{ width:7, height:7, borderRadius:"50%", background:col.dot, display:"inline-block", marginRight:5 }}/>{c.nombre}<span style={{ marginLeft:5, background:isA?col.bg:"#e5e7eb", color:isA?col.txt:"#9ca3af", fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:20 }}>{c.N.toLocaleString()}</span></button>
              );})}
            </div>
            {esGrande&&<div style={{ background:"#fffbeb", border:"1.5px solid #fde68a", padding:"11px 18px", fontSize:13, color:"#92400e", display:"flex", gap:8 }}><span style={{ fontSize:18 }}>⚡</span><div><b>Datos grandes ({datosTab.length.toLocaleString()} filas)</b> · Mostrando primeras {PREV_MAX.toLocaleString()}. Descarga el Excel para ver todos.</div></div>}
            <div style={{ background:"white", border:"2px solid #6ee7b7", borderTop:"none", borderRadius:"0 0 14px 14px", overflow:"hidden" }}>
              {cols.length===0?( <div style={{ padding:"28px", textAlign:"center", color:"#9ca3af", fontSize:13 }}>Selecciona una pestaña</div> ):(
                <>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                      <thead><tr style={{ background:"#f9fafb" }}>{cols.map(c=><th key={c} style={{ padding:"10px 18px", textAlign:"left", fontWeight:700, fontSize:11, color:"#6b7280", textTransform:"uppercase", letterSpacing:".05em", borderBottom:"1px solid #e5e7eb", whiteSpace:"nowrap" }}>{c}</th>)}</tr></thead>
                      <tbody>
                        {fPag.map((fila: any,i: number)=>{
                          const ci=res.conglos.findIndex((c: any)=>c.nombre===fila["Conglomerado"]);
                          const col=ci>=0?gc(ci):null;
                          return(
                            <tr key={i} className="rh" style={{ background:i%2===0?"white":"#fafbfc", transition:"background .12s" }}>
                              {cols.map(c=>(
                                <td key={c} style={{ padding:"10px 18px", borderBottom:"1px solid #f3f4f6", whiteSpace:"nowrap", color:c==="N° global"?"#10b981":c==="Conglomerado"&&col?col.txt:"#374151", fontWeight:c==="N° global"?700:c==="Conglomerado"?600:400, fontFamily:c==="N° global"||c==="N° en conglo."?"'DM Mono',monospace":"inherit" }}>
                                  {c==="Conglomerado"&&col?<span style={{ display:"inline-flex", alignItems:"center", gap:5, background:col.bg, padding:"2px 9px", borderRadius:20, border:`1px solid ${col.brd}` }}><span style={{ width:6, height:6, borderRadius:"50%", background:col.dot }}/>{fila[c]}</span>:fila[c]??"—"}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {tPags>1&&<PaginComp pagina={pagAct} totalPags={tPags} setPagina={(p: number)=>setPag(tabAct,p)} vData={vData}/>}
                </>
              )}
            </div>
            <div style={{ marginTop:18, background:"white", border:"1.5px solid #e5e7eb", borderRadius:14, padding:"16px 20px", display:"flex", gap:10 }}><div style={{ width:26, height:26, borderRadius:8, background:"#10b981", display:"flex", alignItems:"center", justifyContent:"center", color:"white", flexShrink:0 }}><SpkIcon/></div><div style={{ fontSize:13, color:"#374151", lineHeight:1.65 }}><b style={{ color:"#065f46" }}>Interpretación:</b> {res.calcMode==="m_conglos"?`Se seleccionaron aleatoriamente ${res.m} conglomerados de ${res.M} disponibles (${res.fracC}% de los grupos).`:`Para obtener n≈${res.inputN} individuos se calculó m=⌈${res.inputN}/${res.promedio}⌉=${res.m} conglomerados.`} La muestra incluye <b>{res.totalN.toLocaleString()} individuos</b>.<span style={{ color:"#d97706" }}> Calcula el DEFF antes de estimar varianzas.</span></div></div>
          </div>
        )}
      </div>
    </div>
  );
}

function SLbl({ step, label }: any) { return <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#10b981", marginBottom:14, display:"flex", alignItems:"center", gap:6 }}><span style={{ width:18, height:2, background:"#10b981", borderRadius:2 }}/>{step} · {label}</div>; }
function Divider() { return <div style={{ height:1, background:"#f3f4f6", margin:"4px 0 20px" }}/>; }
function ColSel({ label, hint, tooltip, val, cols, onChange, placeholder }: any) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}><label style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{label}</label>{tooltip&&<TT text={tooltip}><span style={{ color:"#9ca3af", display:"flex" }}><InfoIcon/></span></TT>}</div>
      <div style={{ position:"relative" }}>
        <select value={val} onChange={e=>onChange(e.target.value)} style={{ width:"100%", padding:"11px 36px 11px 14px", border:`2px solid ${val?"#10b981":"#e5e7eb"}`, borderRadius:10, fontSize:14, fontFamily:"inherit", appearance:"none", outline:"none", color:val?"#111827":"#9ca3af", cursor:"pointer", background:val?"#f0fdf4":"white", transition:"all .2s", boxShadow:val?"0 0 0 3px rgba(16,185,129,.08)":"none" }}><option value="">{placeholder||"Seleccionar columna…"}</option>{cols.map((c: string)=><option key={c} value={c}>{c}</option>)}</select>
        <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:val?"#10b981":"#9ca3af", pointerEvents:"none" }}>▾</span>
      </div>
      {hint&&<p style={{ fontSize:12, color:"#9ca3af", margin:"5px 0 0" }}>{hint}</p>}
    </div>
  );
}
function FNum({ label, tooltip, value, onChange, placeholder, hint }: any) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}><label style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{label}</label>{tooltip&&<TT text={tooltip}><span style={{ color:"#9ca3af", display:"flex" }}><InfoIcon/></span></TT>}</div>
      <div style={{ display:"flex", alignItems:"center", border:f?"2px solid #10b981":"2px solid #e5e7eb", borderRadius:10, background:"white", overflow:"hidden", transition:"all .2s", boxShadow:f?"0 0 0 3px rgba(16,185,129,.1)":"none" }}><input type="number" step="1" min="1" value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} placeholder={placeholder} style={{ flex:1, border:"none", outline:"none", padding:"11px 14px", fontSize:14, fontFamily:"'DM Sans',sans-serif", background:"transparent", color:"#111827" }}/></div>
      {hint&&<p style={{ fontSize:12, color:"#9ca3af", margin:"5px 0 0", lineHeight:1.4 }}>{hint}</p>}
    </div>
  );
}
function TT({ children, text }: any) {
  const [s, setS] = useState(false);
  return <span onMouseEnter={()=>setS(true)} onMouseLeave={()=>setS(false)} style={{ position:"relative", display:"inline-flex", cursor:"help" }}>{children}{s&&<span style={{ position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)", background:"#1f2937", color:"#f9fafb", fontSize:12, lineHeight:1.5, padding:"9px 13px", borderRadius:10, width:250, zIndex:300, pointerEvents:"none", fontWeight:400 }}>{text}<span style={{ position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"6px solid transparent", borderRight:"6px solid transparent", borderTop:"6px solid #1f2937" }}/></span>}</span>;
}
function SMini({ label, val, color }: any) { return <div style={{ background:"white", border:"1.5px solid #e5e7eb", borderRadius:11, padding:"10px 14px" }}><div style={{ fontSize:16, fontWeight:800, color, fontFamily:"'DM Mono',monospace" }}>{val}</div><div style={{ fontSize:11, color:"#9ca3af", fontWeight:600, marginTop:2 }}>{label}</div></div>; }
function KPIc({ label, val, color, bg, brd }: any) { return <div style={{ background:bg, border:`1.5px solid ${brd}`, borderRadius:13, padding:"12px 15px" }}><div style={{ fontSize:18, fontWeight:800, color, fontFamily:"'DM Mono',monospace" }}>{val}</div><div style={{ fontSize:11, color:"#9ca3af", fontWeight:600, marginTop:3 }}>{label}</div></div>; }
function BtnDsc({ loading, onClick }: any) {
  return <button onClick={onClick} disabled={loading} style={{ padding:"11px 20px", borderRadius:12, border:"2px solid #10b981", cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit", background:loading?"#f0fdf4":"white", color:"#10b981", display:"flex", alignItems:"center", gap:8, boxShadow:"0 2px 8px rgba(16,185,129,.12)", transition:"all .2s" }} onMouseEnter={e=>e.currentTarget.style.background="#ecfdf5"} onMouseLeave={e=>{if(!loading)e.currentTarget.style.background="white"}}>{loading?<><Spin sm/> Descargando...</>:<><DlIcon/> Descargar Excel</>}</button>;
}
function Spin({ sm }: any) { const s=sm?14:17; return <span style={{ width:s, height:s, border:`${sm?2:3}px solid rgba(16,185,129,.3)`, borderTopColor:"#10b981", borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }}/>; }
function PaginComp({ pagina, totalPags, setPagina, vData }: any) {
  function gP(c: number,t: number){if(t<=7)return Array.from({length:t},(_,i)=>i+1);if(c<=4)return[1,2,3,4,5,"…",t];if(c>=t-3)return[1,"…",t-4,t-3,t-2,t-1,t];return[1,"…",c-1,c,c+1,"…",t];}
  const PB=({l,d,f}: any)=><button onClick={f} disabled={d} style={{ width:34,height:34,border:"1.5px solid #e5e7eb",borderRadius:8,cursor:d?"not-allowed":"pointer",fontSize:13,fontWeight:600,background:"white",color:d?"#d1d5db":"#6b7280",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit" }}>{l}</button>;
  return(
    <div style={{ padding:"14px 22px",borderTop:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10 }}><span style={{ fontSize:12,color:"#9ca3af" }}>Filas {(pagina-1)*FILAS_PAG+1}–{Math.min(pagina*FILAS_PAG,vData.length)} de {vData.length.toLocaleString()}</span><div style={{ display:"flex",alignItems:"center",gap:4 }}><PB l="«" d={pagina===1} f={()=>setPagina(1)}/><PB l="‹" d={pagina===1} f={()=>setPagina((p: number)=>Math.max(1,p-1))}/>{gP(pagina,totalPags).map((p: any,i: number)=>p==="…"?<span key={`e${i}`} style={{ padding:"0 6px",color:"#9ca3af" }}>…</span>:<button key={p} onClick={()=>setPagina(p)} style={{ width:34,height:34,border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",background:pagina===p?"#10b981":"#f3f4f6",color:pagina===p?"white":"#6b7280" }}>{p}</button>)}<PB l="›" d={pagina===totalPags} f={()=>setPagina((p: number)=>Math.min(totalPags,p+1))}/><PB l="»" d={pagina===totalPags} f={()=>setPagina(totalPags)}/></div></div>
  );
}
