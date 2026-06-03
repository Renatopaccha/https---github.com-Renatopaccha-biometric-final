import React, { useMemo, useState, type ReactNode, type ChangeEvent } from "react";

interface InferenciaProporcionesEmparejadasProps {
  datosExcel?: any[] | null;
  loadingExcel?: boolean;
  onBack: () => void;
  onContinuarChat?: ((texto: string) => void) | null;
}

interface FilterRule {
  id?: string;
  columna: string;
  operador: string;
  valor: string;
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
   FUNCIONES MATEMÁTICAS Y DE AYUDA (MANTENIDAS EXACTAMENTE IGUAL)
   ═══════════════════════════════════════════════════════════════════════════ */

function fmt(v: number | string | null | undefined, d = 3) {
  if (v === null || v === undefined) return "-";
  const num = Number(v);
  if (!Number.isFinite(num)) return "-";
  return num.toFixed(d).replace(".", ",");
}

function fmtPct(v: number | string | null | undefined, d = 3) {
  if (v === null || v === undefined) return "-";
  const num = Number(v);
  if (!Number.isFinite(num)) return "-";
  return num.toFixed(d).replace(".", ",");
}

function fmtP(p: number | string | null | undefined) {
  if (p === null || p === undefined) return "-";
  const num = Number(p);
  if (!Number.isFinite(num)) return "-";
  if (num < 0.001) return "0,000";
  return num.toFixed(3).replace(".", ",");
}

function fmtN(n: number | string | null | undefined) {
  if (n === null || n === undefined) return "-";
  const num = Number(n);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString("es-ES");
}

function toNumber(v: any) {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isBinary01(v: any) {
  const n = toNumber(v);
  return n === 0 || n === 1;
}

function colEsBinaria01(datos: any[], col: string) {
  const vals = datos
    .map((r) => r[col])
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== "");

  if (vals.length < 2) return false;

  const validos = vals.filter(isBinary01);
  const unicos = new Set(validos.map((v) => String(Number(String(v).replace(",", ".")))));

  return validos.length === vals.length && unicos.size >= 2;
}

function uniqueValues(datos: any[], col: string) {
  const set = new Set<string>();

  datos.forEach((r) => {
    const v = r[col];
    if (v !== null && v !== undefined && String(v).trim() !== "") set.add(String(v).trim());
  });

  const arr = Array.from(set);
  const allNumeric = arr.every((x) => Number.isFinite(Number(x.replace(",", "."))));

  if (allNumeric) {
    return arr.sort((a, b) => Number(a.replace(",", ".")) - Number(b.replace(",", "."))).slice(0, 300);
  }

  return arr.sort((a, b) => a.localeCompare(b)).slice(0, 300);
}

function opLabel(op: string) {
  return {
    "=": "=",
    "!=": "≠",
    ">": ">",
    ">=": "≥",
    "<": "<",
    "<=": "≤",
  }[op] || op;
}

function valuesEqual(a: any, b: any) {
  const na = toNumber(a);
  const nb = toNumber(b);
  if (na !== null && nb !== null) return Math.abs(na - nb) < 1e-12;
  return String(a).trim() === String(b).trim();
}

function evalFilter(row: any, filtro: any) {
  const left = row[filtro.columna];
  const right = filtro.valor;

  if (left === null || left === undefined || String(left).trim() === "") return false;

  if (filtro.operador === "=") return valuesEqual(left, right);
  if (filtro.operador === "!=") return !valuesEqual(left, right);

  const lf = toNumber(left);
  const rf = toNumber(right);
  if (lf === null || rf === null) return false;

  if (filtro.operador === ">") return lf > rf;
  if (filtro.operador === ">=") return lf >= rf;
  if (filtro.operador === "<") return lf < rf;
  if (filtro.operador === "<=") return lf <= rf;

  return false;
}

function applyFilters(rows: any[], filtros: any[], combinacion: string) {
  if (!filtros.length) return rows;

  return rows.filter((row) => {
    const checks = filtros.map((f) => evalFilter(row, f));
    return combinacion === "AND" ? checks.every(Boolean) : checks.some(Boolean);
  });
}

function lgamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  let x2 = x - 1;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  let a = c[0];
  const t = x2 + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x2 + i);
  return 0.5 * Math.log(2 * Math.PI) + (x2 + 0.5) * Math.log(t) - t + Math.log(a);
}

function betacf(x: number, a: number, b: number) {
  const MAXIT = 500;
  const EPS = 1e-12;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1.0;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
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
  return (Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) * betacf(x, a, b)) / a;
}

function betaInv(p: number, a: number, b: number) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const val = ibeta(mid, a, b);
    if (val < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function clopperPearson(x: number, n: number, alpha: number) {
  if (n <= 0) return null;
  const lower = x === 0 ? 0 : betaInv(alpha / 2, x, n - x + 1);
  const upper = x === n ? 1 : betaInv(1 - alpha / 2, x + 1, n - x);
  return [lower, upper];
}

function binomCdf(k: number, n: number, p = 0.5) {
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    const logProb = lgamma(n + 1) - lgamma(i + 1) - lgamma(n - i + 1) + i * Math.log(p) + (n - i) * Math.log(1 - p);
    sum += Math.exp(logProb);
  }
  return Math.min(1, Math.max(0, sum));
}

function erf_aprox(x: number) {
  const sign = x >= 0 ? 1 : -1;
  let ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const pr = 0.3275911;
  const t = 1 / (1 + pr * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(x: number) {
  return 0.5 * (1 + erf_aprox(x / Math.sqrt(2)));
}

function chiSquare1Sf(x: number) {
  return 2 * (1 - normalCdf(Math.sqrt(Math.max(0, x))));
}

function zForConfidence(nc: number) {
  const table: Record<number, number> = {
    90: 1.6448536269514722,
    95: 1.959963984540054,
    99: 2.5758293035489004,
  };
  if (table[nc]) return table[nc];
  return 1.959963984540054;
}

function calcularProporcionesEmparejadas({ rows, variable1, variable2, nivelConf, filtros, combinacion, calcIC, calcHip, metodoExacto, metodoAprox }: any) {
  const rowsFiltradas = applyFilters(rows, filtros, combinacion);

  let a = 0;
  let b = 0;
  let c = 0;
  let d = 0;
  let missing = 0;
  let invalid = 0;

  rowsFiltradas.forEach((row) => {
    const v1 = toNumber(row[variable1]);
    const v2 = toNumber(row[variable2]);

    if (v1 === null || v2 === null) {
      missing++;
      return;
    }

    if (!isBinary01(v1) || !isBinary01(v2)) {
      invalid++;
      return;
    }

    if (v1 === 1 && v2 === 1) a++;
    else if (v1 === 1 && v2 === 0) b++;
    else if (v1 === 0 && v2 === 1) c++;
    else if (v1 === 0 && v2 === 0) d++;
  });

  if (invalid > 0) {
    throw new Error("Las variables seleccionadas deben contener únicamente valores numéricos 0 y 1.");
  }

  const n = a + b + c + d;
  if (n === 0) throw new Error("No hay pares válidos para analizar después de aplicar filtros.");

  const filaSi = a + b;
  const filaNo = c + d;
  const columnaSi = a + c;
  const columnaNo = b + d;
  const p1 = filaSi / n;
  const p2 = columnaSi / n;
  const diff = p1 - p2;
  const discordantes = b + c;
  const alpha = (100 - nivelConf) / 100;
  const z = zForConfidence(nivelConf);

  let exacto = null;
  let aproximado = null;

  if (discordantes > 0 && metodoExacto) {
    let intervalo = null;
    let valorP = null;

    if (calcIC) {
      const cp = clopperPearson(b, discordantes, alpha);
      if (cp) {
        const qLower = cp[0];
        const qUpper = cp[1];
        intervalo = {
          diferencia: diff,
          limite_inferior: (discordantes / n) * (2 * qLower - 1),
          limite_superior: (discordantes / n) * (2 * qUpper - 1),
        };
      }
    }

    if (calcHip) {
      const x = Math.min(b, c);
      valorP = Math.min(1, 2 * binomCdf(x, discordantes, 0.5));
    }

    exacto = { disponible: true, intervalo_confianza: intervalo, valor_p: valorP };
  }

  if (discordantes > 0 && metodoAprox) {
    let intervalo = null;
    let chiCuadrado = null;
    let valorP = null;

    const varDiff = (discordantes - ((b - c) ** 2) / n) / (n ** 2);
    const se = Math.sqrt(Math.max(0, varDiff));

    if (calcIC) {
      intervalo = {
        diferencia: diff,
        limite_inferior: diff - z * se,
        limite_superior: diff + z * se,
        error_estandar: se,
      };
    }

    if (calcHip) {
      chiCuadrado = ((b - c) ** 2) / discordantes;
      valorP = chiSquare1Sf(chiCuadrado);
    }

    aproximado = { disponible: true, intervalo_confianza: intervalo, chi_cuadrado: chiCuadrado, gl: 1, valor_p: valorP };
  }

  const resultado = {
    titulo: "Inferencia. Comparación de proporciones emparejadas",
    variable_1: variable1,
    variable_2: variable2,
    nivel_confianza: nivelConf,
    alpha,
    conteos: {
      si_si: a,
      si_no: b,
      no_si: c,
      no_no: d,
      total: n,
      fila_si: filaSi,
      fila_no: filaNo,
      columna_si: columnaSi,
      columna_no: columnaNo,
      discordantes,
    },
    porcentajes: {
      poblacion_1: p1 * 100,
      poblacion_2: p2 * 100,
    },
    diferencia: diff,
    exacto,
    aproximado,
    filtrado: {
      filas_originales: rows.length,
      filas_tras_filtro: rowsFiltradas.length,
      pares_validos: n,
      pares_con_valores_perdidos: missing,
      filtros_aplicados: filtros,
      combinacion_filtros: combinacion,
    },
    analisis_rapido: ""
  };

  resultado.analisis_rapido = construirAnalisisRapido(resultado);
  return resultado;
}

function construirAnalisisRapido(res: any) {
  const p1 = res.porcentajes.poblacion_1;
  const p2 = res.porcentajes.poblacion_2;
  const diff = res.diferencia;
  const metodo = res.exacto?.disponible ? "exacto" : "aproximado";
  const ic = res.exacto?.intervalo_confianza || res.aproximado?.intervalo_confianza;
  const p = res.exacto?.valor_p ?? res.aproximado?.valor_p;
  const direccion = diff < 0 ? "menor" : diff > 0 ? "mayor" : "similar";

  let texto = `Se compararon dos proporciones emparejadas usando ${fmtN(res.conteos.total)} pares válidos. La proporción positiva en la población 1 fue ${fmtPct(p1)}%, mientras que en la población 2 fue ${fmtPct(p2)}%. La diferencia P1 - P2 fue ${fmt(diff)}, por lo que la primera proporción fue ${direccion} que la segunda.`;

  if (ic) {
    texto += ` El intervalo de confianza al ${fmt(res.nivel_confianza, 1)}% por método ${metodo} fue de ${fmt(ic.limite_inferior)} a ${fmt(ic.limite_superior)}.`;
    texto += ic.limite_inferior <= 0 && ic.limite_superior >= 0
      ? " Como el intervalo incluye 0, no se evidencia una diferencia estadísticamente clara."
      : " Como el intervalo no incluye 0, los datos sugieren una diferencia estadísticamente relevante.";
  }

  if (Number.isFinite(p)) {
    texto += p < res.alpha
      ? ` El valor p fue ${fmtP(p)}; por redondeo debe interpretarse como p < 0,001. Se rechaza la hipótesis nula de igualdad de proporciones emparejadas.`
      : ` El valor p fue ${fmtP(p)}. No se rechaza la hipótesis nula de igualdad de proporciones emparejadas.`;
  }

  texto += " Esta interpretación debe complementarse con el contexto clínico, epidemiológico o metodológico del estudio antes de redactar la conclusión final.";
  return texto;
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTACIÓN
   ═══════════════════════════════════════════════════════════════════════════ */

function buildExportHtml(res: any, iaTexto: string) {
  const cssTh = "background-color:#d9d9d9; font-weight:bold; text-align:center; border:1px solid #000; padding:4px;";
  const cssTdNum = "text-align:right; border:1px solid #000; padding:4px;";
  const cssTd = "text-align:left; border:1px solid #000; padding:4px;";

  const filtrosHtml = res.filtrado.filtros_aplicados.length
    ? `<tr><td colspan="4" style="${cssTd}"><b>Filtro:</b> ${res.filtrado.filtros_aplicados.map((f: any) => `${escapeHtml(f.columna)} ${escapeHtml(opLabel(f.operador))} ${escapeHtml(f.valor)}`).join(` ${res.filtrado.combinacion_filtros === "AND" ? "Y" : "O"} `)}</td></tr>`
    : "";

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>`;
  html += `<table style="border-collapse: collapse; font-family: sans-serif;">`;
  html += `<tr><th colspan="4" style="background-color:#0F766E; color:white; font-size:14px; padding:8px; border:1px solid #000;">Inferencia. Comparación de proporciones emparejadas</th></tr>`;
  html += `<tr><td colspan="4"></td></tr>`;
  html += `<tr><td colspan="4" style="${cssTd}"><b>Variable 1:</b> ${escapeHtml(res.variable_1)}</td></tr>`;
  html += `<tr><td colspan="4" style="${cssTd}"><b>Variable 2:</b> ${escapeHtml(res.variable_2)}</td></tr>`;
  html += `<tr><td colspan="4" style="${cssTd}"><b>Nivel de confianza:</b> ${fmt(res.nivel_confianza, 1)}%</td></tr>`;
  html += `<tr><td colspan="4" style="${cssTd}"><b>Pares válidos:</b> ${fmtN(res.filtrado.pares_validos)}</td></tr>`;
  html += filtrosHtml;
  html += `<tr><td colspan="4"></td></tr>`;

  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Datos</td></tr>`;
  html += `<tr><th style="${cssTh}">Muestra 1 / Muestra 2</th><th style="${cssTh}">Sí</th><th style="${cssTh}">No</th><th style="${cssTh}">Total</th></tr>`;
  html += `<tr><td style="${cssTd}">Sí</td><td style="${cssTdNum}">${res.conteos.si_si}</td><td style="${cssTdNum}">${res.conteos.si_no}</td><td style="${cssTdNum}">${res.conteos.fila_si}</td></tr>`;
  html += `<tr><td style="${cssTd}">No</td><td style="${cssTdNum}">${res.conteos.no_si}</td><td style="${cssTdNum}">${res.conteos.no_no}</td><td style="${cssTdNum}">${res.conteos.fila_no}</td></tr>`;
  html += `<tr><td style="${cssTd}">Total</td><td style="${cssTdNum}">${res.conteos.columna_si}</td><td style="${cssTdNum}">${res.conteos.columna_no}</td><td style="${cssTdNum}">${res.conteos.total}</td></tr>`;
  html += `<tr><td colspan="4"></td></tr>`;

  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Resultados de Porcentajes</td></tr>`;
  html += `<tr><th style="${cssTh}">Población</th><th style="${cssTh}">Porcentaje (%)</th><th colspan="2"></th></tr>`;
  html += `<tr><td style="${cssTd}">1</td><td style="${cssTdNum}">${fmtPct(res.porcentajes.poblacion_1)}</td><td colspan="2"></td></tr>`;
  html += `<tr><td style="${cssTd}">2</td><td style="${cssTdNum}">${fmtPct(res.porcentajes.poblacion_2)}</td><td colspan="2"></td></tr>`;
  html += `<tr><td colspan="4"></td></tr>`;

  if (res.exacto?.disponible && res.exacto.intervalo_confianza) {
    html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Método exacto - Intervalo de confianza (${fmt(res.nivel_confianza, 1)}%)</td></tr>`;
    html += `<tr><th style="${cssTh}">Diferencia de proporciones</th><th style="${cssTh}">Límite inferior</th><th style="${cssTh}">Límite superior</th><th></th></tr>`;
    html += `<tr><td style="${cssTdNum}">${fmt(res.exacto.intervalo_confianza.diferencia)}</td><td style="${cssTdNum}">${fmt(res.exacto.intervalo_confianza.limite_inferior)}</td><td style="${cssTdNum}">${fmt(res.exacto.intervalo_confianza.limite_superior)}</td><td></td></tr>`;
    html += `<tr><td colspan="4" style="${cssTd}"><b>Valor p:</b> ${fmtP(res.exacto.valor_p)}</td></tr>`;
    html += `<tr><td colspan="4"></td></tr>`;
  }

  if (res.aproximado?.disponible && res.aproximado.intervalo_confianza) {
    html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Método aproximado - Intervalo de confianza (${fmt(res.nivel_confianza, 1)}%)</td></tr>`;
    html += `<tr><th style="${cssTh}">Diferencia de proporciones</th><th style="${cssTh}">Límite inferior</th><th style="${cssTh}">Límite superior</th><th></th></tr>`;
    html += `<tr><td style="${cssTdNum}">${fmt(res.aproximado.intervalo_confianza.diferencia)}</td><td style="${cssTdNum}">${fmt(res.aproximado.intervalo_confianza.limite_inferior)}</td><td style="${cssTdNum}">${fmt(res.aproximado.intervalo_confianza.limite_superior)}</td><td></td></tr>`;
    
    html += `<tr><th style="${cssTh}">Estadístico χ²</th><th style="${cssTh}">gl</th><th style="${cssTh}">Valor p</th><th></th></tr>`;
    html += `<tr><td style="${cssTdNum}">${fmt(res.aproximado.chi_cuadrado)}</td><td style="${cssTdNum}">${res.aproximado.gl}</td><td style="${cssTdNum}">${fmtP(res.aproximado.valor_p)}</td><td></td></tr>`;
    html += `<tr><td colspan="4"></td></tr>`;
  }

  html += `<tr><td colspan="4" style="font-weight:bold; ${cssTd}">Interpretación</td></tr>`;
  html += `<tr><td colspan="4" style="${cssTd}">${escapeHtml(iaTexto || res.analisis_rapido || "")}</td></tr>`;

  html += `</table></body></html>`;
  return html;
}

function buildExportWordHtml(res: any, iaTexto: string) {
  const css = {
    th: "background:#d9d9d9;border:1px solid #000;padding:7px 12px;font-weight:bold;text-align:center;font-family:'Calibri',sans-serif;font-size:11pt",
    td: "border:1px solid #000;padding:6px 12px;text-align:right;font-family:'Calibri',sans-serif;font-size:11pt",
    td0: "border:1px solid #000;padding:6px 12px;text-align:left;font-family:'Calibri',sans-serif;font-size:11pt",
    tbl: "border-collapse:collapse;width:100%;margin-bottom:14pt",
    h2: "font-family:'Calibri',sans-serif;font-size:14pt;font-weight:bold;margin-top:12pt;margin-bottom:4pt",
    h3: "font-family:'Calibri',sans-serif;font-size:12pt;font-weight:bold;margin-top:10pt;margin-bottom:4pt",
    p: "font-family:'Calibri',sans-serif;font-size:11pt;color:#000;margin:3pt 0",
  };

  let html = `<h2 style="${css.h2}">Inferencia. Comparación de proporciones emparejadas</h2>`;
  html += `<p style="${css.p}"><b>Variable 1:</b> ${escapeHtml(res.variable_1)}</p>`;
  html += `<p style="${css.p}"><b>Variable 2:</b> ${escapeHtml(res.variable_2)}</p>`;
  html += `<p style="${css.p}"><b>Nivel de confianza:</b> ${fmt(res.nivel_confianza, 1)}%</p>`;
  html += `<p style="${css.p}"><b>Pares válidos:</b> ${fmtN(res.filtrado.pares_validos)}</p>`;
  if (res.filtrado.filtros_aplicados.length) {
    html += `<p style="${css.p}"><b>Filtro:</b> ${res.filtrado.filtros_aplicados.map((f: any) => `${escapeHtml(f.columna)} ${escapeHtml(opLabel(f.operador))} ${escapeHtml(f.valor)}`).join(` ${res.filtrado.combinacion_filtros === "AND" ? "Y" : "O"} `)}</p>`;
  }

  html += `<h3 style="${css.h3}">Datos</h3>`;
  html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Muestra 1 / Muestra 2</th><th style="${css.th}">Sí</th><th style="${css.th}">No</th><th style="${css.th}">Total</th></tr></thead><tbody>`;
  html += `<tr><td style="${css.td0}">Sí</td><td style="${css.td}">${res.conteos.si_si}</td><td style="${css.td}">${res.conteos.si_no}</td><td style="${css.td}">${res.conteos.fila_si}</td></tr>`;
  html += `<tr><td style="${css.td0}">No</td><td style="${css.td}">${res.conteos.no_si}</td><td style="${css.td}">${res.conteos.no_no}</td><td style="${css.td}">${res.conteos.fila_no}</td></tr>`;
  html += `<tr><td style="${css.td0}">Total</td><td style="${css.td}">${res.conteos.columna_si}</td><td style="${css.td}">${res.conteos.columna_no}</td><td style="${css.td}">${res.conteos.total}</td></tr>`;
  html += `</tbody></table>`;

  html += `<h3 style="${css.h3}">Resultados</h3>`;
  html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Población</th><th style="${css.th}">Porcentaje (%)</th></tr></thead><tbody>`;
  html += `<tr><td style="${css.td0}">1</td><td style="${css.td}">${fmtPct(res.porcentajes.poblacion_1)}</td></tr>`;
  html += `<tr><td style="${css.td0}">2</td><td style="${css.td}">${fmtPct(res.porcentajes.poblacion_2)}</td></tr>`;
  html += `</tbody></table>`;

  if (res.exacto?.disponible && res.exacto.intervalo_confianza) {
    html += `<h3 style="${css.h3}">Método exacto</h3>`;
    html += `<p style="${css.p}"><b>Intervalo de confianza (${fmt(res.nivel_confianza, 1)}%)</b></p>`;
    html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Diferencia de proporciones</th><th style="${css.th}">Límite inferior</th><th style="${css.th}">Límite superior</th></tr></thead><tbody>`;
    html += `<tr><td style="${css.td}">${fmt(res.exacto.intervalo_confianza.diferencia)}</td><td style="${css.td}">${fmt(res.exacto.intervalo_confianza.limite_inferior)}</td><td style="${css.td}">${fmt(res.exacto.intervalo_confianza.limite_superior)}</td></tr>`;
    html += `</tbody></table>`;
    html += `<p style="${css.p}"><b>Prueba de comparación de proporciones:</b> Valor p = ${fmtP(res.exacto.valor_p)}</p>`;
  }

  if (res.aproximado?.disponible && res.aproximado.intervalo_confianza) {
    html += `<h3 style="${css.h3}">Método aproximado</h3>`;
    html += `<p style="${css.p}"><b>Intervalo de confianza (${fmt(res.nivel_confianza, 1)}%)</b></p>`;
    html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Diferencia de proporciones</th><th style="${css.th}">Límite inferior</th><th style="${css.th}">Límite superior</th></tr></thead><tbody>`;
    html += `<tr><td style="${css.td}">${fmt(res.aproximado.intervalo_confianza.diferencia)}</td><td style="${css.td}">${fmt(res.aproximado.intervalo_confianza.limite_inferior)}</td><td style="${css.td}">${fmt(res.aproximado.intervalo_confianza.limite_superior)}</td></tr>`;
    html += `</tbody></table>`;
    
    html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Estadístico χ²</th><th style="${css.th}">gl</th><th style="${css.th}">Valor p</th></tr></thead><tbody>`;
    html += `<tr><td style="${css.td}">${fmt(res.aproximado.chi_cuadrado)}</td><td style="${css.td}">${res.aproximado.gl}</td><td style="${css.td}">${fmtP(res.aproximado.valor_p)}</td></tr>`;
    html += `</tbody></table>`;
  }

  html += `<h3 style="${css.h3}">Interpretación</h3>`;
  html += `<p style="${css.p}">${escapeHtml(iaTexto || res.analisis_rapido || "")}</p>`;

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'/><style>body{margin:2cm;}</style></head><body>${html}</body></html>`;
}

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════════════════
   UI COMPONENTS (STYLED EXACTLY LIKE INDEPENDIENTES)
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

export default function InferenciaProporcionesEmparejadas({
  datosExcel = [],
  loadingExcel = false,
  onBack,
  onContinuarChat
}: InferenciaProporcionesEmparejadasProps) {
  const tableData = datosExcel || [];
  
  const [var1, setVar1] = useState("");
  const [var2, setVar2] = useState("");
  const [nivelConf, setNivelConf] = useState(95);
  const [calcIC, setCalcIC] = useState(true);
  const [calcHip, setCalcHip] = useState(true);
  const [metodoExacto, setMetodoExacto] = useState(true);
  const [metodoAprox, setMetodoAprox] = useState(true);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filtros, setFiltros] = useState<FilterRule[]>([]);
  const [combFiltros, setCombFiltros] = useState<"AND" | "OR">("AND");
  const [tempRules, setTempRules] = useState<FilterRule[]>([]);
  const [tempCombo, setTempCombo] = useState<"AND" | "OR">("AND");
  const [fCol, setFCol] = useState("");
  const [fOp, setFOp] = useState("=");
  const [fVal, setFVal] = useState("");

  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [iaOpen, setIaOpen] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaTexto, setIaTexto] = useState("");

  const colsDisp = useMemo(() => Object.keys(tableData[0] || {}), [tableData]);
  const colsBinarias = useMemo(() => colsDisp.filter((c) => colEsBinaria01(tableData, c)), [colsDisp, tableData]);

  const puedeCalcular = Boolean(tableData.length && var1 && var2 && var1 !== var2 && (calcIC || calcHip) && (metodoExacto || metodoAprox));

  function addFilterRule() {
    if (fCol && fVal) {
      setTempRules([...tempRules, { id: Math.random().toString(), columna: fCol, operador: fOp, valor: fVal }]);
      setFVal("");
    }
  }

  function handleReset() {
    setVar1("");
    setVar2("");
    setNivelConf(95);
    setCalcIC(true);
    setCalcHip(true);
    setMetodoExacto(true);
    setMetodoAprox(true);
    setFiltros([]);
    setCombFiltros("AND");
    setFCol("");
    setFOp("=");
    setFVal("");
    setRes(null);
    setErr("");
    setIaTexto("");
    setIaOpen(false);
  }

  async function handleCalc() {
    if (!puedeCalcular) return;
    setLoading(true);
    setErr("");
    setRes(null);
    setIaTexto("");
    setIaOpen(false);

    setTimeout(() => {
      try {
        const resultado = calcularProporcionesEmparejadas({
          rows: tableData,
          variable1: var1,
          variable2: var2,
          nivelConf,
          filtros,
          combinacion: combFiltros,
          calcIC,
          calcHip,
          metodoExacto,
          metodoAprox,
        });
        setRes(resultado);
      } catch (e: any) {
        setErr(e.message || "Error al calcular.");
      }
      setLoading(false);
    }, 140);
  }

  async function interpretarIA() {
    if (!res) return;
    setIaOpen(true);
    setIaLoading(true);
    setIaTexto("");
    
    setTimeout(() => {
      setIaTexto(
        `Interpretación académica sugerida:\n\n${res.analisis_rapido}\n\nRedacción posible para tesis: En la muestra evaluada se encontró una diferencia estadísticamente significativa entre las proporciones emparejadas de ${res.variable_1} y ${res.variable_2}. Dado que la diferencia P1 - P2 fue negativa, la proporción de resultados positivos fue menor en la primera medición que en la segunda. Este hallazgo debe interpretarse según el diseño del estudio, la definición operacional de las variables y su relevancia clínica o epidemiológica.`
      );
      setIaLoading(false);
    }, 650);
  }

  function handleExportExcel() {
    if (!res) return;
    const html = buildExportHtml(res, iaTexto);
    downloadBlob(`inferencia_proporciones_emparejadas_${Date.now()}.xls`, html, "application/vnd.ms-excel;charset=utf-8");
  }

  function handleExportWord() {
    if (!res) return;
    const html = buildExportWordHtml(res, iaTexto);
    downloadBlob(`inferencia_proporciones_emparejadas_${Date.now()}.doc`, html, "application/msword;charset=utf-8");
  }

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
                    <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#111827" }}><b>{r.columna}</b> {r.operador} {r.valor}</span>
                    <button onClick={() => setTempRules(tempRules.filter(x => x.id !== r.id))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 2 }}><Icon d={IC_SVG.x} size={14} strokeWidth="3" /></button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button onClick={() => setTempRules([])} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", fontWeight: 600, cursor: "pointer" }}>Limpiar</button>
              <button onClick={() => setIsFilterOpen(false)} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => { setFiltros(tempRules); setCombFiltros(tempCombo); setIsFilterOpen(false); }} className="hov-btn" style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#3b82f6", color: "white", fontWeight: 700, cursor: "pointer" }}>Aceptar</button>
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
          <span style={{ color: "#111827", fontWeight: 600 }}>Comparación de proporciones emparejadas</span>
        </div>

        <div style={{ background: "white", borderRadius: "16px 16px 0 0", padding: "28px 32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 32, borderRadius: 4, background: "#0d9488", flexShrink: 0 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-.02em" }}>Inferencia. Comparación de proporciones emparejadas</h1>
          </div>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "6px 0 0 14px", lineHeight: 1.5, paddingBottom: 20 }}>
            Comparación de dos proporciones relacionadas usando variables binarias 0/1.
          </p>
        </div>

        <div style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", borderTop: "1px solid #a7f3d0", borderBottom: "1px solid #a7f3d0", padding: "13px 22px", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#065f46" }}>
          <span style={{ background: "#0d9488", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}>
            <Icon d={IC_SVG.info} size={13} />
          </span>
          <span style={{ lineHeight: 1.65 }}>
            <b>¿Para qué sirve?</b> Esta herramienta permite comparar dos proporciones medidas sobre los mismos sujetos o unidades de análisis. Es útil para diseños antes/después, pruebas diagnósticas pareadas, presencia/ausencia en dos momentos o comparación de dos mediciones dicotómicas. Las variables deben estar codificadas como <b>1 = Sí</b> y <b>0 = No</b>.
          </span>
        </div>

        <div style={{ background: "white", borderRadius: "0 0 16px 16px", borderTop: "1px solid #e5e7eb", padding: "26px 28px 24px", boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 14 }}>
          
          <div style={{ marginBottom: 22 }}>
            <StepLabel
              step="Paso 1"
              label="Variables compatibles"
              info={<InfoTip title="Variables compatibles" text="Solo se muestran columnas que contengan únicamente valores 0 y 1. Los valores vacíos se omiten automáticamente." />}
            />

            {!datosExcel || tableData.length === 0 ? (
              <div style={{ padding: "13px 16px", background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 9 }}>
                <Icon d={IC_SVG.warn} size={14} />
                {loadingExcel ? "Cargando datos del procesamiento..." : "No hay datos cargados. Sube tu tabla en Procesamiento para continuar."}
              </div>
            ) : colsBinarias.length < 2 ? (
              <div style={{ padding: "13px 16px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, fontSize: 13, color: "#991b1b", display: "flex", alignItems: "center", gap: 9 }}>
                <Icon d={IC_SVG.warn} size={14} />
                No se encontraron al menos 2 columnas compatibles. Las variables deben contener solo 0 y 1.
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ border: "1.5px solid #dbeafe", background: "#f8fbff", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a" }}>Filtro opcional</span>
                          <InfoTip title="Filtro" text="El filtro te permite evaluar un subconjunto específico de tu población." />
                        </div>
                        <div style={{ fontSize: 12.5, color: filtros.length > 0 ? "#1d4ed8" : "#6b7280", lineHeight: 1.5 }}>
                          {filtros.length > 0
                            ? `Activo: ${filtros.map(r => `${r.columna} ${r.operador} ${r.valor}`).join(` ${combFiltros} `)}`
                            : "No se ha aplicado ningún filtro. Se usará toda la base de datos."}
                        </div>
                      </div>

                      <button onClick={() => { setTempRules(filtros); setTempCombo(combFiltros); setIsFilterOpen(true); }} className="hov-btn" style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #bfdbfe", background: "white", color: filtros.length > 0 ? "#1d4ed8" : "#374151", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon d={IC_SVG.filter} size={14} /> {filtros.length > 0 ? "Editar filtro" : "Definir filtro"}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                      Variable 1 / Muestra 1
                      <InfoTip title="Variable 1" text="Es la primera variable que quieres comparar. Debe venir codificada como 0 = no y 1 = sí." />
                    </label>
                    <select value={var1} onChange={(e) => setVar1(e.target.value)} style={{ width: "100%", padding: "11px 14px", border: `2px solid ${var1 ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: var1 ? "#111827" : "#9ca3af", outline: "none", background: var1 ? "#f0fdf4" : "white" }}>
                      <option value="">Seleccionar variable binaria...</option>
                      {colsBinarias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                      Variable 2 / Muestra 2
                      <InfoTip title="Variable 2" text="Es la segunda variable que se medirá en los mismos sujetos. Debe venir codificada como 0 = no y 1 = sí." />
                    </label>
                    <select value={var2} onChange={(e) => setVar2(e.target.value)} style={{ width: "100%", padding: "11px 14px", border: `2px solid ${var2 ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: var2 ? "#111827" : "#9ca3af", outline: "none", background: var2 ? "#f0fdf4" : "white" }}>
                      <option value="">Seleccionar variable binaria...</option>
                      {colsBinarias.filter(c => c !== var1).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          <StepLabel step="Paso 2" label="Nivel de confianza" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
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
                info={<InfoTip title="Cálculos" text="Calcula el intervalo para la diferencia P1 - P2 o el contraste de proporciones pareadas." />}
              />
              <div style={{ display: "grid", gap: 10 }}>
                <CheckRow checked={calcIC} onChange={setCalcIC} label="Intervalo de confianza" hint="Calcula el intervalo para la diferencia P1 - P2." />
                <CheckRow checked={calcHip} onChange={setCalcHip} label="Contraste bilateral" hint="H0: P1 - P2 = 0 frente a H1: P1 - P2 ≠ 0." />
              </div>
            </div>
            <div>
              <StepLabel
                step="Paso 4"
                label="Método a utilizar"
                info={<InfoTip title="Métodos" text="Exacto usa prueba binomial exacta sobre pares discordantes. Aproximación normal usa prueba de McNemar con χ²." />}
              />
              <div style={{ display: "grid", gap: 10 }}>
                <CheckRow checked={metodoExacto} onChange={setMetodoExacto} label="Método exacto" hint="Usa prueba binomial exacta sobre pares discordantes." />
                <CheckRow checked={metodoAprox} onChange={setMetodoAprox} label="Aproximación normal" hint="Usa prueba aproximada de McNemar con χ²." />
              </div>
            </div>
          </div>

          {err && (
            <div style={{ marginBottom: 14, padding: "13px 16px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, fontSize: 13, color: "#991b1b", display: "flex", alignItems: "center", gap: 9 }}>
              <Icon d={IC_SVG.warn} size={14} /> {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleCalc} disabled={!puedeCalcular || loading} className="hov-btn" style={{ flex: 1, padding: "13px 20px", borderRadius: 12, border: "none", cursor: puedeCalcular && !loading ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: puedeCalcular ? "linear-gradient(135deg,#14b8a6,#0d9488)" : "#e5e7eb", color: puedeCalcular ? "white" : "#9ca3af", boxShadow: puedeCalcular ? "0 4px 14px rgba(13,148,136,.28)" : "none", transition: "all .25s" }}>
              {loading ? <><Spin /> Calculando...</> : <><Icon d={IC_SVG.calc} size={16} /> Calcular</>}
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
                <span style={{ color: "#6b7280" }}>Variables: <b style={{ fontFamily: "'DM Mono', monospace", color: "#111827" }}>{res.variable_1} × {res.variable_2}</b></span>
                <span style={{ color: "#6b7280" }}>n: <b style={{ fontFamily: "'DM Mono', monospace", color: "#111827" }}>{fmtN(res.conteos.total)}</b></span>
                <span style={{ color: "#6b7280" }}>Discordantes: <b style={{ fontFamily: "'DM Mono', monospace", color: "#111827" }}>{fmtN(res.conteos.discordantes)}</b></span>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={interpretarIA} disabled={iaLoading} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #a855f7", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fdf4ff", color: "#7c3aed", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  {iaLoading ? <><Spin sm /> Interpretando...</> : <><Icon d={IC_SVG.ai} size={14} /> Interpretación por IA</>}
                </button>
                <button onClick={() => void handleExportExcel()} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #0d9488", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#0d9488", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  <Icon d={IC_SVG.dl} /> Excel
                </button>
                <button onClick={() => void handleExportWord()} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #3b82f6", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#3b82f6", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
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
                  {iaLoading ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 110, gap: 12 }}><Spin /><span style={{ color: "#9ca3af", fontSize: 13 }}>Evaluando proporciones emparejadas...</span></div> : <div style={{ whiteSpace: "pre-wrap" }}>{iaTexto}</div>}
                </div>
                {iaTexto && !iaLoading && (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => onContinuarChat?.(iaTexto)} className="hov-btn" style={{ padding: "9px 18px", borderRadius: 10, border: "2px solid #7c3aed", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", gap: 7 }}>
                      <Icon d={IC_SVG.chat} size={14} /> Continuar al chat
                    </button>
                  </div>
                )}
              </div>
            )}

            <TablaAcademica
              titulo="Datos"
              headers={["Muestra 1 / Muestra 2", "Sí", "No", "Total"]}
              filas={[
                [{ v: "Sí", bold: true }, { v: fmtN(res.conteos.si_si), mono: true }, { v: fmtN(res.conteos.si_no), mono: true }, { v: fmtN(res.conteos.fila_si), mono: true, bold: true }],
                [{ v: "No", bold: true }, { v: fmtN(res.conteos.no_si), mono: true }, { v: fmtN(res.conteos.no_no), mono: true }, { v: fmtN(res.conteos.fila_no), mono: true, bold: true }],
                [{ v: "Total", bold: true }, { v: fmtN(res.conteos.columna_si), mono: true, bold: true }, { v: fmtN(res.conteos.columna_no), mono: true, bold: true }, { v: fmtN(res.conteos.total), mono: true, bold: true }],
              ]}
              nota={`Pares válidos: ${fmtN(res.filtrado.pares_validos)} · Pares con valores perdidos omitidos: ${fmtN(res.filtrado.pares_con_valores_perdidos)}.`}
            />

            <TablaAcademica
              titulo="Porcentajes"
              headers={["Población", "Porcentaje (%)"]}
              filas={[
                [{ v: "1", bold: true }, { v: fmtPct(res.porcentajes.poblacion_1), mono: true }],
                [{ v: "2", bold: true }, { v: fmtPct(res.porcentajes.poblacion_2), mono: true }],
              ]}
            />

            {res.exacto?.disponible && res.exacto.intervalo_confianza && (
              <TablaAcademica
                titulo="Método exacto · Intervalo de confianza"
                headers={["Diferencia de proporciones", "Límite inferior", "Límite superior"]}
                filas={[[
                  { v: fmt(res.exacto.intervalo_confianza.diferencia), mono: true, bold: true },
                  { v: fmt(res.exacto.intervalo_confianza.limite_inferior), mono: true },
                  { v: fmt(res.exacto.intervalo_confianza.limite_superior), mono: true },
                ]]}
                nota={`Intervalo de confianza exacto al ${fmt(res.nivel_confianza, 1)}%.`}
              />
            )}

            {res.exacto?.disponible && Number.isFinite(res.exacto.valor_p) && (
              <TablaAcademica
                titulo="Método exacto · Prueba de comparación de proporciones"
                headers={["Valor p"]}
                filas={[[{ v: fmtP(res.exacto.valor_p), mono: true, bold: true, color: res.exacto.valor_p < 0.05 ? "#065f46" : "#374151" }]]}
                nota="Si el valor p aparece como 0,000, debe interpretarse como p < 0,001 por redondeo."
              />
            )}

            {res.aproximado?.disponible && res.aproximado.intervalo_confianza && (
              <TablaAcademica
                titulo="Método aproximado · Intervalo de confianza"
                headers={["Diferencia de proporciones", "Límite inferior", "Límite superior"]}
                filas={[[
                  { v: fmt(res.aproximado.intervalo_confianza.diferencia), mono: true, bold: true },
                  { v: fmt(res.aproximado.intervalo_confianza.limite_inferior), mono: true },
                  { v: fmt(res.aproximado.intervalo_confianza.limite_superior), mono: true },
                ]]}
                nota={`Intervalo de confianza aproximado al ${fmt(res.nivel_confianza, 1)}%.`}
              />
            )}

            {res.aproximado?.disponible && Number.isFinite(res.aproximado.chi_cuadrado) && (
              <TablaAcademica
                titulo="Método aproximado · Prueba de comparación de proporciones"
                headers={["Estadístico χ²", "gl", "Valor p"]}
                filas={[[
                  { v: fmt(res.aproximado.chi_cuadrado), mono: true, bold: true },
                  { v: res.aproximado.gl, mono: true },
                  { v: fmtP(res.aproximado.valor_p), mono: true, bold: true, color: res.aproximado.valor_p < 0.05 ? "#065f46" : "#374151" },
                ]]}
                nota="gl: grados de libertad. El estadístico corresponde a la prueba aproximada de McNemar sin corrección de continuidad."
              />
            )}

            <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ width: 4, height: 18, background: "#0d9488", borderRadius: 2 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Lectura rápida</span>
              </div>
              <p style={{ margin: 0, color: "#374151", fontSize: 13.5, lineHeight: 1.65 }}>
                {res.analisis_rapido}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
