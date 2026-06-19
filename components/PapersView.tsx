'use client';

import { useState, useRef } from 'react';
import type { Paper, ZoteroItem, FermentationType } from '../types';
import { EXTRACT_SYSTEM_PROMPT, BATCH_EXTRACT_SYSTEM_PROMPT } from '../lib/constants';
import { savePaperToStorage } from '../lib/storage';
import { Tag } from './ui/Tag';
import { Spinner } from './ui/Spinner';

async function callClaude(system: string, messages: unknown[], maxTokens = 1000): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, maxTokens }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error de API');
  return data.content?.[0]?.text ?? '';
}

const FERMENTATION_TYPES: (FermentationType | 'all')[] = [
  'all', 'koji', 'miso', 'kefir', 'kombucha', 'lacto', 'beverage', 'general',
];

interface Props {
  papers: Paper[];
  onAdd: (paper: Paper) => void;
  onDelete: (id: string) => void;
  onUpdate: (paper: Paper) => void;
}

export function PapersView({ papers, onAdd, onDelete, onUpdate }: Props) {
  const [drag, setDrag] = useState(false);
  const [filter, setFilter] = useState<FermentationType | 'all'>('all');
  const [processing, setProcessing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = filter === 'all' ? papers : papers.filter(p => p.type === filter);

  async function processPdfFile(file: File) {
    setProcessing(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = e => res((e.target!.result as string).split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const text = await callClaude(
        EXTRACT_SYSTEM_PROMPT,
        [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: 'Extrae los parámetros de fermentación de este paper.' },
          ],
        }],
        800,
      );
      const parsed: Omit<Paper, 'id' | 'savedAt' | 'filename'> = JSON.parse(text.replace(/```json|```/g, '').trim());
      const paper: Paper = {
        ...parsed,
        id: `pdf-${Date.now()}`,
        filename: file.name,
        savedAt: Date.now(),
      };
      savePaperToStorage(paper);
      onAdd(paper);
    } catch (e) {
      alert('Error procesando PDF: ' + (e as Error).message);
    }
    setProcessing(false);
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.type === 'application/pdf') await processPdfFile(file);
    }
  }

  function detectType(title: string, abstract: string): import('../types').FermentationType {
    const text = (title + ' ' + abstract).toLowerCase();
    if (/koji|aspergillus oryzae|aspergillus sojae/.test(text)) return 'koji';
    if (/\bmiso\b/.test(text)) return 'miso';
    if (/kombucha|scoby/.test(text)) return 'kombucha';
    if (/kefir|kéfir/.test(text)) return 'kefir';
    if (/lacto|lactobacillus|lactic acid|kimchi|sauerkraut|kraut|pickle/.test(text)) return 'lacto';
    if (/beverage|drink|beer|wine|cider|fermented/.test(text)) return 'beverage';
    return 'general';
  }

  async function syncFromZotero() {
    setSyncing(true);
    setSyncMsg('Conectando con Zotero...');
    try {
      const res = await fetch('/api/zotero');
      const data = await res.json();

      if (!data.configured) {
        setSyncMsg('No se encontró Zotero instalado');
        setTimeout(() => setSyncMsg(''), 5000);
        setSyncing(false);
        return;
      }

      const items: ZoteroItem[] = data.items ?? [];
      const existingTitles = new Set(papers.map(p => p.title.toLowerCase()));
      const newItems = items.filter(it => !existingTitles.has(it.data.title.toLowerCase()));

      if (newItems.length === 0) {
        setSyncMsg('Biblioteca ya sincronizada');
        setTimeout(() => setSyncMsg(''), 3000);
        setSyncing(false);
        return;
      }

      setSyncMsg(`Importando ${newItems.length} papers...`);

      for (const item of newItems) {
        const paper: Paper = {
          id: `zotero-${item.key}`,
          zoteroKey: item.key,
          savedAt: Date.now(),
          title: item.data.title,
          year: item.data.date ? item.data.date.slice(0, 4) : '',
          doi: item.data.DOI ?? undefined,
          abstract: item.data.abstractNote || undefined,
          type: detectType(item.data.title, item.data.abstractNote ?? ''),
          microorganismo_clave: null,
          aplicacion_oba: '',
          resultado_principal: '',
          confianza: 0,
          inoculacion: null,
          temperatura_min: null,
          temperatura_max: null,
          pH_min: null,
          pH_max: null,
          tiempo_min_h: null,
          tiempo_max_h: null,
          concentracion_min: null,
          concentracion_max: null,
        };
        savePaperToStorage(paper);
        onAdd(paper);
      }

      const source = data.source === 'local' ? 'Zotero local' : 'Zotero cloud';
      setSyncMsg(`✓ ${newItems.length} papers importados desde ${source}`);
      setTimeout(() => setSyncMsg(''), 4000);
    } catch (e) {
      setSyncMsg('Error: ' + (e as Error).message);
      setTimeout(() => setSyncMsg(''), 4000);
    }
    setSyncing(false);
  }

  const unananalyzed = papers.filter(p => !p.preloaded && p.confianza === 0 && p.abstract);

  async function analyzeAll() {
    if (unananalyzed.length === 0) return;
    setAnalyzing(true);
    const BATCH = 5;
    let done = 0;
    for (let i = 0; i < unananalyzed.length; i += BATCH) {
      const batch = unananalyzed.slice(i, i + BATCH);
      setAnalyzeMsg(`Analizando ${done + 1}–${Math.min(done + BATCH, unananalyzed.length)} de ${unananalyzed.length}...`);
      try {
        const payload = batch.map(p => ({ title: p.title, abstract: p.abstract ?? '' }));
        const text = await callClaude(
          BATCH_EXTRACT_SYSTEM_PROMPT,
          [{ role: 'user', content: JSON.stringify(payload) }],
          1200,
        );
        const results = JSON.parse(text.replace(/```json|```/g, '').trim()) as Partial<Paper>[];
        for (let j = 0; j < batch.length; j++) {
          const r = results[j];
          if (!r) continue;
          const updated: Paper = { ...batch[j], ...r, id: batch[j].id, savedAt: batch[j].savedAt };
          onUpdate(updated);
        }
      } catch {
        // skip failed batch, continue
      }
      done += batch.length;
    }
    setAnalyzeMsg(`✓ ${done} papers analizados`);
    setTimeout(() => setAnalyzeMsg(''), 4000);
    setAnalyzing(false);
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all"
        style={{
          borderColor: drag ? '#2a7a50' : '#cfc0a0',
          background: drag ? '#ede8dc' : '#ffffff',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        {processing ? (
          <div className="flex items-center justify-center gap-3">
            <Spinner />
            <span className="text-xs" style={{ color: '#5a6a58' }}>Procesando paper con Claude...</span>
          </div>
        ) : (
          <>
            <div className="text-2xl mb-2">📄</div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#1a2e20' }}>
              Arrastra un paper en PDF
            </p>
            <p className="text-[11px]" style={{ color: '#9aaa90' }}>
              o haz clic para seleccionar · Claude extrae todos los parámetros automáticamente
            </p>
          </>
        )}
      </div>

      {/* Zotero sync + AI analyze */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={syncFromZotero}
          disabled={syncing || analyzing}
          className="flex items-center gap-2 text-xs border rounded-lg px-4 py-2 transition-all hover:border-[#2a7a50] hover:text-[#2a7a50] disabled:opacity-50"
          style={{ borderColor: '#cfc0a0', color: '#5a6a58', background: 'transparent' }}
        >
          {syncing ? <Spinner size={12} /> : <span>⟳</span>}
          Sincronizar desde Zotero
        </button>
        {unananalyzed.length > 0 && (
          <button
            onClick={analyzeAll}
            disabled={analyzing || syncing}
            className="flex items-center gap-2 text-xs border rounded-lg px-4 py-2 transition-all hover:border-[#7040b0] hover:text-[#7040b0] disabled:opacity-50"
            style={{ borderColor: '#cfc0a0', color: '#5a6a58', background: 'transparent' }}
          >
            {analyzing ? <Spinner size={12} /> : <span>◈</span>}
            Analizar {unananalyzed.length} con IA
          </button>
        )}
        {(syncMsg || analyzeMsg) && (
          <span className="text-[11px]" style={{ color: '#5a6a58' }}>
            {syncMsg || analyzeMsg}
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FERMENTATION_TYPES.map(t => {
          const count = t === 'all' ? papers.length : papers.filter(p => p.type === t).length;
          const active = filter === t;
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className="text-[9px] uppercase tracking-widest px-3 py-1 rounded-full border transition-all font-semibold"
              style={{
                background: active ? '#1a2e20' : 'transparent',
                borderColor: active ? '#1a2e20' : '#cfc0a0',
                color: active ? '#ffffff' : '#5a6a58',
              }}
            >
              {t === 'all' ? `Todos (${count})` : `${t} (${count})`}
            </button>
          );
        })}
      </div>

      {/* Paper list */}
      {filtered.length === 0 ? (
        <p className="text-center text-xs py-10" style={{ color: '#9aaa90' }}>
          No hay papers en esta categoría
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((p, i) => (
            <div
              key={p.id ?? i}
              className="bg-white rounded-xl border p-4 transition-shadow hover:shadow-sm"
              style={{ borderColor: '#e2d8c4' }}
            >
              <div className="flex gap-3 items-start mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 items-center mb-2 flex-wrap">
                    <Tag type={p.type} />
                    <span className="text-[10px]" style={{ color: '#9aaa90' }}>{p.year}</span>
                    {p.confianza && (
                      <span className="text-[9px]" style={{ color: '#3d9a68' }}>
                        ✓ {(p.confianza * 100).toFixed(0)}%
                      </span>
                    )}
                    {p.zoteroKey && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#e8f0ff', color: '#003a6a' }}>
                        Zotero
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold leading-snug" style={{ color: '#1a2e20' }}>{p.title}</p>
                  {p.microorganismo_clave && (
                    <p className="text-[10px] italic mt-0.5" style={{ color: '#5a6a58' }}>{p.microorganismo_clave}</p>
                  )}
                </div>
                {!p.preloaded && (
                  <button
                    onClick={() => onDelete(p.id)}
                    className="text-base leading-none p-1 rounded transition-colors hover:text-red-500 flex-shrink-0"
                    style={{ color: '#9aaa90' }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Param grid */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {([
                  ['Temp', p.temperatura_min, p.temperatura_max, '°C', '#c05000'],
                  ['pH', p.pH_min, p.pH_max, '', '#0060a0'],
                  ['Tiempo', p.tiempo_min_h, p.tiempo_max_h, 'h', '#2a7a50'],
                  ['Conc.', p.concentracion_min, p.concentracion_max, '%', '#a06000'],
                ] as [string, number | null, number | null, string, string][]).map(([l, mn, mx, u, c]) => (
                  <div key={l} className="rounded-lg text-center py-2 px-1.5" style={{ background: '#f8f4ed' }}>
                    <div className="text-[8px] mb-0.5 uppercase tracking-wide" style={{ color: '#9aaa90' }}>{l}</div>
                    <div className="text-[11px] font-semibold leading-none" style={{ color: mn !== null ? c : '#9aaa90' }}>
                      {mn !== null ? `${mn}${mx && mx !== mn ? `–${mx}` : ''}` : '—'}{u}
                    </div>
                  </div>
                ))}
              </div>

              {p.aplicacion_oba && (
                <p className="text-[10px] leading-relaxed pt-3 border-t" style={{ color: '#2a7a50', borderColor: '#e2d8c4' }}>
                  ↳ {p.aplicacion_oba}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
