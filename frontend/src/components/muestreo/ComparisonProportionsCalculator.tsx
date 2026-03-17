import { useState, useEffect } from "react";

/* ─── Utilities ─── */
function normalInv(p: number){const a=[-3.969683028665376e1,2.209460984245205e2,-2.759285104469687e2,1.383577518672690e2,-3.066479806614716e1,2.506628277459239e0];const b=[-5.447609879822406e1,1.615858368580409e2,-1.556989798598866e2,6.680131188771972e1,-1.328068155288572e1];const c=[-7.784894002430293e-3,-3.223964580411365e-1,-2.400758277161838e0,-2.549732539343734e0,4.374664141464968e0,2.938163982698783e0];const d=[7.784695709041462e-3,3.224671290700398e-1,2.445134137142996e0,3.754408661907416e0];const pLow=0.02425,pHigh=1-pLow;let q,r;if(p<pLow){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}else if(p<=pHigh){q=p-0.5;r=q*q;return((((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q)/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)}else{q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}}
function normalCDF(x: number){const t=1/(1+0.2316419*Math.abs(x));const d=0.3989422804014327;const p=d*Math.exp(-x*x/2)*(t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.8212560+t*1.3302744)))));return x>0?1-p:p;}

interface IndepParams { p1: number; p2: number; ratio: number; confidence: number; yates: boolean; }
interface IndepSampleParams extends IndepParams { power: number; }
interface IndepPowerParams extends IndepParams { n1Input: number; }
interface IndepRangeParams extends IndepParams { min: number; max: number; increment: number; }
interface PairedParams { p1: number; p2: number; confidence: number; }
interface PairedSampleParams extends PairedParams { power: number; }
interface PairedPowerParams extends PairedParams { nInput: number; }
interface PairedRangeParams extends PairedParams { min: number; max: number; increment: number; }

/* ─── Independent Proportions (Fleiss) ─── */
function calcIndepPropN({p1,p2,ratio,confidence,power,yates}: IndepSampleParams){
  const alpha=1-confidence/100;const za=Math.abs(normalInv(alpha/2));const zb=Math.abs(normalInv(1-power/100));
  const r=ratio;const q1=1-p1,q2=1-p2;
  const pbar=(p1+r*p2)/(1+r);const qbar=1-pbar;const diff=Math.abs(p1-p2);
  const t1=za*Math.sqrt((1+1/r)*pbar*qbar);const t2=zb*Math.sqrt(p1*q1+p2*q2/r);
  let n1=Math.pow(t1+t2,2)/(diff*diff);
  if(yates){const nRaw=n1;n1=(nRaw/4)*Math.pow(1+Math.sqrt(1+2*(1+1/r)/(nRaw*diff)),2);}
  n1=Math.max(2,Math.ceil(n1));const n2=Math.max(2,Math.ceil(n1*r));
  return{n1,n2,total:n1+n2};
}
function calcIndepPropPower({p1,p2,ratio,confidence,n1Input,yates}: IndepPowerParams){
  const alpha=1-confidence/100;const za=Math.abs(normalInv(alpha/2));
  const r=ratio;const q1=1-p1,q2=1-p2;const n1=n1Input;
  const pbar=(p1+r*p2)/(1+r);const qbar=1-pbar;const diff=Math.abs(p1-p2);
  let effectiveN=n1;
  if(yates){effectiveN=n1;/* Yates reduces effective sample but leaving direct approx for simplicity */}
  const num=diff*Math.sqrt(effectiveN)-za*Math.sqrt((1+1/r)*pbar*qbar);
  const den=Math.sqrt(p1*q1+p2*q2/r);
  const zb=num/den;
  return Math.max(0,Math.min(100,normalCDF(zb)*100));
}
function calcIndepPropRange({p1,p2,ratio,confidence,yates,min,max,increment}: IndepRangeParams){
  const res: any[]=[];for(let pw=min;pw<=max+0.0001;pw+=increment){
    const r=calcIndepPropN({p1,p2,ratio,confidence,power:pw,yates});
    res.push({power:parseFloat(pw.toFixed(1)),...r});
  }return res;
}

/* ─── Paired Proportions (McNemar) ─── */
function calcPairedPropN({p1,p2,confidence,power}: PairedSampleParams){
  const alpha=1-confidence/100;const za=Math.abs(normalInv(alpha/2));const zb=Math.abs(normalInv(1-power/100));
  const p12=p1*(1-p2);const p21=(1-p1)*p2;const pd=p12+p21;const diff=p1-p2;
  const t1=za*Math.sqrt(pd);const t2=zb*Math.sqrt(pd-diff*diff);
  const n=Math.max(3,Math.ceil(Math.pow(t1+t2,2)/(diff*diff)));
  return{n,p12,p21,pd};
}
function calcPairedPropPower({p1,p2,confidence,nInput}: PairedPowerParams){
  const alpha=1-confidence/100;const za=Math.abs(normalInv(alpha/2));
  const p12=p1*(1-p2);const p21=(1-p1)*p2;const pd=p12+p21;const diff=Math.abs(p1-p2);
  const num=diff*Math.sqrt(nInput)-za*Math.sqrt(pd);const den=Math.sqrt(pd-diff*diff);
  if(den<=0) return 0;const zb=num/den;
  return Math.max(0,Math.min(100,normalCDF(zb)*100));
}
function calcPairedPropRange({p1,p2,confidence,min,max,increment}: PairedRangeParams){
  const res: any[]=[];for(let pw=min;pw<=max+0.0001;pw+=increment){
    const r=calcPairedPropN({p1,p2,confidence,power:pw});
    res.push({power:parseFloat(pw.toFixed(1)),n:r.n});
  }return res;
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
function Tooltip({children,text}: {children: React.ReactNode, text: string}){const[show,setShow]=useState(false);return(<span onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} style={{position:"relative",display:"inline-flex",cursor:"help"}}>{children}{show&&(<span style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:"#1f2937",color:"#f9fafb",fontSize:12,lineHeight:1.5,padding:"10px 14px",borderRadius:10,width:280,zIndex:100,boxShadow:"0 10px 30px rgba(0,0,0,0.2)",pointerEvents:"none",fontWeight:400}}>{text}<span style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1f2937"}}/></span>)}</span>)}
function Stepper({steps,current}: {steps: {num: number, label: string}[], current: number}){return(<div style={{display:"flex",alignItems:"center",gap:0,marginBottom:32}}>{steps.map((s,i)=>{const done=current>s.num,active=current===s.num;return(<div key={s.num} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:"none"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,background:done?"#10b981":active?"#ecfdf5":"#f3f4f6",color:done?"white":active?"#059669":"#9ca3af",border:active?"2px solid #10b981":done?"2px solid #10b981":"2px solid #e5e7eb",transition:"all 0.3s ease"}}>{done?<CheckIcon/>:s.num}</div><span style={{fontSize:13,fontWeight:active?700:500,color:active?"#059669":done?"#10b981":"#9ca3af",whiteSpace:"nowrap"}}>{s.label}</span></div>{i<steps.length-1&&<div style={{flex:1,height:2,marginLeft:12,marginRight:12,background:done?"#10b981":"#e5e7eb",borderRadius:2}}/>}</div>)})}</div>)}
function Field({label,tooltip,value,onChange,placeholder,suffix,hint,disabled}: {label: string, tooltip?: string, value: string, onChange: (v: string) => void, placeholder?: string, suffix?: string, hint?: string, disabled?: boolean}){const[focused,setFocused]=useState(false);return(<div style={{marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><label style={{fontSize:13,fontWeight:600,color:"#374151"}}>{label}</label>{tooltip&&<Tooltip text={tooltip}><span style={{color:"#9ca3af",display:"flex"}}><InfoIcon/></span></Tooltip>}</div><div style={{display:"flex",alignItems:"center",border:focused?"2px solid #10b981":"2px solid #e5e7eb",borderRadius:10,background:disabled?"#f9fafb":"white",transition:"all 0.2s ease",boxShadow:focused?"0 0 0 3px rgba(16,185,129,0.1)":"none",overflow:"hidden"}}><input type="number" value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder={placeholder} disabled={disabled} step="any" style={{flex:1,border:"none",outline:"none",padding:"12px 14px",fontSize:14,fontFamily:"'DM Sans',sans-serif",background:"transparent",color:disabled?"#9ca3af":"#111827"}}/>{suffix&&<span style={{padding:"0 14px",fontSize:13,color:"#6b7280",fontWeight:600,borderLeft:"1px solid #f3f4f6",background:"#f9fafb",alignSelf:"stretch",display:"flex",alignItems:"center"}}>{suffix}</span>}</div>{hint&&<p style={{fontSize:12,color:"#9ca3af",margin:"6px 0 0",lineHeight:1.4}}>{hint}</p>}</div>)}
function RadioCard({selected,onClick,label,description}: {selected: boolean, onClick: () => void, label: string, description?: string}){return(<div onClick={onClick} style={{padding:"14px 16px",borderRadius:12,cursor:"pointer",border:selected?"2px solid #10b981":"2px solid #e5e7eb",background:selected?"#f0fdf4":"white",transition:"all 0.2s ease",flex:1}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,border:selected?"6px solid #10b981":"2px solid #d1d5db",background:"white",transition:"all 0.2s ease"}}/><div><div style={{fontSize:14,fontWeight:600,color:selected?"#065f46":"#374151"}}>{label}</div>{description&&<div style={{fontSize:12,color:"#6b7280",marginTop:2,lineHeight:1.4}}>{description}</div>}</div></div></div>)}
function QuickBtns({values,current,onSelect,suffix}: {values: string[], current: string, onSelect: (v: string) => void, suffix?: string}){return(<div style={{display:"flex",gap:6,marginTop:-12,marginBottom:20,flexWrap:"wrap"}}><span style={{fontSize:11,color:"#9ca3af",fontWeight:600,alignSelf:"center",marginRight:4}}>Frecuentes:</span>{values.map(v=>(<button key={v} onClick={()=>onSelect(v)} style={{padding:"4px 14px",borderRadius:8,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:current===v?"#ecfdf5":"#f9fafb",color:current===v?"#059669":"#9ca3af",transition:"all 0.15s ease"}}>{v}{suffix||""}</button>))}</div>)}
function SL({step,label}: {step: string, label: string}){return(<div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#10b981",marginBottom:16,display:"flex",alignItems:"center",gap:6}}><span style={{width:20,height:2,background:"#10b981",borderRadius:2,display:"inline-block"}}/>{step} · {label}</div>)}
function PowerBar({value}: {value: string}){const pw=parseFloat(value)||0;const color=pw>=80?"#10b981":pw>=60?"#eab308":"#ef4444";const label=pw>=80?"Adecuada":pw>=60?"Baja":"Insuficiente";return(<div style={{marginBottom:20}}><div style={{height:8,borderRadius:4,background:"#f3f4f6",overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,background:color,width:`${Math.min(100,pw)}%`,transition:"width 0.4s ease"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:6}}><span style={{color:"#9ca3af"}}>0%</span><span style={{color,fontWeight:700}}>Potencia {pw.toFixed(1)}% — {label}</span><span style={{color:"#9ca3af"}}>100%</span></div></div>)}

/* ─── Proportion Visual ─── */
function PropCompare({p1,p2}: {p1: string, p2: string}){
  const v1=parseFloat(p1)||0,v2=parseFloat(p2)||0;
  if(!v1&&!v2) return null;
  const max=Math.max(v1,v2,1);
  return(<div style={{background:"#f9fafb",borderRadius:12,padding:"14px 16px",border:"1px solid #f3f4f6",marginBottom:20}}>
    <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Comparación visual</div>
    {[{label:"Población 1",val:v1,color:"#10b981"},{label:"Población 2",val:v2,color:"#0d9488"}].map(g=>(
      <div key={g.label} style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#374151",fontWeight:600,marginBottom:4}}><span>{g.label}</span><span>{g.val.toFixed(1)}%</span></div>
        <div style={{height:8,borderRadius:4,background:"#e5e7eb",overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,background:g.color,width:`${(g.val/max)*100}%`,transition:"width 0.3s ease"}}/></div>
      </div>
    ))}
    {v1>0&&v2>0&&<div style={{fontSize:12,color:"#6b7280",marginTop:8}}>Diferencia: <b style={{color:"#059669"}}>{Math.abs(v1-v2).toFixed(1)} puntos porcentuales</b></div>}
  </div>);
}

/* ─── McNemar Table Preview ─── */
function McNemarPreview({p1,p2}: {p1: string, p2: string}){
  const v1=parseFloat(p1)/100,v2=parseFloat(p2)/100;
  if(!v1||!v2||v1<=0||v1>=1||v2<=0||v2>=1) return null;
  const p11=(v1*v2*100).toFixed(1),p12=(v1*(1-v2)*100).toFixed(1),p21=((1-v1)*v2*100).toFixed(1),p22=((1-v1)*(1-v2)*100).toFixed(1);
  return(<div style={{background:"#f9fafb",borderRadius:12,padding:"16px",border:"1px solid #f3f4f6",marginBottom:20}}>
    <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Tabla de McNemar esperada (bajo independencia)</div>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
      <thead><tr><th style={{padding:8,border:"1px solid #e5e7eb"}}></th><th style={{padding:8,border:"1px solid #e5e7eb",background:"#ecfdf5",color:"#059669",fontWeight:700,fontSize:11}}>Cond.2 (+)</th><th style={{padding:8,border:"1px solid #e5e7eb",background:"#fef2f2",color:"#dc2626",fontWeight:700,fontSize:11}}>Cond.2 (−)</th></tr></thead>
      <tbody>
        <tr><td style={{padding:8,border:"1px solid #e5e7eb",fontWeight:600,fontSize:11,background:"#ecfdf5",color:"#059669"}}>Cond.1 (+)</td><td style={{padding:8,border:"1px solid #e5e7eb",textAlign:"center"}}>{p11}%</td><td style={{padding:8,border:"1px solid #e5e7eb",textAlign:"center",background:"#fef9c3",fontWeight:700,color:"#92400e"}}>{p12}%</td></tr>
        <tr><td style={{padding:8,border:"1px solid #e5e7eb",fontWeight:600,fontSize:11,background:"#fef2f2",color:"#dc2626"}}>Cond.1 (−)</td><td style={{padding:8,border:"1px solid #e5e7eb",textAlign:"center",background:"#fef9c3",fontWeight:700,color:"#92400e"}}>{p21}%</td><td style={{padding:8,border:"1px solid #e5e7eb",textAlign:"center"}}>{p22}%</td></tr>
      </tbody>
    </table>
    <div style={{fontSize:12,color:"#6b7280",marginTop:8}}>Pares discordantes (resaltados): <b>{(parseFloat(p12)+parseFloat(p21)).toFixed(1)}%</b> — son los que determinan el tamaño de muestra.</div>
  </div>);
}
/* ─── Main ─── */
interface ComparisonProportionsProps { onBack?: () => void; }

export function ComparisonProportionsCalculator({ onBack }: ComparisonProportionsProps){
  const[design,setDesign]=useState("independent");
  const[mode,setMode]=useState("sampleSize");
  const[p1,setP1]=useState("");
  const[p2,setP2]=useState("");
  const[ratio,setRatio]=useState("1");
  const[yates,setYates]=useState(false);
  const[confidence,setConfidence]=useState("95");
  const[useRange,setUseRange]=useState(false);
  const[pwMin,setPwMin]=useState("");
  const[pwMax,setPwMax]=useState("");
  const[pwInc,setPwInc]=useState("");
  const[nInput,setNInput]=useState("");
  const[result,setResult]=useState<any>(null);
  const[showResult,setShowResult]=useState(false);
  const[currentStep,setCurrentStep]=useState(1);

  const steps=design==="independent"
    ?[{num:1,label:"Datos"},{num:2,label:"Diseño"},{num:3,label:"Potencia"}]
    :[{num:1,label:"Datos"},{num:2,label:"Confianza"},{num:3,label:"Potencia"}];

  useEffect(()=>{
    const hasData=p1&&p2;
    const hasPw=mode==="sampleSize"?(pwMin||(useRange&&pwMax)):nInput;
    if(hasPw&&hasData&&confidence) setCurrentStep(3);
    else if(hasData&&(design==="independent"?ratio:confidence)) setCurrentStep(2);
    else setCurrentStep(1);
  },[p1,p2,ratio,confidence,pwMin,pwMax,nInput,mode,design]);

  const handleCalc=()=>{
    const pp1=parseFloat(p1)/100,pp2=parseFloat(p2)/100,confNum=parseFloat(confidence);
    if(!pp1||!pp2||!confNum||pp1===pp2) return;
    const r=parseFloat(ratio)||1;

    if(design==="independent"){
      if(mode==="sampleSize"){
        if(useRange){
          const mn=parseFloat(pwMin),mx=parseFloat(pwMax),inc=parseFloat(pwInc);if(!mn||!mx||!inc)return;
          const vals=calcIndepPropRange({p1:pp1,p2:pp2,ratio:r,confidence:confNum,yates,min:mn,max:mx,increment:inc});
          setResult({type:"range",design:"independent",values:vals,params:{p1:p1,p2:p2,ratio:r,confidence:confNum,yates}});
        }else{
          const pw=parseFloat(pwMin);if(!pw)return;
          const res=calcIndepPropN({p1:pp1,p2:pp2,ratio:r,confidence:confNum,power:pw,yates});
          setResult({type:"sampleSize",design:"independent",...res,params:{p1:p1,p2:p2,ratio:r,confidence:confNum,power:pw,yates}});
        }
      }else{
        const n1=parseFloat(nInput);if(!n1)return;
        const pw=calcIndepPropPower({p1:pp1,p2:pp2,ratio:r,confidence:confNum,n1Input:n1,yates});
        setResult({type:"power",design:"independent",value:pw.toFixed(2),params:{p1:p1,p2:p2,ratio:r,confidence:confNum,n1:n1,n2:Math.ceil(n1*r),yates}});
      }
    }else{
      if(mode==="sampleSize"){
        if(useRange){
          const mn=parseFloat(pwMin),mx=parseFloat(pwMax),inc=parseFloat(pwInc);if(!mn||!mx||!inc)return;
          const vals=calcPairedPropRange({p1:pp1,p2:pp2,confidence:confNum,min:mn,max:mx,increment:inc});
          setResult({type:"range",design:"paired",values:vals,params:{p1:p1,p2:p2,confidence:confNum}});
        }else{
          const pw=parseFloat(pwMin);if(!pw)return;
          const res=calcPairedPropN({p1:pp1,p2:pp2,confidence:confNum,power:pw});
          setResult({type:"sampleSize",design:"paired",n:res.n,pd:res.pd,p12:res.p12,p21:res.p21,params:{p1:p1,p2:p2,confidence:confNum,power:pw}});
        }
      }else{
        const n=parseFloat(nInput);if(!n)return;
        const pw=calcPairedPropPower({p1:pp1,p2:pp2,confidence:confNum,nInput:n});
        setResult({type:"power",design:"paired",value:pw.toFixed(2),params:{p1:p1,p2:p2,confidence:confNum,nInput:n}});
      }
    }
    setShowResult(true);
  };

  const handleReset=()=>{setP1("");setP2("");setRatio("1");setYates(false);setConfidence("95");setPwMin("");setPwMax("");setPwInc("");setNInput("");setResult(null);setShowResult(false);setUseRange(false);};

  const canCalc=!!(p1&&p2&&p1!==p2&&confidence&&(mode==="sampleSize"?(useRange?(pwMin&&pwMax&&pwInc):pwMin):nInput));

  return(
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#fafbfc",minHeight:"100%",color:"#1a1a2e"}}>
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
          <button onClick={onBack} style={{cursor:"pointer",color:"#10b981",display:"flex",alignItems:"center",gap:4,background:"none",border:"none",fontFamily:"inherit",fontSize:13,fontWeight:600,padding:0}}><BackIcon/> Muestreo</button>
          <span style={{color:"#d1d5db"}}>/</span><span style={{color:"#9ca3af"}}>Contraste de hipótesis</span>
          <span style={{color:"#d1d5db"}}>/</span><span style={{color:"#374151"}}>Comparación de proporciones</span>
        </div>

        {/* Title */}
        <div className="anim-fadeRight" style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:8,animationDelay:"100ms"}}>
          <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",display:"flex",alignItems:"center",justifyContent:"center",color:"#059669",flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          </div>
          <div>
            <h1 style={{fontSize:24,fontWeight:800,margin:0,color:"#111827",letterSpacing:"-0.02em"}}>Comparación de Proporciones</h1>
            <p style={{fontSize:14,color:"#6b7280",margin:"4px 0 0",lineHeight:1.5}}>Contraste de hipótesis — Calcula el tamaño de muestra o potencia para detectar diferencias entre proporciones.</p>
          </div>
        </div>

        {/* AI Banner */}
        <div className="anim-cinematic" style={{background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)",border:"1px solid #a7f3d0",borderRadius:12,padding:"12px 16px",margin:"20px 0 28px",display:"flex",alignItems:"center",gap:10,fontSize:13,color:"#065f46",cursor:"pointer",animationDelay:"200ms"}}>
          <div style={{background:"#10b981",borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0}}><SparkleIcon/></div>
          <span><b>Asistente IA:</b> ¿No conoces las proporciones esperadas? Puedo buscar tasas reportadas en la literatura para tu variable de interés.</span>
        </div>
        {/* Design tabs */}
        <div className="anim-cinematic" style={{display:"flex",gap:4,background:"#f3f4f6",borderRadius:12,padding:4,marginBottom:28,animationDelay:"300ms"}}>
          {[{id:"independent",label:"Grupos independientes",icon:"👥"},{id:"paired",label:"Grupos emparejados",icon:"🔗"}].map(t=>(
            <button key={t.id} onClick={()=>{setDesign(t.id);setShowResult(false);setResult(null)}}
              style={{flex:1,padding:"11px 16px",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.25s ease",background:design===t.id?"white":"transparent",color:design===t.id?"#111827":"#6b7280",boxShadow:design===t.id?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Mode tabs */}
        <div className="anim-cinematic" style={{display:"flex",gap:4,background:"#f3f4f6",borderRadius:12,padding:4,marginBottom:28,animationDelay:"400ms"}}>
          {[{id:"sampleSize",label:design==="paired"?"Calcular número de pares":"Calcular tamaño de muestra",icon:"📐"},{id:"power",label:"Calcular potencia",icon:"⚡"}].map(m=>(
            <button key={m.id} onClick={()=>{setMode(m.id);setShowResult(false);setResult(null)}}
              style={{flex:1,padding:"11px 16px",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.25s ease",background:mode===m.id?"white":"transparent",color:mode===m.id?"#111827":"#6b7280",boxShadow:mode===m.id?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>
              <span>{m.icon}</span>{m.label}
            </button>
          ))}
        </div>

        <div className="anim-cinematic" style={{animationDelay:"500ms"}}>
          <Stepper steps={steps} current={currentStep}/>
        </div>

        {/* Form */}
        <div className="anim-cinematic" style={{animationDelay:"600ms",background:"white",borderRadius:16,border:"1.5px solid #e5e7eb",padding:"28px 28px 8px",boxShadow:"0 1px 4px rgba(0,0,0,0.03)"}}>

          {/* Step 1: Proporciones */}
          <SL step="Paso 1" label="Proporciones esperadas"/>
          <Field label={design==="independent"?"Proporción en población 1 (p₁)":"Proporción en condición 1 (p₁)"} tooltip={design==="independent"?"Proporción esperada del evento en el grupo 1 (ej. grupo tratamiento).":"Proporción esperada del evento en la primera condición (ej. antes del tratamiento)."} value={p1} onChange={setP1} placeholder="Ej: 50" suffix="%"/>
          <Field label={design==="independent"?"Proporción en población 2 (p₂)":"Proporción en condición 2 (p₂)"} tooltip={design==="independent"?"Proporción esperada del evento en el grupo 2 (ej. grupo control).":"Proporción esperada del evento en la segunda condición (ej. después del tratamiento)."} value={p2} onChange={setP2} placeholder="Ej: 30" suffix="%"/>

          {/* Visual comparison */}
          <PropCompare p1={p1} p2={p2}/>

          {/* McNemar preview for paired */}
          {design==="paired"&&<McNemarPreview p1={p1} p2={p2}/>}

          <div style={{height:1,background:"#f3f4f6",margin:"4px 0 20px"}}/>

          {/* Step 2: Design */}
          {design==="independent"?(<>
            <SL step="Paso 2" label="Diseño del estudio"/>
            <Field label="Razón entre tamaños muestrales (n₂/n₁)" tooltip="Proporción del grupo 2 respecto al grupo 1. Valor 1 = grupos iguales." value={ratio} onChange={setRatio} placeholder="1"/>
            <QuickBtns values={["1","1.5","2","3"]} current={ratio} onSelect={setRatio} suffix=":1"/>

            <Field label="Nivel de confianza" tooltip="95% es el estándar (α bilateral = 0.05)." value={confidence} onChange={setConfidence} placeholder="95" suffix="%"/>
            <QuickBtns values={["90","95","99"]} current={confidence} onSelect={setConfidence} suffix="%"/>

            {/* Yates correction */}
            <label style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderRadius:12,border:yates?"2px solid #10b981":"2px solid #e5e7eb",background:yates?"#f0fdf4":"white",cursor:"pointer",marginBottom:20,transition:"all 0.2s ease"}}>
              <div style={{width:22,height:22,borderRadius:6,border:yates?"2px solid #10b981":"2px solid #d1d5db",background:yates?"#10b981":"white",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s ease",flexShrink:0}}>
                {yates&&<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:yates?"#065f46":"#374151"}}>Corrección de continuidad de Yates (χ²c)</div>
                <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Recomendada cuando los tamaños esperados por celda son pequeños.</div>
              </div>
              <input type="checkbox" checked={yates} onChange={()=>setYates(!yates)} style={{display:"none"}}/>
            </label>
          </>):(<>
            <SL step="Paso 2" label="Nivel de confianza"/>
            <Field label="Nivel de confianza" tooltip="95% es el estándar." value={confidence} onChange={setConfidence} placeholder="95" suffix="%"/>
            <QuickBtns values={["90","95","99"]} current={confidence} onSelect={setConfidence} suffix="%"/>
          </>)}

          <div style={{height:1,background:"#f3f4f6",margin:"4px 0 20px"}}/>

          {/* Step 3: Power / Sample */}
          <SL step="Paso 3" label={mode==="sampleSize"?"Potencia deseada":"Muestra disponible"}/>

          {mode==="sampleSize"?(<>
            <div style={{display:"flex",gap:4,background:"#f9fafb",borderRadius:10,padding:3,marginBottom:20,border:"1px solid #f3f4f6"}}>
              <button onClick={()=>setUseRange(false)} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:!useRange?"white":"transparent",color:!useRange?"#111827":"#9ca3af",boxShadow:!useRange?"0 1px 2px rgba(0,0,0,0.06)":"none"}}>Valor único</button>
              <button onClick={()=>setUseRange(true)} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:useRange?"white":"transparent",color:useRange?"#111827":"#9ca3af",boxShadow:useRange?"0 1px 2px rgba(0,0,0,0.06)":"none"}}><TableIcon/> Rango (tabla)</button>
            </div>
            {!useRange?(<>
              <Field label="Potencia estadística (1−β)" tooltip="Probabilidad de detectar la diferencia si existe. 80% mínimo, 90% ideal." value={pwMin} onChange={setPwMin} placeholder="Ej: 80" suffix="%"/>
              <QuickBtns values={["80","85","90","95"]} current={pwMin} onSelect={setPwMin} suffix="%"/>
            </>):(<div style={{background:"#f9fafb",borderRadius:12,padding:"20px 20px 4px",border:"1px solid #f3f4f6",marginBottom:20}}>
              <p style={{fontSize:12,color:"#6b7280",margin:"0 0 16px",lineHeight:1.5}}>Define un rango de potencias para comparar tamaños de muestra.</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <Field label="Mínimo" value={pwMin} onChange={setPwMin} placeholder="80" suffix="%"/>
                <Field label="Máximo" value={pwMax} onChange={setPwMax} placeholder="95" suffix="%"/>
                <Field label="Incremento" value={pwInc} onChange={setPwInc} placeholder="5" suffix="%"/>
              </div>
            </div>)}
          </>):(<>
            <Field label={design==="independent"?"Tamaño del grupo 1 (n₁)":"Número de pares"} tooltip={design==="independent"?"Sujetos en el grupo 1. El grupo 2 se calcula según la razón.":"Número de pares de observaciones."} value={nInput} onChange={setNInput} placeholder="Ej: 100"/>
          </>)}
        </div>

        {/* Actions */}
        <div className="anim-cinematic" style={{display:"flex",gap:10,marginTop:20,animationDelay:"700ms"}}>
          <button onClick={handleCalc} disabled={!canCalc} style={{flex:1,padding:"14px 24px",borderRadius:12,border:"none",cursor:canCalc?"pointer":"not-allowed",fontSize:15,fontWeight:700,fontFamily:"inherit",background:canCalc?"linear-gradient(135deg,#10b981,#059669)":"#e5e7eb",color:canCalc?"white":"#9ca3af",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:canCalc?"0 4px 14px rgba(16,185,129,0.3)":"none",transform:"scale(1)"}} onMouseDown={e=>{if(canCalc)e.currentTarget.style.transform="scale(0.98)"}} onMouseUp={e=>{e.currentTarget.style.transform="scale(1)"}}><CalcIcon/> Calcular</button>
          <button onClick={handleReset} style={{padding:"14px 20px",borderRadius:12,border:"2px solid #e5e7eb",cursor:"pointer",fontSize:14,fontWeight:600,fontFamily:"inherit",background:"white",color:"#6b7280",display:"flex",alignItems:"center",gap:6,transition:"all 0.2s ease"}}><ResetIcon/> Limpiar</button>
        </div>
        {/* ─── RESULTS ─── */}
        {showResult&&result&&(
          <div style={{marginTop:24,animation:"cinematicUp 0.8s cubic-bezier(0.16,1,0.3,1) both"}}>
            <style>{`@keyframes countUp{from{opacity:0;transform:scale(0.5);filter:blur(5px)}to{opacity:1;transform:scale(1);filter:blur(0)}}`}</style>

            {result.type==="sampleSize"&&(
              <div style={{background:"linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)",border:"2px solid #6ee7b7",borderRadius:16,overflow:"hidden"}}>
                <div style={{padding:"24px 28px 20px"}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#059669",marginBottom:16,display:"flex",alignItems:"center",gap:6}}><CheckIcon/> Resultado</div>
                  {result.design==="independent"?(
                    <div style={{display:"flex",gap:32,flexWrap:"wrap"}}>
                      {[{label:"Grupo 1",value:result.n1,delay:"0.5s"},{label:"Grupo 2",value:result.n2,delay:"0.6s"},{label:"Total",value:result.total,delay:"0.7s"}].map(item=>(
                        <div key={item.label}><div style={{fontSize:12,fontWeight:600,color:"#059669",marginBottom:4}}>{item.label}</div><span style={{fontSize:44,fontWeight:800,color:"#065f46",fontFamily:"'DM Mono',monospace",letterSpacing:"-0.03em",animation:`countUp ${item.delay} cubic-bezier(0.16,1,0.3,1)`}}>{item.value}</span></div>
                      ))}
                    </div>
                  ):(
                    <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                      <span style={{fontSize:48,fontWeight:800,color:"#065f46",fontFamily:"'DM Mono',monospace",letterSpacing:"-0.03em",animation:"countUp 0.5s cubic-bezier(0.16,1,0.3,1)"}}>{result.n}</span>
                      <span style={{fontSize:16,fontWeight:600,color:"#059669"}}>pares necesarios</span>
                    </div>
                  )}
                </div>
                <div style={{background:"rgba(255,255,255,0.6)",padding:"16px 28px",display:"flex",flexWrap:"wrap",gap:"8px 20px"}}>
                  <span style={{fontSize:12,color:"#065f46"}}><b>p₁:</b> {result.params.p1}%</span>
                  <span style={{fontSize:12,color:"#065f46"}}><b>p₂:</b> {result.params.p2}%</span>
                  <span style={{fontSize:12,color:"#065f46"}}><b>Potencia:</b> {result.params.power}%</span>
                  <span style={{fontSize:12,color:"#065f46"}}><b>Confianza:</b> {result.params.confidence}%</span>
                  {result.design==="independent"&&<span style={{fontSize:12,color:"#065f46"}}><b>Razón:</b> {result.params.ratio}:1</span>}
                  {result.params.yates&&<span style={{fontSize:12,color:"#065f46"}}><b>Yates:</b> Sí</span>}
                </div>
                <div style={{background:"rgba(255,255,255,0.4)",padding:"16px 28px",borderTop:"1px solid rgba(16,185,129,0.15)",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:24,height:24,borderRadius:8,background:"#10b981",display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0,marginTop:1}}><SparkleIcon/></div>
                  <div style={{fontSize:13,color:"#065f46",lineHeight:1.6}}>
                    <b>Interpretación IA:</b>
                    {result.design==="independent"?
                      <> Necesitas <b>{result.n1} sujetos en el grupo 1</b> y <b>{result.n2} en el grupo 2</b> ({result.total} en total) para detectar una diferencia de {Math.abs(parseFloat(result.params.p1)-parseFloat(result.params.p2)).toFixed(1)} puntos porcentuales entre proporciones del {result.params.p1}% y {result.params.p2}%, con {result.params.power}% de potencia al {result.params.confidence}% de confianza.{result.params.yates?" Se aplicó corrección de Yates.":""}</>
                    : <> Necesitas <b>{result.n} pares de observaciones</b> para detectar un cambio de {result.params.p1}% a {result.params.p2}% en proporciones emparejadas (prueba de McNemar), con {result.params.power}% de potencia al {result.params.confidence}% de confianza. Cada sujeto debe ser medido en ambas condiciones.</>
                    }
                  </div>
                </div>
              </div>
            )}

            {result.type==="power"&&(
              <div style={{background:"linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)",border:"2px solid #6ee7b7",borderRadius:16,overflow:"hidden"}}>
                <div style={{padding:"24px 28px 20px"}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#059669",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><CheckIcon/> Resultado</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                    <span style={{fontSize:48,fontWeight:800,color:"#065f46",fontFamily:"'DM Mono',monospace",letterSpacing:"-0.03em",animation:"countUp 0.5s cubic-bezier(0.16,1,0.3,1)"}}>{result.value}%</span>
                    <span style={{fontSize:16,fontWeight:600,color:"#059669"}}>potencia estadística</span>
                  </div>
                  <PowerBar value={result.value}/>
                </div>
                <div style={{background:"rgba(255,255,255,0.6)",padding:"16px 28px",display:"flex",flexWrap:"wrap",gap:"8px 20px"}}>
                  <span style={{fontSize:12,color:"#065f46"}}><b>p₁:</b> {result.params.p1}%</span>
                  <span style={{fontSize:12,color:"#065f46"}}><b>p₂:</b> {result.params.p2}%</span>
                  {result.design==="independent"?<><span style={{fontSize:12,color:"#065f46"}}><b>n₁:</b> {result.params.n1}</span><span style={{fontSize:12,color:"#065f46"}}><b>n₂:</b> {result.params.n2}</span></>:<span style={{fontSize:12,color:"#065f46"}}><b>Pares:</b> {result.params.nInput}</span>}
                </div>
                <div style={{background:"rgba(255,255,255,0.4)",padding:"16px 28px",borderTop:"1px solid rgba(16,185,129,0.15)",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:24,height:24,borderRadius:8,background:"#10b981",display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0,marginTop:1}}><SparkleIcon/></div>
                  <div style={{fontSize:13,color:"#065f46",lineHeight:1.6}}>
                    <b>Interpretación IA:</b> Con tu muestra tienes una potencia de <b>{result.value}%</b>.
                    {parseFloat(result.value)>=80?" Adecuado para la mayoría de estudios.":parseFloat(result.value)>=60?" Por debajo del 80% recomendado.":" Insuficiente. Alto riesgo de error tipo II."}
                  </div>
                </div>
              </div>
            )}

            {result.type==="range"&&(
              <div style={{background:"white",border:"2px solid #6ee7b7",borderRadius:16,overflow:"hidden"}}>
                <div style={{background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",padding:"20px 28px"}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#059669",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><CheckIcon/> Tabla comparativa</div>
                  <p style={{fontSize:13,color:"#065f46",margin:0}}>p₁ = <b>{result.params.p1}%</b> · p₂ = <b>{result.params.p2}%</b> · Confianza: <b>{result.params.confidence}%</b>{result.params.ratio&&<> · Razón: <b>{result.params.ratio}:1</b></>}{result.params.yates&&<> · Yates: <b>Sí</b></>}</p>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                    <thead><tr style={{background:"#f9fafb"}}>
                      <th style={{padding:"12px 20px",textAlign:"left",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e5e7eb"}}>Potencia</th>
                      {result.design==="independent"?(<>
                        <th style={{padding:"12px 16px",textAlign:"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e5e7eb"}}>Grupo 1</th>
                        <th style={{padding:"12px 16px",textAlign:"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e5e7eb"}}>Grupo 2</th>
                        <th style={{padding:"12px 20px",textAlign:"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e5e7eb"}}>Total</th>
                      </>):<th style={{padding:"12px 28px",textAlign:"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e5e7eb"}}>Pares (n)</th>}
                    </tr></thead>
                    <tbody>
                      {result.values.map((row: any,i: number)=>(
                        <tr key={i} style={{background:i%2===0?"white":"#fafbfc",transition:"background 0.15s ease"}} onMouseEnter={e=>{e.currentTarget.style.background="#ecfdf5"}} onMouseLeave={e=>{e.currentTarget.style.background=i%2===0?"white":"#fafbfc"}}>
                          <td style={{padding:"12px 20px",borderBottom:"1px solid #f3f4f6",color:"#374151",fontWeight:500}}>{row.power}%</td>
                          {result.design==="independent"?(<>
                            <td style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:700,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{row.n1.toLocaleString()}</td>
                            <td style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:600,color:"#0d9488",fontFamily:"'DM Mono',monospace"}}>{row.n2.toLocaleString()}</td>
                            <td style={{padding:"12px 20px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:700,color:"#065f46",fontFamily:"'DM Mono',monospace"}}>{row.total.toLocaleString()}</td>
                          </>):<td style={{padding:"12px 28px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:700,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{row.n.toLocaleString()}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{background:"rgba(236,253,245,0.5)",padding:"16px 28px",borderTop:"1px solid rgba(16,185,129,0.15)",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:24,height:24,borderRadius:8,background:"#10b981",display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0,marginTop:1}}><SparkleIcon/></div>
                  <div style={{fontSize:13,color:"#065f46",lineHeight:1.6}}>
                    <b>Interpretación IA:</b> La tabla muestra los tamaños de muestra por potencia para detectar una diferencia de {Math.abs(parseFloat(result.params.p1)-parseFloat(result.params.p2)).toFixed(1)} puntos porcentuales.
                    {result.values.length>1&&<>{" "}Con {result.values[0].power}% necesitas <b>{(result.values[0].total||result.values[0].n).toLocaleString()}</b> {result.design==="independent"?"sujetos":"pares"}, con {result.values[result.values.length-1].power}% necesitas <b>{(result.values[result.values.length-1].total||result.values[result.values.length-1].n).toLocaleString()}</b>.</>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formula */}
        <div className="anim-cinematic" style={{marginTop:24,background:"white",borderRadius:14,border:"1.5px solid #e5e7eb",padding:"20px 24px",animationDelay:"800ms"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Referencia de fórmula</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#374151",background:"#f9fafb",padding:"14px 18px",borderRadius:10,lineHeight:2}}>
            {design==="independent"?(<>
              n₁ = [Z<sub>α/2</sub>√((1+1/r)p̄q̄) + Z<sub>β</sub>√(p₁q₁+p₂q₂/r)]² / (p₁−p₂)²<br/>
              n₂ = n₁ · r{yates&&<><br/><span style={{color:"#059669"}}>Con corrección de Yates aplicada</span></>}
            </>):(<>
              n = [Z<sub>α/2</sub>√(p<sub>d</sub>) + Z<sub>β</sub>√(p<sub>d</sub>−(p₁−p₂)²)]² / (p₁−p₂)²<br/>
              p<sub>d</sub> = p₁(1−p₂) + (1−p₁)p₂
            </>)}
          </div>
          <p style={{fontSize:12,color:"#9ca3af",margin:"10px 0 0",lineHeight:1.5}}>
            {design==="independent"
              ?"Donde p̄ = (p₁+r·p₂)/(1+r) es la proporción ponderada bajo H₀, r = razón n₂/n₁."
              :"Donde pd = proporción total de pares discordantes (bajo independencia), prueba de McNemar."
            }
          </p>
        </div>
      </div>
    </div>
  );
}
