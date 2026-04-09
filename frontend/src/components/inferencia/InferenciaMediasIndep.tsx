import { useState, useMemo, type ReactNode, type ChangeEvent } from "react";

type DataRow = Record<string, unknown>;

interface FilterRule {
  id: string;
  col: string;
  op: string;
  val: string;
}

interface ResultadosMedias {
  g1: string; g2: string;
  m1: number; sd1: number; n1: number;
  m2: number; sd2: number; n2: number;
  nc: number;

  f_stat: number;
  f_df1: number;
  f_df2: number;
  f_p: number;

  diff: number;
  ic_eq_lower: number; ic_eq_upper: number;
  ic_uneq_lower: number; ic_uneq_upper: number;

  t_eq_stat: number; t_eq_df: number;
  p_eq_bil: number; p_eq_izq: number; p_eq_der: number;

  t_uneq_stat: number; t_uneq_df: number;
  p_uneq_bil: number; p_uneq_izq: number; p_uneq_der: number;

  calcBil: boolean; calcUIzq: boolean; calcUDer: boolean; calcIC: boolean;
  varLabel: string; groupLabel: string;
}

interface InferenciaMediasProps {
  datosExcel?: DataRow[] | null;
  loadingExcel?: boolean;
  onBack: () => void;
  onContinuarChat?: ((texto: string) => void) | null;
}

interface IconProps { d: string; size?: number; stroke?: string; strokeWidth?: string; }
interface StepLabelProps { step: string; label: string; }
interface SpinProps { sm?: boolean; }
interface CheckRowProps { checked: boolean; onChange: (checked: boolean) => void; label: ReactNode; hint?: ReactNode; indented?: boolean; disabled?: boolean; }
interface TablaCell { v: ReactNode; align?: "left" | "right" | "center"; mono?: boolean; bold?: boolean; color?: string; }
interface TablaAcademicaProps { titulo?: ReactNode; headers: ReactNode[]; filas: TablaCell[][]; nota?: ReactNode; }

/* ═══════════════════════════════════════════════════════════════════════════
   FUNCIONES MATEMÁTICAS BASE
   ═══════════════════════════════════════════════════════════════════════════ */

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

function tcdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const p = 0.5 * ibeta(x, df / 2, 0.5);
  return t > 0 ? 1 - p : p;
}

function tinv(p: number, df: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  let low = -100, high = 100;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    if (tcdf(mid, df) < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

// Distribución F de Fisher
function fcdf(x: number, df1: number, df2: number): number {
  if (x <= 0) return 0;
  return 1 - ibeta(df2 / (df2 + df1 * x), df2 / 2, df1 / 2);
}

function parseNumericContinuous(value: unknown): number | "missing" | "invalid" {
  if (value === null || value === undefined) return "missing";
  if (typeof value === "string" && value.trim() === "") return "missing";
  const n = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(n)) return "invalid";
  return n;
}

function colEsCuantitativa(datos: DataRow[], col: string): boolean {
  if (!datos?.length || !col) return false;
  let validCount = 0;
  for (const row of datos) {
    const p = parseNumericContinuous(row[col]);
    if (p !== "missing" && p !== "invalid") validCount++;
  }
  return validCount >= 2;
}

function colEsDicotomica(datos: DataRow[], col: string): boolean {
  if (!datos?.length || !col) return false;
  const s = new Set<string>();
  for (const row of datos) {
    const v = row[col];
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      s.add(String(v).trim());
    }
    if (s.size > 2) return false;
  }
  return s.size === 2;
}

function evalRule(rowVal: any, rule: FilterRule) {
  if (rowVal === null || rowVal === undefined || String(rowVal).trim() === "") return false;

  const v1 = String(rowVal).trim();
  const v2 = String(rule.val).trim();

  const n1 = Number(v1);
  const n2 = Number(v2);
  const isNum = !isNaN(n1) && !isNaN(n2);

  const a = isNum ? n1 : v1.toLowerCase();
  const b = isNum ? n2 : v2.toLowerCase();

  switch(rule.op) {
    case "=": return a == b;
    case "≠": return a != b;
    case ">": return a > b;
    case "<": return a < b;
    case "≥": return a >= b;
    case "≤": return a <= b;
    default: return false;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   LÓGICA PRINCIPAL: COMPARACIÓN DE MEDIAS
   ═══════════════════════════════════════════════════════════════════════════ */

function calcMediasIndependientes(
  m1: number, sd1: number, n1: number,
  m2: number, sd2: number, n2: number,
  nc: number,
  calcBil: boolean, calcUIzq: boolean, calcUDer: boolean, calcIC: boolean,
  varLabel: string, groupLabel: string, g1: string, g2: string,
  rawArr1?: number[], rawArr2?: number[]
): ResultadosMedias {
  const alpha = (100 - nc) / 100;
  const diff = m1 - m2;
  const v1 = sd1 * sd1;
  const v2 = sd2 * sd2;

  // Levene's W Test for Equality of Variances
  const N = n1 + n2;
  const f_df1 = 1;       // k - 1  (2 groups)
  const f_df2 = N - 2;   // N - k
  let f_stat: number;

  if (rawArr1 && rawArr2 && rawArr1.length >= 2 && rawArr2.length >= 2) {
    // Exact Levene from raw data
    const mean1 = rawArr1.reduce((a, b) => a + b, 0) / rawArr1.length;
    const mean2 = rawArr2.reduce((a, b) => a + b, 0) / rawArr2.length;
    const z1 = rawArr1.map(x => Math.abs(x - mean1));
    const z2 = rawArr2.map(x => Math.abs(x - mean2));
    const zbar1 = z1.reduce((a, b) => a + b, 0) / n1;
    const zbar2 = z2.reduce((a, b) => a + b, 0) / n2;
    const zbar = (n1 * zbar1 + n2 * zbar2) / N;
    const between = n1 * (zbar1 - zbar) ** 2 + n2 * (zbar2 - zbar) ** 2;
    const within = z1.reduce((a, x) => a + (x - zbar1) ** 2, 0) + z2.reduce((a, x) => a + (x - zbar2) ** 2, 0);
    f_stat = (f_df2 * between) / (f_df1 * within);
  } else {
    // Approximation from summary stats (assuming normality)
    const c = Math.sqrt(2 / Math.PI);
    const zbar1 = sd1 * c;
    const zbar2 = sd2 * c;
    const zbar = (n1 * zbar1 + n2 * zbar2) / N;
    const between = n1 * (zbar1 - zbar) ** 2 + n2 * (zbar2 - zbar) ** 2;
    const varZ = 1 - 2 / Math.PI;
    const within = (n1 - 1) * v1 * varZ + (n2 - 1) * v2 * varZ;
    f_stat = (f_df2 * between) / (f_df1 * within);
  }
  const f_p = 1 - fcdf(f_stat, f_df1, f_df2);

  // T-Test Equal Variances
  const sp2 = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
  const sp = Math.sqrt(sp2);
  const se_eq = sp * Math.sqrt(1/n1 + 1/n2);
  const t_eq_stat = diff / se_eq;
  const t_eq_df = n1 + n2 - 2;

  const tcrit_eq = tinv(1 - alpha/2, t_eq_df);
  const ic_eq_lower = diff - tcrit_eq * se_eq;
  const ic_eq_upper = diff + tcrit_eq * se_eq;

  const p_eq_bil = 2 * (1 - tcdf(Math.abs(t_eq_stat), t_eq_df));
  const p_eq_izq = tcdf(t_eq_stat, t_eq_df);
  const p_eq_der = 1 - tcdf(t_eq_stat, t_eq_df);

  // Welch's T-Test (Unequal Variances)
  const se_uneq = Math.sqrt(v1/n1 + v2/n2);
  const t_uneq_stat = diff / se_uneq;
  const t_uneq_df = Math.pow(v1/n1 + v2/n2, 2) / ( Math.pow(v1/n1, 2)/(n1-1) + Math.pow(v2/n2, 2)/(n2-1) );

  const tcrit_uneq = tinv(1 - alpha/2, t_uneq_df);
  const ic_uneq_lower = diff - tcrit_uneq * se_uneq;
  const ic_uneq_upper = diff + tcrit_uneq * se_uneq;

  const p_uneq_bil = 2 * (1 - tcdf(Math.abs(t_uneq_stat), t_uneq_df));
  const p_uneq_izq = tcdf(t_uneq_stat, t_uneq_df);
  const p_uneq_der = 1 - tcdf(t_uneq_stat, t_uneq_df);

  return {
    g1, g2, m1, sd1, n1, m2, sd2, n2, nc,
    f_stat, f_df1, f_df2, f_p,
    diff, ic_eq_lower, ic_eq_upper, ic_uneq_lower, ic_uneq_upper,
    t_eq_stat, t_eq_df, p_eq_bil, p_eq_izq, p_eq_der,
    t_uneq_stat, t_uneq_df, p_uneq_bil, p_uneq_izq, p_uneq_der,
    calcBil, calcUIzq, calcUDer, calcIC,
    varLabel, groupLabel
  };
}

const fmt3 = (v: number) => (isFinite(v) ? v.toFixed(3) : "-");
const fmtP = (p: number) => (!isFinite(p) ? "-" : p < 0.001 ? "0,000" : p.toFixed(3).replace(".", ","));
const fmtN = (n: number) => (Number.isInteger(n) ? n.toLocaleString("es-ES") : String(n));
const fmtGl = (gl: number) => Number.isInteger(gl) ? fmtN(gl) : fmt3(gl).replace(".", ",");

function buildResumenIA(res: ResultadosMedias): string {
  let txt = `Inferencia. Comparación de medias independientes\n`;
  txt += `Variable analizada: ${res.varLabel} | Grupos: ${res.groupLabel}\n\n`;
  txt += `[Muestra 1 - ${res.g1}]: Media = ${fmt3(res.m1)}, DE = ${fmt3(res.sd1)}, n = ${res.n1}\n`;
  txt += `[Muestra 2 - ${res.g2}]: Media = ${fmt3(res.m2)}, DE = ${fmt3(res.sd2)}, n = ${res.n2}\n\n`;

  txt += `Prueba de Varianzas (Levene): p-valor = ${fmtP(res.f_p)}\n`;
  if (res.calcIC) {
    const isEq = res.f_p >= 0.05;
    txt += `Diferencia de Medias = ${fmt3(res.diff)}\n`;
    txt += `IC ${res.nc}% (${isEq ? 'Var. Iguales' : 'Var. Desiguales'}): [${fmt3(isEq ? res.ic_eq_lower : res.ic_uneq_lower)} , ${fmt3(isEq ? res.ic_eq_upper : res.ic_uneq_upper)}]\n`;
  }
  if (res.calcBil) {
    const isEq = res.f_p >= 0.05;
    txt += `Prueba T (Bilateral) p-valor = ${fmtP(isEq ? res.p_eq_bil : res.p_uneq_bil)}\n`;
  }
  txt += `\nINSTRUCCIONES PARA LA IA: Analiza si existe diferencia significativa entre las dos medias poblacionales con base en el p-valor de la Prueba T (usa el de varianzas iguales si el p-valor de la prueba de Levene es >=0.05, y el de Welch en caso contrario). Describe qué grupo tuvo una media mayor y la implicación clínica. Responde en prosa profesional y concisa.`;
  return txt;
}

/* ═══════════════════════════════════════════════════════════════════════════
   GENERACIÓN DE EXCEL Y WORD
   ═══════════════════════════════════════════════════════════════════════════ */

async function exportarExcel(res: ResultadosMedias): Promise<void> {
  const cssTh = "background-color:#d9d9d9; font-weight:bold; text-align:center; border:1px solid #000; padding:4px;";
  const cssTdNum = "text-align:right; border:1px solid #000; padding:4px;";
  const cssTd = "text-align:left; border:1px solid #000; padding:4px;";

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"></head><body>`;
  html += `<table style="border-collapse: collapse; font-family: sans-serif;">`;

  html += `<tr><th colspan="3" style="background-color:#0F766E; color:white; font-size:14px; padding:8px; border:1px solid #000;">Inferencia. Comparación de medias independientes</th></tr>`;
  html += `<tr><td colspan="3" style="font-weight:bold; ${cssTd}">Resumir: ${res.varLabel}</td></tr>`;
  html += `<tr><td colspan="3" style="font-weight:bold; ${cssTd}">Definir grupos (dos): ${res.groupLabel}</td></tr>`;
  html += `<tr><td colspan="3"></td></tr>`;

  html += `<tr><th style="${cssTh}"></th><th style="${cssTh}">Muestra 1</th><th style="${cssTh}">Muestra 2</th></tr>`;
  html += `<tr><td style="${cssTd}">Media</td><td style="${cssTdNum}">${fmt3(res.m1).replace(".", ",")}</td><td style="${cssTdNum}">${fmt3(res.m2).replace(".", ",")}</td></tr>`;
  html += `<tr><td style="${cssTd}">Desviación estándar</td><td style="${cssTdNum}">${fmt3(res.sd1).replace(".", ",")}</td><td style="${cssTdNum}">${fmt3(res.sd2).replace(".", ",")}</td></tr>`;
  html += `<tr><td style="${cssTd}">Tamaño de muestra</td><td style="${cssTdNum}">${fmtN(res.n1)}</td><td style="${cssTdNum}">${fmtN(res.n2)}</td></tr>`;
  html += `<tr><td colspan="3"></td></tr>`;

  html += `<tr><td colspan="3" style="font-weight:bold; ${cssTd}">Nivel de confianza: ${res.nc},0%</td></tr>`;
  html += `<tr><td colspan="3"></td></tr>`;
  html += `<tr><td colspan="3" style="font-weight:bold; text-decoration: underline;">Resultados:</td></tr>`;

  html += `<tr><td colspan="3">Prueba de comparación de varianzas (Levene)</td></tr>`;
  html += `<tr><th style="${cssTh}">Estadístico W</th><th style="${cssTh}">gl numerador</th><th style="${cssTh}">gl denominador</th><th style="${cssTh}">Valor p</th></tr>`;
  html += `<tr><td style="${cssTdNum}">${fmt3(res.f_stat).replace(".", ",")}</td><td style="${cssTdNum}">${res.f_df1}</td><td style="${cssTdNum}">${res.f_df2}</td><td style="${cssTdNum}">${fmtP(res.f_p)}</td></tr>`;
  html += `<tr><td colspan="4" style="font-size:12px;">gl: grados de libertad</td></tr>`;
  html += `<tr><td colspan="4"></td></tr>`;

  if (res.calcIC) {
    html += `<tr><td colspan="4">Intervalo de confianza (${res.nc},0%)</td></tr>`;
    html += `<tr><th style="${cssTh}">Diferencia de medias</th><th style="${cssTh}">Varianzas</th><th style="${cssTh}">Límite inferior</th><th style="${cssTh}">Límite superior</th></tr>`;
    html += `<tr><td style="${cssTdNum}">${fmt3(res.diff).replace(".", ",")}</td><td style="${cssTd}">Iguales</td><td style="${cssTdNum}">${fmt3(res.ic_eq_lower).replace(".", ",")}</td><td style="${cssTdNum}">${fmt3(res.ic_eq_upper).replace(".", ",")}</td></tr>`;
    html += `<tr><td style="${cssTdNum}">${fmt3(res.diff).replace(".", ",")}</td><td style="${cssTd}">Desiguales</td><td style="${cssTdNum}">${fmt3(res.ic_uneq_lower).replace(".", ",")}</td><td style="${cssTdNum}">${fmt3(res.ic_uneq_upper).replace(".", ",")}</td></tr>`;
    html += `<tr><td colspan="4"></td></tr>`;
  }

  const renderTtest = (title: string, tStat: number, tDf: number, pBil: number, pIzq: number, pDer: number) => {
    if (!res.calcBil && !res.calcUIzq && !res.calcUDer) return;
    html += `<tr><td colspan="4">${title}</td></tr>`;
    html += `<tr><th style="${cssTh}">Contraste</th><th style="${cssTh}">Estadístico t</th><th style="${cssTh}">gl</th><th style="${cssTh}">Valor p</th></tr>`;
    if (res.calcBil) html += `<tr><td style="${cssTd}">Bilateral</td><td style="${cssTdNum}">${fmt3(tStat).replace(".", ",")}</td><td style="${cssTdNum}">${fmtGl(tDf)}</td><td style="${cssTdNum}">${fmtP(pBil)}</td></tr>`;
    if (res.calcUIzq) html += `<tr><td style="${cssTd}">Unilateral izquierdo</td><td style="${cssTdNum}">${fmt3(tStat).replace(".", ",")}</td><td style="${cssTdNum}">${fmtGl(tDf)}</td><td style="${cssTdNum}">${fmtP(pIzq)}</td></tr>`;
    if (res.calcUDer) html += `<tr><td style="${cssTd}">Unilateral derecho</td><td style="${cssTdNum}">${fmt3(tStat).replace(".", ",")}</td><td style="${cssTdNum}">${fmtGl(tDf)}</td><td style="${cssTdNum}">${fmtP(pDer)}</td></tr>`;
    html += `<tr><td colspan="4" style="font-size:12px;">gl: grados de libertad</td></tr>`;
    html += `<tr><td colspan="4"></td></tr>`;
  };

  renderTtest("Prueba de comparación de medias (varianzas iguales)", res.t_eq_stat, res.t_eq_df, res.p_eq_bil, res.p_eq_izq, res.p_eq_der);
  renderTtest("Prueba de comparación de medias (varianzas desiguales)", res.t_uneq_stat, res.t_uneq_df, res.p_uneq_bil, res.p_uneq_izq, res.p_uneq_der);

  html += `</table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `comparacion_medias_${Date.now()}.xls`;
  a.click(); URL.revokeObjectURL(url);
}

function exportarWord(res: ResultadosMedias): void {
  const css = {
    th: "background:#d9d9d9;border:1px solid #000;padding:7px 12px;font-weight:bold;text-align:center;font-family:'Calibri',sans-serif;font-size:11pt",
    td: "border:1px solid #000;padding:6px 12px;text-align:right;font-family:'Calibri',sans-serif;font-size:11pt",
    td0: "border:1px solid #000;padding:6px 12px;text-align:left;font-family:'Calibri',sans-serif;font-size:11pt",
    tbl: "border-collapse:collapse;width:100%;margin-bottom:14pt",
    h2: "font-family:'Calibri',sans-serif;font-size:14pt;font-weight:bold;margin-top:12pt;margin-bottom:4pt",
    h3: "font-family:'Calibri',sans-serif;font-size:12pt;font-weight:bold;margin-top:10pt;margin-bottom:4pt",
    p: "font-family:'Calibri',sans-serif;font-size:11pt;color:#000;margin:3pt 0",
  };

  let html = `<h2 style="${css.h2}">Inferencia. Comparación de medias independientes</h2>`;
  html += `<p style="${css.p}">Resumir: ${res.varLabel}</p>`;
  html += `<p style="${css.p}">Definir grupos (dos): ${res.groupLabel}</p>`;

  html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}"></th><th style="${css.th}">Muestra 1</th><th style="${css.th}">Muestra 2</th></tr></thead><tbody>`;
  html += `<tr><td style="${css.td0}">Media</td><td style="${css.td}">${fmt3(res.m1).replace(".", ",")}</td><td style="${css.td}">${fmt3(res.m2).replace(".", ",")}</td></tr>`;
  html += `<tr><td style="${css.td0}">Desviación estándar</td><td style="${css.td}">${fmt3(res.sd1).replace(".", ",")}</td><td style="${css.td}">${fmt3(res.sd2).replace(".", ",")}</td></tr>`;
  html += `<tr><td style="${css.td0}">Tamaño de muestra</td><td style="${css.td}">${fmtN(res.n1)}</td><td style="${css.td}">${fmtN(res.n2)}</td></tr>`;
  html += `</tbody></table>`;

  html += `<p style="${css.p}">Nivel de confianza: ${res.nc},0%</p>`;
  html += `<h3 style="${css.h3}">Resultados:</h3>`;

  html += `<p style="${css.p}">Prueba de comparación de varianzas (Levene)</p>`;
  html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Estadístico W</th><th style="${css.th}">gl numerador</th><th style="${css.th}">gl denominador</th><th style="${css.th}">Valor p</th></tr></thead><tbody>`;
  html += `<tr><td style="${css.td}">${fmt3(res.f_stat).replace(".", ",")}</td><td style="${css.td}">${res.f_df1}</td><td style="${css.td}">${res.f_df2}</td><td style="${css.td}">${fmtP(res.f_p)}</td></tr>`;
  html += `</tbody></table><p style="${css.p}; font-size:10pt">gl: grados de libertad</p>`;

  if (res.calcIC) {
    html += `<p style="${css.p}">Intervalo de confianza (${res.nc},0%)</p>`;
    html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Diferencia de medias</th><th style="${css.th}">Varianzas</th><th style="${css.th}">Límite inferior</th><th style="${css.th}">Límite superior</th></tr></thead><tbody>`;
    html += `<tr><td style="${css.td}">${fmt3(res.diff).replace(".", ",")}</td><td style="${css.td0}">Iguales</td><td style="${css.td}">${fmt3(res.ic_eq_lower).replace(".", ",")}</td><td style="${css.td}">${fmt3(res.ic_eq_upper).replace(".", ",")}</td></tr>`;
    html += `<tr><td style="${css.td}">${fmt3(res.diff).replace(".", ",")}</td><td style="${css.td0}">Desiguales</td><td style="${css.td}">${fmt3(res.ic_uneq_lower).replace(".", ",")}</td><td style="${css.td}">${fmt3(res.ic_uneq_upper).replace(".", ",")}</td></tr>`;
    html += `</tbody></table>`;
  }

  const renderTtest = (title: string, tStat: number, tDf: number, pBil: number, pIzq: number, pDer: number) => {
    if (!res.calcBil && !res.calcUIzq && !res.calcUDer) return;
    html += `<p style="${css.p}">${title}</p>`;
    html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Contraste</th><th style="${css.th}">Estadístico t</th><th style="${css.th}">gl</th><th style="${css.th}">Valor p</th></tr></thead><tbody>`;
    if (res.calcBil) html += `<tr><td style="${css.td0}">Bilateral</td><td style="${css.td}">${fmt3(tStat).replace(".", ",")}</td><td style="${css.td}">${fmtGl(tDf)}</td><td style="${css.td}">${fmtP(pBil)}</td></tr>`;
    if (res.calcUIzq) html += `<tr><td style="${css.td0}">Unilateral izquierdo</td><td style="${css.td}">${fmt3(tStat).replace(".", ",")}</td><td style="${css.td}">${fmtGl(tDf)}</td><td style="${css.td}">${fmtP(pIzq)}</td></tr>`;
    if (res.calcUDer) html += `<tr><td style="${css.td0}">Unilateral derecho</td><td style="${css.td}">${fmt3(tStat).replace(".", ",")}</td><td style="${css.td}">${fmtGl(tDf)}</td><td style="${css.td}">${fmtP(pDer)}</td></tr>`;
    html += `</tbody></table><p style="${css.p}; font-size:10pt">gl: grados de libertad</p>`;
  };

  renderTtest("Prueba de comparación de medias (varianzas iguales)", res.t_eq_stat, res.t_eq_df, res.p_eq_bil, res.p_eq_izq, res.p_eq_der);
  renderTtest("Prueba de comparación de medias (varianzas desiguales)", res.t_uneq_stat, res.t_uneq_df, res.p_uneq_bil, res.p_uneq_izq, res.p_uneq_der);

  const blob = new Blob(
    [`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'/><style>body{margin:2cm;}</style></head><body>${html}</body></html>`],
    { type: "application/msword" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `comparacion_medias_${Date.now()}.doc`;
  a.click(); URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

const Icon = ({ d, size = 15, stroke = "currentColor", strokeWidth = "2" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
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
  filter: "<polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3'/>"
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
        {checked && <Icon d={IC_SVG.check} size={10} stroke="white" strokeWidth="3" />}
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
                <th key={i} style={{ padding: "9px 14px", textAlign: i === 0 && headers.length > 2 ? "left" : "right", fontWeight: 700, fontSize: 11, color: "#374151", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "2.5px solid #111827", borderTop: "2px solid #111827", background: "white", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? "white" : "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {fila.map((cel, ci) => (
                  <td key={ci} style={{ padding: "9px 14px", textAlign: cel.align || (ci === 0 && fila.length > 2 ? "left" : "right"), fontFamily: cel.mono ? "'DM Mono', monospace" : "inherit", fontWeight: cel.bold ? 700 : 400, color: cel.color || "#374151", whiteSpace: "nowrap", fontSize: 13 }}>{cel.v}</td>
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

export default function InferenciaMediasIndep({
  datosExcel = null,
  loadingExcel = false,
  onBack,
  onContinuarChat = null,
}: InferenciaMediasProps) {

  const [modo, setModo] = useState("individual");

  // States Individuales
  const [colResumir, setColResumir] = useState("");
  const [colGrupo, setColGrupo] = useState("");

  // States Filtros
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [filterCombo, setFilterCombo] = useState<"AND"|"OR">("AND");
  const [tempRules, setTempRules] = useState<FilterRule[]>([]);
  const [tempCombo, setTempCombo] = useState<"AND"|"OR">("AND");
  const [fCol, setFCol] = useState("");
  const [fOp, setFOp] = useState("=");
  const [fVal, setFVal] = useState("");

  // States Resumidos Manuales
  const [manM1, setManM1] = useState("");
  const [manSd1, setManSd1] = useState("");
  const [manN1, setManN1] = useState("");
  const [manM2, setManM2] = useState("");
  const [manSd2, setManSd2] = useState("");
  const [manN2, setManN2] = useState("");

  const [nivelConf, setNivel] = useState(95);

  const [calcIC, setCalcIC] = useState(true);
  const [calcBil, setCalcBil] = useState(true);
  const [calcUIzq, setCalcUIzq] = useState(false);
  const [calcUDer, setCalcUDer] = useState(false);

  const [res, setRes] = useState<ResultadosMedias | null>(null);
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState("");

  const [iaOpen, setIaOpen] = useState(false);
  const [iaLoad, setIaLoad] = useState(false);
  const [iaText, setIaText] = useState("");

  // Extracción de columnas válidas
  const colsDisp = useMemo(() => datosExcel?.length ? Object.keys(datosExcel[0]) : [], [datosExcel]);
  const colsCuant = useMemo(() => colsDisp.filter(c => colEsCuantitativa(datosExcel || [], c)), [colsDisp, datosExcel]);
  const colsDicot = useMemo(() => colsDisp.filter(c => colEsDicotomica(datosExcel || [], c)), [colsDisp, datosExcel]);

  const autoStats = useMemo(() => {
    if (!datosExcel?.length || !colResumir || !colGrupo) return null;

    let filtered = datosExcel;
    if (filterRules.length > 0) {
      filtered = filtered.filter(row => {
        const results = filterRules.map(rule => evalRule(row[rule.col], rule));
        return filterCombo === "AND" ? results.every(Boolean) : results.some(Boolean);
      });
    }

    const gSet = new Set<string>();
    filtered.forEach(r => {
      const v = r[colGrupo];
      if (v !== null && v !== undefined && String(v).trim() !== "") gSet.add(String(v).trim());
    });

    const gArr = Array.from(gSet).sort();
    if (gArr.length !== 2) return null;

    const val1 = gArr[0];
    const val2 = gArr[1];

    const arr1: number[] = [];
    const arr2: number[] = [];

    filtered.forEach(r => {
      const g = String(r[colGrupo]).trim();
      const v = parseNumericContinuous(r[colResumir]);
      if (v !== "missing" && v !== "invalid") {
        if (g === val1) arr1.push(v as number);
        if (g === val2) arr2.push(v as number);
      }
    });

    const calc = (arr: number[]) => {
      const n = arr.length;
      if (n < 2) return { m: 0, sd: 0, n };
      const m = arr.reduce((a,b)=>a+b,0)/n;
      const vari = arr.reduce((a,b)=>a+Math.pow(b-m,2),0)/(n-1);
      return { m, sd: Math.sqrt(vari), n };
    };

    const st1 = calc(arr1);
    const st2 = calc(arr2);

    return {
      g1: val1, g2: val2,
      m1: st1.m, sd1: st1.sd, n1: st1.n,
      m2: st2.m, sd2: st2.sd, n2: st2.n,
      arr1, arr2
    };
  }, [datosExcel, colResumir, colGrupo, filterRules, filterCombo]);

  const efectivos = useMemo(() => {
    if (modo === "individual") {
      return autoStats;
    } else {
      const m1 = parseFloat(manM1.replace(",", "."));
      const sd1 = parseFloat(manSd1.replace(",", "."));
      const n1 = parseInt(manN1.replace(/\./g, ""), 10);

      const m2 = parseFloat(manM2.replace(",", "."));
      const sd2 = parseFloat(manSd2.replace(",", "."));
      const n2 = parseInt(manN2.replace(/\./g, ""), 10);

      if ([m1,sd1,n1,m2,sd2,n2].every(x => isFinite(x)) && n1 > 1 && n2 > 1 && sd1 >= 0 && sd2 >= 0) {
        return { m1, sd1, n1, m2, sd2, n2, g1: "Muestra 1", g2: "Muestra 2" };
      }
      return null;
    }
  }, [modo, autoStats, manM1, manSd1, manN1, manM2, manSd2, manN2]);

  const algunContrastes = calcBil || calcUIzq || calcUDer;
  const puedeCalcular = !!efectivos && (calcIC || algunContrastes);

  const varLabel = modo === "individual" && colResumir ? colResumir : "Datos resumidos";
  const groupLabel = modo === "individual" && colGrupo ? colGrupo : "Manual";

  function handleCalc() {
    if (!puedeCalcular || !efectivos) return;
    setLoad(true); setErr(""); setRes(null); setIaOpen(false); setIaText("");

    setTimeout(() => {
      try {
        const { m1, sd1, n1, m2, sd2, n2, g1, g2 } = efectivos;
        const rawArr1 = (efectivos as any)?.arr1 as number[] | undefined;
        const rawArr2 = (efectivos as any)?.arr2 as number[] | undefined;
        const resultados = calcMediasIndependientes(
          m1, sd1, n1, m2, sd2, n2, nivelConf,
          calcBil, calcUIzq, calcUDer, calcIC,
          varLabel, groupLabel, g1, g2,
          rawArr1, rawArr2
        );
        setRes(resultados);
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : "Error desconocido";
        setErr(`Error al calcular: ${msg}`);
      }
      setLoad(false);
    }, 150);
  }

  function handleReset() {
    setColResumir(""); setColGrupo(""); setFilterRules([]);
    setManM1(""); setManSd1(""); setManN1(""); setManM2(""); setManSd2(""); setManN2("");
    setNivel(95);
    setCalcIC(true); setCalcBil(true); setCalcUIzq(false); setCalcUDer(false);
    setRes(null); setErr(""); setIaOpen(false); setIaText("");
  }

  const addFilterRule = () => {
    if (fCol && fVal) {
      setTempRules([...tempRules, { id: Math.random().toString(), col: fCol, op: fOp, val: fVal }]);
      setFVal("");
    }
  };

  async function interpretarIA() {
    if (!res) return;
    setIaOpen(true); setIaLoad(true); setIaText("");
    try {
      const resumen = buildResumenIA(res);
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: "Eres un bioestadístico experto. Interpreta los resultados de la siguiente tabla para una tesis clínica en máximo 300 palabras.\n\n" + resumen,
          }],
        }),
      });

      if (!resp.ok) {
        setIaText("La conexión con la API de IA no está disponible en este momento. Este es el resumen que se enviaría:\n\n" + resumen);
      } else {
        const data = await resp.json();
        setIaText(data.content?.[0]?.text || "Sin respuesta.");
      }
    } catch {
      setIaText("Error al conectar con el asistente IA.");
    }
    setIaLoad(false);
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f4f6f8", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .hov-btn:hover     { opacity:.85; transform:translateY(-1px) }
        .modo-tab:hover    { background:#f0fdf4 !important }
        input[type=text] { -moz-appearance:textfield }
        .modal-bg { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:999; animation:fadeIn .2s; }
        .modal-card { background:white; width:90%; max-width:550px; border-radius:16px; padding:24px; box-shadow:0 10px 25px rgba(0,0,0,0.1); animation:slideUp .3s ease; }
      `}</style>

      {/* FILTER MODAL */}
      {isFilterOpen && (
        <div className="modal-bg">
          <div className="modal-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ background: "#3b82f6", borderRadius: 8, padding: 6, color: "white" }}><Icon d={IC_SVG.filter} size={18} /></div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Filtro de Datos</h2>
            </div>

            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6, display: "block" }}>Definir:</label>
                  <select value={fCol} onChange={(e) => setFCol(e.target.value)} style={{ width: "100%", padding: "10px", border: "2px solid #d1d5db", borderRadius: 8, outline: "none", fontFamily: "inherit" }}>
                    <option value="">(Variable)</option>
                    {colsDisp.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <select value={fOp} onChange={(e) => setFOp(e.target.value)} style={{ width: "100%", padding: "10px", border: "2px solid #d1d5db", borderRadius: 8, outline: "none", fontFamily: "inherit", fontWeight: 700, textAlign: "center" }}>
                    {["=", "≠", "≥", ">", "≤", "<"].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <input type="text" value={fVal} onChange={(e) => setFVal(e.target.value)} placeholder="Valor..." style={{ width: "100%", padding: "10px", border: "2px solid #d1d5db", borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={addFilterRule} disabled={!fCol || !fVal} className="hov-btn" style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: fCol && fVal ? "#0d9488" : "#d1d5db", color: "white", fontWeight: 700, cursor: fCol && fVal ? "pointer" : "not-allowed" }}>Agregar</button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ width: 140, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fafbfc" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 10, display: "block" }}>Tipo de combinación:</span>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
                  <input type="radio" checked={tempCombo === "AND"} onChange={() => setTempCombo("AND")} style={{ accentColor: "#3b82f6", width: 16, height: 16 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Y</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="radio" checked={tempCombo === "OR"} onChange={() => setTempCombo("OR")} style={{ accentColor: "#3b82f6", width: 16, height: 16 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>O</span>
                </label>
              </div>
              <div style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 10, background: "white", padding: 10, minHeight: 100, overflowY: "auto" }}>
                {tempRules.length === 0 && <span style={{ fontSize: 13, color: "#9ca3af" }}>No hay reglas de filtro.</span>}
                {tempRules.map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "#f3f4f6", borderRadius: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#111827" }}><b>{r.col}</b> {r.op} {r.val}</span>
                    <button onClick={() => setTempRules(tempRules.filter(x => x.id !== r.id))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 2 }}><Icon d={IC_SVG.x} size={14} strokeWidth="3" /></button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button onClick={() => { setTempRules([]); }} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", fontWeight: 600, cursor: "pointer" }}>Limpiar</button>
              <button onClick={() => setIsFilterOpen(false)} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => { setFilterRules(tempRules); setFilterCombo(tempCombo); setIsFilterOpen(false); }} className="hov-btn" style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#3b82f6", color: "white", fontWeight: 700, cursor: "pointer" }}>Aceptar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* Breadcrumbs */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <button onClick={onBack} style={{ color: "#0d9488", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", border: "none", background: "none", padding: 0, fontFamily: "inherit", fontSize: 13, fontWeight: 500 }}>
            <Icon d={IC_SVG.back} size={14} /> Dos poblaciones
          </button>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#111827", fontWeight: 600 }}>Comparación de medias independientes</span>
        </div>

        {/* Header */}
        <div style={{ background: "white", borderRadius: "16px 16px 0 0", padding: "28px 32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 32, borderRadius: 4, background: "#0d9488", flexShrink: 0 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-.02em" }}>
              Inferencia. Comparación de medias independientes
            </h1>
          </div>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "6px 0 0 14px", lineHeight: 1.5, paddingBottom: 20 }}>
            Contraste de hipótesis e intervalos de confianza para la diferencia de promedios entre dos grupos (T de Student / Welch).
          </p>
        </div>

        {/* Info Box */}
        <div style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", borderTop: "1px solid #a7f3d0", borderBottom: "1px solid #a7f3d0", padding: "13px 22px", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#065f46" }}>
          <span style={{ background: "#0d9488", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}>
            <Icon d={IC_SVG.info} size={13} />
          </span>
          <span style={{ lineHeight: 1.65 }}>
            <b>¿Para qué sirve?</b> Analiza si una variable continua (ej. Nivel de Glucosa) difiere significativamente entre dos grupos distintos (ej. Hombres vs Mujeres). La prueba de Levene evalúa si las varianzas son homogéneas para determinar el estadístico t adecuado.
          </span>
        </div>

        {/* Formularios */}
        <div style={{ background: "white", borderRadius: "0 0 16px 16px", borderTop: "1px solid #e5e7eb", padding: "26px 28px 24px", boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 14 }}>

          <div style={{ display: "flex", gap: 0, border: "1.5px solid #e5e7eb", borderRadius: 11, overflow: "hidden", marginBottom: 24, width: "fit-content" }}>
            {[["resumido", "✏️", "Datos resumidos"], ["individual", "📊", "Datos individuales"]].map(([m, emoji, label]) => (
              <button key={m} className="modo-tab" onClick={() => setModo(m)} style={{ padding: "9px 20px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: modo === m ? "#f0fdf4" : "white", color: modo === m ? "#0f766e" : "#6b7280", borderRight: m === "resumido" ? "1.5px solid #e5e7eb" : "none", fontFamily: "inherit", transition: "all .15s", display: "flex", alignItems: "center", gap: 6 }}>
                {emoji} {label}
              </button>
            ))}
          </div>

          {modo === "individual" ? (
            <div style={{ marginBottom: 20 }}>
              <StepLabel step="Paso 1" label="Selección de variables" />
              {!datosExcel ? (
                <div style={{ padding: "13px 16px", background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 9 }}>
                  <Icon d={IC_SVG.warn} size={14} />
                  {loadingExcel ? "Cargando datos del Excel..." : "Sin datos cargados. Sube tu base de datos en Preprocesamiento o usa el modo de Datos resumidos."}
                </div>
              ) : colsCuant.length === 0 || colsDicot.length === 0 ? (
                <div style={{ padding: "13px 16px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, fontSize: 13, color: "#991b1b", display: "flex", alignItems: "center", gap: 9 }}>
                  <Icon d={IC_SVG.warn} size={14} />
                  Se necesita al menos 1 variable numérica continua y 1 variable dicotómica (dos grupos).
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                    <button onClick={() => { setTempRules(filterRules); setTempCombo(filterCombo); setIsFilterOpen(true); }} className="hov-btn" style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", color: filterRules.length > 0 ? "#3b82f6" : "#374151", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon d={IC_SVG.filter} size={14} /> Filtro: {filterRules.length > 0 ? "Activo" : "Definir"}
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{ position: "relative" }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Resumir (Numérica):</label>
                      <select value={colResumir} onChange={(e) => setColResumir(e.target.value)} style={{ width: "100%", padding: "11px 36px 11px 14px", border: `2px solid ${colResumir ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", appearance: "none", color: colResumir ? "#111827" : "#9ca3af", cursor: "pointer", outline: "none", background: colResumir ? "#f0fdf4" : "white", transition: "all .2s" }}>
                        <option value="">Seleccionar variable...</option>
                        {colsCuant.map((c: string) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div style={{ position: "relative" }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Definir grupos (Dicotómica):</label>
                      <select value={colGrupo} onChange={(e) => setColGrupo(e.target.value)} style={{ width: "100%", padding: "11px 36px 11px 14px", border: `2px solid ${colGrupo ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", appearance: "none", color: colGrupo ? "#111827" : "#9ca3af", cursor: "pointer", outline: "none", background: colGrupo ? "#f0fdf4" : "white", transition: "all .2s" }}>
                        <option value="">Seleccionar variable...</option>
                        {colsDicot.map((c: string) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {autoStats && (
                <div style={{ marginTop: 20, background: "#f0fdf4", border: "1.5px solid #a7f3d0", borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ fontSize: 12, color: "#065f46", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon d={IC_SVG.check} size={14} /> Estadísticos calculados automáticamente
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: 14, alignItems: "center" }}>
                    <div></div>
                    <div style={{ fontWeight: 700, color: "#0f766e", fontSize: 14 }}>Muestra 1 [{autoStats.g1}]</div>
                    <div style={{ fontWeight: 700, color: "#0f766e", fontSize: 14 }}>Muestra 2 [{autoStats.g2}]</div>

                    <div style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>Media</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", color: "#111827", fontSize: 15 }}>{fmt3(autoStats.m1)}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", color: "#111827", fontSize: 15 }}>{fmt3(autoStats.m2)}</div>

                    <div style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>Desv. estándar</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", color: "#111827", fontSize: 15 }}>{fmt3(autoStats.sd1)}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", color: "#111827", fontSize: 15 }}>{fmt3(autoStats.sd2)}</div>

                    <div style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>Tamaño (n)</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", color: "#111827", fontSize: 15 }}>{fmtN(autoStats.n1)}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", color: "#111827", fontSize: 15 }}>{fmtN(autoStats.n2)}</div>
                  </div>
                </div>
              )}
              {colResumir && colGrupo && !autoStats && (
                <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>⚠ Los grupos generados después del filtro no poseen suficientes datos válidos (n {">"} 1 en cada grupo).</p>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <StepLabel step="Paso 1" label="Datos resumidos" />
              <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "16px 20px", background: "#f9fafb" }}>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 14, alignItems: "center" }}>
                  <div></div>
                  <div style={{ fontWeight: 700, color: "#374151", fontSize: 13, textAlign: "center" }}>Muestra 1</div>
                  <div style={{ fontWeight: 700, color: "#374151", fontSize: 13, textAlign: "center" }}>Muestra 2</div>

                  <div style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>Media</div>
                  <input type="text" value={manM1} onChange={e => setManM1(e.target.value)} placeholder="0,014" style={{ padding: "8px", border: "1.5px solid #d1d5db", borderRadius: 8, fontFamily: "'DM Mono', monospace", textAlign: "right", outline: "none" }} />
                  <input type="text" value={manM2} onChange={e => setManM2(e.target.value)} placeholder="0,703" style={{ padding: "8px", border: "1.5px solid #d1d5db", borderRadius: 8, fontFamily: "'DM Mono', monospace", textAlign: "right", outline: "none" }} />

                  <div style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>Desv. estándar</div>
                  <input type="text" value={manSd1} onChange={e => setManSd1(e.target.value)} placeholder="0,117" style={{ padding: "8px", border: "1.5px solid #d1d5db", borderRadius: 8, fontFamily: "'DM Mono', monospace", textAlign: "right", outline: "none" }} />
                  <input type="text" value={manSd2} onChange={e => setManSd2(e.target.value)} placeholder="0,458" style={{ padding: "8px", border: "1.5px solid #d1d5db", borderRadius: 8, fontFamily: "'DM Mono', monospace", textAlign: "right", outline: "none" }} />

                  <div style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>Tamaño de muestra</div>
                  <input type="text" value={manN1} onChange={e => setManN1(e.target.value)} placeholder="1.443" style={{ padding: "8px", border: "1.5px solid #d1d5db", borderRadius: 8, fontFamily: "'DM Mono', monospace", textAlign: "right", outline: "none" }} />
                  <input type="text" value={manN2} onChange={e => setManN2(e.target.value)} placeholder="333" style={{ padding: "8px", border: "1.5px solid #d1d5db", borderRadius: 8, fontFamily: "'DM Mono', monospace", textAlign: "right", outline: "none" }} />
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

          <StepLabel step="Paso 3" label="Opciones a Calcular" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <CheckRow checked={calcIC} onChange={setCalcIC} label="Intervalo de confianza" />
            <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", background: "#fafbfc" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Contraste de hipótesis</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <CheckRow checked={calcBil} onChange={setCalcBil} label={<>Bilateral &nbsp;<span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 12 }}>( H₀: μ₁ − μ₂ = 0 vs. H₁: μ₁ − μ₂ ≠ 0 )</span></>} indented />
                <CheckRow checked={calcUIzq} onChange={setCalcUIzq} label={<>Unilateral izquierdo &nbsp;<span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 12 }}>( H₀: μ₁ − μ₂ = 0 vs. H₁: μ₁ − μ₂ &lt; 0 )</span></>} indented />
                <CheckRow checked={calcUDer} onChange={setCalcUDer} label={<>Unilateral derecho &nbsp;<span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 12 }}>( H₀: μ₁ − μ₂ = 0 vs. H₁: μ₁ − μ₂ &gt; 0 )</span></>} indented />
              </div>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCalc} disabled={!puedeCalcular || load} className="hov-btn" style={{ flex: 1, padding: "13px 20px", borderRadius: 12, border: "none", cursor: puedeCalcular && !load ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: puedeCalcular ? "linear-gradient(135deg,#14b8a6,#0d9488)" : "#e5e7eb", color: puedeCalcular ? "white" : "#9ca3af", boxShadow: puedeCalcular ? "0 4px 14px rgba(13,148,136,.28)" : "none", transition: "all .25s" }}>
            {load ? <><Spin /> Calculando...</> : <><Icon d={IC_SVG.calc} size={16} /> Calcular</>}
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

        {/* Resultados */}
        {res && (
          <div style={{ marginTop: 30, animation: "slideUp .4s cubic-bezier(.16,1,.3,1)" }}>

            {/* Controles Externos */}
            <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "16px 22px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>Resumir: <b style={{ fontFamily: "'DM Mono', monospace", color: "#111827" }}>{res.varLabel}</b></span>
                <span style={{ color: "#6b7280" }}>Grupos (dos): <b style={{ fontFamily: "'DM Mono', monospace", color: "#111827" }}>{res.groupLabel}</b></span>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={interpretarIA} disabled={iaLoad} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #a855f7", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fdf4ff", color: "#7c3aed", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  {iaLoad ? <><Spin sm /> Interpretando...</> : <><Icon d={IC_SVG.ai} size={14} /> Interpretación por IA</>}
                </button>
                <button onClick={() => exportarExcel(res)} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #0d9488", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#0d9488", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  <Icon d={IC_SVG.dl} /> Excel
                </button>
                <button onClick={() => exportarWord(res)} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #3b82f6", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#3b82f6", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  <Icon d={IC_SVG.word} /> Word
                </button>
              </div>
            </div>

            {/* Modal IA */}
            {iaOpen && (
              <div style={{ marginBottom: 16, background: "linear-gradient(135deg,#fdf4ff,#ede9fe)", border: "2px solid #c4b5fd", borderRadius: 16, padding: 22, animation: "slideUp .3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: "#7c3aed", borderRadius: 9, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                      <Icon d={IC_SVG.ai} size={15} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#4c1d95" }}>Asistente Biometric IA</span>
                  </div>
                  <button onClick={() => setIaOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", display: "flex", padding: 4, borderRadius: 6 }}><Icon d={IC_SVG.x} /></button>
                </div>
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #ddd6fe", padding: "18px 22px", minHeight: 140, maxHeight: 380, overflowY: "auto", lineHeight: 1.8, fontSize: 14, color: "#374151" }}>
                  {iaLoad ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 110, gap: 12 }}><Spin /><span style={{ color: "#9ca3af", fontSize: 13 }}>Evaluando varianzas y medias...</span></div> : <div style={{ whiteSpace: "pre-wrap" }}>{iaText}</div>}
                </div>
                {iaText && !iaLoad && (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => onContinuarChat?.(`Hola, sobre el análisis de T de Student de ${res.varLabel}, ¿podemos ver en profundidad por qué se prefirieron las varianzas ${res.f_p >= 0.05 ? "iguales" : "desiguales"}?`)} className="hov-btn" style={{ padding: "9px 18px", borderRadius: 10, border: "2px solid #7c3aed", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", gap: 7 }}>
                      <Icon d={IC_SVG.chat} size={14} /> Continuar al chat
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TABLA DE VARIANZAS */}
            <TablaAcademica
              titulo="Prueba de comparación de varianzas (Levene)"
              headers={["Estadístico W", "gl numerador", "gl denominador", "Valor p"]}
              filas={[[
                { v: fmt3(res.f_stat).replace(".", ","), mono: true, align: "right" },
                { v: res.f_df1, mono: true, align: "right" },
                { v: res.f_df2, mono: true, align: "right" },
                { v: fmtP(res.f_p), mono: true, bold: true, align: "right" }
              ]]}
              nota="gl: grados de libertad"
            />

            {/* TABLA DE INTERVALOS */}
            {res.calcIC && (
              <TablaAcademica
                titulo={`Intervalo de confianza (${res.nc},0%)`}
                headers={["Diferencia de medias", "Varianzas", "Límite inferior", "Límite superior"]}
                filas={[
                  [
                    { v: fmt3(res.diff).replace(".", ","), mono: true, align: "right" },
                    { v: "Iguales", align: "left" },
                    { v: fmt3(res.ic_eq_lower).replace(".", ","), mono: true, align: "right" },
                    { v: fmt3(res.ic_eq_upper).replace(".", ","), mono: true, align: "right" }
                  ],
                  [
                    { v: fmt3(res.diff).replace(".", ","), mono: true, align: "right" },
                    { v: "Desiguales", align: "left" },
                    { v: fmt3(res.ic_uneq_lower).replace(".", ","), mono: true, align: "right" },
                    { v: fmt3(res.ic_uneq_upper).replace(".", ","), mono: true, align: "right" }
                  ]
                ]}
              />
            )}

            {/* TABLAS DE CONTRASTE */}
            {algunContrastes && (
              <>
                <TablaAcademica
                  titulo="Prueba de comparación de medias (varianzas iguales)"
                  headers={["Contraste", "Estadístico t", "gl", "Valor p"]}
                  filas={[
                    ...(res.calcBil ? [[{ v: "Bilateral", align: "left" as const }, { v: fmt3(res.t_eq_stat).replace(".", ","), mono: true, align: "right" as const }, { v: fmtGl(res.t_eq_df), mono: true, align: "right" as const }, { v: fmtP(res.p_eq_bil), mono: true, bold: true, align: "right" as const }]] : []),
                    ...(res.calcUIzq ? [[{ v: "Unilateral izquierdo", align: "left" as const }, { v: fmt3(res.t_eq_stat).replace(".", ","), mono: true, align: "right" as const }, { v: fmtGl(res.t_eq_df), mono: true, align: "right" as const }, { v: fmtP(res.p_eq_izq), mono: true, bold: true, align: "right" as const }]] : []),
                    ...(res.calcUDer ? [[{ v: "Unilateral derecho", align: "left" as const }, { v: fmt3(res.t_eq_stat).replace(".", ","), mono: true, align: "right" as const }, { v: fmtGl(res.t_eq_df), mono: true, align: "right" as const }, { v: fmtP(res.p_eq_der), mono: true, bold: true, align: "right" as const }]] : [])
                  ]}
                  nota="gl: grados de libertad"
                />

                <TablaAcademica
                  titulo="Prueba de comparación de medias (varianzas desiguales)"
                  headers={["Contraste", "Estadístico t", "gl", "Valor p"]}
                  filas={[
                    ...(res.calcBil ? [[{ v: "Bilateral", align: "left" as const }, { v: fmt3(res.t_uneq_stat).replace(".", ","), mono: true, align: "right" as const }, { v: fmtGl(res.t_uneq_df), mono: true, align: "right" as const }, { v: fmtP(res.p_uneq_bil), mono: true, bold: true, align: "right" as const }]] : []),
                    ...(res.calcUIzq ? [[{ v: "Unilateral izquierdo", align: "left" as const }, { v: fmt3(res.t_uneq_stat).replace(".", ","), mono: true, align: "right" as const }, { v: fmtGl(res.t_uneq_df), mono: true, align: "right" as const }, { v: fmtP(res.p_uneq_izq), mono: true, bold: true, align: "right" as const }]] : []),
                    ...(res.calcUDer ? [[{ v: "Unilateral derecho", align: "left" as const }, { v: fmt3(res.t_uneq_stat).replace(".", ","), mono: true, align: "right" as const }, { v: fmtGl(res.t_uneq_df), mono: true, align: "right" as const }, { v: fmtP(res.p_uneq_der), mono: true, bold: true, align: "right" as const }]] : [])
                  ]}
                  nota="gl: grados de libertad"
                />
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
