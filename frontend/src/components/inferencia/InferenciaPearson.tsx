import { useState, useMemo, type ReactNode, type ChangeEvent } from "react";

type DataRow = Record<string, unknown>;

interface IcPearson {
  lower: number;
  upper: number;
  r: number;
}

interface HipotesisPearson {
  tipo: string;
  statName: "Z" | "t";
  statVal: number;
  df?: number;
  p: number;
}

interface ResultadoPearson {
  r: number;
  n: number;
  rho0: number;
  isZero: boolean;
  ic: IcPearson | null;
  hipotesis: HipotesisPearson[];
}

interface CalcArgs {
  r: number;
  n: number;
  alpha: number;
  rho0: number;
  calcIC: boolean;
  calcBil: boolean;
  calcUIzq: boolean;
  calcUDer: boolean;
}

interface InferenciaPearsonProps {
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
}

interface TablaCell {
  v: ReactNode;
  align?: "left" | "right" | "center";
  mono?: boolean;
  bold?: boolean;
  color?: string;
}

interface TablaAcademicaProps {
  titulo?: ReactNode;
  headers: ReactNode[];
  filas: TablaCell[][];
  nota?: ReactNode;
}

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

function erf(x: number): number {
  const sign = Math.sign(x) || 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t
    - 1.453152027) * t
    + 1.421413741) * t
    - 0.284496736) * t
    + 0.254829592) * t)
    * Math.exp(-ax * ax);
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

function tcdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const p = 0.5 * ibeta(x, df / 2, 0.5);
  return t > 0 ? 1 - p : p;
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
  return validCount >= 4;
}

function statsPearsonData(datos: DataRow[] | null | undefined, col1: string, col2: string) {
  if (!datos?.length || !col1 || !col2) return null;

  const x: number[] = [];
  const y: number[] = [];

  for (const row of datos) {
    const p1 = parseNumericContinuous(row[col1]);
    const p2 = parseNumericContinuous(row[col2]);
    if (p1 !== "missing" && p1 !== "invalid" && p2 !== "missing" && p2 !== "invalid") {
      x.push(p1 as number);
      y.push(p2 as number);
    }
  }

  const n = x.length;
  if (n <= 3) return null;

  let sumX = 0, sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (denX === 0 || denY === 0) return { r: 0, n };

  const r = num / Math.sqrt(denX * denY);
  return { r: Math.max(-1, Math.min(1, r)), n };
}

function calcPearson({ r, n, alpha, rho0, calcIC, calcBil, calcUIzq, calcUDer }: CalcArgs): ResultadoPearson {
  const z_r = Math.atanh(r);
  const isZero = rho0 === 0;

  const result: ResultadoPearson = { r, n, rho0, isZero, ic: null, hipotesis: [] };

  if (calcIC) {
    const SE = 1 / Math.sqrt(n - 3);
    const Z_crit = norminv(1 - alpha / 2);
    const z_lower = z_r - Z_crit * SE;
    const z_upper = z_r + Z_crit * SE;

    result.ic = {
      r,
      lower: Math.tanh(z_lower),
      upper: Math.tanh(z_upper),
    };
  }

  if (calcBil || calcUIzq || calcUDer) {
    if (isZero) {
      const t = (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r);
      const df = n - 2;

      if (calcBil) result.hipotesis.push({ tipo: "Bilateral", statName: "t", statVal: t, df, p: 2 * (1 - tcdf(Math.abs(t), df)) });
      if (calcUIzq) result.hipotesis.push({ tipo: "Unilateral izquierdo", statName: "t", statVal: t, df, p: tcdf(t, df) });
      if (calcUDer) result.hipotesis.push({ tipo: "Unilateral derecho", statName: "t", statVal: t, df, p: 1 - tcdf(t, df) });
    } else {
      const z_rho0 = Math.atanh(rho0);
      const Z = (z_r - z_rho0) * Math.sqrt(n - 3);

      if (calcBil) result.hipotesis.push({ tipo: "Bilateral", statName: "Z", statVal: Z, p: 2 * (1 - normcdf(Math.abs(Z))) });
      if (calcUIzq) result.hipotesis.push({ tipo: "Unilateral izquierdo", statName: "Z", statVal: Z, p: normcdf(Z) });
      if (calcUDer) result.hipotesis.push({ tipo: "Unilateral derecho", statName: "Z", statVal: Z, p: 1 - normcdf(Z) });
    }
  }

  return result;
}

const fmt3 = (v: number) => (isFinite(v) ? v.toFixed(3) : "-");
const fmtP = (p: number) => (!isFinite(p) ? "-" : p < 0.001 ? "0,000" : p.toFixed(3).replace(".", ","));
const fmtN = (n: number) => (Number.isInteger(n) ? n.toLocaleString("es-ES") : String(n));

function buildResumenIA(res: ResultadoPearson, nc: number, varLabel: string): string {
  let txt = `Inferencia sobre el coeficiente de correlacion de Pearson - Variables: ${varLabel}\n`;
  txt += `Coeficiente de correlacion observado: r = ${fmt3(res.r)} (n=${res.n})\n`;
  txt += `Nivel de confianza: ${nc}% | Valor a contrastar: rho0 = ${fmt3(res.rho0)}\n\n`;

  if (res.ic) {
    txt += `[Intervalo de Confianza]\n`;
    txt += `IC ${nc}%: [${fmt3(res.ic.lower)} , ${fmt3(res.ic.upper)}]\n`;
  }

  if (res.hipotesis.length > 0) {
    txt += `\n[Contraste de Hipotesis]\n`;
    txt += `Metodo: ${res.isZero ? "Estadistico exacto T de Student" : "Aproximacion Z de Fisher"}\n`;
    res.hipotesis.forEach((h) => {
      txt += `  ${h.tipo}: ${h.statName} = ${fmt3(h.statVal)}, `;
      if (h.df !== undefined) txt += `gl = ${h.df}, `;
      txt += `p-valor = ${fmtP(h.p)}\n`;
    });
  }

  txt += `\nINSTRUCCIONES PARA LA IA:\n`;
  txt += `1. Interpreta fuerza y direccion de r.\n`;
  txt += `2. Interpreta el intervalo de confianza.\n`;
  txt += `3. Concluye sobre H0 con alfa 0.05.\n`;
  txt += `4. Deja abierta la conversacion para preguntas metodologicas.`;

  return txt;
}

async function exportarExcel(res: ResultadoPearson, nc: number, varLabel: string): Promise<void> {
  const cssTh = "background-color:#d9d9d9; font-weight:bold; text-align:center; border:1px solid #000; padding:4px;";
  const cssTdNum = "text-align:right; border:1px solid #000; padding:4px;";
  const cssTd = "text-align:left; border:1px solid #000; padding:4px;";

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>`;

  html += `<table style="border-collapse: collapse; font-family: sans-serif;">`;
  html += `<tr><th colspan="4" style="background-color:#0F766E; color:white; font-size:14px; padding:8px; border:1px solid #000;">Inferencia sobre el coeficiente de correlacion de Pearson</th></tr>`;
  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Variables: ${varLabel}</td></tr>`;
  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Filtro: No</td></tr>`;
  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Coeficiente de correlacion: ${fmt3(res.r).replace(".", ",")}</td></tr>`;
  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Tamano de muestra: ${fmtN(res.n)}</td></tr>`;
  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Nivel de confianza: ${nc},0%</td></tr>`;
  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Valor a contrastar: ${fmt3(res.rho0).replace(".", ",")}</td></tr>`;
  html += `<tr><td colspan="4"></td></tr>`;
  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Resultados:</td></tr>`;

  if (res.ic) {
    html += `<tr><td colspan="4" style="font-weight:bold;">Intervalo de confianza (${nc},0%)</td></tr>`;
    html += `<tr><th style="${cssTh}">Correlacion</th><th style="${cssTh}">Limite inferior</th><th style="${cssTh}">Limite superior</th><th></th></tr>`;
    html += `<tr><td style="${cssTdNum}">${fmt3(res.ic.r).replace(".", ",")}</td><td style="${cssTdNum}">${fmt3(res.ic.lower).replace(".", ",")}</td><td style="${cssTdNum}">${fmt3(res.ic.upper).replace(".", ",")}</td><td></td></tr>`;
    html += `<tr><td colspan="4"></td></tr>`;
  }

  if (res.hipotesis.length) {
    html += `<tr><td colspan="4" style="font-weight:bold;">Prueba para un coeficiente de correlacion (H0: rho=rho0)</td></tr>`;
    if (res.isZero) {
      html += `<tr><th style="${cssTh}">Contraste</th><th style="${cssTh}">Estadistico t</th><th style="${cssTh}">gl</th><th style="${cssTh}">Valor p</th></tr>`;
      res.hipotesis.forEach((h) => {
        html += `<tr><td style="${cssTd}">${h.tipo}</td><td style="${cssTdNum}">${fmt3(h.statVal).replace(".", ",")}</td><td style="${cssTdNum}">${fmtN(h.df || 0)}</td><td style="${cssTdNum}">${fmtP(h.p)}</td></tr>`;
      });
      html += `<tr><td colspan="4" style="font-size:12px;">gl: grados de libertad</td></tr>`;
    } else {
      html += `<tr><th style="${cssTh}">Contraste</th><th style="${cssTh}">Estadistico Z</th><th style="${cssTh}">Valor p</th><th></th></tr>`;
      res.hipotesis.forEach((h) => {
        html += `<tr><td style="${cssTd}">${h.tipo}</td><td style="${cssTdNum}">${fmt3(h.statVal).replace(".", ",")}</td><td style="${cssTdNum}">${fmtP(h.p)}</td><td></td></tr>`;
      });
    }
  }

  html += `</table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inferencia_pearson_${Date.now()}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportarWord(res: ResultadoPearson, nc: number, varLabel: string): void {
  const css = {
    th: "background:#d9d9d9;border:1px solid #000;padding:7px 12px;font-weight:bold;text-align:center;font-family:'Calibri',sans-serif;font-size:11pt",
    td: "border:1px solid #000;padding:6px 12px;text-align:right;font-family:'Calibri',sans-serif;font-size:11pt",
    td0: "border:1px solid #000;padding:6px 12px;text-align:left;font-family:'Calibri',sans-serif;font-size:11pt",
    tbl: "border-collapse:collapse;width:80%;margin-bottom:14pt",
    h2: "font-family:'Calibri',sans-serif;font-size:14pt;font-weight:bold;margin-top:12pt;margin-bottom:4pt",
    h3: "font-family:'Calibri',sans-serif;font-size:12pt;font-weight:bold;margin-top:10pt;margin-bottom:4pt",
    p: "font-family:'Calibri',sans-serif;font-size:11pt;color:#000;margin:3pt 0",
  };

  let html = `<h2 style="${css.h2}">Inferencia sobre el coeficiente de correlacion de Pearson</h2>`;
  html += `<p style="${css.p}">Variables: ${varLabel}</p>`;
  html += `<p style="${css.p}">Coeficiente de correlacion: ${fmt3(res.r).replace(".", ",")}</p>`;
  html += `<p style="${css.p}">Tamano de muestra: ${fmtN(res.n)}</p>`;
  html += `<p style="${css.p}">Nivel de confianza: ${nc},0%</p>`;
  html += `<p style="${css.p}">Valor a contrastar: ${fmt3(res.rho0).replace(".", ",")}</p>`;

  html += `<h3 style="${css.h3}">Resultados:</h3>`;

  if (res.ic) {
    html += `<p style="${css.p}">Intervalo de confianza (${nc},0%)</p>`;
    html += `<table style="${css.tbl}"><thead><tr>
      <th style="${css.th}">Correlacion</th>
      <th style="${css.th}">Limite inferior</th>
      <th style="${css.th}">Limite superior</th>
    </tr></thead><tbody><tr>
      <td style="${css.td}">${fmt3(res.ic.r).replace(".", ",")}</td>
      <td style="${css.td}">${fmt3(res.ic.lower).replace(".", ",")}</td>
      <td style="${css.td}">${fmt3(res.ic.upper).replace(".", ",")}</td>
    </tr></tbody></table>`;
  }

  if (res.hipotesis.length) {
    html += `<p style="${css.p}">Prueba para un coeficiente de correlacion (H0: rho=rho0)</p>`;
    html += `<table style="${css.tbl}"><thead><tr>
      <th style="${css.th}">Contraste</th>
      <th style="${css.th}">${res.isZero ? "Estadistico t" : "Estadistico Z"}</th>
      ${res.isZero ? `<th style="${css.th}">gl</th>` : ""}
      <th style="${css.th}">Valor p</th>
    </tr></thead><tbody>`;
    res.hipotesis.forEach((h) => {
      html += `<tr>
        <td style="${css.td0}">${h.tipo}</td>
        <td style="${css.td}">${fmt3(h.statVal).replace(".", ",")}</td>
        ${res.isZero ? `<td style="${css.td}">${fmtN(h.df || 0)}</td>` : ""}
        <td style="${css.td}">${fmtP(h.p)}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    if (res.isZero) html += `<p style="${css.p}; font-size:10pt">gl: grados de libertad</p>`;
  }

  const blob = new Blob(
    [`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'/><style>body{margin:2cm;}</style></head><body>${html}</body></html>`],
    { type: "application/msword" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `inferencia_pearson_${Date.now()}.doc`;
  a.click(); URL.revokeObjectURL(url);
}

const Icon = ({ d, size = 15, stroke = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
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

function CheckRow({ checked, onChange, label, hint, indented }: CheckRowProps) {
  return (
    <div onClick={() => onChange(!checked)} style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "11px 16px", borderRadius: 11, border: `2px solid ${checked ? "#0d9488" : "#e5e7eb"}`, background: checked ? "#f0fdf4" : "white", transition: "all .18s", marginLeft: indented ? 8 : 0 }}>
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

function TablaAcademica({ titulo, headers, filas, nota }: TablaAcademicaProps) {
  return (
    <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.04)", marginBottom: 14 }}>
      {titulo && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ width: 4, height: 18, background: "#0d9488", borderRadius: 2 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{titulo}</span>
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: "9px 14px", textAlign: i === 0 ? "left" : "right", fontWeight: 700, fontSize: 11, color: "#374151", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "2.5px solid #111827", borderTop: "2px solid #111827", background: "white", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? "white" : "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {fila.map((cel, ci) => (
                  <td key={ci} style={{ padding: "9px 14px", textAlign: cel.align || (ci === 0 ? "left" : "right"), fontFamily: cel.mono ? "'DM Mono', monospace" : "inherit", fontWeight: cel.bold ? 700 : 400, color: cel.color || "#374151", whiteSpace: "nowrap", fontSize: 13 }}>{cel.v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nota && <p style={{ fontSize: 11.5, color: "#6b7280", margin: "8px 0 0", fontStyle: "italic", lineHeight: 1.5 }}>{nota}</p>}
    </div>
  );
}

export default function InferenciaPearson({
  datosExcel = null,
  loadingExcel = false,
  onBack,
  onContinuarChat = null,
}: InferenciaPearsonProps) {
  const [modo, setModo] = useState("individual");
  const [colVar1, setColVar1] = useState("");
  const [colVar2, setColVar2] = useState("");

  const [manR, setManR] = useState("");
  const [manN, setManN] = useState("");

  const [nivelConf, setNivel] = useState(95);
  const [rho0Input, setRho0Input] = useState("0,000");

  const [calcIC, setCalcIC] = useState(true);
  const [calcBil, setCalcBil] = useState(true);
  const [calcUIzq, setCalcUIzq] = useState(false);
  const [calcUDer, setCalcUDer] = useState(false);

  const [res, setRes] = useState<ResultadoPearson | null>(null);
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState("");

  const [iaOpen, setIaOpen] = useState(false);
  const [iaLoad, setIaLoad] = useState(false);
  const [iaText, setIaText] = useState("");

  const colsCuant = useMemo(() => {
    if (!datosExcel?.length) return [];
    return Object.keys(datosExcel[0]).filter((c) => colEsCuantitativa(datosExcel, c));
  }, [datosExcel]);

  const autoStats = useMemo(() => {
    if (!datosExcel?.length || !colVar1 || !colVar2) return null;
    return statsPearsonData(datosExcel, colVar1, colVar2);
  }, [datosExcel, colVar1, colVar2]);

  const efectivos = useMemo(() => {
    const rho0Str = rho0Input.replace(",", ".");
    const rho0 = parseFloat(rho0Str) || 0;

    if (modo === "individual") {
      if (autoStats) return { r: autoStats.r, n: autoStats.n, rho0 };
      return null;
    }

    const rStr = manR.replace(",", ".");
    const r = parseFloat(rStr);
    const nStr = manN.replace(/\./g, "");
    const n = parseInt(nStr, 10);

    if (isFinite(r) && isFinite(n) && n > 3 && r > -1 && r < 1) {
      return { r, n, rho0 };
    }
    return null;
  }, [modo, autoStats, manR, manN, rho0Input]);

  const algunContrastes = calcBil || calcUIzq || calcUDer;
  const puedeCalcular = !!efectivos && (calcIC || algunContrastes);

  const varLabel = modo === "individual" && colVar1 && colVar2 ? `${colVar1} vs ${colVar2}` : "Datos resumidos";

  function handleCalc() {
    if (!puedeCalcular || !efectivos) return;
    setLoad(true); setErr("");
    setRes(null);
    setIaOpen(false); setIaText("");

    setTimeout(() => {
      try {
        const alpha = (100 - nivelConf) / 100;
        const { r, n, rho0 } = efectivos;
        const resultados = calcPearson({ r, n, alpha, rho0, calcIC, calcBil, calcUIzq, calcUDer });
        setRes(resultados);
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : "Error desconocido";
        setErr(`Error al calcular: ${msg}`);
      }
      setLoad(false);
    }, 150);
  }

  function handleReset() {
    setColVar1(""); setColVar2("");
    setManR(""); setManN("");
    setNivel(95); setRho0Input("0,000");
    setCalcIC(true); setCalcBil(true); setCalcUIzq(false); setCalcUDer(false);
    setRes(null);
    setErr(""); setIaOpen(false); setIaText("");
  }

  async function interpretarIA() {
    if (!res) return;
    setIaOpen(true); setIaLoad(true); setIaText("");
    try {
      const resumen = buildResumenIA(res, nivelConf, varLabel);
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content:
              "Eres un bioestadistico experto en Epidat. Interpreta estos resultados de la Inferencia sobre el coeficiente de correlacion de Pearson. Escribe un resumen clinico-epidemiologico en espanol, de maximo 300 palabras, estructurado pero en prosa fluida. Incluye la lectura directa de los limites inferior/superior y los p-valores de la tabla. Termina ofreciendo que te hagan mas preguntas.\n\nResultados:\n" + resumen,
          }],
        }),
      });

      if (!resp.ok) {
        setIaText("La conexion con la API de IA no esta disponible en este momento. Este es el resumen estructural que se enviaria:\n\n" + resumen);
      } else {
        const data = await resp.json();
        const txt = data.content?.[0]?.text || "Sin respuesta.";
        setIaText(txt);
      }
    } catch {
      setIaText("Error al conectar con el asistente IA. Verifica la integracion del backend.");
    }
    setIaLoad(false);
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f4f6f8", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .hov-btn:hover     { opacity:.85; transform:translateY(-1px) }
        .modo-tab:hover    { background:#f0fdf4 !important }
        input[type=number] { -moz-appearance:textfield }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none }
      `}</style>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <button onClick={onBack} style={{ color: "#0d9488", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", border: "none", background: "none", padding: 0, fontFamily: "inherit", fontSize: 13, fontWeight: 500 }}>
            <Icon d={IC_SVG.back} size={14} /> Una poblacion
          </button>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#111827", fontWeight: 600 }}>Coeficiente de correlacion de Pearson</span>
        </div>

        <div style={{ background: "white", borderRadius: "16px 16px 0 0", padding: "28px 32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 32, borderRadius: 4, background: "#0d9488", flexShrink: 0 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-.02em" }}>
              Inferencia sobre el coeficiente de correlacion
            </h1>
          </div>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "6px 0 0 14px", lineHeight: 1.5, paddingBottom: 20 }}>
            Calculo del intervalo de confianza y contraste de hipotesis para el coeficiente rho poblacional.
          </p>
        </div>

        <div style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", borderTop: "1px solid #a7f3d0", borderBottom: "1px solid #a7f3d0", padding: "13px 22px", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#065f46" }}>
          <span style={{ background: "#0d9488", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}>
            <Icon d={IC_SVG.info} size={13} />
          </span>
          <span style={{ lineHeight: 1.65 }}>
            <b>Para que sirve?</b> Permite inferir si existe una relacion lineal real entre dos variables cuantitativas continuas en la poblacion origen.
          </span>
        </div>

        <div style={{ background: "white", borderRadius: "0 0 16px 16px", borderTop: "1px solid #e5e7eb", padding: "26px 28px 24px", boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 0, border: "1.5px solid #e5e7eb", borderRadius: 11, overflow: "hidden", marginBottom: 24, width: "fit-content" }}>
            {[ ["individual", "Datos individuales (Excel)"], ["resumido", "Datos resumidos (manual)"] ].map(([m, label]) => (
              <button key={m} className="modo-tab" onClick={() => setModo(m)} style={{ padding: "9px 20px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: modo === m ? "#f0fdf4" : "white", color: modo === m ? "#0f766e" : "#6b7280", borderRight: m === "individual" ? "1.5px solid #e5e7eb" : "none", fontFamily: "inherit", transition: "all .15s", display: "flex", alignItems: "center", gap: 6 }}>
                {label}
              </button>
            ))}
          </div>

          {modo === "individual" ? (
            <div style={{ marginBottom: 20 }}>
              <StepLabel step="Paso 1" label="Variables cuantitativas a correlacionar" />
              {!datosExcel ? (
                <div style={{ padding: "13px 16px", background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 9 }}>
                  <Icon d={IC_SVG.warn} size={14} />
                  {loadingExcel ? "Cargando datos del Excel..." : "Sin datos cargados. Sube tu base de datos en Preprocesamiento o usa el modo Datos resumidos."}
                </div>
              ) : colsCuant.length < 2 ? (
                <div style={{ padding: "13px 16px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, fontSize: 13, color: "#991b1b", display: "flex", alignItems: "center", gap: 9 }}>
                  <Icon d={IC_SVG.warn} size={14} />
                  Se necesitan al menos 2 columnas numericas en el dataset para aplicar este analisis.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ position: "relative" }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Variable 1 (X)</label>
                    <select value={colVar1} onChange={(e: ChangeEvent<HTMLSelectElement>) => setColVar1(e.target.value)} style={{ width: "100%", padding: "11px 36px 11px 14px", border: `2px solid ${colVar1 ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", appearance: "none", color: colVar1 ? "#111827" : "#9ca3af", cursor: "pointer", outline: "none", background: colVar1 ? "#f0fdf4" : "white", transition: "all .2s" }}>
                      <option value="">Seleccionar Variable 1...</option>
                      {colsCuant.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div style={{ position: "relative" }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Variable 2 (Y)</label>
                    <select value={colVar2} onChange={(e: ChangeEvent<HTMLSelectElement>) => setColVar2(e.target.value)} style={{ width: "100%", padding: "11px 36px 11px 14px", border: `2px solid ${colVar2 ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", appearance: "none", color: colVar2 ? "#111827" : "#9ca3af", cursor: "pointer", outline: "none", background: colVar2 ? "#f0fdf4" : "white", transition: "all .2s" }}>
                      <option value="">Seleccionar Variable 2...</option>
                      {colsCuant.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {autoStats && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
                  <div style={{ background: "#f0fdf4", border: "1.5px solid #a7f3d0", borderRadius: 10, padding: "12px 16px" }}>
                    <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Correlacion calculada</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>r =</span>
                      <span style={{ fontSize: 17, fontWeight: 800, color: "#0f766e", fontFamily: "'DM Mono', monospace" }}>{fmt3(autoStats.r)}</span>
                    </div>
                  </div>
                  <div style={{ background: "#f0fdf4", border: "1.5px solid #a7f3d0", borderRadius: 10, padding: "12px 16px" }}>
                    <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Pares validos</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>n =</span>
                      <span style={{ fontSize: 17, fontWeight: 800, color: "#0f766e", fontFamily: "'DM Mono', monospace" }}>{fmtN(autoStats.n)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <StepLabel step="Paso 1" label="Datos resumidos" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Coeficiente de correlacion (r)</label>
                  <input type="text" value={manR} onChange={(e: ChangeEvent<HTMLInputElement>) => setManR(e.target.value)}
                    placeholder="ej. 0.127"
                    style={{ width: "100%", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#111827", outline: "none", boxSizing: "border-box", transition: "border .2s" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Tamano de muestra (n)</label>
                  <input type="text" value={manN} onChange={(e: ChangeEvent<HTMLInputElement>) => setManN(e.target.value)}
                    placeholder="ej. 1.989"
                    style={{ width: "100%", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#111827", outline: "none", boxSizing: "border-box", transition: "border .2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <Divider />

          <StepLabel step="Paso 2" label="Nivel de confianza" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            {[90, 95, 99].map((nc) => (
              <button key={nc} onClick={() => setNivel(nc)} style={{ padding: "9px 20px", borderRadius: 10, border: `2px solid ${nivelConf === nc ? "#0d9488" : "#e5e7eb"}`, background: nivelConf === nc ? "#f0fdf4" : "white", color: nivelConf === nc ? "#065f46" : "#6b7280", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>{nc}%</button>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6, border: "2px solid #e5e7eb", borderRadius: 10, padding: "0 12px", background: "white" }}>
              <input type="number" min={80} max={99.9} step={0.1} value={nivelConf}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNivel(Math.min(99.9, Math.max(80, +e.target.value)))}
                style={{ width: 52, border: "none", fontSize: 14, fontWeight: 700, color: "#111827", textAlign: "center", fontFamily: "inherit", background: "transparent", outline: "none" }} />
              <span style={{ fontSize: 13, color: "#6b7280" }}>%</span>
            </div>
          </div>

          <Divider />

          <StepLabel step="Paso 3" label="Que desea calcular?" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <CheckRow
              checked={calcIC}
              onChange={setCalcIC}
              label="Intervalo de confianza"
              hint="Calculo basado en la transformacion asintotica Z de Fisher."
            />
            <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", background: "#fafbfc" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
                Contraste de hipotesis
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <CheckRow checked={calcBil} onChange={setCalcBil} label={<>Bilateral</>} hint="H0: rho = rho0 vs H1: rho != rho0." indented />
                <CheckRow checked={calcUIzq} onChange={setCalcUIzq} label={<>Unilateral izquierdo</>} hint="H1: rho < rho0." indented />
                <CheckRow checked={calcUDer} onChange={setCalcUDer} label={<>Unilateral derecho</>} hint="H1: rho > rho0." indented />
              </div>
            </div>
          </div>

          {algunContrastes && (
            <div style={{ marginTop: 16, padding: "16px 18px", background: "#fafbfc", border: "1.5px solid #e5e7eb", borderRadius: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Valor a contrastar (rho0)</label>
              <input type="text" value={rho0Input} onChange={(e: ChangeEvent<HTMLInputElement>) => setRho0Input(e.target.value)}
                style={{ padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#111827", width: 140, outline: "none", transition: "border .2s" }} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCalc} disabled={!puedeCalcular || load} className="hov-btn" style={{ flex: 1, padding: "13px 20px", borderRadius: 12, border: "none", cursor: puedeCalcular && !load ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: puedeCalcular ? "linear-gradient(135deg,#14b8a6,#0d9488)" : "#e5e7eb", color: puedeCalcular ? "white" : "#9ca3af", boxShadow: puedeCalcular ? "0 4px 14px rgba(13,148,136,.28)" : "none", transition: "all .25s" }}>
            {load ? <><Spin /> Calculando...</> : <><Icon d={IC_SVG.calc} size={16} /> {res ? "Recalcular" : "Calcular"}</>}
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

        {res && (
          <div style={{ marginTop: 30, animation: "slideUp .4s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "16px 22px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
                <span style={{ whiteSpace: "nowrap", color: "#6b7280" }}>Variables: <b style={{ fontFamily: "'DM Mono', monospace", color: "#111827" }}>{varLabel}</b></span>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", width: "100%", justifyContent: "flex-end" }}>
                <button onClick={interpretarIA} disabled={iaLoad} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #a855f7", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fdf4ff", color: "#7c3aed", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  {iaLoad ? <><Spin sm /> Interpretando...</> : <><Icon d={IC_SVG.ai} size={14} /> Interpretacion por IA</>}
                </button>
                <button onClick={() => exportarExcel(res, nivelConf, varLabel)} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #0d9488", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#0d9488", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  <Icon d={IC_SVG.dl} /> Descargar Excel
                </button>
                <button onClick={() => exportarWord(res, nivelConf, varLabel)} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #3b82f6", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#3b82f6", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  <Icon d={IC_SVG.word} /> Descargar Word
                </button>
              </div>
            </div>

            {iaOpen && (
              <div style={{ marginBottom: 16, background: "linear-gradient(135deg,#fdf4ff,#ede9fe)", border: "2px solid #c4b5fd", borderRadius: 16, padding: 22, animation: "slideUp .3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: "#7c3aed", borderRadius: 9, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                      <Icon d={IC_SVG.ai} size={15} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#4c1d95" }}>Asistente Biometric IA</span>
                  </div>
                  <button onClick={() => setIaOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", display: "flex", padding: 4, borderRadius: 6 }}>
                    <Icon d={IC_SVG.x} />
                  </button>
                </div>
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #ddd6fe", padding: "18px 22px", minHeight: 140, maxHeight: 380, overflowY: "auto", lineHeight: 1.8, fontSize: 14, color: "#374151" }}>
                  {iaLoad
                    ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 110, gap: 12 }}><Spin /><span style={{ color: "#9ca3af", fontSize: 13 }}>Evaluando la significancia estadistica...</span></div>
                    : iaText
                      ? <div style={{ whiteSpace: "pre-wrap" }}>{iaText}</div>
                      : <span style={{ color: "#9ca3af" }}>El analisis aparecera aqui...</span>
                  }
                </div>
                {iaText && !iaLoad && (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => onContinuarChat ? onContinuarChat(`Hola, me gustaria entender mejor este analisis de correlacion de Pearson donde r=${fmt3(res.r)} y n=${res.n}.`) : alert("Prop de chat no conectada en entorno aislado.")} className="hov-btn" style={{ padding: "9px 18px", borderRadius: 10, border: "2px solid #7c3aed", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                      <Icon d={IC_SVG.chat} size={14} /> Continuar al chat
                    </button>
                  </div>
                )}
              </div>
            )}

            {res.ic && (
              <TablaAcademica
                titulo={`Intervalo de confianza (${nivelConf},0%)`}
                headers={["Correlacion", "Limite inferior", "Limite superior"]}
                filas={[[
                  { v: fmt3(res.ic.r).replace(".", ","), mono: true, align: "right" },
                  { v: fmt3(res.ic.lower).replace(".", ","), mono: true, align: "right" },
                  { v: fmt3(res.ic.upper).replace(".", ","), mono: true, align: "right" },
                ]]}
              />
            )}

            {res.hipotesis.length > 0 && (
              <TablaAcademica
                titulo={`Prueba para un coeficiente de correlacion (H0: rho=rho0)`}
                headers={res.isZero
                  ? ["Contraste", "Estadistico t", "gl", "Valor p"]
                  : ["Contraste", "Estadistico Z", "Valor p"]}
                filas={res.hipotesis.map((h) => {
                  const row: TablaCell[] = [{ v: h.tipo, align: "left" }];
                  row.push({ v: fmt3(h.statVal).replace(".", ","), mono: true });
                  if (res.isZero) row.push({ v: fmtN(h.df || 0), mono: true });
                  row.push({ v: fmtP(h.p), mono: true, bold: true });
                  return row;
                })}
                nota={res.isZero ? "gl: grados de libertad" : undefined}
              />
            )}

          </div>
        )}
      </div>
    </div>
  );
}
