import { useState } from "react";

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
function calcCorrN(r: number, conf: number, pwr: number) {
  if (r === 0 || Math.abs(r) >= 1) return null;
  const alpha = 1 - conf / 100;
  const za_bi = Math.abs(normalInv(alpha / 2));
  const za_uni = Math.abs(normalInv(alpha));
  const zb = Math.abs(normalInv(1 - pwr / 100));
  // Fisher's z transformation: z_r = 0.5 * ln((1+r)/(1-r))
  const z_r = 0.5 * Math.log((1 + Math.abs(r)) / (1 - Math.abs(r)));
  
  const n_bi = Math.pow((za_bi + zb) / z_r, 2) + 3;
  const n_uni = Math.pow((za_uni + zb) / z_r, 2) + 3;
  
  return { uni: Math.round(n_uni), bi: Math.round(n_bi) };
}

function calcCorrPower(r: number, conf: number, n: number) {
  if (r === 0 || Math.abs(r) >= 1 || n <= 3) return { uni: 0, bi: 0 };
  const alpha = 1 - conf / 100;
  const za_bi = Math.abs(normalInv(alpha / 2));
  const za_uni = Math.abs(normalInv(alpha));
  
  const z_r = 0.5 * Math.log((1 + Math.abs(r)) / (1 - Math.abs(r)));
  
  // Inverse Fisher formula for power
  const zb_bi = z_r * Math.sqrt(n - 3) - za_bi;
  const zb_uni = z_r * Math.sqrt(n - 3) - za_uni;
  
  return { uni: normalCDF(zb_uni) * 100, bi: normalCDF(zb_bi) * 100 };
}

/* ─── Icons ─── */
const InfoIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>);
const SparkleIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/></svg>);
const BackIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>);
const CalcIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/></svg>);
const CheckIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);
const ResetIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>);
const TableIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>);
const ScatterIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="20" x2="20" y2="20"/><line x1="4" y1="20" x2="4" y2="4"/><circle cx="9" cy="14" r="1.5"/><circle cx="14" cy="11" r="1.5"/><circle cx="18" cy="7" r="1.5"/><circle cx="7" cy="17" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="16" cy="9" r="1.5"/></svg>);

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
      <div style={{ display: "flex", alignItems: "center", border: focused ? "2px solid #8b5cf6" : "2px solid #e5e7eb", borderRadius: 10, background: "white", transition: "all 0.2s ease", boxShadow: focused ? "0 0 0 3px rgba(139,92,246,0.1)" : "none", overflow: "hidden" }}>
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
      {values.map((v: any) => (<button key={v} onClick={() => onSelect(String(v))} style={{ padding: "4px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: current === String(v) ? "#ede9fe" : "#f9fafb", color: current === String(v) ? "#6d28d9" : "#9ca3af", transition: "all 0.15s ease" }}>{v}{suffix || ""}</button>))}
    </div>
  );
}
function SL({ step, label }: any) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b5cf6", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 20, height: 2, background: "#8b5cf6", borderRadius: 2, display: "inline-block" }} />{step} · {label}
    </div>
  );
}
function ModeTabs({ active, onChange }: any) {
  return (
    <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 24, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)" }}>
      <button onClick={() => onChange("N")} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease", background: active === "N" ? "white" : "transparent", color: active === "N" ? "#6d28d9" : "#64748b", boxShadow: active === "N" ? "0 2px 6px rgba(0,0,0,0.06)" : "none" }}>
        Calcular Tamaño Muestra
      </button>
      <button onClick={() => onChange("P")} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease", background: active === "P" ? "white" : "transparent", color: active === "P" ? "#6d28d9" : "#64748b", boxShadow: active === "P" ? "0 2px 6px rgba(0,0,0,0.06)" : "none" }}>
        Calcular Potencia
      </button>
    </div>
  );
}

/* ─── Main Component ─── */
interface Props { onBack?: () => void; }

export function CorrelationCalculator({ onBack }: Props) {
  const [mode, setMode] = useState<"N" | "P">("N");
  
  const [rVal, setRVal] = useState("");
  const [confidence, setConfidence] = useState("95");
  
  // For Mode = N (Calculate Sample Size)
  const [useRange, setUseRange] = useState(true);
  const [pwSingle, setPwSingle] = useState("");
  const [pwMin, setPwMin] = useState("80");
  const [pwMax, setPwMax] = useState("80");
  const [pwInc, setPwInc] = useState("0");

  // For Mode = P (Calculate Power)
  const [sampleSizeN, setSampleSizeN] = useState("");

  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const canCalc = (() => {
    if (!rVal || isNaN(parseFloat(rVal)) || !confidence || isNaN(parseFloat(confidence))) return false;
    if (mode === "N") {
      return useRange 
        ? (pwMin !== "" && pwMax !== "" && parseFloat(pwMax) >= parseFloat(pwMin) && pwInc !== "")
        : (pwSingle !== "" && parseFloat(pwSingle) > 0);
    } else {
      return sampleSizeN !== "" && parseInt(sampleSizeN) > 3;
    }
  })();

  const handleCalc = () => {
    const r = parseFloat(rVal);
    const conf = parseFloat(confidence);

    if (Math.abs(r) >= 1 || r === 0) {
      setResult({ type: "error", msg: "El coeficiente de correlación a detectar debe estar entre -1 y 1 (no incluyente) y no puede ser 0." });
      setShowResult(true);
      return;
    }

    const baseParams = [
      { label: "Correlación (r)", value: r },
      { label: "Confianza", value: `${conf}%` }
    ];

    if (mode === "P") {
      const n = parseInt(sampleSizeN);
      const { uni, bi } = calcCorrPower(r, conf, n);
      setResult({ type: "power", uni, bi, n, params: baseParams });
    } else {
      if (!useRange) {
        const pw = parseFloat(pwSingle);
        const res = calcCorrN(r, conf, pw);
        setResult({ type: "single", uni: res?.uni, bi: res?.bi, params: [...baseParams, { label: "Potencia", value: `${pw}%` }] });
      } else {
        const mn = parseFloat(pwMin), mx = parseFloat(pwMax), inc = parseFloat(pwInc) || 0;
        if (inc === 0 || mn === mx) {
          const pw = mn;
          const res = calcCorrN(r, conf, pw);
          setResult({ type: "range", arr: [{ power: pw, uni: res?.uni, bi: res?.bi }], params: baseParams });
        } else {
          const arr = [];
          for (let pw = mn; pw <= mx + 0.001; pw += inc) {
            const res = calcCorrN(r, conf, pw);
            arr.push({ power: parseFloat(pw.toFixed(1)), uni: res?.uni, bi: res?.bi });
          }
          setResult({ type: "range", arr, params: baseParams });
        }
      }
    }
    setShowResult(true);
  };

  const handleReset = () => {
    setRVal(""); setConfidence("95"); setSampleSizeN("");
    setPwSingle(""); setPwMin("80"); setPwMax("80"); setPwInc("0");
    setResult(null); setShowResult(false); setUseRange(true);
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#faf5ff", minHeight: "100%", color: "#1e1b4b" }}>
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
        <div className="anim-fadeRight" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <button onClick={onBack} style={{ cursor: "pointer", color: "#8b5cf6", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: 0 }}><BackIcon /> Muestreo</button>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#9ca3af" }}>Contraste de hipótesis</span>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#374151" }}>Correlación</span>
        </div>

        {/* Title */}
        <div className="anim-fadeRight" style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 8, animationDelay: "100ms" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#f3e8ff,#e9d5ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7e22ce", flexShrink: 0 }}>
            <ScatterIcon />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#1e1b4b", letterSpacing: "-0.02em" }}>Coeficiente de Correlación</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0", lineHeight: 1.5 }}>
              Determina el tamaño muestral necesario para detectar un coeficiente de correlación lineal de Pearson (r) significativamente distinto de cero.
            </p>
          </div>
        </div>

        {/* AI banner */}
        <div className="anim-cinematic" style={{ background: "linear-gradient(135deg,#faf5ff,#f3e8ff)", border: "1px solid #e9d5ff", borderRadius: 12, padding: "14px 16px", margin: "20px 0 28px", fontSize: 13, color: "#581c87", animationDelay: "200ms" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ background: "#8b5cf6", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
            <div>
              <b>¿Cómo se usa?</b> El coeficiente de correlación mide qué tan fuerte es la asociación lineal entre dos variables continuas (como edad y presión arterial). Los valores van de -1 a 1. Un valor más cercano a 0 (ej. r=0.2) es difícil de detectar y requiere una muestra grande. Un valor cercano a 1 o -1 (ej. r=0.8) indica una relación muy fuerte y requiere menos pacientes para probarse estadísticamente.
            </div>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="anim-cinematic" style={{ animationDelay: "300ms" }}>
          <ModeTabs active={mode} onChange={setMode} />
        </div>

        {/* Form */}
        <div className="anim-cinematic" style={{ animationDelay: "400ms", background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: "28px 28px 8px", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>

          <SL step="Datos" label="Variables del estudio" />
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <Field
                label="Correlación a detectar (r)"
                tooltip="El valor del coeficiente de correlación de Pearson (r) que asumes que existe en la población general y deseas detectar en el estudio. Valores típicos: Pequeño (0.1), Mediano (0.3), Grande (0.5)."
                value={rVal} onChange={setRVal} placeholder="ej. 0.3"
                hint="r está entre -1 y 1. No puede ser 0."
              />
              <QuickBtns values={["0.1", "0.3", "0.5", "0.7"]} current={rVal} onSelect={setRVal} />
            </div>
            
            <div>
              <Field
                label="Nivel de confianza"
                tooltip="Probabilidad de acertar al concluir que hay correlación. Usualmente 95%."
                value={confidence} onChange={setConfidence} placeholder="95" suffix="%"
              />
              <QuickBtns values={["90", "95", "99"]} current={confidence} onSelect={setConfidence} suffix="%" />
            </div>
          </div>

          <div style={{ height: 1, background: "#f3f4f6", margin: "4px 0 20px" }} />

          {mode === "P" && (
            <>
              <SL step="Paso 2" label="Tamaño Muestral Disponible" />
              <Field
                label="Tamaño de la muestra (N)"
                tooltip="El total de pares o individuos que participan en tu estudio. Deben ser al menos 4."
                value={sampleSizeN} onChange={setSampleSizeN} placeholder="Ej. 150"
              />
            </>
          )}

          {mode === "N" && (
            <>
              <SL step="Paso 2" label="Potencia estadística" />
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>
                Probabilidad de que el estudio pruebe exitosamente la existencia de la correlación asumida.
              </p>

              <div style={{ display: "flex", gap: 4, background: "#faf5ff", borderRadius: 10, padding: 3, marginBottom: 20, border: "1px solid #f3f4f6" }}>
                <button onClick={() => setUseRange(false)} style={{ flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: !useRange ? "white" : "transparent", color: !useRange ? "#111827" : "#9ca3af", boxShadow: !useRange ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>
                  Valor único
                </button>
                <button onClick={() => setUseRange(true)} style={{ flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: useRange ? "white" : "transparent", color: useRange ? "#111827" : "#9ca3af", boxShadow: useRange ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>
                  <TableIcon /> Rango (tabla)
                </button>
              </div>

              {!useRange ? (
                <>
                  <Field label="Potencia (1−β)" tooltip="Mínimo sugerido 80%." value={pwSingle} onChange={setPwSingle} placeholder="80" suffix="%" />
                  <QuickBtns values={["80", "85", "90", "95"]} current={pwSingle} onSelect={setPwSingle} suffix="%" />
                </>
              ) : (
                <div style={{ background: "#faf5ff", borderRadius: 12, padding: "20px 20px 4px", border: "1px solid #f3e8ff", marginBottom: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div style={{ minWidth: 0 }}><Field label="Mínimo" value={pwMin} onChange={setPwMin} placeholder="80" suffix="%" /></div>
                    <div style={{ minWidth: 0 }}><Field label="Máximo" value={pwMax} onChange={setPwMax} placeholder="90" suffix="%" /></div>
                    <div style={{ minWidth: 0 }}><Field label="Incremento" value={pwInc} onChange={setPwInc} placeholder="5" suffix="%" hint="0 = único" /></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="anim-cinematic" style={{ display: "flex", gap: 10, marginTop: 20, animationDelay: "500ms" }}>
          <button onClick={handleCalc} disabled={!canCalc}
            style={{ flex: 1, padding: "14px 24px", borderRadius: 12, border: "none", cursor: canCalc ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", background: canCalc ? "linear-gradient(135deg,#8b5cf6,#6d28d9)" : "#e5e7eb", color: canCalc ? "white" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: canCalc ? "0 4px 14px rgba(139,92,246,0.3)" : "none", transition: "all 0.2s ease" }}
            onMouseDown={e => { if (canCalc) e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
          ><CalcIcon /> Calcular</button>
          <button onClick={handleReset} style={{ padding: "14px 20px", borderRadius: 12, border: "2px solid #e5e7eb", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: "white", color: "#6b7280", display: "flex", alignItems: "center", gap: 6 }}><ResetIcon /> Limpiar</button>
        </div>

        {/* Results */}
        {showResult && result && (
          <div style={{ marginTop: 24, animation: "cinematicUp 0.8s cubic-bezier(0.16,1,0.3,1) both" }}>
            {result.type === "error" && (
              <div style={{ background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 14, padding: "20px 24px", color: "#dc2626", fontSize: 14 }}>
                ⚠️ {result.msg}
              </div>
            )}

            {result.type === "power" && (
              <div style={{ background: "linear-gradient(135deg,#faf5ff 0%,#f3e8ff 100%)", border: "2px solid #d8b4fe", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "24px 28px 20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6d28d9", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon /> Cálculo de Potencia</div>
                  <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#6d28d9", marginBottom: 4 }}>Unilateral</div>
                      <span style={{ fontSize: 44, fontWeight: 800, color: "#4c1d95", fontFamily: "'DM Mono',monospace", letterSpacing: "-0.03em" }}>{result.uni.toFixed(2)}<span style={{ fontSize: 24 }}>%</span></span>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#6d28d9", marginBottom: 4 }}>Bilateral</div>
                      <span style={{ fontSize: 44, fontWeight: 800, color: "#4c1d95", fontFamily: "'DM Mono',monospace", letterSpacing: "-0.03em" }}>{result.bi.toFixed(2)}<span style={{ fontSize: 24 }}>%</span></span>
                    </div>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.6)", padding: "16px 28px", display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                  {result.params.map((p: any, i: number) => (<span key={i} style={{ fontSize: 12, color: "#4c1d95" }}><b>{p.label}:</b> {p.value}</span>))}
                  <span style={{ fontSize: 12, color: "#4c1d95" }}><b>N:</b> {result.n}</span>
                </div>
              </div>
            )}

            {result.type === "single" && (
              <div style={{ background: "linear-gradient(135deg,#faf5ff 0%,#f3e8ff 100%)", border: "2px solid #d8b4fe", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "24px 28px 20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6d28d9", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon /> Tamaño Muestral</div>
                  <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#6d28d9", marginBottom: 4 }}>Unilateral</div>
                      <span style={{ fontSize: 44, fontWeight: 800, color: "#4c1d95", fontFamily: "'DM Mono',monospace", letterSpacing: "-0.03em", animation: `countUp 0.4s cubic-bezier(0.16,1,0.3,1)` }}>{result.uni}</span>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>sujetos (pares)</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#6d28d9", marginBottom: 4 }}>Bilateral</div>
                      <span style={{ fontSize: 44, fontWeight: 800, color: "#4c1d95", fontFamily: "'DM Mono',monospace", letterSpacing: "-0.03em", animation: `countUp 0.5s cubic-bezier(0.16,1,0.3,1)` }}>{result.bi}</span>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>sujetos (pares)</div>
                    </div>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.6)", padding: "16px 28px", display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                  {result.params.map((p: any, i: number) => (<span key={i} style={{ fontSize: 12, color: "#4c1d95" }}><b>{p.label}:</b> {p.value}</span>))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.4)", padding: "16px 28px", borderTop: "1px solid rgba(139,92,246,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
                  <div style={{ fontSize: 13, color: "#4c1d95", lineHeight: 1.6 }}>
                    <b>Interpretación IA:</b> Necesitas recolectar al menos <b>{result.bi}</b> pares de observaciones para pruebas bilaterales, o <b>{result.uni}</b> pares para pruebas unilaterales, a fin de detectar una asociación lineal (r={result.params.find((x:any)=>x.label==='Correlación (r)')?.value}) con <b>{result.params.find((x:any)=>x.label==='Potencia')?.value}</b> de certeza.
                  </div>
                </div>
              </div>
            )}

            {result.type === "range" && (
               <div style={{ background: "white", border: "2px solid #d8b4fe", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ background: "linear-gradient(135deg,#faf5ff,#f3e8ff)", padding: "20px 28px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6d28d9", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon /> Tabla por Potencia</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                    {result.params.map((p: any, i: number) => (<span key={i} style={{ fontSize: 13, color: "#4c1d95" }}><b>{p.label}:</b> {p.value}</span>))}
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb" }}>Potencia (%)</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb" }}>Unilateral</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb" }}>Bilateral</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.arr.map((row: any, i: number) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#faf5ff" }} onMouseEnter={e => e.currentTarget.style.background = "#f3e8ff"} onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "white" : "#faf5ff"}>
                          <td style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", color: "#374151", fontWeight: 500 }}>{row.power}%</td>
                          <td style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 700, color: "#6d28d9", fontFamily: "'DM Mono',monospace" }}>{row.uni}</td>
                          <td style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 700, color: "#6d28d9", fontFamily: "'DM Mono',monospace" }}>{row.bi}</td>
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
        <div className="anim-cinematic" style={{ marginTop: 24, background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "20px 24px", animationDelay: "600ms" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Referencia de método (Transformación Z de Fisher)</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "#374151", background: "#f9fafb", padding: "14px 18px", borderRadius: 10, lineHeight: 2 }}>
            Zᵣ = 0.5 · ln( (1 + |r|) / (1 - |r|) )<br/>
            N = [ (Z<span style={{ fontSize: 10 }}>1-α/2</span> + Z<span style={{ fontSize: 10 }}>1-β</span>) / Zᵣ ]² + 3
          </div>
        </div>
      </div>
    </div>
  );
}
