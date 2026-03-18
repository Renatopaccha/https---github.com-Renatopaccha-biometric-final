import React, { useState, useMemo } from "react";

function muestraAleatoria(arr: any[], n: number) {
  const a = [...arr];
  const r = [];
  for (let i = 0; i < Math.min(n, a.length); i++) {
    const j = i + Math.floor(Math.random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
    r.push(a[i]);
  }
  return r;
}

function asignacionProporcional(estratos: any[], nTotal: number) {
  const N = estratos.reduce((s, e) => s + e.Nh, 0);
  const raw = estratos.map(e => ({ ...e, nh: nTotal * e.Nh / N }));
  let asig = raw.map(e => ({ ...e, nh: Math.floor(e.nh) }));
  const resto = nTotal - asig.reduce((s, e) => s + e.nh, 0);
  const res = raw.map((e, i) => ({ i, r: e.nh - Math.floor(e.nh) })).sort((a, b) => b.r - a.r);
  for (let i = 0; i < resto; i++) asig[res[i].i].nh++;
  return asig;
}

function asignacionIgual(estratos: any[], nTotal: number) {
  const H = estratos.length;
  const base = Math.floor(nTotal / H);
  const extra = nTotal - base * H;
  return estratos.map((e, i) => ({ ...e, nh: base + (i < extra ? 1 : 0) }));
}

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
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datos);
  XLSX.utils.book_append_sheet(wb, ws, "Muestra Estratificada".slice(0, 31));
  XLSX.writeFile(wb, `${nombre}.xlsx`);
}

const COLS = [
  { bg:"#ecfdf5", brd:"#6ee7b7", txt:"#065f46", dot:"#10b981" },
  { bg:"#eff6ff", brd:"#93c5fd", txt:"#1e3a8a", dot:"#3b82f6" },
  { bg:"#fdf4ff", brd:"#d8b4fe", txt:"#581c87", dot:"#a855f7" },
  { bg:"#fff7ed", brd:"#fdba74", txt:"#7c2d12", dot:"#f97316" },
  { bg:"#fefce8", brd:"#fde047", txt:"#713f12", dot:"#eab308" },
  { bg:"#fdf2f8", brd:"#f9a8d4", txt:"#831843", dot:"#ec4899" },
  { bg:"#f0f9ff", brd:"#7dd3fc", txt:"#0c4a6e", dot:"#0ea5e9" },
  { bg:"#f0fdf4", brd:"#86efac", txt:"#14532d", dot:"#22c55e" },
];
const ce = (i: number) => COLS[i % COLS.length];

const Svg = ({ d, w = 16 }: any) => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }}/>;
const BackIcon    = () => <Svg w={15} d='<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>' />;
const DlIcon      = () => <Svg d='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' />;
const RstIcon     = () => <Svg w={15} d='<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>' />;
const SpkIcon     = () => <Svg w={14} d='<path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/>' />;
const InfoIcon    = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>;
const CalcIcon    = () => <Svg w={17} d='<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/>' />;
const AddIcon     = () => <Svg w={15} d='<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' />;
const TrashIcon   = () => <Svg w={15} d='<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>' />;
const LockIcon    = () => <Svg w={13} d='<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' />;
const LayersIcon  = () => <Svg w={20} d='<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>' />;

const FILAS_PAG  = 50;
const PREV_MAX   = 2000;

interface Props {
  datosExcel?: any[] | null;
  loadingExcel?: boolean;
  onBack?: () => void;
}

export default function MuestreoEstratificado({ datosExcel = null, loadingExcel = false, onBack }: Props) {
  const [modo,      setModo]    = useState("manual");      // "manual" | "excel"
  const [tipoEnt,   setTipoEnt] = useState("individual");  // "individual" | "agregado"
  const [colId,     setColId]   = useState(""); // individual: col estrato
  const [colNom,    setColNom]  = useState(""); // agregado: col nombre
  const [colTam,    setColTam]  = useState(""); // agregado: col tamaño Nh
  const [estMan,    setEstMan]  = useState<any>([
    { nombre:"Estrato 1", Nh:"", nh_manual:"" },
    { nombre:"Estrato 2", Nh:"", nh_manual:"" },
  ]);
  const [asignacion, setAsign]  = useState("proporcional"); // "proporcional"|"igual"|"manual"
  const [nTotal,     setNTotal] = useState("");
  const [nhExcel,    setNhExcel] = useState<any>({}); // { [nombreEstrato]: nh }
  const [ordenar,    setOrdenar] = useState(false);
  const [res,        setRes]     = useState<any>(null);
  const [tabAct,     setTab]     = useState("combinada");
  const [pags,       setPags]    = useState<any>({});
  const [loading,    setLoad]    = useState(false);
  const [descLoading,setDesc]    = useState(false);
  const [err,        setErr]     = useState("");

  const colsExcel = datosExcel && datosExcel.length > 0 ? Object.keys(datosExcel[0]) : [];

  const estratosExcel = useMemo(() => {
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
        .sort(([a],[b]) => String(a).localeCompare(String(b)))
        .map(([nombre, filas]: [string, any]) => ({ nombre, Nh: filas.length, filas }));
    } else {
      if (!colNom || !colTam) return [];
      return datosExcel
        .filter(f => f[colNom] !== undefined && f[colNom] !== "")
        .map(f => ({ nombre:String(f[colNom]), Nh:Math.max(1, parseInt(f[colTam])||1), filas:[f] }))
        .sort((a,b) => String(a.nombre).localeCompare(String(b.nombre)));
    }
  }, [datosExcel, tipoEnt, colId, colNom, colTam]);

  const listaBase = modo === "manual"
    ? estMan.map((e:any,i:number) => ({ nombre:e.nombre||`Estrato ${i+1}`, Nh:parseInt(e.Nh)||0, filas:[], nh_manual:parseInt(e.nh_manual)||0 }))
    : estratosExcel.map((e:any) => ({ ...e, nh_manual: parseInt(nhExcel[e.nombre])||0 }));

  const totalNh = listaBase.reduce((s:number,e:any) => s+e.Nh, 0);
  const numEstr = listaBase.length;

  const errMsg = useMemo(() => {
    if (modo === "manual") {
      if (estMan.some((e:any) => e.nombre.trim()==="" || !parseInt(e.Nh) || parseInt(e.Nh)<1))
        return "Todos los estratos necesitan nombre y Nh ≥ 1.";
      if (asignacion !== "manual") {
        if (nTotal === "") return "";
        const vn = parseInt(nTotal);
        if (isNaN(vn) || vn < 1) return "El n total debe ser ≥ 1.";
        if (vn > totalNh) return `La muestra (${vn}) supera la población total (${totalNh}).`;
      } else {
        const sum = estMan.reduce((s:number,e:any)=>s+(parseInt(e.nh_manual)||0),0);
        if (sum === 0) return "Define el nh en al menos un estrato.";
      }
    }
    if (modo === "excel") {
      if (!datosExcel) return "";
      const necesitaCol = tipoEnt==="individual" ? !colId : !colNom||!colTam;
      if (necesitaCol) return "";
      if (estratosExcel.length < 2) return "Se necesitan al menos 2 estratos.";
      if (asignacion !== "manual") {
        if (nTotal === "") return "";
        const vn = parseInt(nTotal);
        if (isNaN(vn)||vn<1) return "El n total debe ser ≥ 1.";
        if (vn >= datosExcel.length) return `La muestra (${vn}) debe ser < ${datosExcel.length}.`;
      } else {
        const sum = estratosExcel.reduce((s:number,e:any)=>s+(parseInt(nhExcel[e.nombre])||0),0);
        if (sum === 0) return "Define el nh en al menos un estrato.";
      }
    }
    return "";
  }, [modo, estMan, asignacion, nTotal, totalNh, datosExcel, tipoEnt, colId, colNom, colTam, estratosExcel, nhExcel]);

  const canCalc = !errMsg && numEstr >= 2 && (
    modo === "manual"
      ? estMan.every((e:any) => e.Nh!==""&&parseInt(e.Nh)>=1) && (asignacion!=="manual" ? nTotal!=="": estMan.some((e:any)=>parseInt(e.nh_manual)>0))
      : (tipoEnt==="individual"?!!colId:(!!colNom&&!!colTam)) && (asignacion!=="manual" ? nTotal!=="": estratosExcel.some((e:any)=>parseInt(nhExcel[e.nombre])>0))
  );

  const addE    = () => setEstMan((p:any)=>[...p,{nombre:`Estrato ${p.length+1}`,Nh:"",nh_manual:""}]);
  const rmE     = (i:number) => { if(estMan.length<=2)return; setEstMan((p:any)=>p.filter((_:any,j:number)=>j!==i)); };
  const updE    = (i:number,k:string,v:any) => { setEstMan((p:any)=>p.map((e:any,j:number)=>j===i?{...e,[k]:v}:e)); setRes(null); };

  function buildFilasManual(Nh:number) {
    return Array.from({length:Nh}, (_,j)=>({ "N°":j+1 }));
  }

  function handleCalc() {
    if (!canCalc||errMsg) return;
    setLoad(true); setErr(""); setPags({}); setTab("combinada");
    setTimeout(() => {
      try {
        const vn = parseInt(nTotal)||0;
        let base;
        if (modo === "manual") {
          base = listaBase.map((e:any) => ({ ...e, filas:buildFilasManual(e.Nh) }));
        } else {
          base = listaBase;
        }

        let asig;
        if (asignacion === "proporcional") asig = asignacionProporcional(base, vn);
        else if (asignacion === "igual")   asig = asignacionIgual(base, vn);
        else                               asig = base.map((e:any)=>({...e,nh:e.nh_manual}));

        let ordGlobal = 1;
        const estRes = asig.map((e:any, idx:number) => {
          let muestra = muestraAleatoria(e.filas, e.nh);
          if (ordenar) {
            if (modo === "manual") muestra.sort((a:any,b:any) => a["N°"]-b["N°"]);
            else {
              const col1 = Object.keys(muestra[0]||{})[0];
              muestra.sort((a:any,b:any) => {
                const va=parseFloat(a[col1]),vb=parseFloat(b[col1]);
                return isNaN(va)||isNaN(vb)?String(a[col1]).localeCompare(String(b[col1])):va-vb;
              });
            }
          }
          const prob = e.Nh > 0 ? (e.nh / e.Nh).toFixed(5).replace(".", ",") : "0,00000";
          const pond = e.nh > 0 ? (e.Nh / e.nh).toFixed(2).replace(".", ",") : "0,00";
          
          const filas = muestra.map(fila => ({ "Orden global": ordGlobal++, "Estrato": e.nombre, ...fila, "Probabilidad": prob, "PONDERACIÓN": pond }));
          return { nombre:e.nombre, Nh:e.Nh, nh:e.nh, pct:((e.nh/e.Nh)*100).toFixed(1), filas, color:idx };
        });

        const completo = estRes.flatMap((e:any)=>e.filas);
        const resumen  = [
          ...estRes.map((e:any)=>({ "Estrato":e.nombre, "Pob. estrato (Nh)":e.Nh, "Muestra (nh)":e.nh, "Fracción (%)":e.pct })),
          { "Estrato":"TOTAL", "Pob. estrato (Nh)":totalNh, "Muestra (nh)":completo.length, "Fracción (%)":`${((completo.length/totalNh)*100).toFixed(1)}` },
        ];
        setRes({ estratos:estRes, completo, resumen, nTotal:completo.length, asignacion });
      } catch(e:any) { setErr("Error al generar: "+e.message); }
      setLoad(false);
    }, 80);
  }

  function handleReset() {
    setNTotal(""); setRes(null); setPags({}); setTab("combinada"); setErr("");
    setEstMan([{nombre:"Estrato 1",Nh:"",nh_manual:""},{nombre:"Estrato 2",Nh:"",nh_manual:""}]);
    setNhExcel({});
  }

  async function handleDesc() {
    if (!res) return;
    setDesc(true);
    try {
      await exportarExcel(res.completo, `estrat_n${res.nTotal}`);
    } catch(e) { setErr("No se pudo generar el archivo."); }
    setDesc(false);
  }

  const getPag = (id:string) => pags[id]||1;
  const setPag = (id:string,p:any) => setPags((prev:any)=>({...prev,[id]:typeof p==="function"?p(prev[id]||1):p}));

  const datosTab = res ? (tabAct==="combinada" ? res.completo : res.estratos.find((e:any)=>e.nombre===tabAct)?.filas ?? []) : [];
  const esGrande = datosTab.length > PREV_MAX;
  const vData    = esGrande ? datosTab.slice(0,PREV_MAX) : datosTab;
  const pagAct   = getPag(tabAct);
  const tPags    = Math.max(1,Math.ceil(vData.length/FILAS_PAG));
  const fPag     = vData.slice((pagAct-1)*FILAS_PAG, pagAct*FILAS_PAG);
  const cols     = vData.length>0 ? Object.keys(vData[0]) : [];

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
          <span style={{ color:"#d1d5db" }}>/</span><span style={{ color:"#374151", fontWeight:600 }}>Muestreo Aleatorio Estratificado</span>
        </div>
        <div style={{ display:"flex", alignItems:"flex-start", gap:15, marginBottom:6 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#fdf4ff,#f3e8ff)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:"#a855f7" }}><LayersIcon/></div>
          <div>
            <h1 style={{ fontSize:23, fontWeight:800, margin:0, color:"#111827", letterSpacing:"-.02em" }}>Muestreo Aleatorio Estratificado</h1>
            <p style={{ fontSize:14, color:"#6b7280", margin:"4px 0 0", lineHeight:1.5 }}>Divide la población en estratos y selecciona aleatoriamente dentro de cada uno</p>
          </div>
        </div>
        <div style={{ background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)", border:"1px solid #a7f3d0", borderRadius:12, padding:"11px 15px", margin:"16px 0 24px", display:"flex", alignItems:"center", gap:10, fontSize:13, color:"#065f46" }}>
          <div style={{ background:"#10b981", borderRadius:7, width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", color:"white", flexShrink:0 }}><SpkIcon/></div>
          <span><b>Asistente IA:</b> Usa este método cuando tu población tenga subgrupos con características distintas (edad, sexo, región). Garantiza representación de todos los grupos. La asignación proporcional es la más recomendada para estudios descriptivos.</span>
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#6b7280", marginBottom:9 }}>Fuente de datos</div>
          <div style={{ display:"flex", gap:4, background:"#f3f4f6", borderRadius:12, padding:4 }}>
            {[
              { id:"manual", icon:"✏️", label:"Definir manualmente", desc:"Nombra tus estratos y define Nh" },
              { id:"excel", icon:"📊", label:"Desde mi tabla Excel", desc: loadingExcel ? "Cargando datos..." : datosExcel?`${datosExcel.length.toLocaleString()} filas cargadas`:"Sin tabla cargada" },
            ].map(m => (
              <button key={m.id} onClick={()=>{ if(m.id==="excel"&&!datosExcel)return; setModo(m.id); setRes(null); setErr(""); }} disabled={m.id==="excel"&&!datosExcel} style={{ flex:1, padding:"11px 14px", border:"none", borderRadius:9, cursor:m.id==="excel"&&!datosExcel?"not-allowed":"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .2s", background:modo===m.id?"white":"transparent", color:m.id==="excel"&&!datosExcel?"#d1d5db":modo===m.id?"#111827":"#6b7280", boxShadow:modo===m.id?"0 1px 3px rgba(0,0,0,.08)":"none", opacity:m.id==="excel"&&!datosExcel?0.6:1 }}>
                <span style={{ fontSize:16 }}>{m.icon}</span>
                <div style={{ textAlign:"left" }}><div>{m.label}</div><div style={{ fontSize:11, fontWeight:500, color:modo===m.id?"#6b7280":"#9ca3af", marginTop:1 }}>{m.desc}</div></div>
                {m.id==="excel"&&loadingExcel&&<span style={{ marginLeft:"auto", background:"#fef3c7", color:"#b45309", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20 }}>Cargando...</span>}
                {m.id==="excel"&&!loadingExcel&&datosExcel&&<span style={{ marginLeft:"auto", background:"#ecfdf5", color:"#059669", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20 }}>Listo</span>}
                {m.id==="excel"&&!loadingExcel&&!datosExcel&&<span style={{ marginLeft:"auto", background:"#f3f4f6", color:"#9ca3af", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20, whiteSpace:"nowrap" }}>Carga tabla</span>}
              </button>
            ))}
          </div>
        </div>
        <div style={{ background:"white", borderRadius:16, border:"1.5px solid #e5e7eb", padding:"24px 24px 14px", boxShadow:"0 1px 4px rgba(0,0,0,.03)" }}>
          <SLbl step="Paso 1" label={modo==="manual"?"Definición de estratos":"Tipo de datos y columnas"}/>
          {modo === "manual" && (
            <div style={{ marginBottom:18 }}>
              <p style={{ fontSize:13, color:"#6b7280", margin:"0 0 14px", lineHeight:1.5 }}>Define cada estrato con su nombre y tamaño de población (Nh).</p>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr auto", gap:8, marginBottom:8 }}>{["Nombre del estrato","Pob. estrato (Nh)","Muestra (nh) *",""].map((h,i)=>(<div key={i} style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".05em" }}>{h}</div>))}</div>
              {estMan.map((e:any,i:number)=>{
                const c=ce(i);
                return(
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr auto", gap:8, marginBottom:8, alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, background:c.bg, border:`1.5px solid ${c.brd}`, borderRadius:10, padding:"3px 3px 3px 10px" }}><span style={{ width:8, height:8, borderRadius:"50%", background:c.dot, flexShrink:0 }}/><input type="text" value={e.nombre} onChange={ev=>updE(i,"nombre",ev.target.value)} style={{ flex:1, border:"none", background:"transparent", fontSize:13, fontWeight:600, color:c.txt, fontFamily:"'DM Sans',sans-serif", padding:"8px 4px" }}/></div>
                    <input type="number" value={e.Nh} onChange={ev=>updE(i,"Nh",ev.target.value)} placeholder="Ej: 500" min="1" style={{ border:"1.5px solid #e5e7eb", borderRadius:10, padding:"10px 12px", fontSize:13, fontFamily:"inherit", color:"#111827", width:"100%" }}/>
                    <input type="number" value={e.nh_manual} onChange={ev=>updE(i,"nh_manual",ev.target.value)} placeholder={asignacion!=="manual"?"Auto":"Ej: 50"} min="0" disabled={asignacion!=="manual"} style={{ border:"1.5px solid #e5e7eb", borderRadius:10, padding:"10px 12px", fontSize:13, fontFamily:"inherit", color:asignacion!=="manual"?"#9ca3af":"#111827", background:asignacion!=="manual"?"#f9fafb":"white", cursor:asignacion!=="manual"?"not-allowed":"text", width:"100%" }}/>
                    <button onClick={()=>rmE(i)} disabled={estMan.length<=2} style={{ width:36, height:36, border:"1.5px solid #e5e7eb", borderRadius:9, cursor:estMan.length<=2?"not-allowed":"pointer", background:"white", color:estMan.length<=2?"#d1d5db":"#ef4444", display:"flex", alignItems:"center", justifyContent:"center" }}><TrashIcon/></button>
                  </div>
                );
              })}
              {asignacion==="manual"&&<p style={{ fontSize:11, color:"#9ca3af", marginTop:4 }}>* Solo activo cuando la asignación es "Manual por estrato"</p>}
              <button onClick={addE} style={{ marginTop:8, display:"flex", alignItems:"center", gap:7, padding:"9px 16px", border:"1.5px dashed #d1fae5", borderRadius:10, background:"#f9fafb", color:"#10b981", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }} onMouseEnter={e=>e.currentTarget.style.background="#ecfdf5"} onMouseLeave={e=>e.currentTarget.style.background="#f9fafb"}><AddIcon/> Agregar estrato</button>
            </div>
          )}
          {modo === "excel" && (
            <div style={{ marginBottom:18 }}>
              <p style={{ fontSize:13, color:"#6b7280", margin:"0 0 14px", lineHeight:1.5 }}>Elige cómo están organizados los datos. Esto determina qué columnas seleccionar.</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                {[
                  { id:"individual", emoji:"👤", titulo:"Datos individuales", desc:"Cada fila es UNA PERSONA. El sistema agrupa por estrato y cuenta Nh automáticamente.", ej:"Ej: col. Sexo", col:{ bg:"#ecfdf5", brd:"#10b981", txt:"#065f46", dot:"#10b981" } },
                  { id:"agregado", emoji:"🗂️", titulo:"Datos agregados", desc:"Cada fila es UN ESTRATO ya resumido. Eliges la col. de nombre y la de tamaño (Nh).", ej:"Ej: cols. Estrato, TotalP", col:{ bg:"#fdf4ff", brd:"#a855f7", txt:"#581c87", dot:"#a855f7" } }
                ].map(t => (
                  <div key={t.id} onClick={()=>{ setTipoEnt(t.id); setColId(""); setColNom(""); setColTam(""); setRes(null); }} style={{ padding:16, borderRadius:14, cursor:"pointer", border:tipoEnt===t.id?`2px solid ${t.col.brd}`:"2px solid #e5e7eb", background:tipoEnt===t.id?t.col.bg:"white", transition:"all .2s", boxShadow:tipoEnt===t.id?`0 4px 12px ${t.col.dot}30`:"none" }}>
                    <div style={{ fontSize:22, marginBottom:8 }}>{t.emoji}</div><div style={{ fontSize:14, fontWeight:700, color:tipoEnt===t.id?t.col.txt:"#374151", marginBottom:5 }}>{t.titulo}</div><div style={{ fontSize:12, color:"#6b7280", lineHeight:1.5, marginBottom:8 }}>{t.desc}</div><div style={{ fontSize:11, color:tipoEnt===t.id?t.col.dot:"#9ca3af", fontStyle:"italic", lineHeight:1.4 }}>{t.ej}</div>
                    {tipoEnt===t.id&&<div style={{ marginTop:10, fontSize:11, fontWeight:700, color:t.col.dot, display:"flex", alignItems:"center", gap:4 }}><svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Seleccionado</div>}
                  </div>
                ))}
              </div>
              {tipoEnt === "individual" ? (
                <ColSel label="Columna que identifica el estrato" tooltip="Ej: Sexo" val={colId} cols={colsExcel} onChange={(v:any)=>{ setColId(v); setRes(null); }} placeholder="Ej: Sexo, Región…"/>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <ColSel label="Columna: Nombre del estrato" val={colNom} cols={colsExcel} onChange={(v:any)=>{ setColNom(v); setRes(null); }} placeholder="Ej: Región"/>
                  <ColSel label="Columna: Tamaño (Nh)" val={colTam} cols={colsExcel.filter(c=>c!==colNom)} onChange={(v:any)=>{ setColTam(v); setRes(null); }} placeholder="Ej: Habitantes"/>
                </div>
              )}
              {estratosExcel.length > 0 && (
                <div style={{ marginTop:8, background:"#f9fafb", border:"1px solid #f3f4f6", borderRadius:13, padding:"16px 18px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexWrap:"wrap", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}><div style={{ fontSize:13, fontWeight:700, color:"#374151" }}>✅ {estratosExcel.length} estrato{estratosExcel.length!==1?"s":""} detectados</div><span style={{ display:"flex", alignItems:"center", gap:4, background:"#fef9c3", color:"#713f12", fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20, border:"1px solid #fde68a" }}><LockIcon/> Solo lectura</span></div>
                    <div style={{ display:"flex", gap:8 }}><SMini label="Individuos" val={estratosExcel.reduce((s:number,e:any)=>s+e.Nh,0).toLocaleString()} color="#a855f7"/><SMini label="Estratos" val={estratosExcel.length} color="#6b7280"/></div>
                  </div>
                  <div style={{ background:"white", borderRadius:10, border:"1px solid #e5e7eb", overflow:"hidden" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:0 }}>{["Estrato","Tamaño (Nh)","Muestra (nh) *"].map((h,i)=>(<div key={i} style={{ padding:"8px 14px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".05em", borderBottom:"1px solid #f3f4f6", background:"#f9fafb" }}>{h}</div>))}</div>
                    {estratosExcel.map((e:any,i:number)=>{
                      const c=ce(i);
                      return(
                        <div key={e.nombre} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:0, borderBottom:"1px solid #f9fafb" }}>
                          <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:8 }}><span style={{ width:8, height:8, borderRadius:"50%", background:c.dot, flexShrink:0 }}/><span style={{ fontSize:13, fontWeight:600, color:c.txt, background:c.bg, padding:"2px 10px", borderRadius:20, border:`1px solid ${c.brd}` }}>{e.nombre}</span></div>
                          <div style={{ padding:"10px 14px", display:"flex", alignItems:"center" }}><span style={{ fontSize:13, fontFamily:"'DM Mono',monospace", fontWeight:700, color:"#374151" }}>{e.Nh.toLocaleString()}</span></div>
                          <div style={{ padding:"6px 10px", display:"flex", alignItems:"center" }}><input type="number" min="0" max={e.Nh} value={nhExcel[e.nombre]||""} onChange={ev=>{ setNhExcel((prev:any)=>({...prev,[e.nombre]:ev.target.value})); setRes(null); }} placeholder={asignacion!=="manual"?"Auto":"Ej: 30"} disabled={asignacion!=="manual"} style={{ width:"100%", border:`1.5px solid ${asignacion==="manual"?c.brd:"#e5e7eb"}`, borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"inherit", color:asignacion!=="manual"?"#9ca3af":"#111827", background:asignacion!=="manual"?"#f9fafb":c.bg, cursor:asignacion!=="manual"?"not-allowed":"text" }}/></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <Divider/>
          <SLbl step="Paso 2" label="Método de reparto de la muestra"/>
          <p style={{ fontSize:13, color:"#6b7280", margin:"0 0 13px", lineHeight:1.5 }}>Define cómo se distribuirá el total de la muestra entre los estratos.</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:18 }}>
            {[
              { id:"proporcional", emoji:"📊", label:"Proporcional al tamaño", desc:"nh = n × (Nh/N) · Recomendado" },
              { id:"igual", emoji:"⚖️", label:"Igual para todos", desc:"El mismo n en cada estrato" },
              { id:"manual", emoji:"✏️", label:"Manual por estrato", desc:"Tú defines el nh" },
            ].map(a=>(
              <div key={a.id} onClick={()=>{ setAsign(a.id); setRes(null); }} style={{ padding:"14px", borderRadius:12, cursor:"pointer", border:asignacion===a.id?"2px solid #10b981":"2px solid #e5e7eb", background:asignacion===a.id?"#f0fdf4":"white", transition:"all .2s" }}>
                <div style={{ fontSize:20, marginBottom:7 }}>{a.emoji}</div><div style={{ fontSize:13, fontWeight:700, color:asignacion===a.id?"#065f46":"#374151", marginBottom:4 }}>{a.label}</div><div style={{ fontSize:11, color:"#6b7280", lineHeight:1.4 }}>{a.desc}</div>
                {asignacion===a.id&&<div style={{ marginTop:8, fontSize:11, fontWeight:700, color:"#10b981", display:"flex", alignItems:"center", gap:4 }}><svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Seleccionado</div>}
              </div>
            ))}
          </div>
          {asignacion !== "manual" && (
            <>
              <Divider/>
              <SLbl step="Paso 3" label="Tamaño total de la muestra"/>
              <div style={{ maxWidth:360 }}><FNum label="Tamaño final (n)" value={nTotal} onChange={(v:any)=>{ setNTotal(v); setRes(null); }} placeholder="Ej: 300" hint="Se distribuirá acorde al método."/></div>
              {canCalc && !errMsg && !res && numEstr >= 2 && <AsigPreview estratos={listaBase} asignacion={asignacion} nTotal={parseInt(nTotal)}/>}
            </>
          )}
          <Divider/>
          <SLbl step={asignacion==="manual"?"Paso 3":"Paso 4"} label="Opciones"/>
          <div onClick={()=>setOrdenar(!ordenar)} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 15px", borderRadius:12, cursor:"pointer", border:ordenar?"2px solid #10b981":"2px solid #e5e7eb", background:ordenar?"#f0fdf4":"white", transition:"all .2s", userSelect:"none", maxWidth:500 }}><div style={{ width:21, height:21, borderRadius:6, border:ordenar?"2px solid #10b981":"2px solid #d1d5db", background:ordenar?"#10b981":"white", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s", flexShrink:0 }}>{ordenar&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</div><div><div style={{ fontSize:14, fontWeight:600, color:ordenar?"#065f46":"#374151" }}>Ordenar muestra dentro de cada estrato</div></div></div>
        </div>
        {errMsg&&<div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:11, padding:"11px 15px", marginTop:14, fontSize:13, color:"#dc2626", fontWeight:600 }}>⚠️ {errMsg}</div>}
        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          <button onClick={handleCalc} disabled={!canCalc||loading} style={{ flex:1, padding:"13px 20px", borderRadius:12, border:"none", cursor:canCalc&&!loading?"pointer":"not-allowed", fontSize:15, fontWeight:700, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:9, transition:"all .25s", background:canCalc?"linear-gradient(135deg,#10b981,#059669)":"#e5e7eb", color:canCalc?"white":"#9ca3af" }}>{loading?<><Spin/> Generando...</>:<><CalcIcon/> {res?"Regenerar muestra":"Generar muestra estratificada"}</>}</button>
          <button onClick={handleReset} style={{ padding:"13px 18px", borderRadius:12, border:"2px solid #e5e7eb", cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit", background:"white", color:"#6b7280", display:"flex", alignItems:"center", gap:6 }}><RstIcon/> Limpiar</button>
        </div>
        {err&&<div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:11, padding:"11px 15px", marginTop:14, fontSize:13, color:"#dc2626" }}>❌ {err}</div>}
        {res && (
          <div style={{ marginTop:28, animation:"slideUp .4s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:12 }}>
              <div>
                <span style={{ fontSize:16, fontWeight:800, color:"#111827" }}>Muestra completada ({res.nTotal.toLocaleString()} seleccionados)</span>
                <p style={{ fontSize:13, color:"#6b7280", margin:"4px 0 0" }}>Lista consolidada con probabilidad y ponderación aplicadas.</p>
              </div>
              <BtnDsc loading={descLoading} onClick={handleDesc}/>
            </div>
            
            {esGrande&&<div style={{ background:"#fffbeb", border:"1.5px solid #fde68a", padding:"11px 18px", fontSize:13, color:"#92400e", display:"flex", gap:8 }}>⚡ Muestra grande ({datosTab.length.toLocaleString()} resultados)</div>}
            
            <div style={{ background:"white", border:"2px solid #6ee7b7", borderRadius:"14px", overflow:"hidden", marginTop:14 }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead><tr style={{ background:"#f9fafb" }}>{cols.map(c=><th key={c} style={{ padding:"10px 18px", textAlign:"left", fontWeight:700, fontSize:11, color:"#6b7280", textTransform:"uppercase", letterSpacing:".05em", borderBottom:"1px solid #e5e7eb", whiteSpace:"nowrap" }}>{c}</th>)}</tr></thead>
                  <tbody>
                    {fPag.map((fila:any,i:number)=>{
                      const ei=res.estratos.findIndex((e:any)=>e.nombre===fila["Estrato"]); const c=ei>=0?ce(ei):null;
                      return <tr key={i} className="rh" style={{ background:i%2===0?"white":"#fafbfc", transition:"background .12s" }}>{cols.map(col=><td key={col} style={{ padding:"10px 18px", borderBottom:"1px solid #f3f4f6", whiteSpace:"nowrap", color:col==="Orden global"?"#10b981":col==="Estrato"&&c?c.txt:"#374151" }}>{col==="Estrato"&&c?<span style={{ background:c.bg, padding:"2px 9px", borderRadius:20, border:`1px solid ${c.brd}` }}>{fila[col]}</span>:fila[col]??"—"}</td>)}</tr>;
                    })}
                  </tbody>
                </table>
              </div>
              {tPags>1&&<PaginComp pagina={pagAct} totalPags={tPags} setPagina={(p:any)=>setPag(tabAct,p)} vData={vData}/>}
            </div>
            <div style={{ marginTop:18, background:"white", border:"1.5px solid #e5e7eb", borderRadius:14, padding:"16px 20px" }}><b>Interpretación:</b> Se aplicó muestreo aleatorio estratificado con {res.estratos.length} estratos.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SLbl({ step, label }:any) { return <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#10b981", margin:"0 0 14px", display:"flex", alignItems:"center", gap:6 }}><span style={{ width:18, height:2, background:"#10b981", borderRadius:2 }}/>{step} · {label}</div>; }
function Divider() { return <div style={{ height:1, background:"#f3f4f6", margin:"4px 0 20px" }}/>; }
function ColSel({ label, val, cols, onChange, placeholder }:any) { return <div style={{ marginBottom:16 }}><div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:7 }}>{label}</div><select value={val} onChange={e=>onChange(e.target.value)} style={{ width:"100%", padding:"11px", border:`2px solid ${val?"#10b981":"#e5e7eb"}`, borderRadius:10, fontSize:14, outline:"none" }}><option value="">{placeholder||"Seleccionar..."}</option>{cols.map((c:any)=><option key={c} value={c}>{c}</option>)}</select></div>; }
function FNum({ label, value, onChange, placeholder, hint }:any) { const [f,setF]=useState(false); return <div style={{ marginBottom:18 }}><div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:7 }}>{label}</div><div style={{ border:f?"2px solid #10b981":"2px solid #e5e7eb", borderRadius:10, overflow:"hidden", background:"white" }}><input type="number" min="1" value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} placeholder={placeholder} style={{ width:"100%", padding:"11px 14px", border:"none", outline:"none", fontSize:14, background:"transparent" }}/></div>{hint&&<div style={{ fontSize:12, color:"#9ca3af", marginTop:5 }}>{hint}</div>}</div>; }
function SMini({ label, val, color }:any) { return <div style={{ background:"white", border:"1.5px solid #e5e7eb", borderRadius:11, padding:"10px 14px" }}><div style={{ fontSize:16, fontWeight:800, color, fontFamily:"'DM Mono',monospace" }}>{val}</div><div style={{ fontSize:11, color:"#9ca3af", fontWeight:600, marginTop:2 }}>{label}</div></div>; }
function AsigPreview({ estratos, asignacion, nTotal }:any) {
  if(!nTotal||isNaN(nTotal)||nTotal<1) return null; const validos=estratos.filter((e:any)=>e.Nh>0); if(validos.length===0) return null; let asig;
  if(asignacion==="proporcional"){ const N=validos.reduce((s:number,e:any)=>s+e.Nh,0); const raw=validos.map((e:any)=>({...e,nh:nTotal*e.Nh/N})); asig=raw.map((e:any)=>({...e,nh:Math.floor(e.nh)})); const r=nTotal-asig.reduce((s:number,e:any)=>s+e.nh,0); const res=raw.map((e:any,i:number)=>({i,r:e.nh-Math.floor(e.nh)})).sort((a:any,b:any)=>b.r-a.r); for(let i=0;i<r;i++)asig[res[i].i].nh++; }
  else{ const H=validos.length, base=Math.floor(nTotal/H), extra=nTotal-base*H; asig=validos.map((e:any,i:number)=>({...e,nh:base+(i<extra?1:0)})); }
  return <div style={{ background:"#f9fafb", border:"1px solid #f3f4f6", borderRadius:12, padding:"14px 16px", marginTop:6, marginBottom:18 }}><div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>{asig.map((e:any,i:number)=>{ const c=ce(i); return <div key={e.nombre} style={{ background:c.bg, border:`1px solid ${c.brd}`, borderRadius:9, padding:"8px 12px", fontSize:12 }}><span style={{ fontWeight:700, color:c.txt }}>{e.nombre}</span> <span style={{ color:c.dot, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>n={e.nh}</span></div>; })}</div></div>;
}
function BtnDsc({ loading, onClick }:any) { return <button onClick={onClick} disabled={loading} style={{ padding:"11px 20px", borderRadius:12, border:"2px solid #10b981", cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit", background:loading?"#f0fdf4":"white", color:"#10b981", display:"flex", alignItems:"center", gap:8 }}>{loading?"Descargando...":"Descargar Excel"}</button>; }
function Spin({ sm=false }:any) { const s=sm?14:17; return <span style={{ width:s, height:s, border:`${sm?2:3}px solid rgba(16,185,129,.3)`, borderTopColor:"#10b981", borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }}/>; }
function PaginComp({ pagina, totalPags, setPagina, vData }:any) {
  function gP(c:number,t:number){if(t<=7)return Array.from({length:t},(_,i)=>i+1);if(c<=4)return[1,2,3,4,5,"…",t];if(c>=t-3)return[1,"…",t-4,t-3,t-2,t-1,t];return[1,"…",c-1,c,c+1,"…",t];}
  return <div style={{ padding:"14px 22px", borderTop:"1px solid #f3f4f6", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}><span style={{ fontSize:12, color:"#9ca3af" }}>Filas {(pagina-1)*FILAS_PAG+1}–{Math.min(pagina*FILAS_PAG,vData.length)}</span><div style={{ display:"flex", alignItems:"center", gap:4 }}>{gP(pagina,totalPags).map((p:any,i:number)=>p==="…"?<span key={`e${i}`} style={{ padding:"0 6px", color:"#9ca3af" }}>…</span>:<button key={p} onClick={()=>setPagina(p)} style={{ width:34, height:34, border:"none", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", background:pagina===p?"#10b981":"#f3f4f6", color:pagina===p?"white":"#6b7280" }}>{p}</button>)}</div></div>;
}
