import { useState, useEffect } from "react";

/* ─── Utilities ─── */
function normalInv(p: number) {
  const a=[-3.969683028665376e1,2.209460984245205e2,-2.759285104469687e2,1.383577518672690e2,-3.066479806614716e1,2.506628277459239e0];
  const b=[-5.447609879822406e1,1.615858368580409e2,-1.556989798598866e2,6.680131188771972e1,-1.328068155288572e1];
  const c=[-7.784894002430293e-3,-3.223964580411365e-1,-2.400758277161838e0,-2.549732539343734e0,4.374664141464968e0,2.938163982698783e0];
  const d=[7.784695709041462e-3,3.224671290700398e-1,2.445134137142996e0,3.754408661907416e0];
  const pLow=0.02425, pHigh=1-pLow;
  let q, r_val;
  if(p<pLow){ q=Math.sqrt(-2*Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  else if(p<=pHigh){ q=p-0.5; r_val=q*q; return ((((((a[0]*r_val+a[1])*r_val+a[2])*r_val+a[3])*r_val+a[4])*r_val+a[5])*q)/(((((b[0]*r_val+b[1])*r_val+b[2])*r_val+b[3])*r_val+b[4])*r_val+1); }
  else { q=Math.sqrt(-2*Math.log(1-p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
}

function normalCDF(x: number) {
  const t=1/(1+0.2316419*Math.abs(x));
  const d=0.3989422804014327;
  const p=d*Math.exp(-x*x/2)*(t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.8212560+t*1.3302744)))));
  return x>0 ? 1-p : p;
}

/* ─── UI Components ─── */
const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/>
  </svg>
);
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);
const CalcIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <line x1="8" y1="6" x2="16" y2="6"/>
    <line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/>
    <line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/>
    <line x1="8" y1="18" x2="16" y2="18"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const ResetIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
  </svg>
);
const TableIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>
  </svg>
);
const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

function Tooltip({ children, text }: any) {
  const [show, setShow] = useState(false);
  return (
    <span onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} style={{position:"relative",display:"inline-flex",cursor:"help"}}>
      {children}
      {show && (
        <span style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:"#1f2937",color:"#f9fafb",fontSize:12,lineHeight:1.5,padding:"10px 14px",borderRadius:10,width:280,zIndex:100,boxShadow:"0 10px 30px rgba(0,0,0,0.2)",pointerEvents:"none",fontWeight:400}}>
          {text}
          <span style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1f2937"}}/>
        </span>
      )}
    </span>
  );
}

function Stepper({ steps, current }: any) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:32}}>
      {steps.map((s: any, i: number) => {
        const done = current > s.num, active = current === s.num;
        return (
          <div key={s.num} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,background:done?"#10b981":active?"#ecfdf5":"#f3f4f6",color:done?"white":active?"#059669":"#9ca3af",border:active?"2px solid #10b981":done?"2px solid #10b981":"2px solid #e5e7eb",transition:"all 0.3s ease"}}>
                {done ? <CheckIcon/> : s.num}
              </div>
              <span style={{fontSize:13,fontWeight:active?700:500,color:active?"#059669":done?"#10b981":"#9ca3af",transition:"all 0.3s ease",whiteSpace:"nowrap"}}>{s.label}</span>
            </div>
            {i<steps.length-1 && <div style={{flex:1,height:2,marginLeft:12,marginRight:12,background:done?"#10b981":"#e5e7eb",borderRadius:2,transition:"background 0.3s ease"}}/>}
          </div>
        );
      })}
    </div>
  );
}

function CheckOption({ checked, onChange, label, description }: any) {
  return (
    <label style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 16px",borderRadius:12,cursor:"pointer",border:checked?"2px solid #10b981":"2px solid #e5e7eb",background:checked?"#f0fdf4":"white",transition:"all 0.2s ease",marginBottom:8}}>
      <div style={{width:22,height:22,borderRadius:6,flexShrink:0,marginTop:1,border:checked?"2px solid #10b981":"2px solid #d1d5db",background:checked?"#10b981":"white",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s ease"}}>
        {checked && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
      <div>
        <div style={{fontSize:14,fontWeight:600,color:checked?"#065f46":"#374151"}}>{label}</div>
        <div style={{fontSize:12,color:"#6b7280",marginTop:2,lineHeight:1.4}}>{description}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} style={{display:"none"}}/>
    </label>
  );
}

function Field({ label, tooltip, value, onChange, placeholder, suffix, disabled, hint, computed }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
        <label style={{fontSize:13,fontWeight:600,color:computed?"#10b981":"#374151"}}>{label}</label>
        {computed && <span style={{fontSize:10,fontWeight:700,color:"#10b981",background:"#ecfdf5",padding:"2px 8px",borderRadius:6}}>CALCULADO</span>}
        {tooltip && <Tooltip text={tooltip}><span style={{color:"#9ca3af",display:"flex"}}><InfoIcon/></span></Tooltip>}
      </div>
      <div style={{display:"flex",alignItems:"center",border:computed?"2px solid #a7f3d0":focused?"2px solid #10b981":"2px solid #e5e7eb",borderRadius:10,background:disabled?"#f9fafb":computed?"#f0fdf4":"white",transition:"all 0.2s ease",boxShadow:focused?"0 0 0 3px rgba(16,185,129,0.1)":"none",overflow:"hidden"}}>
        <input type="number" value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder={placeholder} disabled={disabled||computed} step="any" style={{flex:1,border:"none",outline:"none",padding:"12px 14px",fontSize:14,fontFamily:"'DM Sans',sans-serif",background:"transparent",color:computed?"#059669":disabled?"#9ca3af":"#111827",fontWeight:computed?700:400}}/>
        {suffix && <span style={{padding:"0 14px",fontSize:13,color:"#6b7280",fontWeight:600,borderLeft:"1px solid #f3f4f6",background:"#f9fafb",alignSelf:"stretch",display:"flex",alignItems:"center"}}>{suffix}</span>}
      </div>
      {hint && <p style={{fontSize:12,color:"#9ca3af",margin:"6px 0 0",lineHeight:1.4}}>{hint}</p>}
    </div>
  );
}

function QuickBtns({ values, current, onSelect, suffix, label }: any) {
  return (
    <div style={{display:"flex",gap:6,marginTop:-12,marginBottom:20,flexWrap:"wrap"}}>
      <span style={{fontSize:11,color:"#9ca3af",fontWeight:600,alignSelf:"center",marginRight:4}}>{label||"Frecuentes:"}</span>
      {values.map((v:any)=>(
        <button key={v} onClick={()=>onSelect(v)} style={{padding:"4px 14px",borderRadius:8,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:current===v?"#ecfdf5":"#f9fafb",color:current===v?"#059669":"#9ca3af",transition:"all 0.15s ease"}}>{v}{suffix||""}</button>
      ))}
    </div>
  );
}

function SL({ step, label }: any) {
  return (
    <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#10b981",marginBottom:16,display:"flex",alignItems:"center",gap:6}}>
      <span style={{width:20,height:2,background:"#10b981",borderRadius:2}}/> {step} · {label}
    </div>
  );
}

/* ─── Math ─── */
function calcCohortN({ p1, p2, r, confidence, power, yates }: any) {
  const alpha=1-confidence/100; const za=Math.abs(normalInv(alpha/2)); const zb=Math.abs(normalInv(1-power/100));
  const p1v=p1/100, p2v=p2/100;
  const q1=1-p1v, q2=1-p2v;
  const pbar=(p1v+r*p2v)/(1+r); const qbar=1-pbar;
  const diff=Math.abs(p1v-p2v);
  
  const t1=za*Math.sqrt((r+1)*pbar*qbar);
  const t2=zb*Math.sqrt(r*p1v*q1+p2v*q2);
  let nExp=Math.pow(t1+t2, 2)/(r*diff*diff);
  
  if(yates) {
    const nR=nExp;
    nExp=(nR/4)*Math.pow(1+Math.sqrt(1+2*(r+1)/(nR*r*diff)), 2);
  }
  
  nExp=Math.max(2, Math.ceil(nExp));
  const nUnexp=Math.max(2, Math.ceil(nExp*r));
  return { exp: nExp, unexp: nUnexp, total: nExp+nUnexp };
}

function calcCohortPow({ p1, p2, r, confidence, nExpInput, yates }: any) {
  const alpha=1-confidence/100; const za=Math.abs(normalInv(alpha/2));
  const p1v=p1/100, p2v=p2/100;
  const q1=1-p1v, q2=1-p2v;
  const pbar=(p1v+r*p2v)/(1+r); const qbar=1-pbar;
  const diff=Math.abs(p1v-p2v);
  
  const n=nExpInput;
  let num;
  if(yates) {
    const yates_factor=(r+1)/(2*n*r);
    num=(diff-yates_factor)*Math.sqrt(n*r)-za*Math.sqrt((r+1)*pbar*qbar);
  } else {
    num=diff*Math.sqrt(n*r)-za*Math.sqrt((r+1)*pbar*qbar);
  }
  const den=Math.sqrt(r*p1v*q1+p2v*q2);
  return Math.max(0, Math.min(100, normalCDF(num/den)*100));
}

export function CohortStudiesCalculator({ onBack }: { onBack?: () => void }) {
  const [mode, setMode] = useState("sampleSize"); // sampleSize, power
  const [design] = useState("independent"); // Kept state variable if needed later
  
  const [conf, setConf] = useState("95");
  const [power, setPower] = useState("80");
  const [ratio, setRatio] = useState("1");
  const [useYates, setUseYates] = useState(false);
  
  const [useP1, setUseP1] = useState(true);
  const [useP2, setUseP2] = useState(true);
  const [useRR, setUseRR] = useState(false);
  
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [rr, setRR] = useState("");
  
  const [useRange, setUseRange] = useState(false);
  const [minPow, setMinPow] = useState("80");
  const [maxPow, setMaxPow] = useState("80");
  const [incPow, setIncPow] = useState("0");
  
  // Power mode
  const [nExp, setNExp] = useState("");
  const [useRangePow, setUseRangePow] = useState(false);
  const [minNExp, setMinNExp] = useState("");
  const [maxNExp, setMaxNExp] = useState("");
  const [incNExp, setIncNExp] = useState("");

  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);

  const steps = [
    { num: 1, label: "Datos de riesgo" },
    { num: 2, label: "Parámetros" },
    { num: 3, label: mode==="sampleSize"?"Potencia":"Muestra" }
  ];
  let currentStep = 1;
  const p1Valid=parseFloat(p1)>0 && parseFloat(p1)<100;
  const p2Valid=parseFloat(p2)>0 && parseFloat(p2)<100;
  const rrValid=parseFloat(rr)>0;
  const validCount = (useP1&&p1Valid?1:0) + (useP2&&p2Valid?1:0) + (useRR&&rrValid?1:0);
  if (validCount>=2) currentStep = 2;
  const ratioValid=parseFloat(ratio)>0;
  if(currentStep===2 && ratioValid && parseFloat(conf)>0) currentStep = 3;

  let canCalc = false;
  if(currentStep===3) {
    if(mode==="sampleSize") {
      if(!useRange && parseFloat(power)>0 && parseFloat(power)<100) canCalc=true;
      if(useRange && parseFloat(minPow)>0 && parseFloat(maxPow)>=parseFloat(minPow) && parseFloat(incPow)>=0) canCalc=true;
    } else {
      if(!useRangePow && parseFloat(nExp)>0) canCalc=true;
      if(useRangePow && parseFloat(minNExp)>0 && parseFloat(maxNExp)>=parseFloat(minNExp) && parseFloat(incNExp)>0) canCalc=true;
    }
  }

  const toggleVar = (v: string) => {
    let vars: Record<string, boolean> = { p1: useP1, p2: useP2, rr: useRR };
    if(vars[v]) {
      // Deselecting: always allow — the stepper won't advance until 2 are valid
      vars[v] = false;
    } else {
      // Selecting: if already 2 active, deactivate the first active one
      const active = Object.keys(vars).filter(k => vars[k]);
      if(active.length >= 2) { vars[active[0]] = false; }
      vars[v] = true;
    }
    setUseP1(vars.p1); setUseP2(vars.p2); setUseRR(vars.rr);
  };

  let cP1=parseFloat(p1), cP2=parseFloat(p2), cRR=parseFloat(rr);
  if(useP1 && useP2 && p1Valid && p2Valid) { cRR = cP1/cP2; }
  else if(useP1 && useRR && p1Valid && rrValid) { cP2 = cP1/cRR; }
  else if(useP2 && useRR && p2Valid && rrValid) { cP1 = cP2*cRR; }

  const handleCalc = () => {
    const r=parseFloat(ratio), confidence=parseFloat(conf), p1_=cP1, p2_=cP2;
    if(mode==="sampleSize") {
      if(!useRange) {
        const res=calcCohortN({p1:p1_,p2:p2_,r,confidence,power:parseFloat(power),yates:useYates});
        setResult({ type:"sampleSize", ...res, params:[{label:"p₁",value:`${p1_.toFixed(2)}%`},{label:"p₂",value:`${p2_.toFixed(2)}%`},{label:"Confianza",value:`${confidence}%`},{label:"Potencia",value:`${power}%`}]});
      } else {
        const arr: any[]=[]; const min=parseFloat(minPow), max=parseFloat(maxPow), inc=parseFloat(incPow)||1;
        for(let pw=min; pw<=max+0.001; pw+=inc) {
          const res=calcCohortN({p1:p1_,p2:p2_,r,confidence,power:pw,yates:useYates});
          arr.push({ power:parseFloat(pw.toFixed(1)), ...res });
        }
        setResult({ type:"range", arr, params:[{label:"p₁",value:`${p1_.toFixed(2)}%`},{label:"p₂",value:`${p2_.toFixed(2)}%`},{label:"Confianza",value:`${confidence}%`}]});
      }
    } else {
      if(!useRangePow) {
        const pow = calcCohortPow({p1:p1_,p2:p2_,r,confidence,nExpInput:parseFloat(nExp),yates:useYates});
        setResult({ type:"power", power:pow, params:[{label:"p₁",value:`${p1_.toFixed(2)}%`},{label:"p₂",value:`${p2_.toFixed(2)}%`},{label:"Confianza",value:`${confidence}%`},{label:"n expuestos",value:nExp}]});
      } else {
        const arr: any[]=[]; const minN=parseFloat(minNExp), maxN=parseFloat(maxNExp), incN=parseFloat(incNExp)||1;
        for(let n=minN; n<=maxN+0.001; n+=incN) {
          const pow=calcCohortPow({p1:p1_,p2:p2_,r,confidence,nExpInput:n,yates:useYates});
          arr.push({ nExp:Math.ceil(n), nUnexp:Math.ceil(n*r), total:Math.ceil(n)+Math.ceil(n*r), power:parseFloat(pow.toFixed(1)) });
        }
        setResult({ type:"rangePower", arr, params:[{label:"p₁",value:`${p1_.toFixed(2)}%`},{label:"p₂",value:`${p2_.toFixed(2)}%`},{label:"Confianza",value:`${confidence}%`}]});
      }
    }
    setShowResult(true);
  };

  const handleReset = () => {
    setConf("95"); setPower("80"); setRatio("1"); setUseYates(false); setShowResult(false); setResult(null);
    setUseP1(true); setUseP2(true); setUseRR(false); setP1(""); setP2(""); setRR("");
    setUseRange(false); setMinPow("80"); setMaxPow("80"); setIncPow("0"); setNExp(""); setMode("sampleSize");
    setUseRangePow(false); setMinNExp(""); setMaxNExp(""); setIncNExp("");
  };

  return (
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#fafbfc",minHeight:"100vh",color:"#1a1a2e"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes cinematicUp { from { opacity: 0; transform: translateY(40px) scale(0.98); filter: blur(8px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
        @keyframes fadeRight { from { opacity: 0; transform: translateX(-30px); filter: blur(4px); } to { opacity: 1; transform: translateX(0); filter: blur(0); } }
        .anim-cinematic { animation: cinematicUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .anim-fadeRight { animation: fadeRight 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
      <div style={{maxWidth:720,margin:"0 auto",padding:"28px 24px 60px"}}>

        {/* Breadcrumb */}
        <div className="anim-fadeRight" style={{display:"flex",alignItems:"center",gap:8,marginBottom:24,fontSize:13,color:"#6b7280",fontWeight:500}}>
          <span onClick={onBack} style={{cursor:"pointer",color:"#10b981",display:"flex",alignItems:"center",gap:4}}><BackIcon/> Muestreo</span>
          <span style={{color:"#d1d5db"}}>/</span><span style={{color:"#9ca3af"}}>Contraste de hipótesis</span>
          <span style={{color:"#d1d5db"}}>/</span><span style={{color:"#374151"}}>Estudios de cohorte</span>
        </div>

        {/* Title */}
        <div className="anim-fadeRight" style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:8,animationDelay:"100ms"}}>
          <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",display:"flex",alignItems:"center",justifyContent:"center",color:"#059669",flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <h1 style={{fontSize:24,fontWeight:800,margin:0,color:"#111827",letterSpacing:"-0.02em"}}>Estudios de Cohorte</h1>
            <p style={{fontSize:14,color:"#6b7280",margin:"4px 0 0",lineHeight:1.5}}>Contraste de hipótesis — Calcula el tamaño de muestra o potencia para detectar una diferencia de riegos (Riesgo Relativo).</p>
          </div>
        </div>

        <div className="anim-cinematic" style={{animationDelay:"200ms"}}>
          <Stepper steps={steps} current={currentStep}/>
        </div>

        {/* Form */}
        <div className="anim-cinematic" style={{animationDelay:"300ms",background:"white",borderRadius:16,border:"1.5px solid #e5e7eb",padding:"28px 28px 8px",boxShadow:"0 1px 4px rgba(0,0,0,0.03)"}}>

          <SL step="Paso 1" label="Datos (Escoger dos opciones)"/>
          <CheckOption checked={useP1} onChange={()=>toggleVar("p1")} label="Riesgo en expuestos" description="Tasa de incidencia o riesgo en el grupo expuesto"/>
          {useP1 && <Field value={p1} onChange={setP1} placeholder="Ej: 40" suffix="%" hint={useP2 && useRR ? "Se calcula automáticamente" : "Ingrese el riesgo en expuestos"} computed={useP2&&useRR} />}
          
          <CheckOption checked={useP2} onChange={()=>toggleVar("p2")} label="Riesgo en no expuestos" description="Tasa de incidencia basal en el grupo no expuesto"/>
          {useP2 && <Field value={p2} onChange={setP2} placeholder="Ej: 20" suffix="%" hint={useP1 && useRR ? "Se calcula automáticamente" : "Ingrese el riesgo en no expuestos"} computed={useP1&&useRR} />}
          
          <CheckOption checked={useRR} onChange={()=>toggleVar("rr")} label="Riesgo relativo a detectar" description="Razón entre el riesgo en expuestos y no expuestos (RR)"/>
          {useRR && <Field value={rr} onChange={setRR} placeholder="Ej: 2.0" hint={useP1 && useP2 ? "Se calcula automáticamente (p₁/p₂)" : "Ingrese el RR a detectar"} computed={useP1&&useP2} />}

          {(useP1&&useP2&&p1Valid&&p2Valid) && <div style={{background:"#f0fdf4",border:"1.5px solid #a7f3d0",borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:10,marginBottom:20}}><div style={{color:"#10b981",display:"flex"}}><LinkIcon/></div><div style={{fontSize:13,color:"#065f46"}}><b>RR calculado:</b> {(cP1/cP2).toFixed(3)} — Razón de p₁ y p₂</div></div>}

          <div style={{height:1,background:"#f3f4f6",margin:"24px 0 20px"}}/>

          <SL step="Paso 2" label="Parámetros de diseño"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <Field label="Razón no expuestos/ expuestos" value={ratio} onChange={setRatio} placeholder="1" hint="Asignación (1 = grupos del mismo tamaño)"/>
            </div>
            <div>
              <Field label="Nivel de confianza" value={conf} onChange={setConf} suffix="%" />
            </div>
          </div>
          <QuickBtns values={["90","95","99"]} current={conf} onSelect={setConf} suffix="%" />

          <label style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:useYates?"#ecfdf5":"#f9fafb",border:useYates?"1px solid #a7f3d0":"1px solid #f3f4f6",borderRadius:10,cursor:"pointer",marginTop:10,marginBottom:20}}>
            <input type="checkbox" checked={useYates} onChange={e=>setUseYates(e.target.checked)} style={{accentColor:"#10b981",width:16,height:16}}/>
            <span style={{fontSize:13,fontWeight:600,color:useYates?"#065f46":"#374151"}}>Aplicar corrección por continuidad de Yates Xc²</span>
          </label>

          <div style={{height:1,background:"#f3f4f6",margin:"24px 0 20px"}}/>

          <SL step="Paso 3" label="Calcular"/>
          <div style={{display:"flex",gap:4,background:"#f3f4f6",borderRadius:12,padding:4,marginBottom:20}}>
            {[{id:"sampleSize",label:"Tamaño de la muestra"},{id:"power",label:"Potencia"}].map(m=>(
              <button key={m.id} onClick={()=>{setMode(m.id);setShowResult(false);setResult(null);}} style={{flex:1,padding:"11px 16px",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:mode===m.id?"white":"transparent",color:mode===m.id?"#111827":"#6b7280",boxShadow:mode===m.id?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>
                <div style={{width:16,height:16,borderRadius:"50%",border:mode===m.id?"4px solid #10b981":"2px solid #d1d5db",background:"white"}}/> {m.label}
              </button>
            ))}
          </div>

          {mode==="sampleSize" ? (
            <div style={{background:"#f9fafb",borderRadius:12,padding:"20px 20px 4px",border:"1px solid #f3f4f6"}}>
              <div style={{display:"flex",gap:4,background:"#e5e7eb",borderRadius:8,padding:3,marginBottom:16,alignSelf:"flex-start",width:"fit-content"}}>
                <button onClick={()=>setUseRange(false)} style={{padding:"6px 12px",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:!useRange?"white":"transparent",color:!useRange?"#111827":"#6b7280",boxShadow:!useRange?"0 1px 2px rgba(0,0,0,0.06)":"none"}}>Valor único</button>
                <button onClick={()=>setUseRange(true)} style={{padding:"6px 12px",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,background:useRange?"white":"transparent",color:useRange?"#111827":"#6b7280",boxShadow:useRange?"0 1px 2px rgba(0,0,0,0.06)":"none"}}><TableIcon/> Rango</button>
              </div>
              {!useRange ? (
                <>
                  <Field label="Potencia (%)" value={power} onChange={setPower} placeholder="80" suffix="%" />
                  <QuickBtns values={["80","85","90","95"]} current={power} onSelect={setPower} suffix="%" />
                </>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  <div style={{minWidth:0}}><Field label="Mínimo" value={minPow} onChange={setMinPow} placeholder="Min" suffix="%"/></div>
                  <div style={{minWidth:0}}><Field label="Máximo" value={maxPow} onChange={setMaxPow} placeholder="Max" suffix="%"/></div>
                  <div style={{minWidth:0}}><Field label="Incremento" value={incPow} onChange={setIncPow} placeholder="Inc" suffix="%"/></div>
                </div>
              )}
            </div>
          ) : (
            <div style={{background:"#f9fafb",borderRadius:12,padding:"20px 20px 4px",border:"1px solid #f3f4f6"}}>
              <div style={{display:"flex",gap:4,background:"#e5e7eb",borderRadius:8,padding:3,marginBottom:16,alignSelf:"flex-start",width:"fit-content"}}>
                <button onClick={()=>setUseRangePow(false)} style={{padding:"6px 12px",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:!useRangePow?"white":"transparent",color:!useRangePow?"#111827":"#6b7280",boxShadow:!useRangePow?"0 1px 2px rgba(0,0,0,0.06)":"none"}}>Valor único</button>
                <button onClick={()=>setUseRangePow(true)} style={{padding:"6px 12px",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,background:useRangePow?"white":"transparent",color:useRangePow?"#111827":"#6b7280",boxShadow:useRangePow?"0 1px 2px rgba(0,0,0,0.06)":"none"}}><TableIcon/> Rango</button>
              </div>
              {!useRangePow ? (
                <Field label="Número de expuestos" value={nExp} onChange={setNExp} placeholder="Ej: 100" />
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  <div style={{minWidth:0}}><Field label="Mínimo" value={minNExp} onChange={setMinNExp} placeholder="Min"/></div>
                  <div style={{minWidth:0}}><Field label="Máximo" value={maxNExp} onChange={setMaxNExp} placeholder="Max"/></div>
                  <div style={{minWidth:0}}><Field label="Incremento" value={incNExp} onChange={setIncNExp} placeholder="Inc"/></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="anim-cinematic" style={{display:"flex",gap:10,marginTop:20,animationDelay:"400ms"}}>
          <button onClick={handleCalc} disabled={!canCalc as any} style={{flex:1,padding:"14px 24px",borderRadius:12,border:"none",cursor:canCalc?"pointer":"not-allowed",fontSize:15,fontWeight:700,fontFamily:"inherit",background:canCalc?"linear-gradient(135deg,#10b981,#059669)":"#e5e7eb",color:canCalc?"white":"#9ca3af",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:canCalc?"0 4px 14px rgba(16,185,129,0.3)":"none",transition:"all 0.2s ease"}} onMouseDown={e=>{if(canCalc)e.currentTarget.style.transform="scale(0.98)"}} onMouseUp={e=>{e.currentTarget.style.transform="scale(1)"}}><CalcIcon/> Calcular</button>
          <button onClick={handleReset} style={{padding:"14px 20px",borderRadius:12,border:"2px solid #e5e7eb",cursor:"pointer",fontSize:14,fontWeight:600,fontFamily:"inherit",background:"white",color:"#6b7280",display:"flex",alignItems:"center",gap:6,transition:"all 0.2s ease"}}><ResetIcon/> Limpiar</button>
        </div>

        {/* ─── RESULTS ─── */}
        {showResult&&result&&(
          <div style={{marginTop:24,animation:"cinematicUp 0.8s cubic-bezier(0.16,1,0.3,1) both"}}>
            <style>{`@keyframes countUp{from{opacity:0;transform:scale(0.5);filter:blur(5px)}to{opacity:1;transform:scale(1);filter:blur(0)}}`}</style>
            
            {result.type==="sampleSize"&&(
              <div style={{background:"linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)",border:"2px solid #6ee7b7",borderRadius:16,overflow:"hidden"}}>
                <div style={{padding:"24px 28px 20px"}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#059669",marginBottom:16,display:"flex",alignItems:"center",gap:6}}><CheckIcon/> Tamaño de muestra</div>
                  <div style={{display:"flex",gap:32,flexWrap:"wrap"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"#059669",marginBottom:4}}>Expuestos (n₁)</div>
                      <span style={{fontSize:44,fontWeight:800,color:"#065f46",fontFamily:"'DM Mono',monospace",letterSpacing:"-0.03em",animation:"countUp 0.5s cubic-bezier(0.16,1,0.3,1)"}}>{result.exp}</span>
                    </div>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"#059669",marginBottom:4}}>No expuestos (n₂)</div>
                      <span style={{fontSize:44,fontWeight:800,color:"#065f46",fontFamily:"'DM Mono',monospace",letterSpacing:"-0.03em",animation:"countUp 0.6s cubic-bezier(0.16,1,0.3,1)"}}>{result.unexp}</span>
                    </div>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"#059669",marginBottom:4}}>Total</div>
                      <span style={{fontSize:44,fontWeight:800,color:"#065f46",fontFamily:"'DM Mono',monospace",letterSpacing:"-0.03em",animation:"countUp 0.7s cubic-bezier(0.16,1,0.3,1)"}}>{result.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result.type==="power"&&(
              <div style={{background:"linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)",border:"2px solid #6ee7b7",borderRadius:16,overflow:"hidden"}}>
                <div style={{padding:"24px 28px 20px"}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#059669",marginBottom:16,display:"flex",alignItems:"center",gap:6}}><CheckIcon/> Potencia Estadística</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                    <span style={{fontSize:48,fontWeight:800,color:"#065f46",fontFamily:"'DM Mono',monospace",letterSpacing:"-0.03em",animation:"countUp 0.5s cubic-bezier(0.16,1,0.3,1)"}}>{result.power.toFixed(1)}</span>
                    <span style={{fontSize:16,fontWeight:600,color:"#059669"}}>%</span>
                  </div>
                  <div style={{marginTop:20}}>
                    <div style={{height:8,borderRadius:4,background:"rgba(255,255,255,0.6)",overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,background:result.power>=80?"#10b981":result.power>=60?"#eab308":"#ef4444",width:`${Math.min(100,result.power)}%`,transition:"width 0.4s ease"}}/></div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:6,color:"#059669"}}><span>0%</span><span style={{fontWeight:700}}>{result.power>=80?"Óptima":result.power>=60?"Baja":"Insuficiente"}</span><span>100%</span></div>
                  </div>
                </div>
              </div>
            )}

            {result.type==="range"&&(
              <div style={{background:"white",border:"2px solid #6ee7b7",borderRadius:16,overflow:"hidden"}}>
                <div style={{background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",padding:"20px 28px"}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#059669",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><CheckIcon/> Tabla de tamaños de muestra</div>
                  <p style={{fontSize:13,color:"#065f46",margin:0}}>Según diferentes niveles de potencia</p>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                    <thead>
                      <tr style={{background:"#f9fafb"}}>
                        {["Potencia","Expuestos (n₁)","No expuestos (n₂)","Total"].map((h,i)=>(
                          <th key={h} style={{padding:"12px 20px",textAlign:i===0?"left":"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e5e7eb"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.arr.map((row:any,i:number)=>(
                        <tr key={i} style={{background:i%2===0?"white":"#fafbfc",transition:"background 0.15s ease"}} onMouseEnter={e=>e.currentTarget.style.background="#ecfdf5"} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"white":"#fafbfc"}>
                          <td style={{padding:"12px 20px",borderBottom:"1px solid #f3f4f6",textAlign:"left",fontWeight:500,color:"#374151"}}>{row.power}%</td>
                          <td style={{padding:"12px 20px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:700,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{row.exp}</td>
                          <td style={{padding:"12px 20px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:700,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{row.unexp}</td>
                          <td style={{padding:"12px 20px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:700,color:"#065f46",fontFamily:"'DM Mono',monospace"}}>{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.type==="rangePower"&&(
              <div style={{background:"white",border:"2px solid #6ee7b7",borderRadius:16,overflow:"hidden"}}>
                <div style={{background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",padding:"20px 28px"}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#059669",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><CheckIcon/> Tabla de potencia</div>
                  <p style={{fontSize:13,color:"#065f46",margin:0}}>Según diferentes tamaños de muestra</p>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                    <thead>
                      <tr style={{background:"#f9fafb"}}>
                        {["Expuestos (n₁)","No expuestos (n₂)","Total","Potencia"].map((h,i)=>(
                          <th key={h} style={{padding:"12px 20px",textAlign:i===0?"left":"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e5e7eb"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.arr.map((row:any,i:number)=>(
                        <tr key={i} style={{background:i%2===0?"white":"#fafbfc",transition:"background 0.15s ease"}} onMouseEnter={e=>e.currentTarget.style.background="#ecfdf5"} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"white":"#fafbfc"}>
                          <td style={{padding:"12px 20px",borderBottom:"1px solid #f3f4f6",textAlign:"left",fontWeight:500,color:"#374151"}}>{row.nExp}</td>
                          <td style={{padding:"12px 20px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:700,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{row.nUnexp}</td>
                          <td style={{padding:"12px 20px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:700,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{row.total}</td>
                          <td style={{padding:"12px 20px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:700,color:"#065f46",fontFamily:"'DM Mono',monospace"}}>{row.power}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formula */}
        <div className="anim-cinematic" style={{marginTop:24,background:"white",borderRadius:14,border:"1.5px solid #e5e7eb",padding:"20px 24px",animationDelay:"500ms"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Referencia de fórmula (Fleiss / Kelsey)</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#374151",background:"#f9fafb",padding:"14px 18px",borderRadius:10,lineHeight:2}}>
            n<sub>exp</sub> = [Z<sub>α/2</sub>√((r+1)p̄q̄) + Z<sub>β</sub>√(rp₁q₁+p₂q₂)]² / [r(p₁−p₂)²]<br/>
            n<sub>no_exp</sub> = n<sub>exp</sub> · r
            {useYates&&<><br/><span style={{color:"#059669"}}>Con corrección por continuidad de Yates Xc²</span></>}
          </div>
        </div>
      </div>
    </div>
  );
}
