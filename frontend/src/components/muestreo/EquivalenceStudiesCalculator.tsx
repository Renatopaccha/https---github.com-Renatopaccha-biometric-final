import { useState, useEffect } from "react";

/* ─── Utilities ─── */
function normalInv(p: number){const a=[-3.969683028665376e1,2.209460984245205e2,-2.759285104469687e2,1.383577518672690e2,-3.066479806614716e1,2.506628277459239e0];const b=[-5.447609879822406e1,1.615858368580409e2,-1.556989798598866e2,6.680131188771972e1,-1.328068155288572e1];const c=[-7.784894002430293e-3,-3.223964580411365e-1,-2.400758277161838e0,-2.549732539343734e0,4.374664141464968e0,2.938163982698783e0];const d=[7.784695709041462e-3,3.224671290700398e-1,2.445134137142996e0,3.754408661907416e0];const pLow=0.02425,pHigh=1-pLow;let q,r;if(p<pLow){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}else if(p<=pHigh){q=p-0.5;r=q*q;return((((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q)/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)}else{q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}}
function normalCDF(x: number){const t=1/(1+0.2316419*Math.abs(x));const d=0.3989422804014327;const p=d*Math.exp(-x*x/2)*(t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.8212560+t*1.3302744)))));return x>0?1-p:p;}

/* ─── Equivalence of Means (TOST) ─── */
function calcEquivMeansN(diff: number, sd: number, delta: number, ratio: number, confidence: number, power: number) {
  const alpha = 1 - confidence / 100;
  const za = Math.abs(normalInv(alpha));       // one-sided alpha for TOST
  const zb = Math.abs(normalInv(1 - power / 100));
  const margin = Math.abs(Math.abs(diff) - delta);
  if (margin === 0) return { n1: Infinity, n2: Infinity, total: Infinity };
  const n1 = Math.max(2, Math.ceil(Math.pow(za + zb, 2) * sd * sd * (1 + 1 / ratio) / (margin * margin)));
  const n2 = Math.max(2, Math.ceil(n1 * ratio));
  return { n1, n2, total: n1 + n2 };
}
function calcEquivMeansPow(diff: number, sd: number, delta: number, ratio: number, confidence: number, n1: number) {
  const alpha = 1 - confidence / 100;
  const za = Math.abs(normalInv(alpha));
  const margin = Math.abs(Math.abs(diff) - delta);
  if (margin === 0 || sd <= 0) return 0;
  const zb = margin * Math.sqrt(n1 / (sd * sd * (1 + 1 / ratio))) - za;
  return Math.max(0, Math.min(100, normalCDF(zb) * 100));
}

/* ─── Equivalence of Proportions (TOST) ─── */
function calcEquivPropN(p1: number, p2: number, delta: number, ratio: number, confidence: number, power: number) {
  const alpha = 1 - confidence / 100;
  const za = Math.abs(normalInv(alpha));
  const zb = Math.abs(normalInv(1 - power / 100));
  const margin = Math.abs(Math.abs(p1 - p2) - delta);
  if (margin === 0) return { n1: Infinity, n2: Infinity, total: Infinity };
  const p_pool = (p1 + p2 * ratio) / (1 + ratio);
  const var0 = p_pool * (1 - p_pool) * (1 + 1 / ratio);
  const var1 = p1 * (1 - p1) + p2 * (1 - p2) / ratio;
  const n1 = Math.max(2, Math.ceil(Math.pow(za * Math.sqrt(var0) + zb * Math.sqrt(var1), 2) / (margin * margin)));
  const n2 = Math.max(2, Math.ceil(n1 * ratio));
  return { n1, n2, total: n1 + n2 };
}
function calcEquivPropPow(p1: number, p2: number, delta: number, ratio: number, confidence: number, n1: number) {
  const alpha = 1 - confidence / 100;
  const za = Math.abs(normalInv(alpha));
  const margin = Math.abs(Math.abs(p1 - p2) - delta);
  if (margin === 0) return 0;
  const p_pool = (p1 + p2 * ratio) / (1 + ratio);
  const var0 = p_pool * (1 - p_pool) * (1 + 1 / ratio);
  const var1 = p1 * (1 - p1) + p2 * (1 - p2) / ratio;
  if (var1 <= 0 || var0 <= 0) return 0;
  const zb = (margin * Math.sqrt(n1) - za * Math.sqrt(var0)) / Math.sqrt(var1);
  return Math.max(0, Math.min(100, normalCDF(zb) * 100));
}

/* ─── Icons ─── */
const InfoIcon=()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>);
const SparkleIcon=()=>(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/></svg>);
const BackIcon=()=>(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>);
const CalcIcon=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/></svg>);
const CheckIcon=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);
const ResetIcon=()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>);
const TableIcon=()=>(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>);

/* ─── Reusable Components ─── */
function Tooltip({children,text}: any){const[show,setShow]=useState(false);return(<span onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} style={{position:"relative",display:"inline-flex",cursor:"help"}}>{children}{show&&(<span style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:"#1f2937",color:"#f9fafb",fontSize:12,lineHeight:1.5,padding:"10px 14px",borderRadius:10,width:280,zIndex:100,boxShadow:"0 10px 30px rgba(0,0,0,0.2)",pointerEvents:"none",fontWeight:400}}>{text}<span style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1f2937"}}/></span>)}</span>)}
function Stepper({steps,current}: any){return(<div style={{display:"flex",alignItems:"center",gap:0,marginBottom:32}}>{steps.map((s:any,i:number)=>{const done=current>s.num,active=current===s.num;return(<div key={s.num} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:"none"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,background:done?"#10b981":active?"#ecfdf5":"#f3f4f6",color:done?"white":active?"#059669":"#9ca3af",border:active?"2px solid #10b981":done?"2px solid #10b981":"2px solid #e5e7eb",transition:"all 0.3s ease"}}>{done?<CheckIcon/>:s.num}</div><span style={{fontSize:13,fontWeight:active?700:500,color:active?"#059669":done?"#10b981":"#9ca3af",whiteSpace:"nowrap"}}>{s.label}</span></div>{i<steps.length-1&&<div style={{flex:1,height:2,marginLeft:12,marginRight:12,background:done?"#10b981":"#e5e7eb",borderRadius:2}}/>}</div>)})}</div>)}
function Field({label,tooltip,value,onChange,placeholder,suffix,hint,disabled}: any){const[focused,setFocused]=useState(false);return(<div style={{marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><label style={{fontSize:13,fontWeight:600,color:"#374151"}}>{label}</label>{tooltip&&<Tooltip text={tooltip}><span style={{color:"#9ca3af",display:"flex"}}><InfoIcon/></span></Tooltip>}</div><div style={{display:"flex",alignItems:"center",border:focused?"2px solid #10b981":"2px solid #e5e7eb",borderRadius:10,background:disabled?"#f9fafb":"white",transition:"all 0.2s ease",boxShadow:focused?"0 0 0 3px rgba(16,185,129,0.1)":"none",overflow:"hidden"}}><input type="number" value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder={placeholder} disabled={disabled} step="any" style={{flex:1,border:"none",outline:"none",padding:"12px 14px",fontSize:14,fontFamily:"'DM Sans',sans-serif",background:"transparent",color:disabled?"#9ca3af":"#111827"}}/>{suffix&&<span style={{padding:"0 14px",fontSize:13,color:"#6b7280",fontWeight:600,borderLeft:"1px solid #f3f4f6",background:"#f9fafb",alignSelf:"stretch",display:"flex",alignItems:"center"}}>{suffix}</span>}</div>{hint&&<p style={{fontSize:12,color:"#9ca3af",margin:"6px 0 0",lineHeight:1.4}}>{hint}</p>}</div>)}
function QuickBtns({values,current,onSelect,suffix}: any){return(<div style={{display:"flex",gap:6,marginTop:-12,marginBottom:20,flexWrap:"wrap"}}><span style={{fontSize:11,color:"#9ca3af",fontWeight:600,alignSelf:"center",marginRight:4}}>Frecuentes:</span>{values.map((v:any)=>(<button key={v} onClick={()=>onSelect(v)} style={{padding:"4px 14px",borderRadius:8,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:current===v?"#ecfdf5":"#f9fafb",color:current===v?"#059669":"#9ca3af",transition:"all 0.15s ease"}}>{v}{suffix||""}</button>))}</div>)}
function SL({step,label}: any){return(<div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#10b981",marginBottom:16,display:"flex",alignItems:"center",gap:6}}><span style={{width:20,height:2,background:"#10b981",borderRadius:2,display:"inline-block"}}/>{step} · {label}</div>)}
function PowerBar({value}: any){const pw=parseFloat(value)||0;const color=pw>=80?"#10b981":pw>=60?"#eab308":"#ef4444";const lbl=pw>=80?"Adecuada":pw>=60?"Baja":"Insuficiente";return(<div style={{marginBottom:20}}><div style={{height:8,borderRadius:4,background:"#f3f4f6",overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,background:color,width:`${Math.min(100,pw)}%`,transition:"width 0.4s ease"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:6}}><span style={{color:"#9ca3af"}}>0%</span><span style={{color,fontWeight:700}}>Potencia {pw.toFixed(1)}% — {lbl}</span><span style={{color:"#9ca3af"}}>100%</span></div></div>)}

/* ─── Main ─── */
interface EquivalenceProps { onBack?: () => void; }

export function EquivalenceStudiesCalculator({ onBack }: EquivalenceProps) {
  const [design, setDesign] = useState("means");   // means | proportions
  const [mode, setMode] = useState("sampleSize");  // sampleSize | power
  const [confidence, setConfidence] = useState("95");
  const [ratio, setRatio] = useState("1");
  const [useRange, setUseRange] = useState(false);

  // Means fields
  const [diff, setDiff] = useState("");
  const [sd, setSd] = useState("");
  const [deltaMeans, setDeltaMeans] = useState("");

  // Proportions fields
  const [prop1, setProp1] = useState("");
  const [prop2, setProp2] = useState("");
  const [deltaProp, setDeltaProp] = useState("");

  // Power / sample size fields
  const [pwSingle, setPwSingle] = useState("");
  const [pwMin, setPwMin] = useState("");
  const [pwMax, setPwMax] = useState("");
  const [pwInc, setPwInc] = useState("");
  const [nInput, setNInput] = useState("");

  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);

  const steps = [
    { num: 1, label: "Datos" },
    { num: 2, label: "Diseño" },
    { num: 3, label: mode === "sampleSize" ? "Potencia" : "Muestra" },
  ];

  // Step logic
  let currentStep = 1;
  if (design === "means") {
    if (diff !== "" && sd !== "" && parseFloat(sd) > 0 && deltaMeans !== "" && parseFloat(deltaMeans) > 0) currentStep = 2;
  } else {
    if (prop1 !== "" && parseFloat(prop1) >= 0 && prop2 !== "" && parseFloat(prop2) >= 0 && deltaProp !== "" && parseFloat(deltaProp) > 0) currentStep = 2;
  }
  if (currentStep === 2 && ratio !== "" && parseFloat(ratio) > 0 && confidence !== "" && parseFloat(confidence) > 0) currentStep = 3;

  let canCalc = false;
  if (currentStep === 3) {
    if (mode === "sampleSize") {
      if (!useRange && pwSingle !== "" && parseFloat(pwSingle) > 0 && parseFloat(pwSingle) < 100) canCalc = true;
      if (useRange && pwMin !== "" && pwMax !== "" && parseFloat(pwMax) >= parseFloat(pwMin) && pwInc !== "" && parseFloat(pwInc) >= 0) canCalc = true;
    } else {
      if (nInput !== "" && parseFloat(nInput) > 0) canCalc = true;
    }
  }

  const handleCalc = () => {
    const r = parseFloat(ratio) || 1;
    const conf = parseFloat(confidence);

    if (design === "means") {
      const d = parseFloat(diff) || 0, s = parseFloat(sd), delta = parseFloat(deltaMeans);
      if (isNaN(s) || isNaN(delta)) return;
      if (mode === "sampleSize") {
        if (!useRange) {
          const pw = parseFloat(pwSingle);
          const res = calcEquivMeansN(d, s, delta, r, conf, pw);
          setResult({ type: "sampleSize", ...res, params: [{ label: "Dif. esperada", value: d }, { label: "DE", value: s }, { label: "δ", value: delta }, { label: "Razón", value: `${r}:1` }, { label: "Confianza", value: `${conf}%` }, { label: "Potencia", value: `${pw}%` }] });
        } else {
          const mn = parseFloat(pwMin), mx = parseFloat(pwMax), inc = parseFloat(pwInc) || 1;
          const arr: any[] = [];
          for (let pw = mn; pw <= mx + 0.001; pw += inc) {
            const res = calcEquivMeansN(d, s, delta, r, conf, pw);
            arr.push({ power: parseFloat(pw.toFixed(1)), ...res });
          }
          setResult({ type: "range", arr, params: [{ label: "Dif. esperada", value: d }, { label: "DE", value: s }, { label: "δ", value: delta }, { label: "Confianza", value: `${conf}%` }] });
        }
      } else {
        const n1 = parseFloat(nInput);
        const pw = calcEquivMeansPow(d, s, delta, r, conf, n1);
        setResult({ type: "power", power: pw, params: [{ label: "Dif. esperada", value: d }, { label: "DE", value: s }, { label: "δ", value: delta }, { label: "n₁", value: Math.ceil(n1) }, { label: "Confianza", value: `${conf}%` }] });
      }
    } else {
      const p1 = parseFloat(prop1) / 100, p2 = parseFloat(prop2) / 100, delta = parseFloat(deltaProp) / 100;
      if (isNaN(p1) || isNaN(p2) || isNaN(delta)) return;
      if (mode === "sampleSize") {
        if (!useRange) {
          const pw = parseFloat(pwSingle);
          const res = calcEquivPropN(p1, p2, delta, r, conf, pw);
          setResult({ type: "sampleSize", ...res, params: [{ label: "p₁", value: `${prop1}%` }, { label: "p₂", value: `${prop2}%` }, { label: "δ", value: `${deltaProp}%` }, { label: "Razón", value: `${r}:1` }, { label: "Confianza", value: `${conf}%` }, { label: "Potencia", value: `${pw}%` }] });
        } else {
          const mn = parseFloat(pwMin), mx = parseFloat(pwMax), inc = parseFloat(pwInc) || 1;
          const arr: any[] = [];
          for (let pw = mn; pw <= mx + 0.001; pw += inc) {
            const res = calcEquivPropN(p1, p2, delta, r, conf, pw);
            arr.push({ power: parseFloat(pw.toFixed(1)), ...res });
          }
          setResult({ type: "range", arr, params: [{ label: "p₁", value: `${prop1}%` }, { label: "p₂", value: `${prop2}%` }, { label: "δ", value: `${deltaProp}%` }, { label: "Confianza", value: `${conf}%` }] });
        }
      } else {
        const n1 = parseFloat(nInput);
        const pw = calcEquivPropPow(p1, p2, delta, r, conf, n1);
        setResult({ type: "power", power: pw, params: [{ label: "p₁", value: `${prop1}%` }, { label: "p₂", value: `${prop2}%` }, { label: "δ", value: `${deltaProp}%` }, { label: "n₁", value: Math.ceil(n1) }, { label: "Confianza", value: `${conf}%` }] });
      }
    }
    setShowResult(true);
  };

  const handleReset = () => {
    setConfidence("95"); setRatio("1"); setUseRange(false);
    setDiff(""); setSd(""); setDeltaMeans("");
    setProp1(""); setProp2(""); setDeltaProp("");
    setPwSingle(""); setPwMin(""); setPwMax(""); setPwInc(""); setNInput("");
    setShowResult(false); setResult(null); setMode("sampleSize");
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#fafbfc", minHeight: "100%", color: "#1a1a2e" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes cinematicUp { from { opacity:0; transform:translateY(40px) scale(0.98); filter:blur(8px); } to { opacity:1; transform:translateY(0) scale(1); filter:blur(0); } }
        @keyframes fadeRight { from { opacity:0; transform:translateX(-30px); filter:blur(4px); } to { opacity:1; transform:translateX(0); filter:blur(0); } }
        .anim-cinematic { animation: cinematicUp 1.2s cubic-bezier(0.16,1,0.3,1) both; }
        .anim-fadeRight { animation: fadeRight 1s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* Breadcrumb */}
        <div className="anim-fadeRight" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <button onClick={onBack} style={{ cursor: "pointer", color: "#10b981", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: 0 }}><BackIcon /> Muestreo</button>
          <span style={{ color: "#d1d5db" }}>/</span><span style={{ color: "#9ca3af" }}>Contraste de hipótesis</span>
          <span style={{ color: "#d1d5db" }}>/</span><span style={{ color: "#374151" }}>Estudios de equivalencia</span>
        </div>

        {/* Title */}
        <div className="anim-fadeRight" style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 8, animationDelay: "100ms" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16" /><path d="M12 4v16" /><circle cx="12" cy="12" r="9" /></svg>
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#111827", letterSpacing: "-0.02em" }}>Estudios de Equivalencia</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0", lineHeight: 1.5 }}>Contraste de hipótesis — Demostrar que dos tratamientos tienen efectos similares dentro de un margen δ (TOST).</p>
          </div>
        </div>

        {/* AI Banner */}
        <div className="anim-cinematic" style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", border: "1px solid #a7f3d0", borderRadius: 12, padding: "12px 16px", margin: "20px 0 28px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#065f46", cursor: "pointer", animationDelay: "200ms" }}>
          <div style={{ background: "#10b981", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}><SparkleIcon /></div>
          <span><b>Asistente IA:</b> El margen de equivalencia (δ) debe ser clínicamente justificable. Puedo ayudarte a determinar valores apropiados basados en la literatura.</span>
        </div>

        {/* Design tabs */}
        <div className="anim-cinematic" style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 28, animationDelay: "300ms" }}>
          {[{ id: "means", label: "Equivalencia de medias", icon: "📊" }, { id: "proportions", label: "Equivalencia de proporciones", icon: "📈" }].map(t => (
            <button key={t.id} onClick={() => { setDesign(t.id); setShowResult(false); setResult(null); }}
              style={{ flex: 1, padding: "11px 16px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.25s ease", background: design === t.id ? "white" : "transparent", color: design === t.id ? "#111827" : "#6b7280", boxShadow: design === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Mode tabs */}
        <div className="anim-cinematic" style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 28, animationDelay: "400ms" }}>
          {[{ id: "sampleSize", label: "Calcular tamaño de muestra", icon: "📐" }, { id: "power", label: "Calcular potencia", icon: "⚡" }].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setShowResult(false); setResult(null); }}
              style={{ flex: 1, padding: "11px 16px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.25s ease", background: mode === m.id ? "white" : "transparent", color: mode === m.id ? "#111827" : "#6b7280", boxShadow: mode === m.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              <span>{m.icon}</span>{m.label}
            </button>
          ))}
        </div>

        <div className="anim-cinematic" style={{ animationDelay: "500ms" }}>
          <Stepper steps={steps} current={currentStep} />
        </div>

        {/* Form */}
        <div className="anim-cinematic" style={{ animationDelay: "600ms", background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: "28px 28px 8px", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>

          {/* Step 1: Data */}
          <SL step="Paso 1" label="Datos del estudio" />

          {design === "means" ? (<>
            <Field label="Diferencia de medias esperada" tooltip="Diferencia real esperada entre los dos grupos (puede ser 0 si se espera igualdad perfecta)." value={diff} onChange={setDiff} placeholder="Ej: 0" />
            <Field label="Desviación estándar esperada en las dos poblaciones" tooltip="Desviación estándar común asumida para ambos grupos." value={sd} onChange={setSd} placeholder="Ej: 10" />
            <Field label="Diferencia de medias máxima que indica equivalencia (δ)" tooltip="Margen de equivalencia: la máxima diferencia clínicamente irrelevante." value={deltaMeans} onChange={setDeltaMeans} placeholder="Ej: 5" />
          </>) : (<>
            <Field label="Proporción esperada en la población 1 (p₁)" tooltip="Proporción esperada del evento en el grupo 1 (ej. tratamiento nuevo)." value={prop1} onChange={setProp1} placeholder="Ej: 50" suffix="%" />
            <Field label="Proporción esperada en la población 2 (p₂)" tooltip="Proporción esperada del evento en el grupo 2 (ej. tratamiento estándar)." value={prop2} onChange={setProp2} placeholder="Ej: 48" suffix="%" />
            <Field label="Diferencia de proporciones máxima que indica equivalencia (δ)" tooltip="Margen de equivalencia en puntos porcentuales." value={deltaProp} onChange={setDeltaProp} placeholder="Ej: 10" suffix="%" />
          </>)}

          <div style={{ height: 1, background: "#f3f4f6", margin: "4px 0 20px" }} />

          {/* Step 2: Design */}
          <SL step="Paso 2" label="Diseño del estudio" />
          <Field label="Razón entre tamaños muestrales (n₂/n₁)" tooltip="Proporción del grupo 2 respecto al grupo 1. Valor 1 = grupos iguales." value={ratio} onChange={setRatio} placeholder="1" />
          <QuickBtns values={["1", "1.5", "2", "3"]} current={ratio} onSelect={setRatio} suffix=":1" />
          <Field label="Nivel de confianza" tooltip="Para equivalencia se usa α unilateral. 95% corresponde a α = 0.05 unilateral (TOST)." value={confidence} onChange={setConfidence} placeholder="95" suffix="%" />
          <QuickBtns values={["90", "95", "99"]} current={confidence} onSelect={setConfidence} suffix="%" />

          <div style={{ height: 1, background: "#f3f4f6", margin: "4px 0 20px" }} />

          {/* Step 3: Power / Sample */}
          <SL step="Paso 3" label={mode === "sampleSize" ? "Potencia deseada" : "Muestra disponible"} />

          {mode === "sampleSize" ? (<>
            <div style={{ display: "flex", gap: 4, background: "#f9fafb", borderRadius: 10, padding: 3, marginBottom: 20, border: "1px solid #f3f4f6" }}>
              <button onClick={() => setUseRange(false)} style={{ flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: !useRange ? "white" : "transparent", color: !useRange ? "#111827" : "#9ca3af", boxShadow: !useRange ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>Valor único</button>
              <button onClick={() => setUseRange(true)} style={{ flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: useRange ? "white" : "transparent", color: useRange ? "#111827" : "#9ca3af", boxShadow: useRange ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}><TableIcon /> Rango (tabla)</button>
            </div>
            {!useRange ? (<>
              <Field label="Potencia estadística (1−β)" tooltip="Probabilidad de concluir equivalencia cuando realmente existe. 80% mínimo." value={pwSingle} onChange={setPwSingle} placeholder="Ej: 80" suffix="%" />
              <QuickBtns values={["80", "85", "90", "95"]} current={pwSingle} onSelect={setPwSingle} suffix="%" />
            </>) : (
              <div style={{ background: "#f9fafb", borderRadius: 12, padding: "20px 20px 4px", border: "1px solid #f3f4f6", marginBottom: 20 }}>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>Define un rango de potencias para comparar tamaños de muestra.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div style={{ minWidth: 0 }}><Field label="Mínimo" value={pwMin} onChange={setPwMin} placeholder="80" suffix="%" /></div>
                  <div style={{ minWidth: 0 }}><Field label="Máximo" value={pwMax} onChange={setPwMax} placeholder="95" suffix="%" /></div>
                  <div style={{ minWidth: 0 }}><Field label="Incremento" value={pwInc} onChange={setPwInc} placeholder="5" suffix="%" /></div>
                </div>
              </div>
            )}
          </>) : (
            <Field label="Tamaño del grupo 1 (n₁)" tooltip="Número de sujetos en el grupo 1. El grupo 2 se calcula según la razón." value={nInput} onChange={setNInput} placeholder="Ej: 100" />
          )}
        </div>

        {/* Actions */}
        <div className="anim-cinematic" style={{ display: "flex", gap: 10, marginTop: 20, animationDelay: "700ms" }}>
          <button onClick={handleCalc} disabled={!canCalc} style={{ flex: 1, padding: "14px 24px", borderRadius: 12, border: "none", cursor: canCalc ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", background: canCalc ? "linear-gradient(135deg,#10b981,#059669)" : "#e5e7eb", color: canCalc ? "white" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: canCalc ? "0 4px 14px rgba(16,185,129,0.3)" : "none", transition: "all 0.2s ease" }} onMouseDown={e => { if (canCalc) e.currentTarget.style.transform = "scale(0.98)"; }} onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}><CalcIcon /> Calcular</button>
          <button onClick={handleReset} style={{ padding: "14px 20px", borderRadius: 12, border: "2px solid #e5e7eb", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: "white", color: "#6b7280", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s ease" }}><ResetIcon /> Limpiar</button>
        </div>

        {/* ─── RESULTS ─── */}
        {showResult && result && (
          <div style={{ marginTop: 24, animation: "cinematicUp 0.8s cubic-bezier(0.16,1,0.3,1) both" }}>
            <style>{`@keyframes countUp{from{opacity:0;transform:scale(0.5);filter:blur(5px)}to{opacity:1;transform:scale(1);filter:blur(0)}}`}</style>

            {result.type === "sampleSize" && (
              <div style={{ background: "linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)", border: "2px solid #6ee7b7", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "24px 28px 20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#059669", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon /> Resultado</div>
                  <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                    {[{ label: "Grupo 1 (n₁)", value: result.n1, delay: "0.5s" }, { label: "Grupo 2 (n₂)", value: result.n2, delay: "0.6s" }, { label: "Total", value: result.total, delay: "0.7s" }].map(item => (
                      <div key={item.label}><div style={{ fontSize: 12, fontWeight: 600, color: "#059669", marginBottom: 4 }}>{item.label}</div><span style={{ fontSize: 44, fontWeight: 800, color: "#065f46", fontFamily: "'DM Mono',monospace", letterSpacing: "-0.03em", animation: `countUp ${item.delay} cubic-bezier(0.16,1,0.3,1)` }}>{item.value === Infinity ? "∞" : item.value}</span></div>
                    ))}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.6)", padding: "16px 28px", display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                  {result.params.map((p: any, i: number) => (<span key={i} style={{ fontSize: 12, color: "#065f46" }}><b>{p.label}:</b> {p.value}</span>))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.4)", padding: "16px 28px", borderTop: "1px solid rgba(16,185,129,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
                  <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}>
                    <b>Interpretación IA:</b> {result.n1 === Infinity
                      ? "La diferencia absoluta es exactamente igual al margen de equivalencia (δ). Se requiere una muestra infinita."
                      : <>Necesitas <b>{result.n1} sujetos en el grupo 1</b> y <b>{result.n2} en el grupo 2</b> ({result.total} en total) para demostrar que las distribuciones son clínicamente equivalentes, usando el procedimiento TOST.</>
                    }
                  </div>
                </div>
              </div>
            )}

            {result.type === "power" && (
              <div style={{ background: "linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)", border: "2px solid #6ee7b7", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "24px 28px 20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#059669", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon /> Resultado</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 48, fontWeight: 800, color: "#065f46", fontFamily: "'DM Mono',monospace", letterSpacing: "-0.03em", animation: "countUp 0.5s cubic-bezier(0.16,1,0.3,1)" }}>{result.power.toFixed(1)}%</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: "#059669" }}>potencia estadística</span>
                  </div>
                  <PowerBar value={result.power.toFixed(1)} />
                </div>
                <div style={{ background: "rgba(255,255,255,0.6)", padding: "16px 28px", display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                  {result.params.map((p: any, i: number) => (<span key={i} style={{ fontSize: 12, color: "#065f46" }}><b>{p.label}:</b> {p.value}</span>))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.4)", padding: "16px 28px", borderTop: "1px solid rgba(16,185,129,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
                  <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}>
                    <b>Interpretación IA:</b> Con tu muestra tienes una potencia de <b>{result.power.toFixed(1)}%</b> para demostrar equivalencia.
                    {result.power >= 80 ? " Adecuado para la mayoría de estudios de equivalencia." : result.power >= 60 ? " Por debajo del 80% recomendado. Considera aumentar la muestra." : " Insuficiente. Alto riesgo de no detectar equivalencia real."}
                  </div>
                </div>
              </div>
            )}

            {result.type === "range" && (
              <div style={{ background: "white", border: "2px solid #6ee7b7", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", padding: "20px 28px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#059669", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon /> Tabla comparativa</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                    {result.params.map((p: any, i: number) => (<span key={i} style={{ fontSize: 13, color: "#065f46" }}><b>{p.label}:</b> {p.value}</span>))}
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead><tr style={{ background: "#f9fafb" }}>
                      {["Potencia", "Grupo 1 (n₁)", "Grupo 2 (n₂)", "Total"].map((h, i) => (
                        <th key={h} style={{ padding: "12px 20px", textAlign: i === 0 ? "left" : "right", fontWeight: 700, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {result.arr.map((row: any, i: number) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafbfc", transition: "background 0.15s ease" }} onMouseEnter={e => e.currentTarget.style.background = "#ecfdf5"} onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafbfc"}>
                          <td style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", color: "#374151", fontWeight: 500 }}>{row.power}%</td>
                          <td style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 700, color: "#059669", fontFamily: "'DM Mono',monospace" }}>{row.n1 === Infinity ? "∞" : row.n1.toLocaleString()}</td>
                          <td style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 600, color: "#0d9488", fontFamily: "'DM Mono',monospace" }}>{row.n2 === Infinity ? "∞" : row.n2.toLocaleString()}</td>
                          <td style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 700, color: "#065f46", fontFamily: "'DM Mono',monospace" }}>{row.total === Infinity ? "∞" : row.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ background: "rgba(236,253,245,0.5)", padding: "16px 28px", borderTop: "1px solid rgba(16,185,129,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
                  <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}>
                    <b>Interpretación IA:</b> La tabla muestra los tamaños de muestra necesarios para demostrar equivalencia a diferentes niveles de potencia usando el método TOST.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formula */}
        <div className="anim-cinematic" style={{ marginTop: 24, background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "20px 24px", animationDelay: "800ms" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Referencia de fórmula (TOST — Two One-Sided Tests)</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "#374151", background: "#f9fafb", padding: "14px 18px", borderRadius: 10, lineHeight: 2 }}>
            {design === "means" ? (<>
              n₁ = (Z<sub>α</sub> + Z<sub>β</sub>)² · σ² · (1 + 1/r) / (δ − |d|)²<br />
              n₂ = n₁ · r<br />
              <span style={{ color: "#059669" }}>δ = margen de equivalencia, d = diferencia esperada</span>
            </>) : (<>
              n₁ = (Z<sub>α</sub>√V<sub>0</sub> + Z<sub>β</sub>√V<sub>1</sub>)² / (|p₁−p₂| − δ)²<br />
              n₂ = n₁ · r<br />
              <span style={{ color: "#059669" }}>V<sub>0</sub> = Varianza agrupada (H₀), V<sub>1</sub> = Varianza individual (H₁)</span>
            </>)}
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "10px 0 0", lineHeight: 1.5 }}>
            Procedimiento TOST: se realizan dos pruebas unilaterales simultáneas. Se concluye equivalencia si ambas se rechazan al nivel α.
          </p>
        </div>
      </div>
    </div>
  );
}
