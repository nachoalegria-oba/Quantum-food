'use client';

import { useEffect, useRef } from 'react';
import { Spinner } from './ui/Spinner';

interface Props {
  protocol: string;
  loading: boolean;
  onClose: () => void;
}

export function ProtocolModal({ protocol, loading, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handlePrint() {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Protocolo Oba★</title>
      <style>
        body{font-family:Georgia,serif;max-width:640px;margin:40px auto;color:#1a2e20;line-height:1.7}
        h1{font-size:1.1rem;letter-spacing:.04em;border-bottom:2px solid #2a7a50;padding-bottom:.4em;margin-bottom:1.2em}
        pre{white-space:pre-wrap;font-family:Georgia,serif;font-size:.9rem}
        .footer{margin-top:2em;font-size:.75rem;color:#9aaa90;border-top:1px solid #e2d8c4;padding-top:.8em}
      </style>
    </head><body>
      <h1>Ørigenes Quantum Platform · Oba★</h1>
      <pre>${protocol.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      <div class="footer">Generado por Ørigenes Quantum Platform · ${new Date().toLocaleDateString('es-ES')}</div>
    </body></html>`);
    win.document.close();
    win.print();
  }

  function handleCopy() {
    void navigator.clipboard.writeText(protocol);
  }

  const lines = protocol.split('\n');
  const formatted = lines.map((line, i) => {
    if (line.startsWith('PROTOCOLO:')) return <p key={i} className="text-sm font-bold mb-3" style={{ color: '#1a2e20', fontFamily: 'Georgia, serif' }}>{line}</p>;
    if (/^(OBJETIVO|INGREDIENTES|PASOS|CONTROLES DE CALIDAD|NOTAS PARA EL EQUIPO)/.test(line))
      return <p key={i} className="text-[10px] uppercase tracking-widest mt-4 mb-1.5 font-semibold" style={{ color: '#2a7a50' }}>{line}</p>;
    if (/^\d+\./.test(line)) return <p key={i} className="text-xs mb-1 leading-relaxed pl-1" style={{ color: '#1a2e20' }}>{line}</p>;
    if (line.startsWith('•')) return <p key={i} className="text-xs mb-1 leading-relaxed pl-1" style={{ color: '#3d5a3e' }}>{line}</p>;
    if (line.trim() === '') return <div key={i} className="h-1" />;
    return <p key={i} className="text-xs leading-relaxed" style={{ color: '#5a6a58' }}>{line}</p>;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(26,46,32,0.6)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-fadeIn"
        style={{ background: '#f8f4ed', border: '1px solid #cfc0a0', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ background: '#1a2e20' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#f8f4ed', fontFamily: 'Georgia, serif' }}>Protocolo de fermentación</p>
            <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'rgba(248,244,237,0.4)' }}>Oba★ · Quantum R&D</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#f8f4ed' }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Spinner />
              <p className="text-xs" style={{ color: '#9aaa90' }}>Generando protocolo...</p>
            </div>
          ) : (
            <div>{formatted}</div>
          )}
        </div>

        {/* Footer actions */}
        {!loading && protocol && (
          <div className="flex gap-2 px-5 py-4 border-t flex-shrink-0" style={{ borderColor: '#e2d8c4' }}>
            <button
              onClick={handleCopy}
              className="flex-1 text-xs font-semibold rounded-xl px-4 py-2.5 transition-all border hover:border-[#2a7a50] hover:text-[#2a7a50]"
              style={{ background: '#ffffff', borderColor: '#cfc0a0', color: '#5a6a58' }}
            >
              Copiar texto
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 text-xs font-semibold rounded-xl px-4 py-2.5 transition-all"
              style={{ background: '#2a7a50', color: '#ffffff' }}
            >
              Imprimir →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
