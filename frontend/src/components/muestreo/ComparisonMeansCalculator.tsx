import { useState, useEffect } from "react";

/* ─── Normal Inverse ─── */
function normalInv(p: number): number {
  const a=[-3.969683028665376e1,2.209460984245205e2,-2.759285104469687e2,1.383577518672690e2,-3.066479806614716e1,2.506628277459239e0];
  const b=[-5.447609879822406e1,1.615858368580409e2,-1.556989798598866e2,6.680131188771972e1,-1.328068155288572e1];
  const c=[-7.784894002430293e-3,-3.223964580411365e-1,-2.400758277161838e0,-2.549732539343734e0,4.374664141464968e0,2.938163982698783e0];
  const d=[7.784695709041462e-3,3.224671290700398e-1,2.445134137142996e0,3.754408661907416e0];
  const pLow=0.02425,pHigh=1-pLow; let q: number,r: number;
  if(p<pLow){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
  else if(p<=pHigh){q=p-0.5;r=q*q;return((((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q)/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)}
  else{q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
}
function normalCDF(x: number): number {const t=1/(1+0.2316419*Math.abs(x));const d=0.3989422804014327;const p=d*Math.exp(-x*x/2)*(t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.8212560+t*1.3302744)))));return x>0?1-p:p;}

/* ─── Interfaces ─── */
interface IndepParams { diff: number; sdCommon: number; sd1: number; sd2: number; stdDiff: number; option: string; varEqual: boolean; ratio: number; confidence: number; }
interface IndepSampleParams extends IndepParams { power: number; }
interface IndepPowerParams extends IndepParams { n1Input: number; }
interface IndepRangeParams extends IndepParams { min: number; max: number; increment: number; }
interface PairedParams { diff: number; sd1: number; sd2: number; rho: number; sdDiff: number; option: string; confidence: number; }
interface PairedSampleParams extends PairedParams { power: number; }
interface PairedPowerParams extends PairedParams { nInput: number; }
interface PairedRangeParams extends PairedParams { min: number; max: number; increment: number; }

/* ─── Independent Means ─── */
function calcIndepSampleSize({diff,sdCommon,sd1,sd2,stdDiff,option,varEqual,ratio,confidence,power}: IndepSampleParams){
  const alpha=1-confidence/100;const za=Math.abs(normalInv(alpha/2));const zb=Math.abs(normalInv(1-power/100));
  const r=ratio; let n1: number;
  if(varEqual){
    if(option==="opt1") n1=Math.max(2, Math.ceil(Math.pow(za+zb,2)*sdCommon*sdCommon*(1+1/r)/(diff*diff)));
    else n1=Math.max(2, Math.ceil(Math.pow(za+zb,2)*(1+1/r)/(stdDiff*stdDiff)));
  } else {
    n1=Math.max(2, Math.ceil(Math.pow(za+zb,2)*(sd1*sd1+sd2*sd2/r)/(diff*diff)));
  }
  const n2=Math.max(2, Math.ceil(n1*r));
  return {n1,n2,total:n1+n2};
}
function calcIndepPower({diff,sdCommon,sd1,sd2,stdDiff,option,varEqual,ratio,confidence,n1Input}: IndepPowerParams){
  const alpha=1-confidence/100;const za=Math.abs(normalInv(alpha/2));
  const r=ratio;const n1=n1Input;
  let varTerm: number;
  if(varEqual){
    if(option==="opt1") varTerm=sdCommon*sdCommon*(1+1/r)/n1;
    else varTerm=(1+1/r)/n1;
  } else { varTerm=(sd1*sd1+sd2*sd2/r)/n1; }
  const effectSize=varEqual&&option==="opt2"?stdDiff:diff;
  const zb=effectSize/Math.sqrt(varTerm)-za;
  return Math.max(0,Math.min(100,normalCDF(zb)*100));
}
function calcIndepRange({diff,sdCommon,sd1,sd2,stdDiff,option,varEqual,ratio,confidence,min,max,increment}: IndepRangeParams){
  const results: any[]=[];
  for(let pw=min;pw<=max+0.0001;pw+=increment){
    const res=calcIndepSampleSize({diff,sdCommon,sd1,sd2,stdDiff,option,varEqual,ratio,confidence,power:pw});
    results.push({power:parseFloat(pw.toFixed(1)),...res});
  }
  return results;
}

/* ─── Paired Means ─── */
function calcPairedSampleSize({diff,sd1,sd2,rho,sdDiff,option,confidence,power}: PairedSampleParams){
  const alpha=1-confidence/100;const za=Math.abs(normalInv(alpha/2));const zb=Math.abs(normalInv(1-power/100));
  let sdD: number;
  if(option==="opt1") sdD=Math.sqrt(sd1*sd1+sd2*sd2-2*rho*sd1*sd2);
  else sdD=sdDiff;
  const n=Math.max(3, Math.ceil(Math.pow(za+zb,2)*sdD*sdD/(diff*diff)));
  return {n,sdD};
}
function calcPairedPower({diff,sd1,sd2,rho,sdDiff,option,confidence,nInput}: PairedPowerParams){
  const alpha=1-confidence/100;const za=Math.abs(normalInv(alpha/2));
  let sdD: number;
  if(option==="opt1") sdD=Math.sqrt(sd1*sd1+sd2*sd2-2*rho*sd1*sd2);
  else sdD=sdDiff;
  const zb=diff*Math.sqrt(nInput)/(sdD)-za;
  return {power:Math.max(0,Math.min(100,normalCDF(zb)*100)),sdD};
}
function calcPairedRange({diff,sd1,sd2,rho,sdDiff,option,confidence,min,max,increment}: PairedRangeParams){
  const results: any[]=[];
  for(let pw=min;pw<=max+0.0001;pw+=increment){
    const res=calcPairedSampleSize({diff,sd1,sd2,rho,sdDiff,option,confidence,power:pw});
    results.push({power:parseFloat(pw.toFixed(1)),n:res.n});
  }
  return results;
}

/* ─── Icons ─── */
const InfoIcon=()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>);
const SparkleIcon=()=>(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/></svg>);
const BackIcon=()=>(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>);
const CalcIcon=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/></svg>);
const CheckIcon=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);
const ResetIcon=()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>);
const TableIcon=()=>(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>);

/* ─── Tooltip ─── */
function Tooltip({children,text}: {children: React.ReactNode; text: string}){const[show,setShow]=useState(false);return(<span onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} style={{position:"relative",display:"inline-flex",cursor:"help"}}>{children}{show&&(<span style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:"#1f2937",color:"#f9fafb",fontSize:12,lineHeight:1.5,padding:"10px 14px",borderRadius:10,width:280,zIndex:100,boxShadow:"0 10px 30px rgba(0,0,0,0.2)",pointerEvents:"none",fontWeight:400}}>{text}<span style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1f2937"}}/></span>)}</span>)}

/* ─── Stepper ─── */
function Stepper({steps,current}: {steps: {num: number; label: string}[]; current: number}){return(<div style={{display:"flex",alignItems:"center",gap:0,marginBottom:32}}>{steps.map((s,i)=>{const done=current>s.num,active=current===s.num;return(<div key={s.num} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:"none"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,background:done?"#10b981":active?"#ecfdf5":"#f3f4f6",color:done?"white":active?"#059669":"#9ca3af",border:active?"2px solid #10b981":done?"2px solid #10b981":"2px solid #e5e7eb",transition:"all 0.3s ease"}}>{done?<CheckIcon/>:s.num}</div><span style={{fontSize:13,fontWeight:active?700:500,color:active?"#059669":done?"#10b981":"#9ca3af",transition:"all 0.3s ease",whiteSpace:"nowrap"}}>{s.label}</span></div>{i<steps.length-1&&(<div style={{flex:1,height:2,marginLeft:12,marginRight:12,background:done?"#10b981":"#e5e7eb",borderRadius:2,transition:"background 0.3s ease"}}/>)}</div>)})}</div>)}

/* ─── Field ─── */
function Field({label,tooltip,value,onChange,placeholder,suffix,optional,disabled,hint}: {label: string; tooltip?: string; value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string; optional?: boolean; disabled?: boolean; hint?: string}){const[focused,setFocused]=useState(false);return(<div style={{marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><label style={{fontSize:13,fontWeight:600,color:"#374151"}}>{label}</label>{optional&&<span style={{fontSize:11,color:"#9ca3af",fontWeight:500}}>(opcional)</span>}{tooltip&&(<Tooltip text={tooltip}><span style={{color:"#9ca3af",display:"flex"}}><InfoIcon/></span></Tooltip>)}</div><div style={{display:"flex",alignItems:"center",border:focused?"2px solid #10b981":"2px solid #e5e7eb",borderRadius:10,background:disabled?"#f9fafb":"white",transition:"all 0.2s ease",boxShadow:focused?"0 0 0 3px rgba(16,185,129,0.1)":"none",overflow:"hidden"}}><input type="number" value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder={placeholder} disabled={disabled} step="any" style={{flex:1,border:"none",outline:"none",padding:"12px 14px",fontSize:14,fontFamily:"'DM Sans',sans-serif",background:"transparent",color:disabled?"#9ca3af":"#111827"}}/>{suffix&&(<span style={{padding:"0 14px",fontSize:13,color:"#6b7280",fontWeight:600,borderLeft:"1px solid #f3f4f6",background:"#f9fafb",alignSelf:"stretch",display:"flex",alignItems:"center"}}>{suffix}</span>)}</div>{hint&&<p style={{fontSize:12,color:"#9ca3af",margin:"6px 0 0",lineHeight:1.4}}>{hint}</p>}</div>)}

/* ─── RadioCard ─── */
function RadioCard({selected,onClick,label,description}: {selected: boolean; onClick: () => void; label: string; description?: string}){return(<div onClick={onClick} style={{padding:"14px 16px",borderRadius:12,cursor:"pointer",border:selected?"2px solid #10b981":"2px solid #e5e7eb",background:selected?"#f0fdf4":"white",transition:"all 0.2s ease",flex:1}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,border:selected?"6px solid #10b981":"2px solid #d1d5db",background:"white",transition:"all 0.2s ease"}}/><div><div style={{fontSize:14,fontWeight:600,color:selected?"#065f46":"#374151"}}>{label}</div>{description&&<div style={{fontSize:12,color:"#6b7280",marginTop:2,lineHeight:1.4}}>{description}</div>}</div></div></div>)}

/* ─── QuickBtns ─── */
function QuickBtns({values,current,onSelect,prefix,suffix}: {values: string[]; current: string; onSelect: (v: string) => void; prefix?: string; suffix?: string}){return(<div style={{display:"flex",gap:6,marginTop:-12,marginBottom:20,flexWrap:"wrap"}}><span style={{fontSize:11,color:"#9ca3af",fontWeight:600,alignSelf:"center",marginRight:4}}>Frecuentes:</span>{values.map(v=>(<button key={v} onClick={()=>onSelect(v)} style={{padding:"4px 14px",borderRadius:8,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:current===v?"#ecfdf5":"#f9fafb",color:current===v?"#059669":"#9ca3af",transition:"all 0.15s ease"}}>{prefix||""}{v}{suffix||""}</button>))}</div>)}

/* ─── SectionLabel ─── */
function SectionLabel({step,label}: {step: string; label: string}){return(<div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#10b981",marginBottom:16,display:"flex",alignItems:"center",gap:6}}><span style={{width:20,height:2,background:"#10b981",borderRadius:2,display:"inline-block"}}/>{step} · {label}</div>)}

/* ─── Power Visual ─── */
function PowerBar({value}: {value: string}){const pw=parseFloat(value)||0;const color=pw>=80?"#10b981":pw>=60?"#eab308":"#ef4444";const label=pw>=80?"Adecuada":pw>=60?"Baja":"Insuficiente";return(<div style={{marginBottom:20}}><div style={{height:8,borderRadius:4,background:"#f3f4f6",overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,background:color,width:`${Math.min(100,pw)}%`,transition:"width 0.4s ease"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:6}}><span style={{color:"#9ca3af"}}>0%</span><span style={{color,fontWeight:700}}>Potencia {pw.toFixed(1)}% — {label}</span><span style={{color:"#9ca3af"}}>100%</span></div></div>)}

/* ─── MAIN ─── */
interface ComparisonMeansCalculatorProps { onBack?: () => void; }

export function ComparisonMeansCalculator({ onBack }: ComparisonMeansCalculatorProps) {
  const[designType,setDesignType]=useState<'independent'|'paired'>("independent");
  const[confidence,setConfidence]=useState("95");
  const[mode,setMode]=useState<'sampleSize'|'power'>("sampleSize");
  const[useRange,setUseRange]=useState(false);
  const[powerMin,setPowerMin]=useState("");
  const[powerMax,setPowerMax]=useState("");
  const[powerInc,setPowerInc]=useState("");
  const[nInput,setNInput]=useState("");
  const[result,setResult]=useState<any>(null);
  const[showResult,setShowResult]=useState(false);
  const[currentStep,setCurrentStep]=useState(1);
  const[varEqual,setVarEqual]=useState(true);
  const[indepOption,setIndepOption]=useState("opt2");
  const[indepDiff,setIndepDiff]=useState("");
  const[indepSdCommon,setIndepSdCommon]=useState("");
  const[indepSd1,setIndepSd1]=useState("");
  const[indepSd2,setIndepSd2]=useState("");
  const[indepStdDiff,setIndepStdDiff]=useState("5");
  const[indepRatio,setIndepRatio]=useState("1");
  const[pairedOption,setPairedOption]=useState("opt1");
  const[pairedDiff,setPairedDiff]=useState("");
  const[pairedSd1,setPairedSd1]=useState("");
  const[pairedSd2,setPairedSd2]=useState("");
  const[pairedRho,setPairedRho]=useState("");
  const[pairedSdDiff,setPairedSdDiff]=useState("");

  const steps=designType==="independent"
    ?[{num:1,label:"Datos"},{num:2,label:"Diseño"},{num:3,label:"Potencia"}]
    :[{num:1,label:"Datos"},{num:2,label:"Confianza"},{num:3,label:"Potencia"}];

  useEffect(()=>{
    const hasPower=mode==="sampleSize"?(powerMin||powerMax):nInput;
    if(designType==="independent"){
      const hasData=varEqual?(indepOption==="opt1"?(indepDiff&&indepSdCommon):(indepStdDiff)):(indepDiff&&indepSd1&&indepSd2);
      if(hasPower&&hasData&&confidence) setCurrentStep(3);
      else if(hasData&&indepRatio) setCurrentStep(2);
      else setCurrentStep(1);
    } else {
      const hasData=pairedOption==="opt1"?(pairedDiff&&pairedSd1&&pairedSd2&&pairedRho):(pairedDiff&&pairedSdDiff);
      if(hasPower&&hasData&&confidence) setCurrentStep(3);
      else if(hasData) setCurrentStep(2);
      else setCurrentStep(1);
    }
  },[designType,varEqual,indepOption,indepDiff,indepSdCommon,indepSd1,indepSd2,indepStdDiff,indepRatio,pairedOption,pairedDiff,pairedSd1,pairedSd2,pairedRho,pairedSdDiff,confidence,powerMin,powerMax,nInput,mode]);

  const handleCalc=()=>{
    const confNum=parseFloat(confidence); if(!confNum) return;
    if(designType==="independent"){
      const diff=parseFloat(indepDiff);const sdC=parseFloat(indepSdCommon);
      const s1=parseFloat(indepSd1);const s2=parseFloat(indepSd2);
      const stdD=parseFloat(indepStdDiff);const r=parseFloat(indepRatio)||1;
      const baseParams={diff,sdCommon:sdC,sd1:s1,sd2:s2,stdDiff:stdD,option:indepOption,varEqual,ratio:r,confidence:confNum};
      if(mode==="sampleSize"){
        if(useRange){
          const mn=parseFloat(powerMin),mx=parseFloat(powerMax),inc=parseFloat(powerInc);
          if(!mn||!mx||!inc) return;
          const vals=calcIndepRange({...baseParams,min:mn,max:mx,increment:inc});
          setResult({type:"range",design:"independent",values:vals,params:{...baseParams}});
        } else {
          const pw=parseFloat(powerMin);if(!pw) return;
          const res=calcIndepSampleSize({...baseParams,power:pw});
          setResult({type:"sampleSize",design:"independent",...res,params:{...baseParams,power:pw}});
        }
      } else {
        const n1=parseFloat(nInput);if(!n1) return;
        const pw=calcIndepPower({...baseParams,n1Input:n1});
        setResult({type:"power",design:"independent",value:pw.toFixed(2),params:{...baseParams,n1Input:n1,n2:Math.ceil(n1*r)}});
      }
    } else {
      const diff=parseFloat(pairedDiff);const s1=parseFloat(pairedSd1);const s2=parseFloat(pairedSd2);
      const rho=parseFloat(pairedRho);const sdD=parseFloat(pairedSdDiff);
      const baseParams={diff,sd1:s1,sd2:s2,rho,sdDiff:sdD,option:pairedOption,confidence:confNum};
      if(mode==="sampleSize"){
        if(useRange){
          const mn=parseFloat(powerMin),mx=parseFloat(powerMax),inc=parseFloat(powerInc);
          if(!mn||!mx||!inc) return;
          const vals=calcPairedRange({...baseParams,min:mn,max:mx,increment:inc});
          setResult({type:"range",design:"paired",values:vals,params:{...baseParams}});
        } else {
          const pw=parseFloat(powerMin);if(!pw) return;
          const res=calcPairedSampleSize({...baseParams,power:pw});
          setResult({type:"sampleSize",design:"paired",n:res.n,sdD:res.sdD,params:{...baseParams,power:pw}});
        }
      } else {
        const n=parseFloat(nInput);if(!n) return;
        const res=calcPairedPower({...baseParams,nInput:n});
        setResult({type:"power",design:"paired",value:res.power.toFixed(2),sdD:res.sdD,params:{...baseParams,nInput:n}});
      }
    }
    setShowResult(true);
  };

  const handleReset=()=>{
    setIndepDiff("");setIndepSdCommon("");setIndepSd1("");setIndepSd2("");setIndepStdDiff("5");setIndepRatio("1");
    setPairedDiff("");setPairedSd1("");setPairedSd2("");setPairedRho("");setPairedSdDiff("");
    setConfidence("95");setPowerMin("");setPowerMax("");setPowerInc("");setNInput("");
    setResult(null);setShowResult(false);setUseRange(false);
  };

  const canCalcIndep=!!(confidence&&(varEqual?(indepOption==="opt1"?(indepDiff&&indepSdCommon):(indepStdDiff)):(indepDiff&&indepSd1&&indepSd2))&&indepRatio&&(mode==="sampleSize"?(useRange?(powerMin&&powerMax&&powerInc):powerMin):nInput));
  const canCalcPaired=!!(confidence&&(pairedOption==="opt1"?(pairedDiff&&pairedSd1&&pairedSd2&&pairedRho):(pairedDiff&&pairedSdDiff))&&(mode==="sampleSize"?(useRange?(powerMin&&powerMax&&powerInc):powerMin):nInput));
  const canCalc=designType==="independent"?canCalcIndep:canCalcPaired;

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
          <span style={{color:"#d1d5db"}}>/</span>
          <span style={{color:"#9ca3af"}}>Contraste de hipótesis</span>
          <span style={{color:"#d1d5db"}}>/</span>
          <span style={{color:"#374151"}}>Comparación de medias</span>
        </div>

        {/* Title */}
        <div className="anim-fadeRight" style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:8,animationDelay:"100ms"}}>
          <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",display:"flex",alignItems:"center",justifyContent:"center",color:"#059669",flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>
          </div>
          <div>
            <h1 style={{fontSize:24,fontWeight:800,margin:0,color:"#111827",letterSpacing:"-0.02em"}}>Comparación de Medias</h1>
            <p style={{fontSize:14,color:"#6b7280",margin:"4px 0 0",lineHeight:1.5}}>Contraste de hipótesis — Calcula el tamaño de muestra o la potencia estadística para detectar diferencias entre medias.</p>
          </div>
        </div>

        {/* AI Helper */}
        <div className="anim-cinematic" style={{animationDelay:"200ms",background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)",border:"1px solid #a7f3d0",borderRadius:12,padding:"12px 16px",margin:"20px 0 28px",display:"flex",alignItems:"center",gap:10,fontSize:13,color:"#065f46",cursor:"pointer"}}>
          <div style={{background:"#10b981",borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0}}><SparkleIcon/></div>
          <span><b>Asistente IA:</b> ¿No sabes qué diferencia o desviación usar? Puedo ayudarte a encontrar valores de referencia en la literatura para tu variable.</span>
        </div>

        {/* Design type tabs */}
        <div className="anim-cinematic" style={{display:"flex",gap:4,background:"#f3f4f6",borderRadius:12,padding:4,marginBottom:28,animationDelay:"300ms"}}>
          {([{id:"independent" as const,label:"Grupos independientes",icon:"👥"},{id:"paired" as const,label:"Grupos emparejados",icon:"🔗"}]).map(t=>(
            <button key={t.id} onClick={()=>{setDesignType(t.id);setShowResult(false);setResult(null)}}
              style={{flex:1,padding:"11px 16px",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.25s ease",background:designType===t.id?"white":"transparent",color:designType===t.id?"#111827":"#6b7280",boxShadow:designType===t.id?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Mode selector */}
        <div className="anim-cinematic" style={{display:"flex",gap:4,background:"#f3f4f6",borderRadius:12,padding:4,marginBottom:28,animationDelay:"400ms"}}>
          {([{id:"sampleSize" as const,label:"Calcular tamaño de muestra",icon:"📐"},{id:"power" as const,label:"Calcular potencia",icon:"⚡"}]).map(m=>(
            <button key={m.id} onClick={()=>{setMode(m.id);setShowResult(false);setResult(null)}}
              style={{flex:1,padding:"11px 16px",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.25s ease",background:mode===m.id?"white":"transparent",color:mode===m.id?"#111827":"#6b7280",boxShadow:mode===m.id?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>
              <span>{m.icon}</span>{m.label}
            </button>
          ))}
        </div>

        <div className="anim-cinematic" style={{animationDelay:"500ms"}}><Stepper steps={steps} current={currentStep}/></div>

        {/* Form */}
        <div className="anim-cinematic" style={{animationDelay:"600ms",background:"white",borderRadius:16,border:"1.5px solid #e5e7eb",padding:"28px 28px 8px",boxShadow:"0 1px 4px rgba(0,0,0,0.03)"}}>

          {/* ─── INDEPENDENT ─── */}
          {designType==="independent"&&(<>
            <SectionLabel step="Paso 1" label="Datos del efecto"/>
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              <RadioCard selected={varEqual} onClick={()=>{setVarEqual(true);setShowResult(false)}} label="Varianzas iguales" description="Los dos grupos tienen dispersión similar."/>
              <RadioCard selected={!varEqual} onClick={()=>{setVarEqual(false);setIndepOption("opt1");setShowResult(false)}} label="Varianzas distintas" description="Los grupos tienen dispersiones diferentes."/>
            </div>

            {varEqual&&(<>
              <div style={{display:"flex",gap:4,background:"#f9fafb",borderRadius:10,padding:3,marginBottom:20,border:"1px solid #f3f4f6"}}>
                <button onClick={()=>setIndepOption("opt1")} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:indepOption==="opt1"?"white":"transparent",color:indepOption==="opt1"?"#111827":"#9ca3af",boxShadow:indepOption==="opt1"?"0 1px 2px rgba(0,0,0,0.06)":"none",transition:"all 0.2s ease"}}>Opción 1: Diferencia + DE</button>
                <button onClick={()=>setIndepOption("opt2")} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:indepOption==="opt2"?"white":"transparent",color:indepOption==="opt2"?"#111827":"#9ca3af",boxShadow:indepOption==="opt2"?"0 1px 2px rgba(0,0,0,0.06)":"none",transition:"all 0.2s ease"}}>Opción 2: Dif. estandarizada</button>
              </div>
              {indepOption==="opt1"?(<>
                <Field label="Diferencia de medias a detectar" tooltip="La diferencia mínima clínicamente relevante entre los dos grupos que deseas detectar." value={indepDiff} onChange={setIndepDiff} placeholder="Ej: 5"/>
                <Field label="Desviación estándar común (σ)" tooltip="La desviación estándar que se asume igual en ambos grupos. Obtenla de estudios previos o prueba piloto." value={indepSdCommon} onChange={setIndepSdCommon} placeholder="Ej: 10"/>
              </>):(<>
                <Field label="Diferencia estandarizada de medias (δ)" tooltip="La diferencia entre medias dividida por la desviación estándar común (effect size de Cohen). Valores: 0.2=pequeño, 0.5=mediano, 0.8=grande." value={indepStdDiff} onChange={setIndepStdDiff} placeholder="Ej: 0.5" hint="Cohen: 0.2 = pequeño, 0.5 = mediano, 0.8 = grande"/>
              </>)}
            </>)}
            {!varEqual&&(<>
              <Field label="Diferencia de medias a detectar" tooltip="La diferencia mínima clínicamente relevante entre los dos grupos." value={indepDiff} onChange={setIndepDiff} placeholder="Ej: 5"/>
              <Field label="Desviación estándar — Grupo 1 (σ₁)" tooltip="Desviación estándar esperada en el grupo 1." value={indepSd1} onChange={setIndepSd1} placeholder="Ej: 10"/>
              <Field label="Desviación estándar — Grupo 2 (σ₂)" tooltip="Desviación estándar esperada en el grupo 2." value={indepSd2} onChange={setIndepSd2} placeholder="Ej: 15"/>
            </>)}

            <div style={{height:1,background:"#f3f4f6",margin:"4px 0 20px"}}/>
            <SectionLabel step="Paso 2" label="Diseño del estudio"/>
            <Field label="Razón entre tamaños muestrales (n₂/n₁)" tooltip="Proporción del grupo 2 respecto al grupo 1. Valor 1 = grupos iguales. Valor 2 = el grupo 2 tendrá el doble de sujetos." value={indepRatio} onChange={setIndepRatio} placeholder="1"/>
            <QuickBtns values={["1","1.5","2","3"]} current={indepRatio} onSelect={setIndepRatio} suffix=":1"/>
            <Field label="Nivel de confianza" tooltip="95% es el estándar (equivale a α bilateral = 0.05)." value={confidence} onChange={setConfidence} placeholder="95" suffix="%"/>
            <QuickBtns values={["90","95","99"]} current={confidence} onSelect={setConfidence} suffix="%"/>
          </>)}

          {/* ─── PAIRED ─── */}
          {designType==="paired"&&(<>
            <SectionLabel step="Paso 1" label="Datos del efecto"/>
            <Field label="Diferencia de medias a detectar" tooltip="La diferencia mínima clínicamente relevante entre las dos mediciones (antes-después, etc.)." value={pairedDiff} onChange={setPairedDiff} placeholder="Ej: 3"/>
            <div style={{display:"flex",gap:4,background:"#f9fafb",borderRadius:10,padding:3,marginBottom:20,border:"1px solid #f3f4f6"}}>
              <button onClick={()=>setPairedOption("opt1")} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:pairedOption==="opt1"?"white":"transparent",color:pairedOption==="opt1"?"#111827":"#9ca3af",boxShadow:pairedOption==="opt1"?"0 1px 2px rgba(0,0,0,0.06)":"none",transition:"all 0.2s ease"}}>Opción 1: DE por población + ρ</button>
              <button onClick={()=>setPairedOption("opt2")} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:pairedOption==="opt2"?"white":"transparent",color:pairedOption==="opt2"?"#111827":"#9ca3af",boxShadow:pairedOption==="opt2"?"0 1px 2px rgba(0,0,0,0.06)":"none",transition:"all 0.2s ease"}}>Opción 2: DE de diferencias</button>
            </div>
            {pairedOption==="opt1"?(<>
              <Field label="Desviación estándar — Población 1 (σ₁)" tooltip="DE de las mediciones en la primera condición (ej. antes del tratamiento)." value={pairedSd1} onChange={setPairedSd1} placeholder="Ej: 8"/>
              <Field label="Desviación estándar — Población 2 (σ₂)" tooltip="DE de las mediciones en la segunda condición (ej. después del tratamiento)." value={pairedSd2} onChange={setPairedSd2} placeholder="Ej: 8"/>
              <Field label="Coeficiente de correlación (ρ)" tooltip="Correlación entre las dos mediciones del mismo sujeto. Valores de 0 a 1. Típicamente 0.5 a 0.8." value={pairedRho} onChange={setPairedRho} placeholder="Ej: 0.5"/>
              <QuickBtns values={["0.3","0.5","0.7","0.8"]} current={pairedRho} onSelect={setPairedRho}/>
              {pairedSd1&&pairedSd2&&pairedRho&&(()=>{const sdD=Math.sqrt(Math.pow(parseFloat(pairedSd1),2)+Math.pow(parseFloat(pairedSd2),2)-2*parseFloat(pairedRho)*parseFloat(pairedSd1)*parseFloat(pairedSd2));return isNaN(sdD)||sdD<=0?null:(<div style={{background:"#f0fdf4",border:"1.5px solid #a7f3d0",borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:10,marginBottom:20}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><div style={{fontSize:13,color:"#065f46"}}><b>σ diferencias calculada:</b> {sdD.toFixed(3)} — derivada de σ₁, σ₂ y ρ.</div></div>)})()}
            </>):(<>
              <Field label="Desviación estándar de las diferencias (σd)" tooltip="La desviación estándar de las diferencias individuales (cada sujeto: valor2 - valor1)." value={pairedSdDiff} onChange={setPairedSdDiff} placeholder="Ej: 5"/>
            </>)}
            <div style={{height:1,background:"#f3f4f6",margin:"4px 0 20px"}}/>
            <SectionLabel step="Paso 2" label="Nivel de confianza"/>
            <Field label="Nivel de confianza" tooltip="95% es el estándar." value={confidence} onChange={setConfidence} placeholder="95" suffix="%"/>
            <QuickBtns values={["90","95","99"]} current={confidence} onSelect={setConfidence} suffix="%"/>
          </>)}

          {/* ─── STEP 3 ─── */}
          <div style={{height:1,background:"#f3f4f6",margin:"4px 0 20px"}}/>
          <SectionLabel step="Paso 3" label={mode==="sampleSize"?"Potencia deseada":"Muestra disponible"}/>
          {mode==="sampleSize"?(<>
            <div style={{display:"flex",gap:4,background:"#f9fafb",borderRadius:10,padding:3,marginBottom:20,border:"1px solid #f3f4f6"}}>
              <button onClick={()=>setUseRange(false)} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:!useRange?"white":"transparent",color:!useRange?"#111827":"#9ca3af",boxShadow:!useRange?"0 1px 2px rgba(0,0,0,0.06)":"none",transition:"all 0.2s ease"}}>Valor único</button>
              <button onClick={()=>setUseRange(true)} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:useRange?"white":"transparent",color:useRange?"#111827":"#9ca3af",boxShadow:useRange?"0 1px 2px rgba(0,0,0,0.06)":"none",transition:"all 0.2s ease"}}><TableIcon/> Rango (tabla)</button>
            </div>
            {!useRange?(<>
              <Field label="Potencia estadística (1−β)" tooltip="Probabilidad de detectar la diferencia si realmente existe. 80% es el mínimo aceptable, 90% es ideal." value={powerMin} onChange={setPowerMin} placeholder="Ej: 80" suffix="%" hint="Valores típicos: 80% (mínimo), 90% (recomendado)."/>
              <QuickBtns values={["80","85","90","95"]} current={powerMin} onSelect={setPowerMin} suffix="%"/>
            </>):(<div style={{background:"#f9fafb",borderRadius:12,padding:"20px 20px 4px",border:"1px solid #f3f4f6",marginBottom:20}}>
              <p style={{fontSize:12,color:"#6b7280",margin:"0 0 16px",lineHeight:1.5}}>Define un rango de potencias para comparar tamaños de muestra.</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <Field label="Mínimo" value={powerMin} onChange={setPowerMin} placeholder="80" suffix="%" tooltip="Potencia mínima."/>
                <Field label="Máximo" value={powerMax} onChange={setPowerMax} placeholder="95" suffix="%" tooltip="Potencia máxima."/>
                <Field label="Incremento" value={powerInc} onChange={setPowerInc} placeholder="5" suffix="%" tooltip="Paso entre valores."/>
              </div>
            </div>)}
          </>):(<>
            <Field label={designType==="independent"?"Tamaño del grupo 1 (n₁)":"Número de pares"} tooltip={designType==="independent"?"Número de sujetos en el grupo 1.":"Número de pares de observaciones (sujetos)."} value={nInput} onChange={setNInput} placeholder="Ej: 30"/>
          </>)}
        </div>

        {/* Actions */}
        <div className="anim-cinematic" style={{display:"flex",gap:10,marginTop:20,animationDelay:"700ms"}}>
          <button onClick={handleCalc} disabled={!canCalc} style={{flex:1,padding:"14px 24px",borderRadius:12,border:"none",cursor:canCalc?"pointer":"not-allowed",fontSize:15,fontWeight:700,fontFamily:"inherit",background:canCalc?"linear-gradient(135deg,#10b981,#059669)":"#e5e7eb",color:canCalc?"white":"#9ca3af",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.25s ease",boxShadow:canCalc?"0 4px 14px rgba(16,185,129,0.3)":"none",transform:"scale(1)"}} onMouseDown={e=>{if(canCalc)e.currentTarget.style.transform="scale(0.98)"}} onMouseUp={e=>{e.currentTarget.style.transform="scale(1)"}}><CalcIcon/> Calcular</button>
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
                  <span style={{fontSize:12,color:"#065f46"}}><b>Potencia:</b> {result.params.power}%</span>
                  <span style={{fontSize:12,color:"#065f46"}}><b>Confianza:</b> {result.params.confidence||confidence}%</span>
                  {result.design==="independent"&&result.params.ratio&&<span style={{fontSize:12,color:"#065f46"}}><b>Razón:</b> {result.params.ratio}:1</span>}
                  {result.sdD&&<span style={{fontSize:12,color:"#065f46"}}><b>σd:</b> {result.sdD.toFixed(3)}</span>}
                </div>
                <div style={{background:"rgba(255,255,255,0.4)",padding:"16px 28px",borderTop:"1px solid rgba(16,185,129,0.15)",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:24,height:24,borderRadius:8,background:"#10b981",display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0,marginTop:1}}><SparkleIcon/></div>
                  <div style={{fontSize:13,color:"#065f46",lineHeight:1.6}}>
                    <b>Interpretación IA:</b>
                    {result.design==="independent"?
                      <> Necesitas <b>{result.n1} sujetos en el grupo 1</b> y <b>{result.n2} en el grupo 2</b> ({result.total} en total) para detectar la diferencia especificada con una potencia del {result.params.power}% al {result.params.confidence||confidence}% de confianza (α bilateral). Considera añadir un 10-20% por posibles pérdidas.</>
                    : <> Necesitas <b>{result.n} pares de observaciones</b> para detectar una diferencia de medias con una potencia del {result.params.power}% al {result.params.confidence}% de confianza. Cada sujeto será medido en ambas condiciones.</>
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
                  {result.design==="independent"&&<><span style={{fontSize:12,color:"#065f46"}}><b>n₁:</b> {result.params.n1Input}</span><span style={{fontSize:12,color:"#065f46"}}><b>n₂:</b> {result.params.n2}</span></>}
                  {result.design==="paired"&&<span style={{fontSize:12,color:"#065f46"}}><b>Pares:</b> {result.params.nInput}</span>}
                  <span style={{fontSize:12,color:"#065f46"}}><b>Confianza:</b> {result.params.confidence}%</span>
                </div>
                <div style={{background:"rgba(255,255,255,0.4)",padding:"16px 28px",borderTop:"1px solid rgba(16,185,129,0.15)",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:24,height:24,borderRadius:8,background:"#10b981",display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0,marginTop:1}}><SparkleIcon/></div>
                  <div style={{fontSize:13,color:"#065f46",lineHeight:1.6}}>
                    <b>Interpretación IA:</b> Con tu muestra actual tienes una potencia de <b>{result.value}%</b>.
                    {parseFloat(result.value)>=80?" Esto es adecuado para la mayoría de estudios.":parseFloat(result.value)>=60?" Esto está por debajo del 80% recomendado. Considera aumentar tu muestra.":" Esto es insuficiente. Hay alto riesgo de no detectar una diferencia real (error tipo II). Aumenta la muestra significativamente."}
                  </div>
                </div>
              </div>
            )}

            {result.type==="range"&&(
              <div style={{background:"white",border:"2px solid #6ee7b7",borderRadius:16,overflow:"hidden"}}>
                <div style={{background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",padding:"20px 28px"}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#059669",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><CheckIcon/> Tabla comparativa</div>
                  <p style={{fontSize:13,color:"#065f46",margin:0}}>Confianza: <b>{confidence}%</b>{result.design==="independent"&&result.params.ratio&&<> · Razón: <b>{result.params.ratio}:1</b></>}</p>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                    <thead><tr style={{background:"#f9fafb"}}>
                      <th style={{padding:"12px 20px",textAlign:"left",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e5e7eb"}}>Potencia</th>
                      {result.design==="independent"?(<>
                        <th style={{padding:"12px 16px",textAlign:"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e5e7eb"}}>Grupo 1</th>
                        <th style={{padding:"12px 16px",textAlign:"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e5e7eb"}}>Grupo 2</th>
                        <th style={{padding:"12px 20px",textAlign:"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e5e7eb"}}>Total</th>
                      </>):(
                        <th style={{padding:"12px 28px",textAlign:"right",fontWeight:700,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e5e7eb"}}>Pares (n)</th>
                      )}
                    </tr></thead>
                    <tbody>
                      {result.values.map((row: any,i: number)=>(
                        <tr key={i} style={{background:i%2===0?"white":"#fafbfc",transition:"background 0.15s ease"}} onMouseEnter={e=>{e.currentTarget.style.background="#ecfdf5"}} onMouseLeave={e=>{e.currentTarget.style.background=i%2===0?"white":"#fafbfc"}}>
                          <td style={{padding:"12px 20px",borderBottom:"1px solid #f3f4f6",color:"#374151",fontWeight:500}}>{row.power}%</td>
                          {result.design==="independent"?(<>
                            <td style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:700,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{row.n1.toLocaleString()}</td>
                            <td style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:600,color:"#0d9488",fontFamily:"'DM Mono',monospace"}}>{row.n2.toLocaleString()}</td>
                            <td style={{padding:"12px 20px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:700,color:"#065f46",fontFamily:"'DM Mono',monospace"}}>{row.total.toLocaleString()}</td>
                          </>):(
                            <td style={{padding:"12px 28px",borderBottom:"1px solid #f3f4f6",textAlign:"right",fontWeight:700,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{row.n.toLocaleString()}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{background:"rgba(236,253,245,0.5)",padding:"16px 28px",borderTop:"1px solid rgba(16,185,129,0.15)",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:24,height:24,borderRadius:8,background:"#10b981",display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0,marginTop:1}}><SparkleIcon/></div>
                  <div style={{fontSize:13,color:"#065f46",lineHeight:1.6}}>
                    <b>Interpretación IA:</b> La tabla muestra cómo crece el tamaño de muestra al aumentar la potencia.
                    {result.values.length>1&&<>{" "}Con {result.values[0].power}% de potencia necesitas <b>{(result.values[0].total||result.values[0].n).toLocaleString()}</b> {result.design==="independent"?"sujetos":"pares"}, mientras que con {result.values[result.values.length-1].power}% necesitas <b>{(result.values[result.values.length-1].total||result.values[result.values.length-1].n).toLocaleString()}</b>.</>}
                    {" "}Se recomienda al menos 80% de potencia para estudios en ciencias de la salud.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formula */}
        <div style={{marginTop:24,background:"white",borderRadius:14,border:"1.5px solid #e5e7eb",padding:"20px 24px"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Referencia de fórmula</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#374151",background:"#f9fafb",padding:"14px 18px",borderRadius:10,lineHeight:2}}>
            {designType==="independent"?(varEqual?(indepOption==="opt1"?<>n₁ = (Z<sub>α/2</sub> + Z<sub>β</sub>)² · σ² · (1 + 1/r) / d²<br/>n₂ = n₁ · r</>:<>n₁ = (Z<sub>α/2</sub> + Z<sub>β</sub>)² · (1 + 1/r) / δ²<br/>n₂ = n₁ · r</>):<>n₁ = (Z<sub>α/2</sub> + Z<sub>β</sub>)² · (σ₁² + σ₂²/r) / d²<br/>n₂ = n₁ · r</>):(<>n = (Z<sub>α/2</sub> + Z<sub>β</sub>)² · σ<sub>d</sub>² / d²{pairedOption==="opt1"&&<><br/>σ<sub>d</sub> = √(σ₁² + σ₂² − 2ρσ₁σ₂)</>}</>)}
          </div>
          <p style={{fontSize:12,color:"#9ca3af",margin:"10px 0 0",lineHeight:1.5}}>
            Donde Z<sub>α/2</sub> = valor crítico bilateral, Z<sub>β</sub> = valor para la potencia, d = diferencia a detectar{designType==="independent"?", r = razón n₂/n₁":", σd = DE de las diferencias"}.
          </p>
        </div>
      </div>
    </div>
  );
}
