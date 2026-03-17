import { useState, useEffect, useRef } from 'react';

/* ─── Normal Inverse (Abramowitz & Stegun 26.2.23) ─── */

function normalInv(p: number): number {
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
}

/* ─── RR Derivation helpers ─── */

function deriveRR(pe: number, pne: number): number {
  return pe / pne;
}

function derivePe(pne: number, rr: number): number {
  return pne * rr;
}

function derivePne(pe: number, rr: number): number {
  return pe / rr;
}

/* ─── Interfaces ─── */

interface CalcSampleSizeRRParams {
  pe: number;
  pne: number;
  confidence: number;
  relativePrecision: number;
  ratioUnexpExp: number;
}

interface CalcPrecisionRRParams {
  pe: number;
  pne: number;
  confidence: number;
  sampleSizeExposed: number;
  ratioUnexpExp: number;
}

interface CalcRangeRRParams {
  pe: number;
  pne: number;
  confidence: number;
  ratioUnexpExp: number;
  min: number;
  max: number;
  increment: number;
}

interface RangeRowRR {
  precision: number;
  exposed: number;
  unexposed: number;
  total: number;
}

interface DerivedValue {
  type: 'rr' | 'pe' | 'pne';
  value: string;
}

interface SampleSizeRRResult {
  type: 'sampleSize';
  exposed: number;
  unexposed: number;
  total: number;
  params: { pe: string; pne: string; rr: string; confidence: number; ratioUnexpExp: number; precision: number };
}

interface PrecisionRRResult {
  type: 'precision';
  value: string;
  params: { pe: string; pne: string; rr: string; confidence: number; ratioUnexpExp: number; sampleSizeExposed: number };
}

interface RangeRRResult {
  type: 'range';
  values: RangeRowRR[];
  params: { pe: string; pne: string; rr: string; confidence: number; ratioUnexpExp: number };
}

type CalcResult = SampleSizeRRResult | PrecisionRRResult | RangeRRResult;

/* ─── Calc functions ─── */

function calcSampleSizeRR({ pe, pne, confidence, relativePrecision, ratioUnexpExp }: CalcSampleSizeRRParams): { exposed: number; unexposed: number; total: number } {
  const alpha = 1 - confidence / 100;
  const z = Math.abs(normalInv(alpha / 2));
  const rp = relativePrecision / 100;
  const k = ratioUnexpExp;
  const logPrecision = -Math.log(1 - rp);
  const varCoeff = (1 - pe) / pe + (1 - pne) / (pne * k);
  const nExposed = Math.ceil((z * z * varCoeff) / (logPrecision * logPrecision));
  const nUnexposed = Math.ceil(nExposed * k);
  return { exposed: nExposed, unexposed: nUnexposed, total: nExposed + nUnexposed };
}

function calcPrecisionRR({ pe, pne, confidence, sampleSizeExposed, ratioUnexpExp }: CalcPrecisionRRParams): number {
  const alpha = 1 - confidence / 100;
  const z = Math.abs(normalInv(alpha / 2));
  const k = ratioUnexpExp;
  const n1 = sampleSizeExposed;
  const variance = (1 - pe) / (n1 * pe) + (1 - pne) / (n1 * k * pne);
  const se = Math.sqrt(variance);
  return (1 - Math.exp(-z * se)) * 100;
}

function calcRangeRR({ pe, pne, confidence, ratioUnexpExp, min, max, increment }: CalcRangeRRParams): RangeRowRR[] {
  const results: RangeRowRR[] = [];
  for (let rp = min; rp <= max + 0.0001; rp += increment) {
    const res = calcSampleSizeRR({ pe, pne, confidence, relativePrecision: rp, ratioUnexpExp });
    results.push({ precision: parseFloat(rp.toFixed(2)), ...res });
  }
  return results;
}

/* ─── RiskVisual ─── */

interface RiskVisualProps {
  pe: number;
  pne: number;
}

function RiskVisual({ pe, pne }: RiskVisualProps) {
  const rr = pe / pne;
  const maxVal = Math.max(pe, pne, 0.01);
  const barPe  = (pe  / maxVal) * 100;
  const barPne = (pne / maxVal) * 100;
  return (
    <div style={{
      background: '#f9fafb', borderRadius: 12, padding: '16px 20px',
      border: '1px solid #f3f4f6', marginBottom: 20,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Visualización de riesgo
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>Expuestos (pₑ)</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', fontFamily: "'DM Mono', monospace" }}>{(pe * 100).toFixed(1)}%</span>
          </div>
          <div style={{ height: 10, background: '#fee2e2', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 6,
              background: 'linear-gradient(90deg, #ef4444, #dc2626)',
              width: `${barPe}%`, transition: 'width 0.5s ease',
            }}/>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>No expuestos (pₙₑ)</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', fontFamily: "'DM Mono', monospace" }}>{(pne * 100).toFixed(1)}%</span>
          </div>
          <div style={{ height: 10, background: '#dcfce7', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 6,
              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
              width: `${barPne}%`, transition: 'width 0.5s ease',
            }}/>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, padding: '8px 12px', background: '#ecfdf5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>Riesgo Relativo (RR)</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#059669', fontFamily: "'DM Mono', monospace" }}>{rr.toFixed(3)}</span>
      </div>
    </div>
  );
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
    <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/>
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

const RRIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
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
          width: 280, zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
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

const stepsConfig = [
  { num: 1, label: 'Datos' },
  { num: 2, label: 'Diseño' },
  { num: 3, label: 'Precisión' },
];

interface StepperProps { current: number; }

function Stepper({ current }: StepperProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {stepsConfig.map((s, i) => {
        const done   = current > s.num;
        const active = current === s.num;
        return (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < stepsConfig.length - 1 ? 1 : 'none' }}>
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
            {i < stepsConfig.length - 1 && (
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
  hint?: string | null;
  computed?: boolean;
}

function Field({ label, tooltip, value, onChange, placeholder, suffix, optional, disabled, hint, computed }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: computed ? '#10b981' : '#374151' }}>{label}</label>
        {optional && <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>(opcional)</span>}
        {computed && <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: 6 }}>CALCULADO</span>}
        {tooltip && (
          <Tooltip text={tooltip}>
            <span style={{ color: '#9ca3af', display: 'flex' }}><InfoIcon /></span>
          </Tooltip>
        )}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: computed ? '2px solid #a7f3d0' : (focused ? '2px solid #10b981' : '2px solid #e5e7eb'),
        borderRadius: 10, background: disabled ? '#f9fafb' : computed ? '#f0fdf4' : 'white',
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
          disabled={disabled || computed}
          step="any"
          style={{
            flex: 1, border: 'none', outline: 'none',
            padding: '12px 14px', fontSize: 14,
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            background: 'transparent',
            color: computed ? '#059669' : (disabled ? '#9ca3af' : '#111827'),
            fontWeight: computed ? 700 : 400,
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
      {hint && <p style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0', lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

/* ─── CheckOption ─── */

interface CheckOptionProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
}

function CheckOption({ checked, onChange, label, description }: CheckOptionProps) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
      border: checked ? '2px solid #10b981' : '2px solid #e5e7eb',
      background: checked ? '#f0fdf4' : 'white',
      transition: 'all 0.2s ease',
      marginBottom: 8,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
        border: checked ? '2px solid #10b981' : '2px solid #d1d5db',
        background: checked ? '#10b981' : 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}>
        {checked && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: checked ? '#065f46' : '#374151' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>{description}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
    </label>
  );
}

/* ─── Main Component ─── */

interface RelativeRiskCalculatorProps {
  onBack?: () => void;
}

export function RelativeRiskCalculator({ onBack }: RelativeRiskCalculatorProps) {
  // Which 2 of 3 are selected
  const [useRiskExp, setUseRiskExp]     = useState(true);
  const [useRiskUnexp, setUseRiskUnexp] = useState(true);
  const [useRR, setUseRR]               = useState(false);
  // Values
  const [riskExposed, setRiskExposed]     = useState('');
  const [riskUnexposed, setRiskUnexposed] = useState('');
  const [relativeRisk, setRelativeRisk]   = useState('');
  const [ratioUnexpExp, setRatioUnexpExp] = useState('1');
  const [confidence, setConfidence]       = useState('95');
  // Mode & precision
  const [mode, setMode]                       = useState<'sampleSize' | 'precision'>('sampleSize');
  const [precMin, setPrecMin]                 = useState('');
  const [precMax, setPrecMax]                 = useState('');
  const [precInc, setPrecInc]                 = useState('');
  const [sampleSizeInput, setSampleSizeInput] = useState('');
  const [useRange, setUseRange]               = useState(false);
  // UI state
  const [result, setResult]           = useState<CalcResult | null>(null);
  const [showResult, setShowResult]   = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [derivedValue, setDerivedValue] = useState<DerivedValue | null>(null);

  const selectedCount = [useRiskExp, useRiskUnexp, useRR].filter(Boolean).length;

  /* ── Toggle checkboxes — enforce exactly 2 ── */
  const handleToggle = (field: 'exp' | 'unexp' | 'rr') => {
    if (field === 'exp') {
      if (useRiskExp) {
        setUseRiskExp(false); setRiskExposed('');
      } else {
        setUseRiskExp(true);
        if (selectedCount >= 2) {
          if (useRiskUnexp && useRR) { setUseRR(false); setRelativeRisk(''); }
          else if (useRiskUnexp)     { setUseRiskUnexp(false); setRiskUnexposed(''); }
          else                       { setUseRR(false); setRelativeRisk(''); }
        }
      }
    } else if (field === 'unexp') {
      if (useRiskUnexp) {
        setUseRiskUnexp(false); setRiskUnexposed('');
      } else {
        setUseRiskUnexp(true);
        if (selectedCount >= 2) {
          if (useRiskExp && useRR) { setUseRR(false); setRelativeRisk(''); }
          else if (useRiskExp)     { setUseRiskExp(false); setRiskExposed(''); }
          else                     { setUseRR(false); setRelativeRisk(''); }
        }
      }
    } else {
      if (useRR) {
        setUseRR(false); setRelativeRisk('');
      } else {
        setUseRR(true);
        if (selectedCount >= 2) {
          if (useRiskExp && useRiskUnexp) { setUseRiskUnexp(false); setRiskUnexposed(''); }
          else if (useRiskExp)            { setUseRiskExp(false); setRiskExposed(''); }
          else                            { setUseRiskUnexp(false); setRiskUnexposed(''); }
        }
      }
    }
    setDerivedValue(null); setShowResult(false); setResult(null);
  };

  /* ── Auto-derive the third value ── */
  useEffect(() => {
    const pe  = parseFloat(riskExposed)   / 100;
    const pne = parseFloat(riskUnexposed) / 100;
    const rr  = parseFloat(relativeRisk);

    if (useRiskExp && useRiskUnexp && pe > 0 && pe < 1 && pne > 0 && pne < 1) {
      setDerivedValue({ type: 'rr', value: deriveRR(pe, pne).toFixed(3) });
    } else if (useRiskExp && useRR && pe > 0 && pe < 1 && rr > 0) {
      const derived = derivePne(pe, rr);
      if (derived > 0 && derived < 1) setDerivedValue({ type: 'pne', value: (derived * 100).toFixed(2) });
      else setDerivedValue(null);
    } else if (useRiskUnexp && useRR && pne > 0 && pne < 1 && rr > 0) {
      const derived = derivePe(pne, rr);
      if (derived > 0 && derived < 1) setDerivedValue({ type: 'pe', value: (derived * 100).toFixed(2) });
      else setDerivedValue(null);
    } else {
      setDerivedValue(null);
    }
  }, [riskExposed, riskUnexposed, relativeRisk, useRiskExp, useRiskUnexp, useRR]);

  /* ── Step tracker ── */
  useEffect(() => {
    const hasData = derivedValue !== null;
    if (mode === 'sampleSize') {
      if ((precMin || precMax) && hasData && confidence) setCurrentStep(3);
      else if (hasData && ratioUnexpExp)                 setCurrentStep(2);
      else                                               setCurrentStep(1);
    } else {
      if (sampleSizeInput && hasData && confidence) setCurrentStep(3);
      else if (hasData && ratioUnexpExp)            setCurrentStep(2);
      else                                          setCurrentStep(1);
    }
  }, [derivedValue, ratioUnexpExp, confidence, precMin, precMax, sampleSizeInput, mode]);

  /* ── Resolve final pe, pne, rr ── */
  const getFinalParams = () => {
    let pe: number, pne: number, rr: number;
    if (useRiskExp && useRiskUnexp) {
      pe  = parseFloat(riskExposed)   / 100;
      pne = parseFloat(riskUnexposed) / 100;
      rr  = deriveRR(pe, pne);
    } else if (useRiskExp && useRR) {
      pe  = parseFloat(riskExposed) / 100;
      rr  = parseFloat(relativeRisk);
      pne = derivePne(pe, rr);
    } else {
      pne = parseFloat(riskUnexposed) / 100;
      rr  = parseFloat(relativeRisk);
      pe  = derivePe(pne, rr);
    }
    return { pe, pne, rr };
  };

  const handleCalc = () => {
    if (!derivedValue) return;
    const { pe, pne, rr } = getFinalParams();
    const confNum = parseFloat(confidence);
    const k = parseFloat(ratioUnexpExp) || 1;

    if (mode === 'sampleSize') {
      if (useRange) {
        const minVal = parseFloat(precMin);
        const maxVal = parseFloat(precMax);
        const incVal = parseFloat(precInc);
        if (!minVal || !maxVal || !incVal) return;
        const rangeResults = calcRangeRR({ pe, pne, confidence: confNum, ratioUnexpExp: k, min: minVal, max: maxVal, increment: incVal });
        setResult({
          type: 'range', values: rangeResults,
          params: { pe: (pe*100).toFixed(2), pne: (pne*100).toFixed(2), rr: rr.toFixed(3), confidence: confNum, ratioUnexpExp: k },
        });
      } else {
        const rpNum = parseFloat(precMin);
        if (!rpNum) return;
        const res = calcSampleSizeRR({ pe, pne, confidence: confNum, relativePrecision: rpNum, ratioUnexpExp: k });
        setResult({
          type: 'sampleSize', ...res,
          params: { pe: (pe*100).toFixed(2), pne: (pne*100).toFixed(2), rr: rr.toFixed(3), confidence: confNum, ratioUnexpExp: k, precision: rpNum },
        });
      }
    } else {
      const n1 = parseFloat(sampleSizeInput);
      if (!n1) return;
      const rp = calcPrecisionRR({ pe, pne, confidence: confNum, sampleSizeExposed: n1, ratioUnexpExp: k });
      setResult({
        type: 'precision', value: rp.toFixed(2),
        params: { pe: (pe*100).toFixed(2), pne: (pne*100).toFixed(2), rr: rr.toFixed(3), confidence: confNum, ratioUnexpExp: k, sampleSizeExposed: n1 },
      });
    }
    setShowResult(true);
  };

  const handleReset = () => {
    setRiskExposed(''); setRiskUnexposed(''); setRelativeRisk('');
    setRatioUnexpExp('1'); setConfidence('95');
    setPrecMin(''); setPrecMax(''); setPrecInc('');
    setSampleSizeInput(''); setResult(null); setShowResult(false);
    setUseRange(false); setDerivedValue(null);
    setUseRiskExp(true); setUseRiskUnexp(true); setUseRR(false);
  };

  const canCalc = !!(derivedValue && ratioUnexpExp && confidence && (
    mode === 'sampleSize'
      ? (useRange ? (precMin && precMax && precInc) : precMin)
      : sampleSizeInput
  ));

  /* ── Get pe/pne for RiskVisual ── */
  const getVisualParams = (): { pe: number; pne: number } | null => {
    if (!derivedValue) return null;
    const { pe, pne } = getFinalParams();
    if (isNaN(pe) || isNaN(pne) || pe <= 0 || pne <= 0) return null;
    return { pe, pne };
  };

  const visualParams = getVisualParams();

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
          <button onClick={onBack} style={{
            cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: 0,
          }}>
            <BackIcon /> Muestreo
          </button>
          <span style={{ color: '#d1d5db' }}>/</span>
          <span style={{ color: '#9ca3af' }}>Cálculo de tamaños</span>
          <span style={{ color: '#d1d5db' }}>/</span>
          <span style={{ color: '#374151' }}>Riesgo Relativo</span>
        </div>

        {/* ── Title ── */}
        <div className="anim-fadeRight" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 8, animationDelay: '100ms' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#059669', flexShrink: 0,
          }}>
            <RRIcon />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#111827', letterSpacing: '-0.02em' }}>
              Tamaño de Muestra para Riesgo Relativo
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0', lineHeight: 1.5 }}>
              Intervalo de confianza — Calcula cuántos expuestos y no expuestos necesitas para estimar el RR con la precisión deseada (método de Katz).
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
            <b>Asistente IA:</b> ¿No conoces los riesgos en cada grupo? Puedo buscar incidencias y RR reportados en la literatura para tu factor de exposición.
          </span>
        </div>

        {/* ── Mode selector ── */}
        <div className="anim-cinematic" style={{ marginBottom: 28, animationDelay: '300ms' }}>
          <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 12, padding: 4 }}>
            {([
              { id: 'sampleSize' as const, label: 'Calcular tamaño de muestra', icon: '📐' },
              { id: 'precision'  as const, label: 'Calcular precisión relativa',  icon: '🎯' },
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

          {/* Step 1 – Datos del estudio */}
          <div style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#10b981', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 20, height: 2, background: '#10b981', borderRadius: 2, display: 'inline-block' }}/>
              Paso 1 · Datos del estudio (selecciona 2 de 3)
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>
              Selecciona las dos variables que conoces. La tercera se calculará automáticamente.
            </p>

            <CheckOption
              checked={useRiskExp}
              onChange={() => handleToggle('exp')}
              label="Riesgo en expuestos (pₑ)"
              description="Proporción de individuos expuestos que desarrollan el evento de interés."
            />
            <CheckOption
              checked={useRiskUnexp}
              onChange={() => handleToggle('unexp')}
              label="Riesgo en no expuestos (pₙₑ)"
              description="Proporción de individuos no expuestos que desarrollan el evento de interés."
            />
            <CheckOption
              checked={useRR}
              onChange={() => handleToggle('rr')}
              label="Riesgo Relativo esperado (RR)"
              description="Razón entre el riesgo en expuestos y el riesgo en no expuestos. RR = 1 indica no asociación."
            />

            {selectedCount < 2 && (
              <div style={{
                background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10,
                padding: '10px 14px', fontSize: 12, color: '#92400e', marginTop: 8,
              }}>
                Selecciona exactamente 2 opciones para continuar.
              </div>
            )}

            {selectedCount === 2 && (
              <div style={{ marginTop: 16 }}>
                {useRiskExp && (
                  <Field
                    label="Riesgo en expuestos (pₑ)"
                    tooltip="Probabilidad de que un individuo expuesto desarrolle el evento. Obtenlo de estudios previos de cohorte o estimaciones clínicas."
                    value={riskExposed} onChange={setRiskExposed}
                    placeholder="Ej: 30" suffix="%"
                  />
                )}
                {useRiskUnexp && (
                  <Field
                    label="Riesgo en no expuestos (pₙₑ)"
                    tooltip="Probabilidad de que un individuo no expuesto desarrolle el evento. Generalmente es la incidencia basal en la población."
                    value={riskUnexposed} onChange={setRiskUnexposed}
                    placeholder="Ej: 10" suffix="%"
                  />
                )}
                {useRR && (
                  <Field
                    label="Riesgo Relativo esperado (RR)"
                    tooltip="El cociente pₑ/pₙₑ. RR > 1 indica factor de riesgo, RR < 1 indica factor protector, RR = 1 indica sin efecto."
                    value={relativeRisk} onChange={setRelativeRisk}
                    placeholder="Ej: 3.0"
                  />
                )}

                {/* Risk Visual */}
                {visualParams && (
                  <RiskVisual pe={visualParams.pe} pne={visualParams.pne} />
                )}

                {/* Derived value callout */}
                {derivedValue && (
                  <div style={{
                    background: '#f0fdf4', border: '1.5px solid #a7f3d0',
                    borderRadius: 12, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    marginBottom: 20,
                  }}>
                    <div style={{ color: '#10b981', display: 'flex' }}><LinkIcon /></div>
                    <div style={{ fontSize: 13, color: '#065f46' }}>
                      {derivedValue.type === 'rr' && (
                        <><b>RR calculado:</b> {derivedValue.value} — derivado automáticamente de pₑ y pₙₑ.</>
                      )}
                      {derivedValue.type === 'pe' && (
                        <><b>pₑ calculada:</b> {derivedValue.value}% — riesgo en expuestos derivado de pₙₑ y RR.</>
                      )}
                      {derivedValue.type === 'pne' && (
                        <><b>pₙₑ calculada:</b> {derivedValue.value}% — riesgo en no expuestos derivado de pₑ y RR.</>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0 20px' }}/>

          {/* Step 2 – Diseño */}
          <div style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#10b981', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 20, height: 2, background: '#10b981', borderRadius: 2, display: 'inline-block' }}/>
              Paso 2 · Diseño del estudio
            </div>
            <Field
              label="Razón no expuestos / expuestos"
              tooltip="El número de no expuestos por cada expuesto. Valor 1 = misma cantidad en ambos grupos. Aumentar este ratio puede compensar la escasez de expuestos."
              value={ratioUnexpExp} onChange={setRatioUnexpExp}
              placeholder="1"
            />
            <div style={{ display: 'flex', gap: 6, marginTop: -12, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, alignSelf: 'center', marginRight: 4 }}>Frecuentes:</span>
              {['1', '2', '3', '4'].map((v) => (
                <button key={v} onClick={() => setRatioUnexpExp(v)}
                  style={{
                    padding: '4px 14px', borderRadius: 8, border: 'none',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                    background: ratioUnexpExp === v ? '#ecfdf5' : '#f9fafb',
                    color:      ratioUnexpExp === v ? '#059669' : '#9ca3af',
                    transition: 'all 0.15s ease',
                  }}>
                  {v}:{v === '1' ? '1' : '1'}
                </button>
              ))}
            </div>
            <Field
              label="Nivel de confianza"
              tooltip="95% es el estándar en estudios epidemiológicos. Usa 99% para estimaciones más conservadoras."
              value={confidence} onChange={setConfidence}
              placeholder="95" suffix="%"
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
              Paso 3 · {mode === 'sampleSize' ? 'Precisión relativa deseada' : 'Muestra disponible'}
            </div>

            {mode === 'sampleSize' ? (
              <>
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
                    label="Precisión relativa (ε)"
                    tooltip="El margen de error relativo aceptable, expresado como porcentaje. Por ejemplo, si el RR esperado es 3.0 y usas ε = 50%, el intervalo superior sería 3.0 × 1.5 = 4.5. Valores típicos: 20-80%."
                    value={precMin} onChange={setPrecMin}
                    placeholder="Ej: 50" suffix="%"
                    hint="Valores más pequeños requieren muestras mucho más grandes. Rango típico: 20% a 80%."
                  />
                ) : (
                  <div style={{
                    background: '#f9fafb', borderRadius: 12, padding: '20px 20px 4px',
                    border: '1px solid #f3f4f6', marginBottom: 20,
                  }}>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>
                      Define un rango de precisiones relativas para comparar los tamaños de muestra necesarios bajo distintos escenarios.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <Field label="Mínimo"     value={precMin} onChange={setPrecMin} placeholder="Ej: 20" suffix="%" tooltip="El valor más bajo de precisión relativa." />
                      <Field label="Máximo"     value={precMax} onChange={setPrecMax} placeholder="Ej: 80" suffix="%" tooltip="El valor más alto de precisión relativa." />
                      <Field label="Incremento" value={precInc} onChange={setPrecInc} placeholder="Ej: 10" suffix="%" tooltip="El paso entre cada valor." />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Field
                label="Número de expuestos (n₁)"
                tooltip="El número de sujetos expuestos que ya tienes o planeas reclutar. Los no expuestos se calcularán según la razón definida arriba."
                value={sampleSizeInput} onChange={setSampleSizeInput}
                placeholder="Ej: 80"
              />
            )}
          </div>
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
              @keyframes countUp { from { opacity:0; transform:scale(0.5); filter: blur(5px); } to { opacity:1; transform:scale(1); filter: blur(0); } }
            `}</style>

            {/* Single sample size result */}
            {result.type === 'sampleSize' && (
              <div style={{
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '2px solid #6ee7b7', borderRadius: 16, overflow: 'hidden',
              }}>
                <div style={{ padding: '24px 28px 20px' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: '#059669', marginBottom: 16,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <CheckIcon /> Resultado
                  </div>
                  <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Expuestos',     value: result.exposed },
                      { label: 'No expuestos',  value: result.unexposed },
                      { label: 'Total',          value: result.total },
                    ].map(({ label, value }, idx) => (
                      <div key={label}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#059669', marginBottom: 4 }}>{label}</div>
                        <span style={{
                          fontSize: 44, fontWeight: 800, color: '#065f46',
                          fontFamily: "'DM Mono', monospace", letterSpacing: '-0.03em',
                          animation: `countUp ${0.5 + idx * 0.1}s cubic-bezier(0.16, 1, 0.3, 1)`,
                        }}>
                          {value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.6)', padding: '16px 28px',
                  display: 'flex', flexWrap: 'wrap', gap: '8px 20px',
                }}>
                  <span style={{ fontSize: 12, color: '#065f46' }}><b>pₑ:</b> {result.params.pe}%</span>
                  <span style={{ fontSize: 12, color: '#065f46' }}><b>pₙₑ:</b> {result.params.pne}%</span>
                  <span style={{ fontSize: 12, color: '#065f46' }}><b>RR:</b> {result.params.rr}</span>
                  <span style={{ fontSize: 12, color: '#065f46' }}><b>Razón:</b> {result.params.ratioUnexpExp}:1</span>
                  <span style={{ fontSize: 12, color: '#065f46' }}><b>Confianza:</b> {result.params.confidence}%</span>
                  <span style={{ fontSize: 12, color: '#065f46' }}><b>ε:</b> {result.params.precision}%</span>
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
                    <b>Interpretación IA:</b> Necesitas <b>{result.exposed} expuestos</b> y <b>{result.unexposed} no expuestos</b> ({result.total} sujetos en total) para estimar un Riesgo Relativo de {result.params.rr} con una precisión relativa del {result.params.precision}% al {result.params.confidence}% de confianza.
                    {parseFloat(String(result.params.ratioUnexpExp)) > 1 && <> La razón de {result.params.ratioUnexpExp} no expuestos por expuesto ayuda a incrementar la potencia cuando los expuestos son escasos.</>}
                    {' '}Considera añadir un 10-20% por posibles pérdidas de seguimiento.
                  </div>
                </div>
              </div>
            )}

            {/* Precision result */}
            {result.type === 'precision' && (
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
                      ±{result.value}%
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#059669' }}>precisión relativa</span>
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.6)', padding: '16px 28px',
                  display: 'flex', flexWrap: 'wrap', gap: '8px 20px',
                }}>
                  <span style={{ fontSize: 12, color: '#065f46' }}><b>pₑ:</b> {result.params.pe}%</span>
                  <span style={{ fontSize: 12, color: '#065f46' }}><b>pₙₑ:</b> {result.params.pne}%</span>
                  <span style={{ fontSize: 12, color: '#065f46' }}><b>RR:</b> {result.params.rr}</span>
                  <span style={{ fontSize: 12, color: '#065f46' }}><b>Expuestos:</b> {result.params.sampleSizeExposed}</span>
                  <span style={{ fontSize: 12, color: '#065f46' }}><b>No expuestos:</b> {Math.ceil(result.params.sampleSizeExposed * result.params.ratioUnexpExp)}</span>
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
                    <b>Interpretación IA:</b> Con <b>{result.params.sampleSizeExposed} expuestos</b> y <b>{Math.ceil(result.params.sampleSizeExposed * result.params.ratioUnexpExp)} no expuestos</b>, puedes estimar el RR con una precisión relativa de <b>±{result.value}%</b> al {result.params.confidence}% de confianza.
                    {' '}Esto significa que el límite superior del IC sería aproximadamente RR × {(1 + parseFloat(result.value)/100).toFixed(2)} = {(parseFloat(result.params.rr) * (1 + parseFloat(result.value)/100)).toFixed(2)}.
                    {' '}Evalúa si esta precisión es aceptable para tu estudio de cohorte.
                  </div>
                </div>
              </div>
            )}

            {/* Range table */}
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
                    <CheckIcon /> Tabla comparativa — Expuestos y no expuestos por precisión
                  </div>
                  <p style={{ fontSize: 13, color: '#065f46', margin: 0 }}>
                    RR = <b>{result.params.rr}</b> · pₑ = <b>{result.params.pe}%</b> · pₙₑ = <b>{result.params.pne}%</b> · Razón: <b>{result.params.ratioUnexpExp}:1</b> · Confianza: <b>{result.params.confidence}%</b>
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Precisión (ε)', 'Expuestos', 'No expuestos', 'Total'].map((h, idx) => (
                          <th key={h} style={{
                            padding: idx === 0 ? '12px 20px' : '12px 16px',
                            textAlign: idx === 0 ? 'left' : 'right', fontWeight: 700,
                            fontSize: 12, color: '#6b7280', textTransform: 'uppercase',
                            letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.values.map((row, i) => (
                        <tr key={i}
                          style={{ background: i % 2 === 0 ? 'white' : '#fafbfc', transition: 'background 0.15s ease' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#ecfdf5'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafbfc'; }}
                        >
                          <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 }}>
                            ±{row.precision}%
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 700, color: '#059669', fontFamily: "'DM Mono', monospace" }}>
                            {row.exposed.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 600, color: '#0d9488', fontFamily: "'DM Mono', monospace" }}>
                            {row.unexposed.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 700, color: '#065f46', fontFamily: "'DM Mono', monospace" }}>
                            {row.total.toLocaleString()}
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
                    <b>Interpretación IA:</b> La tabla muestra cómo varían los requerimientos de muestra según la precisión relativa para un RR de {result.params.rr}.
                    {result.values.length > 1 && <>
                      {' '}Con la mayor precisión (±{result.values[0].precision}%) necesitarías <b>{result.values[0].total.toLocaleString()} sujetos</b>,
                      mientras que con ±{result.values[result.values.length-1].precision}% solo <b>{result.values[result.values.length-1].total.toLocaleString()}</b>.
                    </>}
                    {' '}Elige el escenario que equilibre precisión con la factibilidad de reclutamiento en tu estudio de cohorte.
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
            Referencia de fórmula (Método de Katz)
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 13,
            color: '#374151', background: '#f9fafb',
            padding: '14px 18px', borderRadius: 10, lineHeight: 2,
          }}>
            {mode === 'sampleSize' ? (
              <>
                n<sub>expuestos</sub> = Z²<sub>α/2</sub> · [(1−pₑ)/pₑ + (1−pₙₑ)/(k·pₙₑ)] / [ln(1 + ε)]²<br/>
                n<sub>no exp.</sub> = n<sub>expuestos</sub> · k
              </>
            ) : (
              <>
                ε = 1 − exp(−Z<sub>α/2</sub> · √[(1−pₑ)/(n₁·pₑ) + (1−pₙₑ)/(n₁·k·pₙₑ)])
              </>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '10px 0 0', lineHeight: 1.5 }}>
            Donde pₑ = riesgo en expuestos, pₙₑ = riesgo en no expuestos, k = razón no expuestos/expuestos, y ε = precisión relativa. RR = pₑ / pₙₑ.
          </p>
        </div>

      </div>
    </div>
  );
}
