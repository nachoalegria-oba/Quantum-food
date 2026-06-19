'use client';

import { useState, useRef, useEffect } from 'react';
import type { Paper, ChatMessage } from '../types';
import { CHAT_SYSTEM_PROMPT } from '../lib/constants';
import { Spinner } from './ui/Spinner';
import { TypingText } from './ui/TypingText';

async function callClaude(system: string, messages: unknown[], maxTokens = 1200): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, maxTokens }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error de API');
  return data.content?.[0]?.text ?? '';
}

const QUICK_QUESTIONS = [
  '¿Qué temperatura es óptima para koji según los papers?',
  'Compara kéfir de agua con kombucha',
  '¿Cómo hacer un garum de setas manchegas?',
  'Sugiéreme una bebida fermentada no alcohólica',
];

interface Props {
  papers: Paper[];
}

export function ChatView({ papers }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput('');
    setLoading(true);

    const userMsg: ChatMessage = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);

    const papersWithFull  = papers.filter(p => p.full_text);
    const papersMetaOnly  = papers.filter(p => !p.full_text);

    const formatPaper = (p: typeof papers[0], includeFull: boolean) => {
      const params = `Temp: ${p.temperatura_min ?? '?'}-${p.temperatura_max ?? '?'}°C · pH: ${p.pH_min ?? '?'}-${p.pH_max ?? '?'} · Tiempo: ${p.tiempo_min_h ?? '?'}-${p.tiempo_max_h ?? '?'}h · Conc: ${p.concentracion_min ?? '?'}-${p.concentracion_max ?? '?'}%`;
      const header = `═══ ${p.title} (${p.year} · ${p.type}) ═══\n${params}${p.microorganismo_clave ? `\nMicroorganismo: ${p.microorganismo_clave}` : ''}\nResultado: ${p.resultado_principal}${p.aplicacion_oba ? `\nAplicación Oba★: ${p.aplicacion_oba}` : ''}`;
      if (includeFull && p.full_text) return `${header}\n\nTEXTO COMPLETO DEL PAPER:\n${p.full_text}`;
      if (p.abstract)                  return `${header}\n\nAbstract: ${p.abstract}`;
      return header;
    };

    const fullCount = papersWithFull.length;
    const libraryCtx = papers.length > 0
      ? `\n\nBIBLIOTECA CIENTÍFICA (${papers.length} papers · ${fullCount} con texto completo):\n\n` +
        [...papersWithFull.map(p => formatPaper(p, true)),
          ...papersMetaOnly.map(p => formatPaper(p, false))].join('\n\n---\n\n')
      : '\n\nSin papers en biblioteca aún.';

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const text = await callClaude(CHAT_SYSTEM_PROMPT + libraryCtx, history, 1200);
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + (e as Error).message }]);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full min-h-[480px]">
      {messages.length === 0 && (
        <div className="text-center py-8 px-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-base font-serif font-bold" style={{ background: '#2a7a50', color: '#ffffff' }}>
            Ø
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#1a2e20' }}>Asistente de investigación</p>
          <p className="text-xs mb-6" style={{ color: '#9aaa90' }}>
            Pregúntame sobre los {papers.length} papers de tu biblioteca,<br />
            técnicas de fermentación o innovaciones para Oba★
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => { setInput(q); setTimeout(() => document.getElementById('chat-input')?.focus(), 50); }}
                className="bg-white text-left rounded-xl border px-3.5 py-3 text-[11px] leading-relaxed transition-all hover:border-[#2a7a50] hover:shadow-sm"
                style={{ borderColor: '#e2d8c4', color: '#1a2e20' }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pb-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
              style={{
                background: m.role === 'user' ? '#1a2e20' : '#2a7a50',
                color: '#ffffff',
                fontFamily: 'Georgia, serif',
              }}
            >
              {m.role === 'user' ? 'N' : 'Ø'}
            </div>
            <div
              className="max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed"
              style={{
                background: m.role === 'user' ? '#1a2e20' : '#ffffff',
                border: m.role === 'user' ? 'none' : '1px solid #e2d8c4',
                color: m.role === 'user' ? '#f8f4ed' : '#1a2e20',
              }}
            >
              {m.role === 'assistant' && i === messages.length - 1
                ? <TypingText text={m.content} />
                : <span className="whitespace-pre-wrap">{m.content}</span>}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: '#2a7a50', color: '#ffffff', fontFamily: 'Georgia, serif' }}>
              Ø
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 border flex items-center gap-2.5" style={{ borderColor: '#e2d8c4' }}>
              <Spinner size={12} />
              <span className="text-xs" style={{ color: '#9aaa90' }}>Analizando...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="pt-3.5 border-t mt-3 flex gap-2" style={{ borderColor: '#e2d8c4' }}>
        <input
          id="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Pregunta sobre fermentación, papers o innovaciones..."
          className="flex-1 text-xs rounded-xl border px-4 py-2.5 outline-none transition-all"
          style={{
            background: '#ffffff',
            borderColor: '#cfc0a0',
            color: '#1a2e20',
            fontFamily: 'inherit',
          }}
          onFocus={e => (e.target.style.borderColor = '#2a7a50')}
          onBlur={e => (e.target.style.borderColor = '#cfc0a0')}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="text-xs font-semibold rounded-xl px-5 py-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          style={{
            background: input.trim() && !loading ? '#2a7a50' : '#e4dccf',
            color: input.trim() && !loading ? '#ffffff' : '#9aaa90',
            fontFamily: 'inherit',
          }}
        >
          Enviar →
        </button>
      </div>
    </div>
  );
}
