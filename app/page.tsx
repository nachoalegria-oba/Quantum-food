'use client';

import { useState, useEffect } from 'react';
import type { Paper, BackendId } from '../types';
import { PRELOADED_PAPERS } from '../lib/constants';
import { loadPapersFromStorage, deletePaperFromStorage, savePaperToStorage } from '../lib/storage';
import { computeCalibration } from '../lib/calibration';
import { QuantumView } from '../components/QuantumView';
import { PapersView } from '../components/PapersView';
import { ChatView } from '../components/ChatView';

type Tab = 'quantum' | 'papers' | 'chat';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'quantum', label: 'Quantum', icon: '⚛' },
  { id: 'papers', label: 'Papers', icon: '📄' },
  { id: 'chat', label: 'Chat R&D', icon: '◎' },
];

const QUBIT_SPEEDS = [1.5, 1.8, 2.1, 2.4, 2.7];

// Detect which remote backends are configured (env vars present).
// Called server-side via a lightweight endpoint so the client knows which pills to enable.
async function fetchConfiguredBackends(): Promise<Set<BackendId>> {
  try {
    const res = await fetch('/api/backends');
    if (!res.ok) return new Set();
    const data = await res.json() as { configured: BackendId[] };
    return new Set(data.configured);
  } catch {
    return new Set();
  }
}

export default function OrigenesQuantumPage() {
  const [tab, setTab] = useState<Tab>('quantum');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [configuredBackends, setConfiguredBackends] = useState<Set<BackendId>>(new Set(['local']));

  useEffect(() => {
    const stored = loadPapersFromStorage();
    const storedTitles = new Set(stored.map(p => p.title.toLowerCase()));
    const base = PRELOADED_PAPERS.filter(p => !storedTitles.has(p.title.toLowerCase()));
    setPapers([...base, ...stored]);
    setLoaded(true);
    fetchConfiguredBackends().then(setConfiguredBackends);
  }, []);

  function handleAdd(paper: Paper) {
    setPapers(prev => prev.some(p => p.id === paper.id) ? prev : [...prev, paper]);
  }

  function handleDelete(id: string) {
    deletePaperFromStorage(id);
    setPapers(prev => prev.filter(p => p.id !== id));
  }

  function handleUpdate(paper: Paper) {
    savePaperToStorage(paper);
    setPapers(prev => prev.map(p => p.id === paper.id ? paper : p));
  }

  const calibration = computeCalibration(papers);

  return (
    <div className="min-h-screen flex items-start justify-center py-8 px-4" style={{ background: '#f0ebe3' }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-xl" style={{ border: '1px solid #cfc0a0' }}>

        {/* ── Header ── */}
        <div className="px-6 py-5 flex items-center gap-4" style={{ background: '#1a2e20' }}>
          <div className="flex-1">
            <h1
              className="text-base font-bold tracking-wide leading-tight"
              style={{ color: '#f8f4ed', fontFamily: 'Georgia, serif', letterSpacing: '0.03em' }}
            >
              Ørigenes Quantum Platform
            </h1>
            <p className="text-[9px] mt-1 tracking-[0.15em] uppercase" style={{ color: 'rgba(248,244,237,0.35)' }}>
              Fermentación R&D
              {papers.length > 0
                ? ` · ${papers.length} paper${papers.length !== 1 ? 's' : ''}${calibration ? ' · calibrado' : ''}`
                : ''}
            </p>
          </div>

          {/* Animated qubit orbs */}
          <div className="flex gap-2 flex-shrink-0">
            {QUBIT_SPEEDS.map((speed, i) => (
              <div key={i} className="relative flex items-center justify-center" style={{ width: 14, height: 14 }}>
                <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div
                  className="absolute inset-0 rounded-full qubit-ring"
                  style={{ animation: `orbit ${speed}s linear infinite`, borderColor: 'rgba(255,255,255,0.3)' }}
                />
                <div className="w-1 h-1 rounded-full" style={{ background: '#3d9a68', opacity: 0.8 }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex border-b" style={{ background: '#ede8dc', borderColor: '#cfc0a0' }}>
          {TABS.map(t => {
            const active = tab === t.id;
            const badge = t.id === 'papers' ? papers.length : null;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-[11px] transition-all border-b-2"
                style={{
                  background: 'transparent',
                  borderBottomColor: active ? '#2a7a50' : 'transparent',
                  color: active ? '#1a2e20' : '#5a6a58',
                  fontWeight: active ? 600 : 400,
                  fontFamily: 'inherit',
                }}
              >
                <span className="text-sm leading-none">{t.icon}</span>
                {t.label}
                {badge != null && (
                  <span
                    className="text-[9px] px-1.5 py-px rounded-full font-semibold leading-none"
                    style={{ background: active ? '#2a7a50' : '#cfc0a0', color: active ? '#fff' : '#5a6a58' }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto" style={{ background: '#f8f4ed', minHeight: 520, maxHeight: '80vh' }}>
          {!loaded ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#e2d8c4', borderTopColor: '#2a7a50' }} />
              <p className="text-xs" style={{ color: '#9aaa90' }}>Cargando biblioteca...</p>
            </div>
          ) : (
            <div className="p-5 animate-fadeIn">
              {tab === 'quantum' && (
                <QuantumView
                  calibration={calibration}
                  papers={papers}
                  configuredBackends={configuredBackends}
                />
              )}
              {tab === 'papers' && <PapersView papers={papers} onAdd={handleAdd} onDelete={handleDelete} onUpdate={handleUpdate} />}
              {tab === 'chat' && <ChatView papers={papers} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
