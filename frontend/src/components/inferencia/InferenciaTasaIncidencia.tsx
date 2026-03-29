import { useState, useMemo, type ReactNode, type ChangeEvent } from "react";

type DataRow = Record<string, unknown>;

interface TasaResultRow {
  label: string;
  tasa: number;
  lower: number;
  upper: number;
}

interface HipotesisInfo {
  statName?: string;
  statVal?: number;
  df?: number;
  p: number;
}

interface MethodResult {
  methodName: "Exacto" | "Aproximado";
  tasaRow: TasaResultRow | null;
  hipotesis: HipotesisInfo | null;
  nCasos: number;
  tiempo: number;
  m: number;
  lambda0: number;
  nc: number;
}

interface CalcArgs {
  casos: number;
  tiempo: number;
  m: number;
  nc: number;
  calcIC: boolean;
  calcBil: boolean;
  lambda0: number;
  metExacto: boolean;
  metAprox: boolean;
}

interface InferenciaTasaIncidenciaProps {
  datosExcel?: DataRow[] | null;
  loadingExcel?: boolean;
  onBack: () => void;
  onContinuarChat?: ((texto: string) => void) | null;
}

interface IconProps {
  d: string;
  size?: number;
  stroke?: string;
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

function gammainc(x: number, a: number): number {
  if (x <= 0 || a <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a;
    let term = 1 / a;
    for (let i = 1; i < 100; i++) {
      term *= x / (a + i);
      sum += term;
      if (term < sum * 1e-15) break;
    }
    return Math.exp(-x + a * Math.log(x) - lgamma(a)) * sum;
  }

  let c = 1 / 1e-30;
  let d = 1 / (x - a + 1);
  let h = d;
  for (let i = 1; i < 100; i++) {
    const an = -i * (i - a);
    d = x - a + 1 + i * 2 + an * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = x - a + 1 + i * 2 + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}

function poisscdf(k: number, lambda: number): number {
  if (k < 0) return 0;
  if (lambda === 0) return 1;
  return 1 - gammainc(lambda, k + 1);
}

function erf(x: number): number {
  const sign = Math.sign(x) || 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-ax * ax);
  return sign * y;
}

function normcdf(z: number): number {
  if (!isFinite(z)) return z > 0 ? 1 : 0;
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function norminv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (Math.abs(p - 0.5) < 1e-15) return 0;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pL = 0.02425, pH = 1 - pL;
  if (p < pL) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= pH) {
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

function chi2cdf(x: number, df: number): number {
  return gammainc(x / 2, df / 2);
}

function chi2inv(p: number, df: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;
  let low = 0;
  let high = df * 10;
  while (chi2cdf(high, df) < p) {
    low = high;
    high *= 2;
  }
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    if (chi2cdf(mid, df) < p) low = mid;
    else high = mid;
    if (high - low < 1e-7) break;
  }
  return (low + high) / 2;
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
  return validCount >= 1;
}

function calcSum(datos: DataRow[] | null | undefined, col: string): number {
  if (!datos?.length || !col) return 0;
  let sum = 0;
  for (const row of datos) {
    const p = parseNumericContinuous(row[col]);
    if (p !== "missing" && p !== "invalid") sum += p;
  }
  return sum;
}

/* --------------------------------------------------------------------------
   LOGICA PRINCIPAL: TASA DE INCIDENCIA
   -------------------------------------------------------------------------- */

function calcTasas({ casos, tiempo, m, nc, calcIC, calcBil, lambda0, metExacto, metAprox }: CalcArgs): MethodResult[] {
  const alpha = (100 - nc) / 100;
  const IR = (casos / tiempo) * m;
  const expectedCases = (lambda0 / m) * tiempo;

  const results: MethodResult[] = [];

  if (metExacto) {
    let exactIC: TasaResultRow | null = null;
    if (calcIC) {
      const lowerCases = casos === 0 ? 0 : 0.5 * chi2inv(alpha / 2, 2 * casos);
      const upperCases = 0.5 * chi2inv(1 - alpha / 2, 2 * (casos + 1));

      exactIC = {
        label: "",
        tasa: IR,
        lower: (lowerCases / tiempo) * m,
        upper: (upperCases / tiempo) * m,
      };
    }

    let exactHip: HipotesisInfo | null = null;
    if (lambda0 > 0 && calcBil) {
      exactHip = {
        p: Math.min(1.0, 2 * Math.min(poisscdf(casos, expectedCases), 1 - poisscdf(casos - 1, expectedCases))),
      };
    }

    results.push({
      methodName: "Exacto",
      tasaRow: exactIC,
      hipotesis: exactHip,
      nCasos: casos, tiempo, m, lambda0, nc,
    });
  }

  if (metAprox) {
    let aproxIC: TasaResultRow | null = null;
    if (calcIC) {
      const SE = (Math.sqrt(casos) / tiempo) * m;
      const Z = norminv(1 - alpha / 2);
      aproxIC = {
        label: "",
        tasa: IR,
        lower: Math.max(0, IR - Z * SE),
        upper: IR + Z * SE,
      };
    }

    let aproxHip: HipotesisInfo | null = null;
    if (lambda0 > 0 && calcBil) {
      const chi2 = Math.pow(casos - expectedCases, 2) / expectedCases;
      aproxHip = {
        statName: "Estadistico X2",
        statVal: chi2,
        df: 1,
        p: 1 - chi2cdf(chi2, 1),
      };
    }

    results.push({
      methodName: "Aproximado",
      tasaRow: aproxIC,
      hipotesis: aproxHip,
      nCasos: casos, tiempo, m, lambda0, nc,
    });
  }

  return results;
}

const fmt3 = (v: number) => (isFinite(v) ? v.toFixed(3) : "-");
const fmtP = (p: number) => (!isFinite(p) ? "-" : p < 0.001 ? "0,000" : p.toFixed(3).replace(".", ","));
const fmtN = (n: number) => (Number.isInteger(n) ? n.toLocaleString("es-ES") : String(n));
const fmtDec = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmtStat = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/* --------------------------------------------------------------------------
   REPORTES
   -------------------------------------------------------------------------- */

function exportarExcel(res: MethodResult): void {
  const cssTh = "background-color:#d9d9d9; font-weight:bold; text-align:center; border:1px solid #000; padding:4px;";
  const cssTdNum = "text-align:right; border:1px solid #000; padding:4px;";
  const cssTd = "text-align:left; border:1px solid #000; padding:4px;";

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"></head><body>`;

  html += `<table style="border-collapse: collapse; font-family: sans-serif;">`;
  html += `<tr><th colspan="3" style="background-color:#0F766E; color:white; font-size:14px; padding:8px; border:1px solid #000;">Inferencia sobre una tasa de incidencia - Metodo ${res.methodName.toLowerCase()}</th></tr>`;
  html += `<tr><td colspan="3" style="font-weight:bold; ${cssTd}">Filtro: No</td></tr>`;
  html += `<tr><td colspan="3" style="font-weight:bold; ${cssTd}">Numero de casos: ${fmtN(res.nCasos)}</td></tr>`;
  html += `<tr><td colspan="3" style="font-weight:bold; ${cssTd}">Numero de personas-ano: ${fmtDec(res.tiempo)}</td></tr>`;
  html += `<tr><td colspan="3" style="font-weight:bold; ${cssTd}">Nivel de confianza: ${res.nc},0%</td></tr>`;
  html += `<tr><td colspan="3" style="font-weight:bold; ${cssTd}">Tasa por: ${fmtN(res.m)}</td></tr>`;
  if (res.hipotesis) html += `<tr><td colspan="3" style="font-weight:bold; ${cssTd}">Valor a contrastar: ${fmt3(res.lambda0).replace(".", ",")}</td></tr>`;
  html += `<tr><td colspan="3"></td></tr>`;
  html += `<tr><td colspan="3" style="font-weight:bold; text-decoration: underline;">Resultados: Metodo ${res.methodName.toLowerCase()}</td></tr>`;

  if (res.tasaRow) {
    html += `<tr><td colspan="3">Intervalo de confianza (${res.nc},0%)</td></tr>`;
    html += `<tr><th style="${cssTh}">Tasa</th><th style="${cssTh}">Limite inferior</th><th style="${cssTh}">Limite superior</th></tr>`;
    html += `<tr><td style="${cssTdNum}">${fmt3(res.tasaRow.tasa).replace(".", ",")}</td><td style="${cssTdNum}">${fmt3(res.tasaRow.lower).replace(".", ",")}</td><td style="${cssTdNum}">${fmt3(res.tasaRow.upper).replace(".", ",")}</td></tr>`;
    html += `<tr><td colspan="3"></td></tr>`;
  }

  if (res.hipotesis) {
    html += `<tr><td colspan="3">Prueba para una tasa de incidencia</td></tr>`;
    if (res.methodName === "Aproximado") {
      html += `<tr><th style="${cssTh}">Estadistico X2</th><th style="${cssTh}">gl</th><th style="${cssTh}">Valor p</th></tr>`;
      html += `<tr><td style="${cssTdNum}">${fmtStat(res.hipotesis.statVal || 0)}</td><td style="${cssTdNum}">${res.hipotesis.df}</td><td style="${cssTdNum}">${fmtP(res.hipotesis.p)}</td></tr>`;
      html += `<tr><td colspan="3" style="font-size:12px;">gl: grados de libertad</td></tr>`;
    } else {
      html += `<tr><th style="${cssTh}">Valor p</th><th></th><th></th></tr>`;
      html += `<tr><td style="${cssTdNum}">${fmtP(res.hipotesis.p)}</td><td></td><td></td></tr>`;
    }
  }

  html += `</table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tasa_incidencia_${res.methodName}_${Date.now()}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportarWord(res: MethodResult): void {
  const css = {
    th: "background:#d9d9d9;border:1px solid #000;padding:7px 12px;font-weight:bold;text-align:center;font-family:'Calibri',sans-serif;font-size:11pt",
    td: "border:1px solid #000;padding:6px 12px;text-align:right;font-family:'Calibri',sans-serif;font-size:11pt",
    tbl: "border-collapse:collapse;width:100%;max-width:500px;margin-bottom:14pt",
    h2: "font-family:'Calibri',sans-serif;font-size:14pt;font-weight:bold;margin-top:12pt;margin-bottom:4pt",
    h3: "font-family:'Calibri',sans-serif;font-size:12pt;font-weight:bold;margin-top:10pt;margin-bottom:4pt",
    p: "font-family:'Calibri',sans-serif;font-size:11pt;color:#000;margin:3pt 0",
  };

  let html = `<h2 style="${css.h2}">Inferencia sobre una tasa de incidencia</h2>`;
  html += `<p style="${css.p}">Numero de casos: ${fmtN(res.nCasos)}</p>`;
  html += `<p style="${css.p}">Numero de personas-ano: ${fmtDec(res.tiempo)}</p>`;
  html += `<p style="${css.p}">Nivel de confianza: ${res.nc},0%</p>`;
  html += `<p style="${css.p}">Tasa por: ${fmtN(res.m)}</p>`;
  if (res.hipotesis) html += `<p style="${css.p}">Valor a contrastar: ${fmt3(res.lambda0).replace(".", ",")}</p>`;

  html += `<h3 style="${css.h3}">Resultados:</h3>`;
  html += `<p style="${css.p}; text-decoration:underline;">Metodo ${res.methodName.toLowerCase()}</p>`;

  if (res.tasaRow) {
    html += `<p style="${css.p}">Intervalo de confianza (${res.nc},0%)</p>`;
    html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Tasa</th><th style="${css.th}">Limite inferior</th><th style="${css.th}">Limite superior</th></tr></thead><tbody>`;
    html += `<tr><td style="${css.td}">${fmt3(res.tasaRow.tasa).replace(".", ",")}</td><td style="${css.td}">${fmt3(res.tasaRow.lower).replace(".", ",")}</td><td style="${css.td}">${fmt3(res.tasaRow.upper).replace(".", ",")}</td></tr>`;
    html += `</tbody></table>`;
  }

  if (res.hipotesis) {
    html += `<p style="${css.p}">Prueba para una tasa de incidencia</p>`;

    if (res.methodName === "Aproximado") {
      html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Estadistico X2</th><th style="${css.th}">gl</th><th style="${css.th}">Valor p</th></tr></thead><tbody>`;
      html += `<tr><td style="${css.td}">${fmtStat(res.hipotesis.statVal || 0)}</td><td style="${css.td}">${res.hipotesis.df}</td><td style="${css.td}">${fmtP(res.hipotesis.p)}</td></tr>`;
      html += `</tbody></table>`;
      html += `<p style="${css.p}; font-size:10pt">gl: grados de libertad</p>`;
    } else {
      html += `<table style="${css.tbl}; width:150px;"><thead><tr><th style="${css.th}">Valor p</th></tr></thead><tbody>`;
      html += `<tr><td style="${css.td}">${fmtP(res.hipotesis.p)}</td></tr>`;
      html += `</tbody></table>`;
    }
  }

  const blob = new Blob(
    [`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'/><style>body{margin:2cm;}</style></head><body>${html}</body></html>`],
    { type: "application/msword" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `tasa_incidencia_${res.methodName}_${Date.now()}.doc`;
  a.click(); URL.revokeObjectURL(url);
}

/* --------------------------------------------------------------------------
   UI
   -------------------------------------------------------------------------- */

const Icon = ({ d, size = 15, stroke = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
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

function ResultTableCard({ res, onContinuarChat }: ResultTableCardProps) {
  const [iaOpen, setIaOpen] = useState(false);
  const [iaLoad, setIaLoad] = useState(false);
  const [iaText, setIaText] = useState("");

  const buildResumen = () => {
    let txt = `Inferencia sobre una Tasa de Incidencia - Metodo ${res.methodName}\n`;
    txt += `N de casos = ${res.nCasos} | Personas-ano = ${fmtDec(res.tiempo)} | Tasa por = ${res.m}\n`;
    if (res.tasaRow) txt += `Tasa Estimada = ${fmt3(res.tasaRow.tasa)} | IC(${res.nc}%): [${fmt3(res.tasaRow.lower)} , ${fmt3(res.tasaRow.upper)}]\n`;
    if (res.hipotesis) {
      txt += `Prueba de hipotesis (H0: tasa = ${res.lambda0}):\n`;
      txt += `  - Bilateral: p-valor = ${fmtP(res.hipotesis.p)}\n`;
    }
    txt += "\nINSTRUCCIONES PARA LA IA: Interpreta esta tasa de incidencia y su intervalo de confianza en contexto epidemiologico (fuerza de morbilidad o velocidad de aparicion de la enfermedad). Interpreta el p-valor frente al valor a contrastar asumiendo un riesgo alfa de 0.05. Se conciso y medico.";
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
            content: "Eres un epidemiologo experto. Interpreta la siguiente tabla generada de una tasa de incidencia (Epidat). Resume el hallazgo en un parrafo fluido (sin listas). Termina ofreciendo ayuda metodologica.\n\n" + buildResumen(),
          }],
        }),
      });
      if (!resp.ok) setIaText("La conexion con la API de IA no esta disponible en este momento. Este es el resumen que se enviaria:\n\n" + buildResumen());
      else {
        const data = await resp.json();
        setIaText(data.content?.[0]?.text || "Sin respuesta.");
      }
    } catch {
      setIaText("Error al conectar con el asistente IA.");
    }
    setIaLoad(false);
  };

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
          <button onClick={() => exportarExcel(res)} className="hov-btn" style={{ padding: "8px 14px", borderRadius: 10, border: "2px solid #0d9488", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#0d9488", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon d={IC_SVG.dl} size={14} /> Excel
          </button>
          <button onClick={() => exportarWord(res)} className="hov-btn" style={{ padding: "8px 14px", borderRadius: 10, border: "2px solid #3b82f6", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#3b82f6", display: "flex", alignItems: "center", gap: 6 }}>
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
              <span style={{ fontSize: 14, fontWeight: 700, color: "#4c1d95" }}>Asistente Epidemiologico IA</span>
            </div>
            <button onClick={() => setIaOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", padding: 2 }}>
              <Icon d={IC_SVG.x} />
            </button>
          </div>
          <div style={{ background: "white", borderRadius: 10, border: "1px solid #ddd6fe", padding: "14px 18px", fontSize: 13, color: "#374151", lineHeight: 1.7, minHeight: 80 }}>
            {iaLoad ? <div style={{ display: "flex", gap: 10, alignItems: "center", color: "#9ca3af" }}><Spin sm /> Analizando tasas y densidades...</div> : <div style={{ whiteSpace: "pre-wrap" }}>{iaText}</div>}
          </div>
          {iaText && !iaLoad && (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => onContinuarChat?.(`Hablemos sobre la Tasa de Incidencia (Metodo ${res.methodName}) hallada.`)} className="hov-btn" style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon d={IC_SVG.chat} size={13} /> Continuar al chat
              </button>
            </div>
          )}
        </div>
      )}

      {res.tasaRow && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Intervalo de confianza ({res.nc},0%)</p>
          <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
              <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <tr>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#4b5563" }}>Tasa</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#4b5563" }}>Limite inferior</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#4b5563" }}>Limite superior</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "white" }}>
                  <td style={{ padding: "8px 14px", fontFamily: "'DM Mono', monospace", color: "#111827", fontWeight: 700 }}>{fmt3(res.tasaRow.tasa)}</td>
                  <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "'DM Mono', monospace", color: "#4b5563" }}>{fmt3(res.tasaRow.lower)}</td>
                  <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "'DM Mono', monospace", color: "#4b5563" }}>{fmt3(res.tasaRow.upper)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {res.hipotesis && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Prueba para una tasa de incidencia</p>
          <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 10 }}>
            <table style={{ width: res.methodName === "Exacto" ? "auto" : "100%", minWidth: res.methodName === "Exacto" ? 180 : "auto", borderCollapse: "collapse", fontSize: 13, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
              <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <tr>
                  {res.methodName === "Aproximado" && <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#4b5563" }}>Estadistico X2</th>}
                  {res.methodName === "Aproximado" && <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#4b5563" }}>gl</th>}
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#4b5563" }}>Valor p</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "white" }}>
                  {res.methodName === "Aproximado" && <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "'DM Mono', monospace", color: "#4b5563" }}>{fmtStat(res.hipotesis.statVal || 0)}</td>}
                  {res.methodName === "Aproximado" && <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "'DM Mono', monospace", color: "#4b5563" }}>{res.hipotesis.df !== undefined ? res.hipotesis.df : ""}</td>}
                  <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "'DM Mono', monospace", color: "#0f766e", fontWeight: 700 }}>{fmtP(res.hipotesis.p)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {res.methodName === "Aproximado" && <p style={{ fontSize: 11, color: "#6b7280", margin: "6px 0 0" }}>gl: grados de libertad</p>}
        </div>
      )}
    </div>
  );
}

export default function InferenciaTasaIncidencia({
  datosExcel = null,
  loadingExcel = false,
  onBack,
  onContinuarChat = null,
}: InferenciaTasaIncidenciaProps) {
  const [modo, setModo] = useState("resumido");

  const [colCasos, setColCasos] = useState("");
  const [colTiempo, setColTiempo] = useState("");

  const [manCasos, setManCasos] = useState("0");
  const [manTiempo, setManTiempo] = useState("0,000");

  const [nivelConf, setNivel] = useState(95);
  const [multiplicador, setMultiplicador] = useState(1000);

  const [calcIC, setCalcIC] = useState(true);
  const [calcBil, setCalcBil] = useState(true);
  const [lambda0Input, setLambda0Input] = useState("0,000");

  const [metExacto, setMetExacto] = useState(true);
  const [metAprox, setMetAprox] = useState(false);

  const [resultados, setResultados] = useState<MethodResult[]>([]);
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState("");

  const colsCuant = useMemo(() => {
    if (!datosExcel?.length) return [];
    return Object.keys(datosExcel[0]).filter((c) => colEsCuantitativa(datosExcel, c));
  }, [datosExcel]);

  const efectivos = useMemo(() => {
    let casos = 0;
    let tiempo = 0;

    if (modo === "individual") {
      if (!colCasos || !colTiempo) return null;
      casos = calcSum(datosExcel, colCasos);
      tiempo = calcSum(datosExcel, colTiempo);
    } else {
      casos = parseInt(manCasos.replace(/\./g, ""), 10);
      tiempo = parseFloat(manTiempo.replace(/\./g, "").replace(",", "."));
    }

    const lambda0 = parseFloat(lambda0Input.replace(",", ".")) || 0;

    if (isFinite(casos) && isFinite(tiempo) && casos >= 0 && tiempo > 0) {
      return { casos, tiempo, lambda0 };
    }
    return null;
  }, [modo, datosExcel, colCasos, colTiempo, manCasos, manTiempo, lambda0Input]);

  const tieneMetodos = metExacto || metAprox;
  const puedeCalcular = !!efectivos && (calcIC || calcBil) && tieneMetodos;

  const handleCalc = () => {
    if (!puedeCalcular) return;
    setLoad(true); setErr(""); setResultados([]);

    setTimeout(() => {
      try {
        const { casos, tiempo, lambda0 } = efectivos;
        const res = calcTasas({
          casos, tiempo, m: multiplicador, nc: nivelConf,
          calcIC, calcBil, lambda0,
          metExacto, metAprox,
        });
        setResultados(res);
      } catch (ex: unknown) {
        setErr(`Error al calcular: ${ex instanceof Error ? ex.message : "Desconocido"}`);
      }
      setLoad(false);
    }, 150);
  };

  const handleReset = () => {
    setColCasos(""); setColTiempo("");
    setManCasos("0"); setManTiempo("0,000");
    setNivel(95); setMultiplicador(1000);
    setCalcIC(true); setCalcBil(true);
    setLambda0Input("0,000");
    setMetExacto(true); setMetAprox(false);
    setResultados([]); setErr("");
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
          <span style={{ color: "#111827", fontWeight: 600 }}>Inferencia sobre una tasa de incidencia</span>
        </div>

        <div style={{ background: "white", borderRadius: "16px 16px 0 0", padding: "28px 32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 32, borderRadius: 4, background: "#0d9488", flexShrink: 0 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-.02em" }}>
              Inferencia sobre una tasa de incidencia
            </h1>
          </div>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "6px 0 0 14px", lineHeight: 1.5, paddingBottom: 20 }}>
            Estimacion y prueba de hipotesis para la velocidad con la que ocurren eventos (casos nuevos) en una poblacion a riesgo.
          </p>
        </div>

        <div style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", borderTop: "1px solid #a7f3d0", borderBottom: "1px solid #a7f3d0", padding: "13px 22px", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#065f46" }}>
          <span style={{ background: "#0d9488", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}>
            <Icon d={IC_SVG.info} size={13} />
          </span>
          <span style={{ lineHeight: 1.65 }}>
            <b>Para que sirve?</b> Calcula la verdadera magnitud del riesgo (Densidad de Incidencia). Integra la cantidad de casos ocurridos relacionandolos con el <i>tiempo de seguimiento exacto (personas-ano)</i> que aporto cada participante libre de enfermedad.
          </span>
        </div>

        <div style={{ background: "white", borderRadius: "0 0 16px 16px", borderTop: "1px solid #e5e7eb", padding: "26px 28px 24px", boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 0, border: "1.5px solid #e5e7eb", borderRadius: 11, overflow: "hidden", marginBottom: 24, width: "fit-content" }}>
            {[["resumido", "✏️", "Datos resumidos"], ["individual", "📊", "Datos individuales (Excel)"]].map(([m, emoji, label]) => (
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
                ) : colsCuant.length < 2 ? (
                  <div style={{ padding: "13px 16px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, fontSize: 13, color: "#991b1b", display: "flex", alignItems: "center", gap: 9 }}>
                    <Icon d={IC_SVG.warn} size={14} />
                    No hay variables numericas suficientes en tu Excel. Se necesitan dos (Casos y Tiempos).
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Variable de eventos (Casos)</label>
                      <select value={colCasos} onChange={(e: ChangeEvent<HTMLSelectElement>) => setColCasos(e.target.value)} style={{ width: "100%", padding: "11px 14px", border: `2px solid ${colCasos ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: colCasos ? "#111827" : "#9ca3af", background: colCasos ? "#f0fdf4" : "white", outline: "none", cursor: "pointer" }}>
                        <option value="">Selecciona la columna de casos...</option>
                        {colsCuant.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>Valores numericos que se sumaran para hallar N total.</p>
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Variable tiempo de seguimiento</label>
                      <select value={colTiempo} onChange={(e: ChangeEvent<HTMLSelectElement>) => setColTiempo(e.target.value)} style={{ width: "100%", padding: "11px 14px", border: `2px solid ${colTiempo ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: colTiempo ? "#111827" : "#9ca3af", background: colTiempo ? "#f0fdf4" : "white", outline: "none", cursor: "pointer" }}>
                        <option value="">Selecciona la columna de tiempos...</option>
                        {colsCuant.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>Tiempo en riesgo aportado (ej. anos, meses).</p>
                    </div>
                  </div>
                )}
                {efectivos && colCasos && colTiempo && (
                  <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0fdf4", border: "1.5px solid #a7f3d0", borderRadius: 10, display: "flex", gap: 24 }}>
                    <span style={{ fontSize: 13, color: "#065f46" }}><b>Casos totales (O):</b> <span style={{ fontFamily: "'DM Mono', monospace" }}>{fmtN(efectivos.casos)}</span></span>
                    <span style={{ fontSize: 13, color: "#065f46" }}><b>Suma tiempos (T):</b> <span style={{ fontFamily: "'DM Mono', monospace" }}>{fmtDec(efectivos.tiempo)}</span></span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Numero de casos (eventos observados)</label>
                  <input type="text" value={manCasos} onChange={(e: ChangeEvent<HTMLInputElement>) => setManCasos(e.target.value)} placeholder="0" style={{ width: "100%", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#111827", outline: "none", transition: "border .2s", textAlign: "right" }} onFocus={(e) => (e.target.style.borderColor = "#0d9488")} onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Numero de personas-ano (suma de tiempos)</label>
                  <input type="text" value={manTiempo} onChange={(e: ChangeEvent<HTMLInputElement>) => setManTiempo(e.target.value)} placeholder="0,000" style={{ width: "100%", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#111827", outline: "none", transition: "border .2s", textAlign: "right" }} onFocus={(e) => (e.target.style.borderColor = "#0d9488")} onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
                </div>
              </div>
            )}
          </div>

          <Divider />

          <StepLabel step="Paso 2" label="Parametros de evaluacion" />
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 6 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Nivel de confianza</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[90, 95, 99].map((nc) => (
                  <button key={nc} onClick={() => setNivel(nc)} className="hov-btn" style={{ padding: "7px 14px", borderRadius: 8, border: `2px solid ${nivelConf === nc ? "#0d9488" : "#e5e7eb"}`, background: nivelConf === nc ? "#f0fdf4" : "white", color: nivelConf === nc ? "#065f46" : "#6b7280", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{nc}%</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Tasas por (multiplicador)</label>
              <select value={multiplicador} onChange={(e: ChangeEvent<HTMLSelectElement>) => setMultiplicador(Number(e.target.value))} style={{ padding: "8px 12px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", fontWeight: 600, color: "#111827", outline: "none", cursor: "pointer" }}>
                {[100, 1000, 10000, 100000, 1000000].map((m) => <option key={m} value={m}>{m.toLocaleString("es-ES")}</option>)}
              </select>
            </div>
          </div>

          <Divider />

          <StepLabel step="Paso 3" label="Calcular" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <CheckRow checked={calcIC} onChange={setCalcIC} label="Intervalo de confianza" />
            <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "16px", background: "#fafbfc" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>Contraste de hipotesis</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <CheckRow checked={calcBil} onChange={setCalcBil} label={<>Bilateral &nbsp;<span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 12 }}>( H0: lambda = lambda0 vs. H1: lambda != lambda0 )</span></>} indented />
              </div>

              {calcBil && (
                <div style={{ marginTop: 14, marginLeft: 34, display: "flex", alignItems: "center", gap: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Valor a contrastar (lambda0):</label>
                  <input type="text" value={lambda0Input} onChange={(e: ChangeEvent<HTMLInputElement>) => setLambda0Input(e.target.value)} style={{ padding: "8px 12px", border: "2px solid #d1d5db", borderRadius: 8, fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#111827", width: 100, textAlign: "right", outline: "none" }} />
                </div>
              )}
            </div>
          </div>

          <Divider />

          <StepLabel step="Paso 4" label="Metodo de evaluacion" />
          <div style={{ display: "flex", gap: 12 }}>
            <CheckRow checked={metExacto} onChange={setMetExacto} label="Exacto" hint="Sugerido (Poisson)" />
            <CheckRow checked={metAprox} onChange={setMetAprox} label="Aproximacion normal" hint="Para muestras elevadas (Test de Wald)" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCalc} disabled={!puedeCalcular || load} className="hov-btn" style={{ flex: 1, padding: "13px 20px", borderRadius: 12, border: "none", cursor: puedeCalcular && !load ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: puedeCalcular ? "linear-gradient(135deg,#14b8a6,#0d9488)" : "#e5e7eb", color: puedeCalcular ? "white" : "#9ca3af", boxShadow: puedeCalcular ? "0 4px 14px rgba(13,148,136,.28)" : "none", transition: "all .25s" }}>
            {load ? <><Spin /> Calculando...</> : <><Icon d={IC_SVG.calc} size={16} /> Calcular tasa de incidencia</>}
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

            <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "16px 24px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
                <span><b style={{ color: "#4b5563" }}>Filtro:</b> No</span>
                <span><b style={{ color: "#4b5563" }}>Casos:</b> {fmtN(efectivos!.casos)}</span>
                <span><b style={{ color: "#4b5563" }}>Personas-ano:</b> {fmtDec(efectivos!.tiempo)}</span>
                <span><b style={{ color: "#4b5563" }}>Tasa por:</b> {multiplicador.toLocaleString("es-ES")}</span>
                {calcBil && <span><b style={{ color: "#4b5563" }}>Valor a contrastar:</b> {fmt3(efectivos!.lambda0)}</span>}
              </div>
            </div>

            {resultados.map((res, idx) => (
              <ResultTableCard
                key={idx}
                res={res}
                onContinuarChat={onContinuarChat}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
