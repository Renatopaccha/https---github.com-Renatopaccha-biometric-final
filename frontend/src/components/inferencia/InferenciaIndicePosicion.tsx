import { useState, useMemo, type ChangeEvent } from "react";

type DataRow = Record<string, unknown>;

interface IndiceResult {
  ip: number;
  lower: number;
  upper: number;
  n: number;
  k: number;
  nc: number;
  frecuencias: number[];
  varLabel: string;
}

interface InferenciaIndicePosicionProps {
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

interface ResultTableCardProps {
  res: IndiceResult;
  onContinuarChat?: ((texto: string) => void) | null;
}

/* --------------------------------------------------------------------------
   FUNCIONES MATEMATICAS BASE
   -------------------------------------------------------------------------- */

function erf(x: number): number {
  const sign = Math.sign(x) || 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-ax * ax);
  return sign * y;
}

function norminv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (Math.abs(p - 0.5) < 1e-15) return 0;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
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

/* --------------------------------------------------------------------------
   LOGICA PRINCIPAL: INDICE DE POSICION
   -------------------------------------------------------------------------- */

function calcIndice(frecs: number[], nc: number): { ip: number; lower: number; upper: number; N: number; k: number } {
  let N = 0;
  for (const f of frecs) N += f;

  if (N < 2) throw new Error("Se requiere un tamano de muestra de al menos 2 sujetos.");
  const k = frecs.length;
  if (k < 2) throw new Error("Se requieren al menos 2 categorias.");

  let sumX = 0;
  for (let i = 0; i < k; i++) {
    sumX += (i + 1) * frecs[i];
  }
  const xBar = sumX / N;

  let sumSq = 0;
  for (let i = 0; i < k; i++) {
    sumSq += frecs[i] * Math.pow((i + 1) - xBar, 2);
  }
  const S2 = sumSq / (N - 1);

  const IP = (xBar - 1) / (k - 1);
  const SExBar = Math.sqrt(S2 / N);
  const SEIP = SExBar / (k - 1);

  const alpha = (100 - nc) / 100;
  const Z = norminv(1 - alpha / 2);

  const lower = Math.max(0, IP - Z * SEIP);
  const upper = Math.min(1, IP + Z * SEIP);

  return { ip: IP, lower, upper, N, k };
}

const fmt3 = (v: number) => (isFinite(v) ? v.toFixed(3) : "-");
const fmtN = (n: number) => (Number.isInteger(n) ? n.toLocaleString("es-ES") : String(n));

/* --------------------------------------------------------------------------
   REPORTES
   -------------------------------------------------------------------------- */

function exportarExcel(res: IndiceResult): void {
  const cssTh = "background-color:#d9d9d9; font-weight:bold; text-align:center; border:1px solid #000; padding:4px;";
  const cssTdNum = "text-align:right; border:1px solid #000; padding:4px;";
  const cssTd = "text-align:left; border:1px solid #000; padding:4px;";

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"></head><body>`;

  html += `<table style="border-collapse: collapse; font-family: sans-serif;">`;
  html += `<tr><th colspan="3" style="background-color:#0F766E; color:white; font-size:14px; padding:8px; border:1px solid #000;">Inferencia sobre un indice de posicion</th></tr>`;
  html += `<tr><td colspan="3" style="font-weight:bold; ${cssTd}">Filtro: No</td></tr>`;
  if (res.varLabel !== "Datos resumidos") html += `<tr><td colspan="3" style="font-weight:bold; ${cssTd}">Categorias: ${res.varLabel}</td></tr>`;
  html += `<tr><td colspan="3"></td></tr>`;

  html += `<tr><th style="${cssTh}">Categorias</th><th style="${cssTh}">Numero de sujetos</th><th></th></tr>`;
  res.frecuencias.forEach((f, i) => {
    html += `<tr><td style="${cssTdNum}">${i + 1}</td><td style="${cssTdNum}">${f}</td><td></td></tr>`;
  });
  html += `<tr><td colspan="3"></td></tr>`;

  html += `<tr><td colspan="3" style="font-weight:bold; ${cssTd}">Numero de categorias: ${res.k}</td></tr>`;
  html += `<tr><td colspan="3" style="font-weight:bold; ${cssTd}">Nivel de confianza: ${res.nc},0%</td></tr>`;
  html += `<tr><td colspan="3"></td></tr>`;

  html += `<tr><td colspan="3" style="font-weight:bold; text-decoration: underline;">Resultados:</td></tr>`;
  html += `<tr><td colspan="3">Intervalo de confianza (${res.nc},0%)</td></tr>`;
  html += `<tr><th style="${cssTh}">Indice de posicion</th><th style="${cssTh}">Limite inferior</th><th style="${cssTh}">Limite superior</th></tr>`;
  html += `<tr><td style="${cssTdNum}">${fmt3(res.ip).replace(".", ",")}</td><td style="${cssTdNum}">${fmt3(res.lower).replace(".", ",")}</td><td style="${cssTdNum}">${fmt3(res.upper).replace(".", ",")}</td></tr>`;

  html += `</table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `indice_posicion_${Date.now()}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportarWord(res: IndiceResult): void {
  const css = {
    th: "background:#d9d9d9;border:1px solid #000;padding:7px 12px;font-weight:bold;text-align:center;font-family:'Calibri',sans-serif;font-size:11pt",
    td: "border:1px solid #000;padding:6px 12px;text-align:right;font-family:'Calibri',sans-serif;font-size:11pt",
    tbl: "border-collapse:collapse;width:100%;max-width:400px;margin-bottom:14pt",
    h2: "font-family:'Calibri',sans-serif;font-size:14pt;font-weight:bold;margin-top:12pt;margin-bottom:4pt",
    h3: "font-family:'Calibri',sans-serif;font-size:12pt;font-weight:bold;margin-top:10pt;margin-bottom:4pt",
    p: "font-family:'Calibri',sans-serif;font-size:11pt;color:#000;margin:3pt 0",
  };

  let html = `<h2 style="${css.h2}">Inferencia sobre un indice de posicion</h2>`;
  if (res.varLabel !== "Datos resumidos") html += `<p style="${css.p}">Categorias: ${res.varLabel}</p>`;

  html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Categorias</th><th style="${css.th}">Numero de sujetos</th></tr></thead><tbody>`;
  res.frecuencias.forEach((f, i) => {
    html += `<tr><td style="${css.td}">${i + 1}</td><td style="${css.td}">${f}</td></tr>`;
  });
  html += `</tbody></table>`;

  html += `<p style="${css.p}">Numero de categorias: ${res.k}</p>`;
  html += `<p style="${css.p}">Nivel de confianza: ${res.nc},0%</p>`;

  html += `<h3 style="${css.h3}">Resultados:</h3>`;
  html += `<p style="${css.p}">Intervalo de confianza (${res.nc},0%)</p>`;
  html += `<table style="${css.tbl}"><thead><tr><th style="${css.th}">Indice de posicion</th><th style="${css.th}">Limite inferior</th><th style="${css.th}">Limite superior</th></tr></thead><tbody>`;
  html += `<tr><td style="${css.td}">${fmt3(res.ip).replace(".", ",")}</td><td style="${css.td}">${fmt3(res.lower).replace(".", ",")}</td><td style="${css.td}">${fmt3(res.upper).replace(".", ",")}</td></tr>`;
  html += `</tbody></table>`;

  const blob = new Blob(
    [`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'/><style>body{margin:2cm;}</style></head><body>${html}</body></html>`],
    { type: "application/msword" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `indice_posicion_${Date.now()}.doc`;
  a.click(); URL.revokeObjectURL(url);
}

/* --------------------------------------------------------------------------
   UI COMPONENTS
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
  up: "<polyline points='18 15 12 9 6 15'/>",
  down: "<polyline points='6 9 12 15 18 9'/>",
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

function ResultTableCard({ res, onContinuarChat }: ResultTableCardProps) {
  const [iaOpen, setIaOpen] = useState(false);
  const [iaLoad, setIaLoad] = useState(false);
  const [iaText, setIaText] = useState("");

  const buildResumen = () => {
    let txt = "Inferencia sobre un Indice de Posicion\n";
    txt += `N total = ${res.n} | Categorias (k) = ${res.k} | Nivel Confianza = ${res.nc}%\n`;
    txt += `Indice Estimado = ${fmt3(res.ip)} | IC(${res.nc}%): [${fmt3(res.lower)} , ${fmt3(res.upper)}]\n`;
    txt += "\nINSTRUCCIONES PARA LA IA: Interpreta este Indice de Posicion (Variacion Relativa). Recuerda que un valor de 0 significa que todos los casos estan en la categoria mas baja, 1 que todos estan en la categoria mas alta, y 0.5 que el promedio esta justo en medio. Redacta la conclusion orientada al ambito biomedico basandote en la magnitud del indice.";
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
            content: "Eres un estadistico clinico experto. Interpreta la siguiente tabla generada (Epidat). Resume el hallazgo en un parrafo fluido (sin listas). Termina ofreciendo ayuda analitica.\n\n" + buildResumen(),
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
          <span style={{ width: 4, height: 20, background: "#0d9488", borderRadius: 2 }} />
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>Resultados</h3>
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
              <span style={{ fontSize: 14, fontWeight: 700, color: "#4c1d95" }}>Asistente Bioestadistico IA</span>
            </div>
            <button onClick={() => setIaOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", padding: 2 }}>
              <Icon d={IC_SVG.x} />
            </button>
          </div>
          <div style={{ background: "white", borderRadius: 10, border: "1px solid #ddd6fe", padding: "14px 18px", fontSize: 13, color: "#374151", lineHeight: 1.7, minHeight: 80 }}>
            {iaLoad ? <div style={{ display: "flex", gap: 10, alignItems: "center", color: "#9ca3af" }}><Spin sm /> Analizando tendencias direccionales...</div> : <div style={{ whiteSpace: "pre-wrap" }}>{iaText}</div>}
          </div>
          {iaText && !iaLoad && (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => onContinuarChat?.(`Hablemos sobre el Indice de Posicion calculado (${fmt3(res.ip)}).`)} className="hov-btn" style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon d={IC_SVG.chat} size={13} /> Continuar al chat
              </button>
            </div>
          )}
        </div>
      )}

      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Intervalo de confianza ({res.nc},0%)</p>
        <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
            <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
              <tr>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#4b5563" }}>Indice de posicion</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#4b5563" }}>Limite inferior</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#4b5563" }}>Limite superior</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "white" }}>
                <td style={{ padding: "8px 14px", fontFamily: "'DM Mono', monospace", color: "#111827", fontWeight: 700 }}>{fmt3(res.ip)}</td>
                <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "'DM Mono', monospace", color: "#4b5563" }}>{fmt3(res.lower)}</td>
                <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "'DM Mono', monospace", color: "#4b5563" }}>{fmt3(res.upper)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function InferenciaIndicePosicion({
  datosExcel = null,
  loadingExcel = false,
  onBack,
  onContinuarChat = null,
}: InferenciaIndicePosicionProps) {
  const [modo, setModo] = useState("resumido");
  const [colVar, setColVar] = useState("");

  const [numCats, setNumCats] = useState(2);
  const [frecuencias, setFrecuencias] = useState<string[]>(["2204", "1798"]);
  const [showWarning, setShowWarning] = useState(false);

  const [nivelConf, setNivel] = useState(95);

  const [resultado, setResultados] = useState<IndiceResult | null>(null);
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState("");

  const colsDisp = useMemo(() => {
    if (!datosExcel?.length) return [];
    return Object.keys(datosExcel[0]);
  }, [datosExcel]);

  const handleNumCatsChange = (val: number) => {
    const newVal = Math.max(2, val);
    setNumCats(newVal);
    setFrecuencias((prev) => {
      const arr = [...prev];
      if (newVal > arr.length) {
        while (arr.length < newVal) arr.push("");
      } else if (newVal < arr.length) {
        arr.length = newVal;
      }
      return arr;
    });
  };

  const handleFrecChange = (idx: number, val: string) => {
    const newFrecs = [...frecuencias];
    newFrecs[idx] = val.replace(/\D/g, "");
    setFrecuencias(newFrecs);
  };

  const processIndividualData = () => {
    if (!datosExcel || !colVar) return;
    setLoad(true);

    setTimeout(() => {
      const counts: Record<string, number> = {};
      for (const row of datosExcel) {
        const val = row[colVar];
        if (val !== null && val !== undefined && String(val).trim() !== "") {
          const strVal = String(val).trim();
          counts[strVal] = (counts[strVal] || 0) + 1;
        }
      }

      const uniqueKeys = Object.keys(counts).sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });

      if (uniqueKeys.length < 2) {
        setErr("La variable seleccionada no tiene al menos 2 categorias.");
        setLoad(false);
        return;
      }

      const newFrecs = uniqueKeys.map((k) => String(counts[k]));
      setNumCats(newFrecs.length);
      setFrecuencias(newFrecs);
      setModo("resumido");
      setErr("");
      setLoad(false);
    }, 100);
  };

  const handleCalc = () => {
    setLoad(true); setErr(""); setResultados(null);

    setTimeout(() => {
      try {
        const numFrecs = frecuencias.map((f) => parseInt(f, 10) || 0);
        const res = calcIndice(numFrecs, nivelConf);
        setResultados({
          ip: res.ip,
          lower: res.lower,
          upper: res.upper,
          n: res.N,
          k: res.k,
          nc: nivelConf,
          frecuencias: numFrecs,
          varLabel: colVar && modo === "individual" ? colVar : "Datos resumidos",
        });
      } catch (ex: unknown) {
        setErr(`Error al calcular: ${ex instanceof Error ? ex.message : "Desconocido"}`);
      }
      setLoad(false);
    }, 150);
  };

  const handleReset = () => {
    setColVar("");
    setNumCats(2);
    setFrecuencias(["", ""]);
    setNivel(95);
    setResultados(null);
    setErr("");
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f4f6f8", minHeight: "100vh", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        .hov-btn:hover     { opacity:.85; transform:translateY(-1px) }
        .modo-tab:hover    { background:#f0fdf4 !important }
        input[type=number] { -moz-appearance:textfield }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance:none }
        .modal-bg { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:999; animation:fadeIn .2s; }
        .modal-card { background:white; width:90%; max-width:600px; border-radius:16px; padding:24px; box-shadow:0 10px 25px rgba(0,0,0,0.1); animation:slideUp .3s ease; }
      `}</style>

      {showWarning && (
        <div className="modal-bg">
          <div className="modal-card">
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ background: "#fef3c7", color: "#d97706", padding: 10, borderRadius: "50%" }}>
                <Icon d={IC_SVG.warn} size={24} />
              </div>
              <div>
                <h3 style={{ margin: "0 0 10px 0", color: "#111827", fontSize: 18 }}>Aviso importante</h3>
                <p style={{ margin: 0, color: "#374151", fontSize: 14, lineHeight: 1.6 }}>
                  {numCats} es el mayor valor hallado en la muestra (o seleccionado) para la variable.
                  Pero si la variable analizada admitia un <b>numero de categorias mayor</b> que {numCats}
                  (aunque ningun sujeto las haya marcado, resultando en frecuencias de cero), el usuario debe
                  <b> aumentar el numero de categorias</b> y poner ese numero maximo teorico.
                </p>
              </div>
            </div>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowWarning(false)} className="hov-btn" style={{ padding: "10px 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <button onClick={onBack} className="hov-btn" style={{ color: "#0d9488", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", border: "none", background: "none", padding: 0, fontFamily: "inherit", fontSize: 13, fontWeight: 500 }}>
            <Icon d={IC_SVG.back} size={14} /> Una poblacion
          </button>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#111827", fontWeight: 600 }}>Indice de posicion</span>
        </div>

        <div style={{ background: "white", borderRadius: "16px 16px 0 0", padding: "28px 32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 32, borderRadius: 4, background: "#0d9488", flexShrink: 0 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-.02em" }}>
              Inferencia sobre un indice de posicion
            </h1>
          </div>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "6px 0 0 14px", lineHeight: 1.5, paddingBottom: 20 }}>
            Analisis de la variacion relativa ordinal (Indice de Bachi). Determina el peso posicional promedio de una variable categorica ponderada.
          </p>
        </div>

        <div style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", borderTop: "1px solid #a7f3d0", borderBottom: "1px solid #a7f3d0", padding: "13px 22px", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#065f46" }}>
          <span style={{ background: "#0d9488", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, marginTop: 1 }}>
            <Icon d={IC_SVG.info} size={13} />
          </span>
          <span style={{ lineHeight: 1.65 }}>
            <b>Para que sirve?</b> Evalua si los casos tienden a acumularse en las categorias inferiores (cercano a 0) o superiores (cercano a 1). El valor 0.5 indica equilibrio central absoluto.
          </span>
        </div>

        <div style={{ background: "white", borderRadius: "0 0 16px 16px", borderTop: "1px solid #e5e7eb", padding: "26px 28px 24px", boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 0, border: "1.5px solid #e5e7eb", borderRadius: 11, overflow: "hidden", marginBottom: 24, width: "fit-content" }}>
            {[["resumido", "✏️", "Datos resumidos"], ["individual", "📊", "Datos individuales (Excel)"]].map(([m, emoji, label]) => (
              <button key={m} className="modo-tab" onClick={() => { setModo(m); setResultados(null); }} style={{ padding: "9px 20px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: modo === m ? "#f0fdf4" : "white", color: modo === m ? "#0f766e" : "#6b7280", borderRight: m === "resumido" ? "1.5px solid #e5e7eb" : "none", fontFamily: "inherit", transition: "all .15s", display: "flex", alignItems: "center", gap: 6 }}>
                {emoji} {label}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {modo === "resumido" ? (
                <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "20px", background: "#f9fafb" }}>
                  <StepLabel step="Paso 1" label="Origen de los datos" />
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Numero de categorias:</label>
                    <div style={{ display: "flex", border: "2px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background: "white" }}>
                      <input type="number" min="2" value={numCats} onChange={(e: ChangeEvent<HTMLInputElement>) => handleNumCatsChange(parseInt(e.target.value, 10) || 2)} style={{ width: 50, border: "none", textAlign: "center", fontSize: 14, fontWeight: 700, outline: "none", pointerEvents: "none" }} readOnly />
                      <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid #e5e7eb" }}>
                        <button onClick={() => handleNumCatsChange(numCats + 1)} style={{ border: "none", background: "#f3f4f6", cursor: "pointer", padding: "2px 6px" }}><Icon d={IC_SVG.up} size={10} /></button>
                        <button onClick={() => handleNumCatsChange(numCats - 1)} style={{ border: "none", borderTop: "1px solid #e5e7eb", background: "#f3f4f6", cursor: "pointer", padding: "2px 6px" }}><Icon d={IC_SVG.down} size={10} /></button>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowWarning(true)} className="hov-btn" style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", color: "#111827", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Advertencia
                  </button>
                </div>
              ) : (
                <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "20px", background: "#f9fafb" }}>
                  <StepLabel step="Paso 1" label="Seleccionar columna" />
                  {!datosExcel ? (
                    <div style={{ padding: "10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, fontSize: 12, color: "#92400e" }}>
                      {loadingExcel ? "Cargando Excel..." : "Sube tu base de datos en Preprocesamiento."}
                    </div>
                  ) : colsDisp.length === 0 ? (
                    <div style={{ padding: "10px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 12, color: "#991b1b" }}>
                      No hay columnas en el dataset.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <select value={colVar} onChange={(e: ChangeEvent<HTMLSelectElement>) => setColVar(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: `2px solid ${colVar ? "#0d9488" : "#e5e7eb"}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: colVar ? "#111827" : "#9ca3af", outline: "none", cursor: "pointer" }}>
                        <option value="">Selecciona la variable ordinal...</option>
                        {colsDisp.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button onClick={processIndividualData} disabled={!colVar} className="hov-btn" style={{ padding: "10px", borderRadius: 8, border: "none", background: colVar ? "#0d9488" : "#d1d5db", color: "white", fontWeight: 700, cursor: colVar ? "pointer" : "not-allowed" }}>
                        Procesar a tabla
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "18px" }}>
                <StepLabel step="Paso 2" label="Nivel de confianza" />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, border: "2px solid #e5e7eb", borderRadius: 8, padding: "6px 12px", background: "white", width: 100 }}>
                    <input type="number" min={80} max={99.9} step={0.1} value={nivelConf} onChange={(e: ChangeEvent<HTMLInputElement>) => setNivel(Math.min(99.9, Math.max(80, +e.target.value)))} style={{ width: "100%", border: "none", fontSize: 14, fontWeight: 700, color: "#111827", textAlign: "right", fontFamily: "inherit", outline: "none" }} />
                    <span style={{ fontSize: 13, color: "#6b7280" }}>%</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "20px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Categorias</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Numero de sujetos</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", border: "1px solid #d1d5db", borderRadius: 8, maxHeight: 220 }}>
                {frecuencias.map((f, i) => (
                  <div key={i} style={{ display: "flex", borderBottom: i < frecuencias.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                    <div style={{ width: "50%", padding: "10px", background: "white", textAlign: "center", fontSize: 14, fontWeight: 600, color: "#111827", borderRight: "1px solid #e5e7eb" }}>
                      {i + 1}
                    </div>
                    <div style={{ width: "50%", background: "#f3f4f6" }}>
                      <input type="text" value={f} onChange={(e: ChangeEvent<HTMLInputElement>) => handleFrecChange(i, e.target.value)} placeholder="0" style={{ width: "100%", height: "100%", background: "transparent", border: "none", textAlign: "right", padding: "0 14px", fontSize: 14, fontFamily: "'DM Mono', monospace", outline: "none" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCalc} disabled={load} className="hov-btn" style={{ flex: 1, padding: "13px 20px", borderRadius: 12, border: "none", cursor: load ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "linear-gradient(135deg,#14b8a6,#0d9488)", color: "white", boxShadow: "0 4px 14px rgba(13,148,136,.28)", transition: "all .25s" }}>
            {load ? <><Spin /> Calculando...</> : <><Icon d={IC_SVG.calc} size={16} /> Calcular indice</>}
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

        {resultado && (
          <div style={{ marginTop: 30, animation: "slideUp .4s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: "16px 24px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
                <span><b style={{ color: "#4b5563" }}>Filtro:</b> No</span>
                <span><b style={{ color: "#4b5563" }}>Numero de categorias:</b> {resultado.k}</span>
                <span><b style={{ color: "#4b5563" }}>Nivel de confianza:</b> {resultado.nc},0%</span>
                <span><b style={{ color: "#4b5563" }}>Tamano muestral N:</b> {fmtN(resultado.n)}</span>
              </div>
            </div>

            <ResultTableCard
              res={resultado}
              onContinuarChat={onContinuarChat}
            />
          </div>
        )}
      </div>
    </div>
  );
}
