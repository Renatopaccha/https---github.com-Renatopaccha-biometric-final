/*
  ╔══════════════════════════════════════════════════════════════════╗
  ║  BIOMETRIC — Calculador de Pruebas Diagnósticas                 ║
  ║  Contraste de Hipótesis · Grupos Independientes y Emparejados   ║
  ║  Método de Buderer (1996) · Verificado contra EpiData v4        ║
  ╚══════════════════════════════════════════════════════════════════╝
*/

import { useState } from "react";

/* ═══════════════════════════════════════════════════
   UTILIDADES ESTADÍSTICAS
   ═══════════════════════════════════════════════════ */
function normalInv(p: any) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

function normalCDF(x: any) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const p = 0.3989422804014327 * Math.exp(-x * x / 2) *
    (t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.3302744)))));
  return x > 0 ? 1 - p : p;
}

/* ═══════════════════════════════════════════════════
   FÓRMULAS PRINCIPALES
   ═══════════════════════════════════════════════════ */
function calcN_Indep(p1: any, p2: any, Za: any, Zb: any, vprev: any, vratio: any, disCond: any, isSpec: any) {
  const pm = (p1 + p2) / 2;
  const rawN = Math.pow(Za * Math.sqrt(2 * pm * (1 - pm)) + Zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) / Math.pow(p1 - p2, 2);
  const coreN = Math.ceil(rawN);
  if (disCond === "desconocida") return { n: isSpec ? Math.ceil(coreN / (1 - vprev)) : Math.ceil(coreN / vprev), casos: 0, controles: 0 };
  const nCasos = isSpec ? Math.ceil(coreN / vratio) : coreN;
  const nControles = isSpec ? coreN : Math.ceil(coreN * vratio);
  return { n: nCasos + nControles, casos: nCasos, controles: nControles };
}

function calcN_Paired(p1: any, p2: any, Za: any, Zb: any, vprev: any, vratio: any, disCond: any, isSpec: any) {
  const p12 = p1 * (1 - p2), p21 = p2 * (1 - p1);
  const ps = p12 + p21, pd = p12 - p21;
  if (Math.abs(pd) < 1e-9) return { n: Infinity, casos: 0, controles: 0 };
  const rawN = Math.pow(Za * Math.sqrt(ps) + Zb * Math.sqrt(ps - pd * pd), 2) / (pd * pd);
  const coreN = Math.ceil(rawN);
  if (disCond === "desconocida") return { n: isSpec ? Math.ceil(coreN / (1 - vprev)) : Math.ceil(coreN / vprev), casos: 0, controles: 0 };
  const nCasos = isSpec ? Math.ceil(coreN / vratio) : coreN;
  const nControles = isSpec ? coreN : Math.ceil(coreN * vratio);
  return { n: nCasos + nControles, casos: nCasos, controles: nControles };
}

function calcPow_Indep(nT: any, p1: any, p2: any, Za: any, vprev: any, vratio: any, disCond: any, isSpec: any) {
  const n = disCond === "desconocida" ? (isSpec ? nT * (1 - vprev) : nT * vprev) : (isSpec ? nT / (1 + 1 / vratio) : nT / (1 + vratio));
  const pm = (p1 + p2) / 2;
  const Zb = (Math.sqrt(n) * Math.abs(p1 - p2) - Za * Math.sqrt(2 * pm * (1 - pm))) / Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.max(0.01, Math.min(99.99, normalCDF(Zb) * 100));
}

function calcPow_Paired(nT: any, p1: any, p2: any, Za: any, vprev: any, vratio: any, disCond: any, isSpec: any) {
  const n = disCond === "desconocida" ? (isSpec ? nT * (1 - vprev) : nT * vprev) : (isSpec ? nT / (1 + 1 / vratio) : nT / (1 + vratio));
  const p12 = p1 * (1 - p2), p21 = p2 * (1 - p1);
  const ps = p12 + p21, pd = p12 - p21;
  const Zb = (Math.sqrt(n) * Math.abs(pd) - Za * Math.sqrt(ps)) / Math.sqrt(ps - pd * pd);
  return Math.max(0.01, Math.min(99.99, normalCDF(Zb) * 100));
}

/* ═══════════════════════════════════════════════════
   ÍCONOS SVG
   ═══════════════════════════════════════════════════ */
const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
  </svg>
);
const CalcIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="8" y2="10.01" /><line x1="12" y1="10" x2="12" y2="10.01" /><line x1="16" y1="10" x2="16" y2="10.01" />
    <line x1="8" y1="14" x2="8" y2="14.01" /><line x1="12" y1="14" x2="12" y2="14.01" /><line x1="16" y1="14" x2="16" y2="14.01" />
    <line x1="8" y1="18" x2="16" y2="18" />
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ResetIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
  </svg>
);
const BackIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);
const TableIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" />
  </svg>
);
const SparkleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
  </svg>
);

/* ═══════════════════════════════════════════════════
   COMPONENTES REUTILIZABLES
   ═══════════════════════════════════════════════════ */
function Tooltip({ children, text }: any) {
  const [show, setShow] = useState(false);
  return (
    <span
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: "relative", display: "inline-flex", cursor: "help" }}
    >
      {children}
      {show && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)", background: "#1f2937", color: "#f9fafb",
          fontSize: 12, lineHeight: 1.5, padding: "10px 14px", borderRadius: 10,
          width: 270, zIndex: 200, boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          pointerEvents: "none", fontWeight: 400,
        }}>
          {text}
          <span style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0, borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent", borderTop: "6px solid #1f2937",
          }} />
        </span>
      )}
    </span>
  );
}

function SectionLabel({ step, label }: any) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.08em", color: "#10b981", marginBottom: 14,
      display: "flex", alignItems: "center", gap: 6,
    }}>
      <span style={{ width: 18, height: 2, background: "#10b981", borderRadius: 2 }} />
      {step} · {label}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#f3f4f6", margin: "4px 0 18px" }} />;
}

function Field({ label, tooltip, value, onChange, placeholder, suffix, hint, disabled }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
        {tooltip && (
          <Tooltip text={tooltip}>
            <span style={{ color: "#9ca3af", display: "flex" }}><InfoIcon /></span>
          </Tooltip>
        )}
      </div>
      <div style={{
        display: "flex", alignItems: "center",
        border: focused ? "2px solid #10b981" : "2px solid #e5e7eb",
        borderRadius: 10, background: disabled ? "#f9fafb" : "white",
        transition: "all 0.2s ease",
        boxShadow: focused ? "0 0 0 3px rgba(16, 185, 129, 0.1)" : "none",
        overflow: "hidden",
        opacity: disabled ? 0.55 : 1,
      }}>
        <input
          type="number" value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder} disabled={disabled} step="any"
          style={{
            flex: 1, border: "none", outline: "none",
            padding: "11px 14px", fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
            background: "transparent",
            color: disabled ? "#9ca3af" : "#111827",
          }}
        />
        {suffix && (
          <span style={{
            padding: "0 14px", fontSize: 13, color: "#6b7280", fontWeight: 600,
            borderLeft: "1px solid #f3f4f6", background: "#f9fafb",
            alignSelf: "stretch", display: "flex", alignItems: "center",
          }}>{suffix}</span>
        )}
      </div>
      {hint && <p style={{ fontSize: 12, color: "#9ca3af", margin: "5px 0 0", lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

function QuickBtns({ values, current, onSelect, suffix }: any) {
  return (
    <div style={{ display: "flex", gap: 5, marginTop: -10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginRight: 3 }}>Frecuentes:</span>
      {values.map((v: any) => (
        <button key={v} onClick={() => onSelect(v.toString())} style={{
          padding: "4px 12px", borderRadius: 8, border: "none",
          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          background: current === v ? "#ecfdf5" : "#f9fafb",
          color: current === v ? "#059669" : "#9ca3af",
          transition: "all 0.15s ease",
        }}>
          {v}{suffix || ""}
        </button>
      ))}
    </div>
  );
}

function RadioCard({ selected, onClick, label, description }: any) {
  return (
    <div onClick={onClick} style={{
      padding: "13px 14px", borderRadius: 12, cursor: "pointer",
      border: selected ? "2px solid #10b981" : "2px solid #e5e7eb",
      background: selected ? "#f0fdf4" : "white",
      transition: "all 0.2s ease", flex: 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{
          width: 19, height: 19, borderRadius: "50%", flexShrink: 0,
          border: selected ? "6px solid #10b981" : "2px solid #d1d5db",
          background: "white", transition: "all 0.2s ease",
        }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: selected ? "#065f46" : "#374151" }}>{label}</div>
          {description && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3, lineHeight: 1.4 }}>{description}</div>}
        </div>
      </div>
    </div>
  );
}

function CheckOption({ checked, onChange, label, description }: any) {
  return (
    <div onClick={onChange} style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "13px 14px", borderRadius: 12, cursor: "pointer",
      border: checked ? "2px solid #10b981" : "2px solid #e5e7eb",
      background: checked ? "#f0fdf4" : "white",
      transition: "all 0.2s ease", flex: 1,
    }}>
      <div style={{
        width: 21, height: 21, borderRadius: 6, flexShrink: 0, marginTop: 1,
        border: checked ? "2px solid #10b981" : "2px solid #d1d5db",
        background: checked ? "#10b981" : "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s ease",
      }}>
        {checked && <CheckIcon />}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: checked ? "#065f46" : "#374151" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3, lineHeight: 1.4 }}>{description}</div>
      </div>
    </div>
  );
}

function PowerBar({ value }: any) {
  const pw = parseFloat(value) || 0;
  const color = pw >= 80 ? "#10b981" : pw >= 60 ? "#d97706" : "#ef4444";
  const label = pw >= 80 ? "Adecuada (≥80%)" : pw >= 60 ? "Baja — considera aumentar n" : "Insuficiente (<60%)";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ height: 8, borderRadius: 4, background: "#f3f4f6", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 4, background: color, width: `${Math.min(100, pw)}%`, transition: "width 0.4s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 5 }}>
        <span style={{ color: "#9ca3af" }}>0%</span>
        <span style={{ color, fontWeight: 700 }}>Potencia {pw.toFixed(1)}% — {label}</span>
        <span style={{ color: "#9ca3af" }}>100%</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════ */
export function DiagnosticTestHypothesisCalculator({ onBack }: { onBack?: () => void }) {
  /* ── Estado ─────────────────────────────────────── */
  const [group, setGroup] = useState("indep");       // "indep" | "paired"
  const [useSens, setUseSens] = useState(true);
  const [useSpec, setUseSpec] = useState(false);

  // Sensibilidad P1 / P2
  const [sP1, setSP1] = useState("");
  const [sP2, setSP2] = useState("");
  // Especificidad P1 / P2
  const [eP1, setEP1] = useState("");
  const [eP2, setEP2] = useState("");

  const [disCond, setDisCond] = useState("desconocida"); // "conocida" | "desconocida"
  const [prev, setPrev] = useState("");
  const [ratio, setRatio] = useState("1");
  const [conf, setConf] = useState("95");

  const [mode, setMode] = useState("n");             // "n" | "pow"
  const [pow, setPow] = useState("80");
  const [nTotal, setNTotal] = useState("");
  const [useRange, setUseRange] = useState(false);
  const [rMin, setRMin] = useState("80");
  const [rMax, setRMax] = useState("95");
  const [rInc, setRInc] = useState("5");

  const [result, setResult] = useState<any>(null);

  /* ── Validación ─────────────────────────────────── */
  const vConf = parseFloat(conf);
  const alpha = 1 - vConf / 100;
  const Za = conf !== "" ? normalInv(1 - alpha / 2) : 0;
  const vprev = parseFloat(prev) / 100;

  const vsp1 = parseFloat(sP1) / 100, vsp2 = parseFloat(sP2) / 100;
  const vep1 = parseFloat(eP1) / 100, vep2 = parseFloat(eP2) / 100;

  const sensOk = useSens && sP1 !== "" && sP2 !== "" && vsp1 > 0 && vsp1 < 1 && vsp2 > 0 && vsp2 < 1 && Math.abs(vsp1 - vsp2) > 0.001;
  const specOk = useSpec && eP1 !== "" && eP2 !== "" && vep1 > 0 && vep1 < 1 && vep2 > 0 && vep2 < 1 && Math.abs(vep1 - vep2) > 0.001;
  const paramsOk = (useSens && !useSpec && sensOk) || (!useSens && useSpec && specOk) || (useSens && useSpec && sensOk && specOk);
  const vratio = parseFloat(ratio);
  const prevOk = disCond === "desconocida" ? (prev !== "" && vprev > 0 && vprev < 1) : (ratio !== "" && parseFloat(ratio) > 0);
  const confOk = conf !== "" && vConf > 50 && vConf < 100;

  let canCalc = false;
  if (paramsOk && prevOk && confOk) {
    if (mode === "n") {
      if (!useRange) canCalc = pow !== "" && parseFloat(pow) > 0 && parseFloat(pow) < 100;
      else canCalc = rMin !== "" && rMax !== "" && rInc !== "" && parseFloat(rMin) > 0 && parseFloat(rMax) < 100 && parseFloat(rInc) > 0 && parseFloat(rMin) <= parseFloat(rMax);
    } else {
      if (!useRange) canCalc = nTotal !== "" && parseFloat(nTotal) > 0;
      else canCalc = rMin !== "" && rMax !== "" && rInc !== "" && parseFloat(rMin) > 0 && parseFloat(rMax) > 0 && parseFloat(rInc) > 0 && parseFloat(rMin) <= parseFloat(rMax);
    }
  }

  /* ── Cálculo ────────────────────────────────────── */
  function calcForParam(p1: number, p2: number, isSpec: boolean) {
    if (mode === "n") {
      if (!useRange) {
        const Zb = normalInv(parseFloat(pow) / 100);
        return group === "indep"
          ? calcN_Indep(p1, p2, Za, Zb, vprev, vratio, disCond, isSpec)
          : calcN_Paired(p1, p2, Za, Zb, vprev, vratio, disCond, isSpec);
      } else {
        const rows = [];
        let pw = parseFloat(rMin);
        while (pw <= parseFloat(rMax) + 0.0001) {
          const Zb = normalInv(pw / 100);
          const resN = group === "indep"
            ? calcN_Indep(p1, p2, Za, Zb, vprev, vratio, disCond, isSpec)
            : calcN_Paired(p1, p2, Za, Zb, vprev, vratio, disCond, isSpec);
          const n = resN.n;
          rows.push([pw.toFixed(1) + "%", n === Infinity ? "∞" : n.toLocaleString()]);
          pw = Math.round((pw + parseFloat(rInc)) * 1000) / 1000;
        }
        return rows;
      }
    } else {
      if (!useRange) {
        const vn = parseFloat(nTotal);
        return group === "indep"
          ? calcPow_Indep(vn, p1, p2, Za, vprev, vratio, disCond, isSpec)
          : calcPow_Paired(vn, p1, p2, Za, vprev, vratio, disCond, isSpec);
      } else {
        const rows = [];
        let vn = parseFloat(rMin);
        while (vn <= parseFloat(rMax) + 0.0001) {
          const pw = group === "indep"
            ? calcPow_Indep(vn, p1, p2, Za, vprev, vratio, disCond, isSpec)
            : calcPow_Paired(vn, p1, p2, Za, vprev, vratio, disCond, isSpec);
          rows.push([vn.toLocaleString(), pw.toFixed(1) + "%", pw]);
          vn = Math.round((vn + parseFloat(rInc)) * 1000) / 1000;
        }
        return rows;
      }
    }
  }

  function handleCalc() {
    if (!canCalc) return;
    const res: any = {};
    if (useSens) res.sens = calcForParam(vsp1, vsp2, false);
    if (useSpec) res.spec = calcForParam(vep1, vep2, true);
    setResult(res);
  }

  function handleReset() {
    setSP1(""); setSP2(""); setEP1(""); setEP2("");
    setPrev(""); setRatio("1"); setConf("95"); setPow("80"); setNTotal("");
    setUseRange(false); setRMin("80"); setRMax("95"); setRInc("5");
    setResult(null);
  }

  /* ── Interpretaciones ───────────────────────────── */
  function getInterp(label: any, p1: any, p2: any, value: any, isTable: any) {
    const diff = (Math.abs(p1 - p2) * 100).toFixed(1);
    const gLabel = group === "indep" ? "grupos independientes" : "grupos emparejados";
    const lbl = label.toLowerCase();
    if (isTable) return `Tabla de ${lbl} para detectar diferencia de ${diff}% · ${gLabel}. A mayor potencia deseada, mayor número de sujetos requerido.`;
    if (mode === "n") {
      const n = value;
      const casosStr = disCond === "desconocida" ? ` (casos estimados: ${Math.ceil(n * vprev)})` : "";
      return `Para detectar una diferencia de ${diff}% en ${lbl} (${(p1 * 100).toFixed(1)}% vs ${(p2 * 100).toFixed(1)}%) entre ${gLabel}, con confianza ${conf}% y potencia ${pow}%, se necesitan ${n.toLocaleString()} sujetos totales${casosStr}. Se recomienda añadir un 10–15% adicional por posibles pérdidas.`;
    } else {
      const pw = value;
      const estado = pw >= 80 ? "adecuada ✓" : pw >= 60 ? "baja — considera aumentar n" : "insuficiente — aumenta n urgentemente";
      return `Con ${parseInt(nTotal || rMin).toLocaleString()} sujetos, la potencia para detectar la diferencia de ${diff}% en ${lbl} es ${pw.toFixed(1)}% — ${estado}.`;
    }
  }

  /* ── Colores para barra de potencia ─────────────── */
  const pwColors = (pw: any) => ({
    color: pw >= 80 ? "#10b981" : pw >= 60 ? "#d97706" : "#ef4444",
    bg: pw >= 80 ? "linear-gradient(135deg,#ecfdf5,#d1fae5)" : pw >= 60 ? "linear-gradient(135deg,#fefce8,#fef3c7)" : "linear-gradient(135deg,#fef2f2,#fecaca)",
    border: pw >= 80 ? "#6ee7b7" : pw >= 60 ? "#fde68a" : "#fca5a5",
  });

  /* ── Render de resultados ───────────────────────── */
  const renderResults = () => {
    if (!result) return null;

    const bothSelected = useSens && useSpec;
    const params = [
      ...(useSens ? [{ key: "sens", label: "Sensibilidad", p1: vsp1, p2: vsp2 }] : []),
      ...(useSpec ? [{ key: "spec", label: "Especificidad", p1: vep1, p2: vep2 }] : []),
    ];

    // ── Tamaño de muestra · Valor único ─────────────
    if (mode === "n" && !useRange) {
      if (!bothSelected) {
        const pm = params[0];
        const resObj = result[pm.key];
        const n = resObj.n;
        return (
          <div style={{ background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", border: "2px solid #6ee7b7", borderRadius: 16, overflow: "hidden", animation: "slideUp 0.4s cubic-bezier(.16,1,.3,1)", marginTop: 22 }}>
            <div style={{ padding: "20px 24px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#059669", marginBottom: 16, display: "flex", alignItems: "center", gap: 5 }}>
                <CheckIcon /> Resultado
              </div>
              <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-end", paddingBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Sujetos Totales</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 48, fontWeight: 800, color: "#065f46", fontFamily: "'DM Mono', monospace", letterSpacing: "-.03em", lineHeight: 1 }}>{n.toLocaleString()}</span>
                  </div>
                </div>
                {disCond === "conocida" && (
                  <>
                    <div style={{ borderLeft: "2px solid #a7f3d0", paddingLeft: 24 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Enfermos</div>
                      <span style={{ fontSize: 36, fontWeight: 800, color: "#059669", fontFamily: "'DM Mono', monospace", letterSpacing: "-.02em", lineHeight: 1 }}>{resObj.casos.toLocaleString()}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Sanos</div>
                      <span style={{ fontSize: 36, fontWeight: 800, color: "#059669", fontFamily: "'DM Mono', monospace", letterSpacing: "-.02em", lineHeight: 1 }}>{resObj.controles.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.6)", padding: "12px 24px", display: "flex", flexWrap: "wrap", gap: "7px 16px" }}>
              {[
                [`${pm.label} P1`, `${(pm.p1 * 100).toFixed(1)}%`],
                [`${pm.label} P2`, `${(pm.p2 * 100).toFixed(1)}%`],
                ...(disCond === "desconocida" ? [["Prevalencia", `${parseFloat(prev).toFixed(1)}%`], ["Casos estimados", Math.ceil(n * vprev).toLocaleString()]] : [["Razón (sanos/enfermos)", ratio]]),
                ["Confianza", `${conf}%`], ["Potencia", `${pow}%`],
                ["Diseño", group === "indep" ? "Independientes" : "Emparejados"],
              ].map(([k, v]: any) => (
                <span key={k} style={{ fontSize: 12, color: "#065f46" }}><b>{k}:</b> {v}</span>
              ))}
            </div>
            <div style={{ background: "rgba(255,255,255,0.4)", padding: "12px 24px", borderTop: "1px solid rgba(16,185,129,.15)", display: "flex", gap: 9 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
              <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}>
                <b>Interpretación IA:</b> {getInterp(pm.label, pm.p1, pm.p2, n, false)}{disCond === "conocida" ? ` Esta muestra se distribuye exactamente en ${resObj.casos.toLocaleString()} sujetos enfermos y ${resObj.controles.toLocaleString()} sujetos sanos, manteniendo la razón establecida de ${ratio}.` : ""}
              </div>
            </div>
          </div>
        );
      }

      // Ambos parámetros seleccionados
      const sObj = result.sens, eObj = result.spec;
      const nS = sObj.n, nE = eObj.n;
      const maxObj = nS > nE ? sObj : eObj;
      const maxN = maxObj.n;
      return (
        <div style={{ background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", border: "2px solid #6ee7b7", borderRadius: 16, overflow: "hidden", animation: "slideUp 0.4s cubic-bezier(.16,1,.3,1)", marginTop: 22 }}>
          <div style={{ padding: "20px 24px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#059669", marginBottom: 14, display: "flex", alignItems: "center", gap: 5 }}>
              <CheckIcon /> Resultado — Ambos parámetros
            </div>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-end" }}>
              {[["Sensibilidad", nS], ["Especificidad", nE]].map(([lbl, n]: any) => (
                <div key={lbl}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>{lbl}</div>
                  <span style={{ fontSize: 32, fontWeight: 800, color: "#065f46", fontFamily: "'DM Mono', monospace", letterSpacing: "-.02em", opacity: 0.8 }}>{n.toLocaleString()}</span>
                </div>
              ))}
              <div style={{ borderLeft: "2px solid #a7f3d0", paddingLeft: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Total Final</div>
                <span style={{ fontSize: 44, fontWeight: 800, color: "#065f46", fontFamily: "'DM Mono', monospace", letterSpacing: "-.02em", lineHeight: 1 }}>{maxN.toLocaleString()}</span>
              </div>
              
              {disCond === "conocida" && (
                <>
                  <div style={{ borderLeft: "2px solid #a7f3d0", paddingLeft: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Enfermos</div>
                    <span style={{ fontSize: 32, fontWeight: 800, color: "#059669", fontFamily: "'DM Mono', monospace", letterSpacing: "-.02em", lineHeight: 1 }}>{maxObj.casos.toLocaleString()}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Sanos</div>
                    <span style={{ fontSize: 32, fontWeight: 800, color: "#059669", fontFamily: "'DM Mono', monospace", letterSpacing: "-.02em", lineHeight: 1 }}>{maxObj.controles.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.6)", padding: "12px 24px", display: "flex", flexWrap: "wrap", gap: "7px 16px" }}>
            {[
              ...(disCond === "desconocida" ? [["Prevalencia", `${parseFloat(prev).toFixed(1)}%`]] : [["Razón (sanos/enfermos)", ratio]]),
              ["Confianza", `${conf}%`], ["Potencia", `${pow}%`],
              ["Diseño", group === "indep" ? "Independientes" : "Emparejados"],
            ].map(([k, v]: any) => (
              <span key={k} style={{ fontSize: 12, color: "#065f46" }}><b>{k}:</b> {v}</span>
            ))}
          </div>
          <div style={{ background: "rgba(255,255,255,0.4)", padding: "12px 24px", borderTop: "1px solid rgba(16,185,129,.15)", display: "flex", gap: 9 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
            <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}>
              <b>Interpretación IA:</b> Se recomienda usar <b>{maxN.toLocaleString()} sujetos</b> (el mayor entre ambos parámetros) para garantizar potencia del {pow}% en sensibilidad y especificidad simultáneamente{disCond === "desconocida" ? ` con prevalencia del ${parseFloat(prev).toFixed(1)}%` : ` con razón de ${ratio}`}. {maxN === nS ? "La sensibilidad determina el tamaño de muestra en este caso." : "La especificidad determina el tamaño de muestra en este caso."}
            </div>
          </div>
        </div>
      );
    }

    // ── Tamaño de muestra · Rango (tabla) ───────────
    if (mode === "n" && useRange) {
      return params.map((pm) => (
        <div key={pm.key} style={{ background: "white", border: "2px solid #6ee7b7", borderRadius: 16, overflow: "hidden", animation: "slideUp 0.4s cubic-bezier(.16,1,.3,1)", marginTop: 18 }}>
          <div style={{ background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", padding: "16px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#059669", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <CheckIcon /> Tabla — {pm.label}
            </div>
            <p style={{ fontSize: 13, color: "#065f46", margin: 0 }}>
              P1: {(pm.p1 * 100).toFixed(1)}% / P2: {(pm.p2 * 100).toFixed(1)}% · Confianza: {conf}% · {group === "indep" ? "Independientes" : "Emparejados"}{disCond === "desconocida" ? ` · Prev: ${parseFloat(prev).toFixed(1)}%` : ` · Razón: ${ratio}`}
            </p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ padding: "10px 20px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid #e5e7eb" }}>Potencia (%)</th>
                <th style={{ padding: "10px 20px", textAlign: "right", fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid #e5e7eb" }}>n total</th>
              </tr>
            </thead>
            <tbody>
              {result[pm.key].map((row: any, i: number) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafbfc" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#ecfdf5"}
                  onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafbfc"}
                >
                  <td style={{ padding: "10px 20px", borderBottom: "1px solid #f3f4f6", fontWeight: 500, color: "#374151" }}>{row[0]}</td>
                  <td style={{ padding: "10px 20px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 700, color: "#065f46", fontFamily: "'DM Mono', monospace" }}>{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ background: "rgba(236,253,245,0.5)", padding: "12px 22px", borderTop: "1px solid rgba(16,185,129,.15)", display: "flex", gap: 9 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
            <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}><b>Interpretación IA:</b> {getInterp(pm.label, pm.p1, pm.p2, 0, true)}</div>
          </div>
        </div>
      ));
    }

    // ── Calcular potencia ────────────────────────────
    if (mode === "pow" && !useRange) {
      return params.map((pm) => {
        const pw = result[pm.key];
        const { color, bg, border } = pwColors(pw);
        return (
          <div key={pm.key} style={{ background: bg, border: `2px solid ${border}`, borderRadius: 16, overflow: "hidden", animation: "slideUp 0.4s cubic-bezier(.16,1,.3,1)", marginTop: 14 }}>
            <div style={{ padding: "18px 22px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color, marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
                <CheckIcon /> Potencia — {pm.label}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 14 }}>
                <span style={{ fontSize: 44, fontWeight: 800, color, fontFamily: "'DM Mono', monospace", letterSpacing: "-.03em" }}>{pw.toFixed(1)}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color }}>%</span>
              </div>
              <PowerBar value={pw} />
            </div>
            <div style={{ background: "rgba(255,255,255,0.6)", padding: "11px 22px", display: "flex", flexWrap: "wrap", gap: "7px 16px" }}>
              {[
                [`${pm.label} P1`, `${(pm.p1 * 100).toFixed(1)}%`],
                [`${pm.label} P2`, `${(pm.p2 * 100).toFixed(1)}%`],
                ...(disCond === "desconocida" ? [["Prevalencia", `${parseFloat(prev).toFixed(1)}%`]] : [["Razón (sanos/enfermos)", ratio]]),
                ["Confianza", `${conf}%`], ["Sujetos", parseInt(nTotal).toLocaleString()],
                ["Diseño", group === "indep" ? "Independientes" : "Emparejados"],
              ].map(([k, v]: any) => (
                <span key={k} style={{ fontSize: 12, color: "#374151" }}><b>{k}:</b> {v}</span>
              ))}
            </div>
            <div style={{ background: "rgba(255,255,255,0.4)", padding: "11px 22px", borderTop: "1px solid rgba(0,0,0,.06)", display: "flex", gap: 9 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}><SparkleIcon /></div>
              <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}><b>Interpretación IA:</b> {getInterp(pm.label, pm.p1, pm.p2, pw, false)}</div>
            </div>
          </div>
        );
      });
    }

    if (mode === "pow" && useRange) {
      return params.map((pm) => (
        <div key={pm.key} style={{ background: "white", border: "2px solid #6ee7b7", borderRadius: 16, overflow: "hidden", animation: "slideUp 0.4s cubic-bezier(.16,1,.3,1)", marginTop: 18 }}>
          <div style={{ background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", padding: "16px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#059669", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <CheckIcon /> Tabla de Potencia — {pm.label}
            </div>
            <p style={{ fontSize: 13, color: "#065f46", margin: 0 }}>
              P1: {(pm.p1 * 100).toFixed(1)}% / P2: {(pm.p2 * 100).toFixed(1)}% · Confianza: {conf}% · {group === "indep" ? "Independientes" : "Emparejados"}{disCond === "desconocida" ? ` · Prev: ${parseFloat(prev).toFixed(1)}%` : ` · Razón: ${ratio}`}
            </p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ padding: "10px 20px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid #e5e7eb" }}>Sujetos Totales</th>
                <th style={{ padding: "10px 20px", textAlign: "right", fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid #e5e7eb" }}>Potencia (%)</th>
              </tr>
            </thead>
            <tbody>
              {result[pm.key].map((row: any, i: number) => {
                const pw = parseFloat(row[2]);
                const cColor = pw >= 80 ? "#065f46" : pw >= 60 ? "#b45309" : "#dc2626";
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafbfc" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#ecfdf5"}
                    onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafbfc"}
                  >
                    <td style={{ padding: "10px 20px", borderBottom: "1px solid #f3f4f6", fontWeight: 500, color: "#374151" }}>{row[0]}</td>
                    <td style={{ padding: "10px 20px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 700, color: cColor, fontFamily: "'DM Mono', monospace" }}>{row[1]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ));
    }

    return null;
  };

  /* ═══════════════════════════════════════════════
     JSX PRINCIPAL
     ═══════════════════════════════════════════════ */
  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#fafbfc", minHeight: "100vh", color: "#1a1a2e" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 60px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <span onClick={onBack} style={{ color: "#10b981", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <BackIcon /> Muestreo
          </span>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#9ca3af" }}>Contraste de Hipótesis</span>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#374151", fontWeight: 600 }}>Pruebas Diagnósticas</span>
        </div>

        {/* Título */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 15, marginBottom: 7 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 21 }}>🔬</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#111827", letterSpacing: "-.02em" }}>Pruebas Diagnósticas</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0", lineHeight: 1.5 }}>Contraste de hipótesis · Comparación de dos pruebas diagnósticas</p>
          </div>
        </div>

        {/* Banner IA */}
        <div style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", border: "1px solid #a7f3d0", borderRadius: 12, padding: "11px 14px", margin: "16px 0 22px", display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#065f46", cursor: "pointer" }}>
          <div style={{ background: "#10b981", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}><SparkleIcon /></div>
          <span><b>Asistente IA:</b> ¿No sabes qué diseño elegir? Describe tu estudio y te ayudo a seleccionar el método correcto e interpretar los resultados para tu tesis.</span>
        </div>

        {/* Selector de diseño */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b7280", marginBottom: 9 }}>Diseño del estudio</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
            {[
              { id: "indep", emoji: "👥", label: "Grupos Independientes", desc: "Cada sujeto recibe una sola prueba. Dos grupos separados de enfermos." },
              { id: "paired", emoji: "🔗", label: "Grupos Emparejados", desc: "Los mismos sujetos enfermos reciben ambas pruebas. Más eficiente estadísticamente." },
            ].map((g) => (
              <div key={g.id} onClick={() => { setGroup(g.id); setResult(null); }} style={{
                padding: 14, borderRadius: 14, cursor: "pointer",
                border: group === g.id ? "2px solid #10b981" : "2px solid #e5e7eb",
                background: group === g.id ? "#f0fdf4" : "white",
                boxShadow: group === g.id ? "0 3px 10px rgba(16,185,129,.08)" : "none",
                transition: "all 0.2s ease",
              }}>
                <div style={{ fontSize: 19, marginBottom: 6 }}>{g.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: group === g.id ? "#065f46" : "#374151", marginBottom: 3 }}>{g.label}</div>
                <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>{g.desc}</div>
                {group === g.id && (
                  <div style={{ marginTop: 7, fontSize: 11, fontWeight: 700, color: "#10b981", display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckIcon /> Seleccionado
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── FORM CARD ── */}
        <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: "24px 24px 8px", boxShadow: "0 1px 4px rgba(0,0,0,.03)" }}>

          {/* PASO 1 — Parámetros */}
          <SectionLabel step="Paso 1" label="Parámetros diagnósticos a calcular" />
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 13px", lineHeight: 1.5 }}>
            Selecciona uno o ambos parámetros. Si marcas los dos, obtendrás el resultado para cada uno por separado.
          </p>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <CheckOption
              checked={useSens} onChange={() => { setUseSens(!useSens); setResult(null); }}
              label="Sensibilidad"
              description="Capacidad de identificar correctamente a los enfermos (tasa de verdaderos positivos)"
            />
            <CheckOption
              checked={useSpec} onChange={() => { setUseSpec(!useSpec); setResult(null); }}
              label="Especificidad"
              description="Capacidad de identificar correctamente a los sanos (tasa de verdaderos negativos)"
            />
          </div>

          {!useSens && !useSpec && (
            <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
              ⚠️ Selecciona al menos un parámetro diagnóstico para continuar.
            </div>
          )}

          {/* Campos Sensibilidad */}
          {useSens && (
            <div style={{ background: "#f9fafb", borderRadius: 12, padding: "16px 16px 2px", border: "1px solid #f3f4f6", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#059669", marginBottom: 10, gridColumn: "1/-1" }}>Sensibilidad esperada por prueba</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Sensibilidad — Prueba 1" value={sP1} onChange={setSP1} placeholder="Ej: 70" suffix="%" hint="Prueba índice (nueva o la que deseas validar)"
                  tooltip="Sensibilidad esperada de la primera prueba diagnóstica. Es el porcentaje de enfermos que la prueba identifica correctamente. Introduce un valor entre 0.1 y 99.9." />
                <Field label="Sensibilidad — Prueba 2" value={sP2} onChange={setSP2} placeholder="Ej: 15" suffix="%" hint="Prueba de referencia o comparadora"
                  tooltip="Sensibilidad esperada de la prueba estándar de referencia. Debe ser diferente de Prueba 1 para que el contraste tenga sentido estadístico." />
              </div>
              {useSens && sP1 !== "" && sP2 !== "" && Math.abs(parseFloat(sP1) - parseFloat(sP2)) < 0.1 && (
                <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 9, padding: "9px 13px", marginBottom: 12, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>⚠️ Las sensibilidades deben ser distintas para realizar el contraste.</div>
              )}
              {sensOk && (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #a7f3d0", borderRadius: 9, padding: "9px 13px", marginBottom: 12, fontSize: 12, color: "#065f46" }}>
                  🎯 <b>Diferencia de sensibilidad:</b> {(Math.abs(vsp1 - vsp2) * 100).toFixed(1)}% — cuanto mayor la diferencia, menor el n requerido.
                </div>
              )}
            </div>
          )}

          {/* Campos Especificidad */}
          {useSpec && (
            <div style={{ background: "#f9fafb", borderRadius: 12, padding: "16px 16px 2px", border: "1px solid #f3f4f6", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#059669", marginBottom: 10 }}>Especificidad esperada por prueba</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Especificidad — Prueba 1" value={eP1} onChange={setEP1} placeholder="Ej: 90" suffix="%" hint="Prueba índice (nueva o la que deseas validar)"
                  tooltip="Especificidad esperada de la primera prueba diagnóstica. Es el porcentaje de sanos que la prueba identifica correctamente. Introduce un valor entre 0.1 y 99.9." />
                <Field label="Especificidad — Prueba 2" value={eP2} onChange={setEP2} placeholder="Ej: 75" suffix="%" hint="Prueba de referencia o comparadora"
                  tooltip="Especificidad esperada de la prueba de referencia. Debe diferir de Prueba 1 para que el contraste sea válido." />
              </div>
              {useSpec && eP1 !== "" && eP2 !== "" && Math.abs(parseFloat(eP1) - parseFloat(eP2)) < 0.1 && (
                <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 9, padding: "9px 13px", marginBottom: 12, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>⚠️ Las especificidades deben ser distintas para realizar el contraste.</div>
              )}
              {specOk && (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #a7f3d0", borderRadius: 9, padding: "9px 13px", marginBottom: 12, fontSize: 12, color: "#065f46" }}>
                  🎯 <b>Diferencia de especificidad:</b> {(Math.abs(vep1 - vep2) * 100).toFixed(1)}%
                </div>
              )}
            </div>
          )}

          <Divider />

          {/* PASO 2 — Condiciones */}
          <SectionLabel step="Paso 2" label="Condiciones del estudio" />
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 9 }}>Condición de enfermo en la muestra</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <RadioCard selected={disCond === "desconocida"} onClick={() => { setDisCond("desconocida"); setResult(null); }}
              label="Desconocida" description="Estudio donde no se conoce a priori quién está enfermo. Usa Prevalencia." />
            <RadioCard selected={disCond === "conocida"} onClick={() => { setDisCond("conocida"); setResult(null); }}
              label="Conocida" description="Estudio donde se fija un número de casos y controles. Usa Razón." />
          </div>

          {disCond === "desconocida" ? (
            <Field label="Prevalencia de la enfermedad" value={prev} onChange={setPrev} placeholder="Ej: 3" suffix="%" hint="Proporción de enfermos en la población general"
              tooltip="Se usa para calcular cuántos sujetos deben examinarse para encontrar a pacientes suficientes." />
          ) : (
            <Field label="Razón de no enfermo/enfermo (r)" value={ratio} onChange={setRatio} placeholder="Ej: 1" suffix="" hint="Cantidad de sanos por cada enfermo"
              tooltip="Indica cuántos participantes sin la enfermedad (controles) habrá por cada participante con la enfermedad (casos). Por defecto es 1 (misma cantidad de casos que controles)." />
          )}

          <Field label="Nivel de confianza (1 − α)" value={conf} onChange={(v: any) => { setConf(v); setResult(null); }} placeholder="95" suffix="%"
            hint="Estándar clínico: 95% (bilateral, α = 0.05)"
            tooltip="Probabilidad de no detectar diferencia cuando no existe. El 95% es el estándar en investigación clínica: se acepta hasta un 5% de probabilidad de error tipo I (falso positivo)." />
          <QuickBtns values={["90", "95", "99"]} current={conf} onSelect={(v: any) => { setConf(v); setResult(null); }} suffix="%" />

          <Divider />

          {/* PASO 3 — Tipo de cálculo */}
          <SectionLabel step="Paso 3" label="¿Qué deseas calcular?" />
          <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 20 }}>
            {[{ id: "n", icon: "📐", label: "Tamaño de muestra" }, { id: "pow", icon: "⚡", label: "Calcular potencia" }].map((m) => (
              <button key={m.id} onClick={() => { setMode(m.id); setResult(null); }} style={{
                flex: 1, padding: "10px 12px", border: "none", borderRadius: 9,
                cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                transition: "all 0.25s ease",
                background: mode === m.id ? "white" : "transparent",
                color: mode === m.id ? "#111827" : "#6b7280",
                boxShadow: mode === m.id ? "0 1px 3px rgba(0,0,0,.08)" : "none",
              }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {mode === "n" ? (
            <>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px", lineHeight: 1.5 }}>
                Probabilidad de detectar la diferencia real entre las pruebas si existe. Mínimo recomendado en estudios clínicos: <b style={{ color: "#059669" }}>80%</b>.
              </p>
              {/* Toggle valor único / rango */}
              <div style={{ display: "flex", gap: 4, background: "#f9fafb", borderRadius: 10, padding: 3, marginBottom: 18, border: "1px solid #f3f4f6" }}>
                {[{ val: false, label: "Valor único" }, { val: true, label: "Rango (tabla)", icon: <TableIcon /> }].map((btn) => (
                  <button key={String(btn.val)} onClick={() => { setUseRange(btn.val); setResult(null); }} style={{
                    flex: 1, padding: "8px 10px", border: "none", borderRadius: 7,
                    cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                    background: useRange === btn.val ? "white" : "transparent",
                    color: useRange === btn.val ? "#111827" : "#9ca3af",
                    boxShadow: useRange === btn.val ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                    transition: "all 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    {btn.icon} {btn.label}
                  </button>
                ))}
              </div>

              {!useRange ? (
                <>
                  <Field label="Potencia estadística (1 − β)" value={pow} onChange={(v: any) => { setPow(v); setResult(null); }} placeholder="80" suffix="%" hint="Se recomienda ≥ 80% en investigación clínica"
                    tooltip="La potencia es la probabilidad de detectar la diferencia entre las pruebas si dicha diferencia existe realmente. Con 80%, el 80% de estudios similares detectarían esta diferencia." />
                  <QuickBtns values={["80", "85", "90", "95"]} current={pow} onSelect={(v: any) => { setPow(v); setResult(null); }} suffix="%" />
                </>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 11, lineHeight: 1.5 }}>Genera una tabla mostrando el n necesario para diferentes niveles de potencia estadística.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, background: "#f9fafb", borderRadius: 12, padding: "16px 16px 2px", border: "1px solid #f3f4f6", marginBottom: 18 }}>
                    <Field label="Mínimo" value={rMin} onChange={(v: any) => { setRMin(v); setResult(null); }} placeholder="80" suffix="%" tooltip="Potencia mínima de la tabla (ej: 80)" />
                    <Field label="Máximo" value={rMax} onChange={(v: any) => { setRMax(v); setResult(null); }} placeholder="95" suffix="%" tooltip="Potencia máxima de la tabla (ej: 95)" />
                    <Field label="Incremento" value={rInc} onChange={(v: any) => { setRInc(v); setResult(null); }} placeholder="5" suffix="%" tooltip="Paso entre valores (ej: 5)" />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px", lineHeight: 1.5 }}>
                Estima la potencia estadística que obtendrás con diferentes tamaños de muestra.
              </p>
              {/* Toggle valor único / rango */}
              <div style={{ display: "flex", gap: 4, background: "#f9fafb", borderRadius: 10, padding: 3, marginBottom: 18, border: "1px solid #f3f4f6" }}>
                {[{ val: false, label: "Valor único" }, { val: true, label: "Rango (tabla)", icon: <TableIcon /> }].map((btn) => (
                  <button key={String(btn.val)} onClick={() => { setUseRange(btn.val); setResult(null); }} style={{
                    flex: 1, padding: "8px 10px", border: "none", borderRadius: 7,
                    cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                    background: useRange === btn.val ? "white" : "transparent",
                    color: useRange === btn.val ? "#111827" : "#9ca3af",
                    boxShadow: useRange === btn.val ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                    transition: "all 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    {btn.icon} {btn.label}
                  </button>
                ))}
              </div>

              {!useRange ? (
                <>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px", lineHeight: 1.5 }}>
                    Introduce el número de sujetos disponibles en tu estudio para calcular la potencia estadística alcanzable.
                  </p>
                  <Field label="Número total de sujetos en el estudio" value={nTotal} onChange={(v: any) => { setNTotal(v); setResult(null); }} placeholder="Ej: 381" suffix="sujetos"
                    tooltip="Total de sujetos que participarán. Con la prevalencia se calculará cuántos serán casos enfermos y se estimará la potencia del estudio." />
                </>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 11, lineHeight: 1.5 }}>Genera una tabla mostrando potencia estadística para distintos tamaños de muestra.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, background: "#f9fafb", borderRadius: 12, padding: "16px 16px 2px", border: "1px solid #f3f4f6", marginBottom: 18 }}>
                    <Field label="Mínimo" value={rMin} onChange={(v: any) => { setRMin(v); setResult(null); }} placeholder="100" tooltip="Sujetos mínimos (ej: 100)" />
                    <Field label="Máximo" value={rMax} onChange={(v: any) => { setRMax(v); setResult(null); }} placeholder="500" tooltip="Sujetos máximos (ej: 500)" />
                    <Field label="Incremento" value={rInc} onChange={(v: any) => { setRInc(v); setResult(null); }} placeholder="50" tooltip="Paso entre valores (ej: 50)" />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Botones Calcular / Limpiar */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={handleCalc} disabled={!canCalc} style={{
            flex: 1, padding: "13px 20px", borderRadius: 12, border: "none",
            cursor: canCalc ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.25s ease",
            background: canCalc ? "linear-gradient(135deg,#10b981,#059669)" : "#e5e7eb",
            color: canCalc ? "white" : "#9ca3af",
            boxShadow: canCalc ? "0 4px 14px rgba(16,185,129,.3)" : "none",
          }}
            onMouseDown={(e) => { if (canCalc) e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <CalcIcon /> Calcular
          </button>
          <button onClick={handleReset} style={{
            padding: "13px 18px", borderRadius: 12, border: "2px solid #e5e7eb",
            cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
            background: "white", color: "#6b7280", display: "flex", alignItems: "center", gap: 6,
          }}>
            <ResetIcon /> Limpiar
          </button>
        </div>

        {/* Resultados */}
        {renderResults()}

        {/* Referencia de fórmulas */}
        <div style={{ marginTop: 22, background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "18px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 13 }}>
            Referencia de fórmulas · Método de Buderer (1996)
          </div>
          {[
            {
              label: "Grupos Independientes",
              lines: [
                "n_casos = [ Zα/2·√(2·p̄·(1−p̄)) + Zβ·√(p₁(1−p₁)+p₂(1−p₂)) ]² / (p₁−p₂)²",
                "p̄ = (p₁+p₂)/2  |  n_total = ⌈ n_casos / prevalencia ⌉",
              ],
            },
            {
              label: "Grupos Emparejados (McNemar)",
              lines: [
                "p₁₂ = p₁·(1−p₂)  |  p₂₁ = p₂·(1−p₁)",
                "n_pares = [ Zα/2·√(p₁₂+p₂₁) + Zβ·√(p₁₂+p₂₁−(p₁₂−p₂₁)²) ]² / (p₁₂−p₂₁)²",
                "n_total = ⌈ n_pares / prevalencia ⌉",
              ],
            },
          ].map((f) => (
            <div key={f.label} style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>{f.label}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11.5, color: "#374151", background: "#f9fafb", padding: "11px 15px", borderRadius: 9, lineHeight: 2.1 }}>
                {f.lines.map((line, i) => <div key={i}>{line}</div>)}
              </div>
            </div>
          ))}
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "6px 0 0", lineHeight: 1.5 }}>
            Zα/2: valor crítico normal (ej. 1.96 para NC=95%) · Zβ: valor para potencia (ej. 0.842 para 80%)
          </p>
        </div>

      </div>
    </div>
  );
}

