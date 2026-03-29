import { useState, useMemo, type ReactNode, type ChangeEvent } from "react";
import * as XLSX from "xlsx-js-style";

type DataRow = Record<string, unknown>;
type ParsedBinary = 0 | 1 | "missing" | "invalid";

interface StatsProporcion {
  x: number;
  n: number;
  p: number;
}

interface IcProporcion {
  lower: number;
  upper: number;
  p: number;
}

interface HipotesisExacta {
  tipo: string;
  p: number;
}

interface HipotesisAproximada {
  tipo: string;
  Z: number;
  p: number;
}

interface ResultadoExacto {
  metodo: "exacto";
  pHat: number;
  x: number;
  n: number;
  ic: IcProporcion | null;
  hipotesis: HipotesisExacta[];
}

interface ResultadoAproximado {
  metodo: "aproximado";
  pHat: number;
  x: number;
  n: number;
  z: number;
  EE: number;
  Z: number;
  ic: IcProporcion | null;
  hipotesis: HipotesisAproximada[];
}

interface CalcArgs {
  x: number;
  n: number;
  alpha: number;
  p0: number;
  calcIC: boolean;
  calcBil: boolean;
  calcUIzq: boolean;
  calcUDer: boolean;
}

interface InferenciaProporcionProps {
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

interface BloqueMetodoProps {
  res: ResultadoExacto | ResultadoAproximado;
  nc: number;
  p0Pct: string;
  tituloMetodo: string;
  colorAccent: string;
}

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

function ibetaInv(p: number, a: number, b: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (ibeta(mid, a, b) < p) lo = mid; else hi = mid;
    if (hi - lo < 1e-12) break;
  }
  return (lo + hi) / 2;
}

function pbinom(k: number, n: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  return ibeta(1 - p, n - k, k + 1);
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

function parseNumericBinary(value: unknown): ParsedBinary {
  if (value === null || value === undefined) return "missing";
  if (typeof value === "string" && value.trim() === "") return "missing";
  const n = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(n)) return "invalid";
  if (n === 0) return 0;
  if (n === 1) return 1;
  return "invalid";
}

function colEsBinaria(datos: DataRow[] | null | undefined, col: string): boolean {
  if (!datos?.length || !col) return false;
  const valores: number[] = [];
  for (const row of datos) {
    const parsed = parseNumericBinary(row[col]);
    if (parsed === "invalid") return false;
    if (parsed !== "missing") valores.push(parsed);
  }
  return valores.length > 0 && new Set(valores).size <= 2;
}

function statsProporcion(datos: DataRow[] | null | undefined, col: string): StatsProporcion | null {
  if (!datos?.length || !col) return null;
  const valores: number[] = [];
  for (const row of datos) {
    const parsed = parseNumericBinary(row[col]);
    if (parsed === 0 || parsed === 1) valores.push(parsed);
  }
  const n = valores.length;
  if (n < 2) return null;
  const x = valores.filter((v) => v === 1).length;
  return { x, n, p: x / n };
}

function calcExacto({ x, n, alpha, p0, calcIC, calcBil, calcUIzq, calcUDer }: CalcArgs): ResultadoExacto {
  const pHat = x / n;
  const result: ResultadoExacto = { metodo: "exacto", pHat, x, n, ic: null, hipotesis: [] };

  if (calcIC) {
    const lo = x === 0 ? 0 : ibetaInv(alpha / 2, x, n - x + 1);
    const hi = x === n ? 1 : ibetaInv(1 - alpha / 2, x + 1, n - x);
    result.ic = { lower: lo * 100, upper: hi * 100, p: pHat * 100 };
  }

  const Px = pbinom(x, n, p0);
  const Py = 1 - pbinom(x - 1, n, p0);

  if (calcBil) result.hipotesis.push({ tipo: "Bilateral", p: Math.min(1, 2 * Math.min(Px, Py)) });
  if (calcUIzq) result.hipotesis.push({ tipo: "Unilateral izquierdo", p: Px });
  if (calcUDer) result.hipotesis.push({ tipo: "Unilateral derecho", p: Py });

  return result;
}

function calcAproximado({ x, n, alpha, p0, calcIC, calcBil, calcUIzq, calcUDer }: CalcArgs): ResultadoAproximado {
  const pHat = x / n;
  const z = norminv(1 - alpha / 2);
  const EE = Math.sqrt(pHat * (1 - pHat) / n);
  const EE0 = Math.sqrt(p0 * (1 - p0) / n);
  const Z = EE0 > 0 ? (pHat - p0) / EE0 : (pHat > p0 ? Infinity : -Infinity);

  const result: ResultadoAproximado = { metodo: "aproximado", pHat, x, n, z, EE, Z, ic: null, hipotesis: [] };

  if (calcIC) {
    result.ic = {
      lower: Math.max(0, (pHat - z * EE) * 100),
      upper: Math.min(100, (pHat + z * EE) * 100),
      p: pHat * 100,
    };
  }

  if (calcBil) result.hipotesis.push({ tipo: "Bilateral", Z, p: 2 * (1 - normcdf(Math.abs(Z))) });
  if (calcUIzq) result.hipotesis.push({ tipo: "Unilateral izquierdo", Z, p: normcdf(Z) });
  if (calcUDer) result.hipotesis.push({ tipo: "Unilateral derecho", Z, p: 1 - normcdf(Z) });

  return result;
}

const fmt3 = (v: number) => (isFinite(v) ? v.toFixed(3) : "-");
const fmtP = (p: number) => (!isFinite(p) ? "-" : p < 0.001 ? "< 0.001" : p.toFixed(3));
const fmtN = (n: number) => (Number.isInteger(n) ? n.toLocaleString("es") : String(n));

function buildResumenIA(
  exacto: ResultadoExacto | null,
  aprox: ResultadoAproximado | null,
  variable: string,
  nc: number,
  p0Pct: string,
): string {
  let txt = `Inferencia sobre una proporción - Variable: ${variable}\n`;
  const pHat = exacto?.pHat ?? aprox?.pHat ?? 0;
  txt += `Proporción observada: p̂ = ${fmt3(pHat * 100)}% (x=${exacto?.x ?? aprox?.x}, n=${exacto?.n ?? aprox?.n})\n`;
  txt += `Nivel de confianza: ${nc}% | Valor a contrastar: P₀ = ${p0Pct}%\n\n`;

  if (exacto?.ic) {
    txt += `[Método exacto - Clopper-Pearson]\n`;
    txt += `IC ${nc}%: [${fmt3(exacto.ic.lower)}% , ${fmt3(exacto.ic.upper)}%]\n`;
    exacto.hipotesis.forEach((h) => (txt += `  ${h.tipo}: p = ${fmtP(h.p)}\n`));
  }
  if (aprox?.ic) {
    txt += `[Método aproximado - Normal de Wald]\n`;
    txt += `IC ${nc}%: [${fmt3(aprox.ic.lower)}% , ${fmt3(aprox.ic.upper)}%]\n`;
    aprox.hipotesis.forEach((h) => (txt += `  ${h.tipo}: Z=${fmt3(h.Z)}, p=${fmtP(h.p)}\n`));
  }
  return txt;
}

async function exportarExcel(
  exacto: ResultadoExacto | null,
  aprox: ResultadoAproximado | null,
  variable: string,
  nc: number,
  p0Pct: string,
): Promise<void> {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];
  const merges: XLSX.Range[] = [];
  const sectionRows: number[] = [];
  const headerRows: number[] = [];
  const addMerge = (r: number, c1: number, c2: number) => merges.push({ s: { r, c: c1 }, e: { r, c: c2 } });
  const push = (row: (string | number)[]) => {
    rows.push(row);
    return rows.length - 1;
  };
  const src = exacto ?? aprox;
  if (!src) return;

  let r = push([`Inferencia sobre una Proporción - Variable: ${variable}`]);
  addMerge(r, 0, 3); sectionRows.push(r);
  r = push([`x = ${src.x}   |   n = ${fmtN(src.n)}   |   p̂ = ${fmt3(src.pHat * 100)}%   |   P₀ = ${p0Pct}%`]);
  addMerge(r, 0, 3); sectionRows.push(r);
  r = push([`Nivel de confianza: ${nc}%`]);
  addMerge(r, 0, 3); sectionRows.push(r);
  push([]);

  const writeBloque = (res: ResultadoExacto | ResultadoAproximado, titulo: string) => {
    r = push([titulo]);
    addMerge(r, 0, 3); sectionRows.push(r);

    if (res.ic) {
      r = push([`Intervalo de confianza (${nc}.0%)`]);
      addMerge(r, 0, 3); sectionRows.push(r);
      r = push(["Porcentaje (%)", `Límite inferior (%)`, `Límite superior (%)`, ""]);
      headerRows.push(r);
      push([fmt3(res.ic.p), fmt3(res.ic.lower), fmt3(res.ic.upper), ""]);
      push([]);
    }

    if (res.hipotesis.length) {
      r = push([`Prueba para una proporción (P₀ = ${p0Pct}%)`]);
      addMerge(r, 0, 3); sectionRows.push(r);
      const esAprox = res.metodo === "aproximado";
      r = push(esAprox
        ? ["Contraste", "Estadístico Z", "Valor p", ""]
        : ["Contraste", "Valor p", "", ""]
      );
      headerRows.push(r);
      res.hipotesis.forEach((h) =>
        push(esAprox
          ? [h.tipo, fmt3((h as HipotesisAproximada).Z), fmtP(h.p), ""]
          : [h.tipo, fmtP(h.p), "", ""]
        )
      );
      push([]);
    }
  };

  if (exacto) writeBloque(exacto, "MÉTODO EXACTO - Clopper-Pearson");
  if (aprox) writeBloque(aprox, "MÉTODO APROXIMADO - Distribución Normal (Wald)");

  r = push(["p < 0.001 = muy significativo  ·  p < 0.05 = significativo  ·  p ≥ 0.05 = no significativo"]);
  addMerge(r, 0, 3); sectionRows.push(r);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];

  const S = {
    title: { fill: { fgColor: { rgb: "0F766E" } }, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "0F766E" } }, bottom: { style: "thin", color: { rgb: "0F766E" } }, left: { style: "thin", color: { rgb: "0F766E" } }, right: { style: "thin", color: { rgb: "0F766E" } } } },
    section: { fill: { fgColor: { rgb: "ECFDF5" } }, font: { bold: true, color: { rgb: "065F46" }, sz: 10 }, alignment: { horizontal: "left", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "A7F3D0" } }, bottom: { style: "thin", color: { rgb: "A7F3D0" } }, left: { style: "thin", color: { rgb: "A7F3D0" } }, right: { style: "thin", color: { rgb: "A7F3D0" } } } },
    header: { fill: { fgColor: { rgb: "111827" } }, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "111827" } }, bottom: { style: "thin", color: { rgb: "111827" } }, left: { style: "thin", color: { rgb: "111827" } }, right: { style: "thin", color: { rgb: "111827" } } } },
    data: { font: { color: { rgb: "334155" }, sz: 10 }, alignment: { horizontal: "right", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "E5E7EB" } }, bottom: { style: "thin", color: { rgb: "E5E7EB" } }, left: { style: "thin", color: { rgb: "E5E7EB" } }, right: { style: "thin", color: { rgb: "E5E7EB" } } } },
    dataLeft: { font: { color: { rgb: "334155" }, sz: 10 }, alignment: { horizontal: "left", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "E5E7EB" } }, bottom: { style: "thin", color: { rgb: "E5E7EB" } }, left: { style: "thin", color: { rgb: "E5E7EB" } }, right: { style: "thin", color: { rgb: "E5E7EB" } } } },
  };

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[ref]) continue;
      if (R === 0) ws[ref].s = S.title;
      else if (sectionRows.includes(R)) ws[ref].s = S.section;
      else if (headerRows.includes(R)) ws[ref].s = S.header;
      else if (C === 0) ws[ref].s = S.dataLeft;
      else ws[ref].s = S.data;
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Inferencia Proporción");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `inferencia_proporcion_${Date.now()}.xlsx`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportarWord(
  exacto: ResultadoExacto | null,
  aprox: ResultadoAproximado | null,
  variable: string,
  nc: number,
  p0Pct: string,
): void {
  const css = {
    th: "background:#d9d9d9;border:1px solid #999;padding:7px 12px;font-weight:bold;text-align:center;font-family:'Calibri',sans-serif;font-size:11pt",
    td: "border:1px solid #ccc;padding:6px 12px;text-align:right;font-family:'Calibri',sans-serif;font-size:11pt",
    td0: "border:1px solid #ccc;padding:6px 12px;text-align:left;font-family:'Calibri',sans-serif;font-size:11pt",
    tbl: "border-collapse:collapse;width:100%;margin-bottom:14pt",
    h2: "font-family:'Calibri',sans-serif;font-size:14pt;font-weight:bold;margin-top:12pt;margin-bottom:4pt",
    h3: "font-family:'Calibri',sans-serif;font-size:12pt;font-weight:bold;margin-top:10pt;margin-bottom:4pt",
    p: "font-family:'Calibri',sans-serif;font-size:11pt;color:#444;margin:3pt 0",
  };
  const src = exacto ?? aprox;
  if (!src) return;

  const writeBloque = (res: ResultadoExacto | ResultadoAproximado, titulo: string) => {
    let h = `<h3 style="${css.h3}">${titulo}</h3>`;
    if (res.ic) {
      h += `<p style="${css.p}">Intervalo de confianza (${nc}.0%)</p>`;
      h += `<table style="${css.tbl}"><thead><tr>
        <th style="${css.th}">Porcentaje (%)</th>
        <th style="${css.th}">Límite inferior (%)</th>
        <th style="${css.th}">Límite superior (%)</th>
      </tr></thead><tbody><tr>
        <td style="${css.td}">${fmt3(res.ic.p)}</td>
        <td style="${css.td}">${fmt3(res.ic.lower)}</td>
        <td style="${css.td}">${fmt3(res.ic.upper)}</td>
      </tr></tbody></table>`;
    }
    if (res.hipotesis.length) {
      const esAprox = res.metodo === "aproximado";
      h += `<p style="${css.p}">Prueba para una proporción (P₀ = ${p0Pct}%)</p>`;
      h += `<table style="${css.tbl}"><thead><tr>
        <th style="${css.th}">Contraste</th>
        ${esAprox ? `<th style="${css.th}">Estadístico Z</th>` : ""}
        <th style="${css.th}">Valor p</th>
      </tr></thead><tbody>`;
      res.hipotesis.forEach((hh) => {
        h += `<tr>
          <td style="${css.td0}">${hh.tipo}</td>
          ${esAprox ? `<td style="${css.td}">${fmt3((hh as HipotesisAproximada).Z)}</td>` : ""}
          <td style="${css.td}">${fmtP(hh.p)}</td>
        </tr>`;
      });
      h += `</tbody></table>`;
    }
    return h;
  };

  let html = `<h2 style="${css.h2}">Inferencia sobre una Proporción</h2>`;
  html += `<p style="${css.p}"><b>Variable:</b> ${variable}</p>`;
  html += `<p style="${css.p}">x = ${src.x} &nbsp;|&nbsp; n = ${fmtN(src.n)} &nbsp;|&nbsp; p̂ = ${fmt3(src.pHat * 100)}% &nbsp;|&nbsp; P₀ = ${p0Pct}%</p>`;
  html += `<p style="${css.p}">Nivel de confianza: ${nc}%</p>`;
  if (exacto) html += writeBloque(exacto, "Método exacto - Clopper-Pearson");
  if (aprox) html += writeBloque(aprox, "Método aproximado - Distribución Normal (Wald)");

  const blob = new Blob(
    [`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'/><style>body{margin:2cm;}</style></head><body>${html}</body></html>`],
    { type: "application/msword" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `inferencia_proporcion_${Date.now()}.doc`;
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

function BloqueMetodo({ res, nc, p0Pct, tituloMetodo, colorAccent }: BloqueMetodoProps) {
  if (!res) return null;
  const esAprox = res.metodo === "aproximado";

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 22, background: colorAccent, borderRadius: 2 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{tituloMetodo}</span>
        {esAprox && res.Z !== undefined && (
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#6b7280", marginLeft: 4 }}>
            Z = (p̂ − P₀) / √[P₀(1−P₀)/n] = <b style={{ color: colorAccent }}>{fmt3(res.Z)}</b>
          </span>
        )}
      </div>

      {res.ic && (
        <TablaAcademica
          titulo={`Intervalo de confianza (${nc}.0%)`}
          headers={["Porcentaje (%)", `Límite inferior (%)`, `Límite superior (%)`]}
          filas={[[
            { v: fmt3(res.ic.p), mono: true, bold: true, color: "#1e40af" },
            { v: fmt3(res.ic.lower), mono: true, color: "#374151" },
            { v: fmt3(res.ic.upper), mono: true, color: "#374151" },
          ]]}
          nota={`Con ${nc}% de confianza, la proporción poblacional P se encuentra entre ${fmt3(res.ic.lower)}% y ${fmt3(res.ic.upper)}%. Amplitud: ${fmt3(res.ic.upper - res.ic.lower)}%.`}
        />
      )}

      {res.hipotesis.length > 0 && (
        <TablaAcademica
          titulo={<>Prueba para una proporción &nbsp;<span style={{ color: "#6b7280", fontWeight: 400, fontSize: 13 }}>(P₀ = {p0Pct}%)</span></>}
          headers={esAprox ? ["Contraste", "Estadístico Z", "Valor p"] : ["Contraste", "Valor p"]}
          filas={res.hipotesis.map((h) => {
            const row: TablaCell[] = [{ v: h.tipo, align: "left", bold: true }];
            if (esAprox) row.push({ v: fmt3((h as HipotesisAproximada).Z), mono: true, color: "#1e40af" });
            row.push({ v: fmtP(h.p), mono: true, bold: true, color: h.p < 0.001 ? "#dc2626" : h.p < 0.05 ? "#d97706" : "#059669" });
            return row;
          })}
          nota={esAprox
            ? "p < 0.001 = rojo (muy significativo) · p < 0.05 = naranja · p ≥ 0.05 = verde"
            : "p-valor exacto binomial (Clopper-Pearson) · p < 0.001 = rojo · p < 0.05 = naranja · p ≥ 0.05 = verde"
          }
        />
      )}
    </div>
  );
}

export default function InferenciaProporcion({
  datosExcel = null,
  loadingExcel = false,
  onBack,
  onContinuarChat = null,
}: InferenciaProporcionProps) {
  const [modo, setModo] = useState("individual");
  const [colVar, setColVar] = useState("");
  const [manX, setManX] = useState("");
  const [manN, setManN] = useState("");

  const [nivelConf, setNivel] = useState(95);
  const [p0Pct, setP0Pct] = useState("0");
  const [calcIC, setCalcIC] = useState(true);
  const [calcBil, setCalcBil] = useState(true);
  const [calcUIzq, setCalcUIzq] = useState(false);
  const [calcUDer, setCalcUDer] = useState(false);

  const [metExacto, setMetExacto] = useState(true);
  const [metAprox, setMetAprox] = useState(true);

  const [resExacto, setResExacto] = useState<ResultadoExacto | null>(null);
  const [resAprox, setResAprox] = useState<ResultadoAproximado | null>(null);
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState("");

  const [iaOpen, setIaOpen] = useState(false);
  const [iaLoad, setIaLoad] = useState(false);
  const [iaText, setIaText] = useState("");

  const colsBin = useMemo(() => {
    if (!datosExcel?.length) return [];
    return Object.keys(datosExcel[0]).filter((c) => colEsBinaria(datosExcel, c));
  }, [datosExcel]);

  const autoStats = useMemo(() => {
    if (!datosExcel?.length || !colVar) return null;
    return statsProporcion(datosExcel, colVar);
  }, [datosExcel, colVar]);

  const efectivos = useMemo(() => {
    if (modo === "individual") return autoStats;
    const x = parseInt(manX, 10), n = parseInt(manN, 10);
    if (isFinite(x) && isFinite(n) && n >= 2 && x >= 0 && x <= n)
      return { x, n, p: x / n };
    return null;
  }, [modo, autoStats, manX, manN]);

  const algunContrastes = calcBil || calcUIzq || calcUDer;
  const algunMetodo = metExacto || metAprox;
  const puedeCalcular = !!efectivos && (calcIC || algunContrastes) && algunMetodo;
  const varLabel = modo === "individual" && colVar ? colVar : "Datos resumidos";

  function handleCalc() {
    if (!puedeCalcular) return;
    setLoad(true); setErr("");
    setResExacto(null); setResAprox(null);
    setIaOpen(false); setIaText("");

    setTimeout(() => {
      try {
        const alpha = (100 - nivelConf) / 100;
        const p0 = Math.min(1, Math.max(0, parseFloat(p0Pct) / 100 || 0));
        const { x, n } = efectivos;

        if (metExacto) {
          setResExacto(calcExacto({ x, n, alpha, p0, calcIC, calcBil, calcUIzq, calcUDer }));
        }
        if (metAprox) {
          setResAprox(calcAproximado({ x, n, alpha, p0, calcIC, calcBil, calcUIzq, calcUDer }));
        }
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : "Error desconocido";
        setErr(`Error al calcular: ${msg}`);
      }
      setLoad(false);
    }, 60);
  }

  function handleReset() {
    setColVar(""); setManX(""); setManN("");
    setNivel(95); setP0Pct("0");
    setCalcIC(true); setCalcBil(true); setCalcUIzq(false); setCalcUDer(false);
    setMetExacto(true); setMetAprox(true);
    setResExacto(null); setResAprox(null);
    setErr(""); setIaOpen(false); setIaText("");
  }

  async function interpretarIA() {
    if (!resExacto && !resAprox) return;
    setIaOpen(true); setIaLoad(true); setIaText("");
    try {
      const resumen = buildResumenIA(resExacto, resAprox, varLabel, nivelConf, p0Pct);
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content:
              "Eres un bioestadístico experto. Interpreta estos resultados de inferencia sobre una proporción en español académico, apto para una tesis de ciencias de la salud. Redacta en prosa fluida (sin listas). Incluye: (1) qué representa p̂ y su intervalo de confianza, (2) conclusión del contraste de hipótesis y su valor p, (3) comparación entre método exacto y aproximado si ambos están disponibles, (4) implicación clínica o epidemiológica. Máximo 300 palabras.\n\nResultados:\n" + resumen,
          }],
        }),
      });
      const data = await resp.json();
      const txt = data.content
        ?.filter((b: { type?: string }) => b.type === "text")
        .map((b: { text?: string }) => b.text ?? "")
        .join("") || "Sin respuesta.";
      setIaText(txt);
    } catch {
      setIaText("Error al conectar con el asistente IA. Verifica la conexión.");
    }
    setIaLoad(false);
  }

  const hayResultados = resExacto || resAprox;
  const srcData = resExacto ?? resAprox;

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
            <Icon d={IC_SVG.back} size={14} /> Una población
          </button>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#111827", fontWeight: 600 }}>Inferencia sobre una proporción</span>
        </div>

        <div style={{ background: "white", borderRadius: "16px 16px 0 0", padding: "28px 32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 32, borderRadius: 4, background: "#0d9488", flexShrink: 0 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-.02em" }}>
              Inferencia sobre una proporción
            </h1>
          </div>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "6px 0 0 14px", lineHeight: 1.5, paddingBottom: 20 }}>
            Estimación de la proporción poblacional P mediante IC y prueba binomial/normal (una muestra)
          </p>
        </div>

        <div style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", borderTop: "1px solid #a7f3d0", borderBottom: "1px solid #a7f3d0", padding: "13px 22px", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#065f46" }}>
          <span style={{ background: "#0d9488", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}>
            <Icon d={IC_SVG.info} size={13} />
          </span>
          <span style={{ lineHeight: 1.65 }}>
            <b>¿Para qué sirve?</b> Estima si la proporción de un evento binario en la población difiere de un valor de referencia (P₀).
            Ejemplo: ¿La prevalencia de diabetes en mi muestra es diferente del 8.8% nacional? ¿La tasa de éxito del tratamiento supera el 50%?
            La <b>variable debe ser binaria</b>: <b>1</b> = evento presente (caso) · <b>0</b> = evento ausente (no caso).
          </span>
        </div>

        <div style={{ background: "white", borderRadius: "0 0 16px 16px", borderTop: "1px solid #e5e7eb", padding: "26px 28px 24px", boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 0, border: "1.5px solid #e5e7eb", borderRadius: 11, overflow: "hidden", marginBottom: 24, width: "fit-content" }}>
            {[["individual", "📊", "Datos individuales (Excel)"], ["resumido", "✏️", "Datos resumidos (manual)"]].map(([m, emoji, label]) => (
              <button key={m} className="modo-tab" onClick={() => setModo(m)} style={{ padding: "9px 20px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: modo === m ? "#f0fdf4" : "white", color: modo === m ? "#0f766e" : "#6b7280", borderRight: m === "individual" ? "1.5px solid #e5e7eb" : "none", fontFamily: "inherit", transition: "all .15s", display: "flex", alignItems: "center", gap: 6 }}>
                {emoji} {label}
              </button>
            ))}
          </div>

          {modo === "individual" ? (
            <div style={{ marginBottom: 20 }}>
              <StepLabel step="Paso 1" label="Variable binaria (columnas con solo valores 0 y 1)" />
              {!datosExcel ? (
                <div style={{ padding: "13px 16px", background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 9 }}>
                  <Icon d={IC_SVG.warn} size={14} />
                  {loadingExcel ? "Cargando datos del Excel..." : "Sin datos cargados. Ve a Preprocesamiento o usa el modo Datos resumidos."}
                </div>
              ) : colsBin.length === 0 ? (
                <div style={{ padding: "13px 16px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, fontSize: 13, color: "#991b1b", display: "flex", alignItems: "center", gap: 9 }}>
                  <Icon d={IC_SVG.warn} size={14} />
                  No hay columnas binarias (0/1) en los datos. Codifica tu variable de evento como 1=sí y 0=no en tu Excel.
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <select value={colVar} onChange={(e: ChangeEvent<HTMLSelectElement>) => setColVar(e.target.value)} style={{ width: "100%", padding: "11px 36px 11px 14px", border: `2px solid ${colVar ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", appearance: "none", color: colVar ? "#111827" : "#9ca3af", cursor: "pointer", outline: "none", background: colVar ? "#f0fdf4" : "white", transition: "all .2s" }}>
                    <option value="">Seleccionar variable binaria (0/1)...</option>
                    {colsBin.map((c: string) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: colVar ? "#0d9488" : "#9ca3af", pointerEvents: "none" }}>▾</span>
                </div>
              )}

              {autoStats && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
                  {[["x", fmtN(autoStats.x), "Número de casos (valor=1)"], ["n", fmtN(autoStats.n), "Tamaño de muestra"], ["p̂", `${fmt3(autoStats.p * 100)}%`, "Proporción observada"]].map(([sym, val, lbl]) => (
                    <div key={sym} style={{ background: "#f0fdf4", border: "1.5px solid #a7f3d0", borderRadius: 10, padding: "12px 16px" }}>
                      <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{lbl}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{sym} =</span>
                        <span style={{ fontSize: 17, fontWeight: 800, color: "#0f766e", fontFamily: "'DM Mono', monospace" }}>{val}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {colVar && !autoStats && (
                <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>⚠ La columna seleccionada tiene menos de 2 valores válidos.</p>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <StepLabel step="Paso 1" label="Estadísticos (entrada manual)" />
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px", lineHeight: 1.5 }}>
                Ingresa el <b>número de casos</b> (sujetos con el evento, x) y el <b>tamaño de muestra</b> (n).
                La variable debe representar un evento binario (presente/ausente).
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Número de casos (x)</label>
                  <input type="number" min="0" step="1" value={manX} onChange={(e: ChangeEvent<HTMLInputElement>) => setManX(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#111827", outline: "none", boxSizing: "border-box", transition: "border .2s" }}
                    onFocus={(e) => (e.target.style.borderColor = "#0d9488")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>x ≥ 0 · Sujetos con el evento (valor=1)</p>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Tamaño de muestra (n)</label>
                  <input type="number" min="2" step="1" value={manN} onChange={(e: ChangeEvent<HTMLInputElement>) => setManN(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#111827", outline: "none", boxSizing: "border-box", transition: "border .2s" }}
                    onFocus={(e) => (e.target.style.borderColor = "#0d9488")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>n ≥ 2 · Total de sujetos estudiados</p>
                </div>
              </div>
              {efectivos && (
                <div style={{ marginTop: 12, padding: "10px 16px", background: "#f0fdf4", border: "1.5px solid #a7f3d0", borderRadius: 10, fontSize: 13, color: "#065f46", display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <span>✓ p̂ = x/n = {efectivos.x}/{efectivos.n} = <b style={{ fontFamily: "'DM Mono', monospace" }}>{fmt3(efectivos.p * 100)}%</b></span>
                </div>
              )}
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
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 20px" }}>
            α = {((100 - nivelConf) / 100).toFixed(4)} &nbsp;·&nbsp; z crítico ≈ {fmt3(norminv(1 - (100 - nivelConf) / 200))}
          </p>

          <Divider />

          <StepLabel step="Paso 3" label="¿Qué desea calcular?" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <CheckRow
              checked={calcIC}
              onChange={setCalcIC}
              label="Intervalo de confianza para P"
              hint="Exacto: Clopper-Pearson  ·  Aproximado: Wald  (p̂ ± z·√[p̂(1−p̂)/n])"
            />
            <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", background: "#fafbfc" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
                Contraste de hipótesis:
                <span style={{ fontSize: 11, fontWeight: 400, color: "#9ca3af", marginLeft: 10 }}>H₀: P = P₀ (la proporción no difiere del valor de referencia)</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <CheckRow checked={calcBil} onChange={setCalcBil} label={<>Bilateral &nbsp;<span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 12 }}>( H₀: P = P₀ vs. H₁: P ≠ P₀ )</span></>} hint="Detecta diferencias en cualquier dirección. Más recomendado en investigación." indented />
                <CheckRow checked={calcUIzq} onChange={setCalcUIzq} label={<>Unilateral izquierdo &nbsp;<span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 12 }}>( H₀: P = P₀ vs. H₁: P &lt; P₀ )</span></>} hint="Evalúa si la proporción es significativamente menor al valor de referencia." indented />
                <CheckRow checked={calcUDer} onChange={setCalcUDer} label={<>Unilateral derecho &nbsp;<span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 12 }}>( H₀: P = P₀ vs. H₁: P &gt; P₀ )</span></>} hint="Evalúa si la proporción es significativamente mayor al valor de referencia." indented />
              </div>
            </div>
          </div>

          {algunContrastes && (
            <div style={{ marginTop: 16, padding: "16px 18px", background: "#fafbfc", border: "1.5px solid #e5e7eb", borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>
                    Valor a contrastar (P₀): &nbsp;
                    <span style={{ fontWeight: 400, color: "#6b7280", fontSize: 12 }}>Proporción de referencia en porcentaje (0–100)</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="number" min="0" max="100" step="any" value={p0Pct} onChange={(e: ChangeEvent<HTMLInputElement>) => setP0Pct(e.target.value)}
                      style={{ padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#111827", width: 140, outline: "none", transition: "border .2s" }}
                      onFocus={(e) => (e.target.style.borderColor = "#0d9488")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#6b7280" }}>%</span>
                    {efectivos && (
                      <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "'DM Mono', monospace", background: "white", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                        p̂ − P₀ = {fmt3(efectivos.p * 100 - (parseFloat(p0Pct) || 0))}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Divider />

          <StepLabel step="Paso 4" label="Método de cálculo" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <CheckRow
              checked={metExacto}
              onChange={setMetExacto}
              label="Exacto — Clopper-Pearson"
              hint="Usa la distribución binomial exacta. Recomendado cuando n es pequeño (n<30) o p̂ está cercana a 0 o 1. Siempre válido."
            />
            <CheckRow
              checked={metAprox}
              onChange={setMetAprox}
              label="Aproximación normal — Wald"
              hint="Usa la distribución normal estándar (Z). Válido cuando np̂≥5 y n(1−p̂)≥5. Produce el estadístico Z publicable."
            />
          </div>
          {!algunMetodo && (
            <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>⚠ Selecciona al menos un método de cálculo.</p>
          )}

          {metAprox && efectivos && (
            <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#f9fafb", fontSize: 12, color: "#6b7280", display: "flex", gap: 20, flexWrap: "wrap" }}>
              <span>np̂ = {fmt3(efectivos.n * efectivos.p)} {efectivos.n * efectivos.p >= 5 ? "✓ ≥ 5" : "⚠ < 5 (aprox. no recomendada)"}</span>
              <span>n(1−p̂) = {fmt3(efectivos.n * (1 - efectivos.p))} {efectivos.n * (1 - efectivos.p) >= 5 ? "✓ ≥ 5" : "⚠ < 5 (aprox. no recomendada)"}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCalc} disabled={!puedeCalcular || load} className="hov-btn" style={{ flex: 1, padding: "13px 20px", borderRadius: 12, border: "none", cursor: puedeCalcular && !load ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: puedeCalcular ? "linear-gradient(135deg,#14b8a6,#0d9488)" : "#e5e7eb", color: puedeCalcular ? "white" : "#9ca3af", boxShadow: puedeCalcular ? "0 4px 14px rgba(13,148,136,.28)" : "none", transition: "all .25s" }}>
            {load ? <><Spin /> Calculando...</> : <><Icon d={IC_SVG.calc} size={16} /> {hayResultados ? "Recalcular" : "Calcular"}</>}
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

        {hayResultados && (
          <div style={{ marginTop: 30, animation: "slideUp .4s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "16px 22px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
                {[
                  ["Variable", varLabel],
                  ["x", fmtN(srcData!.x)],
                  ["n", fmtN(srcData!.n)],
                  ["p̂", `${fmt3(srcData!.pHat * 100)}%`],
                  ["P₀", `${p0Pct}%`],
                  ["NC", `${nivelConf}%`],
                ].map(([k, v]) => (
                  <span key={k} style={{ whiteSpace: "nowrap" }}>
                    <span style={{ color: "#6b7280" }}>{k}:</span>{" "}
                    <b style={{ fontFamily: "'DM Mono', monospace" }}>{v}</b>
                  </span>
                ))}
              </div>

              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={interpretarIA} disabled={iaLoad} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #a855f7", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fdf4ff", color: "#7c3aed", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  {iaLoad ? <><Spin sm /> Interpretando...</> : <><Icon d={IC_SVG.ai} size={14} /> Interpretar con IA</>}
                </button>
                <button onClick={() => exportarExcel(resExacto, resAprox, varLabel, nivelConf, p0Pct)} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #0d9488", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#0d9488", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  <Icon d={IC_SVG.dl} /> Descargar Excel
                </button>
                <button onClick={() => exportarWord(resExacto, resAprox, varLabel, nivelConf, p0Pct)} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #3b82f6", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#3b82f6", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
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
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#4c1d95" }}>Interpretación del Asistente IA</span>
                  </div>
                  <button onClick={() => setIaOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", display: "flex", padding: 4, borderRadius: 6 }}>
                    <Icon d={IC_SVG.x} />
                  </button>
                </div>
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #ddd6fe", padding: "18px 22px", minHeight: 140, maxHeight: 380, overflowY: "auto", lineHeight: 1.8, fontSize: 14, color: "#374151" }}>
                  {iaLoad
                    ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 110, gap: 12 }}><Spin /><span style={{ color: "#9ca3af", fontSize: 13 }}>Analizando resultados estadísticos...</span></div>
                    : iaText
                      ? <div style={{ whiteSpace: "pre-wrap" }}>{iaText}</div>
                      : <span style={{ color: "#9ca3af" }}>El análisis aparecerá aquí...</span>
                  }
                </div>
                {iaText && !iaLoad && (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => onContinuarChat ? onContinuarChat(iaText) : alert("Conecta el prop onContinuarChat.")} className="hov-btn" style={{ padding: "9px 18px", borderRadius: 10, border: "2px solid #7c3aed", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                      <Icon d={IC_SVG.chat} size={14} /> Continuar al chat
                    </button>
                  </div>
                )}
              </div>
            )}

            {resExacto && (
              <BloqueMetodo
                res={resExacto}
                nc={nivelConf}
                p0Pct={p0Pct}
                tituloMetodo="Método exacto — Clopper-Pearson"
                colorAccent="#0d9488"
              />
            )}
            {resAprox && (
              <BloqueMetodo
                res={resAprox}
                nc={nivelConf}
                p0Pct={p0Pct}
                tituloMetodo="Método aproximado — Distribución Normal (Wald)"
                colorAccent="#3b82f6"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
