import React, { useMemo, useState, type ReactNode, type ChangeEvent } from "react";

type DataRow = Record<string, unknown>;

interface FilterRule {
  id: string;
  col: string;
  op: string;
  val: string;
}

interface EstadisticosIndividualesProp {
  x1: number;
  n1: number;
  p1: number;
  x2: number;
  n2: number;
  p2: number;
}

interface ResultadosProporcionesIndependientes {
  x1: number;
  n1: number;
  p1: number;
  x2: number;
  n2: number;
  p2: number;

  diff: number;
  nc: number;

  ic_lower: number;
  ic_upper: number;

  z_stat: number;
  p_bil: number;
  p_izq: number;
  p_der: number;

  calcBil: boolean;
  calcUIzq: boolean;
  calcUDer: boolean;
  calcIC: boolean;

  eventoLabel: string;
  grupoLabel: string;
  grupo1Label: string;
  grupo2Label: string;
  filterDesc?: string;

  indiv?: EstadisticosIndividualesProp;
}

interface InferenciaProporcionesIndependientesProps {
  datosExcel?: DataRow[] | null;
  loadingExcel?: boolean;
  onBack: () => void;
  onContinuarChat?: ((texto: string) => void) | null;
}

interface IconProps {
  d: string;
  size?: number;
  stroke?: string;
  strokeWidth?: string;
}

interface StepLabelProps {
  step: string;
  label: string;
  info?: ReactNode;
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

/* ═══════════════════════════════════════════════════════════════════════════
   FUNCIONES MATEMÁTICAS BASE
   ═══════════════════════════════════════════════════════════════════════════ */

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return sign * y;
}

function normalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];

  const plow = 0.02425;
  const phigh = 1 - plow;

  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  if (p > phigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS DE DATOS
   ═══════════════════════════════════════════════════════════════════════════ */

function parseNumeric(value: unknown): number | "missing" | "invalid" {
  if (value === null || value === undefined) return "missing";
  if (typeof value === "string" && value.trim() === "") return "missing";
  const n = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(n)) return "invalid";
  return n;
}

function parseBinary01(value: unknown): 0 | 1 | "missing" | "invalid" {
  const n = parseNumeric(value);
  if (n === "missing" || n === "invalid") return n;
  if (n === 0 || n === 1) return n;
  return "invalid";
}

function parseText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const txt = String(value).trim();
  return txt === "" ? null : txt;
}

function parseEntero(value: string): number | null {
  if (!value.trim()) return null;
  const clean = value.replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
  const n = Number(clean);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

function colEsBinaria01(datos: DataRow[], col: string): boolean {
  if (!datos?.length || !col) return false;
  let validCount = 0;
  for (const row of datos) {
    const p = parseBinary01(row[col]);
    if (p === "invalid") return false;
    if (p === 0 || p === 1) validCount++;
  }
  return validCount >= 2;
}

function obtenerNivelesDicotomicos(datos: DataRow[], col: string): string[] {
  if (!datos?.length || !col) return [];
  const levels: string[] = [];
  for (const row of datos) {
    const txt = parseText(row[col]);
    if (!txt) continue;
    if (!levels.includes(txt)) levels.push(txt);
    if (levels.length > 2) return [];
  }
  return levels.length === 2 ? levels : [];
}

function colEsDicotomica(datos: DataRow[], col: string): boolean {
  return obtenerNivelesDicotomicos(datos, col).length === 2;
}

function evalRule(rowVal: unknown, rule: FilterRule) {
  if (rowVal === null || rowVal === undefined || String(rowVal).trim() === "") return false;

  const v1 = String(rowVal).trim();
  const v2 = String(rule.val).trim();

  const n1 = Number(v1.replace(",", "."));
  const n2 = Number(v2.replace(",", "."));
  const isNum = !isNaN(n1) && !isNaN(n2);

  const a = isNum ? n1 : v1.toLowerCase();
  const b = isNum ? n2 : v2.toLowerCase();

  switch (rule.op) {
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
   LÓGICA PRINCIPAL: COMPARACIÓN DE PROPORCIONES INDEPENDIENTES
   ═══════════════════════════════════════════════════════════════════════════ */

function calcProporcionesIndependientes(
  x1: number, n1: number, x2: number, n2: number, nc: number,
  calcBil: boolean, calcUIzq: boolean, calcUDer: boolean, calcIC: boolean,
  eventoLabel: string, grupoLabel: string, grupo1Label: string, grupo2Label: string,
  filterDesc?: string
): ResultadosProporcionesIndependientes {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const diff = p2 - p1;
  const alpha = (100 - nc) / 100;

  const zCrit = normInv(1 - alpha / 2);
  const seIC = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const ic_lower = diff - zCrit * seIC;
  const ic_upper = diff + zCrit * seIC;

  const pPool = (x1 + x2) / (n1 + n2);
  const seH0 = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  const z_stat = seH0 === 0 ? 0 : diff / seH0;

  const p_bil = 2 * (1 - normalCDF(Math.abs(z_stat)));
  const p_izq = normalCDF(z_stat);
  const p_der = 1 - normalCDF(z_stat);

  return {
    x1, n1, p1, x2, n2, p2,
    diff, nc,
    ic_lower, ic_upper,
    z_stat, p_bil, p_izq, p_der,
    calcBil, calcUIzq, calcUDer, calcIC,
    eventoLabel, grupoLabel, grupo1Label, grupo2Label, filterDesc,
    indiv: { x1, n1, p1, x2, n2, p2 },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   FORMATEADORES
   ═══════════════════════════════════════════════════════════════════════════ */

const fmt3 = (v: number) => (isFinite(v) ? v.toFixed(3).replace(".", ",") : "-");
const fmt4 = (v: number) => (isFinite(v) ? v.toFixed(4).replace(".", ",") : "-");
const fmtPct = (v: number) => (isFinite(v) ? (v * 100).toFixed(3).replace(".", ",") : "-");
const fmtP = (p: number) => (!isFinite(p) ? "-" : p < 0.001 ? "0,000" : p.toFixed(3).replace(".", ","));
const fmtN = (n: number) => Number.isInteger(n) ? n.toLocaleString("es-ES") : String(n);

function buildResumenIA(res: ResultadosProporcionesIndependientes): string {
  const dir = res.diff > 0
    ? `la frecuencia del evento es mayor en ${res.grupo2Label} que en ${res.grupo1Label}`
    : res.diff < 0
      ? `la frecuencia del evento es menor en ${res.grupo2Label} que en ${res.grupo1Label}`
      : `la frecuencia del evento es igual en ambos grupos`;

  let txt = `Inferencia. Comparación de proporciones independientes\n`;
  txt += `Variable de evento (resumir): ${res.eventoLabel}\n`;
  txt += `Variable de grupos: ${res.grupoLabel}\n`;
  txt += `Grupo 1: ${res.grupo1Label}\n`;
  txt += `Grupo 2: ${res.grupo2Label}\n`;
  if (res.filterDesc) txt += `Filtro aplicado: ${res.filterDesc}\n`;
  txt += `\n`;
  txt += `${res.grupo1Label}: ${fmtN(res.x1)} casos de ${fmtN(res.n1)} observaciones válidas (${fmtPct(res.p1)}%)\n`;
  txt += `${res.grupo2Label}: ${fmtN(res.x2)} casos de ${fmtN(res.n2)} observaciones válidas (${fmtPct(res.p2)}%)\n`;
  txt += `Diferencia de proporciones (P2 - P1) = ${fmt4(res.diff)}\n`;

  if (res.calcIC) {
    txt += `IC ${res.nc}% para la diferencia: [${fmt4(res.ic_lower)} ; ${fmt4(res.ic_upper)}]\n`;
  }
  if (res.calcBil) {
    txt += `Prueba Z bilateral: Z = ${fmt3(res.z_stat)}, p = ${fmtP(res.p_bil)}\n`;
  }
  if (res.calcUIzq) {
    txt += `Prueba Z unilateral izquierda: Z = ${fmt3(res.z_stat)}, p = ${fmtP(res.p_izq)}\n`;
  }
  if (res.calcUDer) {
    txt += `Prueba Z unilateral derecha: Z = ${fmt3(res.z_stat)}, p = ${fmtP(res.p_der)}\n`;
  }

  txt += `\nLectura preliminar: ${dir}.\n`;
  txt += `\nINSTRUCCIONES PARA LA IA: Interpreta estos resultados en lenguaje clínico y académico, no solo estadístico. Explica qué se está comparando, cuál grupo presenta mayor o menor frecuencia del evento, si la diferencia parece estadísticamente significativa según el valor p y si el intervalo de confianza incluye o no el cero. Evita jerga innecesaria y redacta en prosa clara y concisa.`;
  return txt;
}

function buildInterpretacionClinica(res: ResultadosProporcionesIndependientes): string {
  const alpha = (100 - res.nc) / 100;
  const diffPp = Math.abs(res.diff * 100);
  const lowerPp = res.ic_lower * 100;
  const upperPp = res.ic_upper * 100;

  const grupoMayor = res.diff > 0 ? res.grupo2Label : res.diff < 0 ? res.grupo1Label : null;
  const grupoMenor = res.diff > 0 ? res.grupo1Label : res.diff < 0 ? res.grupo2Label : null;

  const icIncluyeCero = res.calcIC ? res.ic_lower <= 0 && res.ic_upper >= 0 : null;
  const bilSig = res.calcBil ? res.p_bil < alpha : null;
  const izqSig = res.calcUIzq ? res.p_izq < alpha : null;
  const derSig = res.calcUDer ? res.p_der < alpha : null;

  let txt = `Se comparó la proporción del evento ${res.eventoLabel} entre ${res.grupo1Label} y ${res.grupo2Label}. `;
  txt += `${res.grupo1Label} presentó ${fmtPct(res.p1)}% (${fmtN(res.x1)}/${fmtN(res.n1)}) y ${res.grupo2Label} ${fmtPct(res.p2)}% (${fmtN(res.x2)}/${fmtN(res.n2)}). `;

  if (res.diff === 0) {
    txt += `La diferencia observada fue nula en términos absolutos.`;
  } else {
    txt += `La diferencia absoluta observada fue de ${diffPp.toFixed(2).replace(".", ",")} puntos porcentuales, `;
    txt += `lo que indica una mayor frecuencia del evento en ${grupoMayor} respecto a ${grupoMenor}.`;
  }

  txt += `\n\n`;

  if (res.calcIC) {
    txt += `El intervalo de confianza al ${res.nc}% para la diferencia de proporciones fue de ${fmt4(res.ic_lower)} a ${fmt4(res.ic_upper)} `;
    txt += `(${lowerPp.toFixed(2).replace(".", ",")} a ${upperPp.toFixed(2).replace(".", ",")} puntos porcentuales). `;
    txt += icIncluyeCero
      ? `Como este intervalo incluye el valor 0, los datos son compatibles con ausencia de una diferencia real entre los grupos. `
      : `Como este intervalo no incluye el valor 0, los datos respaldan la existencia de una diferencia entre los grupos. `;
  }

  if (res.calcBil) {
    txt += `En el contraste bilateral, el estadístico Z fue ${fmt3(res.z_stat)} con un valor p de ${fmtP(res.p_bil)}. `;
    txt += bilSig
      ? `Esto aporta evidencia estadística para rechazar la hipótesis nula de igualdad de proporciones al nivel de significancia ${alpha.toFixed(3).replace(".", ",")}. `
      : `Esto no aporta evidencia suficiente para rechazar la hipótesis nula de igualdad de proporciones al nivel de significancia ${alpha.toFixed(3).replace(".", ",")}. `;
  }

  if (!res.calcBil && res.calcUIzq && !res.calcUDer) {
    txt += `En el contraste unilateral izquierdo, el valor p fue ${fmtP(res.p_izq)}. `;
    txt += izqSig
      ? `Esto respalda específicamente la hipótesis direccional de que la proporción en ${res.grupo2Label} es menor que en ${res.grupo1Label}. `
      : `Esto no respalda de forma suficiente la hipótesis direccional de que la proporción en ${res.grupo2Label} es menor que en ${res.grupo1Label}. `;
  }

  if (!res.calcBil && !res.calcUIzq && res.calcUDer) {
    txt += `En el contraste unilateral derecho, el valor p fue ${fmtP(res.p_der)}. `;
    txt += derSig
      ? `Esto respalda específicamente la hipótesis direccional de que la proporción en ${res.grupo2Label} es mayor que en ${res.grupo1Label}. `
      : `Esto no respalda de forma suficiente la hipótesis direccional de que la proporción en ${res.grupo2Label} es mayor que en ${res.grupo1Label}. `;
  }

  if (!res.calcBil && res.calcUIzq && res.calcUDer) {
    txt += `En los contrastes unilaterales, los valores p fueron ${fmtP(res.p_izq)} para la hipótesis P2 < P1 y ${fmtP(res.p_der)} para la hipótesis P2 > P1. `;
    if (izqSig) {
      txt += `La evidencia se orienta hacia una proporción menor en ${res.grupo2Label}. `;
    } else if (derSig) {
      txt += `La evidencia se orienta hacia una proporción mayor en ${res.grupo2Label}. `;
    } else {
      txt += `Ninguna de las dos direcciones mostró evidencia suficiente con el nivel de confianza seleccionado. `;
    }
  }

  txt += `\n\n`;
  txt += `Desde el punto de vista aplicado, este resultado debe leerse como una comparación de frecuencia del evento entre dos poblaciones independientes, no como una medida automática de relevancia clínica. `;
  txt += res.calcIC
    ? `Por eso conviene valorar al mismo tiempo la magnitud de la diferencia observada en puntos porcentuales y la amplitud del intervalo de confianza, ya que ambos ayudan a juzgar si la diferencia es suficientemente precisa y potencialmente importante para la toma de decisiones.`
    : `Por eso conviene valorar no solo el valor p, sino también la magnitud absoluta de la diferencia observada en puntos porcentuales, para decidir si el hallazgo podría tener importancia práctica o clínica.`;

  return txt;
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTACIÓN
   ═══════════════════════════════════════════════════════════════════════════ */

async function exportarExcel(res: ResultadosProporcionesIndependientes): Promise<void> {
  const cssTh = "background-color:#d9d9d9; font-weight:bold; text-align:center; border:1px solid #000; padding:4px;";
  const cssTdNum = "text-align:right; border:1px solid #000; padding:4px;";
  const cssTd = "text-align:left; border:1px solid #000; padding:4px;";

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>`;
  html += `<table style="border-collapse: collapse; font-family: sans-serif;">`;
  html += `<tr><th colspan="4" style="background-color:#0F766E; color:white; font-size:14px; padding:8px; border:1px solid #000;">Inferencia. Comparación de proporciones independientes</th></tr>`;
  html += `<tr><td colspan="4"></td></tr>`;
  html += `<tr><td colspan="4" style="${cssTd}"><b>Variable de evento:</b> ${res.eventoLabel}</td></tr>`;
  html += `<tr><td colspan="4" style="${cssTd}"><b>Variable de grupos:</b> ${res.grupoLabel}</td></tr>`;
  html += `<tr><td colspan="4" style="${cssTd}"><b>Grupo 1:</b> ${res.grupo1Label}</td></tr>`;
  html += `<tr><td colspan="4" style="${cssTd}"><b>Grupo 2:</b> ${res.grupo2Label}</td></tr>`;
  if (res.filterDesc) html += `<tr><td colspan="4" style="${cssTd}"><b>Filtro:</b> ${res.filterDesc}</td></tr>`;
  html += `<tr><td colspan="4"></td></tr>`;

  html += `<tr><th style="${cssTh}"></th><th style="${cssTh}">${res.grupo1Label}</th><th style="${cssTh}">${res.grupo2Label}</th><th style="${cssTh}">Unidad</th></tr>`;
  html += `<tr><td style="${cssTd}">Número de casos</td><td style="${cssTdNum}">${fmtN(res.x1)}</td><td style="${cssTdNum}">${fmtN(res.x2)}</td><td style="${cssTd}">casos</td></tr>`;
  html += `<tr><td style="${cssTd}">Tamaño de muestra</td><td style="${cssTdNum}">${fmtN(res.n1)}</td><td style="${cssTdNum}">${fmtN(res.n2)}</td><td style="${cssTd}">personas</td></tr>`;
  html += `<tr><td style="${cssTd}">Porcentaje</td><td style="${cssTdNum}">${fmtPct(res.p1)}</td><td style="${cssTdNum}">${fmtPct(res.p2)}</td><td style="${cssTd}">%</td></tr>`;
  html += `<tr><td colspan="4"></td></tr>`;

  if (res.calcIC) {
    html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Intervalo de confianza (${res.nc},0%)</td></tr>`;
    html += `<tr><th style="${cssTh}">Diferencia de proporciones</th><th style="${cssTh}">Límite inferior</th><th style="${cssTh}">Límite superior</th><th style="${cssTh}">Unidad</th></tr>`;
    html += `<tr><td style="${cssTdNum}">${fmt4(res.diff)}</td><td style="${cssTdNum}">${fmt4(res.ic_lower)}</td><td style="${cssTdNum}">${fmt4(res.ic_upper)}</td><td style="${cssTd}">proporción</td></tr>`;
    html += `<tr><td colspan="4"></td></tr>`;
  }

  if (res.calcBil || res.calcUIzq || res.calcUDer) {
    html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Prueba de comparación de proporciones</td></tr>`;
    html += `<tr><th style="${cssTh}">Contraste</th><th style="${cssTh}">Estadístico Z</th><th style="${cssTh}">Valor p</th><th style="${cssTh}">Decisión</th></tr>`;
    if (res.calcBil) html += `<tr><td style="${cssTd}">Bilateral</td><td style="${cssTdNum}">${fmt3(res.z_stat)}</td><td style="${cssTdNum}">${fmtP(res.p_bil)}</td><td style="${cssTd}">${res.p_bil < 0.05 ? "Compatible con diferencia" : "Sin evidencia clara de diferencia"}</td></tr>`;
    if (res.calcUIzq) html += `<tr><td style="${cssTd}">Unilateral izquierdo</td><td style="${cssTdNum}">${fmt3(res.z_stat)}</td><td style="${cssTdNum}">${fmtP(res.p_izq)}</td><td style="${cssTd}">${res.p_izq < 0.05 ? "P2 menor que P1" : "No concluyente"}</td></tr>`;
    if (res.calcUDer) html += `<tr><td style="${cssTd}">Unilateral derecho</td><td style="${cssTdNum}">${fmt3(res.z_stat)}</td><td style="${cssTdNum}">${fmtP(res.p_der)}</td><td style="${cssTd}">${res.p_der < 0.05 ? "P2 mayor que P1" : "No concluyente"}</td></tr>`;
  }

  html += `</table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comparacion_proporciones_independientes_${Date.now()}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportarWord(res: ResultadosProporcionesIndependientes): void {
  const css = {
    th: "background:#d9d9d9;border:1px solid #000;padding:7px 12px;font-weight:bold;text-align:center;font-family:'Calibri',sans-serif;font-size:11pt",
    td: "border:1px solid #000;padding:6px 12px;text-align:right;font-family:'Calibri',sans-serif;font-size:11pt",
    td0: "border:1px solid #000;padding:6px 12px;text-align:left;font-family:'Calibri',sans-serif;font-size:11pt",
    tbl: "border-collapse:collapse;width:100%;margin-bottom:14pt",
    h2: "font-family:'Calibri',sans-serif;font-size:14pt;font-weight:bold;margin-top:12pt;margin-bottom:4pt",
    h3: "font-family:'Calibri',sans-serif;font-size:12pt;font-weight:bold;margin-top:10pt;margin-bottom:4pt",
    p: "font-family:'Calibri',sans-serif;font-size:11pt;color:#000;margin:3pt 0",
  };

  let html = `<h2 style="${css.h2}">Inferencia. Comparación de proporciones independientes</h2>`;
  html += `<p style="${css.p}"><b>Variable de evento:</b> ${res.eventoLabel}</p>`;
  html += `<p style="${css.p}"><b>Variable de grupos:</b> ${res.grupoLabel}</p>`;
  html += `<p style="${css.p}"><b>Grupo 1:</b> ${res.grupo1Label}</p>`;
  html += `<p style="${css.p}"><b>Grupo 2:</b> ${res.grupo2Label}</p>`;
  if (res.filterDesc) html += `<p style="${css.p}"><b>Filtro:</b> ${res.filterDesc}</p>`;

  html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}"></th><th style="${css.th}">${res.grupo1Label}</th><th style="${css.th}">${res.grupo2Label}</th></tr></thead><tbody>`;
  html += `<tr><td style="${css.td0}">Número de casos</td><td style="${css.td}">${fmtN(res.x1)}</td><td style="${css.td}">${fmtN(res.x2)}</td></tr>`;
  html += `<tr><td style="${css.td0}">Tamaño de muestra</td><td style="${css.td}">${fmtN(res.n1)}</td><td style="${css.td}">${fmtN(res.n2)}</td></tr>`;
  html += `<tr><td style="${css.td0}">Porcentaje (%)</td><td style="${css.td}">${fmtPct(res.p1)}</td><td style="${css.td}">${fmtPct(res.p2)}</td></tr>`;
  html += `</tbody></table>`;

  if (res.calcIC) {
    html += `<h3 style="${css.h3}">Intervalo de confianza (${res.nc},0%)</h3>`;
    html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Diferencia de proporciones</th><th style="${css.th}">Límite inferior</th><th style="${css.th}">Límite superior</th></tr></thead><tbody>`;
    html += `<tr><td style="${css.td}">${fmt4(res.diff)}</td><td style="${css.td}">${fmt4(res.ic_lower)}</td><td style="${css.td}">${fmt4(res.ic_upper)}</td></tr>`;
    html += `</tbody></table>`;
  }

  if (res.calcBil || res.calcUIzq || res.calcUDer) {
    html += `<h3 style="${css.h3}">Prueba de comparación de proporciones</h3>`;
    html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Contraste</th><th style="${css.th}">Estadístico Z</th><th style="${css.th}">Valor p</th></tr></thead><tbody>`;
    if (res.calcBil) html += `<tr><td style="${css.td0}">Bilateral</td><td style="${css.td}">${fmt3(res.z_stat)}</td><td style="${css.td}">${fmtP(res.p_bil)}</td></tr>`;
    if (res.calcUIzq) html += `<tr><td style="${css.td0}">Unilateral izquierdo</td><td style="${css.td}">${fmt3(res.z_stat)}</td><td style="${css.td}">${fmtP(res.p_izq)}</td></tr>`;
    if (res.calcUDer) html += `<tr><td style="${css.td0}">Unilateral derecho</td><td style="${css.td}">${fmt3(res.z_stat)}</td><td style="${css.td}">${fmtP(res.p_der)}</td></tr>`;
    html += `</tbody></table>`;
  }

  const blob = new Blob([
    `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'/><style>body{margin:2cm;}</style></head><body>${html}</body></html>`
  ], { type: "application/msword" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comparacion_proporciones_independientes_${Date.now()}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

const Icon = ({ d, size = 15, stroke = "currentColor", strokeWidth = "2" }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: d }}
  />
);

const IC_SVG = {
  back: "<path d='M19 12H5'/><path d='M12 19l-7-7 7-7'/>",
  dl: "<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/>",
  word: "<path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/>",
  reset: "<path d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'/><path d='M3 3v5h5'/>",
  ai: "<path d='M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z'/>",
  x: "<line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>",
  info: "<circle cx='12' cy='12' r='10'/><path d='M12 16v-4'/><path d='M12 8h.01'/>",
  warn: "<path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>",
  check: "<polyline points='20 6 9 17 4 12'/>",
  filter: "<polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3'/>",
  groups: "<path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/>",
  calc: "<rect x='4' y='2' width='16' height='20' rx='2'/><line x1='8' y1='6' x2='16' y2='6'/><line x1='8' y1='10' x2='8' y2='10.01'/><line x1='12' y1='10' x2='12' y2='10.01'/><line x1='16' y1='10' x2='16' y2='10.01'/><line x1='8' y1='14' x2='8' y2='14.01'/><line x1='12' y1='14' x2='12' y2='14.01'/>",
  chat: "<path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/>",
};

function Spin({ sm }: { sm?: boolean }) {
  const s = sm ? 13 : 16;
  return <span style={{ width: s, height: s, border: `${sm ? 2 : 2.5}px solid rgba(13,148,136,.2)`, borderTopColor: "#0d9488", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block", flexShrink: 0 }} />;
}

function InfoTip({ title, text }: { title: string; text: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title={title}
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          border: "1px solid #99f6e4",
          background: "#ecfeff",
          color: "#0f766e",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
          fontWeight: 800,
          fontSize: 12,
        }}
      >
        i
      </button>
      {open && (
        <div style={{
          position: "absolute",
          top: 28,
          left: 0,
          zIndex: 50,
          width: 280,
          background: "white",
          border: "1px solid #d1fae5",
          boxShadow: "0 10px 30px rgba(0,0,0,.1)",
          borderRadius: 12,
          padding: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#0f766e", marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "#374151" }}>{text}</div>
        </div>
      )}
    </div>
  );
}

function StepLabel({ step, label, info }: StepLabelProps) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#0d9488", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 18, height: 2, background: "#0d9488", borderRadius: 2 }} />
      <span>{step} · {label}</span>
      {info}
    </div>
  );
}

function CheckRow({ checked, onChange, label, hint, indented }: CheckRowProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        cursor: "pointer",
        padding: "11px 16px",
        borderRadius: 11,
        border: `2px solid ${checked ? "#0d9488" : "#e5e7eb"}`,
        background: checked ? "#f0fdf4" : "white",
        transition: "all .18s",
        marginLeft: indented ? 8 : 0,
      }}
    >
      <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? "#0d9488" : "#d1d5db"}`, background: checked ? "#0d9488" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        {checked && <Icon d={IC_SVG.check} size={10} stroke="white" strokeWidth="3" />}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: checked ? "#0f766e" : "#374151", lineHeight: 1.45 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3, lineHeight: 1.45 }}>{hint}</div>}
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

export default function InferenciaProporcionesIndependientes({
  datosExcel = null,
  loadingExcel = false,
  onBack,
  onContinuarChat = null,
}: InferenciaProporcionesIndependientesProps) {
  const [modo, setModo] = useState<"individual" | "resumido">("individual");

  const [colEvento, setColEvento] = useState("");
  const [colGrupo, setColGrupo] = useState("");

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [filterCombo, setFilterCombo] = useState<"AND" | "OR">("AND");
  const [tempRules, setTempRules] = useState<FilterRule[]>([]);
  const [tempCombo, setTempCombo] = useState<"AND" | "OR">("AND");
  const [fCol, setFCol] = useState("");
  const [fOp, setFOp] = useState("=");
  const [fVal, setFVal] = useState("");

  const [manX1, setManX1] = useState("");
  const [manN1, setManN1] = useState("");
  const [manX2, setManX2] = useState("");
  const [manN2, setManN2] = useState("");
  const [manG1, setManG1] = useState("Grupo 1");
  const [manG2, setManG2] = useState("Grupo 2");
  const [manEvento, setManEvento] = useState("Evento");
  const [manGrupo, setManGrupo] = useState("Variable de grupo");

  const [nivelConf, setNivelConf] = useState(95);
  const [calcIC, setCalcIC] = useState(true);
  const [calcBil, setCalcBil] = useState(true);
  const [calcUIzq, setCalcUIzq] = useState(false);
  const [calcUDer, setCalcUDer] = useState(false);

  const [res, setRes] = useState<ResultadosProporcionesIndependientes | null>(null);
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState("");

  const [iaOpen, setIaOpen] = useState(false);
  const [iaLoad, setIaLoad] = useState(false);
  const [iaText, setIaText] = useState("");

  const colsDisp = useMemo(() => datosExcel?.length ? Object.keys(datosExcel[0]) : [], [datosExcel]);
  const colsEventoCompat = useMemo(() => colsDisp.filter(c => colEsBinaria01(datosExcel || [], c)), [colsDisp, datosExcel]);
  const colsGrupoCompat = useMemo(() => colsDisp.filter(c => c !== colEvento && colEsDicotomica(datosExcel || [], c)), [colsDisp, datosExcel, colEvento]);
  const nivelesGrupo = useMemo(() => colGrupo ? obtenerNivelesDicotomicos(datosExcel || [], colGrupo) : [], [datosExcel, colGrupo]);

  const filteredData = useMemo(() => {
    if (!datosExcel?.length) return [] as DataRow[];
    if (filterRules.length === 0) return datosExcel;
    return datosExcel.filter(row => {
      const results = filterRules.map(rule => evalRule(row[rule.col], rule));
      return filterCombo === "AND" ? results.every(Boolean) : results.some(Boolean);
    });
  }, [datosExcel, filterRules, filterCombo]);

  const autoStats = useMemo(() => {
    if (!filteredData.length || !colEvento || !colGrupo || nivelesGrupo.length !== 2) return null;

    const [g1, g2] = nivelesGrupo;
    let x1 = 0;
    let n1 = 0;
    let x2 = 0;
    let n2 = 0;

    filteredData.forEach((row) => {
      const grupoVal = parseText(row[colGrupo]);
      const eventoVal = parseBinary01(row[colEvento]);
      if (!grupoVal) return;
      if (eventoVal === "missing" || eventoVal === "invalid") return;

      if (grupoVal === g1) {
        n1 += 1;
        if (eventoVal === 1) x1 += 1;
      } else if (grupoVal === g2) {
        n2 += 1;
        if (eventoVal === 1) x2 += 1;
      }
    });

    if (n1 === 0 || n2 === 0) return null;

    return {
      x1, n1, p1: x1 / n1,
      x2, n2, p2: x2 / n2,
      eventoLabel: colEvento,
      grupoLabel: colGrupo,
      grupo1Label: `${colGrupo} = ${g1}`,
      grupo2Label: `${colGrupo} = ${g2}`,
      filterDesc: filterRules.length > 0
        ? filterRules.map(r => `${r.col} ${r.op} ${r.val}`).join(` ${filterCombo} `)
        : "Sin filtro",
    };
  }, [filteredData, colEvento, colGrupo, nivelesGrupo, filterRules, filterCombo]);

  const manualStats = useMemo(() => {
    const x1 = parseEntero(manX1);
    const n1 = parseEntero(manN1);
    const x2 = parseEntero(manX2);
    const n2 = parseEntero(manN2);

    if (x1 === null || n1 === null || x2 === null || n2 === null) return null;
    if (x1 < 0 || x2 < 0 || n1 <= 0 || n2 <= 0) return null;
    if (n1 <= x1 || n2 <= x2) return null;

    return {
      x1, n1, p1: x1 / n1,
      x2, n2, p2: x2 / n2,
      eventoLabel: manEvento.trim() || "Evento",
      grupoLabel: manGrupo.trim() || "Variable de grupo",
      grupo1Label: manG1.trim() || "Grupo 1",
      grupo2Label: manG2.trim() || "Grupo 2",
      filterDesc: "No aplica",
    };
  }, [manX1, manN1, manX2, manN2, manEvento, manGrupo, manG1, manG2]);

  const efectivos = modo === "individual" ? autoStats : manualStats;
  const algunContraste = calcBil || calcUIzq || calcUDer;
  const puedeCalcular = !!efectivos && (calcIC || algunContraste);

  function handleCalc() {
    if (!puedeCalcular || !efectivos) return;
    setLoad(true);
    setErr("");
    setRes(null);

    setTimeout(() => {
      try {
        const result = calcProporcionesIndependientes(
          efectivos.x1, efectivos.n1, efectivos.x2, efectivos.n2, nivelConf,
          calcBil, calcUIzq, calcUDer, calcIC,
          efectivos.eventoLabel,
          efectivos.grupoLabel,
          efectivos.grupo1Label,
          efectivos.grupo2Label,
          efectivos.filterDesc,
        );
        setRes(result);
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : "Error desconocido";
        setErr(`Error al calcular: ${msg}`);
      }
      setLoad(false);
    }, 140);
  }

  function handleReset() {
    setColEvento("");
    setColGrupo("");
    setFilterRules([]);
    setManX1("");
    setManN1("");
    setManX2("");
    setManN2("");
    setManG1("Grupo 1");
    setManG2("Grupo 2");
    setManEvento("Evento");
    setManGrupo("Variable de grupo");
    setNivelConf(95);
    setCalcIC(true);
    setCalcBil(true);
    setCalcUIzq(false);
    setCalcUDer(false);
    setRes(null);
    setErr("");
    setIaOpen(false);
    setIaText("");
  }

  function addFilterRule() {
    if (fCol && fVal) {
      setTempRules([...tempRules, { id: Math.random().toString(), col: fCol, op: fOp, val: fVal }]);
      setFVal("");
    }
  }

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
            content: "Eres un bioestadístico experto. Interpreta los resultados de comparación de proporciones independientes para una tesis clínica en máximo 300 palabras.\n\n" + resumen,
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

  const manualConstraintError = useMemo(() => {
    const x1 = parseEntero(manX1);
    const n1 = parseEntero(manN1);
    const x2 = parseEntero(manX2);
    const n2 = parseEntero(manN2);
    if (x1 !== null && n1 !== null && n1 <= x1) return "En el grupo 1, el tamaño de muestra debe ser mayor que el número de casos.";
    if (x2 !== null && n2 !== null && n2 <= x2) return "En el grupo 2, el tamaño de muestra debe ser mayor que el número de casos.";
    return "";
  }, [manX1, manN1, manX2, manN2]);

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f4f6f8", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .hov-btn:hover { opacity:.9; transform:translateY(-1px) }
        .modo-tab:hover { background:#f0fdf4 !important }
        .modal-bg { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:999; animation:fadeIn .2s; }
        .modal-card { background:white; width:90%; max-width:550px; border-radius:16px; padding:24px; box-shadow:0 10px 25px rgba(0,0,0,0.1); animation:slideUp .3s ease; }
      `}</style>

      {isFilterOpen && (
        <div className="modal-bg">
          <div className="modal-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ background: "#3b82f6", borderRadius: 8, padding: 6, color: "white" }}><Icon d={IC_SVG.filter} size={18} /></div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Filtro de datos</h2>
            </div>

            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6, display: "block" }}>Variable</label>
                  <select value={fCol} onChange={(e) => setFCol(e.target.value)} style={{ width: "100%", padding: 10, border: "2px solid #d1d5db", borderRadius: 8, outline: "none", fontFamily: "inherit" }}>
                    <option value="">Seleccionar...</option>
                    {colsDisp.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <select value={fOp} onChange={(e) => setFOp(e.target.value)} style={{ width: "100%", padding: 10, border: "2px solid #d1d5db", borderRadius: 8, outline: "none", fontFamily: "inherit", fontWeight: 700, textAlign: "center" }}>
                    {["=", "≠", "≥", ">", "≤", "<"].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <input value={fVal} onChange={(e) => setFVal(e.target.value)} placeholder="Valor..." style={{ width: "100%", padding: 10, border: "2px solid #d1d5db", borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={addFilterRule} disabled={!fCol || !fVal} className="hov-btn" style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: fCol && fVal ? "#0d9488" : "#d1d5db", color: "white", fontWeight: 700, cursor: fCol && fVal ? "pointer" : "not-allowed" }}>Agregar</button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ width: 140, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fafbfc" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 10, display: "block" }}>Combinar reglas</span>
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
              <button onClick={() => setTempRules([])} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", fontWeight: 600, cursor: "pointer" }}>Limpiar</button>
              <button onClick={() => setIsFilterOpen(false)} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => { setFilterRules(tempRules); setFilterCombo(tempCombo); setIsFilterOpen(false); }} className="hov-btn" style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#3b82f6", color: "white", fontWeight: 700, cursor: "pointer" }}>Aceptar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <button onClick={onBack} style={{ color: "#0d9488", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", border: "none", background: "none", padding: 0, fontFamily: "inherit", fontSize: 13, fontWeight: 500 }}>
            <Icon d={IC_SVG.back} size={14} /> Dos poblaciones
          </button>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#111827", fontWeight: 600 }}>Comparación de proporciones independientes</span>
        </div>

        <div style={{ background: "white", borderRadius: "16px 16px 0 0", padding: "28px 32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 32, borderRadius: 4, background: "#0d9488", flexShrink: 0 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-.02em" }}>Inferencia. Comparación de proporciones independientes</h1>
          </div>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "6px 0 0 14px", lineHeight: 1.5, paddingBottom: 20 }}>
            Compara la frecuencia de un evento entre dos grupos independientes. Útil cuando quieres saber si un desenlace ocurre más en una población que en otra.
          </p>
        </div>

        <div style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", borderTop: "1px solid #a7f3d0", borderBottom: "1px solid #a7f3d0", padding: "13px 22px", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#065f46" }}>
          <span style={{ background: "#0d9488", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}>
            <Icon d={IC_SVG.info} size={13} />
          </span>
          <span style={{ lineHeight: 1.65 }}>
            <b>¿Para qué sirve?</b> Esta función compara dos proporciones independientes usando una variable de evento codificada como 0 y 1, y una variable de grupo con exactamente dos categorías. La diferencia se expresa como P2 − P1 y puede acompañarse de intervalo de confianza y contraste Z.
          </span>
        </div>

        <div style={{ background: "white", borderRadius: "0 0 16px 16px", borderTop: "1px solid #e5e7eb", padding: "26px 28px 24px", boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 0, border: "1.5px solid #e5e7eb", borderRadius: 11, overflow: "hidden", marginBottom: 24, width: "fit-content" }}>
            {[
              ["resumido", "\u270F\uFE0F", "Datos resumidos"],
              ["individual", "\uD83D\uDCCA", "Datos individuales"],
            ].map(([m, emoji, label]) => (
              <button
                key={m}
                className="modo-tab"
                onClick={() => setModo(m as "individual" | "resumido")}
                style={{ padding: "9px 20px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: modo === m ? "#f0fdf4" : "white", color: modo === m ? "#0f766e" : "#6b7280", borderRight: m === "resumido" ? "1.5px solid #e5e7eb" : "none", fontFamily: "inherit", transition: "all .15s", display: "flex", alignItems: "center", gap: 6 }}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          {modo === "individual" ? (
            <div style={{ marginBottom: 22 }}>
              <StepLabel
                step="Paso 1"
                label="Variables compatibles"
                info={<InfoTip title="Variables compatibles" text="Solo se muestran columnas que sí sirven para este análisis. 'Resumir' debe ser una variable codificada con 0 y 1. 'Grupo' debe tener exactamente dos categorías." />}
              />

              {!datosExcel ? (
                <div style={{ padding: "13px 16px", background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 9 }}>
                  <Icon d={IC_SVG.warn} size={14} />
                  {loadingExcel ? "Cargando datos del procesamiento..." : "No hay datos cargados. Sube tu tabla en Procesamiento o usa el modo de Datos resumidos."}
                </div>
              ) : colsEventoCompat.length === 0 || colsGrupoCompat.length === 0 ? (
                <div style={{ padding: "13px 16px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, fontSize: 13, color: "#991b1b", display: "flex", alignItems: "center", gap: 9 }}>
                  <Icon d={IC_SVG.warn} size={14} />
                  No se encontraron combinaciones compatibles. La variable de evento debe contener solo 0 y 1, y la variable de grupo debe ser dicotómica.
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ border: "1.5px solid #dbeafe", background: "#f8fbff", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a" }}>Filtro</span>
                            <InfoTip title="Filtro" text="Sirve para analizar solo una parte de la base. Por ejemplo, puedes comparar proporciones únicamente en mujeres, en mayores de 60 años o en cualquier subgrupo que definas." />
                          </div>
                          <div style={{ fontSize: 12.5, color: filterRules.length > 0 ? "#1d4ed8" : "#6b7280", lineHeight: 1.5 }}>
                            {filterRules.length > 0
                              ? `Activo: ${filterRules.map(r => `${r.col} ${r.op} ${r.val}`).join(` ${filterCombo} `)}`
                              : "No se ha aplicado ningún filtro. Se usará toda la base de datos."}
                          </div>
                        </div>

                        <button onClick={() => { setTempRules(filterRules); setTempCombo(filterCombo); setIsFilterOpen(true); }} className="hov-btn" style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #bfdbfe", background: "white", color: filterRules.length > 0 ? "#1d4ed8" : "#374151", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                          <Icon d={IC_SVG.filter} size={14} /> {filterRules.length > 0 ? "Editar filtro" : "Definir filtro"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                        Variable de evento (resumir)
                        <InfoTip title="Variable de evento" text="Es la variable que representa el evento que quieres comparar. Debe venir codificada como 0 = no y 1 = sí." />
                      </label>
                      <select value={colEvento} onChange={(e) => setColEvento(e.target.value)} style={{ width: "100%", padding: "11px 14px", border: `2px solid ${colEvento ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: colEvento ? "#111827" : "#9ca3af", outline: "none", background: colEvento ? "#f0fdf4" : "white" }}>
                        <option value="">Seleccionar variable 0/1...</option>
                        {colsEventoCompat.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 6 }}>Solo se listan variables compatibles con 0 y 1.</div>
                    </div>

                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                        Variable de grupo (dos categorías)
                        <InfoTip title="Variable de grupo" text="Es la variable que divide la base en dos poblaciones independientes. Solo se muestran columnas con exactamente dos categorías distintas." />
                      </label>
                      <select value={colGrupo} onChange={(e) => setColGrupo(e.target.value)} style={{ width: "100%", padding: "11px 14px", border: `2px solid ${colGrupo ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: colGrupo ? "#111827" : "#9ca3af", outline: "none", background: colGrupo ? "#f0fdf4" : "white" }}>
                        <option value="">Seleccionar variable dicotómica...</option>
                        {colsGrupoCompat.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 6 }}>La columna debe definir exactamente dos grupos.</div>
                    </div>
                  </div>

                  {autoStats && (
                    <div style={{ marginTop: 18 }}>
                      <TablaAcademica
                        titulo={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon d={IC_SVG.groups} size={16} /> Resumen automático de datos válidos</span>}
                        headers={["", autoStats.grupo1Label, autoStats.grupo2Label]}
                        filas={[
                          [{ v: "Número de casos" }, { v: fmtN(autoStats.x1) }, { v: fmtN(autoStats.x2) }],
                          [{ v: "Tamaño de muestra" }, { v: fmtN(autoStats.n1) }, { v: fmtN(autoStats.n2) }],
                          [{ v: "Porcentaje (%)" }, { v: fmtPct(autoStats.p1) }, { v: fmtPct(autoStats.p2) }],
                        ]}
                        nota={<span>Se usan solo observaciones válidas para la variable de evento y la variable de grupo. {filterRules.length > 0 ? `Filtro aplicado: ${autoStats.filterDesc}.` : ""}</span>}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 22 }}>
              <StepLabel
                step="Paso 1"
                label="Ingreso manual"
                info={<InfoTip title="Datos resumidos" text="Usa este modo cuando ya conoces cuántos casos hay en cada grupo y cuál es el tamaño total de muestra de cada uno." />}
              />

              <div style={{ padding: "14px 16px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 12, fontSize: 13, color: "#1d4ed8", lineHeight: 1.6, marginBottom: 16 }}>
                <b>Importante antes de usar datos manuales:</b> el <b>número de casos</b> es la cantidad de personas con evento = 1, mientras que el <b>tamaño de muestra</b> es el total de personas evaluadas en ese grupo. En esta pantalla se exige que el tamaño de muestra sea <b>mayor</b> que el número de casos.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 7, display: "block" }}>Nombre del grupo 1</label>
                  <input value={manG1} onChange={(e) => setManG1(e.target.value)} style={{ width: "100%", padding: 11, border: "2px solid #e5e7eb", borderRadius: 10, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 7, display: "block" }}>Nombre del grupo 2</label>
                  <input value={manG2} onChange={(e) => setManG2(e.target.value)} style={{ width: "100%", padding: 11, border: "2px solid #e5e7eb", borderRadius: 10, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 7, display: "block" }}>Variable de evento</label>
                  <input value={manEvento} onChange={(e) => setManEvento(e.target.value)} style={{ width: "100%", padding: 11, border: "2px solid #e5e7eb", borderRadius: 10, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 7, display: "block" }}>Variable de grupo</label>
                  <input value={manGrupo} onChange={(e) => setManGrupo(e.target.value)} style={{ width: "100%", padding: 11, border: "2px solid #e5e7eb", borderRadius: 10, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 7, display: "block" }}>Casos G1</label>
                  <input value={manX1} onChange={(e) => setManX1(e.target.value)} placeholder="Ej. 197" style={{ width: "100%", padding: 11, border: "2px solid #e5e7eb", borderRadius: 10, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 7, display: "block" }}>Muestra G1</label>
                  <input value={manN1} onChange={(e) => setManN1(e.target.value)} placeholder="Ej. 2204" style={{ width: "100%", padding: 11, border: "2px solid #e5e7eb", borderRadius: 10, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 7, display: "block" }}>Casos G2</label>
                  <input value={manX2} onChange={(e) => setManX2(e.target.value)} placeholder="Ej. 175" style={{ width: "100%", padding: 11, border: "2px solid #e5e7eb", borderRadius: 10, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 7, display: "block" }}>Muestra G2</label>
                  <input value={manN2} onChange={(e) => setManN2(e.target.value)} placeholder="Ej. 1798" style={{ width: "100%", padding: 11, border: "2px solid #e5e7eb", borderRadius: 10, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              </div>

              {manualConstraintError && (
                <div style={{ marginTop: 12, padding: "11px 14px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 10, fontSize: 13 }}>
                  {manualConstraintError}
                </div>
              )}

              {manualStats && (
                <div style={{ marginTop: 18 }}>
                  <TablaAcademica
                    titulo="Vista previa de porcentajes"
                    headers={["", manualStats.grupo1Label, manualStats.grupo2Label]}
                    filas={[
                      [{ v: "Número de casos" }, { v: fmtN(manualStats.x1) }, { v: fmtN(manualStats.x2) }],
                      [{ v: "Tamaño de muestra" }, { v: fmtN(manualStats.n1) }, { v: fmtN(manualStats.n2) }],
                      [{ v: "Porcentaje (%)" }, { v: fmtPct(manualStats.p1) }, { v: fmtPct(manualStats.p2) }],
                    ]}
                  />
                </div>
              )}
            </div>
          )}

          <StepLabel step="Paso 2" label="Nivel de confianza" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            {[90, 95, 99].map((nc) => (
              <button key={nc} onClick={() => setNivelConf(nc)} style={{ padding: "9px 20px", borderRadius: 10, border: `2px solid ${nivelConf === nc ? "#0d9488" : "#e5e7eb"}`, background: nivelConf === nc ? "#f0fdf4" : "white", color: nivelConf === nc ? "#065f46" : "#6b7280", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>{nc}%</button>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6, border: "2px solid #e5e7eb", borderRadius: 10, padding: "0 12px", background: "white" }}>
              <input type="number" min={80} max={99.9} step={0.1} value={nivelConf}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNivelConf(Math.min(99.9, Math.max(80, +e.target.value)))}
                style={{ width: 52, border: "none", fontSize: 14, fontWeight: 700, color: "#111827", textAlign: "center", fontFamily: "inherit", background: "transparent", outline: "none" }} />
              <span style={{ fontSize: 13, color: "#6b7280" }}>%</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            <div>
              <StepLabel
                step="Paso 3"
                label="Qué deseas calcular"
                info={<InfoTip title="Cálculos disponibles" text="Puedes pedir solo el intervalo, solo uno o más contrastes, o ambos. Los contrastes pueden activarse al mismo tiempo." />}
              />
              <div style={{ display: "grid", gap: 10 }}>
                <CheckRow checked={calcIC} onChange={setCalcIC} label="Intervalo de confianza para P2 − P1" hint="Muestra el rango plausible de la diferencia entre proporciones." />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <StepLabel
              step="Paso 4"
              label="Contrastes de hipótesis"
              info={<InfoTip title="Contrastes de hipótesis" text="Bilateral pregunta si las proporciones son diferentes. Unilateral izquierdo pregunta si P2 es menor que P1. Unilateral derecho pregunta si P2 es mayor que P1." />}
            />
            <div style={{ display: "grid", gap: 10 }}>
              <CheckRow checked={calcBil} onChange={setCalcBil} label={<span>Bilateral ( H₀: P₂ − P₁ = 0 vs. H₁: P₂ − P₁ ≠ 0 )</span>} />
              <CheckRow checked={calcUIzq} onChange={setCalcUIzq} label={<span>Unilateral izquierdo ( H₀: P₂ − P₁ = 0 vs. H₁: P₂ − P₁ &lt; 0 )</span>} />
              <CheckRow checked={calcUDer} onChange={setCalcUDer} label={<span>Unilateral derecho ( H₀: P₂ − P₁ = 0 vs. H₁: P₂ − P₁ &gt; 0 )</span>} />
            </div>
          </div>

          {err && (
            <div style={{ marginBottom: 14, padding: "13px 16px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, fontSize: 13, color: "#991b1b", display: "flex", alignItems: "center", gap: 9 }}>
              <Icon d={IC_SVG.warn} size={14} /> {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleCalc} disabled={!puedeCalcular || load} className="hov-btn" style={{ flex: 1, padding: "13px 20px", borderRadius: 12, border: "none", cursor: puedeCalcular && !load ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: puedeCalcular ? "linear-gradient(135deg,#14b8a6,#0d9488)" : "#e5e7eb", color: puedeCalcular ? "white" : "#9ca3af", boxShadow: puedeCalcular ? "0 4px 14px rgba(13,148,136,.28)" : "none", transition: "all .25s" }}>
              {load ? <><Spin /> Calculando...</> : <><Icon d={IC_SVG.calc} size={16} /> Calcular</>}
            </button>
            <button onClick={handleReset} className="hov-btn" style={{ padding: "13px 18px", borderRadius: 12, border: "2px solid #e5e7eb", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: "white", color: "#6b7280", display: "flex", alignItems: "center", gap: 6, transition: "all .2s" }}>
              <Icon d={IC_SVG.reset} /> Limpiar
            </button>
          </div>
        </div>

        {res && (
          <div style={{ marginTop: 30, animation: "slideUp .4s cubic-bezier(.16,1,.3,1)" }}>

            {/* Controles Externos */}
            <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "16px 22px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>Variables: <b style={{ fontFamily: "'DM Mono', monospace", color: "#111827" }}>{res.eventoLabel} × {res.grupoLabel}</b></span>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={interpretarIA} disabled={iaLoad} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #a855f7", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fdf4ff", color: "#7c3aed", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  {iaLoad ? <><Spin sm /> Interpretando...</> : <><Icon d={IC_SVG.ai} size={14} /> Interpretación por IA</>}
                </button>
                <button onClick={() => void exportarExcel(res)} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #0d9488", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#0d9488", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
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
                  {iaLoad ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 110, gap: 12 }}><Spin /><span style={{ color: "#9ca3af", fontSize: 13 }}>Evaluando proporciones independientes...</span></div> : <div style={{ whiteSpace: "pre-wrap" }}>{iaText}</div>}
                </div>
                {iaText && !iaLoad && (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => onContinuarChat?.(iaText)} className="hov-btn" style={{ padding: "9px 18px", borderRadius: 10, border: "2px solid #7c3aed", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", gap: 7 }}>
                      <Icon d={IC_SVG.chat} size={14} /> Continuar al chat
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,.04)", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ width: 4, height: 18, background: "#0d9488", borderRadius: 2 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Interpretación clínica</span>
              </div>
              <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {buildInterpretacionClinica(res)}
              </div>
            </div>

            <TablaAcademica
              titulo="Porcentaje (%) por población"
              headers={["Población", "Casos", "Tamaño de muestra", "Porcentaje (%)"]}
              filas={[
                [{ v: res.grupo1Label }, { v: fmtN(res.x1) }, { v: fmtN(res.n1) }, { v: fmtPct(res.p1), bold: true }],
                [{ v: res.grupo2Label }, { v: fmtN(res.x2) }, { v: fmtN(res.n2) }, { v: fmtPct(res.p2), bold: true }],
              ]}
              nota={<span>La proporción se calcula como número de casos dividido por tamaño de muestra en cada grupo.</span>}
            />

            {res.calcIC && (
              <TablaAcademica
                titulo={`Intervalo de confianza (${res.nc}%)`}
                headers={["Diferencia de proporciones", "Límite inferior", "Límite superior"]}
                filas={[[{ v: fmt4(res.diff), bold: true }, { v: fmt4(res.ic_lower) }, { v: fmt4(res.ic_upper) }]]}
                nota={<span>La diferencia se expresa como P2 − P1. Si el intervalo incluye 0, la diferencia observada puede ser compatible con ausencia de diferencia real.</span>}
              />
            )}

            {(res.calcBil || res.calcUIzq || res.calcUDer) && (
              <TablaAcademica
                titulo="Prueba de comparación de proporciones"
                headers={["Contraste", "Estadístico Z", "Valor p"]}
                filas={[
                  ...(res.calcBil ? [[{ v: "Bilateral" }, { v: fmt3(res.z_stat) }, { v: fmtP(res.p_bil), bold: true, color: res.p_bil < 0.05 ? "#065f46" : "#374151" }]] : []),
                  ...(res.calcUIzq ? [[{ v: "Unilateral izquierdo" }, { v: fmt3(res.z_stat) }, { v: fmtP(res.p_izq), bold: true, color: res.p_izq < 0.05 ? "#065f46" : "#374151" }]] : []),
                  ...(res.calcUDer ? [[{ v: "Unilateral derecho" }, { v: fmt3(res.z_stat) }, { v: fmtP(res.p_der), bold: true, color: res.p_der < 0.05 ? "#065f46" : "#374151" }]] : []),
                ]}
                nota={<span>El contraste usa estadístico Z bajo H₀: P2 − P1 = 0, con varianza agrupada para la prueba.</span>}
              />
            )}

            <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ width: 4, height: 18, background: "#0d9488", borderRadius: 2 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Lectura rápida</span>
              </div>
              <p style={{ margin: 0, color: "#374151", fontSize: 13.5, lineHeight: 1.65 }}>
                Se comparó la frecuencia de <b>{res.eventoLabel}</b> entre <b>{res.grupo1Label}</b> y <b>{res.grupo2Label}</b>. La diferencia observada fue <b>{fmt4(res.diff)}</b> (P2 − P1), con porcentajes de <b>{fmtPct(res.p1)}%</b> y <b>{fmtPct(res.p2)}%</b>, respectivamente. Esta lectura inicial está pensada para que el usuario entienda qué se está comparando antes de pasar a una interpretación clínica más profunda.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
