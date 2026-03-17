import { useState, useEffect } from "react";

/* ─── Normal Inverse ─── */
function normalInv(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  else if (p <= pHigh) { q = p - 0.5; r = q * q; return ((((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q) / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1); }
  else { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
}

/* ─── Interfaces ─── */
interface SampleSizeDxParams {
  parameter: string; paramValue: number; confidence: number; precision: number;
  diseaseKnown: boolean; ratioNonDiseased: number; prevalence: number | null;
}
interface SampleSizeDxResult {
  paramGroup: number; otherGroup: number | null; total: number;
  labelParam?: string; labelOther?: string; prevalenceUsed?: boolean;
}
interface PrecisionDxParams {
  parameter: string; paramValue: number; confidence: number; sampleSize: number;
  diseaseKnown: boolean; ratioNonDiseased: number; prevalence: number | null;
}
interface RangeDxParams {
  parameter: string; paramValue: number; confidence: number;
  diseaseKnown: boolean; ratioNonDiseased: number; prevalence: number | null;
  min: number; max: number; increment: number;
}

/* ─── Sample size for Diagnostic Tests (Buderer, 1996) ─── */
function calcSampleSizeDx({ parameter, paramValue, confidence, precision, diseaseKnown, ratioNonDiseased, prevalence }: SampleSizeDxParams): SampleSizeDxResult {
  const alpha = 1 - confidence / 100;
  const z = Math.abs(normalInv(alpha / 2));
  const p = paramValue / 100;
  const E = precision / 100;

  if (!diseaseKnown) {
    if (prevalence) {
      const prev = prevalence / 100;
      if (parameter === "sensitivity") {
        // Single-step: n_total = Z²·Se·(1-Se) / (E²·Prev) — matches Epidat
        const total = Math.ceil((z * z * p * (1 - p)) / (E * E * prev));
        const nDiseased = Math.ceil(total * prev);
        return { paramGroup: nDiseased, otherGroup: total - nDiseased, total, labelParam: "Enfermos", labelOther: "No enfermos", prevalenceUsed: true };
      } else {
        // Single-step: n_total = Z²·Sp·(1-Sp) / (E²·(1-Prev))
        const total = Math.ceil((z * z * p * (1 - p)) / (E * E * (1 - prev)));
        const nNonDiseased = Math.ceil(total * (1 - prev));
        return { paramGroup: nNonDiseased, otherGroup: total - nNonDiseased, total, labelParam: "No enfermos", labelOther: "Enfermos", prevalenceUsed: true };
      }
    }
    const nParam = Math.ceil((z * z * p * (1 - p)) / (E * E));
    return { paramGroup: nParam, otherGroup: null, total: nParam };
  }

  const nParam = Math.ceil((z * z * p * (1 - p)) / (E * E));
  const r = ratioNonDiseased;
  if (parameter === "sensitivity") {
    const nDiseased = nParam;
    const nNonDiseased = Math.ceil(nDiseased * r);
    return { paramGroup: nDiseased, otherGroup: nNonDiseased, total: nDiseased + nNonDiseased, labelParam: "Enfermos", labelOther: "No enfermos" };
  } else {
    const nNonDiseased = nParam;
    const nDiseased = Math.ceil(nNonDiseased / r);
    return { paramGroup: nNonDiseased, otherGroup: nDiseased, total: nNonDiseased + nDiseased, labelParam: "No enfermos", labelOther: "Enfermos" };
  }
}

/* ─── Precision for Diagnostic Tests ─── */
function calcPrecisionDx({ parameter, paramValue, confidence, sampleSize, diseaseKnown, ratioNonDiseased, prevalence }: PrecisionDxParams): number | null {
  const alpha = 1 - confidence / 100;
  const z = Math.abs(normalInv(alpha / 2));
  const p = paramValue / 100;
  let nParam: number;
  if (!diseaseKnown) {
    if (prevalence) {
      const prev = prevalence / 100;
      nParam = parameter === "sensitivity" ? Math.floor(sampleSize * prev) : Math.floor(sampleSize * (1 - prev));
    } else { nParam = sampleSize; }
  } else {
    const r = ratioNonDiseased;
    nParam = parameter === "sensitivity" ? Math.floor(sampleSize / (1 + r)) : Math.floor((sampleSize * r) / (1 + r));
  }
  if (nParam <= 0) return null;
  return z * Math.sqrt((p * (1 - p)) / nParam) * 100;
}

/* ─── Range ─── */
function calcRangeDx({ parameter, paramValue, confidence, diseaseKnown, ratioNonDiseased, prevalence, min, max, increment }: RangeDxParams) {
  const results: (SampleSizeDxResult & { precision: number })[] = [];
  for (let prec = min; prec <= max + 0.0001; prec += increment) {
    const res = calcSampleSizeDx({ parameter, paramValue, confidence, precision: prec, diseaseKnown, ratioNonDiseased, prevalence });
    results.push({ precision: parseFloat(prec.toFixed(2)), ...res });
  }
  return results;
}

/* ─── Icons ─── */
const InfoIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>);
const SparkleIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/></svg>);
const BackIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>);
const CalcIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/></svg>);
const CheckIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);
const ResetIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>);
const TableIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>);
const DxIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>);

/* ─── Tooltip ─── */
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      style={{ position: "relative", display: "inline-flex", cursor: "help" }}>
      {children}
      {show && (<span style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1f2937", color: "#f9fafb", fontSize: 12, lineHeight: 1.5, padding: "10px 14px", borderRadius: 10, width: 280, zIndex: 100, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", pointerEvents: "none", fontWeight: 400 }}>
        {text}
        <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #1f2937" }}/>
      </span>)}
    </span>
  );
}

/* ─── Stepper ─── */
const stepsConfig = [{ num: 1, label: "Prueba" }, { num: 2, label: "Enfermedad" }, { num: 3, label: "Precisión" }];
function Stepper({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
      {stepsConfig.map((s, i) => {
        const done = current > s.num, active = current === s.num;
        return (
          <div key={s.num} style={{ display: "flex", alignItems: "center", flex: i < stepsConfig.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, background: done ? "#10b981" : active ? "#ecfdf5" : "#f3f4f6", color: done ? "white" : active ? "#059669" : "#9ca3af", border: active ? "2px solid #10b981" : done ? "2px solid #10b981" : "2px solid #e5e7eb", transition: "all 0.3s ease" }}>
                {done ? <CheckIcon /> : s.num}
              </div>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#059669" : done ? "#10b981" : "#9ca3af", transition: "all 0.3s ease", whiteSpace: "nowrap" }}>{s.label}</span>
            </div>
            {i < stepsConfig.length - 1 && (<div style={{ flex: 1, height: 2, marginLeft: 12, marginRight: 12, background: done ? "#10b981" : "#e5e7eb", borderRadius: 2, transition: "background 0.3s ease" }}/>)}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Field ─── */
function Field({ label, tooltip, value, onChange, placeholder, suffix, optional, disabled, hint }: { label: string; tooltip?: string; value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string; optional?: boolean; disabled?: boolean; hint?: string | null }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
        {optional && <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>(opcional)</span>}
        {tooltip && (<Tooltip text={tooltip}><span style={{ color: "#9ca3af", display: "flex" }}><InfoIcon /></span></Tooltip>)}
      </div>
      <div style={{ display: "flex", alignItems: "center", border: focused ? "2px solid #10b981" : "2px solid #e5e7eb", borderRadius: 10, background: disabled ? "#f9fafb" : "white", transition: "all 0.2s ease", boxShadow: focused ? "0 0 0 3px rgba(16, 185, 129, 0.1)" : "none", overflow: "hidden" }}>
        <input type="number" value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={placeholder} disabled={disabled} step="any"
          style={{ flex: 1, border: "none", outline: "none", padding: "12px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", background: "transparent", color: disabled ? "#9ca3af" : "#111827" }}/>
        {suffix && (<span style={{ padding: "0 14px", fontSize: 13, color: "#6b7280", fontWeight: 600, borderLeft: "1px solid #f3f4f6", background: "#f9fafb", alignSelf: "stretch", display: "flex", alignItems: "center" }}>{suffix}</span>)}
      </div>
      {hint && <p style={{ fontSize: 12, color: "#9ca3af", margin: "6px 0 0", lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

/* ─── Radio Card ─── */
function RadioCard({ selected, onClick, label, description, icon }: { selected: boolean; onClick: () => void; label: string; description: string; icon?: string }) {
  return (
    <div onClick={onClick} style={{ padding: "16px 18px", borderRadius: 12, cursor: "pointer", border: selected ? "2px solid #10b981" : "2px solid #e5e7eb", background: selected ? "#f0fdf4" : "white", transition: "all 0.2s ease", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, border: selected ? "6px solid #10b981" : "2px solid #d1d5db", background: "white", transition: "all 0.2s ease" }}/>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: selected ? "#065f46" : "#374151", display: "flex", alignItems: "center", gap: 6 }}>{icon && <span>{icon}</span>}{label}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.4 }}>{description}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Confusion Matrix Preview ─── */
function ConfusionPreview({ parameter, paramValue, diseaseKnown }: { parameter: string; paramValue: string; diseaseKnown: boolean }) {
  const pv = parseFloat(paramValue);
  if (!pv || pv <= 0 || pv >= 100) return null;
  const se = parameter === "sensitivity" ? pv : null;
  const sp = parameter === "specificity" ? pv : null;
  return (
    <div style={{ background: "#f9fafb", borderRadius: 12, padding: "16px", border: "1px solid #f3f4f6", marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Estructura de la prueba diagnóstica</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr>
          <th style={{ padding: "8px", border: "1px solid #e5e7eb", background: "white" }}></th>
          <th style={{ padding: "8px", border: "1px solid #e5e7eb", background: "#fef2f2", color: "#dc2626", fontWeight: 700, fontSize: 11 }}>Enfermo (+)</th>
          <th style={{ padding: "8px", border: "1px solid #e5e7eb", background: "#ecfdf5", color: "#059669", fontWeight: 700, fontSize: 11 }}>Sano (−)</th>
        </tr></thead>
        <tbody>
          <tr>
            <td style={{ padding: "8px", border: "1px solid #e5e7eb", fontWeight: 600, fontSize: 11, color: "#374151" }}>Prueba (+)</td>
            <td style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "center", background: se ? "#fef2f2" : "white" }}>{se ? <span style={{ fontWeight: 700, color: "#dc2626" }}>VP<br/><span style={{ fontSize: 11, color: "#6b7280" }}>Se = {pv}%</span></span> : <span style={{ color: "#9ca3af" }}>VP</span>}</td>
            <td style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "center" }}>{sp ? <span style={{ color: "#9ca3af" }}>FP<br/><span style={{ fontSize: 11 }}>1−Sp = {(100-pv).toFixed(1)}%</span></span> : <span style={{ color: "#9ca3af" }}>FP</span>}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px", border: "1px solid #e5e7eb", fontWeight: 600, fontSize: 11, color: "#374151" }}>Prueba (−)</td>
            <td style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "center" }}>{se ? <span style={{ color: "#9ca3af" }}>FN<br/><span style={{ fontSize: 11 }}>1−Se = {(100-pv).toFixed(1)}%</span></span> : <span style={{ color: "#9ca3af" }}>FN</span>}</td>
            <td style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "center", background: sp ? "#ecfdf5" : "white" }}>{sp ? <span style={{ fontWeight: 700, color: "#059669" }}>VN<br/><span style={{ fontSize: 11, color: "#6b7280" }}>Sp = {pv}%</span></span> : <span style={{ color: "#9ca3af" }}>VN</span>}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
        {parameter === "sensitivity"
          ? <>El tamaño de muestra se calcula sobre los <b>enfermos</b> (columna izquierda) para estimar la sensibilidad.</>
          : <>El tamaño de muestra se calcula sobre los <b>sanos</b> (columna derecha) para estimar la especificidad.</>}
        {diseaseKnown && <> Con la razón indicada se determina el total incluyendo el otro grupo.</>}
      </div>
    </div>
  );
}

/* ─── Result types ─── */
type CalcResult =
  | { type: 'sampleSize'; paramGroup: number; otherGroup: number | null; total: number; labelParam?: string; labelOther?: string; prevalenceUsed?: boolean; params: any }
  | { type: 'precision'; value: string; params: any }
  | { type: 'range'; values: any[]; params: any };

/* ─── Main ─── */
interface DiagnosticTestCalculatorProps { onBack?: () => void; }

export function DiagnosticTestCalculator({ onBack }: DiagnosticTestCalculatorProps) {
  const [parameter, setParameter] = useState<'sensitivity' | 'specificity'>("sensitivity");
  const [paramValue, setParamValue] = useState("");
  const [diseaseKnown, setDiseaseKnown] = useState(true);
  const [ratio, setRatio] = useState("1");
  const [prevalence, setPrevalence] = useState("");
  const [confidence, setConfidence] = useState("95");
  const [mode, setMode] = useState<'sampleSize' | 'precision'>("sampleSize");
  const [precMin, setPrecMin] = useState("");
  const [precMax, setPrecMax] = useState("");
  const [precInc, setPrecInc] = useState("");
  const [sampleSizeInput, setSampleSizeInput] = useState("");
  const [useRange, setUseRange] = useState(false);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (mode === "sampleSize") {
      if ((precMin || precMax) && paramValue && confidence) setCurrentStep(3);
      else if (paramValue && (diseaseKnown ? ratio : true)) setCurrentStep(2);
      else setCurrentStep(1);
    } else {
      if (sampleSizeInput && paramValue && confidence) setCurrentStep(3);
      else if (paramValue && (diseaseKnown ? ratio : true)) setCurrentStep(2);
      else setCurrentStep(1);
    }
  }, [paramValue, ratio, prevalence, confidence, precMin, precMax, sampleSizeInput, mode, diseaseKnown]);

  const handleCalc = () => {
    const pv = parseFloat(paramValue);
    const confNum = parseFloat(confidence);
    const r = parseFloat(ratio) || 1;
    const prev = prevalence ? parseFloat(prevalence) : null;
    if (!pv || !confNum) return;
    if (mode === "sampleSize") {
      if (useRange) {
        const minVal = parseFloat(precMin), maxVal = parseFloat(precMax), incVal = parseFloat(precInc);
        if (!minVal || !maxVal || !incVal) return;
        const rangeResults = calcRangeDx({ parameter, paramValue: pv, confidence: confNum, diseaseKnown, ratioNonDiseased: r, prevalence: prev, min: minVal, max: maxVal, increment: incVal });
        setResult({ type: "range", values: rangeResults, params: { parameter, paramValue: pv, confidence: confNum, diseaseKnown, ratio: r, prevalence: prev } });
      } else {
        const precNum = parseFloat(precMin);
        if (!precNum) return;
        const res = calcSampleSizeDx({ parameter, paramValue: pv, confidence: confNum, precision: precNum, diseaseKnown, ratioNonDiseased: r, prevalence: prev });
        setResult({ type: "sampleSize", ...res, params: { parameter, paramValue: pv, confidence: confNum, precision: precNum, diseaseKnown, ratio: r, prevalence: prev } });
      }
    } else {
      const nSamp = parseFloat(sampleSizeInput);
      if (!nSamp) return;
      const prec = calcPrecisionDx({ parameter, paramValue: pv, confidence: confNum, sampleSize: nSamp, diseaseKnown, ratioNonDiseased: r, prevalence: prev });
      if (!prec) return;
      setResult({ type: "precision", value: prec.toFixed(2), params: { parameter, paramValue: pv, confidence: confNum, sampleSize: nSamp, diseaseKnown, ratio: r, prevalence: prev } });
    }
    setShowResult(true);
  };

  const handleReset = () => {
    setParamValue(""); setRatio("1"); setPrevalence(""); setConfidence("95"); setDiseaseKnown(true);
    setPrecMin(""); setPrecMax(""); setPrecInc(""); setSampleSizeInput("");
    setResult(null); setShowResult(false); setUseRange(false);
  };

  const canCalc = !!(paramValue && confidence && (diseaseKnown ? ratio : true) && (
    mode === "sampleSize" ? (useRange ? (precMin && precMax && precInc) : precMin) : sampleSizeInput
  ));

  const paramLabel = parameter === "sensitivity" ? "Sensibilidad" : "Especificidad";
  const paramLabelShort = parameter === "sensitivity" ? "Se" : "Sp";

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#fafbfc", minHeight: "100%", color: "#1a1a2e" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes cinematicUp { from { opacity: 0; transform: translateY(40px) scale(0.98); filter: blur(8px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
        @keyframes fadeRight { from { opacity: 0; transform: translateX(-30px); filter: blur(4px); } to { opacity: 1; transform: translateX(0); filter: blur(0); } }
        .anim-cinematic { animation: cinematicUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .anim-fadeRight { animation: fadeRight 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* Breadcrumb */}
        <div className="anim-fadeRight" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <button onClick={onBack} style={{ cursor: "pointer", color: "#10b981", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: 0 }}><BackIcon /> Muestreo</button>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#9ca3af" }}>Cálculo de tamaños</span>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#374151" }}>Pruebas Diagnósticas</span>
        </div>

        {/* Title */}
        <div className="anim-fadeRight" style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 8, animationDelay: "100ms" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669", flexShrink: 0 }}><DxIcon /></div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#111827", letterSpacing: "-0.02em" }}>Tamaño de Muestra para Pruebas Diagnósticas</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0", lineHeight: 1.5 }}>Intervalo de confianza — Calcula cuántos sujetos necesitas para estimar la sensibilidad o especificidad de una prueba diagnóstica (Buderer, 1996).</p>
          </div>
        </div>

        {/* AI Helper */}
        <div className="anim-cinematic" style={{ animationDelay: "200ms", background: "linear-gradient(135deg, #ecfdf5, #f0fdf4)", border: "1px solid #a7f3d0", borderRadius: 12, padding: "12px 16px", margin: "20px 0 28px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#065f46", cursor: "pointer" }}>
          <div style={{ background: "#10b981", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}><SparkleIcon /></div>
          <span><b>Asistente IA:</b> ¿No conoces la sensibilidad o especificidad esperada? Puedo buscar el rendimiento diagnóstico reportado en la literatura para tu prueba de interés.</span>
        </div>

        {/* Mode selector */}
        <div className="anim-cinematic" style={{ marginBottom: 28, animationDelay: "300ms" }}>
          <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 12, padding: 4 }}>
            {([{ id: "sampleSize" as const, label: "Calcular tamaño de muestra", icon: "📐" }, { id: "precision" as const, label: "Calcular precisión absoluta", icon: "🎯" }]).map((m) => (
              <button key={m.id} onClick={() => { setMode(m.id); setShowResult(false); setResult(null); }}
                style={{ flex: 1, padding: "11px 16px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.25s ease", background: mode === m.id ? "white" : "transparent", color: mode === m.id ? "#111827" : "#6b7280", boxShadow: mode === m.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                <span>{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="anim-cinematic" style={{ animationDelay: "400ms" }}><Stepper current={currentStep} /></div>

        {/* Form */}
        <div className="anim-cinematic" style={{ animationDelay: "500ms", background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: "28px 28px 8px", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>

          {/* Step 1 */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10b981", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 20, height: 2, background: "#10b981", borderRadius: 2, display: "inline-block" }}/>Paso 1 · Parámetro a estimar
            </div>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>Selecciona qué propiedad de la prueba diagnóstica deseas evaluar.</p>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <RadioCard selected={parameter === "sensitivity"} onClick={() => { setParameter("sensitivity"); setShowResult(false); setResult(null); }} label="Sensibilidad" description="Capacidad de detectar enfermos (verdaderos positivos)." />
              <RadioCard selected={parameter === "specificity"} onClick={() => { setParameter("specificity"); setShowResult(false); setResult(null); }} label="Especificidad" description="Capacidad de identificar sanos (verdaderos negativos)." />
            </div>
            <Field label={`${paramLabel} esperada`} tooltip={parameter === "sensitivity" ? "Porcentaje esperado de enfermos que la prueba identifica correctamente como positivos. Obtenlo de estudios previos o del fabricante de la prueba." : "Porcentaje esperado de sanos que la prueba identifica correctamente como negativos. Obtenlo de estudios previos o del fabricante de la prueba."} value={paramValue} onChange={setParamValue} placeholder={parameter === "sensitivity" ? "Ej: 85" : "Ej: 90"} suffix="%" />
            <div style={{ display: "flex", gap: 6, marginTop: -12, marginBottom: 20, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, alignSelf: "center", marginRight: 4 }}>Frecuentes:</span>
              {["70", "80", "85", "90", "95"].map((v) => (<button key={v} onClick={() => setParamValue(v)} style={{ padding: "4px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: paramValue === v ? "#ecfdf5" : "#f9fafb", color: paramValue === v ? "#059669" : "#9ca3af", transition: "all 0.15s ease" }}>{v}%</button>))}
            </div>
            <ConfusionPreview parameter={parameter} paramValue={paramValue} diseaseKnown={diseaseKnown} />
          </div>

          <div style={{ height: 1, background: "#f3f4f6", margin: "4px 0 20px" }}/>

          {/* Step 2 */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10b981", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 20, height: 2, background: "#10b981", borderRadius: 2, display: "inline-block" }}/>Paso 2 · Condición de enfermo y confianza
            </div>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>¿Conoces la proporción de enfermos vs sanos en tu población de estudio?</p>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <RadioCard selected={diseaseKnown} onClick={() => setDiseaseKnown(true)} label="Conocida" description="Conozco la razón no enfermos / enfermos." />
              <RadioCard selected={!diseaseKnown} onClick={() => setDiseaseKnown(false)} label="Desconocida" description="Usaré la prevalencia para estimar el total de sujetos." />
            </div>
            {diseaseKnown && (<>
              <Field label="Razón no enfermos / enfermos" tooltip="Cuántos sanos hay por cada enfermo en tu población de estudio. Por ejemplo, si esperas 1 enfermo por cada 4 sanos, la razón es 4. Valor de 1 = partes iguales." value={ratio} onChange={setRatio} placeholder="Ej: 1" />
              <div style={{ display: "flex", gap: 6, marginTop: -12, marginBottom: 20, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, alignSelf: "center", marginRight: 4 }}>Frecuentes:</span>
                {["1", "2", "3", "4"].map((v) => (<button key={v} onClick={() => setRatio(v)} style={{ padding: "4px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: ratio === v ? "#ecfdf5" : "#f9fafb", color: ratio === v ? "#059669" : "#9ca3af", transition: "all 0.15s ease" }}>{v}:1</button>))}
              </div>
            </>)}
            {!diseaseKnown && (<>
              <Field label="Prevalencia de la enfermedad" tooltip="Proporción estimada de enfermos en tu población de estudio. Con esto se calcula cuántos sujetos totales necesitas reclutar para obtener suficientes enfermos (o sanos) para estimar el parámetro." value={prevalence} onChange={setPrevalence} placeholder="Ej: 20" suffix="%"
                hint={prevalence && parseFloat(prevalence) > 0 ? `Con una prevalencia del ${prevalence}%, por cada ${parameter === "sensitivity" ? "enfermo" : "sano"} necesario se reclutarán aprox. ${parameter === "sensitivity" ? Math.ceil(1 / (parseFloat(prevalence) / 100)) : Math.ceil(1 / (1 - parseFloat(prevalence) / 100))} personas en total.` : "Si no conoces la prevalencia, el Asistente IA puede ayudarte a buscarla en la literatura."} />
              <div style={{ display: "flex", gap: 6, marginTop: -12, marginBottom: 20, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, alignSelf: "center", marginRight: 4 }}>Frecuentes:</span>
                {["5", "10", "20", "30", "50"].map((v) => (<button key={v} onClick={() => setPrevalence(v)} style={{ padding: "4px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: prevalence === v ? "#ecfdf5" : "#f9fafb", color: prevalence === v ? "#059669" : "#9ca3af", transition: "all 0.15s ease" }}>{v}%</button>))}
              </div>
            </>)}
            <Field label="Nivel de confianza" tooltip="95% es el estándar." value={confidence} onChange={setConfidence} placeholder="95" suffix="%" />
            <div style={{ display: "flex", gap: 6, marginTop: -12, marginBottom: 20 }}>
              {["90", "95", "99"].map((v) => (<button key={v} onClick={() => setConfidence(v)} style={{ padding: "4px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: confidence === v ? "#ecfdf5" : "#f9fafb", color: confidence === v ? "#059669" : "#9ca3af", transition: "all 0.15s ease" }}>{v}%</button>))}
            </div>
          </div>

          <div style={{ height: 1, background: "#f3f4f6", margin: "4px 0 20px" }}/>

          {/* Step 3 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10b981", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 20, height: 2, background: "#10b981", borderRadius: 2, display: "inline-block" }}/>Paso 3 · {mode === "sampleSize" ? "Precisión absoluta deseada" : "Muestra disponible"}
            </div>
            {mode === "sampleSize" ? (<>
              <div style={{ display: "flex", gap: 4, background: "#f9fafb", borderRadius: 10, padding: 3, marginBottom: 20, border: "1px solid #f3f4f6" }}>
                <button onClick={() => setUseRange(false)} style={{ flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: !useRange ? "white" : "transparent", color: !useRange ? "#111827" : "#9ca3af", boxShadow: !useRange ? "0 1px 2px rgba(0,0,0,0.06)" : "none", transition: "all 0.2s ease" }}>Valor único</button>
                <button onClick={() => setUseRange(true)} style={{ flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: useRange ? "white" : "transparent", color: useRange ? "#111827" : "#9ca3af", boxShadow: useRange ? "0 1px 2px rgba(0,0,0,0.06)" : "none", transition: "all 0.2s ease" }}><TableIcon /> Rango (tabla)</button>
              </div>
              {!useRange ? (
                <Field label="Precisión absoluta (E)" tooltip={`Margen de error aceptable en puntos porcentuales para la ${paramLabel.toLowerCase()}. Ejemplo: E = 5 significa ${paramLabelShort} ± 5%.`} value={precMin} onChange={setPrecMin} placeholder="Ej: 5" suffix="%" hint="Valores típicos: 3-5% (estricto), 5-10% (estándar)." />
              ) : (
                <div style={{ background: "#f9fafb", borderRadius: 12, padding: "20px 20px 4px", border: "1px solid #f3f4f6", marginBottom: 20 }}>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>Define un rango de precisiones para comparar tamaños de muestra.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <Field label="Mínimo" value={precMin} onChange={setPrecMin} placeholder="1" suffix="%" tooltip="Precisión más estricta." />
                    <Field label="Máximo" value={precMax} onChange={setPrecMax} placeholder="10" suffix="%" tooltip="Precisión más flexible." />
                    <Field label="Incremento" value={precInc} onChange={setPrecInc} placeholder="1" suffix="%" tooltip="Paso entre valores." />
                  </div>
                </div>
              )}
            </>) : (
              <Field label="Tamaño total de la muestra" tooltip="Número total de sujetos (enfermos + sanos) si la condición es conocida, o solo del grupo relevante si es desconocida." value={sampleSizeInput} onChange={setSampleSizeInput} placeholder="Ej: 200" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="anim-cinematic" style={{ display: "flex", gap: 10, marginTop: 20, animationDelay: "600ms" }}>
          <button onClick={handleCalc} disabled={!canCalc}
            style={{ flex: 1, padding: "14px 24px", borderRadius: 12, border: "none", cursor: canCalc ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", background: canCalc ? "linear-gradient(135deg, #10b981, #059669)" : "#e5e7eb", color: canCalc ? "white" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.25s ease", boxShadow: canCalc ? "0 4px 14px rgba(16, 185, 129, 0.3)" : "none", transform: "scale(1)" }}
            onMouseDown={(e) => { if (canCalc) e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          ><CalcIcon /> Calcular</button>
          <button onClick={handleReset} style={{ padding: "14px 20px", borderRadius: 12, border: "2px solid #e5e7eb", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: "white", color: "#6b7280", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s ease" }}><ResetIcon /> Limpiar</button>
        </div>

        {/* ─── RESULTS ─── */}
        {showResult && result && (
          <div style={{ marginTop: 24, animation: "cinematicUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
            <style>{`@keyframes countUp { from { opacity:0; transform:scale(0.5); filter: blur(5px); } to { opacity:1; transform:scale(1); filter: blur(0); } }`}</style>

            {result.type === "sampleSize" && (
              <div style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", border: "2px solid #6ee7b7", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "24px 28px 20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#059669", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon /> Resultado</div>
                  {(result.params.diseaseKnown || result.prevalenceUsed) && result.otherGroup !== null ? (
                    <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                      {[{ label: result.labelParam || "Grupo 1", value: result.paramGroup, delay: "0.5s" }, { label: result.labelOther || "Grupo 2", value: result.otherGroup, delay: "0.6s" }, { label: "Total a reclutar", value: result.total, delay: "0.7s" }].map((item) => (
                        <div key={item.label}><div style={{ fontSize: 12, fontWeight: 600, color: "#059669", marginBottom: 4 }}>{item.label}</div>
                        <span style={{ fontSize: 44, fontWeight: 800, color: "#065f46", fontFamily: "'DM Mono', monospace", letterSpacing: "-0.03em", animation: `countUp ${item.delay} cubic-bezier(0.16, 1, 0.3, 1)` }}>{item.value}</span></div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 48, fontWeight: 800, color: "#065f46", fontFamily: "'DM Mono', monospace", letterSpacing: "-0.03em", animation: "countUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>{result.total}</span>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "#059669" }}>{parameter === "sensitivity" ? "enfermos necesarios" : "sanos necesarios"}</span>
                    </div>
                  )}
                </div>
                <div style={{ background: "rgba(255,255,255,0.6)", padding: "16px 28px", display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                  <span style={{ fontSize: 12, color: "#065f46" }}><b>{paramLabelShort}:</b> {result.params.paramValue}%</span>
                  <span style={{ fontSize: 12, color: "#065f46" }}><b>Confianza:</b> {result.params.confidence}%</span>
                  <span style={{ fontSize: 12, color: "#065f46" }}><b>E:</b> {result.params.precision}%</span>
                  {result.params.diseaseKnown && <span style={{ fontSize: 12, color: "#065f46" }}><b>Razón:</b> {result.params.ratio}:1</span>}
                  {!result.params.diseaseKnown && result.params.prevalence && <span style={{ fontSize: 12, color: "#065f46" }}><b>Prevalencia:</b> {result.params.prevalence}%</span>}
                </div>
                <div style={{ background: "rgba(255,255,255,0.4)", padding: "16px 28px", borderTop: "1px solid rgba(16,185,129,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
                  <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}>
                    <b>Interpretación IA:</b>
                    {(result.params.diseaseKnown || result.prevalenceUsed) && result.otherGroup !== null ? (
                      <> Necesitas <b>{result.paramGroup} {(result.labelParam || "").toLowerCase()}</b> y <b>{result.otherGroup} {(result.labelOther || "").toLowerCase()}</b> ({result.total} sujetos en total) para estimar una {paramLabel.toLowerCase()} del {result.params.paramValue}% con un margen de error de ±{result.params.precision} puntos porcentuales al {result.params.confidence}% de confianza.
                        {result.prevalenceUsed && <> Con una prevalencia estimada del {result.params.prevalence}%, necesitarás reclutar <b>{result.total} sujetos</b> de la población general para encontrar los {result.paramGroup} {(result.labelParam || "").toLowerCase()} requeridos.</>}
                        {" "}Todos los sujetos deben ser evaluados tanto con la prueba en estudio como con el estándar de referencia (gold standard).</>
                    ) : (
                      <> Necesitas <b>{result.total} {parameter === "sensitivity" ? "enfermos" : "sanos"}</b> confirmados por el estándar de referencia para estimar una {paramLabel.toLowerCase()} del {result.params.paramValue}% con ±{result.params.precision}% de precisión al {result.params.confidence}% de confianza.</>
                    )}
                  </div>
                </div>
              </div>
            )}

            {result.type === "precision" && (
              <div style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", border: "2px solid #6ee7b7", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "24px 28px 20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#059669", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon /> Resultado</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 48, fontWeight: 800, color: "#065f46", fontFamily: "'DM Mono', monospace", letterSpacing: "-0.03em", animation: "countUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>±{result.value}%</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: "#059669" }}>precisión absoluta</span>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.6)", padding: "16px 28px", display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                  <span style={{ fontSize: 12, color: "#065f46" }}><b>{paramLabelShort}:</b> {result.params.paramValue}%</span>
                  <span style={{ fontSize: 12, color: "#065f46" }}><b>n:</b> {result.params.sampleSize}</span>
                  <span style={{ fontSize: 12, color: "#065f46" }}><b>Confianza:</b> {result.params.confidence}%</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.4)", padding: "16px 28px", borderTop: "1px solid rgba(16,185,129,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
                  <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}>
                    <b>Interpretación IA:</b> Con <b>{result.params.sampleSize} sujetos</b>, puedes estimar la {paramLabel.toLowerCase()} con un margen de <b>±{result.value}%</b>. El IC esperado para {paramLabelShort} = {result.params.paramValue}% sería [{Math.max(0, result.params.paramValue - parseFloat(result.value)).toFixed(1)}%, {Math.min(100, result.params.paramValue + parseFloat(result.value)).toFixed(1)}%].
                  </div>
                </div>
              </div>
            )}

            {result.type === "range" && (
              <div style={{ background: "white", border: "2px solid #6ee7b7", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", padding: "20px 28px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#059669", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon /> Tabla comparativa</div>
                  <p style={{ fontSize: 13, color: "#065f46", margin: 0 }}>{paramLabelShort} = <b>{result.params.paramValue}%</b> · Confianza: <b>{result.params.confidence}%</b>{result.params.diseaseKnown && <> · Razón: <b>{result.params.ratio}:1</b></>}</p>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead><tr style={{ background: "#f9fafb" }}>
                      <th style={{ padding: "12px 20px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>Precisión (E)</th>
                      {(result.params.diseaseKnown || result.values[0]?.prevalenceUsed) && result.values[0]?.otherGroup !== null ? (<>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>{result.values[0]?.labelParam || "Grupo 1"}</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>{result.values[0]?.labelOther || "Grupo 2"}</th>
                        <th style={{ padding: "12px 20px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>Total</th>
                      </>) : (
                        <th style={{ padding: "12px 28px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>Tamaño de muestra (n)</th>
                      )}
                    </tr></thead>
                    <tbody>
                      {result.values.map((row: any, i: number) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafbfc", transition: "background 0.15s ease" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#ecfdf5"; }} onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafbfc"; }}>
                          <td style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", color: "#374151", fontWeight: 500 }}>±{row.precision}%</td>
                          {(result.params.diseaseKnown || row.prevalenceUsed) && row.otherGroup !== null ? (<>
                            <td style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 700, color: "#059669", fontFamily: "'DM Mono', monospace" }}>{row.paramGroup.toLocaleString()}</td>
                            <td style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 600, color: "#0d9488", fontFamily: "'DM Mono', monospace" }}>{row.otherGroup.toLocaleString()}</td>
                            <td style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 700, color: "#065f46", fontFamily: "'DM Mono', monospace" }}>{row.total.toLocaleString()}</td>
                          </>) : (
                            <td style={{ padding: "12px 28px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 700, color: "#059669", fontFamily: "'DM Mono', monospace" }}>{row.total.toLocaleString()}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ background: "rgba(236,253,245,0.5)", padding: "16px 28px", borderTop: "1px solid rgba(16,185,129,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
                  <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}>
                    <b>Interpretación IA:</b> La tabla muestra los tamaños de muestra necesarios según la precisión para estimar una {paramLabel.toLowerCase()} del {result.params.paramValue}%.
                    {result.values.length > 1 && <>{" "}Con ±{result.values[0].precision}% necesitarías <b>{result.values[0].total.toLocaleString()} sujetos</b>, mientras que con ±{result.values[result.values.length-1].precision}% solo <b>{result.values[result.values.length-1].total.toLocaleString()}</b>.</>}
                    {" "}Recuerda que todos los participantes deben ser evaluados con la prueba en estudio y con el estándar de referencia.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formula */}
        <div style={{ marginTop: 24, background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "20px 24px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Referencia de fórmula (Buderer, 1996)</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#374151", background: "#f9fafb", padding: "14px 18px", borderRadius: 10, lineHeight: 2 }}>
            {parameter === "sensitivity" ? (<>
              n<sub>enf</sub> = Z²<sub>α/2</sub> · Se · (1 − Se) / E²
              {diseaseKnown && <><br/>n<sub>total</sub> = n<sub>enf</sub> · (1 + r)</>}
              {!diseaseKnown && <><br/><span style={{ color: "#10b981" }}>n<sub>total</sub> = n<sub>enf</sub> / Prevalencia</span></>}
            </>) : (<>
              n<sub>sanos</sub> = Z²<sub>α/2</sub> · Sp · (1 − Sp) / E²
              {diseaseKnown && <><br/>n<sub>total</sub> = n<sub>sanos</sub> · (1 + 1/r)</>}
              {!diseaseKnown && <><br/><span style={{ color: "#10b981" }}>n<sub>total</sub> = n<sub>sanos</sub> / (1 − Prevalencia)</span></>}
            </>)}
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "10px 0 0", lineHeight: 1.5 }}>
            Donde {paramLabelShort} = {paramLabel.toLowerCase()} esperada, E = precisión absoluta deseada{diseaseKnown ? ", y r = razón no enfermos/enfermos" : ", y la prevalencia permite estimar cuántos sujetos reclutar de la población general"}.
          </p>
        </div>
      </div>
    </div>
  );
}
