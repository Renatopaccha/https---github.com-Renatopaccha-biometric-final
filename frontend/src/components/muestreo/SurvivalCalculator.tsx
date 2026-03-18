import { useState, useEffect } from "react";

/* ─── Math Utils ─── */
function normalInv(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327;
  const p = d * Math.exp(-x * x / 2) * (t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.8212560 + t * 1.3302744)))));
  return x > 0 ? 1 - p : p;
}

/* ─── Calculator Logic ─── */
interface SurvResult {
  hr: number;
  events: number;
  n1: number;
  n2: number;
  nTotal: number;
  nTotalLoss: number;
  achievedPower: number;
}

function calcSurvival(s1: number, s2: number, ratioVal: number, conf: number, pwr: number, loss: number): SurvResult {
  // Epidat considers "Razón entre muestras" as R = n2 / n1 (or n1/n2 depending on perspective, but 50 gives n2=50*n1 max)
  const R = ratioVal; 
  const q1 = 1 / (1 + R);
  const q2 = R / (1 + R);

  const alpha = 1 - conf / 100;
  const za = Math.abs(normalInv(alpha / 2));
  const zb = Math.abs(normalInv(1 - pwr / 100));

  const hr = Math.log(s2) / Math.log(s1);

  // Schoenfeld formula for total events needed
  const events = Math.pow(za + zb, 2) / (q1 * q2 * Math.pow(Math.log(hr), 2));

  // Expected overall probability of an event happening to any subject
  const pEvent = q1 * (1 - s1) + q2 * (1 - s2);

  // Total N required to observe that many events
  const nTotalUnrounded = events / pEvent;
  
  // Distribute based on ratio
  let n1Unrounded = nTotalUnrounded * q1;
  let n2Unrounded = nTotalUnrounded * q2;

  // Apply loss and round BEFORE summing up (Epidat rounds each group separately)
  const n1Loss = Math.ceil(n1Unrounded / (1 - loss / 100));
  const n2Loss = Math.ceil(n2Unrounded / (1 - loss / 100));

  const nTotalLoss = n1Loss + n2Loss;
  const nTotal = Math.ceil(nTotalUnrounded); // pure total without loss

  // Calculate Achieved Power backwards using Schoenfeld
  const actualEvents = nTotalUnrounded; 
  const z_beta = Math.sqrt(actualEvents * q1 * q2 * Math.pow(Math.log(hr), 2)) - za;
  const achievedPower = normalCDF(z_beta);

  return { hr, events, n1: Math.ceil(n1Unrounded), n2: Math.ceil(n2Unrounded), nTotal, nTotalLoss, achievedPower, n1Loss, n2Loss } as any;
}

/* ─── Icons ─── */
const InfoIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>);
const SparkleIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/></svg>);
const BackIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>);
const CalcIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/></svg>);
const CheckIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);
const ResetIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>);
const TableIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>);
const HourglassIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>);

/* ─── Shared UI ─── */
function Tooltip({ children, text }: any) {
  const [show, setShow] = useState(false);
  return (
    <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} style={{ position: "relative", display: "inline-flex", cursor: "help" }}>
      {children}
      {show && (<span style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1f2937", color: "#f9fafb", fontSize: 12, lineHeight: 1.5, padding: "10px 14px", borderRadius: 10, width: 300, zIndex: 100, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", pointerEvents: "none", fontWeight: 400 }}>{text}<span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #1f2937" }}/></span>)}
    </span>
  );
}
function Field({ label, tooltip, value, onChange, placeholder, suffix, hint }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
        {tooltip && <Tooltip text={tooltip}><span style={{ color: "#9ca3af", display: "flex" }}><InfoIcon /></span></Tooltip>}
      </div>
      <div style={{ display: "flex", alignItems: "center", border: focused ? "2px solid #3b82f6" : "2px solid #e5e7eb", borderRadius: 10, background: "white", transition: "all 0.2s ease", boxShadow: focused ? "0 0 0 3px rgba(59,130,246,0.1)" : "none", overflow: "hidden" }}>
        <input type="number" value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={placeholder} step="any"
          style={{ flex: 1, border: "none", outline: "none", padding: "12px 14px", fontSize: 14, fontFamily: "'DM Sans',sans-serif", background: "transparent", color: "#111827" }} />
        {suffix && <span style={{ padding: "0 14px", fontSize: 13, color: "#6b7280", fontWeight: 600, borderLeft: "1px solid #f3f4f6", background: "#f9fafb", alignSelf: "stretch", display: "flex", alignItems: "center" }}>{suffix}</span>}
      </div>
      {hint && <p style={{ fontSize: 12, color: "#9ca3af", margin: "6px 0 0", lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}
function QuickBtns({ values, current, onSelect, suffix }: any) {
  return (
    <div style={{ display: "flex", gap: 6, marginTop: -12, marginBottom: 20, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, alignSelf: "center", marginRight: 4 }}>Frecuentes:</span>
      {values.map((v: any) => (<button key={v} onClick={() => onSelect(String(v))} style={{ padding: "4px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: current === String(v) ? "#eff6ff" : "#f9fafb", color: current === String(v) ? "#2563eb" : "#9ca3af", transition: "all 0.15s ease" }}>{v}{suffix || ""}</button>))}
    </div>
  );
}
function SL({ step, label }: any) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#3b82f6", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 20, height: 2, background: "#3b82f6", borderRadius: 2, display: "inline-block" }} />{step} · {label}
    </div>
  );
}
function Stepper({ steps, current }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
      {steps.map((s: any, i: number) => {
        const done = current > s.num, active = current === s.num;
        return (
          <div key={s.num} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, background: done ? "#3b82f6" : active ? "#eff6ff" : "#f3f4f6", color: done ? "white" : active ? "#2563eb" : "#9ca3af", border: active ? "2px solid #3b82f6" : done ? "2px solid #3b82f6" : "2px solid #e5e7eb", transition: "all 0.3s ease" }}>{done ? <CheckIcon /> : s.num}</div>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#2563eb" : done ? "#3b82f6" : "#9ca3af", whiteSpace: "nowrap" }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, marginLeft: 12, marginRight: 12, background: done ? "#3b82f6" : "#e5e7eb", borderRadius: 2 }} />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Component ─── */
interface Props { onBack?: () => void; }

export function SurvivalCalculator({ onBack }: Props) {
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [ratio, setRatio] = useState("100"); // Epidat uses 50% => meaning 1:1, sometimes uses 100%. We'll let user input ratio % (n1/n2 * 100)
  const [loss, setLoss] = useState("5");
  const [confidence, setConfidence] = useState("95");
  
  const [useRange, setUseRange] = useState(true);
  const [pwSingle, setPwSingle] = useState("");
  const [pwMin, setPwMin] = useState("80");
  const [pwMax, setPwMax] = useState("80");
  const [pwInc, setPwInc] = useState("0");
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  let currentStep = 1;
  const s1v = parseFloat(s1)/100, s2v = parseFloat(s2)/100;
  if (s1 && s2 && s1v > 0 && s1v < 1 && s2v > 0 && s2v < 1) currentStep = 2;
  if (currentStep === 2 && loss && confidence && ratio) currentStep = 3;

  const canCalc = currentStep === 3 && (
    useRange
      ? (pwMin !== "" && pwMax !== "" && parseFloat(pwMax) >= parseFloat(pwMin) && pwInc !== "")
      : (pwSingle !== "" && parseFloat(pwSingle) > 0 && parseFloat(pwSingle) < 100)
  );

  const handleCalc = () => {
    const fRatio = parseFloat(ratio);
    const fLoss = parseFloat(loss);
    const fConf = parseFloat(confidence);
    
    if (s1v === s2v) {
      setResult({ type: "error", msg: "Las probabilidades de supervivencia deben ser diferentes entre los grupos para calcular la diferencia." });
      setShowResult(true);
      return;
    }

    const baseParams = [
      { label: "S₁", value: `${s1}%` },
      { label: "S₂", value: `${s2}%` },
      { label: "Razón tamaños (Grupo 1 / Grupo 2)", value: `${ratio}%` },
      { label: "Confianza", value: `${fConf}%` },
      { label: "Pérdidas", value: `${fLoss}%` }
    ];

    if (!useRange) {
      const pw = parseFloat(pwSingle);
      const res = calcSurvival(s1v, s2v, fRatio, fConf, pw, fLoss);
      setResult({ type: "single", res, params: [...baseParams, { label: "Potencia deseada", value: `${pw}%` }] });
    } else {
      const mn = parseFloat(pwMin), mx = parseFloat(pwMax), inc = parseFloat(pwInc) || 0;
      if (inc === 0 || mn === mx) {
        const pw = mn;
        const res = calcSurvival(s1v, s2v, fRatio, fConf, pw, fLoss);
        setResult({ type: "range", arr: [{ power: pw, res }], params: baseParams });
      } else {
        const arr: any[] = [];
        for (let pw = mn; pw <= mx + 0.001; pw += inc) {
          const pwr = parseFloat(pw.toFixed(1));
          arr.push({ power: pwr, res: calcSurvival(s1v, s2v, fRatio, fConf, pwr, fLoss) });
        }
        setResult({ type: "range", arr, params: baseParams });
      }
    }
    setShowResult(true);
  };

  const handleReset = () => {
    setS1(""); setS2(""); setRatio("100"); setLoss("5"); setConfidence("95");
    setPwSingle(""); setPwMin("80"); setPwMax("80"); setPwInc("0");
    setResult(null); setShowResult(false); setUseRange(true);
  };

  const steps = [{ num: 1, label: "Supervivencia" }, { num: 2, label: "Parámetros" }, { num: 3, label: "Potencia" }];

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f8fafc", minHeight: "100%", color: "#0f172a" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes cinematicUp { from{opacity:0;transform:translateY(40px) scale(0.98);filter:blur(8px);}to{opacity:1;transform:translateY(0) scale(1);filter:blur(0);} }
        @keyframes fadeRight { from{opacity:0;transform:translateX(-30px);filter:blur(4px);}to{opacity:1;transform:translateX(0);filter:blur(0);} }
        @keyframes countUp { from{opacity:0;transform:scale(0.5);filter:blur(5px);}to{opacity:1;transform:scale(1);filter:blur(0);} }
        .anim-cinematic { animation: cinematicUp 1.2s cubic-bezier(0.16,1,0.3,1) both; }
        .anim-fadeRight { animation: fadeRight 1s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* Breadcrumb */}
        <div className="anim-fadeRight" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, color: "#64748b", fontWeight: 500 }}>
          <button onClick={onBack} style={{ cursor: "pointer", color: "#3b82f6", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: 0 }}><BackIcon /> Muestreo</button>
          <span style={{ color: "#cbd5e1" }}>/</span>
          <span style={{ color: "#94a3b8" }}>Contraste de hipótesis</span>
          <span style={{ color: "#cbd5e1" }}>/</span>
          <span style={{ color: "#334155" }}>Supervivencia</span>
        </div>

        {/* Title */}
        <div className="anim-fadeRight" style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 8, animationDelay: "100ms" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#dbeafe,#bfdbfe)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", flexShrink: 0 }}>
            <HourglassIcon />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#0f172a", letterSpacing: "-0.02em" }}>Análisis de Supervivencia</h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0", lineHeight: 1.5 }}>
              Calcula el tamaño de muestra mediante el Log-Rank Test (Fórmula de Schoenfeld) basándose en las probabilidades de supervivencia esperadas al final del estudio en dos grupos.
            </p>
          </div>
        </div>

        {/* AI banner */}
        <div className="anim-cinematic" style={{ background: "linear-gradient(135deg,#eff6ff,#f4f6ff)", border: "1px solid #bfdbfe", borderRadius: 12, padding: "14px 16px", margin: "20px 0 28px", fontSize: 13, color: "#1e3a8a", animationDelay: "200ms" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ background: "#3b82f6", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
            <div>
              <b>¿Cómo funciona?</b> Se ingresa la probabilidad de supervivencia <b>S₁</b> (grupo control) y <b>S₂</b> (grupo de tratamiento) al final de un período determinado. El algoritmo asume riesgos proporcionales, calcula el <b>Hazard Ratio (HR)</b>, determina el número total de <b>eventos</b> (como muertes o recaídas) necesarios y estima la muestra <b>N</b> esperada para observar dichos eventos.
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="anim-cinematic" style={{ animationDelay: "350ms" }}>
          <Stepper steps={steps} current={currentStep} />
        </div>

        {/* Form */}
        <div className="anim-cinematic" style={{ animationDelay: "450ms", background: "white", borderRadius: 16, border: "1.5px solid #e2e8f0", padding: "28px 28px 8px", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>

          {/* Step 1 */}
          <SL step="Paso 1" label="Probabilidades de supervivencia" />
          <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px", lineHeight: 1.5 }}>
            Ingresa la probabilidad de que un paciente 'sobreviva' (no experimente el evento de interés) al final del seguimiento planificado en cada grupo.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Field
              label="Grupo 1 (Control) S₁"
              tooltip="Probabilidad esperada de supervivencia en el grupo 1 al final del estudio (ej. 50%)."
              value={s1} onChange={setS1} placeholder="Ej: 50" suffix="%"
            />
            <Field
              label="Grupo 2 (Tratamiento) S₂"
              tooltip="Probabilidad esperada de supervivencia en el grupo 2 al final del estudio. Su diferencia con S₁ determina el Hazard Ratio."
              value={s2} onChange={setS2} placeholder="Ej: 60" suffix="%"
            />
          </div>

          <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0 20px" }} />

          {/* Step 2 */}
          <SL step="Paso 2" label="Parámetros del diseño" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <Field
                label="Razón muestral (n2 / n1)"
                tooltip="Cuántas veces más grande será el Grupo 2 respecto al Grupo 1. (Ej. 1 = grupos iguales, 50 = el grupo 2 es 50 veces mayor)."
                value={ratio} onChange={setRatio} placeholder="1"
              />
              <QuickBtns values={["1", "2", "5", "50"]} current={ratio} onSelect={setRatio} />
            </div>
            <Field
              label="Proporción de pérdidas"
              tooltip="Porcentaje de la muestra que se espera que abandone el estudio de manera anticipada. El tamaño final se incrementa para compensarlo."
              value={loss} onChange={setLoss} placeholder="5" suffix="%"
            />
          </div>

          <Field
            label="Nivel de confianza"
            tooltip="Probabilidad de rechazar correctamente una diferencia nula. Usualmente 95% (riesgo alfa = 5%)."
            value={confidence} onChange={setConfidence} placeholder="95" suffix="%"
          />
          <QuickBtns values={["90", "95", "99"]} current={confidence} onSelect={setConfidence} suffix="%" />

          <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0 20px" }} />

          {/* Step 3 */}
          <SL step="Paso 3" label="Potencia estadística" />
          <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px", lineHeight: 1.5 }}>
            Es la probabilidad de que el estudio detecte la diferencia en supervivencia si realmente el HR corresponde a los valores indicados.
          </p>

          <div style={{ display: "flex", gap: 4, background: "#f8fafc", borderRadius: 10, padding: 3, marginBottom: 20, border: "1px solid #f1f5f9" }}>
            <button onClick={() => setUseRange(false)} style={{ flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: !useRange ? "white" : "transparent", color: !useRange ? "#0f172a" : "#94a3b8", boxShadow: !useRange ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>
              Valor único
            </button>
            <button onClick={() => setUseRange(true)} style={{ flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: useRange ? "white" : "transparent", color: useRange ? "#0f172a" : "#94a3b8", boxShadow: useRange ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>
              <TableIcon /> Rango (tabla)
            </button>
          </div>

          {!useRange ? (
            <>
              <Field
                label="Potencia (1−β)"
                tooltip="Se recomienda mínimo 80%."
                value={pwSingle} onChange={setPwSingle} placeholder="80" suffix="%"
              />
              <QuickBtns values={["80", "85", "90", "95"]} current={pwSingle} onSelect={setPwSingle} suffix="%" />
            </>
          ) : (
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "20px 20px 4px", border: "1px solid #f1f5f9", marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ minWidth: 0 }}><Field label="Mínimo" value={pwMin} onChange={setPwMin} placeholder="80" suffix="%" /></div>
                <div style={{ minWidth: 0 }}><Field label="Máximo" value={pwMax} onChange={setPwMax} placeholder="90" suffix="%" /></div>
                <div style={{ minWidth: 0 }}><Field label="Incremento" value={pwInc} onChange={setPwInc} placeholder="5" suffix="%" hint="0 = único" /></div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="anim-cinematic" style={{ display: "flex", gap: 10, marginTop: 20, animationDelay: "600ms" }}>
          <button onClick={handleCalc} disabled={!canCalc}
            style={{ flex: 1, padding: "14px 24px", borderRadius: 12, border: "none", cursor: canCalc ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", background: canCalc ? "linear-gradient(135deg,#3b82f6,#2563eb)" : "#e2e8f0", color: canCalc ? "white" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: canCalc ? "0 4px 14px rgba(59,130,246,0.3)" : "none", transition: "all 0.2s ease" }}
            onMouseDown={e => { if (canCalc) e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
          ><CalcIcon /> Calcular</button>
          <button onClick={handleReset} style={{ padding: "14px 20px", borderRadius: 12, border: "2px solid #e2e8f0", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: "white", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><ResetIcon /> Limpiar</button>
        </div>

        {/* Results */}
        {showResult && result && (
          <div style={{ marginTop: 24, animation: "cinematicUp 0.8s cubic-bezier(0.16,1,0.3,1) both" }}>

            {result.type === "error" && (
              <div style={{ background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 14, padding: "20px 24px", color: "#dc2626", fontSize: 14 }}>
                ⚠️ {result.msg}
              </div>
            )}

            {result.type === "single" && (() => {
              const { res, params } = result;
              return (
                <div style={{ background: "linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)", border: "2px solid #93c5fd", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "24px 28px 20px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1d4ed8", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon /> Resultado</div>
                    <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                      {[
                        { label: "Muestra N total", value: res.nTotalLoss, delay: "0.4s", sub: "incluye pérdidas" },
                        { label: "Grupo 1", value: res.n1Loss, delay: "0.5s", sub: "sujetos c/ pérds" },
                        { label: "Grupo 2", value: res.n2Loss, delay: "0.55s", sub: "sujetos c/ pérds" },
                        { label: "Eventos", value: Math.ceil(res.events), delay: "0.6s", sub: "totales necesarios" },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", marginBottom: 4 }}>{item.label}</div>
                          <span style={{ fontSize: 44, fontWeight: 800, color: "#1e3a8a", fontFamily: "'DM Mono',monospace", letterSpacing: "-0.03em", animation: `countUp ${item.delay} cubic-bezier(0.16,1,0.3,1)` }}>{item.value}</span>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{item.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.6)", padding: "16px 28px", display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                    {params.map((p: any, i: number) => (<span key={i} style={{ fontSize: 12, color: "#1e3a8a" }}><b>{p.label}:</b> {p.value}</span>))}
                    <span style={{ fontSize: 12, color: "#1e3a8a" }}><b>Hazard Ratio (HR):</b> {res.hr.toFixed(3)}</span>
                  </div>
                </div>
              );
            })()}

            {result.type === "range" && (
              <div style={{ background: "white", border: "2px solid #93c5fd", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ background: "linear-gradient(135deg,#eff6ff,#dbeafe)", padding: "20px 28px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1d4ed8", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon /> Tabla por Potencia</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                    {result.params.map((p: any, i: number) => (<span key={i} style={{ fontSize: 13, color: "#1e3a8a" }}><b>{p.label}:</b> {p.value}</span>))}
                    <span style={{ fontSize: 13, color: "#1e3a8a" }}><b>HR:</b> {result.arr[0].res.hr.toFixed(3)}</span>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Potencia (%)", "Eventos", "Grupo 1", "Grupo 2", "Total (sin pérds)", "Total c/ pérdidas"].map((h, i) => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: i === 0 ? "left" : "right", fontWeight: 700, fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.arr.map((row: any, i: number) => {
                        const r = row.res;
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }} onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"} onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "white" : "#f8fafc"}>
                            <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", color: "#334155", fontWeight: 500 }}>{row.power}%</td>
                            <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#64748b", fontFamily: "'DM Mono',monospace" }}>{Math.ceil(r.events)}</td>
                            <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#64748b", fontFamily: "'DM Mono',monospace" }}>{r.n1Loss}</td>
                            <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#64748b", fontFamily: "'DM Mono',monospace" }}>{r.n2Loss}</td>
                            <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#94a3b8", fontFamily: "'DM Mono',monospace" }}>{r.nTotal}</td>
                            <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontWeight: 700, color: "#2563eb", fontFamily: "'DM Mono',monospace" }}>{r.nTotalLoss}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formula */}
        <div className="anim-cinematic" style={{ marginTop: 24, background: "white", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: "20px 24px", animationDelay: "700ms" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Fórmula de Schoenfeld</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "#334155", background: "#f8fafc", padding: "14px 18px", borderRadius: 10, lineHeight: 2 }}>
            HR = ln(S₂) / ln(S₁)<br />
            Eventos = (Z<span style={{ fontSize: 10 }}>1-α/2</span> + Z<span style={{ fontSize: 10 }}>1-β</span>)² / (q₁·q₂·[ln(HR)]²) <span style={{ color: "#94a3b8" }}>&nbsp;// Schoenfeld</span><br />
            Total = Eventos / (q₁·(1−S₁) + q₂·(1−S₂))
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "10px 0 0", lineHeight: 1.5 }}>
            Metodología basada en los algoritmos estándar para curvas de supervivencia proporcionales (Prueba de Rangos Logarítmicos). Se computa el total de eventos requeridos y luego se transfiere al total de pacientes asumiendo las probabilidades de éxito final indicadas y sus respectivas proporciones q1 y q2 en cada grupo.
          </p>
        </div>
      </div>
    </div>
  );
}
