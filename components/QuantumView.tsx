'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Calibration, Paper, BackendId, JobPhase, QuantumResult } from '../types';
import { runCircuit, buildQuantumAngles } from '../lib/qsim';
import { QUANTUM_SYSTEM_PROMPT, QUANTUM_SUGGESTIONS } from '../lib/constants';
import { N_QUBITS, SHOTS } from '../lib/quantum-backends';
import { Spinner } from './ui/Spinner';
import { TypingText } from './ui/TypingText';
import { BackendPicker } from './BackendPicker';

const POLL_INTERVAL_MS = 5000;

async function callClaude(system: string, messages: unknown[], maxTokens = 1500): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, maxTokens }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error Claude API');
  return data.content?.[0]?.text ?? '';
}

function buildClaudeMessage(q: string, qr: QuantumResult, calibration: Calibration | null): string {
  const calStr = calibration
    ? `\nCalibración (${calibration.count} papers): Temp ${calibration.temp.min.toFixed(0)}-${calibration.temp.max.toFixed(0)}°C · pH ${calibration.pH.min.toFixed(1)}-${calibration.pH.max.toFixed(1)} · Tiempo ${calibration.tiempo.min.toFixed(0)}-${calibration.tiempo.max.toFixed(0)}h · Conc ${calibration.conc.min.toFixed(1)}-${calibration.conc.max.toFixed(1)}%`
    : '\nSin calibración de papers aún.';

  return (
    `Consulta: "${q}"\n` +
    `Parámetros del circuito cuántico: Temperatura=${qr.probs[0]}%, pH=${qr.probs[1]}%, Tiempo=${qr.probs[2]}%, Concentración=${qr.probs[3]}%, Inoculación=${qr.probs[4]}%, Humedad=${qr.probs[5]}%, O₂=${qr.probs[6]}%, T°madura=${qr.probs[7]}%` +
    calStr
  );
}

// ─── 4-param chip grid ─────────────────────────────────────────────────────────

interface ParamGridProps {
  qData: QuantumResult;
  calibration: Calibration | null;
}

function ParamGrid({ qData, calibration }: ParamGridProps) {
  const params: Array<{ label: string; color: string; unit: string; cal: { min: number; max: number } | null; q: number }> = [
    { label: 'Temperatura', color: '#c05000', unit: '°C', cal: calibration?.temp ?? null, q: 0 },
    { label: 'pH',          color: '#0060a0', unit: '',   cal: calibration?.pH   ?? null, q: 1 },
    { label: 'Tiempo',      color: '#2a7a50', unit: 'h',  cal: calibration?.tiempo ?? null, q: 2 },
    { label: 'Concentración', color: '#a06000', unit: '%', cal: calibration?.conc ?? null, q: 3 },
  ];

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#9aaa90' }}>
        {calibration
          ? `Parámetros sugeridos · calibrados con ${calibration.count} papers`
          : 'Parámetros sugeridos · añade papers para calibrar con rangos reales'}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {params.map(({ label, color, unit, cal, q }) => {
          const prob = parseFloat(qData.probs[q]) / 100;
          const realVal = cal ? (cal.min + (cal.max - cal.min) * prob).toFixed(1) : null;
          const display = realVal ? `${realVal}${unit}` : `${(prob * 100).toFixed(0)}%`;
          return (
            <div
              key={q}
              className="rounded-xl p-3 text-center"
              style={{ background: '#ffffff', border: '1px solid #e2d8c4' }}
            >
              <div className="text-sm font-bold leading-tight" style={{ color }}>{display}</div>
              <div className="text-[9px] mt-1 uppercase tracking-wide leading-tight" style={{ color: '#9aaa90' }}>{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Collapsible technical details ────────────────────────────────────────────

interface TechDetailsProps {
  qData: QuantumResult;
  backend: BackendId;
}

function TechDetails({ qData, backend }: TechDetailsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-[10px] flex items-center gap-1.5 transition-opacity hover:opacity-70"
        style={{ color: '#9aaa90' }}
      >
        <span style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
          ▶
        </span>
        Datos del circuito cuántico
      </button>

      {open && (
        <div className="mt-2 rounded-xl border p-4 space-y-3 animate-fadeIn" style={{ background: '#f8f4ed', borderColor: '#e2d8c4' }}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest" style={{ color: '#9aaa90' }}>
              {N_QUBITS} qubits · {SHOTS} shots
            </p>
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: backend === 'local' ? '#e8f5ee' : backend.startsWith('ibm') ? '#e8f0ff' : '#f3e8ff',
                color:      backend === 'local' ? '#0f4a20' : backend.startsWith('ibm') ? '#003a6a' : '#4a0068',
              }}
            >
              {backend}
            </span>
          </div>
          <div className="space-y-1.5">
            {qData.top.slice(0, 4).map(({ bits, count }, i) => (
              <div key={i} className="flex items-center gap-3">
                <code className="text-[10px] w-16 flex-shrink-0 font-mono" style={{ color: '#5a6a58' }}>|{bits}⟩</code>
                <div className="flex-1 h-1 rounded-full" style={{ background: '#e4dccf' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(count / qData.top[0].count * 100).toFixed(0)}%`,
                      background: i === 0 ? '#2a7a50' : `rgba(42,122,80,${(0.6 - i * 0.12).toFixed(2)})`,
                    }}
                  />
                </div>
                <span className="text-[10px] w-10 text-right flex-shrink-0" style={{ color: '#5a6a58' }}>
                  {((count / SHOTS) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px]" style={{ color: '#9aaa90' }}>
            Entropía cuántica: {qData.entropy.toFixed(3)} bits
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  calibration: Calibration | null;
  papers: Paper[];
  configuredBackends: Set<BackendId>;
}

export function QuantumView({ calibration, configuredBackends }: Props) {
  const [backend, setBackend] = useState<BackendId>('local');
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<JobPhase>('idle');
  const [qData, setQData] = useState<QuantumResult | null>(null);
  const [claudeResult, setClaudeResult] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [jobMeta, setJobMeta] = useState<{ jobId: string; provider: string } | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [phase, claudeResult]);

  useEffect(() => () => { if (pollerRef.current) clearInterval(pollerRef.current); }, []);

  const runClaude = useCallback(async (q: string, qr: QuantumResult) => {
    setPhase('claude');
    try {
      const msg = buildClaudeMessage(q, qr, calibration);
      const text = await callClaude(QUANTUM_SYSTEM_PROMPT, [{ role: 'user', content: msg }]);
      setClaudeResult(text);
    } catch (e) {
      setError((e as Error).message);
    }
    setPhase('done');
  }, [calibration]);

  const startPolling = useCallback((jobId: string, provider: string, q: string) => {
    if (pollerRef.current) clearInterval(pollerRef.current);
    pollerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/quantum/status?provider=${provider}&jobId=${encodeURIComponent(jobId)}&query=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.status === 'queued') {
          setPhase('queued');
          setQueuePosition(data.queuePosition ?? null);
        } else if (data.status === 'running') {
          setPhase('running-remote');
          setQueuePosition(null);
        } else if (data.status === 'completed' && data.result) {
          clearInterval(pollerRef.current!);
          pollerRef.current = null;
          setQData(data.result);
          await runClaude(q, data.result);
        } else if (data.status === 'failed') {
          clearInterval(pollerRef.current!);
          pollerRef.current = null;
          setError(data.error ?? 'El job falló en el backend remoto');
          setPhase('error');
        }
      } catch (e) {
        clearInterval(pollerRef.current!);
        pollerRef.current = null;
        setError((e as Error).message);
        setPhase('error');
      }
    }, POLL_INTERVAL_MS);
  }, [runClaude]);

  async function run(q: string) {
    if (!q.trim() || ['running-local', 'submitting', 'queued', 'running-remote', 'claude'].includes(phase)) return;
    setInput('');
    setQuery(q);
    setQData(null);
    setClaudeResult('');
    setError('');
    setJobMeta(null);
    setQueuePosition(null);
    if (pollerRef.current) clearInterval(pollerRef.current);

    if (backend === 'local') {
      setPhase('running-local');
      await new Promise(r => setTimeout(r, 350));
      const qr = runCircuit(q, calibration);
      setQData(qr);
      await runClaude(q, qr);
      return;
    }

    setPhase('submitting');
    try {
      const angles = buildQuantumAngles(q, calibration);
      const res = await fetch('/api/quantum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backend, angles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error enviando job');
      setJobMeta({ jobId: data.jobId, provider: data.provider });
      setPhase('queued');
      startPolling(data.jobId, data.provider, q);
    } catch (e) {
      setError((e as Error).message);
      setPhase('error');
    }
  }

  const isActive = !['idle', 'done', 'error'].includes(phase);

  function phaseLabel(): string {
    if (phase === 'running-local') return 'Calculando con circuito cuántico...';
    if (phase === 'submitting')    return `Enviando circuito a ${backend.toUpperCase()}...`;
    if (phase === 'queued')        return queuePosition != null ? `En cola — posición ${queuePosition}` : 'En cola del procesador cuántico...';
    if (phase === 'running-remote') return 'Ejecutando en hardware cuántico real...';
    if (phase === 'claude')        return 'Preparando recomendaciones...';
    return '';
  }

  return (
    <div className="space-y-4">

      {/* Backend selector */}
      <BackendPicker selected={backend} onChange={setBackend} configuredBackends={configuredBackends} />

      {/* Idle: suggestions */}
      {phase === 'idle' && (
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: '#9aaa90' }}>
            ¿Qué quieres fermentar o investigar?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {QUANTUM_SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => run(s)}
                className="bg-white text-left rounded-xl border px-4 py-3 text-xs leading-relaxed transition-all hover:border-[#2a7a50] hover:shadow-sm active:scale-[0.99]"
                style={{ borderColor: '#e2d8c4', color: '#1a2e20' }}
              >
                <span className="mr-1.5" style={{ color: '#9aaa90' }}>→</span>{s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Running */}
      {isActive && (
        <div className="py-8 flex flex-col items-center gap-4">
          <p className="text-xs italic" style={{ color: '#5a6a58' }}>&ldquo;{query}&rdquo;</p>
          <Spinner />
          <span className="text-xs text-center" style={{ color: '#1a2e20' }}>{phaseLabel()}</span>
          {jobMeta && (
            <p className="text-[10px] font-mono" style={{ color: '#9aaa90' }}>job: {jobMeta.jobId}</p>
          )}
          {['queued', 'running-remote'].includes(phase) && (
            <div className="rounded-xl border px-4 py-3 text-[11px] leading-relaxed text-center" style={{ background: '#f0ebe3', borderColor: '#e2d8c4', color: '#5a6a58' }}>
              Hardware cuántico real en ejecución · actualizando cada {POLL_INTERVAL_MS / 1000}s
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="rounded-xl border px-4 py-4 space-y-3" style={{ background: '#fff5f5', borderColor: '#fcc' }}>
          <p className="text-xs font-semibold text-red-700">Error</p>
          <p className="text-xs text-red-600 font-mono">{error}</p>
          <button
            onClick={() => { setPhase('idle'); setError(''); }}
            className="text-xs border rounded-lg px-4 py-1.5 transition-all hover:border-red-400"
            style={{ borderColor: '#fcc', color: '#c00' }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Results */}
      {(phase === 'done' || phase === 'claude') && qData && (
        <div className="space-y-4 animate-fadeIn">
          <p className="text-xs italic" style={{ color: '#9aaa90' }}>&ldquo;{query}&rdquo;</p>

          <ParamGrid qData={qData} calibration={calibration} />

          {/* AI recommendations — the star */}
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e2d8c4' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: '#9aaa90' }}>Recomendaciones</p>
              {phase === 'claude' && <Spinner size={11} />}
            </div>
            {error
              ? <p className="text-xs text-red-600">{error}</p>
              : claudeResult
                ? <p className="text-sm leading-relaxed" style={{ color: '#1a2e20' }}><TypingText text={claudeResult} /></p>
                : <div className="flex items-center gap-2"><Spinner size={11} /><span className="text-xs" style={{ color: '#9aaa90' }}>Preparando...</span></div>
            }
          </div>

          {/* Technical details — hidden by default */}
          <TechDetails qData={qData} backend={backend} />

          <button
            onClick={() => { setPhase('idle'); setQData(null); setClaudeResult(''); setJobMeta(null); }}
            className="text-xs border rounded-lg px-4 py-2 transition-all hover:border-[#2a7a50] hover:text-[#2a7a50]"
            style={{ borderColor: '#cfc0a0', color: '#5a6a58', background: 'transparent' }}
          >
            Nuevo experimento →
          </button>
        </div>
      )}

      <div ref={bottomRef} />

      {/* Input bar */}
      {['idle', 'done', 'error'].includes(phase) && (
        <div className="pt-4 border-t flex gap-2" style={{ borderColor: '#e2d8c4' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run(input)}
            placeholder="Escribe tu consulta de fermentación..."
            className="flex-1 text-xs rounded-xl border px-4 py-2.5 outline-none transition-all"
            style={{ background: '#ffffff', borderColor: '#cfc0a0', color: '#1a2e20', fontFamily: 'inherit' }}
            onFocus={e => (e.target.style.borderColor = '#2a7a50')}
            onBlur={e => (e.target.style.borderColor = '#cfc0a0')}
          />
          <button
            onClick={() => run(input)}
            disabled={!input.trim() || isActive}
            className="text-xs font-semibold rounded-xl px-5 py-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: input.trim() && !isActive ? '#2a7a50' : '#e4dccf',
              color:      input.trim() && !isActive ? '#ffffff'  : '#9aaa90',
              fontFamily: 'inherit',
            }}
          >
            Calcular →
          </button>
        </div>
      )}
    </div>
  );
}
