import { useState, useEffect, useRef } from 'react';

/* ─── Math helpers ─── */

const jStat = {
  normalInv(p: number): number {
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
    const pLow = 0.02425, pHigh = 1 - pLow;
    let q: number, r: number;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    } else if (p <= pHigh) {
      q = p - 0.5; r = q * q;
      return ((((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q) / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
  },
};

/* ─── Interfaces ─── */

interface CalcSampleSizeParams {
  N: number | null;
  sd: number;
  confidence: number;
  precision: number;
  designEffect: number;
}

interface CalcPrecisionParams {
  N: number | null;
  sd: number;
  confidence: number;
  sampleSize: number;
  designEffect: number;
}

interface CalcPrecisionRangeParams {
  N: number | null;
  sd: number;
  confidence: number;
  designEffect: number;
  min: number;
  max: number;
  increment: number;
}

interface RangeRow {
  precision: number;
  n: number;
}

interface SampleSizeResult {
  type: 'sampleSize';
  value: number;
  params: { N: number | null; sd: number; confidence: number; precision: number; designEffect: number };
}

interface PrecisionResult {
  type: 'precision';
  value: string;
  params: { N: number | null; sd: number; confidence: number; sampleSize: number; designEffect: number };
}

interface RangeResult {
  type: 'range';
  values: RangeRow[];
  params: { N: number | null; sd: number; confidence: number; designEffect: number; min: number; max: number; increment: number };
}

type CalcResult = SampleSizeResult | PrecisionResult | RangeResult;

/* ─── Calc functions ─── */

function calcSampleSize({ N, sd, confidence, precision, designEffect }: CalcSampleSizeParams): number {
  const alpha = 1 - confidence / 100;
  const z = Math.abs(jStat.normalInv(alpha / 2));
  let n = (z * z * sd * sd) / (precision * precision);
  if (N && N > 0) { n = n / (1 + (n - 1) / N); }
  n = n * designEffect;
  return Math.ceil(n);
}

function calcPrecision({ N, sd, confidence, sampleSize, designEffect }: CalcPrecisionParams): number {
  const alpha = 1 - confidence / 100;
  const z = Math.abs(jStat.normalInv(alpha / 2));
  const nAdj = sampleSize / designEffect;
  if (N && N > 0) {
    const fpc = (N - nAdj) / (N - 1);
    return z * sd * Math.sqrt(fpc / nAdj);
  }
  return z * sd / Math.sqrt(nAdj);
}

function calcPrecisionRange({ N, sd, confidence, designEffect, min, max, increment }: CalcPrecisionRangeParams): RangeRow[] {
  const results: RangeRow[] = [];
  for (let prec = min; prec <= max + 0.0001; prec += increment) {
    const n = calcSampleSize({ N, sd, confidence, precision: prec, designEffect });
    results.push({ precision: parseFloat(prec.toFixed(4)), n });
  }
  return results;
}

/* ─── Icons ─── */

const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/>
  </svg>
);

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

const CalcIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/>
    <line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/>
    <line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/>
    <line x1="8" y1="18" x2="16" y2="18"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const ResetIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
  </svg>
);

const TargetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);

const TableIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

/* ─── Tooltip ─── */

interface TooltipProps {
  children: React.ReactNode;
  text: string;
}

function Tooltip({ children, text }: TooltipProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span ref={ref} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline-flex', cursor: 'help' }}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)', background: '#1f2937', color: '#f9fafb',
          fontSize: 12, lineHeight: 1.5, padding: '10px 14px', borderRadius: 10,
          width: 260, zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          pointerEvents: 'none', fontWeight: 400,
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0, borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent', borderTop: '6px solid #1f2937',
          }}/>
        </span>
      )}
    </span>
  );
}

/* ─── Stepper ─── */

const steps = [
  { num: 1, label: 'Población' },
  { num: 2, label: 'Parámetros' },
  { num: 3, label: 'Precisión' },
];

interface StepperProps {
  current: number;
}

function Stepper({ current }: StepperProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {steps.map((s, i) => {
        const done   = current > s.num;
        const active = current === s.num;
        return (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                background: done ? '#10b981' : active ? '#ecfdf5' : '#f3f4f6',
                color:      done ? 'white'   : active ? '#059669' : '#9ca3af',
                border: active ? '2px solid #10b981' : done ? '2px solid #10b981' : '2px solid #e5e7eb',
                transition: 'all 0.3s ease',
              }}>
                {done ? <CheckIcon /> : s.num}
              </div>
              <span style={{
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? '#059669' : done ? '#10b981' : '#9ca3af',
                transition: 'all 0.3s ease', whiteSpace: 'nowrap',
              }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginLeft: 12, marginRight: 12,
                background: done ? '#10b981' : '#e5e7eb', borderRadius: 2,
                transition: 'background 0.3s ease',
              }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Field ─── */

interface FieldProps {
  label: string;
  tooltip?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  optional?: boolean;
  disabled?: boolean;
}

function Field({ label, tooltip, value, onChange, placeholder, suffix, optional, disabled }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>
        {optional && <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>(opcional)</span>}
        {tooltip && (
          <Tooltip text={tooltip}>
            <span style={{ color: '#9ca3af', display: 'flex' }}><InfoIcon /></span>
          </Tooltip>
        )}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: focused ? '2px solid #10b981' : '2px solid #e5e7eb',
        borderRadius: 10, background: disabled ? '#f9fafb' : 'white',
        transition: 'all 0.2s ease',
        boxShadow: focused ? '0 0 0 3px rgba(16, 185, 129, 0.1)' : 'none',
        overflow: 'hidden',
      }}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          step="any"
          style={{
            flex: 1, border: 'none', outline: 'none',
            padding: '12px 14px', fontSize: 14,
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            background: 'transparent',
            color: disabled ? '#9ca3af' : '#111827',
          }}
        />
        {suffix && (
          <span style={{
            padding: '0 14px', fontSize: 13, color: '#6b7280',
            fontWeight: 600, borderLeft: '1px solid #f3f4f6',
            background: '#f9fafb', alignSelf: 'stretch',
            display: 'flex', alignItems: 'center',
          }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

interface MediaCalculatorProps {
  onBack?: () => void;
}

export function MediaCalculator({ onBack }: MediaCalculatorProps) {
  const [mode, setMode]                       = useState<'sampleSize' | 'precision'>('sampleSize');
  const [N, setN]                             = useState('');
  const [sd, setSd]                           = useState('');
  const [confidence, setConfidence]           = useState('95');
  const [precMin, setPrecMin]                 = useState('');
  const [precMax, setPrecMax]                 = useState('');
  const [precInc, setPrecInc]                 = useState('');
  const [sampleSizeInput, setSampleSizeInput] = useState('');
  const [designEffect, setDesignEffect]       = useState('1');
  const [result, setResult]                   = useState<CalcResult | null>(null);
  const [showResult, setShowResult]           = useState(false);
  const [currentStep, setCurrentStep]         = useState(1);
  const [showAdvanced, setShowAdvanced]       = useState(false);
  const [useRange, setUseRange]               = useState(false);

  useEffect(() => {
    if (mode === 'sampleSize') {
      if ((precMin || precMax) && sd && confidence) setCurrentStep(3);
      else if (sd || confidence !== '95')           setCurrentStep(2);
      else                                          setCurrentStep(1);
    } else {
      if (sampleSizeInput && sd && confidence) setCurrentStep(3);
      else if (sd || confidence !== '95')      setCurrentStep(2);
      else                                     setCurrentStep(1);
    }
  }, [N, sd, confidence, precMin, precMax, sampleSizeInput, mode]);

  const handleCalc = () => {
    const sdNum   = parseFloat(sd);
    const confNum = parseFloat(confidence);
    const deNum   = parseFloat(designEffect) || 1;
    const nNum    = N ? parseFloat(N) : null;
    if (!sdNum || !confNum) return;

    if (mode === 'sampleSize') {
      if (useRange) {
        const minVal = parseFloat(precMin);
        const maxVal = parseFloat(precMax);
        const incVal = parseFloat(precInc);
        if (!minVal || !maxVal || !incVal) return;
        const rangeResults = calcPrecisionRange({
          N: nNum, sd: sdNum, confidence: confNum,
          designEffect: deNum, min: minVal, max: maxVal, increment: incVal,
        });
        setResult({
          type: 'range', values: rangeResults,
          params: { N: nNum, sd: sdNum, confidence: confNum, designEffect: deNum, min: minVal, max: maxVal, increment: incVal },
        });
      } else {
        const precNum = parseFloat(precMin);
        if (!precNum) return;
        const n = calcSampleSize({ N: nNum, sd: sdNum, confidence: confNum, precision: precNum, designEffect: deNum });
        setResult({
          type: 'sampleSize', value: n,
          params: { N: nNum, sd: sdNum, confidence: confNum, precision: precNum, designEffect: deNum },
        });
      }
    } else {
      const nSamp = parseFloat(sampleSizeInput);
      if (!nSamp) return;
      const p = calcPrecision({ N: nNum, sd: sdNum, confidence: confNum, sampleSize: nSamp, designEffect: deNum });
      setResult({
        type: 'precision', value: p.toFixed(4),
        params: { N: nNum, sd: sdNum, confidence: confNum, sampleSize: nSamp, designEffect: deNum },
      });
    }
    setShowResult(true);
  };

  const handleReset = () => {
    setN(''); setSd(''); setConfidence('95'); setPrecMin(''); setPrecMax('');
    setPrecInc(''); setSampleSizeInput(''); setDesignEffect('1');
    setResult(null); setShowResult(false); setShowAdvanced(false); setUseRange(false);
  };

  const canCalc =
    mode === 'sampleSize'
      ? Boolean(sd && confidence && (useRange ? (precMin && precMax && precInc) : precMin))
      : Boolean(sd && sampleSizeInput && confidence);

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: '#fafbfc', minHeight: '100%', color: '#1a1a2e',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      <style>{`
        @keyframes cinematicUp {
          from { opacity: 0; transform: translateY(40px) scale(0.98); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes fadeRight {
          from { opacity: 0; transform: translateX(-30px); filter: blur(4px); }
          to { opacity: 1; transform: translateX(0); filter: blur(0); }
        }
        .anim-cinematic {
          animation: cinematicUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .anim-fadeRight {
          animation: fadeRight 1s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* ── Breadcrumb ── */}
        <div className="anim-fadeRight" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 24, fontSize: 13, color: '#6b7280', fontWeight: 500,
        }}>
          <button
            onClick={onBack}
            style={{
              cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: 0,
            }}
          >
            <BackIcon /> Muestreo
          </button>
          <span style={{ color: '#d1d5db' }}>/</span>
          <span style={{ color: '#9ca3af' }}>Cálculo de tamaños</span>
          <span style={{ color: '#d1d5db' }}>/</span>
          <span style={{ color: '#374151' }}>Media</span>
        </div>

        {/* ── Title ── */}
        <div className="anim-fadeRight" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 8, animationDelay: '100ms' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#059669', flexShrink: 0,
          }}>
            <TargetIcon />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#111827', letterSpacing: '-0.02em' }}>
              Tamaño de Muestra para Media
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0', lineHeight: 1.5 }}>
              Intervalo de confianza — Calcula cuántos sujetos necesitas para estimar el promedio de una variable continua.
            </p>
          </div>
        </div>

        {/* ── AI Helper ── */}
        <div className="anim-cinematic" style={{
          animationDelay: '200ms',
          background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
          border: '1px solid #a7f3d0', borderRadius: 12,
          padding: '12px 16px', margin: '20px 0 28px',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13, color: '#065f46', cursor: 'pointer',
        }}>
          <div style={{
            background: '#10b981', borderRadius: 8, width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', flexShrink: 0,
          }}>
            <SparkleIcon />
          </div>
          <span>
            <b>Asistente IA:</b> ¿No conoces la desviación estándar o la precisión? Puedo ayudarte a estimarlos a partir de estudios previos.
          </span>
        </div>

        {/* ── Mode selector ── */}
        <div className="anim-cinematic" style={{ marginBottom: 28, animationDelay: '300ms' }}>
          <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 12, padding: 4 }}>
            {([
              { id: 'sampleSize' as const, label: 'Calcular tamaño de muestra', icon: '📐' },
              { id: 'precision'  as const, label: 'Calcular precisión absoluta', icon: '🎯' },
            ]).map((m) => (
              <button key={m.id} onClick={() => { setMode(m.id); setShowResult(false); setResult(null); }}
                style={{
                  flex: 1, padding: '11px 16px', border: 'none', borderRadius: 10,
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.25s ease',
                  background: mode === m.id ? 'white' : 'transparent',
                  color:      mode === m.id ? '#111827' : '#6b7280',
                  boxShadow:  mode === m.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                <span>{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Stepper ── */}
        <div className="anim-cinematic" style={{ animationDelay: '400ms' }}>
          <Stepper current={currentStep} />
        </div>

        {/* ── Form card ── */}
        <div className="anim-cinematic" style={{
          animationDelay: '500ms',
          background: 'white', borderRadius: 16,
          border: '1.5px solid #e5e7eb', padding: '28px 28px 8px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        }}>

          {/* Step 1 – Población */}
          <div style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#10b981', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 20, height: 2, background: '#10b981', borderRadius: 2, display: 'inline-block' }}/>
              Paso 1 · Población de estudio
            </div>
            <Field
              label="Tamaño de la población (N)"
              tooltip="Número total de individuos en la población de estudio. Si la población es muy grande o desconocida, puedes dejarlo vacío y se asumirá población infinita."
              value={N} onChange={setN}
              placeholder="Ej: 5000 (dejar vacío si es infinita)"
              optional
            />
          </div>

          <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0 20px' }}/>

          {/* Step 2 – Parámetros */}
          <div style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#10b981', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 20, height: 2, background: '#10b981', borderRadius: 2, display: 'inline-block' }}/>
              Paso 2 · Parámetros estadísticos
            </div>
            <Field
              label="Desviación estándar esperada (σ)"
              tooltip="La variabilidad esperada de tu variable. Puedes obtenerla de estudios previos, una prueba piloto, o la literatura. A mayor desviación, mayor tamaño de muestra necesitarás."
              value={sd} onChange={setSd}
              placeholder="Ej: 12.5"
            />
            <Field
              label="Nivel de confianza"
              tooltip="El porcentaje de certeza que deseas. 95% es el estándar en ciencias de la salud. Usa 99% para estudios que requieren mayor precisión."
              value={confidence} onChange={setConfidence}
              placeholder="95"
              suffix="%"
            />
            <div style={{ display: 'flex', gap: 6, marginTop: -12, marginBottom: 20 }}>
              {['90', '95', '99'].map((v) => (
                <button key={v} onClick={() => setConfidence(v)}
                  style={{
                    padding: '4px 14px', borderRadius: 8, border: 'none',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                    background: confidence === v ? '#ecfdf5' : '#f9fafb',
                    color:      confidence === v ? '#059669' : '#9ca3af',
                    transition: 'all 0.15s ease',
                  }}>
                  {v}%
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0 20px' }}/>

          {/* Step 3 – Precisión / Muestra */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#10b981', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 20, height: 2, background: '#10b981', borderRadius: 2, display: 'inline-block' }}/>
              Paso 3 · {mode === 'sampleSize' ? 'Precisión deseada' : 'Muestra disponible'}
            </div>

            {mode === 'sampleSize' ? (
              <>
                {/* Toggle single vs range */}
                <div style={{
                  display: 'flex', gap: 4, background: '#f9fafb',
                  borderRadius: 10, padding: 3, marginBottom: 20,
                  border: '1px solid #f3f4f6',
                }}>
                  <button onClick={() => setUseRange(false)}
                    style={{
                      flex: 1, padding: '8px 12px', border: 'none', borderRadius: 8,
                      cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: !useRange ? 'white' : 'transparent',
                      color:      !useRange ? '#111827' : '#9ca3af',
                      boxShadow:  !useRange ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s ease',
                    }}>
                    Valor único
                  </button>
                  <button onClick={() => setUseRange(true)}
                    style={{
                      flex: 1, padding: '8px 12px', border: 'none', borderRadius: 8,
                      cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: useRange ? 'white' : 'transparent',
                      color:      useRange ? '#111827' : '#9ca3af',
                      boxShadow:  useRange ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s ease',
                    }}>
                    <TableIcon /> Rango (tabla comparativa)
                  </button>
                </div>

                {!useRange ? (
                  <Field
                    label="Precisión absoluta (E)"
                    tooltip="El margen de error máximo que aceptas. Por ejemplo, si estimas una media de presión arterial y quieres que tu estimación esté dentro de ±3 mmHg del valor real, E = 3."
                    value={precMin} onChange={setPrecMin}
                    placeholder="Ej: 3"
                  />
                ) : (
                  <div style={{
                    background: '#f9fafb', borderRadius: 12, padding: '20px 20px 4px',
                    border: '1px solid #f3f4f6', marginBottom: 20,
                  }}>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>
                      Define un rango de precisiones para obtener una tabla comparativa de tamaños de muestra. Útil para evaluar diferentes escenarios en tu protocolo.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <Field label="Mínimo"     value={precMin} onChange={setPrecMin} placeholder="Ej: 1"  tooltip="El valor más bajo de precisión a evaluar." />
                      <Field label="Máximo"     value={precMax} onChange={setPrecMax} placeholder="Ej: 10" tooltip="El valor más alto de precisión a evaluar." />
                      <Field label="Incremento" value={precInc} onChange={setPrecInc} placeholder="Ej: 1"  tooltip="El paso entre cada valor de precisión." />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Field
                label="Tamaño de la muestra (n)"
                tooltip="El número de sujetos que ya tienes o planeas reclutar. La herramienta calculará qué precisión puedes lograr con ese tamaño."
                value={sampleSizeInput} onChange={setSampleSizeInput}
                placeholder="Ej: 150"
              />
            )}
          </div>

          {/* Advanced toggle */}
          <div style={{ marginBottom: showAdvanced ? 4 : 20 }}>
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: '#6b7280',
                fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <ChevronIcon open={showAdvanced} />
              Opciones avanzadas
            </button>
          </div>

          {showAdvanced && (
            <div style={{
              background: '#f9fafb', borderRadius: 12, padding: '20px 20px 4px',
              marginBottom: 20, border: '1px solid #f3f4f6',
            }}>
              <Field
                label="Efecto de diseño (DEFF)"
                tooltip="Factor de corrección para diseños de muestreo complejos (estratificado, conglomerados). Valor de 1 = muestreo aleatorio simple. Valores > 1 aumentan el tamaño de muestra necesario."
                value={designEffect} onChange={setDesignEffect}
                placeholder="1.0"
              />
            </div>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="anim-cinematic" style={{ display: 'flex', gap: 10, marginTop: 20, animationDelay: '600ms' }}>
          <button onClick={handleCalc} disabled={!canCalc}
            style={{
              flex: 1, padding: '14px 24px', borderRadius: 12,
              border: 'none', cursor: canCalc ? 'pointer' : 'not-allowed',
              fontSize: 15, fontWeight: 700,
              fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
              background: canCalc ? 'linear-gradient(135deg, #10b981, #059669)' : '#e5e7eb',
              color:      canCalc ? 'white' : '#9ca3af',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.25s ease',
              boxShadow: canCalc ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none',
              transform: 'scale(1)',
            }}
            onMouseDown={(e) => { if (canCalc) e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <CalcIcon /> Calcular
          </button>
          <button onClick={handleReset}
            style={{
              padding: '14px 20px', borderRadius: 12,
              border: '2px solid #e5e7eb', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
              background: 'white', color: '#6b7280',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s ease',
            }}>
            <ResetIcon /> Limpiar
          </button>
        </div>

        {/* ── Results ── */}
        {showResult && result && (
          <div style={{ marginTop: 24, animation: 'cinematicUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            <style>{`
              @keyframes countUp  { from { opacity:0; transform:scale(0.5); filter: blur(5px); } to { opacity:1; transform:scale(1); filter: blur(0); } }
            `}</style>

            {/* Single result */}
            {(result.type === 'sampleSize' || result.type === 'precision') && (
              <div style={{
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '2px solid #6ee7b7', borderRadius: 16, overflow: 'hidden',
              }}>
                <div style={{ padding: '24px 28px 20px' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: '#059669', marginBottom: 12,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <CheckIcon /> Resultado
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{
                      fontSize: 48, fontWeight: 800, color: '#065f46',
                      fontFamily: "'DM Mono', monospace", letterSpacing: '-0.03em',
                      animation: 'countUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}>
                      {result.type === 'sampleSize' ? result.value : `±${result.value}`}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#059669' }}>
                      {result.type === 'sampleSize' ? 'sujetos necesarios' : 'unidades (precisión absoluta)'}
                    </span>
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.6)', padding: '16px 28px',
                  display: 'flex', flexWrap: 'wrap', gap: '8px 20px',
                }}>
                  {result.params.N && <span style={{ fontSize: 12, color: '#065f46' }}><b>N:</b> {result.params.N.toLocaleString()}</span>}
                  <span style={{ fontSize: 12, color: '#065f46' }}><b>σ:</b> {result.params.sd}</span>
                  <span style={{ fontSize: 12, color: '#065f46' }}><b>Confianza:</b> {result.params.confidence}%</span>
                  {result.type === 'sampleSize' && <span style={{ fontSize: 12, color: '#065f46' }}><b>E:</b> {result.params.precision}</span>}
                  {result.type === 'precision'  && <span style={{ fontSize: 12, color: '#065f46' }}><b>n:</b> {result.params.sampleSize}</span>}
                  {result.params.designEffect !== 1 && <span style={{ fontSize: 12, color: '#065f46' }}><b>DEFF:</b> {result.params.designEffect}</span>}
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.4)', padding: '16px 28px',
                  borderTop: '1px solid rgba(16,185,129,0.15)',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 8, background: '#10b981',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', flexShrink: 0, marginTop: 1,
                  }}>
                    <SparkleIcon />
                  </div>
                  <div style={{ fontSize: 13, color: '#065f46', lineHeight: 1.6 }}>
                    {result.type === 'sampleSize' ? (
                      <>
                        <b>Interpretación IA:</b> Necesitas al menos <b>{result.value} sujetos</b> para estimar la media poblacional
                        con un nivel de confianza del {result.params.confidence}% y un margen de error de ±{result.params.precision} unidades.
                        {result.params.N && <> Se aplicó corrección por población finita (N={result.params.N.toLocaleString()}).</>}
                        {result.params.designEffect > 1 && <> El efecto de diseño de {result.params.designEffect} incrementó el tamaño necesario.</>}
                        {' '}Considera añadir un 10-20% adicional para compensar posibles pérdidas de seguimiento o datos faltantes.
                      </>
                    ) : (
                      <>
                        <b>Interpretación IA:</b> Con una muestra de <b>{result.params.sampleSize} sujetos</b>, puedes
                        estimar la media con una precisión de <b>±{result.value}</b> unidades al {result.params.confidence}% de confianza.
                        {' '}Evalúa si esta precisión es clínicamente aceptable para tu variable de estudio.
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Range table result */}
            {result.type === 'range' && (
              <div style={{
                background: 'white', border: '2px solid #6ee7b7',
                borderRadius: 16, overflow: 'hidden',
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                  padding: '20px 28px',
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: '#059669', marginBottom: 8,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <CheckIcon /> Tabla comparativa de tamaños de muestra
                  </div>
                  <p style={{ fontSize: 13, color: '#065f46', margin: 0 }}>
                    σ = <b>{result.params.sd}</b> · Confianza: <b>{result.params.confidence}%</b>
                    {result.params.N && <> · N: <b>{result.params.N.toLocaleString()}</b></>}
                    {result.params.designEffect !== 1 && <> · DEFF: <b>{result.params.designEffect}</b></>}
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{
                          padding: '12px 28px', textAlign: 'left', fontWeight: 700,
                          fontSize: 12, color: '#6b7280', textTransform: 'uppercase',
                          letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb',
                        }}>Precisión (E)</th>
                        <th style={{
                          padding: '12px 28px', textAlign: 'right', fontWeight: 700,
                          fontSize: 12, color: '#6b7280', textTransform: 'uppercase',
                          letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb',
                        }}>Tamaño de muestra (n)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.values.map((row, i) => (
                        <tr key={i}
                          style={{ background: i % 2 === 0 ? 'white' : '#fafbfc', transition: 'background 0.15s ease' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#ecfdf5'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafbfc'; }}
                        >
                          <td style={{
                            padding: '12px 28px', borderBottom: '1px solid #f3f4f6',
                            color: '#374151', fontWeight: 500,
                          }}>
                            ±{row.precision}
                          </td>
                          <td style={{
                            padding: '12px 28px', borderBottom: '1px solid #f3f4f6',
                            textAlign: 'right', fontWeight: 700, color: '#059669',
                            fontFamily: "'DM Mono', monospace",
                          }}>
                            {row.n.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{
                  background: 'rgba(236,253,245,0.5)', padding: '16px 28px',
                  borderTop: '1px solid rgba(16,185,129,0.15)',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 8, background: '#10b981',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', flexShrink: 0, marginTop: 1,
                  }}>
                    <SparkleIcon />
                  </div>
                  <div style={{ fontSize: 13, color: '#065f46', lineHeight: 1.6 }}>
                    <b>Interpretación IA:</b> La tabla muestra cómo varía el tamaño de muestra según la precisión deseada con σ={result.params.sd}.
                    {result.values.length > 1 && <>
                      {' '}Con la precisión más estricta (±{result.values[0].precision}) necesitarías <b>{result.values[0].n.toLocaleString()} sujetos</b>,
                      mientras que con la más flexible (±{result.values[result.values.length - 1].precision}) solo <b>{result.values[result.values.length - 1].n.toLocaleString()}</b>.
                    </>}
                    {' '}Elige la precisión que sea clínicamente relevante para tu variable y factible para tu capacidad de reclutamiento.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Formula reference ── */}
        <div style={{
          marginTop: 24, background: 'white',
          borderRadius: 14, border: '1.5px solid #e5e7eb',
          padding: '20px 24px',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: '#9ca3af',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12,
          }}>
            Referencia de fórmula
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 14,
            color: '#374151', background: '#f9fafb',
            padding: '14px 18px', borderRadius: 10, lineHeight: 1.8,
          }}>
            {mode === 'sampleSize' ? (
              <>
                n = (Z²<sub>α/2</sub> · σ²) / E²
                {N && <span style={{ color: '#10b981' }}> × [N / (N + n - 1)]</span>}
                {designEffect !== '1' && <span style={{ color: '#6366f1' }}> × DEFF</span>}
              </>
            ) : (
              <>
                E = Z<sub>α/2</sub> · σ / √n
                {N && <span style={{ color: '#10b981' }}> × √[(N-n)/(N-1)]</span>}
                {designEffect !== '1' && <span style={{ color: '#6366f1' }}> / √DEFF</span>}
              </>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '10px 0 0', lineHeight: 1.5 }}>
            Donde Z<sub>α/2</sub> es el valor crítico de la distribución normal estándar, σ es la desviación estándar esperada, y E es la precisión absoluta deseada.
          </p>
        </div>

      </div>
    </div>
  );
}
