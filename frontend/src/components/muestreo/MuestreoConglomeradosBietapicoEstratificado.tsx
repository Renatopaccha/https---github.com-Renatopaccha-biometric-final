import { useState, useMemo } from "react";

declare global {
  interface Window {
    XLSX?: any;
  }
}

/*
  BIOMETRIC - Conglomerados Bietapico Estratificado

  ETAPA 1: Seleccion aleatoria de conglomerados por estrato
           Metodo SRS (igual prob.) o PPS (prop. al tamano)

  ETAPA 2: Submuestra aleatoria (SRS) dentro de cada conglomerado
           seleccionado

  Tipos de muestreo:
  - Equiprobabilistico: m y n_c globales, asignacion auto por estrato
  - Personalizar: m_h por estrato + n_c por conglomerado

  EXCEL_HOOK - prop: datosExcel={Array<Object>}
     individual: col. estrato + col. conglomerado (agrupa filas)
     agregado:   col. estrato + col. nombre + col. tamano N_c
*/

/* ============== ALGORITMOS ============== */

/** Fisher-Yates SRS sin reemplazo */
function fisherYates(arr: any[], n: number) {
  const a = [...arr];
  const r = [];
  const lim = Math.min(n, a.length);
  for (let i = 0; i < lim; i++) {
    const j = i + Math.floor(Math.random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
    r.push(a[i]);
  }
  return r;
}

/**
 * Muestreo sistematico PPS (Probabilidad Proporcional al Tamano)
 * Selecciona m conglomerados con prob. proporcional a su N_c
 */
function ppsSistematico(conglos: any[], m: number) {
  if (!conglos.length || m <= 0) return [];
  if (m >= conglos.length) return [...conglos];
  const Ntot = conglos.reduce((s, c) => s + c.N, 0);
  if (!Ntot) return fisherYates(conglos, m);
  const h = Ntot / m;
  const inicio = Math.random() * h;
  const sel = [];
  let acum = 0;
  let ptr = inicio;
  for (const c of conglos) {
    acum += c.N;
    while (ptr < acum && sel.length < m) {
      sel.push({ ...c });
      ptr += h;
    }
  }
  return sel.slice(0, m);
}

/**
 * Asignacion proporcional de m entre estratos (metodo Hamilton)
 * m_h = mTotal * M_h / M_total, redondeando con residuos
 */
function asignarPropM(estratos: any[], mTotal: number) {
  const Mtot = estratos.reduce((s, e) => s + e.conglos.length, 0);
  if (!Mtot) return estratos.map((e) => ({ ...e, m: 1 }));
  const raw = estratos.map((e) => (mTotal * e.conglos.length) / Mtot);
  const floors = raw.map(Math.floor);
  const resto = mTotal - floors.reduce((a, b) => a + b, 0);
  const idx = raw
    .map((v, i) => ({ i, r: v - Math.floor(v) }))
    .sort((a, b) => b.r - a.r);
  for (let i = 0; i < resto; i++) floors[idx[i].i]++;
  return estratos.map((e, i) => ({
    ...e,
    m: Math.max(1, Math.min(floors[i], e.conglos.length - 1)),
  }));
}

/** Asignacion igual de m entre estratos (floor con excedente al inicio) */
function asignarIgualM(estratos: any[], mTotal: number) {
  const H = estratos.length;
  const base = Math.floor(mTotal / H);
  const extra = mTotal - base * H;
  return estratos.map((e, i) => ({
    ...e,
    m: Math.max(1, Math.min(base + (i < extra ? 1 : 0), e.conglos.length - 1)),
  }));
}

function toPosInt(v: string): number | null {
  const n = parseInt(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ============== EXPORT EXCEL ============== */
async function exportarExcel(sheets: any[], nombre: string) {
  if (!window.XLSX)
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = () => res();
      s.onerror = () => rej();
      document.head.appendChild(s);
    });
  const wb = window.XLSX.utils.book_new();
  sheets.forEach(({ nombre: n, datos }) => {
    const ws = window.XLSX.utils.json_to_sheet(datos);
    window.XLSX.utils.book_append_sheet(wb, ws, String(n).slice(0, 31));
  });
  window.XLSX.writeFile(wb, `${nombre}.xlsx`);
}

/* ============== PALETA ============== */
const PAL = [
  { bg: "#ecfdf5", brd: "#6ee7b7", txt: "#065f46", dot: "#10b981" },
  { bg: "#eff6ff", brd: "#93c5fd", txt: "#1e3a8a", dot: "#3b82f6" },
  { bg: "#fdf4ff", brd: "#d8b4fe", txt: "#581c87", dot: "#a855f7" },
  { bg: "#fff7ed", brd: "#fdba74", txt: "#7c2d12", dot: "#f97316" },
  { bg: "#fefce8", brd: "#fde047", txt: "#713f12", dot: "#eab308" },
  { bg: "#fdf2f8", brd: "#f9a8d4", txt: "#831843", dot: "#ec4899" },
  { bg: "#f0f9ff", brd: "#7dd3fc", txt: "#0c4a6e", dot: "#0ea5e9" },
  { bg: "#f0fdf4", brd: "#86efac", txt: "#14532d", dot: "#22c55e" },
];
const gc = (i: number) => PAL[i % PAL.length];

/* ============== ICONOS ============== */
const Si = ({ d, w = 16 }: { d: string; w?: number }) => (
  <svg
    width={w}
    height={w}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: d }}
  />
);
const BackIcon = () => <Si w={15} d='<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>' />;
const DlIcon = () => (
  <Si d='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' />
);
const RstIcon = () => <Si w={15} d='<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>' />;
const SpkIcon = () => <Si w={14} d='<path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/>' />;
const InfoIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);
const CalcIcon = () => (
  <Si w={17} d='<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/>' />
);
const AddIcon = () => <Si w={15} d='<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' />;
const TrashIcon = () => (
  <Si w={15} d='<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>' />
);
const LayersIcon = () => <Si w={20} d='<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>' />;
const SortIcon = () => (
  <Si w={14} d='<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><polyline points="3 6 4 7 6 4"/><polyline points="3 12 4 13 6 10"/><polyline points="3 18 4 19 6 16"/>' />
);
const ChkIcon = () => (
  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const FILAS_PAG = 50;
const PREV_MAX = 2000;

/* ============== HELPERS DE ESTADO ============== */
let _uid = 0;
const uid = () => ++_uid;
const newConglo = (idx: number) => ({ id: uid(), nombre: `Conglomerado ${idx + 1}`, N: "", n_manual: "" });
const newEstrato = (idx: number) => ({
  id: uid(),
  nombre: `Estrato ${idx + 1}`,
  m_manual: "",
  conglos: [newConglo(0), newConglo(1)],
});

interface Props {
  datosExcel?: Array<Record<string, any>> | null;
  onBack?: () => void;
  loadingExcel?: boolean;
}

/* ============== COMPONENTE PRINCIPAL ============== */
export default function MuestreoConglomeradosBietapicoEstratificado({ datosExcel = null, onBack }: Props) {
  /* - Fuente de datos - */
  const [modo, setModo] = useState("manual");

  /* - Tipo de muestreo - */
  const [tipoM, setTipoM] = useState("equiprobabilistico");
  const [metodoSel, setMetSel] = useState("srs");

  /* - Parametros globales (equiprobabilistico + personalizar excel) - */
  const [asignM, setAsignM] = useState("proporcional");
  const [nTotalObj, setNTotalObj] = useState("");
  const [mTotal, setMTotal] = useState("");
  const [nPorC, setNPorC] = useState("");
  const [eqSel, setEqSel] = useState({ n: true, m: true, nc: false });

  /* - Estratos manual - */
  const [estratos, setEst] = useState([newEstrato(0), newEstrato(1)]);

  /* - Excel - */
  const [tipoEnt, setTipoEnt] = useState("individual");
  const [colEst, setColEst] = useState("");
  const [colCon, setColCon] = useState("");
  const [colNom, setColNom] = useState("");
  const [colTam, setColTam] = useState("");
  const [mExcel, setMExcel] = useState<Record<string, any>>({});

  /* - UI - */
  const [ordenar, setOrdenar] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [tabAct, setTab] = useState("combinada");
  const [pags, setPags] = useState<Record<string, number>>({});
  const [loading, setLoad] = useState(false);
  const [descLoad, setDesc] = useState(false);
  const [err, setErr] = useState("");

  /* - Columnas disponibles Excel - */
  const colsExcel = datosExcel && datosExcel.length > 0 ? Object.keys(datosExcel[0] ?? {}) : [];

  /* - Estratos desde Excel - */
  const estratosExcel = useMemo(() => {
    if (!datosExcel?.length) return [];
    if (tipoEnt === "individual") {
      if (!colEst || !colCon) return [];
      const mapa: Record<string, Record<string, any[]>> = {};
      datosExcel.forEach((f) => {
        const e = String(f[colEst] ?? "Sin estrato");
        const c = String(f[colCon] ?? "Sin conglo.");
        if (!mapa[e]) mapa[e] = {};
        if (!mapa[e][c]) mapa[e][c] = [];
        mapa[e][c].push(f);
      });
      return Object.entries(mapa)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([enombre, cmap]) => ({
          nombre: enombre,
          m_manual: mExcel[enombre] ?? "",
          conglos: Object.entries(cmap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cnombre, filas]) => ({ nombre: cnombre, N: filas.length, filas, n_manual: "" })),
        }));
    }

    if (!colEst || !colNom || !colTam) return [];
    const mapa: Record<string, any[]> = {};
    datosExcel.forEach((f) => {
      const e = String(f[colEst] ?? "Sin estrato");
      if (!mapa[e]) mapa[e] = [];
      mapa[e].push({
        nombre: String(f[colNom] ?? ""),
        N: Math.max(1, parseInt(f[colTam]) || 1),
        filas: [f],
        n_manual: "",
      });
    });
    return Object.entries(mapa)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([enombre, cs]) => ({
        nombre: enombre,
        m_manual: mExcel[enombre] ?? "",
        conglos: cs.sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }));
  }, [datosExcel, tipoEnt, colEst, colCon, colNom, colTam, mExcel]);

  /* - Lista activa de estratos - */
  const listaAct = modo === "manual" ? estratos : estratosExcel;
  const H = listaAct.length;
  const mTotalInt = parseInt(mTotal);
  const nPorCInt = parseInt(nPorC);

  /* - Estadisticas derivadas - */
  const stats = useMemo(() => {
    const totalConglos = listaAct.reduce((s, e: any) => s + e.conglos.length, 0);
    const totalPob = listaAct.reduce(
      (s, e: any) => s + e.conglos.reduce((ss: number, c: any) => ss + (parseInt(c.N) || 0), 0),
      0
    );
    return { H, totalConglos, totalPob };
  }, [listaAct, H]);

  const eqCalc = useMemo(() => {
    const selected = [eqSel.n, eqSel.m, eqSel.nc].filter(Boolean).length;

    const nIn = toPosInt(nTotalObj);
    const mIn = toPosInt(mTotal);
    const ncIn = toPosInt(nPorC);

    let n = nIn;
    let m = mIn;
    let nc = ncIn;
    let missing: "n" | "m" | "nc" | null = null;
    let error = "";
    let note = "";
    let complete = false;

    if (selected !== 2) {
      error = "En modo equiprobabilistico debes seleccionar exactamente 2 de 3 parametros.";
    } else {
      if (!eqSel.n) missing = "n";
      if (!eqSel.m) missing = "m";
      if (!eqSel.nc) missing = "nc";

      if (missing === "n") {
        if (mIn && ncIn) {
          n = mIn * ncIn;
          complete = true;
        }
      }

      if (missing === "m") {
        if (nIn && ncIn) {
          m = Math.ceil(nIn / ncIn);
          complete = true;
          if (m * ncIn !== nIn) note = `Se ajusta m a ${m} para cubrir al menos n=${nIn} individuos.`;
        }
      }

      if (missing === "nc") {
        if (nIn && mIn) {
          nc = Math.ceil(nIn / mIn);
          complete = true;
          if (mIn * nc !== nIn) note = `Se ajusta n_c a ${nc} para cubrir al menos n=${nIn} individuos.`;
        }
      }
    }

    if (!error && complete && m !== null) {
      if (m < H) error = `El numero de conglomerados de la muestra (m) debe ser al menos ${H}.`;
      if (m >= stats.totalConglos) {
        error = `El numero de conglomerados de la muestra (m=${m}) debe ser menor a los conglomerados disponibles (${stats.totalConglos}).`;
      }
    }

    if (!error && complete && nc !== null && nc < 1) error = "El tamano por conglomerado (n_c) debe ser al menos 1.";

    return {
      selected,
      missing,
      complete,
      n,
      m,
      nc,
      error,
      note,
      nEstimado: m && nc ? m * nc : null,
    };
  }, [eqSel, nTotalObj, mTotal, nPorC, H, stats.totalConglos]);

  /* ============== VALIDACION ============== */
  const errMsg = useMemo(() => {
    if (H < 2) return modo === "manual" ? "Define al menos 2 estratos." : "";

    if (modo === "manual") {
      for (const e of estratos as any[]) {
        if (!e.nombre.trim()) return "Todos los estratos necesitan un nombre.";
        if (e.conglos.length < 2) return `"${e.nombre}" necesita al menos 2 conglomerados.`;
        for (const c of e.conglos) {
          if (!c.nombre.trim() || !(parseInt(c.N) >= 1))
            return `Conglomerado en "${e.nombre}": nombre y N_c >= 1 requeridos.`;
          if (tipoM === "personalizar" && !(parseInt(c.n_manual) >= 1))
            return `"${c.nombre}" (${e.nombre}): define el tamano de submuestra n_c.`;
        }
        if (tipoM === "personalizar") {
          const mv = parseInt(e.m_manual);
          if (!mv || mv < 1 || mv >= e.conglos.length)
            return `"${e.nombre}": m_h debe estar entre 1 y ${e.conglos.length - 1}.`;
        }
      }
    }

    if (tipoM === "equiprobabilistico") {
      if (eqCalc.selected !== 2) return eqCalc.error;
      if (!eqCalc.complete) return "";
      return eqCalc.error;
    }

    if (tipoM === "personalizar" && modo === "excel") {
      for (const e of estratosExcel as any[]) {
        if (e.conglos.length < 2) continue;
        const mv = parseInt(e.m_manual);
        if (!mv || mv < 1 || mv >= e.conglos.length)
          return `"${e.nombre}": define m_h entre 1 y ${e.conglos.length - 1}.`;
      }
      if (!nPorC) return "";
      if (isNaN(nPorCInt) || nPorCInt < 1) return "n por conglomerado debe ser al menos 1.";
    }

    return "";
  }, [H, modo, estratos, tipoM, mTotal, nPorC, mTotalInt, nPorCInt, stats, estratosExcel, eqCalc.error]);

  /* - Puede calcular? - */
  const canCalc = useMemo(() => {
    if (errMsg || H < 2) return false;
    if (tipoM === "equiprobabilistico") {
      return eqCalc.selected === 2 && eqCalc.complete && !eqCalc.error && !!eqCalc.m && !!eqCalc.nc;
    }

    if (modo === "manual")
      return estratos.every(
        (e: any) =>
          e.conglos.length >= 2 &&
          parseInt(e.m_manual) >= 1 &&
          parseInt(e.m_manual) < e.conglos.length &&
          e.conglos.every((c: any) => c.nombre.trim() && parseInt(c.N) >= 1 && parseInt(c.n_manual) >= 1)
      );

    return (
      estratosExcel.length >= 2 &&
      estratosExcel.every(
        (e: any) => e.conglos.length >= 2 && parseInt(e.m_manual) >= 1 && parseInt(e.m_manual) < e.conglos.length
      ) &&
      nPorC !== "" &&
      !isNaN(nPorCInt) &&
      nPorCInt >= 1
    );
  }, [errMsg, H, tipoM, mTotal, nPorC, mTotalInt, nPorCInt, stats, modo, estratos, estratosExcel, eqCalc]);

  /* ============== CRUD MANUAL ============== */
  const addEstrato = () => setEst((p) => [...p, newEstrato(p.length)]);
  const rmEstrato = (i: number) => {
    if (estratos.length <= 2) return;
    setEst((p) => p.filter((_, j) => j !== i));
    setRes(null);
  };
  const updEstrato = (i: number, k: string, v: string) => {
    setEst((p) => p.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
    setRes(null);
  };
  const addConglo = (ei: number) =>
    setEst((p) => p.map((e, j) => (j !== ei ? e : { ...e, conglos: [...e.conglos, newConglo(e.conglos.length)] })));
  const rmConglo = (ei: number, ci: number) => {
    if (estratos[ei].conglos.length <= 2) return;
    setEst((p) => p.map((e, j) => (j !== ei ? e : { ...e, conglos: e.conglos.filter((_, k) => k !== ci) })));
    setRes(null);
  };
  const updConglo = (ei: number, ci: number, k: string, v: string) => {
    setEst((p) =>
      p.map((e, j) => (j !== ei ? e : { ...e, conglos: e.conglos.map((c, k2) => (k2 !== ci ? c : { ...c, [k]: v })) }))
    );
    setRes(null);
  };

  /* ============== CALCULO PRINCIPAL ============== */
  function handleCalc() {
    if (!canCalc || errMsg) return;
    setLoad(true);
    setErr("");
    setPags({});
    setTab("combinada");

    setTimeout(() => {
      try {
        const mTotalFinal = tipoM === "equiprobabilistico" ? eqCalc.m ?? 0 : mTotalInt;
        const nPorCFinal = tipoM === "equiprobabilistico" ? eqCalc.nc ?? 0 : nPorCInt;
        const asignFinal = tipoM === "equiprobabilistico" ? "proporcional" : asignM;
        const metodoSelFinal = tipoM === "equiprobabilistico" ? "pps" : metodoSel;

        let estratosConM;
        if (tipoM === "equiprobabilistico") {
          estratosConM = asignFinal === "proporcional" ? asignarPropM(listaAct, mTotalFinal) : asignarIgualM(listaAct, mTotalFinal);
        } else {
          estratosConM = listaAct.map((e: any) => ({ ...e, m: parseInt(e.m_manual) || 0 }));
        }

        let globalOrd = 1;
        const estratosRes = estratosConM.map((e: any, eIdx: number) => {
          const conglosPob = e.conglos.map((c: any) => ({ ...c, N: parseInt(c.N) || 0 }));

          const selConglos = metodoSelFinal === "srs" ? fisherYates(conglosPob, e.m) : ppsSistematico(conglosPob, e.m);

          if (ordenar) selConglos.sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true }));

          const conglosConMuestra = selConglos.map((c: any, cIdx: number) => {
            const n_c = tipoM === "equiprobabilistico" ? Math.min(nPorCFinal, c.N) : Math.min(parseInt(c.n_manual) || 0, c.N);

            let individuos;
            if (modo === "manual" || !c.filas?.length) {
              individuos = Array.from({ length: n_c }, (_, k) => ({
                "N° global": globalOrd + k,
                Estrato: e.nombre,
                Conglomerado: c.nombre,
                "N° en conglo.": k + 1,
              }));
            } else {
              individuos = fisherYates(c.filas, n_c).map((f: any, k: number) => ({
                "N° global": globalOrd + k,
                Estrato: e.nombre,
                Conglomerado: c.nombre,
                "N° en conglo.": k + 1,
                ...f,
              }));
            }
            globalOrd += n_c;
            return { nombre: c.nombre, N: c.N, n: n_c, individuos, colorIdx: cIdx };
          });

          const n_h = conglosConMuestra.reduce((s: number, c: any) => s + c.n, 0);
          return {
            nombre: e.nombre,
            M_h: conglosPob.length,
            m_h: e.m,
            n_h,
            conglos: conglosConMuestra,
            colorIdx: eIdx,
          };
        });

        const completo = estratosRes.flatMap((e: any) => e.conglos.flatMap((c: any) => c.individuos));
        const nTotal = completo.length;
        const mSel = estratosRes.reduce((s: number, e: any) => s + e.m_h, 0);

        const resumen = [
          ...estratosRes.map((e: any) => ({
            Estrato: e.nombre,
            "Conglos. disponibles (M_h)": e.M_h,
            "Conglos. seleccionados (m_h)": e.m_h,
            "Fraccion conglos. (%)": ((e.m_h / e.M_h) * 100).toFixed(1) + "%",
            "Individuos en muestra (n_h)": e.n_h,
            ...(tipoM === "equiprobabilistico" ? { "n_c por conglo.": nPorCFinal } : {}),
          })),
          {
            Estrato: "TOTAL",
            "Conglos. disponibles (M_h)": stats.totalConglos,
            "Conglos. seleccionados (m_h)": mSel,
            "Fraccion conglos. (%)": ((mSel / stats.totalConglos) * 100).toFixed(1) + "%",
            "Individuos en muestra (n_h)": nTotal,
            ...(tipoM === "equiprobabilistico" ? { "n_c por conglo.": nPorCFinal } : {}),
          },
        ];

        setRes({
          estratos: estratosRes,
          completo,
          resumen,
          nTotal,
          mSel,
          M: stats.totalConglos,
          H,
          tipoM,
          metodoSel: metodoSelFinal,
          nPorC: nPorCFinal,
          nObjetivo: tipoM === "equiprobabilistico" ? eqCalc.n : null,
          nPlanificado: tipoM === "equiprobabilistico" ? eqCalc.nEstimado : null,
          eqMetaN: tipoM === "equiprobabilistico" ? toPosInt(nTotalObj) : null,
          eqDef: tipoM === "equiprobabilistico" ? { ...eqSel } : null,
        });
      } catch (ex: any) {
        setErr("Error al generar la muestra: " + ex.message);
      }
      setLoad(false);
    }, 80);
  }

  function handleReset() {
    setNTotalObj("");
    setMTotal("");
    setNPorC("");
    setEqSel({ n: true, m: true, nc: false });
    setRes(null);
    setPags({});
    setTab("combinada");
    setErr("");
    setMExcel({});
  }

  async function handleDesc() {
    if (!res) return;
    setDesc(true);
    try {
      const hojaDatos =
        res.tipoM === "equiprobabilistico"
          ? [
              {
                Parametro: "Tamano de la muestra (n)",
                Valor: res.eqMetaN ?? res.nPlanificado ?? res.nTotal,
                Estado: res.eqDef?.n ? "Ingresado" : "Calculado",
                Formula: "n = m * n_c",
              },
              {
                Parametro: "Numero de conglomerados de la muestra (m)",
                Valor: res.mSel,
                Estado: res.eqDef?.m ? "Ingresado" : "Calculado",
                Formula: "m = ceil(n / n_c)",
              },
              {
                Parametro: "Tamano de muestra por conglomerado (n_c)",
                Valor: res.nPorC,
                Estado: res.eqDef?.nc ? "Ingresado" : "Calculado",
                Formula: "n_c = ceil(n / m)",
              },
              {
                Parametro: "Distribucion de m entre estratos",
                Valor: "Proporcional",
                Estado: "Fijo en equiprobabilistico",
                Formula: "m_h = m * M_h / M_total",
              },
              {
                Parametro: "Metodo seleccion de conglomerados (Etapa 1)",
                Valor: "PPS",
                Estado: "Fijo en equiprobabilistico",
                Formula: "Probabilidad proporcional al tamano",
              },
            ]
          : [];

      await exportarExcel(
        [
          ...(hojaDatos.length ? [{ nombre: "Datos", datos: hojaDatos }] : []),
          { nombre: "Muestra completa", datos: res.completo },
          { nombre: "Resumen estratos", datos: res.resumen },
          ...res.estratos.flatMap((e: any) => e.conglos.map((c: any) => ({ nombre: c.nombre.slice(0, 31), datos: c.individuos }))),
        ],
        `bietapico_H${res.H}_m${res.mSel}_n${res.nTotal}`
      );
    } catch {
      setErr("No se pudo generar el archivo.");
    }
    setDesc(false);
  }

  const getPag = (id: string) => pags[id] || 1;
  const setPag = (id: string, p: number) => setPags((prev) => ({ ...prev, [id]: p }));

  const datosTab = res
    ? tabAct === "combinada"
      ? res.completo
      : tabAct === "resumen"
      ? res.resumen
      : res.estratos.find((e: any) => e.nombre === tabAct)?.conglos.flatMap((c: any) => c.individuos) ?? []
    : [];
  const esGrande = datosTab.length > PREV_MAX;
  const vData = esGrande ? datosTab.slice(0, PREV_MAX) : datosTab;
  const pagAct = getPag(tabAct);
  const tPags = Math.max(1, Math.ceil(vData.length / FILAS_PAG));
  const fPag = vData.slice((pagAct - 1) * FILAS_PAG, pagAct * FILAS_PAG);
  const cols = vData.length > 0 ? Object.keys(vData[0]) : [];

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#fafbfc", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes cinematicFadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .cbe-stagger-1{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.04s}
        .cbe-stagger-2{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.08s}
        .cbe-stagger-3{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.12s}
        .cbe-stagger-4{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.16s}
        .cbe-stagger-5{animation:cinematicFadeInUp .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.20s}
        .cbe-btn-cin{transition:all .3s cubic-bezier(.16,1,.3,1)!important}
        .cbe-btn-cin:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 8px 20px rgba(16,185,129,.18)!important}
        .rh:hover{background:#ecfdf5!important}
        .tbtn:hover{opacity:.8}
        input[type=number],input[type=text]{outline:none;-moz-appearance:textfield}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        .estcard{transition:box-shadow .2s}
        .estcard:hover{box-shadow:0 4px 16px rgba(0,0,0,.08)!important}
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px 60px" }}>
        <div className="cbe-stagger-1" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          <span
            onClick={() => onBack?.()}
            style={{ color: "#10b981", display: "flex", alignItems: "center", gap: 4, cursor: onBack ? "pointer" : "default" }}
          >
            <BackIcon /> Seleccion de Muestras
          </span>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ color: "#374151", fontWeight: 600 }}>Conglomerados Bietapico Estratificado</span>
        </div>

        <div className="cbe-stagger-1" style={{ display: "flex", alignItems: "flex-start", gap: 15, marginBottom: 6 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg,#fdf4ff,#f3e8ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#a855f7",
            }}
          >
            <LayersIcon />
          </div>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, margin: 0, color: "#111827", letterSpacing: "-.02em" }}>
              Conglomerados Bietapico Estratificado
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0", lineHeight: 1.5 }}>
              Estratifica la poblacion {"->"} selecciona conglomerados por estrato (Etapa 1) {"->"} submuestra aleatoria dentro de cada uno (Etapa 2)
            </p>
          </div>
        </div>

        <div
          className="cbe-stagger-2"
          style={{
            background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)",
            border: "1px solid #a7f3d0",
            borderRadius: 12,
            padding: "11px 15px",
            margin: "16px 0 24px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: "#065f46",
          }}
        >
          <div
            style={{
              background: "#10b981",
              borderRadius: 7,
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              flexShrink: 0,
            }}
          >
            <SpkIcon />
          </div>
          <span>
            <b>Asistente IA:</b> Usa este metodo cuando la poblacion esta dividida en categorias distintas (zonas, niveles socioeconomicos) y dentro de cada categoria existen grupos naturales (escuelas, comunidades). El metodo PPS es recomendado cuando los conglomerados tienen tamanos muy diferentes. Calcula siempre el DEFF antes de estimar varianzas.
          </span>
        </div>

        <div className="cbe-stagger-3" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b7280", marginBottom: 9 }}>
            Fuente de datos
          </div>
          <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 12, padding: 4 }}>
            {[
              {
                id: "manual",
                icon: "✏️",
                label: "Definir manualmente",
                desc: "Escribe tus estratos, conglomerados y tamanos N_c",
              },
              {
                id: "excel",
                icon: "📊",
                label: "Desde mi tabla Excel",
                desc: datosExcel ? `${datosExcel.length.toLocaleString()} filas` : "Sin tabla cargada",
              },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  if (m.id === "excel" && !datosExcel) return;
                  setModo(m.id);
                  setRes(null);
                  setErr("");
                }}
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
                  <div style={{ fontSize: 11, fontWeight: 500, color: modo === m.id ? "#6b7280" : "#9ca3af", marginTop: 1 }}>
                    {m.desc}
                  </div>
                </div>
                {m.id === "excel" && datosExcel && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "#ecfdf5",
                      color: "#059669",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 20,
                    }}
                  >
                    Listo
                  </span>
                )}
                {m.id === "excel" && !datosExcel && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "#f3f4f6",
                      color: "#9ca3af",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Carga tabla
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="cbe-stagger-4" style={{ background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: "24px 24px 14px", boxShadow: "0 4px 20px rgba(0,0,0,.04)" }}>
          <SLbl step="Paso 1" label={modo === "excel" ? "Tipo de datos y columnas" : "Define los estratos y sus conglomerados"} />

          {modo === "manual" && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>
                Cada estrato agrupa sus propios conglomerados. Define el nombre y el tamano de poblacion (N_c) de cada conglomerado.
                {tipoM === "personalizar" && (
                  <b style={{ color: "#374151" }}>
                    {" "}
                    En modo Personalizar: define tambien m_h (conglos. a seleccionar) y n_c (submuestra por conglo.).
                  </b>
                )}
              </p>

              {estratos.map((e: any, ei: number) => {
                const ec = gc(ei);
                return (
                  <div
                    key={e.id}
                    className="estcard"
                    style={{ marginBottom: 14, border: `2px solid ${ec.brd}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}
                  >
                    <div style={{ background: ec.bg, padding: "11px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: ec.dot, flexShrink: 0 }} />
                      <input
                        value={e.nombre}
                        onChange={(ev) => updEstrato(ei, "nombre", ev.target.value)}
                        style={{
                          flex: 1,
                          minWidth: 120,
                          border: "none",
                          background: "transparent",
                          fontSize: 14,
                          fontWeight: 700,
                          color: ec.txt,
                          fontFamily: "inherit",
                          outline: "none",
                        }}
                      />
                      {tipoM === "personalizar" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: ec.txt, whiteSpace: "nowrap" }}>m_h (conglos. a selec.):</label>
                          <input
                            type="number"
                            min="1"
                            max={e.conglos.length - 1}
                            value={e.m_manual}
                            onChange={(ev) => updEstrato(ei, "m_manual", ev.target.value)}
                            placeholder={`1-${e.conglos.length - 1}`}
                            style={{
                              width: 70,
                              border: `1.5px solid ${ec.brd}`,
                              borderRadius: 8,
                              padding: "6px 10px",
                              fontSize: 13,
                              fontFamily: "inherit",
                              background: "white",
                              color: ec.txt,
                              textAlign: "center",
                              outline: "none",
                            }}
                          />
                        </div>
                      )}
                      <button
                        onClick={() => rmEstrato(ei)}
                        disabled={estratos.length <= 2}
                        style={{
                          width: 30,
                          height: 30,
                          border: "none",
                          borderRadius: 8,
                          cursor: estratos.length <= 2 ? "not-allowed" : "pointer",
                          background: "transparent",
                          color: estratos.length <= 2 ? "#d1d5db" : "#ef4444",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginLeft: 4,
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </div>

                    <div style={{ padding: "12px 16px 10px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: `2fr 1fr${tipoM === "personalizar" ? " 1fr" : ""} auto`, gap: 8, marginBottom: 8 }}>
                        {["Nombre del conglomerado", "Poblacion (N_c)", ...(tipoM === "personalizar" ? ["Submuestra (n_c)"] : []), ""].map((h, i) => (
                          <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em" }}>
                            {h}
                          </div>
                        ))}
                      </div>

                      {e.conglos.map((c: any, ci: number) => (
                        <div
                          key={c.id}
                          style={{ display: "grid", gridTemplateColumns: `2fr 1fr${tipoM === "personalizar" ? " 1fr" : ""} auto`, gap: 8, marginBottom: 8, alignItems: "center" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1.5px solid #e5e7eb", borderRadius: 9, padding: "3px 3px 3px 10px", background: "#fafbfc" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: ec.dot, flexShrink: 0 }} />
                            <input
                              type="text"
                              value={c.nombre}
                              onChange={(ev) => updConglo(ei, ci, "nombre", ev.target.value)}
                              style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, fontWeight: 500, color: "#374151", fontFamily: "inherit", padding: "8px 4px", outline: "none" }}
                            />
                          </div>
                          <input
                            type="number"
                            value={c.N}
                            onChange={(ev) => updConglo(ei, ci, "N", ev.target.value)}
                            placeholder="Ej: 200"
                            min="1"
                            style={{ border: "1.5px solid #e5e7eb", borderRadius: 9, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", color: "#111827", width: "100%", outline: "none" }}
                          />
                          {tipoM === "personalizar" && (
                            <input
                              type="number"
                              value={c.n_manual}
                              onChange={(ev) => updConglo(ei, ci, "n_manual", ev.target.value)}
                              placeholder="Ej: 30"
                              min="1"
                              style={{ border: "1.5px solid #e5e7eb", borderRadius: 9, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", color: "#111827", width: "100%", outline: "none" }}
                            />
                          )}
                          <button
                            onClick={() => rmConglo(ei, ci)}
                            disabled={e.conglos.length <= 2}
                            style={{
                              width: 34,
                              height: 34,
                              border: "1.5px solid #e5e7eb",
                              borderRadius: 8,
                              cursor: e.conglos.length <= 2 ? "not-allowed" : "pointer",
                              background: "white",
                              color: e.conglos.length <= 2 ? "#d1d5db" : "#ef4444",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => addConglo(ei)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "7px 14px",
                          border: `1.5px dashed ${ec.brd}`,
                          borderRadius: 9,
                          background: "transparent",
                          color: ec.dot,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all .15s",
                        }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.background = ec.bg)}
                        onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                      >
                        <AddIcon /> Agregar conglomerado
                      </button>
                    </div>
                  </div>
                );
              })}

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                <button
                  onClick={addEstrato}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "10px 18px",
                    border: "1.5px dashed #d1fae5",
                    borderRadius: 10,
                    background: "#f9fafb",
                    color: "#10b981",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#ecfdf5")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#f9fafb")}
                >
                  <AddIcon /> Agregar estrato
                </button>
                {stats.H >= 2 && stats.totalConglos >= 4 && (
                  <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                    <SMini label="Estratos (H)" val={stats.H} color="#a855f7" />
                    <SMini label="Total conglos." val={stats.totalConglos} color="#f97316" />
                    <SMini label="Total pob. (N)" val={stats.totalPob.toLocaleString()} color="#374151" />
                  </div>
                )}
              </div>
            </div>
          )}

          {modo === "excel" && (
            <div style={{ marginBottom: 18 }}>
              {!datosExcel ? (
                <div style={{ background: "#f9fafb", border: "1.5px dashed #d1d5db", borderRadius: 12, padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                  Carga una tabla Excel desde el modulo de Preprocesamiento para continuar
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                    {[
                      {
                        id: "individual",
                        emoji: "👤",
                        titulo: "Datos individuales",
                        desc: "Cada fila es una persona. Necesitas col. de estrato y col. de conglomerado. El sistema agrupa y cuenta N_c.",
                        col: { bg: "#ecfdf5", brd: "#10b981", txt: "#065f46", dot: "#10b981" },
                      },
                      {
                        id: "agregado",
                        emoji: "📋",
                        titulo: "Datos agregados",
                        desc: "Cada fila es un conglomerado con su tamano N_c. Necesitas col. de estrato, col. de nombre y col. de tamano.",
                        col: { bg: "#fff7ed", brd: "#f97316", txt: "#7c2d12", dot: "#f97316" },
                      },
                    ].map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setTipoEnt(t.id);
                          setColEst("");
                          setColCon("");
                          setColNom("");
                          setColTam("");
                          setMExcel({});
                          setRes(null);
                        }}
                        style={{
                          padding: 15,
                          borderRadius: 13,
                          cursor: "pointer",
                          border: tipoEnt === t.id ? `2px solid ${t.col.brd}` : "2px solid #e5e7eb",
                          background: tipoEnt === t.id ? t.col.bg : "white",
                          transition: "all .2s",
                        }}
                      >
                        <div style={{ fontSize: 22, marginBottom: 8 }}>{t.emoji}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: tipoEnt === t.id ? t.col.txt : "#374151", marginBottom: 5 }}>{t.titulo}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{t.desc}</div>
                        {tipoEnt === t.id && (
                          <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: t.col.dot, display: "flex", alignItems: "center", gap: 4 }}>
                            <ChkIcon />Seleccionado
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: tipoEnt === "individual" ? "1fr 1fr" : "1fr 1fr 1fr", gap: 14 }}>
                    <ColSel
                      label="Columna de estrato"
                      hint="Identifica a que estrato pertenece cada fila"
                      val={colEst}
                      cols={colsExcel}
                      onChange={(v: string) => {
                        setColEst(v);
                        setMExcel({});
                        setRes(null);
                      }}
                      placeholder="Ej: Zona, Region..."
                    />
                    {tipoEnt === "individual" ? (
                      <ColSel
                        label="Columna de conglomerado"
                        hint="Identifica el conglomerado (escuela, barrio, etc.) de cada persona"
                        val={colCon}
                        cols={colsExcel.filter((c) => c !== colEst)}
                        onChange={(v: string) => {
                          setColCon(v);
                          setRes(null);
                        }}
                        placeholder="Ej: Escuela, Barrio..."
                      />
                    ) : (
                      <>
                        <ColSel
                          label="Nombre del conglomerado"
                          hint="Nombre o ID del conglomerado"
                          val={colNom}
                          cols={colsExcel.filter((c) => c !== colEst)}
                          onChange={(v: string) => {
                            setColNom(v);
                            setRes(null);
                          }}
                          placeholder="Ej: Escuela, Hospital..."
                        />
                        <ColSel
                          label="Tamano N_c"
                          hint="Numero de individuos en el conglomerado"
                          val={colTam}
                          cols={colsExcel.filter((c) => c !== colEst && c !== colNom)}
                          onChange={(v: string) => {
                            setColTam(v);
                            setRes(null);
                          }}
                          placeholder="Ej: Total, N_c..."
                        />
                      </>
                    )}
                  </div>

                  {estratosExcel.length > 0 && (
                    <div style={{ marginTop: 14, background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 13, padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
                          ✅ {estratosExcel.length} estratos · {stats.totalConglos} conglomerados · {stats.totalPob.toLocaleString()} individuos detectados
                        </span>
                        {tipoM === "personalizar" && <span style={{ fontSize: 12, color: "#6b7280" }}>Define m_h para cada estrato {"->"}</span>}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {estratosExcel.map((e: any, i: number) => {
                          const col = gc(i);
                          return (
                            <div key={e.nombre} style={{ background: col.bg, border: `1px solid ${col.brd}`, borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 7, height: 7, borderRadius: "50%", background: col.dot }} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: col.txt }}>{e.nombre}</span>
                              <span style={{ fontSize: 11, color: col.dot, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{e.conglos.length} conglos.</span>
                              {tipoM === "personalizar" && (
                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <span style={{ fontSize: 11, color: "#9ca3af" }}>m_h:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max={e.conglos.length - 1}
                                    value={mExcel[e.nombre] ?? ""}
                                    onChange={(ev) => setMExcel((prev) => ({ ...prev, [e.nombre]: ev.target.value }))}
                                    placeholder={`1-${e.conglos.length - 1}`}
                                    style={{ width: 55, border: `1.5px solid ${col.brd}`, borderRadius: 6, padding: "3px 6px", fontSize: 12, fontFamily: "inherit", background: "white", color: col.txt, textAlign: "center", outline: "none" }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {H >= 2 && (
            <>
              <Divider />
              <SLbl step="Paso 2" label="Tipo de muestreo" />
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px", lineHeight: 1.5 }}>
                Define como se distribuyen los parametros entre los estratos y conglomerados.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                {[
                  {
                    id: "equiprobabilistico",
                    emoji: "⚖️",
                    label: "Equiprobabilistico",
                    desc: "Parametros m (total conglos.) y n_c (por conglo.) globales, distribuidos automaticamente entre estratos.",
                    badge: "Recomendado",
                    bc: "#3b82f6",
                    bb: "#eff6ff",
                  },
                  {
                    id: "personalizar",
                    emoji: "✏️",
                    label: "Personalizar",
                    desc: "Control total: define m_h por estrato y n_c por conglomerado individualmente.",
                    badge: "Control total",
                    bc: "#a855f7",
                    bb: "#fdf4ff",
                  },
                ].map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setTipoM(t.id);
                      setRes(null);
                    }}
                    style={{
                      padding: 15,
                      borderRadius: 13,
                      cursor: "pointer",
                      border: tipoM === t.id ? "2px solid #10b981" : "2px solid #e5e7eb",
                      background: tipoM === t.id ? "#f0fdf4" : "white",
                      transition: "all .2s",
                      boxShadow: tipoM === t.id ? "0 4px 12px rgba(16,185,129,.1)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 19, height: 19, borderRadius: "50%", border: tipoM === t.id ? "6px solid #10b981" : "2px solid #d1d5db", flexShrink: 0, transition: "all .2s" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: t.bb, color: t.bc }}>{t.badge}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: tipoM === t.id ? "#065f46" : "#374151", marginBottom: 5 }}>
                      {t.emoji} {t.label}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{t.desc}</div>
                    {tipoM === t.id && (
                      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: "#10b981", display: "flex", alignItems: "center", gap: 4 }}>
                        <ChkIcon />Seleccionado
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {tipoM === "equiprobabilistico" && (
                <>
                  <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Datos (elige 2 de 3)</div>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px", lineHeight: 1.45 }}>
                      Se usa la relacion base del diseno equiprobabilistico: <b>n = m × n_c</b>. El sistema calcula automaticamente el parametro no seleccionado.
                    </p>

                    {[{
                      key: "n",
                      label: "Tamano de la muestra (n)",
                      tooltip: "Numero total de individuos que deseas en la muestra final. Se usa para definir la precision global esperada del estudio.",
                      hint: "Formula cuando no se selecciona: n = m × n_c",
                      value: nTotalObj,
                      setter: setNTotalObj,
                      computed: eqCalc.n,
                    }, {
                      key: "m",
                      label: "Numero de conglomerados de la muestra (m)",
                      tooltip: "Cantidad de conglomerados a seleccionar en la Etapa 1. Afecta cobertura geografica/logistica y efecto de diseno.",
                      hint: "Formula cuando no se selecciona: m = ceil(n / n_c)",
                      value: mTotal,
                      setter: setMTotal,
                      computed: eqCalc.m,
                    }, {
                      key: "nc",
                      label: "Tamano de muestra por conglomerado (n_c)",
                      tooltip: "Numero de individuos seleccionados dentro de cada conglomerado escogido. Se aplica SRS en la Etapa 2.",
                      hint: "Formula cuando no se selecciona: n_c = ceil(n / m)",
                      value: nPorC,
                      setter: setNPorC,
                      computed: eqCalc.nc,
                    }].map((item) => {
                      const isSelected = eqSel[item.key as "n" | "m" | "nc"];
                      const canSelect = isSelected || eqCalc.selected < 2;
                      const isComputed = eqCalc.missing === item.key;

                      return (
                        <div key={item.key} style={{ display: "grid", gridTemplateColumns: "24px 1.7fr 1fr", gap: 10, alignItems: "center", marginBottom: 10 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!canSelect}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (!checked) {
                                setEqSel((prev) => ({ ...prev, [item.key]: false }));
                              } else if (eqCalc.selected < 2) {
                                setEqSel((prev) => ({ ...prev, [item.key]: true }));
                              }
                              setRes(null);
                            }}
                            style={{ width: 18, height: 18 }}
                          />

                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <label style={{ fontSize: 13, fontWeight: 600, color: isSelected ? "#374151" : "#9ca3af" }}>{item.label}</label>
                              <TT text={item.tooltip}><span style={{ color: "#9ca3af", display: "flex" }}><InfoIcon /></span></TT>
                            </div>
                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{item.hint}</div>
                          </div>

                          <input
                            type="number"
                            min="1"
                            value={isComputed ? item.computed ?? "" : item.value}
                            onChange={(e) => {
                              item.setter(e.target.value);
                              setRes(null);
                            }}
                            disabled={!isSelected || isComputed}
                            placeholder="0"
                            style={{ border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", color: isComputed ? "#065f46" : "#111827", background: isComputed ? "#ecfdf5" : !isSelected ? "#f3f4f6" : "white", outline: "none" }}
                          />
                        </div>
                      );
                    })}

                    {eqCalc.note && <div style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 10px", marginTop: 8 }}>{eqCalc.note}</div>}
                    {eqCalc.nEstimado && (
                      <div style={{ fontSize: 12, color: "#065f46", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 10px", marginTop: 8 }}>
                        Muestra planificada: n = {eqCalc.m} × {eqCalc.nc} = <b>{eqCalc.nEstimado.toLocaleString()}</b> individuos.
                      </div>
                    )}
                  </div>

                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 11, padding: "10px 12px", fontSize: 12, color: "#1e3a8a", marginBottom: 8 }}>
                    En <b>Equiprobabilistico</b> se aplica configuracion fija de Etapa 1: <b>distribucion proporcional</b> de conglomerados por estrato y <b>seleccion PPS</b> de conglomerados.
                  </div>
                </>
              )}

              {tipoM === "personalizar" && modo === "excel" && (
                <div style={{ maxWidth: 380 }}>
                  <FNum
                    label="Individuos por conglomerado seleccionado (n_c)"
                    value={nPorC}
                    onChange={(v: string) => {
                      setNPorC(v);
                      setRes(null);
                    }}
                    placeholder="Ej: 30"
                    hint="Valor global aplicado a todos los conglomerados seleccionados"
                    tooltip="En el modo Excel, n_c es el mismo para todos los conglomerados. Para n_c diferente por conglomerado, usa el modo Manual."
                  />
                </div>
              )}
            </>
          )}

          {H >= 2 && tipoM === "personalizar" && (
            <>
              <Divider />
              <SLbl step="Paso 3" label="Metodo de seleccion de conglomerados (Etapa 1)" />
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px", lineHeight: 1.5 }}>
                Define como se seleccionan los conglomerados dentro de cada estrato en la primera etapa.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                {[
                  {
                    id: "srs",
                    label: "🎲 Muestreo Aleatorio Simple (SRS)",
                    desc: "Cada conglomerado tiene igual probabilidad de ser seleccionado, independientemente de su tamano N_c.",
                  },
                  {
                    id: "pps",
                    label: "📐 Probabilidad Proporcional al Tamano (PPS)",
                    desc: "Conglomerados mas grandes tienen mayor probabilidad. Recomendado cuando los N_c varian mucho entre grupos.",
                  },
                ].map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setMetSel(m.id);
                      setRes(null);
                    }}
                    style={{
                      padding: "13px 15px",
                      borderRadius: 12,
                      cursor: "pointer",
                      border: metodoSel === m.id ? "2px solid #10b981" : "2px solid #e5e7eb",
                      background: metodoSel === m.id ? "#f0fdf4" : "white",
                      transition: "all .2s",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: metodoSel === m.id ? "#065f46" : "#374151", marginBottom: 5 }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{m.desc}</div>
                    {metodoSel === m.id && (
                      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: "#10b981", display: "flex", alignItems: "center", gap: 4 }}>
                        <ChkIcon />Seleccionado
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Divider />
              <SLbl step="Paso 4" label="Opciones de presentacion" />
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
                  transition: "all .2s",
                  userSelect: "none",
                  maxWidth: 500,
                }}
              >
                <div
                  style={{
                    width: 21,
                    height: 21,
                    borderRadius: 6,
                    border: ordenar ? "2px solid #10b981" : "2px solid #d1d5db",
                    background: ordenar ? "#10b981" : "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all .2s",
                    flexShrink: 0,
                  }}
                >
                  {ordenar && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: ordenar ? "#10b981" : "#6b7280" }}>
                    <SortIcon />
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: ordenar ? "#065f46" : "#374151" }}>Ordenar conglomerados seleccionados</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Presenta los grupos en orden alfabetico/numerico dentro de cada estrato</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {errMsg && (
          <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 11, padding: "11px 15px", marginTop: 14, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
            ⚠️ {errMsg}
          </div>
        )}

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
              transition: "all .25s",
              background: canCalc ? "linear-gradient(135deg,#10b981,#059669)" : "#e5e7eb",
              color: canCalc ? "white" : "#9ca3af",
              boxShadow: canCalc ? "0 4px 14px rgba(16,185,129,.3)" : "none",
            }}
            onMouseDown={(e) => {
              if (canCalc) e.currentTarget.style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {loading ? (
              <>
                <Spin /> Generando...
              </>
            ) : (
              <>
                <CalcIcon /> {res ? "Regenerar muestra" : "Generar muestra bietapica estratificada"}
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: "13px 18px",
              borderRadius: 12,
              border: "2px solid #e5e7eb",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              background: "white",
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <RstIcon /> Limpiar
          </button>
        </div>

        {err && (
          <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 11, padding: "11px 15px", marginTop: 14, fontSize: 13, color: "#dc2626" }}>
            ❌ {err}
          </div>
        )}

        {res && (
          <div style={{ marginTop: 28, animation: "slideUp .4s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: 10, marginBottom: 20 }}>
              <KPIc label="Estratos (H)" val={res.H} color="#a855f7" bg="#fdf4ff" brd="#d8b4fe" />
              <KPIc label="Conglos. seleccionados" val={`${res.mSel}/${res.M}`} color="#f97316" bg="#fff7ed" brd="#fdba74" />
              <KPIc label="Total individuos" val={res.nTotal.toLocaleString()} color="#10b981" bg="#ecfdf5" brd="#6ee7b7" />
              <KPIc label="Metodo seleccion" val={res.metodoSel.toUpperCase()} color="#3b82f6" bg="#eff6ff" brd="#93c5fd" />
              {res.nPorC && <KPIc label="n_c por conglo." val={res.nPorC} color="#059669" bg="#f0fdf4" brd="#a7f3d0" />}
              {res.estratos.map((e: any, i: number) => {
                const col = gc(i);
                return (
                  <div key={e.nombre} style={{ background: col.bg, border: `1.5px solid ${col.brd}`, borderRadius: 13, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: col.dot, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: col.dot }} />
                      {e.nombre.slice(0, 16)}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: col.txt, fontFamily: "'DM Mono',monospace" }}>{e.m_h}/{e.M_h}</div>
                    <div style={{ fontSize: 10, color: col.dot, fontWeight: 600, marginTop: 2 }}>conglos. · {e.n_h.toLocaleString()} ind.</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>Vista de la muestra generada</span>
              <button
                onClick={handleDesc}
                disabled={descLoad}
                style={{
                  padding: "11px 20px",
                  borderRadius: 12,
                  border: "2px solid #10b981",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  background: descLoad ? "#f0fdf4" : "white",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 2px 8px rgba(16,185,129,.12)",
                  transition: "all .2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#ecfdf5")}
                onMouseLeave={(e) => {
                  if (!descLoad) e.currentTarget.style.background = "white";
                }}
              >
                {descLoad ? (
                  <>
                    <Spin sm /> Descargando...
                  </>
                ) : (
                  <>
                    <DlIcon /> Descargar Excel (por estrato)
                  </>
                )}
              </button>
            </div>

            <div style={{ display: "flex", gap: 3, overflowX: "auto", background: "#f3f4f6", borderRadius: "14px 14px 0 0", padding: "6px 6px 0" }}>
              {[
                { id: "resumen", lbl: "📊 Resumen", badge: res.estratos.length },
                { id: "combinada", lbl: "🗂 Muestra completa", badge: res.nTotal },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
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
                    transition: "all .2s",
                    background: tabAct === t.id ? "white" : "transparent",
                    color: tabAct === t.id ? "#111827" : "#6b7280",
                  }}
                >
                  {t.lbl}{" "}
                  <span style={{ marginLeft: 6, background: tabAct === t.id ? "#ecfdf5" : "#e5e7eb", color: tabAct === t.id ? "#059669" : "#9ca3af", fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 20 }}>
                    {t.badge.toLocaleString()}
                  </span>
                </button>
              ))}
              {res.estratos.map((e: any, i: number) => {
                const col = gc(i);
                const isA = tabAct === e.nombre;
                return (
                  <button
                    key={e.nombre}
                    onClick={() => setTab(e.nombre)}
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
                      transition: "all .2s",
                      background: isA ? "white" : "transparent",
                      color: isA ? col.txt : "#6b7280",
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: col.dot, display: "inline-block", marginRight: 5 }} />
                    {e.nombre}
                    <span style={{ marginLeft: 5, background: isA ? col.bg : "#e5e7eb", color: isA ? col.txt : "#9ca3af", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>
                      {e.n_h.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>

            {esGrande && (
              <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", padding: "11px 18px", fontSize: 13, color: "#92400e", display: "flex", gap: 8 }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <div>
                  <b>Datos grandes ({datosTab.length.toLocaleString()} filas)</b> · Mostrando las primeras {PREV_MAX.toLocaleString()}. Descarga el Excel para ver todos.
                </div>
              </div>
            )}

            <div style={{ background: "white", border: "2px solid #6ee7b7", borderTop: "none", borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
              {cols.length === 0 ? (
                <div style={{ padding: 28, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Sin datos para mostrar</div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          {cols.map((c) => (
                            <th key={c} style={{ padding: "10px 18px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fPag.map((fila: any, i: number) => {
                          const ei = res.estratos.findIndex((e: any) => e.nombre === fila["Estrato"]);
                          const ec = ei >= 0 ? gc(ei) : null;
                          return (
                            <tr key={i} className="rh" style={{ background: i % 2 === 0 ? "white" : "#fafbfc", transition: "background .12s" }}>
                              {cols.map((c) => (
                                <td key={c} style={{ padding: "10px 18px", borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap", color: c === "N° global" ? "#10b981" : c === "Estrato" && ec ? ec.txt : "#374151", fontWeight: c === "N° global" ? 700 : c === "Estrato" ? 600 : 400, fontFamily: c === "N° global" || c === "N° en conglo." ? "'DM Mono',monospace" : "inherit" }}>
                                  {c === "Estrato" && ec ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: ec.bg, padding: "2px 9px", borderRadius: 20, border: `1px solid ${ec.brd}` }}>
                                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: ec.dot }} />
                                      {fila[c]}
                                    </span>
                                  ) : (
                                    fila[c] ?? "—"
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {tPags > 1 && <PaginComp pagina={pagAct} totalPags={tPags} setPagina={(p: any) => setPag(tabAct, p)} vData={vData} />}
                </>
              )}
            </div>

            <div style={{ marginTop: 18, background: "white", border: "1.5px solid #e5e7eb", borderRadius: 14, padding: "16px 20px", display: "flex", gap: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
                <SpkIcon />
              </div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.65 }}>
                <b style={{ color: "#065f46" }}>Interpretacion:</b>{" "}
                Se aplico <b>muestreo bietapico estratificado</b> con <b>{res.H} estratos</b>. <b>Etapa 1:</b> Se seleccionaron <b>{res.mSel} conglomerados</b> de {res.M} disponibles usando <b>{res.metodoSel === "srs" ? "SRS (probabilidad igual)" : "PPS sistematico (probabilidad proporcional al tamano)"}</b>. <b>Etapa 2:</b> Dentro de cada conglomerado se seleccionaron {res.tipoM === "equiprobabilistico" ? <><b>{res.nPorC} individuos</b> (SRS)</> : <b>individuos segun n_c definido por conglomerado</b>}. La muestra final incluye <b>{res.nTotal.toLocaleString()} individuos</b>: {res.estratos.map((e: any) => `${e.nombre} (m_h=${e.m_h}, n_h=${e.n_h.toLocaleString()})`).join(" · ")}. <span style={{ color: "#d97706" }}> Calcula el DEFF (≈1 + (n̄_c−1)×ρ) antes de estimar varianzas para corregir el efecto del diseno.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== SUB-COMPONENTES ============== */

function SLbl({ step, label }: { step: string; label: string }) {
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

function FNum({ label, tooltip, value, onChange, placeholder, hint }: any) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
        {tooltip && (
          <TT text={tooltip}>
            <span style={{ color: "#9ca3af", display: "flex" }}>
              <InfoIcon />
            </span>
          </TT>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", border: f ? "2px solid #10b981" : "2px solid #e5e7eb", borderRadius: 10, background: "white", overflow: "hidden", transition: "all .2s", boxShadow: f ? "0 0 0 3px rgba(16,185,129,.1)" : "none" }}>
        <input
          type="number"
          step="1"
          min="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setF(true)}
          onBlur={() => setF(false)}
          placeholder={placeholder}
          style={{ flex: 1, border: "none", outline: "none", padding: "11px 14px", fontSize: 14, fontFamily: "'DM Sans',sans-serif", background: "transparent", color: "#111827" }}
        />
      </div>
      {hint && <p style={{ fontSize: 12, color: "#9ca3af", margin: "5px 0 0", lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

function ColSel({ label, hint, tooltip, val, cols, onChange, placeholder }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
        {tooltip && (
          <TT text={tooltip}>
            <span style={{ color: "#9ca3af", display: "flex" }}>
              <InfoIcon />
            </span>
          </TT>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <select value={val} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: "11px 36px 11px 14px", border: `2px solid ${val ? "#10b981" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", appearance: "none", outline: "none", color: val ? "#111827" : "#9ca3af", cursor: "pointer", background: val ? "#f0fdf4" : "white", transition: "all .2s" }}>
          <option value="">{placeholder || "Seleccionar columna..."}</option>
          {cols.map((c: string) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: val ? "#10b981" : "#9ca3af", pointerEvents: "none" }}>▾</span>
      </div>
      {hint && <p style={{ fontSize: 12, color: "#9ca3af", margin: "5px 0 0" }}>{hint}</p>}
    </div>
  );
}

function TT({ children, text }: any) {
  const [s, setS] = useState(false);
  return (
    <span onMouseEnter={() => setS(true)} onMouseLeave={() => setS(false)} style={{ position: "relative", display: "inline-flex", cursor: "help" }}>
      {children}
      {s && (
        <span style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1f2937", color: "#f9fafb", fontSize: 12, lineHeight: 1.5, padding: "9px 13px", borderRadius: 10, width: 250, zIndex: 300, pointerEvents: "none", fontWeight: 400 }}>
          {text}
          <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #1f2937" }} />
        </span>
      )}
    </span>
  );
}

function SMini({ label, val, color }: any) {
  return (
    <div style={{ background: "white", border: "1.5px solid #e5e7eb", borderRadius: 11, padding: "10px 14px" }}>
      <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'DM Mono',monospace" }}>{val}</div>
      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function KPIc({ label, val, color, bg, brd }: any) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${brd}`, borderRadius: 13, padding: "12px 15px" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "'DM Mono',monospace" }}>{val}</div>
      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function Spin({ sm }: { sm?: boolean }) {
  const s = sm ? 14 : 17;
  return <span style={{ width: s, height: s, border: `${sm ? 2 : 3}px solid rgba(16,185,129,.3)`, borderTopColor: "#10b981", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />;
}

function PaginComp({ pagina, totalPags, setPagina, vData }: any) {
  function gP(c: number, t: number) {
    if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
    if (c <= 4) return [1, 2, 3, 4, 5, "...", t];
    if (c >= t - 3) return [1, "...", t - 4, t - 3, t - 2, t - 1, t];
    return [1, "...", c - 1, c, c + 1, "...", t];
  }

  const PB = ({ l, d, f }: any) => (
    <button onClick={f} disabled={d} style={{ width: 34, height: 34, border: "1.5px solid #e5e7eb", borderRadius: 8, cursor: d ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, background: "white", color: d ? "#d1d5db" : "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>
      {l}
    </button>
  );

  return (
    <div style={{ padding: "14px 22px", borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
      <span style={{ fontSize: 12, color: "#9ca3af" }}>
        Filas {(pagina - 1) * FILAS_PAG + 1}-{Math.min(pagina * FILAS_PAG, vData.length)} de {vData.length.toLocaleString()}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <PB l="«" d={pagina === 1} f={() => setPagina(1)} />
        <PB l="‹" d={pagina === 1} f={() => setPagina((p: number) => Math.max(1, p - 1))} />
        {gP(pagina, totalPags).map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} style={{ padding: "0 6px", color: "#9ca3af" }}>
              ...
            </span>
          ) : (
            <button key={String(p)} onClick={() => setPagina(p)} style={{ width: 34, height: 34, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: pagina === p ? "#10b981" : "#f3f4f6", color: pagina === p ? "white" : "#6b7280" }}>
              {p}
            </button>
          )
        )}
        <PB l="›" d={pagina === totalPags} f={() => setPagina((p: number) => Math.min(totalPags, p + 1))} />
        <PB l="»" d={pagina === totalPags} f={() => setPagina(totalPags)} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#6b7280" }}>
        Ir a{" "}
        <input
          type="number"
          min={1}
          max={totalPags}
          placeholder={String(pagina)}
          onKeyDown={(e: any) => {
            if (e.key === "Enter") {
              const v = parseInt(e.target.value);
              if (v >= 1 && v <= totalPags) {
                setPagina(v);
                e.target.value = "";
              }
            }
          }}
          style={{ width: 50, padding: "5px 8px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", textAlign: "center" }}
        />
      </div>
    </div>
  );
}
