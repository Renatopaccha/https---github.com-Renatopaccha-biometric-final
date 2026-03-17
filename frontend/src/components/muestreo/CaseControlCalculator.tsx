import { useState, useEffect } from "react";

/* ─── Utilities ─── */
function normalInv(p: number){const a=[-3.969683028665376e1,2.209460984245205e2,-2.759285104469687e2,1.383577518672690e2,-3.066479806614716e1,2.506628277459239e0];const b=[-5.447609879822406e1,1.615858368580409e2,-1.556989798598866e2,6.680131188771972e1,-1.328068155288572e1];const c=[-7.784894002430293e-3,-3.223964580411365e-1,-2.400758277161838e0,-2.549732539343734e0,4.374664141464968e0,2.938163982698783e0];const d=[7.784695709041462e-3,3.224671290700398e-1,2.445134137142996e0,3.754408661907416e0];const pLow=0.02425,pHigh=1-pLow;let q,r;if(p<pLow){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}else if(p<=pHigh){q=p-0.5;r=q*q;return((((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q)/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)}else{q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}}
function normalCDF(x: number){const t=1/(1+0.2316419*Math.abs(x));const d=0.3989422804014327;const p=d*Math.exp(-x*x/2)*(t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.8212560+t*1.3302744)))));return x>0?1-p:p;}

/* ─── Derivations ─── */
function deriveOR(p1: number,p2: number){return(p1*(1-p2))/(p2*(1-p1))}
function deriveP1(p2: number,or: number){return(or*p2)/(1-p2+or*p2)}
function deriveP2(p1: number,or: number){return p1/(or*(1-p1)+p1)}

/* ─── Independent CC (Kelsey) ─── */
interface IndepCCParams { p1: number; p2: number; r: number; confidence: number; power: number; yates: boolean; }
function calcIndepCCn({p1,p2,r,confidence,power,yates}: IndepCCParams){
  const alpha=1-confidence/100;const za=Math.abs(normalInv(alpha/2));const zb=Math.abs(normalInv(1-power/100));
  const q1=1-p1,q2=1-p2;const pbar=(p1+r*p2)/(1+r);const qbar=1-pbar;const diff=Math.abs(p1-p2);
  const t1=za*Math.sqrt((r+1)*pbar*qbar);const t2=zb*Math.sqrt(r*p1*q1+p2*q2);
  let nC=Math.pow(t1+t2,2)/(r*diff*diff);
  if(yates){const nR=nC;nC=(nR/4)*Math.pow(1+Math.sqrt(1+2*(r+1)/(nR*r*diff)),2);}
  nC=Math.max(2,Math.ceil(nC));const nCtrl=Math.max(2,Math.ceil(nC*r));
  return{cases:nC,controls:nCtrl,total:nC+nCtrl};
}
function calcIndepCCpow({p1,p2,r,confidence,nCasesInput,yates}: any){
  const alpha=1-confidence/100;const za=Math.abs(normalInv(alpha/2));
  const q1=1-p1,q2=1-p2;const pbar=(p1+r*p2)/(1+r);const qbar=1-pbar;const diff=Math.abs(p1-p2);
  const n=nCasesInput;
  const num=diff*Math.sqrt(n*r)-za*Math.sqrt((r+1)*pbar*qbar);
  const den=Math.sqrt(r*p1*q1+p2*q2);
  return Math.max(0,Math.min(100,normalCDF(num/den)*100));
}
function calcIndepCCrange({p1,p2,r,confidence,yates,min,max,inc}: any){
  const res=[];for(let pw=min;pw<=max+0.001;pw+=inc){const v=calcIndepCCn({p1,p2,r,confidence,power:pw,yates});res.push({power:parseFloat(pw.toFixed(1)),...v});}return res;
}

/* ─── Paired CC (McNemar) ─── */
function calcPairedCCn({p1,p2,confidence,power}: any){
  const alpha=1-confidence/100;const za=Math.abs(normalInv(alpha/2));const zb=Math.abs(normalInv(1-power/100));
  const p12=p1*(1-p2);const p21=(1-p1)*p2;const pd=p12+p21;const diff=p1-p2;
  const t1=za*Math.sqrt(pd);const t2=zb*Math.sqrt(pd-diff*diff);
  return{n:Math.max(3,Math.ceil(Math.pow(t1+t2,2)/(diff*diff))),p12,p21,pd};
}
function calcPairedCCpow({p1,p2,confidence,nInput}: any){
  const alpha=1-confidence/100;const za=Math.abs(normalInv(alpha/2));
  const p12=p1*(1-p2);const p21=(1-p1)*p2;const pd=p12+p21;const diff=Math.abs(p1-p2);
  const num=diff*Math.sqrt(nInput)-za*Math.sqrt(pd);const den=Math.sqrt(pd-diff*diff);
  if(den<=0)return 0;return Math.max(0,Math.min(100,normalCDF(num/den)*100));
}
function calcPairedCCrange({p1,p2,confidence,min,max,inc}: any){
  const res=[];for(let pw=min;pw<=max+0.001;pw+=inc){const v=calcPairedCCn({p1,p2,confidence,power:pw});res.push({power:parseFloat(pw.toFixed(1)),n:v.n});}return res;
}

/* ─── Icons ─── */
const InfoIcon=()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>);
const SparkleIcon=()=>(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/></svg>);
const BackIcon=()=>(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>);
const CalcIcon=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/></svg>);
const CheckIcon=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);
const ResetIcon=()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>);
const TableIcon=()=>(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>);
const LinkIcon=()=>(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>);

/* ─── Reusable UI ─── */
function Tooltip({children,text}: any){const[s,setS]=useState(false);return(<span onMouseEnter={()=>setS(true)} onMouseLeave={()=>setS(false)} style={{position:"relative",display:"inline-flex",cursor:"help"}}>{children}{s&&<span style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:"#1f2937",color:"#f9fafb",fontSize:12,lineHeight:1.5,padding:"10px 14px",borderRadius:10,width:280,zIndex:100,boxShadow:"0 10px 30px rgba(0,0,0,0.2)",pointerEvents:"none",fontWeight:400}}>{text}<span style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1f2937"}}/></span>}</span>)}
function Stepper({steps,current}: any){return(<div style={{display:"flex",alignItems:"center",gap:0,marginBottom:32}}>{steps.map((s: any,i: number)=>{const done=current>s.num,act=current===s.num;return(<div key={s.num} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:"none"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,background:done?"#10b981":act?"#ecfdf5":"#f3f4f6",color:done?"white":act?"#059669":"#9ca3af",border:act?"2px solid #10b981":done?"2px solid #10b981":"2px solid #e5e7eb"}}>{done?<CheckIcon/>:s.num}</div><span style={{fontSize:13,fontWeight:act?700:500,color:act?"#059669":done?"#10b981":"#9ca3af",whiteSpace:"nowrap"}}>{s.label}</span></div>{i<steps.length-1&&<div style={{flex:1,height:2,marginLeft:12,marginRight:12,background:done?"#10b981":"#e5e7eb",borderRadius:2}}/>}</div>)})}</div>)}
function Field({label,tooltip,value,onChange,placeholder,suffix,hint,disabled}: any){const[f,setF]=useState(false);return(<div style={{marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><label style={{fontSize:13,fontWeight:600,color:"#374151"}}>{label}</label>{tooltip&&<Tooltip text={tooltip}><span style={{color:"#9ca3af",display:"flex"}}><InfoIcon/></span></Tooltip>}</div><div style={{display:"flex",alignItems:"center",border:f?"2px solid #10b981":"2px solid #e5e7eb",borderRadius:10,background:disabled?"#f9fafb":"white",transition:"all 0.2s ease",boxShadow:f?"0 0 0 3px rgba(16,185,129,0.1)":"none",overflow:"hidden"}}><input type="number" value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} placeholder={placeholder} disabled={disabled} step="any" style={{flex:1,border:"none",outline:"none",padding:"12px 14px",fontSize:14,fontFamily:"'DM Sans',sans-serif",background:"transparent",color:disabled?"#9ca3af":"#111827"}}/>{suffix&&<span style={{padding:"0 14px",fontSize:13,color:"#6b7280",fontWeight:600,borderLeft:"1px solid #f3f4f6",background:"#f9fafb",alignSelf:"stretch",display:"flex",alignItems:"center"}}>{suffix}</span>}</div>{hint&&<p style={{fontSize:12,color:"#9ca3af",margin:"6px 0 0",lineHeight:1.4}}>{hint}</p>}</div>)}
function CheckOption({checked,onChange,label,description}: any){return(<label style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 16px",borderRadius:12,cursor:"pointer",border:checked?"2px solid #10b981":"2px solid #e5e7eb",background:checked?"#f0fdf4":"white",transition:"all 0.2s ease",marginBottom:8}}><div style={{width:22,height:22,borderRadius:6,flexShrink:0,marginTop:1,border:checked?"2px solid #10b981":"2px solid #d1d5db",background:checked?"#10b981":"white",display:"flex",alignItems:"center",justifyContent:"center"}}>{checked&&<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</div><div><div style={{fontSize:14,fontWeight:600,color:checked?"#065f46":"#374151"}}>{label}</div><div style={{fontSize:12,color:"#6b7280",marginTop:2,lineHeight:1.4}}>{description}</div></div><input type="checkbox" checked={checked} onChange={onChange} style={{display:"none"}}/></label>)}
function QuickBtns({values,current,onSelect,suffix}: any){return(<div style={{display:"flex",gap:6,marginTop:-12,marginBottom:20,flexWrap:"wrap"}}><span style={{fontSize:11,color:"#9ca3af",fontWeight:600,alignSelf:"center",marginRight:4}}>Frecuentes:</span>{values.map((v: any)=>(<button key={v} onClick={()=>onSelect(v)} style={{padding:"4px 14px",borderRadius:8,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:current===v?"#ecfdf5":"#f9fafb",color:current===v?"#059669":"#9ca3af"}}>{v}{suffix||""}</button>))}</div>)}
function SL({step,label}: any){return(<div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#10b981",marginBottom:16,display:"flex",alignItems:"center",gap:6}}><span style={{width:20,height:2,background:"#10b981",borderRadius:2}}/>{step} · {label}</div>)}
function PowerBar({value}: any){const pw=parseFloat(value)||0;const color=pw>=80?"#10b981":pw>=60?"#eab308":"#ef4444";const lb=pw>=80?"Adecuada":pw>=60?"Baja":"Insuficiente";return(<div style={{marginBottom:20}}><div style={{height:8,borderRadius:4,background:"#f3f4f6",overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,background:color,width:`${Math.min(100,pw)}%`,transition:"width 0.4s ease"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:6}}><span style={{color:"#9ca3af"}}>0%</span><span style={{color,fontWeight:700}}>Potencia {pw.toFixed(1)}% — {lb}</span><span style={{color:"#9ca3af"}}>100%</span></div></div>)}

/* ─── Main Component ─── */
interface CaseControlCalculatorProps {
  onBack: () => void;
}

export function CaseControlCalculator({ onBack }: CaseControlCalculatorProps){
  const[design,setDesign]=useState("independent");
  const[mode,setMode]=useState("sampleSize");
  // 2-of-3 selection
  const[useP1,setUseP1]=useState(true);
  const[useP2,setUseP2]=useState(true);
  const[useOR,setUseOR]=useState(false);
  const[p1Val,setP1Val]=useState("");
  const[p2Val,setP2Val]=useState("");
  const[orVal,setORVal]=useState("");
  // Design params
  const[ctrlPerCase,setCtrlPerCase]=useState("1");
  const[yates,setYates]=useState(false);
  const[confidence,setConfidence]=useState("95");
  // Power/sample
  const[useRange,setUseRange]=useState(false);
  const[pwMin,setPwMin]=useState("");
  const[pwMax,setPwMax]=useState("");
  const[pwInc,setPwInc]=useState("");
  const[nInput,setNInput]=useState("");
  // State
  const[derived,setDerived]=useState<any>(null);
  const[result,setResult]=useState<any>(null);
  const[showResult,setShowResult]=useState(false);
  const[currentStep,setCurrentStep]=useState(1);

  const selCount=[useP1,useP2,useOR].filter(Boolean).length;

  // Toggle 2-of-3
  const toggle=(field: 'p1' | 'p2' | 'or')=>{
    const map: any={p1:[useP1,setUseP1,setP1Val],p2:[useP2,setUseP2,setP2Val],or:[useOR,setUseOR,setORVal]};
    const[cur,setter,valSetter]=map[field];
    if(cur){setter(false);valSetter("");}
    else{
      setter(true);
      if(selCount>=2){
        const others=Object.keys(map).filter(k=>k!==field);
        for(const o of others){if(map[o][0]){map[o][1](false);map[o][2]("");break;}}
      }
    }
    setDerived(null);setShowResult(false);setResult(null);
  };

  // Auto-derive third value
  useEffect(()=>{
    const p1=parseFloat(p1Val)/100,p2=parseFloat(p2Val)/100,or=parseFloat(orVal);
    if(useP1&&useP2&&p1>0&&p1<1&&p2>0&&p2<1) setDerived({type:"or",value:deriveOR(p1,p2).toFixed(3)});
    else if(useP1&&useOR&&p1>0&&p1<1&&or>0){const d=deriveP2(p1,or);if(d>0&&d<1)setDerived({type:"p2",value:(d*100).toFixed(2)});else setDerived(null);}
    else if(useP2&&useOR&&p2>0&&p2<1&&or>0){const d=deriveP1(p2,or);if(d>0&&d<1)setDerived({type:"p1",value:(d*100).toFixed(2)});else setDerived(null);}
    else setDerived(null);
  },[p1Val,p2Val,orVal,useP1,useP2,useOR]);

  const getFinal=()=>{
    let p1 = 0,p2= 0,or= 0;
    if(useP1&&useP2){p1=parseFloat(p1Val)/100;p2=parseFloat(p2Val)/100;or=deriveOR(p1,p2);}
    else if(useP1&&useOR){p1=parseFloat(p1Val)/100;or=parseFloat(orVal);p2=deriveP2(p1,or);}
    else{p2=parseFloat(p2Val)/100;or=parseFloat(orVal);p1=deriveP1(p2,or);}
    return{p1,p2,or};
  };

  const steps=design==="independent"
    ?[{num:1,label:"Datos"},{num:2,label:"Diseño"},{num:3,label:"Potencia"}]
    :[{num:1,label:"Datos"},{num:2,label:"Confianza"},{num:3,label:"Potencia"}];

  useEffect(()=>{
    const hasData=derived!==null;const hasPw=mode==="sampleSize"?(pwMin||(useRange&&pwMax)):nInput;
    if(hasPw&&hasData&&confidence)setCurrentStep(3);
    else if(hasData&&(design==="independent"?ctrlPerCase:confidence))setCurrentStep(2);
    else setCurrentStep(1);
  },[derived,ctrlPerCase,confidence,pwMin,pwMax,nInput,mode,design,useRange]);

  const handleCalc=()=>{
    if(!derived)return;const{p1,p2,or}=getFinal();const conf=parseFloat(confidence);const r=parseFloat(ctrlPerCase)||1;
    if(design==="independent"){
      if(mode==="sampleSize"){
        if(useRange){const mn=parseFloat(pwMin),mx=parseFloat(pwMax),ic=parseFloat(pwInc);if(!mn||!mx||!ic)return;
          const vals=calcIndepCCrange({p1,p2,r,confidence:conf,yates,min:mn,max:mx,inc:ic});
          setResult({type:"range",design:"independent",values:vals,params:{p1:(p1*100).toFixed(1),p2:(p2*100).toFixed(1),or:or.toFixed(3),r,confidence:conf,yates}});
        }else{const pw=parseFloat(pwMin);if(!pw)return;
          const res=calcIndepCCn({p1,p2,r,confidence:conf,power:pw,yates});
          setResult({type:"sampleSize",design:"independent",...res,params:{p1:(p1*100).toFixed(1),p2:(p2*100).toFixed(1),or:or.toFixed(3),r,confidence:conf,power:pw,yates}});}
      }else{const nc=parseFloat(nInput);if(!nc)return;
        const pw=calcIndepCCpow({p1,p2,r,confidence:conf,nCasesInput:nc,yates});
        setResult({type:"power",design:"independent",value:pw.toFixed(2),params:{p1:(p1*100).toFixed(1),p2:(p2*100).toFixed(1),or:or.toFixed(3),r,confidence:conf,nCases:nc,nCtrl:Math.ceil(nc*r),yates}});}
    }else{
      if(mode==="sampleSize"){
        if(useRange){const mn=parseFloat(pwMin),mx=parseFloat(pwMax),ic=parseFloat(pwInc);if(!mn||!mx||!ic)return;
          const vals=calcPairedCCrange({p1,p2,confidence:conf,min:mn,max:mx,inc:ic});
          setResult({type:"range",design:"paired",values:vals,params:{p1:(p1*100).toFixed(1),p2:(p2*100).toFixed(1),or:or.toFixed(3),confidence:conf}});
        }else{const pw=parseFloat(pwMin);if(!pw)return;
          const res=calcPairedCCn({p1,p2,confidence:conf,power:pw});
          setResult({type:"sampleSize",design:"paired",n:res.n,pd:res.pd,params:{p1:(p1*100).toFixed(1),p2:(p2*100).toFixed(1),or:or.toFixed(3),confidence:conf,power:pw}});}
      }else{const n=parseFloat(nInput);if(!n)return;
        const pw=calcPairedCCpow({p1,p2,confidence:conf,nInput:n});
        setResult({type:"power",design:"paired",value:pw.toFixed(2),params:{p1:(p1*100).toFixed(1),p2:(p2*100).toFixed(1),or:or.toFixed(3),confidence:conf,nInput:n}});}
    }
    setShowResult(true);
  };

  const handleReset=()=>{setP1Val("");setP2Val("");setORVal("");setCtrlPerCase("1");setYates(false);setConfidence("95");setPwMin("");setPwMax("");setPwInc("");setNInput("");setResult(null);setShowResult(false);setUseRange(false);setDerived(null);setUseP1(true);setUseP2(true);setUseOR(false);};

  const canCalc=derived&&confidence&&(mode==="sampleSize"?(useRange?(pwMin&&pwMax&&pwInc):pwMin):nInput);

  return(
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
          <span style={{color:"#d1d5db"}}>/</span><span style={{color:"#374151"}}>Casos y controles</span>
        </div>

        {/* Title */}
        <div className="anim-fadeRight" style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:8,animationDelay:"100ms"}}>
          <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",display:"flex",alignItems:"center",justifyContent:"center",color:"#059669",flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/></svg>
          </div>
          <div>
            <h1 style={{fontSize:24,fontWeight:800,margin:0,color:"#111827",letterSpacing:"-0.02em"}}>Estudios de Casos y Controles</h1>
            <p style={{fontSize:14,color:"#6b7280",margin:"4px 0 0",lineHeight:1.5}}>Contraste de ipotesi — Calcula el tamaño de muestra o potencia para detectar una asociación (OR) entre exposición y enfermedad.</p>
          </div>
        </div>

        {/* AI Banner */}
        <div className="anim-cinematic" style={{background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)",border:"1px solid #a7f3d0",borderRadius:12,padding:"12px 16px",margin:"20px 0 28px",display:"flex",alignItems:"center",gap:10,fontSize:13,color:"#065f46",cursor:"pointer",animationDelay:"200ms"}}>
          <div style={{background:"#10b981",borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0}}><SparkleIcon/></div>
          <span><b>Asistente IA:</b> ¿No conoces las proporciones de exposición o el OR? Puedo buscar valores reportados en la literatura para tu factor de estudio.</span>
        </div>

        {/* Design tabs */}
        <div className="anim-cinematic" style={{display:"flex",gap:4,background:"#f3f4f6",borderRadius:12,padding:4,marginBottom:28,animationDelay:"300ms"}}>
          {[{id:"independent",label:"Grupos independientes",icon:"👥"},{id:"paired",label:"Grupos emparejados",icon:"🔗"}].map(t=>(
            <button key={t.id} onClick={()=>{setDesign(t.id);setShowResult(false);setResult(null)}}
              style={{flex:1,padding:"11px 16px",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:design===t.id?"white":"transparent",color:design===t.id?"#111827":"#6b7280",boxShadow:design===t.id?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Mode tabs */}
        <div className="anim-cinematic" style={{display:"flex",gap:4,background:"#f3f4f6",borderRadius:12,padding:4,marginBottom:28,animationDelay:"400ms"}}>
          {[{id:"sampleSize",label:design==="paired"?"Calcular número de pares":"Calcular tamaño de muestra",icon:"📐"},{id:"power",label:"Calcular potencia",icon:"⚡"}].map(m=>(
            <button key={m.id} onClick={()=>{setMode(m.id);setShowResult(false);setResult(null)}}
              style={{flex:1,padding:"11px 16px",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:mode===m.id?"white":"transparent",color:mode===m.id?"#111827":"#6b7280",boxShadow:mode===m.id?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>
              <span>{m.icon}</span>{m.label}
            </button>
          ))}
        </div>

        <div className="anim-cinematic" style={{animationDelay:"500ms"}}>
          <Stepper steps={steps} current={currentStep}/>
        </div>

        {/* Form */}
        <div className="anim-cinematic" style={{animationDelay:"600ms",background:"white",borderRadius:16,border:"1.5px solid #e5e7eb",padding:"28px 28px 8px",boxShadow:"0 1px 4px rgba(0,0,0,0.03)"}}>

          {/* Step 1: Choose 2 of 3 */}
          <SL step="Paso 1" label="Datos del estudio (selecciona 2 de 3)"/>
          <p style={{fontSize:12,color:"#6b7280",margin:"0 0 16px",lineHeight:1.5}}>Selecciona las dos variables que conoces. La tercera se calculará automáticamente.</p>

          <CheckOption checked={useP1} onChange={()=>toggle("p1")} label="Proporción de casos expuestos (p₁)" description="Porcentaje de enfermos que estuvieron expuestos al factor de riesgo."/>
          <CheckOption checked={useP2} onChange={()=>toggle("p2")} label="Proporción de controles expuestos (p₂)" description="Porcentaje de sanos que estuvieron expuestos al factor de riesgo."/>
          <CheckOption checked={useOR} onChange={()=>toggle("or")} label="Odds Ratio a detectar" description="Magnitud de asociación que se desea detectar como significativa."/>

          {selCount<2&&<div style={{background:"#fef3c7",border:"1px solid #fde68a",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#92400e",marginTop:8}}>Selecciona exactamente 2 opciones.</div>}

          {selCount===2&&(<div style={{marginTop:16}}>
            {useP1&&<Field label="Proporción de casos expuestos (p₁)" tooltip="Porcentaje de enfermos expuestos. Obtenlo de estudios previos." value={p1Val} onChange={setP1Val} placeholder="Ej: 50" suffix="%"/>}
            {useP2&&<Field label="Proporción de controles expuestos (p₂)" tooltip="Porcentaje de sanos expuestos." value={p2Val} onChange={setP2Val} placeholder="Ej: 25" suffix="%"/>}
            {useOR&&<Field label="Odds Ratio a detectar" tooltip="OR = 1 sin asociación, OR > 1 factor de riesgo, OR < 1 factor protector." value={orVal} onChange={setORVal} placeholder="Ej: 3.0"/>}

            {derived&&(<div style={{background:"#f0fdf4",border:"1.5px solid #a7f3d0",borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
              <div style={{color:"#10b981",display:"flex"}}><LinkIcon/></div>
              <div style={{fontSize:13,color:"#065f46"}}>
                {derived.type==="or"&&<><b>OR calculada:</b> {derived.value} — derivada de p₁ y p₂.</>}
                {derived.type==="p1"&&<><b>p₁ calculada:</b> {derived.value}% — derivada de p₂ y OR.</>}
                {derived.type==="p2"&&<><b>p₂ calculada:</b> {derived.value}% — derivada de p₁ y OR.</>}
              </div>
            </div>)}
          </div>)}

          <div style={{height:1,background:"#f3f4f6",margin:"4px 0 20px"}}/>

          {/* Step 2: Design */}
          {design==="independent"?(<>
            <SL step="Paso 2" label="Diseño del estudio"/>
            <Field label="Número de controles por caso" tooltip="Razón controles:casos. Valores de 1 a 4 son comunes." value={ctrlPerCase} onChange={setCtrlPerCase} placeholder="1"/>
            <QuickBtns values={["1","2","3","4"]} current={ctrlPerCase} onSelect={setCtrlPerCase} suffix=":1"/>
            <Field label="Nivel de confianza" tooltip="95% es el estándar." value={confidence} onChange={setConfidence} placeholder="95" suffix="%"/>
            <QuickBtns values={["90","95","99"]} current={confidence} onSelect={setConfidence} suffix="%"/>

            <label style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderRadius:12,border:yates?"2px solid #10b981":"2px solid #e5e7eb",background:yates?"#f0fdf4":"white",cursor:"pointer",marginBottom:20}}>
              <div style={{width:22,height:22,borderRadius:6,border:yates?"2px solid #10b981":"2px solid #d1d5db",background:yates?"#10b981":"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {yates&&<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <div><div style={{fontSize:14,fontWeight:600,color:yates?"#065f46":"#374151"}}>Corrección de Yates (χ²c)</div><div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Recomendada para tamaños esperados por celda pequeños.</div></div>
              <input type="checkbox" checked={yates} onChange={()=>setYates(!yates)} style={{display:"none"}}/>
            </label>
          </>):(<>
            <SL step="Paso 2" label="Nivel de confianza"/>
            <Field label="Nivel de confianza" tooltip="95% estándar." value={confidence} onChange={setConfidence} placeholder="95" suffix="%"/>
            <QuickBtns values={["90","95","99"]} current={confidence} onSelect={setConfidence} suffix="%"/>
          </>)}

          <div style={{height:1,background:"#f3f4f6",margin:"4px 0 20px"}}/>

          {/* Step 3 */}
          <SL step="Paso 3" label={mode==="sampleSize"?"Potencia deseada":"Muestra disponible"}/>
          {mode==="sampleSize"?(<>
            <div style={{display:"flex",gap:4,background:"#f9fafb",borderRadius:10,padding:3,marginBottom:20,border:"1px solid #f3f4f6"}}>
              <button onClick={()=>setUseRange(false)} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:!useRange?"white":"transparent",color:!useRange?"#111827":"#9ca3af",boxShadow:!useRange?"0 1px 2px rgba(0,0,0,0.06)":"none"}}>Valor único</button>
              <button onClick={()=>setUseRange(true)} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:useRange?"white":"transparent",color:useRange?"#111827":"#9ca3af",boxShadow:useRange?"0 1px 2px rgba(0,0,0,0.06)":"none"}}><TableIcon/> Rango</button>
            </div>
            {!useRange?(<><Field label="Potencia estadística (1−β)" tooltip="80% mínimo, 90% ideal." value={pwMin} onChange={setPwMin} placeholder="Ej: 80" suffix="%"/><QuickBtns values={["80","85","90","95"]} current={pwMin} onSelect={setPwMin} suffix="%"/></>):(
              <div style={{background:"#f9fafb",borderRadius:12,padding:"20px 20px 4px",border:"1px solid #f3f4f6",marginBottom:20}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  <Field label="Mínimo" value={pwMin} onChange={setPwMin} placeholder="80" suffix="%"/>
                  <Field label="Máximo" value={pwMax} onChange={setPwMax} placeholder="95" suffix="%"/>
                  <Field label="Incremento" value={pwInc} onChange={setPwInc} placeholder="5" suffix="%"/>
                </div>
              </div>
            )}
          </>):(<Field label={design==="independent"?"Número de casos":"Número de pares"} tooltip={design==="independent"?"Casos disponibles. Controles según razón.":"Pares caso-control disponibles."} value={nInput} onChange={setNInput} placeholder="Ej: 80"/>)}
        </div>

        {/* Actions */}
        <div className="anim-cinematic" style={{display:"flex",gap:10,marginTop:20,animationDelay:"700ms"}}>
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
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#059669",marginBottom:16,display:"flex",alignItems:"center",gap:6}}><CheckIcon/> Resultado</div>
                  {result.design==="independent"?(
                    <div style={{display:"flex",gap:32,flexWrap:"wrap"}}>
                      {[{label:"Casos",value:result.cases,delay:"0.5s"},{label:"Controles",value:result.controls,delay:"0.6s"},{label:"Total",value:result.total,delay:"0.7s"}].map(it=>(
                        <div key={it.label}><div style={{fontSize:12,fontWeight:600,color:"#059669",marginBottom:4}}>{it.label}</div><span style={{fontSize:44,fontWeight:800,color:"#065f46",fontFamily:"'DM Mono',monospace",letterSpacing:"-0.03em",animation:`countUp ${it.delay} cubic-bezier(0.16,1,0.3,1)`}}>{it.value}</span></div>
                      ))}
                    </div>
                  ):(
                    <div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={{fontSize:48,fontWeight:800,color:"#065f46",fontFamily:"'DM Mono',monospace",animation:"countUp 0.5s cubic-bezier(0.16,1,0.3,1)"}}>{result.n}</span><span style={{fontSize:16,fontWeight:600,color:"#059669"}}>pares necesarios</span></div>
                  )}
                </div>
                <div style={{background:"rgba(255,255,255,0.6)",padding:"16px 28px",display:"flex",flexWrap:"wrap",gap:"8px 20px"}}>
                  <span style={{fontSize:12,color:"#065f46"}}><b>p₁:</b> {result.params.p1}%</span>
                  <span style={{fontSize:12,color:"#065f46"}}><b>p₂:</b> {result.params.p2}%</span>
                  <span style={{fontSize:12,color:"#065f46"}}><b>OR:</b> {result.params.or}</span>
                  <span style={{fontSize:12,color:"#065f46"}}><b>Potencia:</b> {result.params.power}%</span>
                  <span style={{fontSize:12,color:"#065f46"}}><b>Confianza:</b> {result.params.confidence}%</span>
                  {result.design==="independent"&&<span style={{fontSize:12,color:"#065f46"}}><b>Razón:</b> {result.params.r}:1</span>}
                  {result.params.yates&&<span style={{fontSize:12,color:"#065f46"}}><b>Yates:</b> Sí</span>}
                </div>
                <div style={{background:"rgba(255,255,255,0.4)",padding:"16px 28px",borderTop:"1px solid rgba(16,185,129,0.15)",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:24,height:24,borderRadius:8,background:"#10b981",display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0,marginTop:1}}><SparkleIcon/></div>
                  <div style={{fontSize:13,color:"#065f46",lineHeight:1.6}}>
                    <b>Interpretación IA:</b>
                    {result.design==="independent"
                      ?<> Necesitas <b>{result.cases} casos</b> y <b>{result.controls} controles</b> ({result.total} en total) para detectar un OR de {result.params.or} con {result.params.power}% de potencia al {result.params.confidence}% de confianza.{result.params.yates?" Se aplicó corrección de Yates.":""}{parseFloat(result.params.r)>1?` La razón de ${result.params.r} controles por caso compensa la dificultad de reclutar casos.`:""}</>
                      :<> Necesitas <b>{result.n} pares caso-control</b> emparejados para detectar un OR de {result.params.or} con {result.params.power}% de potencia al {result.params.confidence}% de confianza. Cada par debe estar emparejado por las variables de confusión relevantes.</>
                    }
                  </div>
                </div>
              </div>
            )}

            {result.type==="power"&&(
              <div style={{background:"linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)",border:"2px solid #6ee7b7",borderRadius:16,overflow:"hidden"}}>
                <div style={{padding:"24px 28px 20px"}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#059669",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><CheckIcon/> Resultado</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={{fontSize:48,fontWeight:800,color:"#065f46",fontFamily:"'DM Mono',monospace",animation:"countUp 0.5s cubic-bezier(0.16,1,0.3,1)"}}>{result.value}%</span><span style={{fontSize:16,fontWeight:600,color:"#059669"}}>potencia estadística</span></div>
                  <PowerBar value={result.value}/>
                </div>
                <div style={{background:"rgba(255,255,255,0.6)",padding:"16px 28px",display:"flex",flexWrap:"wrap",gap:"8px 20px"}}>
                  <span style={{fontSize:12,color:"#065f46"}}><b>OR:</b> {result.params.or}</span>
                  {result.design==="independent"?<><span style={{fontSize:12,color:"#065f46"}}><b>Casos:</b> {result.params.nCases}</span><span style={{fontSize:12,color:"#065f46"}}><b>Controles:</b> {result.params.nCtrl}</span></>:<span style={{fontSize:12,color:"#065f46"}}><b>Pares:</b> {result.params.nInput}</span>}
                </div>
                <div style={{background:"rgba(255,255,255,0.4)",padding:"16px 28px",borderTop:"1px solid rgba(16,185,129,0.15)",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:24,height:24,borderRadius:8,background:"#10b981",display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0,marginTop:1}}><SparkleIcon/></div>
                  <div style={{fontSize:13,color:"#065f46",lineHeight:1.6}}>
                    <b>Interpretación IA:</b> Con tu muestra tienes <b>{result.value}%</b> de potencia.
                    {parseFloat(result.value)>=80?" Adecuado.":parseFloat(result.value)>=60?" Debajo del 80% recomendado.":" Insuficiente. Alto riesgo de error tipo II."}
                  </div>
                </div>
              </div>
            )}

            {result.type==="range"&&(
              <div style={{background:"white",border:"2px solid #6ee7b7",borderRadius:16,overflow:"hidden"}}>
                <div style={{background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",padding:"20px 28px"}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#059669",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><CheckIcon/> Tabla comparativa</div>
                  <p style={{fontSize:13,color:"#065f46",margin:0}}>OR = <b>{result.params.or}</b> · p₁ = <b>{result.params.p1}%</b> · p₂ = <b>{result.params.p2}%</b> · Confianza: <b>{result.params.confidence}%</b>{result.params.r&&<> · Razón: <b>{result.params.r}:1</b></>}</p>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                    <thead><tr style={{background:"#f9fafb"}}>
                      <th style={{padding:"12px 20px",textAlign:"left",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e5e7eb"}}>Potencia</th>
                      {result.design==="independent"?(<>
                        <th style={{padding:"12px 16px",textAlign:"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",borderBottom:"1px solid #e5e7eb"}}>Casos</th>
                        <th style={{padding:"12px 16px",textAlign:"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",borderBottom:"1px solid #e5e7eb"}}>Controles</th>
                        <th style={{padding:"12px 20px",textAlign:"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",borderBottom:"1px solid #e5e7eb"}}>Total</th>
                      </>):<th style={{padding:"12px 28px",textAlign:"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",borderBottom:"1px solid #e5e7eb"}}>Pares</th>}
                    </tr></thead>
                    <tbody>
                      {result.values.map((row: any,i: number)=>(
                        <tr key={i} style={{background:i%2===0?"white":"#fafbfc"}} onMouseEnter={e=>{e.currentTarget.style.background="#ecfdf5"}} onMouseLeave={e=>{e.currentTarget.style.background=i%2===0?"white":"#fafbfc"}}>
                          <td style={{padding:"12px 20px",borderBottom:"1px solid #f3f4f6",color:"#374151",fontWeight:500}}>{row.power}%</td>
                          {result.design==="independent"?(<>
                            <td style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:700,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{row.cases.toLocaleString()}</td>
                            <td style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:600,color:"#0d9488",fontFamily:"'DM Mono',monospace"}}>{row.controls.toLocaleString()}</td>
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
                    <b>Interpretación IA:</b> La tabla muestra los tamaños necesarios por potencia para detectar un OR de {result.params.or}.
                    {result.values.length>1&&<>{" "}Con {result.values[0].power}% → <b>{(result.values[0].total||result.values[0].n).toLocaleString()}</b>, con {result.values[result.values.length-1].power}% → <b>{(result.values[result.values.length-1].total||result.values[result.values.length-1].n).toLocaleString()}</b>.</>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formula */}
        <div className="anim-cinematic" style={{marginTop:24,background:"white",borderRadius:14,border:"1.5px solid #e5e7eb",padding:"20px 24px",animationDelay:"800ms"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Referencia de fórmula ({design==="independent"?"Kelsey":"McNemar"})</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#374151",background:"#f9fafb",padding:"14px 18px",borderRadius:10,lineHeight:2}}>
            {design==="independent"?(<>
              n<sub>casos</sub> = [Z<sub>α/2</sub>√((r+1)p̄q̄) + Z<sub>β</sub>√(rp₁q₁+p₂q₂)]² / [r(p₁−p₂)²]<br/>
              n<sub>controles</sub> = n<sub>casos</sub> · r
              {yates&&<><br/><span style={{color:"#059669"}}>Con corrección de Yates</span></>}
            </>):(<>
              n = [Z<sub>α/2</sub>√(p<sub>d</sub>) + Z<sub>β</sub>√(p<sub>d</sub>−(p₁−p₂)²)]² / (p₁−p₂)²<br/>
              p<sub>d</sub> = p₁(1−p₂) + (1−p₁)p₂
            </>)}
          </div>
          <p style={{fontSize:12,color:"#9ca3af",margin:"10px 0 0",lineHeight:1.5}}>
            {design==="independent"
              ?"Donde p̄ = (p₁+r·p₂)/(1+r), r = controles por caso. OR = (p₁·q₂)/(p₂·q₁)."
              :"Donde pd = pares discordantes, p₁ = casos expuestos, p₂ = controles expuestos. Prueba de McNemar para datos emparejados."
            }
          </p>
        </div>
      </div>
    </div>
  );
}
