import { useState, useMemo } from "react";
import * as XLSX from "xlsx-js-style";

function lgamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
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
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
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
  return (Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a) * betacf(x, a, b);
}

function tcdf(t: number, df: number) {
  if (!isFinite(t) || df <= 0) return NaN;
  if (t === 0) return 0.5;
  const x = df / (df + t * t);
  const p = 0.5 * ibeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - p : p;
}

function tinv(p: number, df: number) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (Math.abs(p - 0.5) < 1e-15) return 0;
  let lo = p < 0.5 ? -50 : 0;
  let hi = p < 0.5 ? 0 : 50;
  while (tcdf(hi, df) < p) hi *= 2;
  while (tcdf(lo, df) > p) lo = lo < 0 ? lo * 2 : -1;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (tcdf(mid, df) < p) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-12) break;
  }
  return (lo + hi) / 2;
}

function statsArray(arr: any[]) {
  const v = arr.map(Number).filter((x) => isFinite(x) && !isNaN(x));
  const n = v.length;
  if (n < 2) return null;
  const media = v.reduce((a, b) => a + b, 0) / n;
  const de = Math.sqrt(v.reduce((a, b) => a + (b - media) ** 2, 0) / (n - 1));
  return { n, media, de };
}

function colEsNumerica(datos: any[], col: string) {
  if (!datos?.length || !col) return false;
  const vals = datos.map((r) => r[col]).filter((v) => v !== null && v !== undefined && v !== "");
  if (vals.length < 5) return false;
  const numCount = vals.filter((v) => !isNaN(+v) && String(v).trim() !== "").length;
  const unicos = new Set(vals.map(String)).size;
  return numCount / vals.length > 0.85 && unicos > 4;
}

const fmt = (v: number, d = 3) => (isFinite(v) ? v.toFixed(d) : "-");
const fmtP = (p: number) => (!isFinite(p) ? "-" : p.toFixed(3));
const fmtN = (n: number) => (Number.isInteger(n) ? n.toLocaleString("es") : String(n));

function calcularInferencia({ media, de, n, nivelConf, mu0, calcIC, calcBil, calcUIzq, calcUDer }: any) {
  if (!isFinite(media) || !isFinite(de) || !isFinite(n) || n < 2 || de < 0) return null;

  const alpha = (100 - nivelConf) / 100;
  const df = n - 1;
  const EE = de / Math.sqrt(n);
  const tCrit = tinv(1 - alpha / 2, df);
  const tStat = EE > 0 ? (media - mu0) / EE : Infinity;

  const resultado: any = { media, de, n, df, EE, nivelConf, mu0, tCrit, tStat, ic: null, hipotesis: [] };

  if (calcIC) {
    resultado.ic = {
      lower: media - tCrit * EE,
      upper: media + tCrit * EE,
    };
  }

  if (calcBil) {
    resultado.hipotesis.push({
      tipo: "Bilateral",
      h1: `mu != ${fmt(mu0)}`,
      t: tStat,
      df,
      p: 2 * (1 - tcdf(Math.abs(tStat), df)),
    });
  }

  if (calcUIzq) {
    resultado.hipotesis.push({
      tipo: "Unilateral izquierdo",
      h1: `mu < ${fmt(mu0)}`,
      t: tStat,
      df,
      p: tcdf(tStat, df),
    });
  }

  if (calcUDer) {
    resultado.hipotesis.push({
      tipo: "Unilateral derecho",
      h1: `mu > ${fmt(mu0)}`,
      t: tStat,
      df,
      p: 1 - tcdf(tStat, df),
    });
  }

  return resultado;
}

function buildResumenIA(res: any, variable: string) {
  let txt = `Inferencia sobre una media - Variable: ${variable}\n`;
  txt += `Estadisticos: n = ${res.n}, x̄ = ${fmt(res.media)}, s = ${fmt(res.de)}, EE = ${fmt(res.EE)}, gl = ${res.df}\n`;
  txt += `Nivel de confianza: ${res.nivelConf}%, valor critico t = ${fmt(res.tCrit)}\n`;
  if (res.ic) {
    txt += `\nIntervalo de confianza (${res.nivelConf}%):\n`;
    txt += `  Media: ${fmt(res.media)} | Limite inferior: ${fmt(res.ic.lower)} | Limite superior: ${fmt(res.ic.upper)}\n`;
  }
  if (res.hipotesis.length) {
    txt += `\nContraste de hipotesis (mu0 = ${fmt(res.mu0)}):\n`;
    txt += `  Estadistico t = ${fmt(res.tStat, 3)}, gl = ${res.df}\n`;
    res.hipotesis.forEach((h: any) => {
      txt += `  ${h.tipo}: p = ${fmtP(h.p)}\n`;
    });
  }
  return txt;
}

async function exportarExcel(res: any, variable: string) {
  const wb = XLSX.utils.book_new();
  const nc = res.nivelConf;
  const rows: any[] = [];
  const merges: any[] = [];
  const sectionRows: number[] = [];
  const headerRows: number[] = [];

  const addMerge = (r: number, c1: number, c2: number) => merges.push({ s: { r, c: c1 }, e: { r, c: c2 } });
  const push = (row: any[]) => {
    rows.push(row);
    return rows.length - 1;
  };

  let r = push([`Inferencia sobre una Media - Variable: ${variable}`]);
  addMerge(r, 0, 3);
  sectionRows.push(r);

  r = push([`n = ${res.n}   |   x̄ = ${fmt(res.media)}   |   s = ${fmt(res.de)}   |   EE = ${fmt(res.EE)}   |   gl = ${res.df}`]);
  addMerge(r, 0, 3);
  sectionRows.push(r);

  r = push([`Nivel de confianza: ${nc}%   |   valor critico t = ${fmt(res.tCrit)}`]);
  addMerge(r, 0, 3);
  sectionRows.push(r);
  push([]);

  if (res.ic) {
    r = push([`Intervalo de Confianza (${nc}.0%)`]);
    addMerge(r, 0, 3);
    sectionRows.push(r);

    r = push(["Media", `Limite inferior (${nc}%)`, `Limite superior (${nc}%)`, ""]);
    headerRows.push(r);

    push([fmt(res.media), fmt(res.ic.lower), fmt(res.ic.upper), ""]);
    push([]);
  }

  if (res.hipotesis.length) {
    r = push([`Prueba para una Media  (mu0 = ${fmt(res.mu0, 3)})`]);
    addMerge(r, 0, 3);
    sectionRows.push(r);

    r = push(["Contraste", "Estadistico t", "gl", "Valor p"]);
    headerRows.push(r);

    res.hipotesis.forEach((h: any) => push([h.tipo, fmt(h.t, 3), h.df, fmtP(h.p)]));

    push([]);
    r = push(["gl: grados de libertad"]);
    addMerge(r, 0, 3);
    sectionRows.push(r);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 34 }, { wch: 20 }, { wch: 20 }, { wch: 12 }];

  const S: any = {
    title: {
      fill: { fgColor: { rgb: "0F766E" } },
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin", color: { rgb: "0F766E" } }, bottom: { style: "thin", color: { rgb: "0F766E" } }, left: { style: "thin", color: { rgb: "0F766E" } }, right: { style: "thin", color: { rgb: "0F766E" } } },
    },
    section: {
      fill: { fgColor: { rgb: "ECFDF5" } },
      font: { bold: true, color: { rgb: "065F46" }, sz: 10 },
      alignment: { horizontal: "left", vertical: "center" },
      border: { top: { style: "thin", color: { rgb: "A7F3D0" } }, bottom: { style: "thin", color: { rgb: "A7F3D0" } }, left: { style: "thin", color: { rgb: "A7F3D0" } }, right: { style: "thin", color: { rgb: "A7F3D0" } } },
    },
    header: {
      fill: { fgColor: { rgb: "111827" } },
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin", color: { rgb: "111827" } }, bottom: { style: "thin", color: { rgb: "111827" } }, left: { style: "thin", color: { rgb: "111827" } }, right: { style: "thin", color: { rgb: "111827" } } },
    },
    data: {
      font: { color: { rgb: "334155" }, sz: 10 },
      alignment: { horizontal: "right", vertical: "center" },
      border: { top: { style: "thin", color: { rgb: "E5E7EB" } }, bottom: { style: "thin", color: { rgb: "E5E7EB" } }, left: { style: "thin", color: { rgb: "E5E7EB" } }, right: { style: "thin", color: { rgb: "E5E7EB" } } },
    },
    dataLeft: {
      font: { color: { rgb: "334155" }, sz: 10 },
      alignment: { horizontal: "left", vertical: "center" },
      border: { top: { style: "thin", color: { rgb: "E5E7EB" } }, bottom: { style: "thin", color: { rgb: "E5E7EB" } }, left: { style: "thin", color: { rgb: "E5E7EB" } }, right: { style: "thin", color: { rgb: "E5E7EB" } } },
    },
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

  XLSX.utils.book_append_sheet(wb, ws, "Inferencia Media");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inferencia_media_${Date.now()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportarWord(res: any, variable: string) {
  const nc = res.nivelConf;
  const css = {
    th: "background:#d9d9d9;border:1px solid #999;padding:7px 12px;font-weight:bold;text-align:center;font-family:'Calibri',sans-serif;font-size:11pt",
    td: "border:1px solid #ccc;padding:6px 12px;text-align:right;font-family:'Calibri',sans-serif;font-size:11pt",
    td0: "border:1px solid #ccc;padding:6px 12px;text-align:left;font-family:'Calibri',sans-serif;font-size:11pt",
    tbl: "border-collapse:collapse;width:100%;margin-bottom:14pt",
    h2: "font-family:'Calibri',sans-serif;font-size:14pt;font-weight:bold;margin-top:12pt;margin-bottom:4pt",
    h3: "font-family:'Calibri',sans-serif;font-size:12pt;font-weight:bold;margin-top:10pt;margin-bottom:4pt",
    p: "font-family:'Calibri',sans-serif;font-size:11pt;color:#444;margin:3pt 0",
  };

  let html = `<h2 style="${css.h2}">Inferencia sobre una Media</h2>`;
  html += `<p style="${css.p}"><b>Variable:</b> ${variable}</p>`;
  html += `<p style="${css.p}">n = ${res.n} &nbsp;|&nbsp; x&#772; = ${fmt(res.media)} &nbsp;|&nbsp; s = ${fmt(res.de)} &nbsp;|&nbsp; EE = ${fmt(res.EE)} &nbsp;|&nbsp; gl = ${res.df}</p>`;
  html += `<p style="${css.p}">Nivel de confianza: ${nc}% &nbsp;|&nbsp; t critico (${nc}%) = ${fmt(res.tCrit)}</p>`;

  if (res.ic) {
    html += `<h3 style="${css.h3}">Intervalo de Confianza (${nc}.0%)</h3>`;
    html += `<table style="${css.tbl}"><thead><tr>
      <th style="${css.th}">Media</th>
      <th style="${css.th}">Limite inferior (${nc}%)</th>
      <th style="${css.th}">Limite superior (${nc}%)</th>
    </tr></thead><tbody><tr>
      <td style="${css.td}">${fmt(res.media)}</td>
      <td style="${css.td}">${fmt(res.ic.lower)}</td>
      <td style="${css.td}">${fmt(res.ic.upper)}</td>
    </tr></tbody></table>`;
  }

  if (res.hipotesis.length) {
    html += `<h3 style="${css.h3}">Prueba para una Media &nbsp;(mu0 = ${fmt(res.mu0, 3)})</h3>`;
    html += `<table style="${css.tbl}"><thead><tr>
      <th style="${css.th}">Contraste</th>
      <th style="${css.th}">Estadistico t</th>
      <th style="${css.th}">gl</th>
      <th style="${css.th}">Valor p</th>
    </tr></thead><tbody>`;
    res.hipotesis.forEach((h: any) => {
      html += `<tr>
        <td style="${css.td0}">${h.tipo}</td>
        <td style="${css.td}">${fmt(h.t, 3)}</td>
        <td style="${css.td}">${h.df}</td>
        <td style="${css.td}">${fmtP(h.p)}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    html += `<p style="${css.p}"><em>gl: grados de libertad</em></p>`;
  }

  const blob = new Blob(
    [`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'/><style>body{margin:2cm;}</style></head><body>${html}</body></html>`],
    { type: "application/msword" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inferencia_media_${Date.now()}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

const Icon = ({ d, size = 15, stroke = "currentColor" }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
);

const IC = {
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

function StepLabel({ step, label }: any) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#0d9488", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 18, height: 2, background: "#0d9488", borderRadius: 2 }} />
      {step} · {label}
    </div>
  );
}

const Divider = () => <div style={{ height: 1, background: "#f3f4f6", margin: "6px 0 20px" }} />;

function Spin({ sm }: any) {
  const s = sm ? 13 : 16;
  return <span style={{ width: s, height: s, border: `${sm ? 2 : 2.5}px solid rgba(13,148,136,.2)`, borderTopColor: "#0d9488", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block", flexShrink: 0 }} />;
}

function NumInput({ label, value, onChange, hint, ...rest }: any) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
        style={{ width: "100%", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#111827", outline: "none", transition: "border .2s, box-shadow .2s", boxSizing: "border-box" }}
        onFocus={(e) => {
          e.target.style.borderColor = "#0d9488";
          e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,.12)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "#e5e7eb";
          e.target.style.boxShadow = "none";
        }}
      />
      {hint && <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

function CheckRow({ checked, onChange, label, hint, indented }: any) {
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
      <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? "#0d9488" : "#d1d5db"}`, background: checked ? "#0d9488" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all .18s" }}>
        {checked && <Icon d={IC.check} size={10} stroke="white" />}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: checked ? "#0f766e" : "#374151", lineHeight: 1.4 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3, lineHeight: 1.4 }}>{hint}</div>}
      </div>
    </div>
  );
}

function TablaAcademica({ titulo, headers, filas, nota }: any) {
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
              {headers.map((h: any, i: number) => (
                <th key={i} style={{ padding: "9px 14px", textAlign: i === 0 && headers.length > 2 ? "left" : "right", fontWeight: 700, fontSize: 11, color: "#374151", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "2.5px solid #111827", borderTop: "2px solid #111827", background: "white", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila: any, ri: number) => (
              <tr key={ri} className="hov-row" style={{ background: ri % 2 === 0 ? "white" : "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {fila.map((cel: any, ci: number) => (
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

interface InferenciaMediaProps {
  datosExcel?: any[] | null;
  loadingExcel?: boolean;
  onBack?: () => void;
  onContinuarChat?: ((texto: string) => void) | null;
}

export default function InferenciaMedia({ datosExcel = null, loadingExcel = false, onBack, onContinuarChat = null }: InferenciaMediaProps) {
  const [modo, setModo] = useState("individual");
  const [colVar, setColVar] = useState("");
  const [manMedia, setManMedia] = useState("");
  const [manDE, setManDE] = useState("");
  const [manN, setManN] = useState("");
  const [nivelConf, setNivel] = useState(95);
  const [mu0, setMu0] = useState("0");
  const [calcIC, setCalcIC] = useState(true);
  const [calcBil, setCalcBil] = useState(true);
  const [calcUIzq, setCalcUIzq] = useState(false);
  const [calcUDer, setCalcUDer] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState("");
  const [iaOpen, setIaOpen] = useState(false);
  const [iaLoad, setIaLoad] = useState(false);
  const [iaText, setIaText] = useState("");

  const colsNum = useMemo(() => {
    if (!datosExcel?.length) return [];
    return Object.keys(datosExcel[0]).filter((c) => colEsNumerica(datosExcel, c));
  }, [datosExcel]);

  const autoStats = useMemo(() => {
    if (!datosExcel?.length || !colVar) return null;
    const vals = datosExcel.map((r) => r[colVar]).filter((v) => v !== null && v !== undefined && v !== "");
    return statsArray(vals);
  }, [datosExcel, colVar]);

  const efectivos = useMemo(() => {
    if (modo === "individual") return autoStats;
    const m = parseFloat(manMedia);
    const d = parseFloat(manDE);
    const n = parseInt(manN, 10);
    if (isFinite(m) && isFinite(d) && isFinite(n) && n >= 2 && d >= 0) return { media: m, de: d, n };
    return null;
  }, [modo, autoStats, manMedia, manDE, manN]);

  const algunContrastes = calcBil || calcUIzq || calcUDer;
  const puedeCalcular = !!efectivos && (calcIC || algunContrastes);
  const varLabel = modo === "individual" && colVar ? colVar : "Datos resumidos";

  function handleCalc() {
    if (!puedeCalcular) return;
    setLoad(true);
    setErr("");
    setRes(null);
    setIaOpen(false);
    setIaText("");
    setTimeout(() => {
      try {
        const r = calcularInferencia({
          ...efectivos,
          nivelConf,
          mu0: parseFloat(mu0) || 0,
          calcIC,
          calcBil,
          calcUIzq,
          calcUDer,
        });
        if (!r) setErr("Datos insuficientes o invalidos. Revisa los valores ingresados.");
        else setRes(r);
      } catch (ex: any) {
        setErr(`Error al calcular: ${ex.message}`);
      }
      setLoad(false);
    }, 60);
  }

  function handleReset() {
    setColVar("");
    setManMedia("");
    setManDE("");
    setManN("");
    setNivel(95);
    setMu0("0");
    setCalcIC(true);
    setCalcBil(true);
    setCalcUIzq(false);
    setCalcUDer(false);
    setRes(null);
    setErr("");
    setIaOpen(false);
    setIaText("");
  }

  async function interpretarIA() {
    if (!res) return;
    setIaOpen(true);
    setIaLoad(true);
    setIaText("");
    try {
      const resumen = buildResumenIA(res, varLabel);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content:
                "Eres un bioestadistico experto. Interpreta estos resultados de inferencia sobre una media en espanol academico, apto para incluir en una tesis de ciencias de la salud. Redacta en prosa academica fluida (no uses listas). Explica: (1) que indica la media muestral y su intervalo de confianza, (2) que concluye el contraste de hipotesis y el valor p, (3) cual es la implicacion clinica o cientifica del hallazgo. Maximo 300 palabras.\n\nResultados:\n" + resumen,
            },
          ],
        }),
      });
      const data = await response.json();
      const txt = data.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "Sin respuesta del asistente.";
      setIaText(txt);
    } catch {
      setIaText("Error al conectar con el asistente IA. Verifica la conexion.");
    }
    setIaLoad(false);
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f4f6f8", minHeight: "100vh", animation: "slideUp .32s ease" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin    { to { transform:rotate(360deg) } }
        .hov-btn:hover     { opacity:.85; transform:translateY(-1px) }
        .modo-tab:hover    { background:#f0fdf4 !important }
        .hov-row:hover     { background:#f0fdf4 !important }
        input[type=number] { -moz-appearance:textfield }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none }
      `}</style>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <button onClick={onBack} style={{ color: "#0d9488", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", border: "none", background: "none", padding: 0, fontFamily: "inherit", fontSize: 13, fontWeight: 500 }}>
            <Icon d={IC.back} size={14} /> Una poblacion
          </button>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#111827", fontWeight: 600 }}>Inferencia sobre una media</span>
        </div>

        <div style={{ background: "white", borderRadius: "16px 16px 0 0", padding: "28px 32px 0", borderBottom: "none", animation: "slideUp .4s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 32, borderRadius: 4, background: "#0d9488", flexShrink: 0 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-.02em" }}>Inferencia sobre una media</h1>
          </div>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "6px 0 0 14px", lineHeight: 1.5, paddingBottom: 20 }}>
            Estimacion del parametro mu mediante IC y prueba t de Student (una muestra)
          </p>
        </div>

        <div style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", borderTop: "1px solid #a7f3d0", borderBottom: "1px solid #a7f3d0", padding: "13px 22px", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#065f46", animation: "slideUp .45s ease" }}>
          <span style={{ background: "#0d9488", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}>
            <Icon d={IC.info} size={13} />
          </span>
          <span style={{ lineHeight: 1.6 }}>
            <b>Para que sirve?</b> Estima si la media de una variable cuantitativa coincide con un valor de referencia teorico (mu0) usando la <b>prueba t de Student para una muestra</b>.
          </span>
        </div>

        <div style={{ background: "white", borderRadius: "0 0 16px 16px", borderTop: "1px solid #e5e7eb", padding: "26px 28px 24px", boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 14, animation: "slideUp .5s ease" }}>
          <div style={{ display: "flex", gap: 0, border: "1.5px solid #e5e7eb", borderRadius: 11, overflow: "hidden", marginBottom: 24, width: "fit-content" }}>
            {[
              ["individual", "📊", "Datos individuales (Excel)"],
              ["resumido", "✏️", "Datos resumidos (manual)"],
            ].map(([m, emoji, label]) => (
              <button key={m} className="modo-tab" onClick={() => setModo(m)} style={{ padding: "9px 20px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: modo === m ? "#f0fdf4" : "white", color: modo === m ? "#0f766e" : "#6b7280", borderRight: m === "individual" ? "1.5px solid #e5e7eb" : "none", fontFamily: "inherit", transition: "all .15s", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{emoji}</span> {label}
              </button>
            ))}
          </div>

          {modo === "individual" && (
            <div style={{ marginBottom: 20 }}>
              <StepLabel step="Paso 1" label="Variable numerica" />

              {!datosExcel ? (
                <div style={{ padding: "13px 16px", background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 9 }}>
                  <Icon d={IC.warn} size={14} />
                  {loadingExcel ? "Cargando datos del Excel..." : "Sin datos cargados. Ve a Preprocesamiento o usa el modo Datos resumidos."}
                </div>
              ) : colsNum.length === 0 ? (
                <div style={{ padding: "13px 16px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, fontSize: 13, color: "#991b1b", display: "flex", alignItems: "center", gap: 9 }}>
                  <Icon d={IC.warn} size={14} />
                  No hay columnas numericas en los datos cargados.
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <select value={colVar} onChange={(e) => setColVar(e.target.value)} style={{ width: "100%", padding: "11px 36px 11px 14px", border: `2px solid ${colVar ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", appearance: "none", color: colVar ? "#111827" : "#9ca3af", cursor: "pointer", outline: "none", background: colVar ? "#f0fdf4" : "white", transition: "all .2s" }}>
                    <option value="">Seleccionar variable numerica...</option>
                    {colsNum.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: colVar ? "#0d9488" : "#9ca3af", pointerEvents: "none" }}>▾</span>
                </div>
              )}

              {autoStats && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
                  {[
                    ["n", fmtN(autoStats.n), "Tamano de muestra"],
                    ["x̄", fmt(autoStats.media), "Media muestral"],
                    ["s", fmt(autoStats.de), "Desviacion estandar"],
                  ].map(([sym, val, lbl]) => (
                    <div key={String(sym)} style={{ background: "#f0fdf4", border: "1.5px solid #a7f3d0", borderRadius: 10, padding: "12px 16px" }}>
                      <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{lbl}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{sym} =</span>
                        <span style={{ fontSize: 17, fontWeight: 800, color: "#0f766e", fontFamily: "'DM Mono', monospace" }}>{val}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {modo === "resumido" && (
            <div style={{ marginBottom: 20 }}>
              <StepLabel step="Paso 1" label="Estadisticos muestrales" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                <NumInput label="Media (x̄)" value={manMedia} onChange={setManMedia} hint="Promedio muestral" step="any" />
                <NumInput label="Desviacion estandar (s)" value={manDE} onChange={setManDE} hint="s >= 0" step="any" min="0" />
                <NumInput label="Tamano de muestra (n)" value={manN} onChange={setManN} hint="n >= 2" step="1" min="2" />
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
              <input type="number" min={80} max={99.9} step={0.1} value={nivelConf} onChange={(e) => setNivel(Math.min(99.9, Math.max(80, +e.target.value)))} style={{ width: 52, border: "none", fontSize: 14, fontWeight: 700, color: "#111827", textAlign: "center", fontFamily: "inherit", background: "transparent", outline: "none" }} />
              <span style={{ fontSize: 13, color: "#6b7280" }}>%</span>
            </div>
          </div>

          <Divider />

          <StepLabel step="Paso 3" label="Que desea calcular?" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <CheckRow checked={calcIC} onChange={setCalcIC} label="Intervalo de confianza para mu" hint={`IC (1-alfa)% = x̄ +- t * (s/sqrt(n)) al ${nivelConf}%`} />
            <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", background: "#fafbfc" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Contraste de hipotesis</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <CheckRow checked={calcBil} onChange={setCalcBil} label="Bilateral (H1: mu != mu0)" hint="Detecta diferencias en cualquier direccion" indented />
                <CheckRow checked={calcUIzq} onChange={setCalcUIzq} label="Unilateral izquierdo (H1: mu < mu0)" hint="Evalua si la media es menor" indented />
                <CheckRow checked={calcUDer} onChange={setCalcUDer} label="Unilateral derecho (H1: mu > mu0)" hint="Evalua si la media es mayor" indented />
              </div>
            </div>
          </div>

          {algunContrastes && (
            <div style={{ marginTop: 16, padding: "16px 18px", background: "#fafbfc", border: "1.5px solid #e5e7eb", borderRadius: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Valor a contrastar (mu0)</label>
              <input type="number" step="any" value={mu0} onChange={(e) => setMu0(e.target.value)} style={{ padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#111827", width: 180, outline: "none" }} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCalc} disabled={!puedeCalcular || load} className="hov-btn" style={{ flex: 1, padding: "13px 20px", borderRadius: 12, border: "none", cursor: puedeCalcular && !load ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: puedeCalcular ? "linear-gradient(135deg,#14b8a6,#0d9488)" : "#e5e7eb", color: puedeCalcular ? "white" : "#9ca3af", boxShadow: puedeCalcular ? "0 4px 14px rgba(13,148,136,.28)" : "none", transition: "all .25s" }}>
            {load ? (
              <>
                <Spin /> Calculando...
              </>
            ) : (
              <>
                <Icon d={IC.calc} size={16} /> {res ? "Recalcular" : "Calcular"}
              </>
            )}
          </button>
          <button onClick={handleReset} className="hov-btn" style={{ padding: "13px 18px", borderRadius: 12, border: "2px solid #e5e7eb", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: "white", color: "#6b7280", display: "flex", alignItems: "center", gap: 6, transition: "all .2s" }}>
            <Icon d={IC.reset} /> Limpiar
          </button>
        </div>

        {err && <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "11px 16px", marginTop: 12, fontSize: 13, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}><Icon d={IC.warn} size={14} /> {err}</div>}

        {res && (
          <div style={{ marginTop: 30, animation: "slideUp .4s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "16px 22px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
                {[
                  ["Variable", varLabel],
                  ["n", fmtN(res.n)],
                  ["x̄", fmt(res.media)],
                  ["s", fmt(res.de)],
                  ["EE", fmt(res.EE)],
                  ["gl", res.df],
                  ["NC", `${res.nivelConf}%`],
                ].map(([k, v]) => (
                  <span key={String(k)} style={{ whiteSpace: "nowrap" }}><span style={{ color: "#6b7280" }}>{k}:</span> <b style={{ fontFamily: "'DM Mono', monospace" }}>{v}</b></span>
                ))}
              </div>

              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={interpretarIA} disabled={iaLoad} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #a855f7", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fdf4ff", color: "#7c3aed", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  {iaLoad ? <><Spin sm /> Interpretando...</> : <><Icon d={IC.ai} size={14} /> Interpretar con IA</>}
                </button>
                <button onClick={() => exportarExcel(res, varLabel)} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #0d9488", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#0d9488", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  <Icon d={IC.dl} /> Descargar Excel
                </button>
                <button onClick={() => exportarWord(res, varLabel)} className="hov-btn" style={{ padding: "9px 16px", borderRadius: 10, border: "2px solid #3b82f6", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "white", color: "#3b82f6", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                  <Icon d={IC.word} /> Descargar Word
                </button>
              </div>
            </div>

            {iaOpen && (
              <div style={{ marginBottom: 16, background: "linear-gradient(135deg,#fdf4ff,#ede9fe)", border: "2px solid #c4b5fd", borderRadius: 16, padding: 22, animation: "slideUp .3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: "#7c3aed", borderRadius: 9, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}><Icon d={IC.ai} size={15} /></div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#4c1d95" }}>Interpretacion del Asistente IA</span>
                  </div>
                  <button onClick={() => setIaOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", display: "flex", padding: 4, borderRadius: 6 }}><Icon d={IC.x} /></button>
                </div>

                <div style={{ background: "white", borderRadius: 12, border: "1px solid #ddd6fe", padding: "18px 22px", minHeight: 140, maxHeight: 380, overflowY: "auto", lineHeight: 1.8, fontSize: 14, color: "#374151", fontFamily: "'DM Sans', sans-serif" }}>
                  {iaLoad ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 110, gap: 12 }}>
                      <Spin />
                      <span style={{ color: "#9ca3af", fontSize: 13 }}>Analizando resultados estadisticos...</span>
                    </div>
                  ) : iaText ? (
                    <div style={{ whiteSpace: "pre-wrap" }}>{iaText}</div>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>El analisis aparecera aqui...</span>
                  )}
                </div>

                {iaText && !iaLoad && (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => (onContinuarChat ? onContinuarChat(iaText) : alert("Conecta el prop onContinuarChat."))} className="hov-btn" style={{ padding: "9px 18px", borderRadius: 10, border: "2px solid #7c3aed", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}>
                      <Icon d={IC.chat} size={14} /> Continuar al chat
                    </button>
                  </div>
                )}
              </div>
            )}

            {res.ic && (
              <TablaAcademica
                titulo={`Intervalo de Confianza (${res.nivelConf}.0%)`}
                headers={["Media", `Limite inferior (${res.nivelConf}%)`, `Limite superior (${res.nivelConf}%)`]}
                filas={[[
                  { v: fmt(res.media), mono: true, bold: true, color: "#1e40af" },
                  { v: fmt(res.ic.lower), mono: true, color: "#374151" },
                  { v: fmt(res.ic.upper), mono: true, color: "#374151" },
                ]]}
                nota={`Con un ${res.nivelConf}% de confianza, la media poblacional mu se encuentra entre ${fmt(res.ic.lower)} y ${fmt(res.ic.upper)}. Amplitud del IC: ${fmt(res.ic.upper - res.ic.lower)}.`}
              />
            )}

            {res.hipotesis.length > 0 && (
              <>
                <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "14px 22px", marginBottom: 14, fontSize: 13, color: "#374151", boxShadow: "0 1px 4px rgba(0,0,0,.04)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ color: "#6b7280", fontSize: 12 }}>Estadistico t:</span>
                  <code style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#374151" }}>
                    t = (x̄ - mu0) / (s/sqrt(n)) = ({fmt(res.media)} - {fmt(res.mu0)}) / {fmt(res.EE)} = <b style={{ color: "#0f766e", fontSize: 15 }}>{fmt(res.tStat, 3)}</b>
                  </code>
                  <span style={{ color: "#6b7280", fontSize: 12 }}>gl = {res.df}</span>
                </div>

                <TablaAcademica
                  titulo={<>Prueba para una Media <span style={{ color: "#6b7280", fontWeight: 400, fontSize: 13 }}>(mu0 = {fmt(res.mu0, 3)})</span></>}
                  headers={["Contraste", "Estadistico t", "gl", "Valor p"]}
                  filas={res.hipotesis.map((h: any) => [
                    { v: h.tipo, align: "left", bold: true },
                    { v: fmt(h.t, 3), mono: true, color: "#1e40af" },
                    { v: fmtN(h.df), mono: true, color: "#374151" },
                    { v: fmtP(h.p), mono: true, bold: true, color: h.p < 0.001 ? "#dc2626" : h.p < 0.05 ? "#d97706" : "#059669" },
                  ])}
                  nota="gl: grados de libertad · p < 0.001 rojo · p < 0.05 naranja · p >= 0.05 verde"
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
