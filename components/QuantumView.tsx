'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Calibration, Paper, BackendId, JobPhase, QuantumResult } from '../types';
import { runCircuit, qHashN } from '../lib/qsim';
import { QUANTUM_SYSTEM_PROMPT, QUANTUM_SUGGESTIONS, PARAM_LABELS } from '../lib/constants';
import { N_QUBITS, SHOTS } from '../lib/quantum-backends';
import { StatCard } from './ui/StatCard';
import { Spinner } from './ui/Spinner';
import { TypingText } from './ui/TypingText';
import { BackendPicker } from './BackendPicker';

const POLL_INTERVAL_MS = 5000;

async function callClaude(system: string, messages: unknown[], maxTokens = 1000): Promise<string> {
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
    `Top estados cuánticos (${N_QUBITS} qubits): ${qr.top.slice(0, 4).map(s => `|${s.bits}⟩ ${((s.count / SHOTS) * 100).toFixed(1)}%`).join(' · ')}\n` +
    `Probabilidades: ${qr.probs.map((p, i) => `Q${i}(${PARAM_LABELS[i][0]})=${p}%`).join(', ')}\n` +
    `Entropía cuántica: ${qr.entropy.toFixed(3)} bits` +
    calStr
  );
}

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

  // ── Cleanup polling on unmount ───────────────────────────────────────────────
  useEffect(() => () => { if (pollerRef.current) clearInterval(pollerRef.current); }, []);

  // ── Run Claude analysis after quantum result is ready ────────────────────────
  const runClaude = useCallback(async (q: string, qr: QuantumResult) => {
    setPhase('claude');
    try {
      const msg = buildClaudeMessage(q, qr, calibration);
      const text = await callClaude(QUANTUM_SYSTEM_PROMPT, [{ role: 'user', content: msg }], 1500);
      setClaudeResult(text);
    } catch (e) {
      setError((e as Error).message);
    }
    setPhase('done');
  }, [calibration]);

  // ── Poll remote job ──────────────────────────────────────────────────────────
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

  // ── Main run function ────────────────────────────────────────────────────────
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
      const qr = runCircuit(q);
      setQData(qr);
      await runClaude(q, qr);
      return;
    }

    // Remote backend
    setPhase('submitting');
    try {
      const angles = qHashN(q, 3 * N_QUBITS);
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

  // ── Phase-specific status labels ─────────────────────────────────────────────
  function phaseLabel(): string {
    if (phase === 'running-local') return 'Ejecutando circuito cuántico · 8 qubits · 2048 shots...';
    if (phase === 'submitting') return `Enviando circuito a ${backend.toUpperCase()}...`;
    if (phase === 'queued') return queuePosition != null ? `En cola — posición ${queuePosition}` : 'En cola del procesador cuántico...';
    if (phase === 'running-remote') return 'Ejecutando en hardware cuántico real...';
    if (phase === 'claude') return 'Analizando resultados con IA de fermentación...';
    return '';
  }

  return (
    <div className="space-y-4">
      {/* Backend selector */}
      <BackendPicker selected={backend} onChange={setBackend} configuredBackends={configuredBackends} />

      {calibration && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ['Temperatura', calibration.temp.mean.toFixed(1), '°C', `${calibration.temp.min.toFixed(0)}-${calibration.temp.max.toFixed(0)}°C`, '#c05000'],
            ['pH', calibration.pH.mean.toFixed(2), '', `${calibration.pH.min.toFixed(1)}-${calibration.pH.max.toFixed(1)}`, '#0060a0'],
            ['Tiempo', calibration.tiempo.mean.toFixed(0), 'h', `${calibration.tiempo.min.toFixed(0)}-${calibration.tiempo.max.toFixed(0)}h`, '#2a7a50'],
            ['Concentración', calibration.conc.mean.toFixed(1), '%', `${calibration.count}p calibrado`, '#a06000'],
          ] as [string, string, string, string, string][]).map(([l, v, u, s, c]) => (
            <StatCard key={l} label={l} value={v} unit={u} sub={s} color={c} />
          ))}
        </div>
      )}

      {phase === 'idle' && (
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: '#9aaa90' }}>
            Experimentos sugeridos
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

      {/* Active phase indicator */}
      {isActive && (
        <div className="py-4 space-y-4">
          <p className="text-xs italic" style={{ color: '#5a6a58' }}>&ldquo;{query}&rdquo;</p>
          <div className="flex items-center gap-3">
            <Spinner />
            <span className="text-xs" style={{ color: '#1a2e20' }}>{phaseLabel()}</span>
          </div>
          {/* Remote job metadata */}
          {jobMeta && (
            <p className="text-[10px] font-mono" style={{ color: '#9aaa90' }}>
              job id: {jobMeta.jobId}
            </p>
          )}
          {/* Remote backend tip */}
          {['queued', 'running-remote'].includes(phase) && (
            <div className="rounded-xl border px-4 py-3 text-[11px] leading-relaxed" style={{ background: '#f0ebe3', borderColor: '#e2d8c4', color: '#5a6a58' }}>
              El circuito está ejecutándose en hardware cuántico real.<br />
              Polling cada {POLL_INTERVAL_MS / 1000}s automáticamente.
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {phase === 'error' && (
        <div className="rounded-xl border px-4 py-4 space-y-3" style={{ background: '#fff5f5', borderColor: '#fcc' }}>
          <p className="text-xs font-semibold text-red-700">Error del backend</p>
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
        <div className="space-y-4">
          <p className="text-xs italic" style={{ color: '#9aaa90' }}>&ldquo;{query}&rdquo;</p>

          {/* Quantum distribution */}
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#e2d8c4' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: '#9aaa90' }}>
                Distribución cuántica · {N_QUBITS} qubits · 256 estados · {SHOTS} shots
              </p>
              <span
                className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: backend === 'local' ? '#e8f5ee' : backend.startsWith('ibm') ? '#e8f0ff' : '#f3e8ff', color: backend === 'local' ? '#0f4a20' : backend.startsWith('ibm') ? '#003a6a' : '#4a0068' }}
              >
                {backend}
              </span>
            </div>
            <div className="space-y-2">
              {qData.top.map(({ bits, count }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <code className="text-[10px] w-20 flex-shrink-0 font-mono" style={{ color: '#5a6a58' }}>|{bits}⟩</code>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: '#e4dccf' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(count / qData.top[0].count * 100).toFixed(0)}%`,
                        background: i === 0 ? '#2a7a50' : `rgba(42,122,80,${(0.75 - i * 0.08).toFixed(2)})`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] w-10 text-right flex-shrink-0" style={{ color: '#5a6a58' }}>
                    {((count / SHOTS) * 100).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Parameter bars */}
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#e2d8c4' }}>
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: '#9aaa90' }}>
              Parámetros cuánticos · {N_QUBITS} qubits{calibration ? ` · Q0-Q3 calibrados (${calibration.count}p)` : ''}
            </p>
            <div className="space-y-3">
              {PARAM_LABELS.map(([label, color, unit], i) => {
                const prob = parseFloat(qData.probs[i]);
                const calMap = calibration
                  ? [calibration.temp, calibration.pH, calibration.tiempo, calibration.conc, null, null, null, null]
                  : new Array(N_QUBITS).fill(null);
                const cal = calMap[i] as { min: number; max: number } | null;
                const realVal = cal ? (cal.min + (cal.max - cal.min) * prob / 100).toFixed(1) : null;
                return (
                  <div key={i}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs" style={{ color: '#1a2e20' }}>Q{i} — {label}</span>
                      <span className="text-xs font-semibold" style={{ color }}>
                        {prob}%{realVal ? ` → ${realVal}${unit}` : ''}
                      </span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: '#e4dccf' }}>
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${prob}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI analysis */}
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e2d8c4' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: '#9aaa90' }}>Análisis R&D — Ørigenes</p>
              {phase === 'claude' && <Spinner size={11} />}
            </div>
            {error
              ? <p className="text-xs text-red-600">{error}</p>
              : claudeResult
                ? <p className="text-sm leading-relaxed" style={{ color: '#1a2e20' }}><TypingText text={claudeResult} /></p>
                : <div className="flex items-center gap-2"><Spinner size={11} /><span className="text-xs" style={{ color: '#9aaa90' }}>Analizando...</span></div>}
          </div>

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

      {/* Input bar (shown in idle and done states) */}
      {['idle', 'done', 'error'].includes(phase) && (
        <div className="pt-4 border-t flex gap-2" style={{ borderColor: '#e2d8c4' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run(input)}
            placeholder="Consulta personalizada..."
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
              color: input.trim() && !isActive ? '#ffffff' : '#9aaa90',
              fontFamily: 'inherit',
            }}
          >
            Ejecutar →
          </button>
        </div>
      )}
    </div>
  );
}
