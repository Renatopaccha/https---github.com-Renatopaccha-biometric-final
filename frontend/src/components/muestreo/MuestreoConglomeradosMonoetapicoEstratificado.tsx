import { useMemo, useState, type ReactNode } from "react";

/*
  BIOMETRIC — Muestreo por Conglomerados Monoetapico Estratificado
*/

/* Fisher-Yates sin reemplazo */
function seleccionar(arr: any[], m: number): any[] {
  const a = [...arr];
  for (let i = 0; i < Math.min(m, a.length); i++) {
    const j = i + Math.floor(Math.random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, m);
}

function repartirRestoConCapacidad(
  base: number[],
  prioridad: number[],
  caps: number[],
  objetivo: number
): number[] {
  const out = [...base];
  let faltan = objetivo - out.reduce((s, v) => s + v, 0);

  if (faltan <= 0) return out;

  while (faltan > 0) {
    let avanzo = false;
    for (const idx of prioridad) {
      if (out[idx] < caps[idx]) {
        out[idx] += 1;
        faltan -= 1;
        avanzo = true;
        if (faltan === 0) break;
      }
    }
    if (!avanzo) break;
  }

  return out;
}

/*
 * Asignacion proporcional de conglomerados por estrato
 * m_h = m × (M_h / M) con Hamilton y limite m_h <= M_h
 */
function asignacionProporcional(estratos: { Mh: number }[], mTotal: number): number[] {
  const M = estratos.reduce((s, e) => s + e.Mh, 0);
  if (M <= 0 || mTotal <= 0) return estratos.map(() => 0);

  const raw = estratos.map((e) => (mTotal * e.Mh) / M);

  const base = raw.map((m, i) => Math.min(Math.floor(m), estratos[i].Mh));

  const prioridad = raw
    .map((m, i) => ({ i, r: m - Math.floor(m) }))
    .sort((a, b) => b.r - a.r)
    .map((x) => x.i);

  return repartirRestoConCapacidad(
    base,
    prioridad,
    estratos.map((e) => e.Mh),
    Math.min(mTotal, M)
  );
}

/* Asignacion igual con tope m_h <= M_h */
function asignacionIgual(estratos: { Mh: number }[], mTotal: number): number[] {
  const H = estratos.length;
  if (H === 0 || mTotal <= 0) return [];

  const baseVal = Math.floor(mTotal / H);
  const extra = mTotal - baseVal * H;

  const base = estratos.map((e, i) => Math.min(baseVal + (i < extra ? 1 : 0), e.Mh));

  const prioridad = estratos
    .map((e, i) => ({ i, capRest: e.Mh - base[i] }))
    .sort((a, b) => b.capRest - a.capRest)
    .map((x) => x.i);

  return repartirRestoConCapacidad(
    base,
    prioridad,
    estratos.map((e) => e.Mh),
    Math.min(mTotal, estratos.reduce((s, e) => s + e.Mh, 0))
  );
}

function individuosAClusters(
  nhPorEstrato: number[],
  estratos: { Mh: number; Nh: number }[]
): number[] {
  return estratos.map((e, i) => {
    if (e.Mh <= 0 || e.Nh <= 0) return 0;
    const promConglo = e.Nh / e.Mh;
    const mh = Math.ceil(nhPorEstrato[i] / promConglo);
    return Math.min(Math.max(mh, 0), e.Mh);
  });
}

async function exportarExcel(sheets: { nombre: string; datos: any[] }[], nombre: string) {
  if (!(window as any).XLSX) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const XLSX = (window as any).XLSX;
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ nombre: n, datos }) => {
    const ws = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(wb, ws, String(n).slice(0, 31));
  });
  XLSX.writeFile(wb, `${nombre}.xlsx`);
}

const COLORES_ESTRATO = [
  { bg: "#ecfdf5", brd: "#6ee7b7", txt: "#065f46", dot: "#10b981" },
  { bg: "#eff6ff", brd: "#93c5fd", txt: "#1e3a8a", dot: "#3b82f6" },
  { bg: "#fdf4ff", brd: "#d8b4fe", txt: "#581c87", dot: "#a855f7" },
  { bg: "#fff7ed", brd: "#fdba74", txt: "#7c2d12", dot: "#f97316" },
  { bg: "#fefce8", brd: "#fde047", txt: "#713f12", dot: "#eab308" },
  { bg: "#fdf2f8", brd: "#f9a8d4", txt: "#831843", dot: "#ec4899" },
  { bg: "#f0f9ff", brd: "#7dd3fc", txt: "#0c4a6e", dot: "#0ea5e9" },
  { bg: "#f0fdf4", brd: "#86efac", txt: "#14532d", dot: "#22c55e" },
];

const COL_CONGLO = [
  { bg: "#f0f9ff", brd: "#7dd3fc", txt: "#0c4a6e", dot: "#0ea5e9" },
  { bg: "#fef3c7", brd: "#fcd34d", txt: "#78350f", dot: "#f59e0b" },
  { bg: "#fce7f3", brd: "#f9a8d4", txt: "#831843", dot: "#ec4899" },
  { bg: "#e0e7ff", brd: "#a5b4fc", txt: "#3730a3", dot: "#6366f1" },
];

const getColEstrato = (i: number) => COLORES_ESTRATO[i % COLORES_ESTRATO.length];
const getColConglo = (i: number) => COL_CONGLO[i % COL_CONGLO.length];

const I = (d: string, w = 16) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
);

const BackIcon = () => I('<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>', 15);
const DownloadIcon = () => I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>');
const ResetIcon = () => I('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>', 15);
const SparkleIcon = () => I('<path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/>', 14);
const InfoIcon = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>;
const CalcIcon = () => I('<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/>', 17);
const AddIcon = () => I('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 15);
const TrashIcon = () => I('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>', 15);
const LayersIcon = () => I('<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>', 18);
const BuildingIcon = () => I('<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>', 20);
const SortIcon = () => I('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><polyline points="3 6 4 7 6 4"/><polyline points="3 12 4 13 6 10"/><polyline points="3 18 4 19 6 16"/>', 14);

const FILAS_PAG = 50;
const PREV_MAX = 2000;

interface Conglomerado {
  nombre: string;
  N: number;
  filas: any[];
}

interface Estrato {
  nombre: string;
  conglomerados: Conglomerado[];
  mh_manual: number;
}

interface EstratoManual {
  nombre: string;
  conglomerados: { nombre: string; N: string }[];
  mh_manual: string;
}

interface Props {
  datosExcel?: any[] | null;
  loadingExcel?: boolean;
  onBack?: () => void;
}

export default function MuestreoConglomeradosMonoetapicoEstratificado({ datosExcel = null, loadingExcel = false, onBack }: Props) {
  const [modo, setModo] = useState<"manual" | "excel">("manual");
  const [tipoEnt, setTipoEnt] = useState<"individual" | "agregado">("individual");

  const [colEstrato, setColEstrato] = useState("");
  const [colConglo, setColConglo] = useState("");
  const [colNom, setColNom] = useState("");
  const [colTam, setColTam] = useState("");

  const [estratosMan, setEstratosMan] = useState<EstratoManual[]>([
    {
      nombre: "Urbano",
      conglomerados: [
        { nombre: "Escuela A", N: "320" },
        { nombre: "Escuela B", N: "280" },
        { nombre: "Escuela C", N: "410" },
      ],
      mh_manual: "",
    },
    {
      nombre: "Rural",
      conglomerados: [
        { nombre: "Escuela D", N: "190" },
        { nombre: "Escuela E", N: "250" },
      ],
      mh_manual: "",
    },
  ]);

  const [mhExcelManual, setMhExcelManual] = useState<Record<string, string>>({});

  const [asignacion, setAsignacion] = useState<"proporcional" | "igual" | "manual">("proporcional");
  const [unidadDefinida, setUnidadDefinida] = useState<"individuos" | "conglomerados">("conglomerados");
  const [igualTamanoEstrato, setIgualTamanoEstrato] = useState("");
  const [modoM, setModoM] = useState<"numero" | "porcentaje">("numero");
  const [mTotal, setMTotal] = useState("");
  const [porcentajeM, setPorcentajeM] = useState("");

  const [ordenar, setOrdenar] = useState(false);

  const [resultado, setResultado] = useState<any>(null);
  const [tabActivo, setTabActivo] = useState("resumen");
  const [paginas, setPaginas] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [descLoading, setDescLoading] = useState(false);
  const [error, setError] = useState("");

  const colsExcel = datosExcel && datosExcel.length > 0 ? Object.keys(datosExcel[0]) : [];

  const estratosExcel = useMemo(() => {
    if (!datosExcel || !datosExcel.length) return [];

    if (tipoEnt === "individual") {
      if (!colEstrato || !colConglo) return [];

      const grupos: Record<string, Record<string, any[]>> = {};
      datosExcel.forEach((fila) => {
        const estratoVal = String(fila[colEstrato] ?? "Sin estrato");
        const congloVal = String(fila[colConglo] ?? "Sin conglo");
        if (!grupos[estratoVal]) grupos[estratoVal] = {};
        if (!grupos[estratoVal][congloVal]) grupos[estratoVal][congloVal] = [];
        grupos[estratoVal][congloVal].push(fila);
      });

      return Object.entries(grupos)
        .sort(([a], [b]) => String(a).localeCompare(String(b), undefined, { numeric: true }))
        .map(([nombreEstrato, congos]) => ({
          nombre: nombreEstrato,
          conglomerados: Object.entries(congos)
            .sort(([a], [b]) => String(a).localeCompare(String(b), undefined, { numeric: true }))
            .map(([nombreConglo, filas]) => ({
              nombre: nombreConglo,
              N: filas.length,
              filas,
            })),
          mh_manual: parseInt(mhExcelManual[nombreEstrato] ?? "") || 0,
        }));
    }

    if (!colEstrato || !colNom || !colTam) return [];

    const grupos: Record<string, Conglomerado[]> = {};
    datosExcel.forEach((fila) => {
      const estratoVal = String(fila[colEstrato] ?? "Sin estrato");
      const nombreConglo = String(fila[colNom] ?? "");
      const tamConglo = parseInt(fila[colTam]) || 1;
      if (!grupos[estratoVal]) grupos[estratoVal] = [];
      grupos[estratoVal].push({ nombre: nombreConglo, N: tamConglo, filas: [fila] });
    });

    return Object.entries(grupos)
      .sort(([a], [b]) => String(a).localeCompare(String(b), undefined, { numeric: true }))
      .map(([nombreEstrato, conglomerados]) => ({
        nombre: nombreEstrato,
        conglomerados: conglomerados.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), undefined, { numeric: true })),
        mh_manual: parseInt(mhExcelManual[nombreEstrato] ?? "") || 0,
      }));
  }, [datosExcel, tipoEnt, colEstrato, colConglo, colNom, colTam, mhExcelManual]);

  const listaEstratos = modo === "manual"
    ? estratosMan.map((e) => ({
        nombre: e.nombre,
        conglomerados: e.conglomerados.map((c) => ({
          nombre: c.nombre,
          N: parseInt(c.N) || 0,
          filas: [],
        })),
        mh_manual: parseInt(e.mh_manual) || 0,
        Mh: e.conglomerados.length,
        Nh: e.conglomerados.reduce((s, c) => s + (parseInt(c.N) || 0), 0),
      }))
    : estratosExcel.map((e) => ({
        ...e,
        Mh: e.conglomerados.length,
        Nh: e.conglomerados.reduce((s, c) => s + c.N, 0),
      }));

  const H = listaEstratos.length;
  const M = listaEstratos.reduce((s, e) => s + e.Mh, 0);
  const N = listaEstratos.reduce((s, e) => s + e.Nh, 0);

  const objetivoConglomerados = useMemo(() => {
    if (modoM === "numero") return parseInt(mTotal);
    const p = parseFloat(porcentajeM);
    if (isNaN(p)) return NaN;
    return Math.ceil((p / 100) * M);
  }, [modoM, mTotal, porcentajeM, M]);

  const objetivoIndividuos = useMemo(() => {
    if (modoM === "numero") return parseInt(mTotal);
    const p = parseFloat(porcentajeM);
    if (isNaN(p)) return NaN;
    return Math.ceil((p / 100) * N);
  }, [modoM, mTotal, porcentajeM, N]);

  const asignacionIgualConfig = useMemo(() => {
    if (asignacion !== "igual") return null;

    const q = parseInt(igualTamanoEstrato);
    if (isNaN(q)) return null;

    if (unidadDefinida === "conglomerados") {
      const mh = listaEstratos.map((e) => Math.min(q, e.Mh));
      return { mh, nhObjetivo: null };
    }

    const nhObjetivo = listaEstratos.map((e) => Math.min(q, e.Nh));
    const mh = individuosAClusters(nhObjetivo, listaEstratos);
    return { mh, nhObjetivo };
  }, [asignacion, igualTamanoEstrato, listaEstratos, unidadDefinida]);

  const distribucionActual = useMemo(() => {
    if (asignacion === "manual") {
      if (unidadDefinida === "conglomerados") {
        const mh = listaEstratos.map((e) => e.mh_manual || 0);
        return { mh, nhObjetivo: null as number[] | null };
      }
      const nhObjetivo = listaEstratos.map((e) => e.mh_manual || 0);
      const mh = individuosAClusters(nhObjetivo, listaEstratos);
      return { mh, nhObjetivo };
    }

    if (asignacion === "igual") {
      if (!asignacionIgualConfig) return null;
      return { mh: asignacionIgualConfig.mh, nhObjetivo: asignacionIgualConfig.nhObjetivo };
    }

    if (unidadDefinida === "conglomerados") {
      if (isNaN(objetivoConglomerados) || objetivoConglomerados < 1) return null;
      const mh = asignacionProporcional(listaEstratos, objetivoConglomerados);
      return { mh, nhObjetivo: null as number[] | null };
    }

    if (isNaN(objetivoIndividuos) || objetivoIndividuos < 1) return null;
    const nhObjetivo = asignacionProporcional(
      listaEstratos.map((e) => ({ Mh: e.Nh })),
      objetivoIndividuos
    );
    const mh = individuosAClusters(nhObjetivo, listaEstratos);
    return { mh, nhObjetivo };
  }, [
    asignacion,
    listaEstratos,
    unidadDefinida,
    objetivoConglomerados,
    objetivoIndividuos,
    asignacionIgualConfig,
  ]);

  const vmFinal = useMemo(() => {
    if (!distribucionActual) return NaN;
    return distribucionActual.mh.reduce((s, x) => s + x, 0);
  }, [distribucionActual]);

  const errorMsg = useMemo(() => {
    if (H < 2) {
      if (modo === "manual") return "Define al menos 2 estratos.";
      const necesitaCol = tipoEnt === "individual" ? (!colEstrato || !colConglo) : (!colEstrato || !colNom || !colTam);
      if (necesitaCol) return "";
      return "Se necesitan al menos 2 estratos.";
    }

    if (modo === "manual") {
      if (estratosMan.some((e) => !e.nombre.trim())) return "Todos los estratos deben tener nombre.";
      if (estratosMan.some((e) => e.conglomerados.length < 1)) return "Cada estrato debe tener al menos 1 conglomerado.";
      if (estratosMan.some((e) => e.conglomerados.some((c) => !c.nombre.trim() || !parseInt(c.N) || parseInt(c.N) < 1))) {
        return "Todos los conglomerados deben tener nombre y tamano >= 1.";
      }
    }

    if (asignacion === "manual" && unidadDefinida === "individuos") {
      // Permitido: el usuario define n_h por estrato y se convierte a conglomerados.
    }

    if (asignacion === "igual") {
      if (igualTamanoEstrato === "") return "";
      const q = parseInt(igualTamanoEstrato);
      if (isNaN(q) || q < 1) {
        return unidadDefinida === "conglomerados"
          ? "Define un tamano fijo m_h valido (>= 1)."
          : "Define un tamano fijo n_h valido (>= 1).";
      }
      if (unidadDefinida === "conglomerados") {
        const minMh = Math.min(...listaEstratos.map((e) => e.Mh));
        if (q > minMh) return `El tamano fijo por estrato no puede superar ${minMh} (estrato con menos conglomerados).`;
      } else {
        const minNh = Math.min(...listaEstratos.map((e) => e.Nh));
        if (q > minNh) return `El tamano fijo por estrato no puede superar ${minNh} individuos (estrato mas pequeno).`;
      }
    } else {
      if (modoM === "numero" && mTotal === "") return "";
      if (modoM === "porcentaje" && porcentajeM === "") return "";

      if (modoM === "porcentaje") {
        const p = parseFloat(porcentajeM);
        if (isNaN(p) || p <= 0 || p >= 100) return "El porcentaje debe estar entre 0 y 100 (sin incluir extremos).";
      }
    }

    if (asignacion === "proporcional" && unidadDefinida === "individuos") {
      if (isNaN(objetivoIndividuos) || objetivoIndividuos < 1) return "Selecciona al menos 1 individuo en la muestra objetivo.";
      if (objetivoIndividuos >= N) return `Debes seleccionar menos de ${N} individuos (total disponible).`;
    } else {
      const objetivoConglo = asignacion === "manual" ? objetivoConglomerados : vmFinal;
      if (isNaN(objetivoConglo) || objetivoConglo < 1) return "Selecciona al menos 1 conglomerado.";
      if (objetivoConglo >= M) return `Debes seleccionar menos de ${M} conglomerados (total disponible).`;
    }

    if (asignacion === "manual") {
      const totalManual = listaEstratos.reduce((s, e) => s + (e.mh_manual || 0), 0);
      if (totalManual === 0) {
        return unidadDefinida === "individuos"
          ? "Define el numero de individuos en al menos un estrato."
          : "Define el numero de conglomerados en al menos un estrato.";
      }
      if (unidadDefinida === "conglomerados") {
        if (totalManual !== objetivoConglomerados) return `La suma de conglomerados por estrato (${totalManual}) debe igualar m (${objetivoConglomerados}).`;
        if (listaEstratos.some((e) => e.mh_manual > e.Mh)) {
          return "Algunos estratos tienen mh mayor que sus conglomerados disponibles.";
        }
      } else {
        if (totalManual !== objetivoIndividuos) return `La suma de individuos por estrato (${totalManual}) debe igualar n (${objetivoIndividuos}).`;
        if (listaEstratos.some((e) => e.mh_manual > e.Nh)) {
          return "Algunos estratos tienen n_h mayor que sus individuos disponibles.";
        }
      }
    }

    return "";
  }, [H, M, N, mTotal, porcentajeM, modoM, vmFinal, modo, estratosMan, asignacion, listaEstratos, tipoEnt, colEstrato, colConglo, colNom, colTam, igualTamanoEstrato, objetivoConglomerados, objetivoIndividuos, unidadDefinida]);

  const canCalc = !errorMsg && H >= 2 && !!distribucionActual &&
    vmFinal >= 1 && vmFinal < M &&
    (asignacion !== "manual" || listaEstratos.every((e) => e.mh_manual >= 0)) &&
    (modo === "manual"
      ? estratosMan.every((e) => e.nombre.trim() && e.conglomerados.every((c) => c.nombre.trim() && parseInt(c.N) >= 1))
      : (tipoEnt === "individual" ? (!!colEstrato && !!colConglo) : (!!colEstrato && !!colNom && !!colTam)));

  const previewAsignacion = useMemo(() => {
    if (!canCalc || vmFinal < 1 || !distribucionActual) return null;

    const mh_por_estrato = distribucionActual.mh;

    return listaEstratos.map((e, i) => ({
      nombre: e.nombre,
      Mh: e.Mh,
      mh: mh_por_estrato[i] || 0,
    }));
  }, [canCalc, vmFinal, listaEstratos, distribucionActual]);

  const addEstrato = () => {
    setEstratosMan((prev) => [...prev, {
      nombre: `Estrato ${prev.length + 1}`,
      conglomerados: [
        { nombre: "Conglomerado 1", N: "" },
      ],
      mh_manual: "",
    }]);
  };

  const removeEstrato = (idx: number) => {
    if (estratosMan.length <= 2) return;
    setEstratosMan((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateEstrato = (idx: number, campo: keyof EstratoManual, valor: string) => {
    setEstratosMan((prev) => prev.map((e, i) => i === idx ? { ...e, [campo]: valor } : e));
    setResultado(null);
  };

  const addCongloAEstrato = (idxEstrato: number) => {
    setEstratosMan((prev) => prev.map((e, i) => {
      if (i !== idxEstrato) return e;
      return {
        ...e,
        conglomerados: [...e.conglomerados, { nombre: `Conglomerado ${e.conglomerados.length + 1}`, N: "" }],
      };
    }));
  };

  const removeCongloDeEstrato = (idxEstrato: number, idxConglo: number) => {
    setEstratosMan((prev) => prev.map((e, i) => {
      if (i !== idxEstrato) return e;
      if (e.conglomerados.length <= 1) return e;
      return {
        ...e,
        conglomerados: e.conglomerados.filter((_, j) => j !== idxConglo),
      };
    }));
  };

  const updateConglo = (idxEstrato: number, idxConglo: number, campo: "nombre" | "N", valor: string) => {
    setEstratosMan((prev) => prev.map((e, i) => {
      if (i !== idxEstrato) return e;
      return {
        ...e,
        conglomerados: e.conglomerados.map((c, j) => j === idxConglo ? { ...c, [campo]: valor } : c),
      };
    }));
    setResultado(null);
  };

  const handleUpdateMhManual = (nombreEstrato: string, valor: string, idxManual: number) => {
    if (modo === "manual") {
      updateEstrato(idxManual, "mh_manual", valor);
      return;
    }
    setMhExcelManual((prev) => ({ ...prev, [nombreEstrato]: valor }));
    setResultado(null);
  };

  function handleCalc() {
    if (!canCalc || errorMsg) return;
    setLoading(true);
    setError("");
    setPaginas({});
    setTabActivo("resumen");

    setTimeout(() => {
      try {
        const mh_por_estrato = distribucionActual?.mh || [];

        const estratosResultado = listaEstratos.map((estrato, idxEstrato) => {
          const mh = mh_por_estrato[idxEstrato] || 0;
          let seleccionados = seleccionar(estrato.conglomerados, mh);

          if (ordenar) {
            seleccionados = [...seleccionados].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), undefined, { numeric: true }));
          }

          const colorEstrato = getColEstrato(idxEstrato);

          return {
            nombre: estrato.nombre,
            mh,
            Mh: estrato.Mh,
            Nh: estrato.Nh,
            colorEstrato,
            conglomeradosSel: seleccionados.map((c, idxConglo) => {
              const colorConglo = getColConglo(idxConglo);
              let filas;
              if (modo === "manual") {
                filas = Array.from({ length: c.N }, (_, k) => ({
                  "N° global": 0,
                  "Estrato": estrato.nombre,
                  "Conglomerado": c.nombre,
                  "N° en conglo.": k + 1,
                }));
              } else {
                filas = c.filas.map((f: any, k: number) => ({
                  "N° global": 0,
                  "Estrato": estrato.nombre,
                  "Conglomerado": c.nombre,
                  "N° en conglo.": k + 1,
                  ...f,
                }));
              }
              return {
                nombre: c.nombre,
                N: c.N,
                filas,
                colorConglo,
              };
            }),
          };
        });

        let numGlobal = 1;
        const muestraCompleta: any[] = [];
        estratosResultado.forEach((estrato) => {
          estrato.conglomeradosSel.forEach((conglo) => {
            conglo.filas = conglo.filas.map((f: any) => {
              f["N° global"] = numGlobal++;
              return f;
            });
            muestraCompleta.push(...conglo.filas);
          });
        });

        const totalIndividuos = muestraCompleta.length;
        const totalConglos = estratosResultado.reduce((s, e) => s + e.mh, 0);

        const resumen = [
          ...estratosResultado.map((e) => ({
            "Estrato": e.nombre,
            "Conglomerados (M_h)": e.Mh,
            "Seleccionados (m_h)": e.mh,
            "Individuos": e.conglomeradosSel.reduce((s, c) => s + c.N, 0),
            "% conglos.": ((e.mh / e.Mh) * 100).toFixed(1) + "%",
          })),
          {
            "Estrato": "TOTAL",
            "Conglomerados (M_h)": M,
            "Seleccionados (m_h)": totalConglos,
            "Individuos": totalIndividuos,
            "% conglos.": ((totalConglos / M) * 100).toFixed(1) + "%",
          },
        ];

        setResultado({
          estratos: estratosResultado,
          completo: muestraCompleta,
          resumen,
          H,
          M,
          m: totalConglos,
          totalIndividuos,
          asignacion,
          vm: vmFinal,
        });
      } catch (e: any) {
        setError("Error al generar la muestra: " + e.message);
      }
      setLoading(false);
    }, 80);
  }

  function handleReset() {
    setMTotal("");
    setPorcentajeM("");
    setModoM("numero");
    setUnidadDefinida("conglomerados");
    setIgualTamanoEstrato("");
    setResultado(null);
    setPaginas({});
    setError("");
    setMhExcelManual({});
    setEstratosMan([
      {
        nombre: "Urbano",
        conglomerados: [
          { nombre: "Escuela A", N: "320" },
          { nombre: "Escuela B", N: "280" },
          { nombre: "Escuela C", N: "410" },
        ],
        mh_manual: "",
      },
      {
        nombre: "Rural",
        conglomerados: [
          { nombre: "Escuela D", N: "190" },
          { nombre: "Escuela E", N: "250" },
        ],
        mh_manual: "",
      },
    ]);
  }

  async function handleDescargar() {
    if (!resultado) return;
    setDescLoading(true);
    try {
      await exportarExcel([
        { nombre: "Resumen", datos: resultado.resumen },
        { nombre: "Muestra completa", datos: resultado.completo },
        ...resultado.estratos.flatMap((e: any) => e.conglomeradosSel.map((c: any) => ({
          nombre: `${e.nombre} - ${c.nombre}`.slice(0, 31),
          datos: c.filas,
        }))),
      ], `conglos_estratificados_m${resultado.m}_n${resultado.totalIndividuos}`);
    } catch {
      setError("No se pudo generar el archivo.");
    }
    setDescLoading(false);
  }

  const getPag = (id: string) => paginas[id] || 1;
  const setPag = (id: string, p: number) => setPaginas((prev) => ({ ...prev, [id]: p }));

  const datosTab = resultado
    ? tabActivo === "resumen"
      ? resultado.resumen
      : tabActivo === "completa"
        ? resultado.completo
        : resultado.estratos.find((e: any) => e.nombre === tabActivo)?.conglomeradosSel?.flatMap((c: any) => c.filas) ?? []
    : [];

  const esGrande = datosTab.length > PREV_MAX;
  const vistaData = esGrande ? datosTab.slice(0, PREV_MAX) : datosTab;
  const pagAct = getPag(tabActivo);
  const totalPags = Math.max(1, Math.ceil(vistaData.length / FILAS_PAG));
  const filasPag = vistaData.slice((pagAct - 1) * FILAS_PAG, pagAct * FILAS_PAG);
  const columnas = vistaData.length > 0 ? Object.keys(vistaData[0]) : [];

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#fafbfc", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes cinematicFadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .cme-stagger-1{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.04s}
        .cme-stagger-2{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.08s}
        .cme-stagger-3{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.12s}
        .cme-stagger-4{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.16s}
        .cme-stagger-5{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.20s}
        .cme-btn-cin{transition:all .3s cubic-bezier(.16,1,.3,1)!important}
        .cme-btn-cin:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 8px 20px rgba(16,185,129,.18)!important}
        .rh:hover{background:#ecfdf5!important}
        .tbtn:hover{opacity:.8}
        input[type=number],input[type=text]{outline:none;-moz-appearance:textfield}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
      `}</style>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 24px 60px" }}>
        <div className="cme-stagger-1" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <span onClick={onBack} style={{ color: "#10b981", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><BackIcon /> Seleccion de Muestras</span>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#374151", fontWeight: 600 }}>Conglomerados Monoetapico Estratificado</span>
        </div>

        <div className="cme-stagger-1" style={{ display: "flex", alignItems: "flex-start", gap: 15, marginBottom: 6 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#eff6ff,#dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#3b82f6" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <LayersIcon />
              <BuildingIcon />
            </div>
          </div>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, margin: 0, color: "#111827", letterSpacing: "-.02em" }}>Conglomerados Monoetapico Estratificado</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0", lineHeight: 1.5 }}>
              Seleccion de grupos completos dentro de estratos definidos
            </p>
          </div>
        </div>

        {loadingExcel && modo === "excel" && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 12px", margin: "10px 0 14px", fontSize: 12, color: "#1d4ed8", fontWeight: 600 }}>
            Cargando datos completos de Excel para muestreo...
          </div>
        )}

        <div className="cme-stagger-2" style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", border: "1px solid #a7f3d0", borderRadius: 12, padding: "11px 15px", margin: "16px 0 24px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#065f46" }}>
          <div style={{ background: "#10b981", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}><SparkleIcon /></div>
          <span><b>Asistente IA:</b> Este metodo combina estratificacion con conglomerados. Considera el DEFF en el analisis.</span>
        </div>

        <div className="cme-stagger-3" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b7280", marginBottom: 9 }}>Fuente de datos</div>
          <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 12, padding: 4 }}>
            {[
              { id: "manual", icon: "✏️", label: "Definir manualmente", desc: "Configura estratos y conglomerados" },
              { id: "excel", icon: "📊", label: "Desde mi tabla Excel", desc: datosExcel ? `${datosExcel.length.toLocaleString()} filas` : "Sin tabla cargada" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => { if (m.id === "excel" && !datosExcel) return; setModo(m.id as any); setResultado(null); setError(""); }}
                disabled={m.id === "excel" && !datosExcel}
                style={{
                  flex: 1,
                  padding: "11px 14px",
                  border: "none",
                  borderRadius: 9,
                  cursor: m.id === "excel" && !datosExcel ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all .2s",
                  background: modo === m.id ? "white" : "transparent",
                  color: m.id === "excel" && !datosExcel ? "#d1d5db" : modo === m.id ? "#111827" : "#6b7280",
                  boxShadow: modo === m.id ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                  opacity: m.id === "excel" && !datosExcel ? 0.6 : 1,
                }}
              >
                <span style={{ fontSize: 16 }}>{m.icon}</span>
                <div style={{ textAlign: "left" }}>
                  <div>{m.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: modo === m.id ? "#6b7280" : "#9ca3af", marginTop: 1 }}>{m.desc}</div>
                </div>
                {m.id === "excel" && datosExcel && <span style={{ marginLeft: "auto", background: "#ecfdf5", color: "#059669", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>Listo</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="cme-stagger-4" style={{ background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: "24px 24px 14px", boxShadow: "0 4px 20px rgba(0,0,0,.04)" }}>
          {modo === "manual" && (
            <>
              <SLabel step="Paso 1" label="Define tus estratos y conglomerados" />
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px", lineHeight: 1.5 }}>
                Cada estrato contiene conglomerados. El sistema seleccionara conglomerados completos dentro de cada estrato.
              </p>

              {estratosMan.map((estrato, idxEstrato) => {
                const colE = getColEstrato(idxEstrato);
                return (
                  <div key={idxEstrato} style={{ marginBottom: 20, border: `1.5px solid ${colE.brd}`, borderRadius: 14, background: colE.bg, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255,255,255,0.5)", borderBottom: `1px solid ${colE.brd}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: colE.dot, flexShrink: 0 }} />
                        <input
                          type="text"
                          value={estrato.nombre}
                          onChange={(e) => updateEstrato(idxEstrato, "nombre", e.target.value)}
                          style={{ border: "none", background: "transparent", fontSize: 14, fontWeight: 700, color: colE.txt, fontFamily: "'DM Sans',sans-serif", padding: "4px" }}
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: colE.dot, fontWeight: 600 }}>
                          {estrato.conglomerados.length} conglo. · {estrato.conglomerados.reduce((s, c) => s + (parseInt(c.N) || 0), 0).toLocaleString()} indiv.
                        </span>
                        <button
                          onClick={() => removeEstrato(idxEstrato)}
                          disabled={estratosMan.length <= 2}
                          style={{ width: 28, height: 28, border: "1px solid #fecaca", borderRadius: 6, cursor: estratosMan.length <= 2 ? "not-allowed" : "pointer", background: "white", color: estratosMan.length <= 2 ? "#d1d5db" : "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: "12px 16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginBottom: 6 }}>
                        {["Nombre del conglomerado", "Individuos (N_c)", ""].map((h, i) => (
                          <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</div>
                        ))}
                      </div>
                      {estrato.conglomerados.map((conglo, idxConglo) => {
                        const colC = getColConglo(idxConglo);
                        return (
                          <div key={idxConglo} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginBottom: 6, alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, background: colC.bg, border: `1px solid ${colC.brd}`, borderRadius: 8, padding: "2px 2px 2px 10px" }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: colC.dot, flexShrink: 0 }} />
                              <input
                                type="text"
                                value={conglo.nombre}
                                onChange={(e) => updateConglo(idxEstrato, idxConglo, "nombre", e.target.value)}
                                style={{ flex: 1, border: "none", background: "transparent", fontSize: 12, fontWeight: 600, color: colC.txt, fontFamily: "'DM Sans',sans-serif", padding: "7px 4px" }}
                              />
                            </div>
                            <input
                              type="number"
                              value={conglo.N}
                              onChange={(e) => updateConglo(idxEstrato, idxConglo, "N", e.target.value)}
                              min="1"
                              style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontFamily: "inherit", color: "#111827", width: "100%" }}
                            />
                            <button
                              onClick={() => removeCongloDeEstrato(idxEstrato, idxConglo)}
                              disabled={estrato.conglomerados.length <= 1}
                              style={{ width: 28, height: 28, border: "1px solid #e5e7eb", borderRadius: 6, cursor: estrato.conglomerados.length <= 1 ? "not-allowed" : "pointer", background: "white", color: estrato.conglomerados.length <= 1 ? "#d1d5db" : "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => addCongloAEstrato(idxEstrato)}
                        style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: "1px dashed #d1d5db", borderRadius: 8, background: "rgba(255,255,255,0.6)", color: "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        <AddIcon /> Agregar conglomerado
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={addEstrato}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", border: "1.5px dashed #d1fae5", borderRadius: 10, background: "#f9fafb", color: "#10b981", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                <AddIcon /> Agregar estrato
              </button>

              {H >= 2 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 18 }}>
                  <SMini label="Estratos (H)" val={H} color="#3b82f6" />
                  <SMini label="Conglomerados (M)" val={M.toLocaleString()} color="#f97316" />
                  <SMini label="Total individuos (N)" val={N.toLocaleString()} color="#374151" />
                  <SMini label="Promedio por conglo." val={Math.round(N / M).toLocaleString()} color="#6b7280" />
                </div>
              )}
            </>
          )}

          {modo === "excel" && (
            <>
              <SLabel step="Paso 1" label="Tipo de datos en tu tabla" />
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px", lineHeight: 1.5 }}>
                Elige como estan organizados los datos.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  {
                    id: "individual", emoji: "👤", titulo: "Datos individuales",
                    desc: "Cada fila es una persona. El sistema agrupa automaticamente por estrato y conglomerado.",
                    col: { bg: "#ecfdf5", brd: "#10b981", txt: "#065f46", dot: "#10b981" },
                  },
                  {
                    id: "agregado", emoji: "🏘️", titulo: "Datos agregados",
                    desc: "Cada fila es un conglomerado ya resumido.",
                    col: { bg: "#fff7ed", brd: "#f97316", txt: "#7c2d12", dot: "#f97316" },
                  },
                ].map((t) => (
                  <div
                    key={t.id}
                    onClick={() => { setTipoEnt(t.id as any); setColEstrato(""); setColConglo(""); setColNom(""); setColTam(""); setResultado(null); }}
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      cursor: "pointer",
                      border: tipoEnt === t.id ? `2px solid ${t.col.brd}` : "2px solid #e5e7eb",
                      background: tipoEnt === t.id ? t.col.bg : "white",
                      transition: "all .2s",
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{t.emoji}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: tipoEnt === t.id ? t.col.txt : "#374151", marginBottom: 5 }}>{t.titulo}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{t.desc}</div>
                  </div>
                ))}
              </div>

              {tipoEnt === "individual" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <ColSel label="Columna de estrato" val={colEstrato} cols={colsExcel} onChange={(v) => { setColEstrato(v); setResultado(null); }} placeholder="Ej: Zona, Region..." />
                  <ColSel label="Columna de conglomerado" val={colConglo} cols={colsExcel.filter((c) => c !== colEstrato)} onChange={(v) => { setColConglo(v); setResultado(null); }} placeholder="Ej: Escuela, Hospital..." />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <ColSel label="Columna de estrato" val={colEstrato} cols={colsExcel} onChange={(v) => { setColEstrato(v); setResultado(null); }} placeholder="Ej: Zona, Region..." />
                  <ColSel label="Columna nombre del conglo." val={colNom} cols={colsExcel.filter((c) => c !== colEstrato)} onChange={(v) => { setColNom(v); setResultado(null); }} placeholder="Ej: Escuela, Hospital..." />
                  <ColSel label="Columna tamano (N_c)" val={colTam} cols={colsExcel.filter((c) => c !== colEstrato && c !== colNom)} onChange={(v) => { setColTam(v); setResultado(null); }} placeholder="Ej: Total, N, Tamano..." />
                </div>
              )}

              {estratosExcel.length > 0 && (
                <div style={{ marginTop: 16, background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 13, padding: "16px 18px" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
                    {estratosExcel.length} estratos detectados · {M} conglomerados · {N.toLocaleString()} individuos
                  </span>
                </div>
              )}
            </>
          )}

          {H >= 2 && (
            <>
              <Divider />
              <SLabel step="Configuracion" label="Tamano de muestra que se define" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10, maxWidth: 620 }}>
                {[
                  {
                    id: "individuos",
                    icon: "👥",
                    title: "Individuos (n)",
                    desc: "Defines cuantos individuos quieres por muestra; el sistema convierte a conglomerados por estrato.",
                  },
                  {
                    id: "conglomerados",
                    icon: "🏘️",
                    title: "Conglomerados (m)",
                    desc: "Defines directamente cuantos conglomerados seleccionar.",
                  },
                ].map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setUnidadDefinida(u.id as "individuos" | "conglomerados"); setResultado(null); }}
                    style={{
                      textAlign: "left",
                      border: unidadDefinida === u.id ? "2px solid #10b981" : "2px solid #e5e7eb",
                      borderRadius: 12,
                      padding: "12px 13px",
                      background: unidadDefinida === u.id ? "#f0fdf4" : "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{u.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: unidadDefinida === u.id ? "#065f46" : "#374151", marginBottom: 3 }}>{u.title}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.4 }}>{u.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 12px", marginBottom: 8, fontSize: 12, color: "#1e3a8a" }}>
                {unidadDefinida === "individuos"
                  ? "Cuando defines individuos (n), la app distribuye n por estrato y estima cuantos conglomerados se requieren segun el tamano promedio del conglomerado en cada estrato."
                  : "Cuando defines conglomerados (m), la app distribuye m por estrato y selecciona conglomerados completos aleatoriamente."}
              </div>
            </>
          )}

          {H >= 2 && (
            <>
              <Divider />
              <SLabel step="Paso 2" label="Metodo de asignacion de conglomerados" />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
                {[
                  { id: "proporcional", emoji: "📊", label: "Proporcional" },
                  { id: "igual", emoji: "⚖️", label: "Igual para todos" },
                  { id: "manual", emoji: "✏️", label: "Manual por estrato" },
                ].map((a) => (
                  <div
                    key={a.id}
                    onClick={() => {
                      setAsignacion(a.id as any);
                      setResultado(null);
                    }}
                    style={{
                      padding: "14px 14px",
                      borderRadius: 12,
                      cursor: "pointer",
                      border: asignacion === a.id ? "2px solid #10b981" : "2px solid #e5e7eb",
                      background: asignacion === a.id ? "#f0fdf4" : "white",
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 7 }}>{a.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: asignacion === a.id ? "#065f46" : "#374151" }}>{a.label}</div>
                  </div>
                ))}
              </div>

              {asignacion === "igual" && (
                <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                    Parametro para "Igual para todos"
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                    <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 9, padding: "10px 11px", fontSize: 12, color: "#065f46" }}>
                      Usar un unico tamano para todos los estratos.
                    </div>
                  </div>

                  <div style={{ maxWidth: 340 }}>
                    <FNum
                      label={unidadDefinida === "individuos" ? "Tamano de la muestra para todos los estratos (n_h)" : "Tamano de la muestra para todos los estratos (m_h)"}
                      value={igualTamanoEstrato}
                      onChange={(v) => { setIgualTamanoEstrato(v); setResultado(null); }}
                      placeholder={unidadDefinida === "individuos" ? "Ej: 350" : "Ej: 2"}
                      hint={unidadDefinida === "individuos"
                        ? `n_h fijo por estrato. Conglomerados estimados a seleccionar: ${!isNaN(vmFinal) ? vmFinal : "-"}`
                        : `m total calculado = H × m_h = ${H} × ${igualTamanoEstrato || 0} = ${!isNaN(vmFinal) ? vmFinal : "-"}`}
                    />
                  </div>
                </div>
              )}

              {asignacion === "proporcional" && (
                <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                    Parametro para "Proporcional"
                  </div>
                  <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 9, padding: "10px 11px", fontSize: 12, color: "#065f46" }}>
                    {unidadDefinida === "individuos"
                      ? "Define el tamano total de muestra en individuos (n). El sistema reparte n proporcionalmente segun N_h/N y estima los conglomerados requeridos por estrato."
                      : "Define el tamano de la muestra total en conglomerados (m). El sistema reparte m proporcionalmente segun M_h/M entre estratos."}
                  </div>
                </div>
              )}

              <Divider />
              <SLabel step="Paso 3" label={unidadDefinida === "individuos" ? "Tamano de muestra a distribuir" : "Conglomerados a seleccionar"} />

              {asignacion !== "igual" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, maxWidth: 560 }}>
                  {[
                    {
                      id: "numero",
                      emoji: "🔢",
                      label: unidadDefinida === "individuos" ? "Definir por numero (n)" : "Definir por numero (m)",
                      desc: unidadDefinida === "individuos"
                        ? "Indicas cuántos individuos deseas en la muestra"
                        : "Indicas cuántos conglomerados seleccionar",
                    },
                    {
                      id: "porcentaje",
                      emoji: "📈",
                      label: "Definir por porcentaje",
                      desc: unidadDefinida === "individuos"
                        ? "El sistema calcula n desde % del total N"
                        : "El sistema calcula m desde % del total M",
                    },
                  ].map((op) => (
                    <div
                      key={op.id}
                      onClick={() => { setModoM(op.id as "numero" | "porcentaje"); setResultado(null); }}
                      style={{
                        padding: "12px 13px",
                        borderRadius: 10,
                        cursor: "pointer",
                        border: modoM === op.id ? "2px solid #10b981" : "2px solid #e5e7eb",
                        background: modoM === op.id ? "#f0fdf4" : "white",
                      }}
                    >
                      <div style={{ fontSize: 18, marginBottom: 6 }}>{op.emoji}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: modoM === op.id ? "#065f46" : "#374151", marginBottom: 3 }}>{op.label}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.4 }}>{op.desc}</div>
                    </div>
                  ))}
                </div>
              )}

              {asignacion !== "manual" ? (
                <>
                  {asignacion === "igual" ? (
                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#1e3a8a", maxWidth: 460 }}>
                      {unidadDefinida === "individuos"
                        ? <>n_h definido por estrato. Conglomerados estimados para seleccionar: <b>{!isNaN(vmFinal) ? vmFinal : "-"}</b>.</>
                        : <>m total calculado automaticamente para la asignacion igual: <b>{!isNaN(vmFinal) ? vmFinal : "-"}</b> conglomerados.</>}
                    </div>
                  ) : (
                    <div style={{ maxWidth: 400 }}>
                      {modoM === "numero" ? (
                        <FNum
                          label={unidadDefinida === "individuos"
                            ? `Tamano de la muestra (n) — de ${N.toLocaleString()} individuos`
                            : `Tamano de la muestra (m) — de ${M} conglomerados`}
                          value={mTotal}
                          onChange={(v) => { setMTotal(v); setResultado(null); }}
                          placeholder={unidadDefinida === "individuos" ? `Ej: ${Math.max(10, Math.floor(N / 5))}` : `Ej: ${Math.max(1, Math.floor(M / 3))}`}
                          hint={unidadDefinida === "individuos"
                            ? `Entre 1 y ${Math.max(1, N - 1)} individuos. Se convertira a conglomerados por estrato.`
                            : `Entre 1 y ${M - 1} conglomerados. Este valor se distribuye proporcionalmente entre estratos.`}
                        />
                      ) : (
                        <FNum
                          label={unidadDefinida === "individuos"
                            ? `Porcentaje de individuos a seleccionar — sobre ${N.toLocaleString()} totales`
                            : `Porcentaje de conglomerados a seleccionar — sobre ${M} totales`}
                          value={porcentajeM}
                          onChange={(v) => { setPorcentajeM(v); setResultado(null); }}
                          placeholder="Ej: 30"
                          hint={unidadDefinida === "individuos"
                            ? `Se calculara n = ceil((%/100) × N). n actual: ${!isNaN(objetivoIndividuos) ? objetivoIndividuos : "-"}`
                            : `Se calculara m = ceil((%/100) × M). m actual: ${!isNaN(objetivoConglomerados) ? objetivoConglomerados : "-"}`}
                        />
                      )}
                    </div>
                  )}

                  {previewAsignacion && !errorMsg && (
                    <div style={{ background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 12, padding: "14px 16px", marginTop: 8, marginBottom: 18 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Vista previa de asignacion</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {previewAsignacion.map((e, i) => {
                          const colE = getColEstrato(i);
                          return (
                            <div key={e.nombre} style={{ background: colE.bg, border: `1px solid ${colE.brd}`, borderRadius: 9, padding: "8px 12px", fontSize: 12 }}>
                              <span style={{ fontWeight: 700, color: colE.txt }}>{e.nombre}</span>
                              <span style={{ color: colE.dot, marginLeft: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>m_h={e.mh}</span>
                              <span style={{ color: "#9ca3af", marginLeft: 6 }}>(de {e.Mh})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ maxWidth: 400, marginBottom: 12 }}>
                    {modoM === "numero" ? (
                      <FNum
                        label={unidadDefinida === "individuos"
                          ? `Tamano total de la muestra (n) — de ${N.toLocaleString()} individuos`
                          : `Total de conglomerados a seleccionar (m) — de ${M} disponibles`}
                        value={mTotal}
                        onChange={(v) => { setMTotal(v); setResultado(null); }}
                        placeholder={unidadDefinida === "individuos" ? `Ej: ${Math.max(10, Math.floor(N / 5))}` : `Ej: ${Math.max(1, Math.floor(M / 3))}`}
                        hint={unidadDefinida === "individuos"
                          ? `La suma de n_h debe ser ${mTotal || "n"}`
                          : `La suma de m_h debe ser ${mTotal || "m"}`}
                      />
                    ) : (
                      <FNum
                        label={unidadDefinida === "individuos"
                          ? `Porcentaje de individuos a seleccionar — sobre ${N.toLocaleString()} totales`
                          : `Porcentaje de conglomerados a seleccionar — sobre ${M} totales`}
                        value={porcentajeM}
                        onChange={(v) => { setPorcentajeM(v); setResultado(null); }}
                        placeholder="Ej: 30"
                        hint={unidadDefinida === "individuos"
                          ? `Se calculara n = ceil((%/100) × N). La suma de n_h debe igualar ${!isNaN(objetivoIndividuos) ? objetivoIndividuos : "n"}`
                          : `Se calculara m = ceil((%/100) × M). La suma de m_h debe igualar ${!isNaN(objetivoConglomerados) ? objetivoConglomerados : "m"}`}
                      />
                    )}
                  </div>

                  <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px", lineHeight: 1.5 }}>
                    {unidadDefinida === "individuos"
                      ? "Define cuantos individuos (n_h) asignar en cada estrato."
                      : "Define cuantos conglomerados (m_h) seleccionar de cada estrato."}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
                    {listaEstratos.map((e, i) => {
                      const colE = getColEstrato(i);
                      return (
                        <div key={`${e.nombre}-${i}`} style={{ background: colE.bg, border: `1px solid ${colE.brd}`, borderRadius: 10, padding: "10px 14px" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: colE.txt, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: colE.dot }} />
                            {e.nombre}
                            <span style={{ fontSize: 10, color: colE.dot, fontWeight: 600 }}>(M_h={e.Mh})</span>
                          </div>
                          <input
                            type="number"
                            value={String(e.mh_manual || "")}
                            onChange={(ev) => handleUpdateMhManual(e.nombre, ev.target.value, i)}
                            min="0"
                            max={unidadDefinida === "individuos" ? e.Nh : e.Mh}
                            style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", color: "#111827" }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Suma actual: <b>{listaEstratos.reduce((s, e) => s + (e.mh_manual || 0), 0)}</b> {unidadDefinida === "individuos" ? "individuos" : "conglomerados"}
                  </div>
                </>
              )}

              <Divider />
              <SLabel step="Paso 4" label="Opciones de presentacion" />
              <div
                onClick={() => setOrdenar(!ordenar)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 15px",
                  borderRadius: 12,
                  cursor: "pointer",
                  border: ordenar ? "2px solid #10b981" : "2px solid #e5e7eb",
                  background: ordenar ? "#f0fdf4" : "white",
                  userSelect: "none",
                  maxWidth: 500,
                }}
              >
                <div style={{ width: 21, height: 21, borderRadius: 6, border: ordenar ? "2px solid #10b981" : "2px solid #d1d5db", background: ordenar ? "#10b981" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {ordenar && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: ordenar ? "#10b981" : "#6b7280" }}><SortIcon /></span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: ordenar ? "#065f46" : "#374151" }}>Ordenar resultados</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {errorMsg && <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 11, padding: "11px 15px", marginTop: 14, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>⚠️ {errorMsg}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={handleCalc}
            disabled={!canCalc || loading}
            style={{
              flex: 1,
              padding: "13px 20px",
              borderRadius: 12,
              border: "none",
              cursor: canCalc && !loading ? "pointer" : "not-allowed",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              background: canCalc ? "linear-gradient(135deg,#10b981,#059669)" : "#e5e7eb",
              color: canCalc ? "white" : "#9ca3af",
            }}
          >
            {loading ? <><Spin /> Generando...</> : <><CalcIcon /> {resultado ? "Regenerar muestra" : "Generar muestra estratificada"}</>}
          </button>
          <button onClick={handleReset} style={{ padding: "13px 18px", borderRadius: 12, border: "2px solid #e5e7eb", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: "white", color: "#6b7280", display: "flex", alignItems: "center", gap: 6 }}>
            <ResetIcon /> Limpiar
          </button>
        </div>

        {error && <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 11, padding: "11px 15px", marginTop: 14, fontSize: 13, color: "#dc2626" }}>❌ {error}</div>}

        {resultado && (
          <div style={{ marginTop: 28, animation: "slideUp .4s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
              <KPIc label="Estratos" val={resultado.H} color="#3b82f6" bg="#eff6ff" brd="#93c5fd" />
              <KPIc label="Conglomerados seleccionados" val={`${resultado.m}/${resultado.M}`} color="#f97316" bg="#fff7ed" brd="#fdba74" />
              <KPIc label="Individuos en muestra" val={resultado.totalIndividuos.toLocaleString()} color="#10b981" bg="#ecfdf5" brd="#6ee7b7" />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0, flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>Muestra generada</span>
              <BtnDsc loading={descLoading} onClick={handleDescargar} />
            </div>

            <div style={{ display: "flex", gap: 3, overflowX: "auto", background: "#f3f4f6", borderRadius: "14px 14px 0 0", padding: "6px 6px 0", marginTop: 14 }}>
              {[
                { id: "resumen", lbl: "📊 Resumen", badge: resultado.H + 1, isA: tabActivo === "resumen" },
                { id: "completa", lbl: "🗂 Muestra completa", badge: resultado.totalIndividuos, isA: tabActivo === "completa" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTabActivo(t.id)}
                  className="tbtn"
                  style={{
                    padding: "9px 16px",
                    border: "none",
                    borderRadius: "9px 9px 0 0",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    background: t.isA ? "white" : "transparent",
                    color: t.isA ? "#111827" : "#6b7280",
                  }}
                >
                  {t.lbl}
                </button>
              ))}
              {resultado.estratos.map((e: any) => {
                const isA = tabActivo === e.nombre;
                const indivEstrato = e.conglomeradosSel.reduce((s: number, c: any) => s + c.N, 0);
                return (
                  <button
                    key={e.nombre}
                    onClick={() => setTabActivo(e.nombre)}
                    className="tbtn"
                    style={{
                      padding: "9px 13px",
                      border: "none",
                      borderRadius: "9px 9px 0 0",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                      background: isA ? "white" : "transparent",
                      color: isA ? "#111827" : "#6b7280",
                    }}
                  >
                    {e.nombre}
                    <span style={{ marginLeft: 5, background: "#e5e7eb", color: "#9ca3af", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>{indivEstrato}</span>
                  </button>
                );
              })}
            </div>

            {esGrande && (
              <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", padding: "11px 18px", fontSize: 13, color: "#92400e", display: "flex", gap: 8 }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <div><b>Datos grandes ({datosTab.length.toLocaleString()} filas)</b> · Mostrando las primeras {PREV_MAX.toLocaleString()}.</div>
              </div>
            )}

            <div style={{ background: "white", border: "2px solid #6ee7b7", borderTop: "none", borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
              {columnas.length === 0 ? (
                <div style={{ padding: "28px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Selecciona una pestana</div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          {columnas.map((c) => (
                            <th key={c} style={{ padding: "10px 18px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filasPag.map((fila: any, i: number) => (
                          <tr key={i} className="rh" style={{ background: i % 2 === 0 ? "white" : "#fafbfc" }}>
                            {columnas.map((c) => (
                              <td
                                key={c}
                                style={{
                                  padding: "10px 18px",
                                  borderBottom: "1px solid #f3f4f6",
                                  whiteSpace: "nowrap",
                                  color: c === "N° global" ? "#10b981" : "#374151",
                                  fontWeight: c === "N° global" ? 700 : 400,
                                }}
                              >
                                {fila[c] ?? "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPags > 1 && <PaginComp pagina={pagAct} totalPags={totalPags} setPagina={(p) => setPag(tabActivo, p)} vData={vistaData} />}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SLabel({ step, label }: { step: string; label: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#10b981", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 18, height: 2, background: "#10b981", borderRadius: 2 }} />
      {step} · {label}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#f3f4f6", margin: "4px 0 20px" }} />;
}

function ColSel({ label, val, cols, onChange, placeholder }: { label: string; val: string; cols: string[]; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
        <span style={{ color: "#9ca3af", display: "flex" }}><InfoIcon /></span>
      </div>
      <div style={{ position: "relative" }}>
        <select
          value={val}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "11px 36px 11px 14px",
            border: `2px solid ${val ? "#10b981" : "#e5e7eb"}`,
            borderRadius: 10,
            fontSize: 14,
            fontFamily: "inherit",
            appearance: "none",
            outline: "none",
            color: val ? "#111827" : "#9ca3af",
            cursor: "pointer",
            background: val ? "#f0fdf4" : "white",
          }}
        >
          <option value="">{placeholder || "Seleccionar columna..."}</option>
          {cols.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: val ? "#10b981" : "#9ca3af", pointerEvents: "none" }}>▾</span>
      </div>
    </div>
  );
}

function FNum({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
      </div>
      <div style={{ display: "flex", alignItems: "center", border: "2px solid #e5e7eb", borderRadius: 10, background: "white", overflow: "hidden" }}>
        <input
          type="number"
          step="1"
          min="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, border: "none", outline: "none", padding: "11px 14px", fontSize: 14, fontFamily: "'DM Sans',sans-serif", background: "transparent", color: "#111827" }}
        />
      </div>
      {hint && <p style={{ fontSize: 12, color: "#9ca3af", margin: "5px 0 0", lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

function TT({ children, text }: { children: ReactNode; text: string }) {
  const [s, setS] = useState(false);
  return (
    <span onMouseEnter={() => setS(true)} onMouseLeave={() => setS(false)} style={{ position: "relative", display: "inline-flex", cursor: "help" }}>
      {children}
      {s && (
        <span style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1f2937", color: "#f9fafb", fontSize: 12, lineHeight: 1.5, padding: "9px 13px", borderRadius: 10, width: 250, zIndex: 300, pointerEvents: "none", fontWeight: 400 }}>
          {text}
        </span>
      )}
    </span>
  );
}

function SMini({ label, val, color }: { label: string; val: string | number; color: string }) {
  return (
    <div style={{ background: "white", border: "1.5px solid #e5e7eb", borderRadius: 11, padding: "10px 14px" }}>
      <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'DM Mono',monospace" }}>{val}</div>
      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function KPIc({ label, val, color, bg, brd }: { label: string; val: string | number; color: string; bg: string; brd: string }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${brd}`, borderRadius: 13, padding: "12px 15px" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "'DM Mono',monospace" }}>{val}</div>
      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function BtnDsc({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: "11px 20px",
        borderRadius: 12,
        border: "2px solid #10b981",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "inherit",
        background: loading ? "#f0fdf4" : "white",
        color: "#10b981",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {loading ? <><Spin sm /> Descargando...</> : <><DownloadIcon /> Descargar Excel</>}
    </button>
  );
}

function Spin({ sm }: { sm?: boolean }) {
  const s = sm ? 14 : 17;
  return <span style={{ width: s, height: s, border: `${sm ? 2 : 3}px solid rgba(16,185,129,.3)`, borderTopColor: "#10b981", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />;
}

function PB({ l, d, f }: { l: string; d: boolean; f: () => void }) {
  return (
    <button
      onClick={f}
      disabled={d}
      style={{
        width: 34,
        height: 34,
        border: "1.5px solid #e5e7eb",
        borderRadius: 8,
        cursor: d ? "not-allowed" : "pointer",
        fontSize: 13,
        fontWeight: 600,
        background: "white",
        color: d ? "#d1d5db" : "#6b7280",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
      }}
    >
      {l}
    </button>
  );
}

function PaginComp({ pagina, totalPags, setPagina, vData }: { pagina: number; totalPags: number; setPagina: (p: number) => void; vData: any[] }) {
  function gP(c: number, t: number): (number | string)[] {
    if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
    if (c <= 4) return [1, 2, 3, 4, 5, "…", t];
    if (c >= t - 3) return [1, "…", t - 4, t - 3, t - 2, t - 1, t];
    return [1, "…", c - 1, c, c + 1, "…", t];
  }

  return (
    <div style={{ padding: "14px 22px", borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
      <span style={{ fontSize: 12, color: "#9ca3af" }}>Filas {(pagina - 1) * FILAS_PAG + 1}–{Math.min(pagina * FILAS_PAG, vData.length)} de {vData.length.toLocaleString()}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <PB l="«" d={pagina === 1} f={() => setPagina(1)} />
        <PB l="‹" d={pagina === 1} f={() => setPagina(Math.max(1, pagina - 1))} />
        {gP(pagina, totalPags).map((p, i) => p === "…" ? <span key={`e${i}`} style={{ padding: "0 6px", color: "#9ca3af" }}>…</span> : (
          <button
            key={p}
            onClick={() => setPagina(p as number)}
            style={{ width: 34, height: 34, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: pagina === p ? "#10b981" : "#f3f4f6", color: pagina === p ? "white" : "#6b7280" }}
          >
            {p}
          </button>
        ))}
        <PB l="›" d={pagina === totalPags} f={() => setPagina(Math.min(totalPags, pagina + 1))} />
        <PB l="»" d={pagina === totalPags} f={() => setPagina(totalPags)} />
      </div>
    </div>
  );
}
