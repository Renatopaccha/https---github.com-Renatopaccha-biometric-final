import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx-js-style';

function normQ(p: number) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const pL = 0.02425;
  const pH = 1 - pL;

  if (p < pL) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  if (p <= pH) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

const zCrit = (nc: number) => normQ(1 - (1 - nc / 100) / 2);

const gby = (arr: any[], key: string) =>
  arr.reduce((a: Record<string, any[]>, r) => {
    const k = String(r[key] ?? 'NA');
    (a[k] = a[k] || []).push(r);
    return a;
  }, {});

const mArr = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

const vArr = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mArr(a);
  return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1);
};

const fmt3 = (v: number) => (isFinite(v) ? v.toFixed(3) : String(v));
const fmt1 = (v: number) => (isFinite(v) ? v.toFixed(3) : String(v));

function estimarMedia(filas: any[], colY: string, colEst: string, colCon: string, colPond: string, z: number) {
  const rows = filas.filter((r) => {
    const v = r[colY];
    return v !== null && v !== undefined && v !== '' && !isNaN(+v);
  });
  const n = rows.length;
  if (n < 2) return null;

  const y = rows.map((r) => +r[colY]);
  const yBarSrs = mArr(y);
  const varSrs = vArr(y) / n;

  let yBar: number;
  let varEst: number;
  let deff = 1;

  if (colEst && colCon) {
    let ySt = 0;
    let vSt = 0;
    for (const sR of Object.values(gby(rows, colEst))) {
      const nh = sR.length;
      const Wh = nh / n;
      const clM = Object.values(gby(sR, colCon)).map((cr) => mArr(cr.map((r) => +r[colY])));
      const mh = clM.length;
      const mhm = mArr(clM);
      const vh = mh > 1 ? vArr(clM) / mh : 0;
      ySt += Wh * mhm;
      vSt += Wh * Wh * vh;
    }
    yBar = ySt;
    varEst = vSt;
    deff = varEst / varSrs;
  } else if (colEst) {
    let ySt = 0;
    let vSt = 0;
    for (const sR of Object.values(gby(rows, colEst))) {
      const nh = sR.length;
      const Wh = nh / n;
      const yh = sR.map((r) => +r[colY]);
      ySt += Wh * mArr(yh);
      vSt += (Wh * Wh * vArr(yh)) / nh;
    }
    yBar = ySt;
    varEst = vSt;
    deff = varEst / varSrs;
  } else if (colCon) {
    const clM = Object.values(gby(rows, colCon)).map((cr) => mArr(cr.map((r) => +r[colY])));
    const m = clM.length;
    yBar = yBarSrs;
    varEst = m > 1 ? vArr(clM) / m : varSrs;
    deff = varEst / varSrs;
  } else if (colPond) {
    const w = rows.map((r) => Math.max(1e-9, +r[colPond] || 1));
    const Wt = w.reduce((a, b) => a + b, 0);
    yBar = y.reduce((s, v, i) => s + w[i] * v, 0) / Wt;
    const num = y.reduce((s, v, i) => s + w[i] ** 2 * (v - yBar) ** 2, 0);
    varEst = num / (Wt * Wt);
    deff = varEst / varSrs;
  } else {
    yBar = yBarSrs;
    varEst = varSrs;
    deff = 1;
  }

  const EE = Math.sqrt(Math.max(0, varEst));
  return {
    variable: colY,
    n,
    media: yBar,
    EE,
    ICl: yBar - z * EE,
    ICu: yBar + z * EE,
    deff: Math.max(0.001, deff),
  };
}

function estimarProporciones(filas: any[], colY: string, colEst: string, colCon: string, colPond: string, z: number) {
  const rows = filas.filter((r) => r[colY] !== null && r[colY] !== undefined && r[colY] !== '');
  const n = rows.length;
  if (n < 2) return null;

  const cats = [...new Set(rows.map((r) => String(r[colY])))].sort();

  const categorias = cats.map((cat) => {
    const nc = rows.filter((r) => String(r[colY]) === cat).length;
    const pSrs = nc / n;
    const varSrs = (pSrs * (1 - pSrs)) / Math.max(1, n - 1);

    let p: number;
    let varP: number;
    let deff = 1;

    if (colEst && colCon) {
      let pSt = 0;
      let vSt = 0;
      for (const sR of Object.values(gby(rows, colEst))) {
        const nh = sR.length;
        const Wh = nh / n;
        const clP = Object.values(gby(sR, colCon)).map((cr) => cr.filter((r) => String(r[colY]) === cat).length / cr.length);
        const mh = clP.length;
        const ph = mArr(clP);
        const vh = mh > 1 ? vArr(clP) / mh : 0;
        pSt += Wh * ph;
        vSt += Wh * Wh * vh;
      }
      p = pSt;
      varP = vSt;
      deff = varP / varSrs;
    } else if (colEst) {
      let pSt = 0;
      let vSt = 0;
      for (const sR of Object.values(gby(rows, colEst))) {
        const nh = sR.length;
        const Wh = nh / n;
        const ph = sR.filter((r) => String(r[colY]) === cat).length / nh;
        pSt += Wh * ph;
        vSt += (Wh * Wh * ph * (1 - ph)) / Math.max(1, nh - 1);
      }
      p = pSt;
      varP = vSt;
      deff = varP / varSrs;
    } else if (colCon) {
      const clP = Object.values(gby(rows, colCon)).map((cr) => cr.filter((r) => String(r[colY]) === cat).length / cr.length);
      const m = clP.length;
      p = pSrs;
      varP = m > 1 ? vArr(clP) / m : varSrs;
      deff = varP / varSrs;
    } else if (colPond) {
      const w = rows.map((r) => Math.max(1e-9, +r[colPond] || 1));
      const Wt = w.reduce((a, b) => a + b, 0);
      p = rows.reduce((s, r, i) => s + w[i] * (String(r[colY]) === cat ? 1 : 0), 0) / Wt;
      const yi = rows.map((r) => (String(r[colY]) === cat ? 1 : 0));
      let num = 0;
      for (let i = 0; i < yi.length; i++) {
        num += w[i] ** 2 * (yi[i] - p) ** 2;
      }
      varP = num / (Wt * Wt);
      deff = varP / varSrs;
    } else {
      p = pSrs;
      varP = varSrs;
      deff = 1;
    }

    const EE = Math.sqrt(Math.max(0, varP));
    return {
      categoria: cat,
      n: nc,
      p: p * 100,
      EE: EE * 100,
      ICl: Math.max(0, (p - z * EE) * 100),
      ICu: Math.min(100, (p + z * EE) * 100),
      deff: Math.max(0.001, deff),
    };
  });

  return { variable: colY, n, categorias };
}

function detectarTipo(datos: any[], col: string) {
  if (!datos?.length || !col) return null;
  const vals = datos.map((r) => r[col]).filter((v) => v !== null && v !== undefined && v !== '');
  if (!vals.length) return null;
  const num = vals.filter((v) => !isNaN(+v) && String(v).trim() !== '').length;
  const unicos = new Set(vals.map(String)).size;
  if (num / vals.length > 0.85 && unicos > 8) return 'numerica';
  if (num / vals.length > 0.85) return 'numerica_discreta';
  return 'categorica';
}

async function exportarExcel(res: any, nivelConf: number) {
  const wb = XLSX.utils.book_new();
  const nc = nivelConf;
  const bloques = res.bloques || [{ etiqueta: 'Global', ...res.global }];

  bloques.forEach((bloque: any) => {
    const wsData: any[] = [];
    const sectionRows: number[] = [];
    const headerRows: number[] = [];
    const merges: XLSX.Range[] = [];

    wsData.push(['Estimacion con Muestras Complejas']);
    sectionRows.push(wsData.length - 1);
    merges.push({ s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 6 } });

    if (bloques.length > 1) {
      wsData.push([`Segmento: ${bloque.etiqueta}`]);
      sectionRows.push(wsData.length - 1);
      merges.push({ s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 6 } });
    }

    wsData.push([`Nivel de confianza: ${nc}%`]);
    sectionRows.push(wsData.length - 1);
    merges.push({ s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 6 } });
    wsData.push([]);

    if (bloque.medias?.length) {
      wsData.push(['MEDIAS']);
      sectionRows.push(wsData.length - 1);
      merges.push({ s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 6 } });

      wsData.push(['Variable', 'N', 'Media', 'EE', `IC inf. (${nc}%)`, `IC sup. (${nc}%)`, 'DEFF']);
      headerRows.push(wsData.length - 1);

      bloque.medias.forEach((m: any) => wsData.push([m.variable, m.n, fmt3(m.media), fmt3(m.EE), fmt3(m.ICl), fmt3(m.ICu), fmt3(m.deff)]));
      wsData.push([]);
    }

    bloque.proporciones?.forEach((prop: any) => {
      wsData.push([`PROPORCIONES: ${prop.variable}`]);
      sectionRows.push(wsData.length - 1);
      merges.push({ s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 6 } });

      wsData.push(['Categoría', 'N', '% (p̂)', 'EE (%)', `IC inf. (${nc}%)`, `IC sup. (${nc}%)`, 'DEFF']);
      headerRows.push(wsData.length - 1);

      prop.categorias.forEach((c: any) => wsData.push([c.categoria, c.n, fmt1(c.p), fmt1(c.EE), fmt1(c.ICl), fmt1(c.ICu), fmt3(c.deff)]));
      wsData.push([`N total: ${prop.n}`], []);
      sectionRows.push(wsData.length - 2);
      merges.push({ s: { r: wsData.length - 2, c: 0 }, e: { r: wsData.length - 2, c: 6 } });
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;
    ws['!cols'] = [{ wch: 26 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    const hasDataCellStyle = {
      font: { color: { rgb: '334155' }, sz: 10 },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
        left: { style: 'thin', color: { rgb: 'E5E7EB' } },
        right: { style: 'thin', color: { rgb: 'E5E7EB' } },
      },
    };
    const leftDataCellStyle = {
      ...hasDataCellStyle,
      alignment: { horizontal: 'left', vertical: 'center' },
    };
    const titleCellStyle = {
      fill: { fgColor: { rgb: '0F766E' } },
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '0F766E' } },
        bottom: { style: 'thin', color: { rgb: '0F766E' } },
        left: { style: 'thin', color: { rgb: '0F766E' } },
        right: { style: 'thin', color: { rgb: '0F766E' } },
      },
    };
    const sectionCellStyle = {
      fill: { fgColor: { rgb: 'ECFDF5' } },
      font: { bold: true, color: { rgb: '065F46' }, sz: 10 },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'A7F3D0' } },
        bottom: { style: 'thin', color: { rgb: 'A7F3D0' } },
        left: { style: 'thin', color: { rgb: 'A7F3D0' } },
        right: { style: 'thin', color: { rgb: 'A7F3D0' } },
      },
    };
    const headerCellStyle = {
      fill: { fgColor: { rgb: '111827' } },
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '111827' } },
        bottom: { style: 'thin', color: { rgb: '111827' } },
        left: { style: 'thin', color: { rgb: '111827' } },
        right: { style: 'thin', color: { rgb: '111827' } },
      },
    };

    for (let R = range.s.r; R <= range.e.r; R++) {
      const isSection = sectionRows.includes(R);
      const isHeader = headerRows.includes(R);
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) continue;

        if (R === 0) {
          ws[cellRef].s = titleCellStyle;
        } else if (isHeader) {
          ws[cellRef].s = headerCellStyle;
        } else if (isSection && C === 0) {
          ws[cellRef].s = sectionCellStyle;
        } else if (C === 0) {
          ws[cellRef].s = leftDataCellStyle;
        } else {
          ws[cellRef].s = hasDataCellStyle;
        }
      }
    }

    const sheetName = String(bloque.etiqueta || 'Global').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `estimacion_compleja_${Date.now()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generarHTMLWord(res: any, nivelConf: number) {
  const nc = nivelConf;
  const tblStyle = `border-collapse:collapse;width:100%;font-family:'Calibri',sans-serif;font-size:11pt;margin-bottom:16pt`;
  const thStyle = `background:#d9d9d9;border:1px solid #999;padding:6px 10px;font-weight:bold;text-align:center`;
  const tdStyle = `border:1px solid #ccc;padding:5px 10px;text-align:right`;
  const td0Style = `border:1px solid #ccc;padding:5px 10px;text-align:left`;
  const h2Style = `font-family:'Calibri',sans-serif;font-size:13pt;font-weight:bold;margin-top:14pt;margin-bottom:6pt`;
  const h3Style = `font-family:'Calibri',sans-serif;font-size:12pt;font-weight:bold;margin-top:10pt;margin-bottom:4pt`;
  const pStyle = `font-family:'Calibri',sans-serif;font-size:10pt;color:#555;margin:4pt 0`;

  const bloques = res.bloques || [{ etiqueta: 'Global', ...res.global }];
  let html = `<h2 style="${h2Style}">Estimación con Muestras Complejas</h2>`;
  html += `<p style="${pStyle}">Nivel de confianza: ${nc}%</p>`;

  bloques.forEach((bloque: any) => {
    if (bloques.length > 1) html += `<h3 style="${h3Style}">Segmento: ${bloque.etiqueta}</h3>`;

    if (bloque.medias?.length) {
      html += `<h3 style="${h3Style}">Medias</h3>`;
      html += `<table style="${tblStyle}"><thead><tr>
        <th style="${thStyle}">Variable</th><th style="${thStyle}">N</th><th style="${thStyle}">Media</th>
        <th style="${thStyle}">EE</th><th style="${thStyle}">IC inf. (${nc}%)</th><th style="${thStyle}">IC sup. (${nc}%)</th><th style="${thStyle}">DEFF</th>
      </tr></thead><tbody>`;

      bloque.medias.forEach((m: any) => {
        html += `<tr><td style="${td0Style}">${m.variable}</td><td style="${tdStyle}">${m.n}</td>
          <td style="${tdStyle}">${fmt3(m.media)}</td><td style="${tdStyle}">${fmt3(m.EE)}</td>
          <td style="${tdStyle}">${fmt3(m.ICl)}</td><td style="${tdStyle}">${fmt3(m.ICu)}</td>
          <td style="${tdStyle}">${fmt3(m.deff)}</td></tr>`;
      });

      html += `</tbody></table>`;
    }

    bloque.proporciones?.forEach((prop: any) => {
      html += `<h3 style="${h3Style}">Proporciones - ${prop.variable}</h3>`;
      html += `<table style="${tblStyle}"><thead><tr>
        <th style="${thStyle}">Categoría</th><th style="${thStyle}">N</th><th style="${thStyle}">% (p̂)</th>
        <th style="${thStyle}">EE (%)</th><th style="${thStyle}">IC inf. (${nc}%)</th><th style="${thStyle}">IC sup. (${nc}%)</th><th style="${thStyle}">DEFF</th>
      </tr></thead><tbody>`;

      prop.categorias.forEach((c: any) => {
        html += `<tr><td style="${td0Style}">${c.categoria}</td><td style="${tdStyle}">${c.n}</td>
          <td style="${tdStyle}">${fmt1(c.p)}</td><td style="${tdStyle}">${fmt1(c.EE)}</td>
          <td style="${tdStyle}">${fmt1(c.ICl)}</td><td style="${tdStyle}">${fmt1(c.ICu)}</td>
          <td style="${tdStyle}">${fmt3(c.deff)}</td></tr>`;
      });

      html += `</tbody></table><p style="${pStyle}">N total: ${prop.n}</p>`;
    });
  });

  html += `<p style="${pStyle}"><em>EE: Error estándar | DEFF: Efecto de diseño | IC: Intervalo de confianza</em></p>`;
  return html;
}

function exportarWord(res: any, nivelConf: number) {
  const html = generarHTMLWord(res, nivelConf);
  const blob = new Blob([
    `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'/><style>body{margin:2cm;}</style></head><body>${html}</body></html>`,
  ], { type: 'application/msword' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `estimacion_compleja_${Date.now()}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildResumenIA(res: any, nivelConf: number) {
  const bloques = res.bloques || [{ etiqueta: 'Global', ...res.global }];
  let txt = `Nivel de confianza: ${nivelConf}%\n`;

  bloques.forEach((b: any) => {
    if (b.etiqueta !== 'Global') txt += `\nSEGMENTO: ${b.etiqueta}\n`;

    b.medias?.forEach((m: any) => {
      txt += `Media de ${m.variable}: n=${m.n}, ȳ=${fmt3(m.media)}, EE=${fmt3(m.EE)}, IC${nivelConf}%=[${fmt3(m.ICl)};${fmt3(m.ICu)}], DEFF=${fmt3(m.deff)}\n`;
    });

    b.proporciones?.forEach((p: any) => {
      txt += `Proporciones de ${p.variable} (n=${p.n}):\n`;
      p.categorias.forEach((c: any) => {
        txt += `  ${c.categoria}: ${fmt1(c.p)}%, EE=${fmt1(c.EE)}%, IC${nivelConf}%=[${fmt1(c.ICl)}%;${fmt1(c.ICu)}%], DEFF=${fmt3(c.deff)}\n`;
      });
    });
  });

  return txt;
}

const Si = ({ d, w = 16 }: { d: string; w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
);

const BackIcon = () => <Si w={15} d='<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>' />;
const DlIcon = () => <Si w={15} d='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' />;
const WordIcon = () => <Si w={15} d='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>' />;
const RstIcon = () => <Si w={15} d='<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>' />;
const SpkIcon = () => <Si w={14} d='<path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/>' />;
const CalcIcon = () => <Si w={16} d='<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/>' />;
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const InfoIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);
const WarnIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const XIcon = () => <Si w={15} d='<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' />;
const ChatIcon = () => <Si w={14} d='<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' />;

interface Props {
  datosExcel?: any[] | null;
  loadingExcel?: boolean;
  onBack?: () => void;
  onContinuarChat?: ((texto: string) => void) | null;
}

export default function EstimacionMuestrasComplejas({
  datosExcel = null,
  loadingExcel = false,
  onBack,
  onContinuarChat = null,
}: Props) {
  const [colEst, setColEst] = useState('');
  const [colCon, setColCon] = useState('');
  const [colPond, setColPond] = useState('');
  const [colsMedia, setColsM] = useState<string[]>([]);
  const [colsProp, setColsP] = useState<string[]>([]);
  const [colSeg, setColSeg] = useState('');
  const [nivelConf, setNivel] = useState(95);

  const [res, setRes] = useState<any>(null);
  const [loading, setLoad] = useState(false);
  const [err, setErr] = useState('');
  const [iaOpen, setIaOpen] = useState(false);
  const [iaLoad, setIaLoad] = useState(false);
  const [iaText, setIaText] = useState('');
  const [segOpen, setSegOpen] = useState<Set<string>>(new Set());

  const cols = useMemo(() => (datosExcel?.length ? Object.keys(datosExcel[0]) : []), [datosExcel]);
  const tipoCol = useMemo(() => {
    const m: Record<string, any> = {};
    cols.forEach((c) => {
      m[c] = detectarTipo(datosExcel || [], c);
    });
    return m;
  }, [datosExcel, cols]);

  const warns = useMemo(() => {
    const w: Record<string, string> = {};
    colsMedia.forEach((c) => {
      if (tipoCol[c] === 'categorica') w[c] = 'Esta variable parece categórica. Para medias se requiere una variable numérica continua.';
    });
    colsProp.forEach((c) => {
      if (tipoCol[c] === 'numerica') w[c] = 'Esta variable parece numérica continua con alta cardinalidad. Para proporciones se recomiendan variables categóricas o de código.';
    });
    if (colPond && tipoCol[colPond] === 'categorica') w[colPond] = 'La ponderación debe ser numérica.';
    return w;
  }, [colsMedia, colsProp, colPond, tipoCol]);

  const canCalc = !!datosExcel?.length && (colsMedia.length > 0 || colsProp.length > 0) && Object.keys(warns).length === 0;

  function handleCalc() {
    if (!canCalc || !datosExcel) return;

    setLoad(true);
    setErr('');
    setRes(null);
    setIaOpen(false);
    setIaText('');
    setSegOpen(new Set());

    setTimeout(() => {
      try {
        const z = zCrit(nivelConf);
        const calcBloque = (filas: any[]) => ({
          medias: colsMedia.map((c) => estimarMedia(filas, c, colEst, colCon, colPond, z)).filter(Boolean),
          proporciones: colsProp.map((c) => estimarProporciones(filas, c, colEst, colCon, colPond, z)).filter(Boolean),
        });

        let resultado;
        if (colSeg) {
          const grupos = gby(datosExcel, colSeg);
          const bloques = Object.entries(grupos)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([seg, filas]) => ({ etiqueta: seg, ...calcBloque(filas) }));
          resultado = { colSeg, bloques, n: datosExcel.length };
        } else {
          const glob = calcBloque(datosExcel);
          resultado = { global: glob, bloques: [{ etiqueta: 'Global', ...glob }], n: datosExcel.length };
        }

        setRes(resultado);
      } catch (ex: any) {
        setErr(`Error al calcular: ${ex.message}`);
      }

      setLoad(false);
    }, 80);
  }

  function handleReset() {
    setColEst('');
    setColCon('');
    setColPond('');
    setColsM([]);
    setColsP([]);
    setColSeg('');
    setRes(null);
    setErr('');
    setIaOpen(false);
    setIaText('');
    setSegOpen(new Set());
  }

  async function interpretarIA() {
    if (!res) return;

    setIaOpen(true);
    setIaLoad(true);
    setIaText('');

    try {
      const resumen = buildResumenIA(res, nivelConf);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content:
                'Eres un bioestadístico experto en muestras complejas. Interpreta estos resultados de forma clara, precisa y académica en español (para incluir en tesis o artículo científico). Explica: (1) qué indican las medias y sus IC, (2) qué indican las proporciones, (3) qué significa el DEFF calculado, (4) si hay hallazgos relevantes. Máximo 350 palabras.\\n\\nResultados:\\n' + resumen,
            },
          ],
        }),
      });
      const data = await response.json();
      const txt = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || 'No se pudo obtener interpretación.';
      setIaText(txt);
    } catch {
      setIaText('Error al conectar con el asistente IA. Verifica tu conexión.');
    }

    setIaLoad(false);
  }

  function toggleSeg(seg: string) {
    setSegOpen((prev) => {
      const s = new Set(prev);
      if (s.has(seg)) {
        s.delete(seg);
      } else {
        s.add(seg);
      }
      return s;
    });
  }

  const bloques = res?.bloques || [];

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: '#fafbfc', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes cinematicFadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .emc-stagger-1{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.04s}
        .emc-stagger-2{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.08s}
        .emc-stagger-3{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.12s}
        .emc-stagger-4{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.16s}
        .emc-stagger-5{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.20s}
        .emc-btn-cin{transition:all .3s cubic-bezier(.16,1,.3,1)!important}
        .emc-btn-cin:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 8px 20px rgba(16,185,129,.18)!important}
        .hov-row:hover{background:#f0fdf4!important}
        .seg-pill:hover{opacity:.8;transform:scale(1.02)}
        input[type=number]{outline:none;-moz-appearance:textfield}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        .acord-hdr:hover{background:#f9fafb!important}
        .tag-chip{display:inline-flex;align-items:center;gap:5px;background:#ecfdf5;border:1.5px solid #a7f3d0;border-radius:20px;padding:3px 10px 3px 8px;font-size:12px;font-weight:600;color:#065f46;cursor:pointer}
        .tag-chip:hover{background:#d1fae5}
        .tag-chip-warn{background:#fff7ed!important;border-color:#fde68a!important;color:#92400e!important}
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 60px' }}>
        <div className="emc-stagger-1" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
          <button onClick={onBack} style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', border: 'none', background: 'none', padding: 0, fontFamily: 'inherit' }}>
            <BackIcon /> Muestreo
          </button>
          <span style={{ color: '#d1d5db' }}>/</span>
          <span style={{ color: '#374151', fontWeight: 600 }}>Estimación con Muestras Complejas</span>
        </div>

        <div className="emc-stagger-1" style={{ display: 'flex', alignItems: 'flex-start', gap: 15, marginBottom: 6 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#3b82f6', fontSize: 24 }}>
            Σ
          </div>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, margin: 0, color: '#111827', letterSpacing: '-.02em' }}>Estimación con Muestras Complejas</h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0', lineHeight: 1.5 }}>Medias y proporciones con error estándar, IC y DEFF ajustados al diseño muestral</p>
          </div>
        </div>

        <div className="emc-stagger-2" style={{ background: 'linear-gradient(135deg,#ecfdf5,#f0fdf4)', border: '1px solid #a7f3d0', borderRadius: 12, padding: '11px 15px', margin: '16px 0 24px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#065f46' }}>
          <div style={{ background: '#10b981', borderRadius: 7, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
            <SpkIcon />
          </div>
          <span>
            <b>Asistente IA:</b> Selecciona las variables de tu diseño. <b>Estratos</b> y <b>Conglomerados</b> corrigen la varianza según el diseño complejo. La <b>Ponderación</b> ajusta los estimadores por factores de expansión. El <b>DEFF &gt; 1</b> indica varianza inflada respecto a SRS.
          </span>
        </div>

        {(loadingExcel || !datosExcel) && (
          <div style={{ background: 'white', border: '1.5px dashed #d1d5db', borderRadius: 16, padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{loadingExcel ? '⏳' : '📊'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
              {loadingExcel ? 'Cargando Excel...' : 'Sin datos cargados'}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 440, margin: '0 auto' }}>
              {loadingExcel
                ? 'Estamos obteniendo las filas del archivo subido en Preprocesamiento para calcular la estimación compleja.'
                : 'Carga una tabla Excel desde el módulo de Preprocesamiento para usar esta función.'}
            </p>
          </div>
        )}

        {!!datosExcel && (
          <>
            <div className="emc-stagger-3" style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e5e7eb', padding: '24px 24px 18px', boxShadow: '0 4px 20px rgba(0,0,0,.04)' }}>
              <SLbl step="Paso 1" label="Variables del diseño muestral (opcionales)" />
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>Define el diseño de tu muestra. Si es SRS simple, deja estas opciones vacías.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                <ColSel label="Estratos" hint="Variable que identifica el estrato (opcional)" val={colEst} cols={cols} onChange={setColEst} badge="Opcional" badgeColor="#6b7280" />
                <ColSel label="Conglomerados" hint="Variable que identifica el conglomerado (opcional)" val={colCon} cols={cols.filter((c) => c !== colEst)} onChange={setColCon} badge="Opcional" badgeColor="#6b7280" />
                <ColSel
                  label="Ponderación"
                  hint="Factor de expansión o ponderación (opcional)"
                  val={colPond}
                  cols={cols.filter((c) => c !== colEst && c !== colCon)}
                  onChange={setColPond}
                  badge="Opcional"
                  badgeColor="#6b7280"
                  warn={colPond && tipoCol[colPond] === 'categorica' ? 'La ponderación debe ser numérica' : null}
                />
              </div>

              <Divider />
              <SLbl step="Paso 2" label="Variables a estimar" />
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>
                Selecciona al menos una variable de media o una de proporción. Se deben usar <b>variables numéricas</b> para medias y <b>variables categóricas</b> para proporciones.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Estimar medias</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: 20 }}>Numérica</span>
                    <TT text="Selecciona variables numéricas continuas. Se calculará: media ponderada, error estándar e IC con corrección de diseño.">
                      <span style={{ color: '#9ca3af', display: 'flex' }}>
                        <InfoIcon />
                      </span>
                    </TT>
                  </div>
                  <MultiColSel
                    cols={cols.filter((c) => c !== colEst && c !== colCon && c !== colPond && c !== colSeg && !colsProp.includes(c))}
                    selected={colsMedia}
                    onChange={setColsM}
                    warns={warns}
                    tipoCol={tipoCol}
                    tipo="numerica"
                    placeholder="Ej: Edad, Peso, Colesterol..."
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Estimar proporciones</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#fff7ed', color: '#f97316', padding: '2px 8px', borderRadius: 20 }}>Categórica</span>
                    <TT text="Selecciona variables categóricas o de código. Se calculará: proporción por categoría, error estándar e IC con corrección de diseño.">
                      <span style={{ color: '#9ca3af', display: 'flex' }}>
                        <InfoIcon />
                      </span>
                    </TT>
                  </div>
                  <MultiColSel
                    cols={cols.filter((c) => c !== colEst && c !== colCon && c !== colPond && c !== colSeg && !colsMedia.includes(c))}
                    selected={colsProp}
                    onChange={setColsP}
                    warns={warns}
                    tipoCol={tipoCol}
                    tipo="categorica"
                    placeholder="Ej: Sexo, Educación, Hipertensión..."
                  />
                </div>
              </div>

              <Divider />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Segmentar resultados</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#f0fdf4', color: '#10b981', padding: '2px 8px', borderRadius: 20 }}>Opcional · Acordeón</span>
                  </div>
                  <ColSel
                    val={colSeg}
                    cols={cols.filter((c) => c !== colEst && c !== colCon && c !== colPond && !colsMedia.includes(c) && !colsProp.includes(c))}
                    onChange={setColSeg}
                    placeholder="Ej: Empresa, Región..."
                    hint="Calculará resultados separados por cada categoría de esta variable"
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Nivel de confianza</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[90, 95, 99].map((nc) => (
                      <button
                        key={nc}
                        onClick={() => setNivel(nc)}
                        style={{
                          padding: '9px 18px',
                          borderRadius: 10,
                          border: nivelConf === nc ? '2px solid #10b981' : '2px solid #e5e7eb',
                          background: nivelConf === nc ? '#f0fdf4' : 'white',
                          color: nivelConf === nc ? '#065f46' : '#6b7280',
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all .2s',
                        }}
                      >
                        {nc}%
                      </button>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '2px solid #e5e7eb', borderRadius: 10, padding: '0 12px', background: 'white' }}>
                      <input
                        type="number"
                        min={80}
                        max={99.9}
                        step={0.1}
                        value={nivelConf}
                        onChange={(e) => setNivel(Math.min(99.9, Math.max(80, +e.target.value)))}
                        style={{ width: 50, border: 'none', fontSize: 14, fontWeight: 700, color: '#111827', textAlign: 'center', fontFamily: 'inherit' }}
                      />
                      <span style={{ fontSize: 13, color: '#6b7280' }}>%</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>z = {zCrit(nivelConf).toFixed(3)} · Mín. 80%, Máx. 99.9%</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                className={canCalc&&!loading?'emc-btn-cin':''}
                onClick={handleCalc}
                disabled={!canCalc || loading}
                style={{
                  flex: 1,
                  padding: '13px 20px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: canCalc && !loading ? 'pointer' : 'not-allowed',
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  transition: 'all .25s',
                  background: canCalc ? 'linear-gradient(135deg,#10b981,#059669)' : '#e5e7eb',
                  color: canCalc ? 'white' : '#9ca3af',
                  boxShadow: canCalc ? '0 4px 14px rgba(16,185,129,.3)' : 'none',
                }}
              >
                {loading ? (
                  <>
                    <Spin /> Calculando...
                  </>
                ) : (
                  <>
                    <CalcIcon /> {res ? 'Recalcular' : 'Calcular estimaciones'}
                  </>
                )}
              </button>

              <button onClick={handleReset} style={{ padding: '13px 18px', borderRadius: 12, border: '2px solid #e5e7eb', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', background: 'white', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RstIcon /> Limpiar
              </button>
            </div>

            {err && (
              <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 11, padding: '11px 15px', marginTop: 14, fontSize: 13, color: '#dc2626' }}>❌ {err}</div>
            )}

            {res && (
              <div style={{ marginTop: 30, animation: 'slideUp .4s cubic-bezier(.16,1,.3,1)' }}>
                <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #e5e7eb', padding: '14px 20px', marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#374151' }}>
                    <span style={{ color: '#6b7280' }}>Nivel de confianza:</span> <b>{nivelConf}%</b>
                    {colEst && (
                      <>
                        <span style={{ color: '#6b7280', marginLeft: 16 }}>Estratos:</span> <b>{colEst}</b>
                      </>
                    )}
                    {colCon && (
                      <>
                        <span style={{ color: '#6b7280', marginLeft: 16 }}>Conglomerados:</span> <b>{colCon}</b>
                      </>
                    )}
                    {colPond && (
                      <>
                        <span style={{ color: '#6b7280', marginLeft: 16 }}>Ponderación:</span> <b>{colPond}</b>
                      </>
                    )}
                    {colSeg && (
                      <>
                        <span style={{ color: '#6b7280', marginLeft: 16 }}>Segmentación:</span> <b>{colSeg}</b>
                      </>
                    )}
                  </div>

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={interpretarIA} disabled={iaLoad} style={{ padding: '9px 16px', borderRadius: 10, border: '2px solid #a855f7', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: '#fdf4ff', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 7 }}>
                      {iaLoad ? (
                        <>
                          <Spin sm /> Interpretando...
                        </>
                      ) : (
                        <>
                          <SpkIcon /> Interpretar con IA
                        </>
                      )}
                    </button>

                    <button onClick={() => exportarExcel(res, nivelConf)} style={{ padding: '9px 16px', borderRadius: 10, border: '2px solid #10b981', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: 'white', color: '#10b981', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <DlIcon /> Descargar Excel
                    </button>

                    <button onClick={() => exportarWord(res, nivelConf)} style={{ padding: '9px 16px', borderRadius: 10, border: '2px solid #3b82f6', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: 'white', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <WordIcon /> Descargar Word
                    </button>
                  </div>
                </div>

                {iaOpen && (
                  <div style={{ marginBottom: 20, background: 'linear-gradient(135deg,#fdf4ff,#ede9fe)', border: '2px solid #c4b5fd', borderRadius: 16, padding: '20px', animation: 'slideUp .3s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ background: '#7c3aed', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                          <SpkIcon />
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#4c1d95' }}>Interpretación del Asistente IA</span>
                      </div>
                      <button onClick={() => setIaOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', display: 'flex', alignItems: 'center' }}>
                        <XIcon />
                      </button>
                    </div>

                    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #ddd6fe', padding: '18px 20px', minHeight: 120, maxHeight: 340, overflowY: 'auto', lineHeight: 1.75, fontSize: 14, color: '#374151', fontFamily: "'DM Sans',sans-serif" }}>
                      {iaLoad ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, gap: 12 }}>
                          <Spin />
                          <span style={{ color: '#9ca3af', fontSize: 13 }}>Analizando resultados...</span>
                        </div>
                      ) : iaText ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{iaText}</div>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>El análisis aparecerá aquí...</span>
                      )}
                    </div>

                    {iaText && !iaLoad && (
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            if (onContinuarChat) {
                              onContinuarChat(iaText);
                            } else {
                              alert('Conecta el prop onContinuarChat para enviar al chat.');
                            }
                          }}
                          style={{ padding: '9px 18px', borderRadius: 10, border: '2px solid #7c3aed', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: '#7c3aed', color: 'white', display: 'flex', alignItems: 'center', gap: 7 }}
                        >
                          <ChatIcon /> Continuar al chat
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {colSeg && bloques.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
                      Segmentos por <b style={{ color: '#374151' }}>{colSeg}</b>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {bloques.map((b: any) => (
                        <button
                          key={b.etiqueta}
                          className="seg-pill"
                          onClick={() => {
                            toggleSeg(b.etiqueta);
                            document.getElementById(`seg-${b.etiqueta}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 20,
                            border: `2px solid ${segOpen.has(b.etiqueta) ? '#10b981' : '#e5e7eb'}`,
                            background: segOpen.has(b.etiqueta) ? '#f0fdf4' : 'white',
                            color: segOpen.has(b.etiqueta) ? '#065f46' : '#6b7280',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'all .15s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: segOpen.has(b.etiqueta) ? '#10b981' : '#d1d5db' }} />
                          {b.etiqueta}
                        </button>
                      ))}
                      <button onClick={() => setSegOpen(new Set(bloques.map((b: any) => b.etiqueta)))} style={{ padding: '6px 14px', borderRadius: 20, border: '2px dashed #d1d5db', background: '#f9fafb', color: '#9ca3af', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Expandir todos
                      </button>
                    </div>
                  </div>
                )}

                {colSeg ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {bloques.map((bloque: any) => {
                      const isOpen = segOpen.has(bloque.etiqueta);
                      return (
                        <div key={bloque.etiqueta} id={`seg-${bloque.etiqueta}`} style={{ background: 'white', borderRadius: 14, border: '1.5px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
                          <button className="acord-hdr" onClick={() => toggleSeg(bloque.etiqueta)} style={{ width: '100%', padding: '14px 20px', border: 'none', background: '#fafbfc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit', transition: 'background .15s', borderBottom: isOpen ? '1px solid #f3f4f6' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: isOpen ? '#10b981' : '#d1d5db', flexShrink: 0 }} />
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>{colSeg}: <span style={{ color: isOpen ? '#10b981' : '#6b7280' }}>{bloque.etiqueta}</span></span>
                            </div>
                            <ChevronIcon open={isOpen} />
                          </button>
                          {isOpen && (
                            <div style={{ padding: '20px' }}>
                              <BloqueResultados bloque={bloque} nivelConf={nivelConf} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
                    <BloqueResultados bloque={bloques[0] || {}} nivelConf={nivelConf} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BloqueResultados({ bloque, nivelConf }: { bloque: any; nivelConf: number }) {
  if (!bloque) return null;
  const nc = nivelConf;
  const hayMedias = !!bloque.medias?.length;
  const hayProp = !!bloque.proporciones?.length;

  if (!hayMedias && !hayProp) {
    return <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px' }}>Sin resultados para este segmento.</div>;
  }

  return (
    <div>
      {hayMedias && (
        <div style={{ marginBottom: hayProp ? 28 : 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 18, background: '#3b82f6', borderRadius: 2 }} />Medias
          </div>
          <TablaAcademica
            headers={['Variable', 'N', 'Media', 'EE', `IC inf. (${nc}%)`, `IC sup. (${nc}%)`, 'DEFF']}
            filas={bloque.medias.map((m: any) => [
              { v: m.variable, align: 'left', bold: true },
              { v: m.n.toLocaleString(), mono: true },
              { v: fmt3(m.media), mono: true, color: '#1e40af' },
              { v: fmt3(m.EE), mono: true },
              { v: fmt3(m.ICl), mono: true, color: '#6b7280' },
              { v: fmt3(m.ICu), mono: true, color: '#6b7280' },
              { v: fmt3(m.deff), mono: true, color: m.deff > 1.2 ? '#dc2626' : m.deff < 0.9 ? '#059669' : '#6b7280' },
            ])}
          />
        </div>
      )}

      {hayProp &&
        bloque.proporciones.map((prop: any, pi: number) => (
          <div key={prop.variable} style={{ marginTop: pi > 0 || hayMedias ? 24 : 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 4, height: 18, background: '#f97316', borderRadius: 2 }} />
              Proporciones - <span style={{ color: '#374151' }}>{prop.variable}</span>
            </div>
            <TablaAcademica
              headers={['Categoría', 'N', '% (p̂)', 'EE (%)', `IC inf. (${nc}%)`, `IC sup. (${nc}%)`, 'DEFF']}
              filas={prop.categorias.map((c: any) => [
                { v: String(c.categoria), align: 'left', bold: true },
                { v: c.n.toLocaleString(), mono: true },
                { v: `${fmt1(c.p)}%`, mono: true, color: '#1e40af' },
                { v: `${fmt1(c.EE)}%`, mono: true },
                { v: `${fmt1(c.ICl)}%`, mono: true, color: '#6b7280' },
                { v: `${fmt1(c.ICu)}%`, mono: true, color: '#6b7280' },
                { v: fmt3(c.deff), mono: true, color: c.deff > 1.2 ? '#dc2626' : c.deff < 0.9 ? '#059669' : '#6b7280' },
              ])}
            />
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8, fontStyle: 'italic' }}>N total: <b style={{ color: '#374151' }}>{prop.n.toLocaleString()}</b></p>
          </div>
        ))}
    </div>
  );
}

function TablaAcademica({ headers, filas }: { headers: string[]; filas: any[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '9px 14px', textAlign: i === 0 ? 'left' : 'right', fontWeight: 700, fontSize: 11, color: '#374151', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '2.5px solid #111827', borderTop: '2px solid #111827', background: 'white', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, ri) => (
            <tr key={ri} className="hov-row" style={{ background: ri % 2 === 0 ? 'white' : '#f9fafb', transition: 'background .12s', borderBottom: '1px solid #e5e7eb' }}>
              {fila.map((cel, ci) => (
                <td key={ci} style={{ padding: '9px 14px', textAlign: cel.align || 'right', fontFamily: cel.mono ? "'DM Mono',monospace" : 'inherit', fontWeight: cel.bold ? 600 : 400, color: cel.color || '#374151', whiteSpace: 'nowrap', fontSize: 13, borderBottom: 'none' }}>
                  {cel.v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SLbl({ step, label }: { step: string; label: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#10b981', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 18, height: 2, background: '#10b981', borderRadius: 2 }} />
      {step} · {label}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0 20px' }} />;
}

function Spin({ sm }: { sm?: boolean }) {
  const s = sm ? 14 : 17;
  return <span style={{ width: s, height: s, border: `${sm ? 2 : 3}px solid rgba(16,185,129,.3)`, borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />;
}

function TT({ children, text }: { children: React.ReactNode; text: string }) {
  const [s, setS] = useState(false);
  return (
    <span onMouseEnter={() => setS(true)} onMouseLeave={() => setS(false)} style={{ position: 'relative', display: 'inline-flex', cursor: 'help' }}>
      {children}
      {s && (
        <span style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: '#1f2937', color: '#f9fafb', fontSize: 12, lineHeight: 1.5, padding: '9px 13px', borderRadius: 10, width: 260, zIndex: 300, pointerEvents: 'none', fontWeight: 400 }}>
          {text}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #1f2937' }} />
        </span>
      )}
    </span>
  );
}

function ColSel({ label, hint, val, cols, onChange, placeholder, badge, badgeColor, warn }: { label?: string; hint?: string; val: string; cols: string[]; onChange: (v: string) => void; placeholder?: string; badge?: string; badgeColor?: string; warn?: string | null }) {
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>
          {badge && <span style={{ fontSize: 10, fontWeight: 700, background: '#f3f4f6', color: badgeColor || '#6b7280', padding: '2px 8px', borderRadius: 20 }}>{badge}</span>}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <select value={val} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '10px 36px 10px 13px', border: `2px solid ${warn ? '#fde68a' : val ? '#10b981' : '#e5e7eb'}`, borderRadius: 10, fontSize: 13, fontFamily: 'inherit', appearance: 'none', outline: 'none', color: val ? '#111827' : '#9ca3af', cursor: 'pointer', background: val ? (warn ? '#fffbeb' : '#f0fdf4') : 'white', transition: 'all .2s' }}>
          <option value="">{placeholder || 'Seleccionar columna...'}</option>
          {cols.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: val ? '#10b981' : '#9ca3af', pointerEvents: 'none' }}>▾</span>
      </div>
      {hint && !warn && <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>{hint}</p>}
      {warn && (
        <div style={{ fontSize: 11, color: '#92400e', margin: '4px 0 0', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}>
            <WarnIcon />
          </span>
          {warn}
        </div>
      )}
    </div>
  );
}

function MultiColSel({ cols, selected, onChange, warns, tipoCol, tipo, placeholder }: { cols: string[]; selected: string[]; onChange: React.Dispatch<React.SetStateAction<string[]>>; warns: Record<string, string>; tipoCol: Record<string, string>; tipo: 'numerica' | 'categorica'; placeholder?: string }) {
  const [query, setQuery] = useState('');
  const filtrados = cols.filter((c) => !selected.includes(c) && c.toLowerCase().includes(query.toLowerCase()));

  function toggle(c: string) {
    onChange((prev) => (prev.includes(c) ? prev.filter((p) => p !== c) : [...prev, c]));
  }

  const colTipoIcon = (c: string) => {
    const t = tipoCol[c];
    if (t === 'numerica') return '#';
    if (t === 'categorica') return 'Aa';
    return '?';
  };

  return (
    <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      {selected.length > 0 && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 6, background: '#f9fafb' }}>
          {selected.map((c) => (
            <span key={c} className={`tag-chip${warns[c] ? ' tag-chip-warn' : ''}`} onClick={() => toggle(c)}>
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", opacity: 0.7 }}>{colTipoIcon(c)}</span>
              {c}
              {warns[c] && (
                <span style={{ fontSize: 11 }}>
                  <WarnIcon />
                </span>
              )}
              <XIcon />
            </span>
          ))}
        </div>
      )}

      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder || 'Buscar columna...'} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, color: '#374151', background: 'transparent', fontFamily: 'inherit' }} />
      </div>

      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
        {filtrados.length === 0 ? (
          <div style={{ padding: '12px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>{cols.length === 0 ? 'Sin columnas disponibles' : query ? 'Sin coincidencias' : 'Todas seleccionadas'}</div>
        ) : (
          filtrados.map((c) => {
            const t = tipoCol[c];
            const esAdecuada = tipo === 'numerica' ? t === 'numerica' : t === 'categorica' || t === 'numerica_discreta';
            return (
              <div key={c} onClick={() => toggle(c)} style={{ padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, transition: 'background .12s', background: 'white' }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, border: '1.5px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#9ca3af', fontWeight: 700 }}>
                  {colTipoIcon(c)}
                </span>
                <span style={{ flex: 1, color: '#374151' }}>{c}</span>
                {!esAdecuada && (
                  <span style={{ fontSize: 10, color: '#d97706', display: 'flex' }}>
                    <WarnIcon />
                  </span>
                )}
                {t && <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>{t === 'numerica' ? 'numérica' : t === 'categorica' ? 'categórica' : 'discreta'}</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
