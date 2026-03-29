import { Fragment, useState, useMemo, type ReactNode, type ChangeEvent } from "react";

type DataRow = Record<string, unknown>;

interface PercResultRow {
  pLabel: string;
  val: number;
  lower: number;
  upper: number;
}

interface PercResultGroup {
  groupName: string;
  rows: PercResultRow[];
}

interface MethodResult {
  methodName: "Exacto" | "Aproximado";
  groups: PercResultGroup[];
  isValues: boolean;
  n: number;
  nc: number;
}

interface CalcArgs {
  modo: string;
  datosExcel?: DataRow[] | null;
  colVar: string;
  manN: number;
  nc: number;
  customP: number[];
  useCuartiles: boolean;
  useDeciles: boolean;
  metExacto: boolean;
  metAprox: boolean;
}

interface InferenciaPercentilProps {
  datosExcel?: DataRow[] | null;
  loadingExcel?: boolean;
  onBack: () => void;
  onContinuarChat?: ((texto: string) => void) | null;
}

interface IconProps {
  d: string;
  size?: number;
  stroke?: string;
  strokeWidth?: number | string;
}

interface StepLabelProps {
  step: string;
  label: string;
}

interface SpinProps {
  sm?: boolean;
}

interface CheckRowProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  indented?: boolean;
  disabled?: boolean;
}

interface ResultTableCardProps {
  res: MethodResult;
  varLabel: string;
  onContinuarChat?: ((texto: string) => void) | null;
}

/* --------------------------------------------------------------------------
   FUNCIONES MATEMATICAS BASE
   -------------------------------------------------------------------------- */

function lgamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function betacf(x: number, a: number, b: number): number {
  const MAXIT = 500, EPS = 1e-12, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1.0, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function ibeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (x > (a + 1) / (a + b + 2)) return 1 - ibeta(1 - x, b, a);
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  return Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a * betacf(x, a, b);
}

function norminv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (Math.abs(p - 0.5) < 1e-15) return 0;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0];
  const pL = 0.02425, pH = 1 - pL;
  if (p < pL) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= pH) {
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

function pbinom(k: number, n: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  return ibeta(1 - p, n - k, k + 1);
}

function max_k_leq(prob: number, n: number, p: number): number {
  let low = 0, high = n, ans = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (pbinom(mid, n, p) <= prob) {
      ans = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return ans;
}

function min_k_geq(prob: number, n: number, p: number): number {
  let low = 0, high = n, ans = n;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (pbinom(mid, n, p) >= prob) {
      ans = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return ans;
}

function parseNumericContinuous(value: unknown): number | "missing" | "invalid" {
  if (value === null || value === undefined) return "missing";
  if (typeof value === "string" && value.trim() === "") return "missing";
  const n = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(n)) return "invalid";
  return n;
}

function colEsCuantitativa(datos: DataRow[] | null | undefined, col: string): boolean {
  if (!datos?.length || !col) return false;
  let validCount = 0;
  for (const row of datos) {
    const parsed = parseNumericContinuous(row[col]);
    if (parsed === "invalid") return false;
    if (parsed !== "missing") validCount++;
  }
  return validCount >= 3;
}

function extractAndSort(datos: DataRow[] | null | undefined, col: string): number[] {
  if (!datos?.length || !col) return [];
  const vals: number[] = [];
  for (const row of datos) {
    const p = parseNumericContinuous(row[col]);
    if (p !== "missing" && p !== "invalid") vals.push(p);
  }
  return vals.sort((a, b) => a - b);
}

function getValueAtRank(sortedArr: number[], rank: number): number {
  const n = sortedArr.length;
  if (n === 0) return 0;
  if (rank <= 1) return sortedArr[0];
  if (rank >= n) return sortedArr[n - 1];

  const i = Math.floor(rank);
  const f = rank - i;
  return sortedArr[i - 1] * (1 - f) + sortedArr[i] * f;
}

/* --------------------------------------------------------------------------
   LOGICA PRINCIPAL: INFERENCIA DE PERCENTIL
   -------------------------------------------------------------------------- */

function calcPercentiles({ modo, datosExcel, colVar, manN, nc, customP, useCuartiles, useDeciles, metExacto, metAprox }: CalcArgs): MethodResult[] {
  const alpha = (100 - nc) / 100;
  let sortedArr: number[] = [];
  let n = 0;
  const isValues = modo === "individual";

  if (isValues) {
    sortedArr = extractAndSort(datosExcel, colVar);
    n = sortedArr.length;
  } else {
    n = manN;
  }

  const results: MethodResult[] = [];

  const tasks: { groupName: string; items: number[] }[] = [];
  if (customP.length > 0) {
    tasks.push({ groupName: "Percentiles", items: [...customP].sort((a, b) => a - b) });
  }
  if (useCuartiles) {
    tasks.push({ groupName: "Cuartiles", items: [25, 50, 75] });
  }
  if (useDeciles) {
    tasks.push({ groupName: "Deciles", items: [10, 20, 30, 40, 50, 60, 70, 80, 90] });
  }

  if (metExacto) {
    const exactGroup: PercResultGroup[] = tasks.map((task) => {
      const rows: PercResultRow[] = task.items.map((p) => {
        const q = p / 100;
        const rankCenter = q * n;

        const L_rank = max_k_leq(alpha / 2, n, q) + 1;
        const U_rank = min_k_geq(1 - alpha / 2, n, q) + 1;

        return {
          pLabel: `P${p}`,
          val: isValues ? getValueAtRank(sortedArr, rankCenter) : rankCenter,
          lower: isValues ? getValueAtRank(sortedArr, L_rank) : L_rank,
          upper: isValues ? getValueAtRank(sortedArr, U_rank) : U_rank,
        };
      });
      return { groupName: task.groupName, rows };
    });
    results.push({ methodName: "Exacto", groups: exactGroup, isValues, n, nc });
  }

  if (metAprox) {
    const z = norminv(1 - alpha / 2);
    const aproxGroup: PercResultGroup[] = tasks.map((task) => {
      const rows: PercResultRow[] = task.items.map((p) => {
        const q = p / 100;
        const rankCenter = q * n;
        const varRank = Math.sqrt(n * q * (1 - q));

        const L_rank = rankCenter - z * varRank;
        const U_rank = rankCenter + z * varRank;

        return {
          pLabel: `P${p}`,
          val: isValues ? getValueAtRank(sortedArr, rankCenter) : rankCenter,
          lower: isValues ? getValueAtRank(sortedArr, L_rank) : L_rank,
          upper: isValues ? getValueAtRank(sortedArr, U_rank) : U_rank,
        };
      });
      return { groupName: task.groupName, rows };
    });
    results.push({ methodName: "Aproximado", groups: aproxGroup, isValues, n, nc });
  }

  return results;
}

const fmt3 = (v: number) => (isFinite(v) ? v.toFixed(3) : "-");
const fmtN = (n: number) => (Number.isInteger(n) ? n.toLocaleString("es-ES") : String(n));

/* --------------------------------------------------------------------------
   GENERACION DE REPORTES (EXCEL Y WORD) NATIVO
   -------------------------------------------------------------------------- */

function exportarExcel(res: MethodResult, varLabel: string): void {
  const cssTh = "background-color:#d9d9d9; font-weight:bold; text-align:center; border:1px solid #000; padding:4px;";
  const cssTdNum = "text-align:right; border:1px solid #000; padding:4px;";
  const cssTd = "text-align:left; border:1px solid #000; padding:4px;";

  const colNames = res.isValues
    ? ["Orden del percentil", "Percentil", "Limite inferior", "Limite superior"]
    : ["Orden del percentil", "Posicion estimada", "Rango inferior", "Rango superior"];

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"></head><body>`;

  html += `<table style="border-collapse: collapse; font-family: sans-serif;">`;
  html += `<tr><th colspan="4" style="background-color:#0F766E; color:white; font-size:14px; padding:8px; border:1px solid #000;">Inferencia sobre un percentil - Metodo ${res.methodName.toLowerCase()}</th></tr>`;
  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Variables: ${varLabel}</td></tr>`;
  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Filtro: No</td></tr>`;
  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Tamano de muestra: ${fmtN(res.n)}</td></tr>`;
  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Nivel de confianza: ${res.nc},0%</td></tr>`;
  html += `<tr><td colspan="4"></td></tr>`;
  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Resultados:</td></tr>`;
  html += `<tr><td colspan="4" style="text-decoration: underline; font-weight:bold;">Metodo ${res.methodName.toLowerCase()}</td></tr>`;
  html += `<tr><td colspan="4">Intervalo de confianza (${res.nc},0%)</td></tr>`;

  html += `<tr><th style="${cssTh}">${colNames[0]}</th><th style="${cssTh}">${colNames[1]}</th><th style="${cssTh}">${colNames[2]}</th><th style="${cssTh}">${colNames[3]}</th></tr>`;

  res.groups.forEach((g) => {
    html += `<tr><td colspan="4" style="background-color:#f3f4f6; font-weight:bold; border:1px solid #000; padding:4px;">${g.groupName}</td></tr>`;
    g.rows.forEach((r) => {
      html += `<tr><td style="${cssTd}">${r.pLabel}</td><td style="${cssTdNum}">${fmt3(r.val).replace(".", ",")}</td><td style="${cssTdNum}">${fmt3(r.lower).replace(".", ",")}</td><td style="${cssTdNum}">${fmt3(r.upper).replace(".", ",")}</td></tr>`;
    });
  });

  html += `</table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `percentiles_${res.methodName}_${Date.now()}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportarWord(res: MethodResult, varLabel: string): void {
  const css = {
    th: "background:#d9d9d9;border:1px solid #000;padding:7px 12px;font-weight:bold;text-align:center;font-family:'Calibri',sans-serif;font-size:11pt",
    td: "border:1px solid #000;padding:6px 12px;text-align:right;font-family:'Calibri',sans-serif;font-size:11pt",
    td0: "border:1px solid #000;padding:6px 12px;text-align:left;font-family:'Calibri',sans-serif;font-size:11pt",
    tbl: "border-collapse:collapse;width:100%;margin-bottom:14pt",
    h2: "font-family:'Calibri',sans-serif;font-size:14pt;font-weight:bold;margin-top:12pt;margin-bottom:4pt",
    h3: "font-family:'Calibri',sans-serif;font-size:12pt;font-weight:bold;margin-top:10pt;margin-bottom:4pt",
    p: "font-family:'Calibri',sans-serif;font-size:11pt;color:#000;margin:3pt 0",
  };

  const colNames = res.isValues
    ? ["Orden del percentil", "Percentil", "Limite inferior", "Limite superior"]
    : ["Orden del percentil", "Posicion estimada", "Rango inferior", "Rango superior"];

  let html = `<h2 style="${css.h2}">Inferencia sobre un percentil</h2>`;
  html += `<p style="${css.p}">Variables: ${varLabel}</p>`;
  html += `<p style="${css.p}">Tamano de muestra: ${fmtN(res.n)}</p>`;
  html += `<p style="${css.p}">Nivel de confianza: ${res.nc},0%</p>`;

  html += `<h3 style="${css.h3}">Resultados:</h3>`;
  html += `<p style="${css.p}; text-decoration:underline;">Metodo ${res.methodName.toLowerCase()}</p>`;
  html += `<p style="${css.p}">Intervalo de confianza (${res.nc},0%)</p>`;

  html += `<table style="${css.tbl}"><thead><tr>`;
  colNames.forEach((c) => html += `<th style="${css.th}">${c}</th>`);
  html += `</tr></thead><tbody>`;

  res.groups.forEach((g) => {
    html += `<tr><td colspan="4" style="${css.td0}; background:#f3f4f6; font-weight:bold;">${g.groupName}</td></tr>`;
    g.rows.forEach((r) => {
      html += `<tr>
        <td style="${css.td0}">${r.pLabel}</td>
        <td style="${css.td}">${fmt3(r.val).replace(".", ",")}</td>
        <td style="${css.td}">${fmt3(r.lower).replace(".", ",")}</td>
        <td style="${css.td}">${fmt3(r.upper).replace(".", ",")}</td>
      </tr>`;
    });
  });

  html += `</tbody></table>`;
  if (!res.isValues) html += `<p style="${css.p}; font-size:10pt">Nota: Al usar datos resumidos, los valores muestran las posiciones (rangos) de la distribucion teorica, no los valores en si.</p>`;

  const blob = new Blob(
    [`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'/><style>body{margin:2cm;}</style></head><body>${html}</body></html>`],
    { type: "application/msword" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `percentiles_${res.methodName}_${Date.now()}.doc`;
  a.click(); URL.revokeObjectURL(url);
}

/* --------------------------------------------------------------------------
   UI COMPONENTS
   -------------------------------------------------------------------------- */

const Icon = ({ d, size = 15, stroke = "currentColor", strokeWidth = 2 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: d }} />
);

const IC_SVG = {
  back: "<path d='M19 12H5'/><path d='M12 19l-7-7 7-7'/>",
  dl: "<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/>",
  word: "<path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/>",
  reset: "<path d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'/><path d='M3 3v5h5'/>",
  ai: "<path d='M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z'/>",
  calc: "<rect x='4' y='2' width='16' height='20' rx='2'/><line x1='8' y1='6' x2='16' y2='6'/><line x1='8' y1='10' x2='8' y2='10.01'/><line x1='12' y1='10' x2='12' y2='10.01'/><line x1='16' y1='10' x2='16' y2='10.01'/><line x1='8' y1='14' x2='8' y2='14.01'/><line x1='12' y1='14' x2='12' y2='14.01'/>",
  chat: "<path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/>",
  x: "<line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>",
  info: "<circle cx='12' cy='12' r='10'/><path d='M12 16v-4'/><path d='M12 8h.01'/>",
  warn: "<path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>",
  check: "<polyline points='20 6 9 17 4 12'/>",
};

function StepLabel({ step, label }: StepLabelProps) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#0d9488", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 18, height: 2, background: "#0d9488", borderRadius: 2 }} />
      {step} · {label}
    </div>
  );
}

const Divider = () => <div style={{ height: 1, background: "#f3f4f6", margin: "6px 0 20px" }} />;

function Spin({ sm }: SpinProps) {
  const s = sm ? 13 : 16;
  return <span style={{ width: s, height: s, border: `${sm ? 2 : 2.5}px solid rgba(13,148,136,.2)`, borderTopColor: "#0d9488", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block", flexShrink: 0 }} />;
}

function CheckRow({ checked, onChange, label, hint, indented, disabled }: CheckRowProps) {
  return (
    <div onClick={() => !disabled && onChange(!checked)} style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: disabled ? "not-allowed" : "pointer", padding: "11px 16px", borderRadius: 11, border: `2px solid ${checked ? "#0d9488" : "#e5e7eb"}`, background: checked ? "#f0fdf4" : disabled ? "#f9fafb" : "white", transition: "all .18s", marginLeft: indented ? 8 : 0, opacity: disabled ? 0.6 : 1 }}>
      <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? "#0d9488" : "#d1d5db"}`, background: checked ? "#0d9488" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all .18s" }}>
        {checked && <Icon d={IC_SVG.check} size={10} stroke="white" />}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: checked ? "#0f766e" : "#374151", lineHeight: 1.4 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3, lineHeight: 1.4 }}>{hint}</div>}
      </div>
    </div>
  );
}

function ResultTableCard({ res, varLabel, onContinuarChat }: ResultTableCardProps) {
  const [iaOpen, setIaOpen] = useState(false);
  const [iaLoad, setIaLoad] = useState(false);
  const [iaText, setIaText] = useState("");

  const buildResumen = () => {
    let txt = `Inferencia sobre un percentil - Metodo ${res.methodName}\n`;
    txt += `Variables: ${varLabel} | N = ${res.n} | Nivel de confianza = ${res.nc}%\n\n`;
    res.groups.forEach((g) => {
      txt += `[${g.groupName}]\n`;
      g.rows.forEach((r) => {
        txt += `  ${r.pLabel}: Estimacion = ${fmt3(r.val)} | Limite Inf = ${fmt3(r.lower)} | Limite Sup = ${fmt3(r.upper)}\n`;
      });
    });
    txt += "\nINSTRUCCIONES PARA LA IA: Interpreta estos intervalos de confianza para los percentiles dados. Indica la precision de la estimacion. Destaca clinicamente lo que representa (ej. mediana, cuartiles extremos) basandote en que es una investigacion en ciencias de la salud.";
    return txt;
  };

  const interpretarIA = async () => {
    setIaOpen(true); setIaLoad(true); setIaText("");
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: "Eres un experto en bioestadistica clinica. Interpreta la siguiente tabla generada de percentiles (Epidat). Resume el hallazgo mas importante en un parrafo fluido (sin listas). Termina ofreciendo ayuda metodologica.\n\n" + buildResumen(),
          }],
        }),
      });
      if (!resp.ok) {
        setIaText("La conexion con la API de IA no esta disponible en este momento. Este es el resumen que se enviaria:\n\n" + buildResumen());
      } else {
        const data = await resp.json();
        setIaText(data.content?.[0]?.text || "Sin respuesta.");
      }
    } catch {
      setIaText("Error al conectar con el asistente IA.");
    }
    setIaLoad(false);
  };

  const colNames = res.isValues
    ? ["Orden del percentil", "Percentil", "Limite inferior", "Limite superior"]
    : ["Orden del percentil", "Posicion estimada", "Rango inferior", "Rango superior"];

  return (
    <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.04)", marginBottom: 24, animation: "slideUp .4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 4, height: 20, background: res.methodName === "Exacto" ? "#0d9488" : "#3b82f6", borderRadius: 2 }} />
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>Metodo {res.methodName.toLowerCase()}</h3>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={interpretarIA} disabled={iaLoad} className="hov-btn" style={{ padding: "8px 14px", borderRadius: 10, border: "2px solid #a855f7", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", background: "#fdf4ff", color: "#7c3aed", display: "flex", alignItems: "center", gap: 6 }}>
            {iaLoad ? <Spin sm /> : <Icon d={IC_SVG.ai} size={14} />} Interpretacion IA
          </button>
          <button onClick={() => exportarExcel(res, varLabel)} className="hov-btn" style={{ padding: "8px 14px", borderRadius: 10, border: "2px solid #0d9488", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#0d9488", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon d={IC_SVG.dl} size={14} /> Excel
          </button>
          <button onClick={() => exportarWord(res, varLabel)} className="hov-btn" style={{ padding: "8px 14px", borderRadius: 10, border: "2px solid #3b82f6", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#3b82f6", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon d={IC_SVG.word} size={14} /> Word
          </button>
        </div>
      </div>

      {iaOpen && (
        <div style={{ marginBottom: 18, background: "linear-gradient(135deg,#fdf4ff,#ede9fe)", border: "2px solid #c4b5fd", borderRadius: 12, padding: 18, animation: "slideUp .3s ease" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ background: "#7c3aed", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                <Icon d={IC_SVG.ai} size={14} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#4c1d95" }}>Asistente Biometric IA</span>
            </div>
            <button onClick={() => setIaOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", padding: 2 }}>
              <Icon d={IC_SVG.x} />
            </button>
          </div>
          <div style={{ background: "white", borderRadius: 10, border: "1px solid #ddd6fe", padding: "14px 18px", fontSize: 13, color: "#374151", lineHeight: 1.7, minHeight: 80 }}>
            {iaLoad ? <div style={{ display: "flex", gap: 10, alignItems: "center", color: "#9ca3af" }}><Spin sm /> Procesando estadisticas...</div> : <div style={{ whiteSpace: "pre-wrap" }}>{iaText}</div>}
          </div>
          {iaText && !iaLoad && (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => onContinuarChat?.(`Hablemos sobre el Metodo ${res.methodName} para percentiles de ${varLabel}.`)} className="hov-btn" style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon d={IC_SVG.chat} size={13} /> Continuar al chat
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
          <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
            <tr>
              {colNames.map((c, i) => (
                <th key={i} style={{ padding: "10px 14px", textAlign: i === 0 ? "left" : "right", fontWeight: 700, color: "#4b5563" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {res.groups.map((g, gIdx) => (
              <Fragment key={gIdx}>
                <tr style={{ background: "#f3f4f6", borderBottom: "1px solid #e5e7eb", borderTop: gIdx > 0 ? "2px solid #e5e7eb" : "none" }}>
                  <td colSpan={4} style={{ padding: "8px 14px", fontWeight: 700, color: "#111827", fontSize: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>{g.groupName}</td>
                </tr>
                {g.rows.map((r, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: "1px solid #f3f4f6", background: "white" }}>
                    <td style={{ padding: "8px 14px", color: "#111827", fontWeight: 600 }}>{r.pLabel}</td>
                    <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "'DM Mono', monospace", color: "#0f766e", fontWeight: 700 }}>{fmt3(r.val)}</td>
                    <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "'DM Mono', monospace", color: "#4b5563" }}>{fmt3(r.lower)}</td>
                    <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "'DM Mono', monospace", color: "#4b5563" }}>{fmt3(r.upper)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {!res.isValues && (
        <p style={{ fontSize: 11.5, color: "#6b7280", margin: "10px 0 0", fontStyle: "italic", lineHeight: 1.5 }}>
          * En "Datos resumidos", los valores indicados representan el <b>rango o posicion matematica</b> en el conjunto ordenado (N={res.n}), no el valor intrinseco de la variable.
        </p>
      )}
    </div>
  );
}

export default function InferenciaPercentil({
  datosExcel = null,
  loadingExcel = false,
  onBack,
  onContinuarChat = null,
}: InferenciaPercentilProps) {
  const [modo, setModo] = useState("individual");
  const [colVar, setColVar] = useState("");
  const [manN, setManN] = useState("");
  const [nivelConf, setNivel] = useState(95);

  const [defCustom, setDefCustom] = useState(true);
  const [customInput, setCustomInput] = useState("");
  const [customList, setCustomList] = useState<number[]>([1]);
  const [useCuartiles, setUseCuartiles] = useState(false);
  const [useDeciles, setUseDeciles] = useState(false);

  const [metExacto, setMetExacto] = useState(true);
  const [metAprox, setMetAprox] = useState(false);

  const [resultados, setResultados] = useState<MethodResult[]>([]);
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState("");

  const colsCuant = useMemo(() => {
    if (!datosExcel?.length) return [];
    return Object.keys(datosExcel[0]).filter((c) => colEsCuantitativa(datosExcel, c));
  }, [datosExcel]);

  const nParsed = parseInt(manN.replace(/\./g, ""), 10);
  const hasData = modo === "individual" ? colVar !== "" : (!Number.isNaN(nParsed) && nParsed > 3);
  const hasPercentiles = (defCustom && customList.length > 0) || useCuartiles || useDeciles;
  const hasMethods = metExacto || metAprox;

  const puedeCalcular = hasData && hasPercentiles && hasMethods;
  const varLabel = modo === "individual" && colVar ? `Resumir: ${colVar}` : "Datos resumidos";

  const handleAddCustom = () => {
    const p = parseInt(customInput, 10);
    if (!Number.isNaN(p) && p >= 1 && p <= 99) {
      if (!customList.includes(p)) setCustomList((prev) => [...prev, p]);
      setCustomInput("");
    }
  };

  const handleRemoveCustom = (p: number) => {
    setCustomList((prev) => prev.filter((x) => x !== p));
  };

  const handleCalc = () => {
    if (!puedeCalcular) return;
    setLoad(true); setErr(""); setResultados([]);

    setTimeout(() => {
      try {
        const res = calcPercentiles({
          modo, datosExcel, colVar, manN: nParsed, nc: nivelConf,
          customP: defCustom ? customList : [],
          useCuartiles, useDeciles, metExacto, metAprox,
        });
        setResultados(res);
      } catch (ex: unknown) {
        setErr(`Error al calcular: ${ex instanceof Error ? ex.message : "Desconocido"}`);
      }
      setLoad(false);
    }, 150);
  };

  const handleReset = () => {
    setColVar(""), setManN(""), setNivel(95);
    setDefCustom(true), setCustomList([1]), setUseCuartiles(false), setUseDeciles(false);
    setMetExacto(true), setMetAprox(false);
    setResultados([]), setErr("");
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f4f6f8", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .hov-btn:hover     { opacity:.85; transform:translateY(-1px) }
        .modo-tab:hover    { background:#f0fdf4 !important }
        input[type=number] { -moz-appearance:textfield }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance:none }
      `}</style>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <button onClick={onBack} className="hov-btn" style={{ color: "#0d9488", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", border: "none", background: "none", padding: 0, fontFamily: "inherit", fontSize: 13, fontWeight: 500 }}>
            <Icon d={IC_SVG.back} size={14} /> Una poblacion
          </button>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#111827", fontWeight: 600 }}>Inferencia sobre un percentil</span>
        </div>

        <div style={{ background: "white", borderRadius: "16px 16px 0 0", padding: "28px 32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 32, borderRadius: 4, background: "#0d9488", flexShrink: 0 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-.02em" }}>
              Inferencia sobre un percentil
            </h1>
          </div>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "6px 0 0 14px", lineHeight: 1.5, paddingBottom: 20 }}>
            Estimacion por intervalos de confianza de cuartiles, deciles y percentiles para una distribucion empirica.
          </p>
        </div>

        <div style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", borderTop: "1px solid #a7f3d0", borderBottom: "1px solid #a7f3d0", padding: "13px 22px", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#065f46" }}>
          <span style={{ background: "#0d9488", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}>
            <Icon d={IC_SVG.info} size={13} />
          </span>
          <span style={{ lineHeight: 1.65 }}>
            <b>Para que sirve?</b> Calcula el intervalo en el que recae con cierta confianza un determinado percentil de la poblacion. Muy util para estandarizar curvas de crecimiento (peso/talla) o encontrar cortes de diagnostico medico.
          </span>
        </div>

        <div style={{ background: "white", borderRadius: "0 0 16px 16px", borderTop: "1px solid #e5e7eb", padding: "26px 28px 24px", boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 0, border: "1.5px solid #e5e7eb", borderRadius: 11, overflow: "hidden", marginBottom: 24, width: "fit-content" }}>
            {[["resumido", "✏️", "Datos resumidos (N)"], ["individual", "📊", "Datos individuales (Matriz)"]].map(([m, emoji, label]) => (
              <button key={m} className="modo-tab" onClick={() => { setModo(m); setResultados([]); }} style={{ padding: "9px 20px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: modo === m ? "#f0fdf4" : "white", color: modo === m ? "#0f766e" : "#6b7280", borderRight: m === "resumido" ? "1.5px solid #e5e7eb" : "none", fontFamily: "inherit", transition: "all .15s", display: "flex", alignItems: "center", gap: 6 }}>
                {emoji} {label}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <StepLabel step="Paso 1" label="Origen de los datos" />

            {modo === "individual" ? (
              <div>
                {!datosExcel ? (
                  <div style={{ padding: "13px 16px", background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 9 }}>
                    <Icon d={IC_SVG.warn} size={14} />
                    {loadingExcel ? "Cargando datos del Excel..." : "Sube tu base de datos en Preprocesamiento o usa Datos Resumidos."}
                  </div>
                ) : colsCuant.length === 0 ? (
                  <div style={{ padding: "13px 16px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, fontSize: 13, color: "#991b1b", display: "flex", alignItems: "center", gap: 9 }}>
                    <Icon d={IC_SVG.warn} size={14} />
                    No hay variables numericas suficientes en tu Excel.
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Variable cuantitativa</label>
                    <select value={colVar} onChange={(e: ChangeEvent<HTMLSelectElement>) => setColVar(e.target.value)} style={{ width: "50%", padding: "11px 36px 11px 14px", border: `2px solid ${colVar ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: colVar ? "#111827" : "#9ca3af", background: colVar ? "#f0fdf4" : "white", outline: "none", cursor: "pointer" }}>
                      <option value="">Selecciona la variable para resumir...</option>
                      {colsCuant.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Tamano de la muestra (N)</label>
                <input type="text" value={manN} onChange={(e: ChangeEvent<HTMLInputElement>) => setManN(e.target.value)} placeholder="Ej. 1808" style={{ width: "50%", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#111827", outline: "none", transition: "border .2s" }} onFocus={(e) => (e.target.style.borderColor = "#0d9488")} onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
              </div>
            )}
          </div>

          <Divider />

          <StepLabel step="Paso 2" label="Nivel de confianza" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            {[90, 95, 99].map((nc) => (
              <button key={nc} onClick={() => setNivel(nc)} className="hov-btn" style={{ padding: "9px 20px", borderRadius: 10, border: `2px solid ${nivelConf === nc ? "#0d9488" : "#e5e7eb"}`, background: nivelConf === nc ? "#f0fdf4" : "white", color: nivelConf === nc ? "#065f46" : "#6b7280", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>{nc}%</button>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6, border: "2px solid #e5e7eb", borderRadius: 10, padding: "0 12px", background: "white" }}>
              <input type="number" min={80} max={99.9} step={0.1} value={nivelConf} onChange={(e: ChangeEvent<HTMLInputElement>) => setNivel(Math.min(99.9, Math.max(80, +e.target.value)))} style={{ width: 52, border: "none", fontSize: 14, fontWeight: 700, color: "#111827", textAlign: "center", fontFamily: "inherit", background: "transparent", outline: "none" }} />
              <span style={{ fontSize: 13, color: "#6b7280" }}>%</span>
            </div>
          </div>

          <Divider />

          <StepLabel step="Paso 3" label="Percentiles a calcular" />
          <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "16px", background: "#fafbfc", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <CheckRow checked={defCustom} onChange={setDefCustom} label="Definir percentiles manuales" hint="Por ejemplo, P1 o P99" />

              <div style={{ opacity: defCustom ? 1 : 0.4, pointerEvents: defCustom ? "auto" : "none", transition: "opacity .2s", marginLeft: 34 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Orden:</span>
                  <input type="text" value={customInput} onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddCustom()} placeholder="1..99" style={{ width: 60, padding: "6px 10px", border: "1.5px solid #d1d5db", borderRadius: 6, fontSize: 13, textAlign: "center", outline: "none" }} />
                  <button onClick={handleAddCustom} className="hov-btn" style={{ padding: "7px 12px", background: "white", border: "1.5px solid #d1d5db", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>Agregar</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, background: "white", padding: "10px", borderRadius: 8, border: "1.5px solid #e5e7eb", minHeight: 46 }}>
                  {customList.length === 0 && <span style={{ fontSize: 12, color: "#9ca3af", margin: "auto" }}>Lista vacia</span>}
                  {customList.map((p) => (
                    <div key={p} style={{ background: "#f0fdfa", border: "1px solid #14b8a6", color: "#0f766e", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      P{p} <button onClick={() => handleRemoveCustom(p)} style={{ background: "none", border: "none", color: "#0f766e", cursor: "pointer", padding: 0, marginTop: 1 }}><Icon d={IC_SVG.x} size={10} strokeWidth={3} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <CheckRow checked={useCuartiles} onChange={setUseCuartiles} label="Cuartiles" hint="Calcula automaticamente P25, P50 y P75" />
              <CheckRow checked={useDeciles} onChange={setUseDeciles} label="Deciles" hint="Calcula de P10 en P10 hasta P90" />
            </div>
          </div>

          <Divider />

          <StepLabel step="Paso 4" label="Metodo de aproximacion" />
          <div style={{ display: "flex", gap: 12 }}>
            <CheckRow checked={metExacto} onChange={setMetExacto} label="Exacto (Binomial)" hint="Usado comunmente en investigacion medica" />
            <CheckRow checked={metAprox} onChange={setMetAprox} label="Aproximacion normal" hint="Para muestras muy masivas" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCalc} disabled={!puedeCalcular || load} className="hov-btn" style={{ flex: 1, padding: "13px 20px", borderRadius: 12, border: "none", cursor: puedeCalcular && !load ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: puedeCalcular ? "linear-gradient(135deg,#14b8a6,#0d9488)" : "#e5e7eb", color: puedeCalcular ? "white" : "#9ca3af", boxShadow: puedeCalcular ? "0 4px 14px rgba(13,148,136,.28)" : "none", transition: "all .25s" }}>
            {load ? <><Spin /> Calculando...</> : <><Icon d={IC_SVG.calc} size={16} /> Calcular percentiles</>}
          </button>
          <button onClick={handleReset} className="hov-btn" style={{ padding: "13px 18px", borderRadius: 12, border: "2px solid #e5e7eb", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: "white", color: "#6b7280", display: "flex", alignItems: "center", gap: 6, transition: "all .2s" }}>
            <Icon d={IC_SVG.reset} /> Limpiar
          </button>
        </div>

        {err && (
          <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "11px 16px", marginTop: 12, fontSize: 13, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon d={IC_SVG.warn} size={14} /> {err}
          </div>
        )}

        {resultados.length > 0 && (
          <div style={{ marginTop: 30, animation: "slideUp .4s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 4, height: 24, borderRadius: 4, background: "#111827", flexShrink: 0 }} />
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Resultados del analisis</h2>
            </div>

            {resultados.map((res, idx) => (
              <ResultTableCard
                key={idx}
                res={res}
                varLabel={varLabel}
                onContinuarChat={onContinuarChat}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
