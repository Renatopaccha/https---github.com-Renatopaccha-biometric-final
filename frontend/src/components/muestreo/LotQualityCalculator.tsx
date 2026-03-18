import { useState } from "react";

/* ─── LQAS Core ─── */
function logFact(n: number): number {
  let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s;
}
function binomPMF(n: number, k: number, p: number): number {
  if (k < 0 || k > n || p <= 0 || p >= 1) {
    if (p === 0) return k === 0 ? 1 : 0;
    if (p === 1) return k === n ? 1 : 0;
    return 0;
  }
  return Math.exp(logFact(n) - logFact(k) - logFact(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}
function binomCDF(n: number, d: number, p: number): number {
  let s = 0; for (let k = 0; k <= d; k++) s += binomPMF(n, k, p); return s;
}

interface LQASResult {
  n: number; d: number; achievedPower: number; achievedConf: number;
}

function calcLQAS(p0: number, p1: number, confidence: number, power: number): LQASResult | null {
  const alpha = 1 - confidence / 100;
  const beta = 1 - power / 100;
  for (let n = 1; n <= 10000; n++) {
    // smallest d such that P(X <= d | p0) >= 1-alpha
    let d = n;
    for (let k = 0; k <= n; k++) {
      if (binomCDF(n, k, p0) >= (1 - alpha)) { d = k; break; }
    }
    // check power
    const achievedPower = 1 - binomCDF(n, d, p1);
    if (achievedPower >= (1 - beta)) {
      return { n, d, achievedPower, achievedConf: binomCDF(n, d, p0) };
    }
  }
  return null;
}

/* ─── Icons ─── */
const InfoIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>);
const SparkleIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/></svg>);
const BackIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>);
const CalcIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/></svg>);
const CheckIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);
const ResetIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>);
const TableIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>);
const BatchIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>);

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
      <div style={{ display: "flex", alignItems: "center", border: focused ? "2px solid #10b981" : "2px solid #e5e7eb", borderRadius: 10, background: "white", transition: "all 0.2s ease", boxShadow: focused ? "0 0 0 3px rgba(16,185,129,0.1)" : "none", overflow: "hidden" }}>
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
      {values.map((v: any) => (<button key={v} onClick={() => onSelect(String(v))} style={{ padding: "4px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: current === String(v) ? "#ecfdf5" : "#f9fafb", color: current === String(v) ? "#059669" : "#9ca3af", transition: "all 0.15s ease" }}>{v}{suffix || ""}</button>))}
    </div>
  );
}
function SL({ step, label }: any) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10b981", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 20, height: 2, background: "#10b981", borderRadius: 2, display: "inline-block" }} />{step} · {label}
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
              <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, background: done ? "#10b981" : active ? "#ecfdf5" : "#f3f4f6", color: done ? "white" : active ? "#059669" : "#9ca3af", border: active ? "2px solid #10b981" : done ? "2px solid #10b981" : "2px solid #e5e7eb", transition: "all 0.3s ease" }}>{done ? <CheckIcon /> : s.num}</div>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#059669" : done ? "#10b981" : "#9ca3af", whiteSpace: "nowrap" }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, marginLeft: 12, marginRight: 12, background: done ? "#10b981" : "#e5e7eb", borderRadius: 2 }} />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main ─── */
interface Props { onBack?: () => void; }

export function LotQualityCalculator({ onBack }: Props) {
  const [p0, setP0] = useState("");          // acceptable defect rate
  const [p1, setP1] = useState("");          // rejectable defect rate (to detect)
  const [confidence, setConfidence] = useState("95");
  const [useRange, setUseRange] = useState(true);
  const [pwSingle, setPwSingle] = useState("");
  const [pwMin, setPwMin] = useState("80");
  const [pwMax, setPwMax] = useState("80");
  const [pwInc, setPwInc] = useState("0");
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  // Step progress
  let currentStep = 1;
  if (p0 !== "" && parseFloat(p0) >= 0 && p1 !== "" && parseFloat(p1) > 0) currentStep = 2;
  if (currentStep === 2 && confidence !== "" && parseFloat(confidence) > 0) currentStep = 3;

  const canCalc = currentStep === 3 && (
    useRange
      ? (pwMin !== "" && pwMax !== "" && parseFloat(pwMax) >= parseFloat(pwMin) && pwInc !== "")
      : (pwSingle !== "" && parseFloat(pwSingle) > 0 && parseFloat(pwSingle) < 100)
  );

  const handleCalc = () => {
    const pp0 = parseFloat(p0) / 100;
    const pp1 = parseFloat(p1) / 100;
    const conf = parseFloat(confidence);
    if (isNaN(pp0) || isNaN(pp1) || pp1 <= pp0) {
      setResult({ type: "error", msg: "La proporción a detectar (p₁) debe ser mayor que la esperada en la población (p₀)." });
      setShowResult(true);
      return;
    }

    const baseParams = [
      { label: "p₀ (aceptable)", value: `${p0}%` },
      { label: "p₁ (a detectar)", value: `${p1}%` },
      { label: "Confianza", value: `${conf}%` },
    ];

    if (!useRange) {
      const pw = parseFloat(pwSingle);
      const res = calcLQAS(pp0, pp1, conf, pw);
      setResult({ type: "single", res, params: [...baseParams, { label: "Potencia deseada", value: `${pw}%` }] });
    } else {
      const mn = parseFloat(pwMin), mx = parseFloat(pwMax), inc = parseFloat(pwInc) || 0;
      if (inc === 0 || mn === mx) {
        // single row
        const pw = mn;
        const res = calcLQAS(pp0, pp1, conf, pw);
        setResult({ type: "range", arr: [{ power: pw, res }], params: baseParams });
      } else {
        const arr: any[] = [];
        for (let pw = mn; pw <= mx + 0.001; pw += inc) {
          const pwr = parseFloat(pw.toFixed(1));
          const res = calcLQAS(pp0, pp1, conf, pwr);
          arr.push({ power: pwr, res });
        }
        setResult({ type: "range", arr, params: baseParams });
      }
    }
    setShowResult(true);
  };

  const handleReset = () => {
    setP0(""); setP1(""); setConfidence("95");
    setPwSingle(""); setPwMin("80"); setPwMax("80"); setPwInc("0");
    setResult(null); setShowResult(false); setUseRange(true);
  };

  const steps = [{ num: 1, label: "Proporciones" }, { num: 2, label: "Confianza" }, { num: 3, label: "Potencia" }];

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#fafbfc", minHeight: "100%", color: "#1a1a2e" }}>
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
          <button onClick={onBack} style={{ cursor: "pointer", color: "#10b981", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: 0 }}><BackIcon /> Muestreo</button>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#9ca3af" }}>Contraste de hipótesis</span>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#374151" }}>Calidad de Lotes</span>
        </div>

        {/* Title */}
        <div className="anim-fadeRight" style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 8, animationDelay: "100ms" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669", flexShrink: 0 }}>
            <BatchIcon />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#111827", letterSpacing: "-0.02em" }}>Calidad de Lotes (LQAS)</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0", lineHeight: 1.5 }}>
              Contraste de hipótesis — LQAS (Lot Quality Assurance Sampling) determina el tamaño muestral mínimo para decidir si un lote tiene una proporción de defectos inaceptablemente alta.
            </p>
          </div>
        </div>

        {/* AI / info banner */}
        <div className="anim-cinematic" style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", border: "1px solid #a7f3d0", borderRadius: 12, padding: "14px 16px", margin: "20px 0 28px", fontSize: 13, color: "#065f46", animationDelay: "200ms" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ background: "#10b981", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
            <div>
              <b>¿Para qué sirve LQAS?</b> Se usa en control de calidad industrial, salud pública y epidemiología de campo para evaluar lotes o áreas de cobertura de forma rápida y eficiente. Dada una proporción de defectos <b>aceptable (p₀)</b> y una proporción <b>inaceptable (p₁)</b>, LQAS calcula el número de unidades a inspeccionar (<b>n</b>) y el valor de corte (<b>d</b>): si el número de defectos observados supera <b>d</b>, el lote se rechaza.
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="anim-cinematic" style={{ animationDelay: "350ms" }}>
          <Stepper steps={steps} current={currentStep} />
        </div>

        {/* Form */}
        <div className="anim-cinematic" style={{ animationDelay: "450ms", background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: "28px 28px 8px", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>

          {/* Step 1 */}
          <SL step="Paso 1" label="Proporciones de defectuosos" />
          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>
            Define el porcentaje de unidades defectuosas que se considera <b>aceptable</b> en el lote, y el porcentaje <b>mínimo</b> que quieres ser capaz de detectar como inaceptable.
          </p>

          <Field
            label="Proporción de defectuosos esperada en la población (p₀)"
            tooltip="Nivel de calidad aceptable (AQL): porcentaje de defectos que se considera tolerable en el lote. Si el lote tiene ≤ p₀ defectos, debería ser aceptado con alta probabilidad."
            value={p0} onChange={setP0} placeholder="Ej: 1" suffix="%"
            hint="Este es el 'nivel aceptable de calidad' (AQL). Valores típicos: 1–5%."
          />
          <QuickBtns values={["0.5", "1", "2", "5", "10"]} current={p0} onSelect={setP0} suffix="%" />

          <Field
            label="Proporción de defectuosos a detectar (p₁)"
            tooltip="Nivel de calidad inaceptable (LTPD / RQL): porcentaje de defectos que convierte el lote en rechazable. Debe ser mayor que p₀. Si el lote tiene ≥ p₁ defectos, debería ser rechazado con alta probabilidad."
            value={p1} onChange={setP1} placeholder="Ej: 5" suffix="%"
            hint="Este es el 'nivel de calidad rechazable' (LTPD). Debe ser mayor que p₀."
          />
          <QuickBtns values={["5", "10", "15", "20", "25"]} current={p1} onSelect={setP1} suffix="%" />

          <div style={{ height: 1, background: "#f3f4f6", margin: "4px 0 20px" }} />

          {/* Step 2 */}
          <SL step="Paso 2" label="Nivel de confianza" />
          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>
            Probabilidad de <b>no rechazar</b> un lote que realmente tiene una proporción de defectos ≤ p₀ (protección del proveedor, error tipo I = 1 − confianza).
          </p>
          <Field
            label="Nivel de confianza"
            tooltip="1 − α: probabilidad de aceptar el lote cuando realmente es aceptable (p ≤ p₀). 95% es el estándar más usado en LQAS."
            value={confidence} onChange={setConfidence} placeholder="95" suffix="%"
          />
          <QuickBtns values={["90", "95", "99"]} current={confidence} onSelect={setConfidence} suffix="%" />

          <div style={{ height: 1, background: "#f3f4f6", margin: "4px 0 20px" }} />

          {/* Step 3 */}
          <SL step="Paso 3" label="Potencia estadística" />
          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>
            Probabilidad de <b>rechazar</b> un lote que realmente tiene una proporción de defectos ≥ p₁ (protección del consumidor, error tipo II = 1 − potencia).
          </p>

          {/* Single / Range toggle */}
          <div style={{ display: "flex", gap: 4, background: "#f9fafb", borderRadius: 10, padding: 3, marginBottom: 20, border: "1px solid #f3f4f6" }}>
            <button onClick={() => setUseRange(false)} style={{ flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: !useRange ? "white" : "transparent", color: !useRange ? "#111827" : "#9ca3af", boxShadow: !useRange ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>
              Valor único
            </button>
            <button onClick={() => setUseRange(true)} style={{ flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: useRange ? "white" : "transparent", color: useRange ? "#111827" : "#9ca3af", boxShadow: useRange ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>
              <TableIcon /> Rango (tabla)
            </button>
          </div>

          {!useRange ? (
            <>
              <Field
                label="Potencia (1−β)"
                tooltip="Probabilidad de rechazar el lote cuando realmente es inaceptable (p ≥ p₁). Se recomienda al menos 80%."
                value={pwSingle} onChange={setPwSingle} placeholder="80" suffix="%"
              />
              <QuickBtns values={["70", "80", "85", "90", "95"]} current={pwSingle} onSelect={setPwSingle} suffix="%" />
            </>
          ) : (
            <div style={{ background: "#f9fafb", borderRadius: 12, padding: "20px 20px 4px", border: "1px solid #f3f4f6", marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>
                Define un rango de potencias para ver cómo varía el tamaño de muestra y el valor de corte.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ minWidth: 0 }}><Field label="Mínimo" value={pwMin} onChange={setPwMin} placeholder="80" suffix="%" /></div>
                <div style={{ minWidth: 0 }}><Field label="Máximo" value={pwMax} onChange={setPwMax} placeholder="95" suffix="%" /></div>
                <div style={{ minWidth: 0 }}><Field label="Incremento" value={pwInc} onChange={setPwInc} placeholder="5" suffix="%" hint="0 = valor único" /></div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="anim-cinematic" style={{ display: "flex", gap: 10, marginTop: 20, animationDelay: "600ms" }}>
          <button onClick={handleCalc} disabled={!canCalc}
            style={{ flex: 1, padding: "14px 24px", borderRadius: 12, border: "none", cursor: canCalc ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", background: canCalc ? "linear-gradient(135deg,#10b981,#059669)" : "#e5e7eb", color: canCalc ? "white" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: canCalc ? "0 4px 14px rgba(16,185,129,0.3)" : "none", transition: "all 0.2s ease" }}
            onMouseDown={e => { if (canCalc) e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
          ><CalcIcon /> Calcular</button>
          <button onClick={handleReset} style={{ padding: "14px 20px", borderRadius: 12, border: "2px solid #e5e7eb", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: "white", color: "#6b7280", display: "flex", alignItems: "center", gap: 6 }}><ResetIcon /> Limpiar</button>
        </div>

        {/* ─── RESULTS ─── */}
        {showResult && result && (
          <div style={{ marginTop: 24, animation: "cinematicUp 0.8s cubic-bezier(0.16,1,0.3,1) both" }}>

            {result.type === "error" && (
              <div style={{ background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 14, padding: "20px 24px", color: "#dc2626", fontSize: 14 }}>
                ⚠️ {result.msg}
              </div>
            )}

            {result.type === "single" && (() => {
              const { res, params } = result;
              if (!res) return (
                <div style={{ background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 14, padding: "20px 24px", color: "#dc2626", fontSize: 14 }}>
                  No se encontró solución. Verifica que p₁ &gt; p₀ y que los parámetros sean razonables.
                </div>
              );
              return (
                <div style={{ background: "linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)", border: "2px solid #6ee7b7", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "24px 28px 20px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#059669", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon /> Resultado</div>
                    <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                      {[
                        { label: "Tamaño de muestra (n)", value: res.n, delay: "0.4s", sub: "unidades a inspeccionar" },
                        { label: "Valor de corte (d)", value: res.d, delay: "0.5s", sub: "defectos máximo aceptable" },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#059669", marginBottom: 4 }}>{item.label}</div>
                          <span style={{ fontSize: 44, fontWeight: 800, color: "#065f46", fontFamily: "'DM Mono',monospace", letterSpacing: "-0.03em", animation: `countUp ${item.delay} cubic-bezier(0.16,1,0.3,1)` }}>{item.value}</span>
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{item.sub}</div>
                        </div>
                      ))}
                    </div>
                    {/* Achieved stats */}
                    <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "10px 16px", flex: "1 1 140px" }}>
                        <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, marginBottom: 2 }}>Confianza real</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#065f46", fontFamily: "'DM Mono',monospace" }}>{(res.achievedConf * 100).toFixed(1)}%</div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "10px 16px", flex: "1 1 140px" }}>
                        <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, marginBottom: 2 }}>Potencia real</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#065f46", fontFamily: "'DM Mono',monospace" }}>{(res.achievedPower * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.6)", padding: "16px 28px", display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                    {params.map((p: any, i: number) => (<span key={i} style={{ fontSize: 12, color: "#065f46" }}><b>{p.label}:</b> {p.value}</span>))}
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.4)", padding: "16px 28px", borderTop: "1px solid rgba(16,185,129,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 8, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
                    <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}>
                      <b>Interpretación IA:</b> Inspecciona <b>{res.n} unidades</b> del lote. Si encuentras <b>más de {res.d} defectuosas</b>, rechaza el lote. Este plan garantiza una confianza real del <b>{(res.achievedConf * 100).toFixed(1)}%</b> (protección del proveedor) y una potencia real de <b>{(res.achievedPower * 100).toFixed(1)}%</b> (protección del consumidor).
                    </div>
                  </div>
                </div>
              );
            })()}

            {result.type === "range" && (
              <div style={{ background: "white", border: "2px solid #6ee7b7", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", padding: "20px 28px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#059669", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon /> Tabla de planes de muestreo LQAS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                    {result.params.map((p: any, i: number) => (<span key={i} style={{ fontSize: 13, color: "#065f46" }}><b>{p.label}:</b> {p.value}</span>))}
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        {["Potencia (%)", "n (muestra)", "d (corte)", "Confianza real", "Potencia real"].map((h, i) => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: i === 0 ? "left" : "right", fontWeight: 700, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.arr.map((row: any, i: number) => {
                        const r = row.res;
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafbfc" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#ecfdf5"}
                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafbfc"}>
                            <td style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", color: "#374151", fontWeight: 500 }}>{row.power}%</td>
                            {r ? (<>
                              <td style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 700, color: "#059669", fontFamily: "'DM Mono',monospace" }}>{r.n}</td>
                              <td style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 700, color: "#0d9488", fontFamily: "'DM Mono',monospace" }}>{r.d}</td>
                              <td style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", textAlign: "right", color: "#374151", fontFamily: "'DM Mono',monospace" }}>{(r.achievedConf * 100).toFixed(1)}%</td>
                              <td style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontFamily: "'DM Mono',monospace", color: r.achievedPower >= 0.8 ? "#059669" : "#d97706", fontWeight: 600 }}>{(r.achievedPower * 100).toFixed(1)}%</td>
                            </>) : (
                              <td colSpan={4} style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", textAlign: "center", color: "#9ca3af", fontStyle: "italic" }}>Sin solución</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ background: "rgba(236,253,245,0.5)", padding: "16px 28px", borderTop: "1px solid rgba(16,185,129,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
                  <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}>
                    <b>Interpretación IA:</b> Cada fila es un <b>plan de muestreo</b> diferente. Para cada potencia deseada obtienes el número de unidades <b>n</b> a inspeccionar y el valor de corte <b>d</b>: si los defectos observados superan <b>d</b>, rechaza el lote. La confianza y potencia reales pueden superar el nivel deseado por la naturaleza discreta de la distribución binomial.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formula */}
        <div className="anim-cinematic" style={{ marginTop: 24, background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "20px 24px", animationDelay: "700ms" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Referencia de método (LQAS — Distribución Binomial)</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "#374151", background: "#f9fafb", padding: "14px 18px", borderRadius: 10, lineHeight: 2 }}>
            Hallar mín. <b>n</b> y <b>d</b> tal que:<br />
            P(X ≤ d | n, p₀) ≥ confianza &nbsp;·&nbsp; (aceptar lote bueno)<br />
            P(X &gt; d | n, p₁) ≥ potencia &nbsp;&nbsp;·&nbsp; (rechazar lote malo)<br />
            <span style={{ color: "#059669" }}>X ~ Binomial(n, p) ; P(X=k) = C(n,k)·pᵏ·(1−p)^(n−k)</span>
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "10px 0 0", lineHeight: 1.5 }}>
            El algoritmo itera <b>n</b> desde 1 hasta encontrar el mínimo valor que satisface simultáneamente las condiciones de confianza y potencia. El valor de corte <b>d</b> se determina como el menor entero que garantiza la confianza requerida.
          </p>
        </div>
      </div>
    </div>
  );
}
