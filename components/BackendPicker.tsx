'use client';

import { useState } from 'react';
import type { BackendId } from '../types';
import { BACKENDS } from '../lib/quantum-backends';

interface Props {
  selected: BackendId;
  onChange: (id: BackendId) => void;
  configuredBackends: Set<BackendId>;
}

export function BackendPicker({ selected, onChange, configuredBackends }: Props) {
  const [showSetup, setShowSetup] = useState(false);
  const realBackends = BACKENDS.filter(b => b.id !== 'local' && configuredBackends.has(b.id));
  const hasReal = realBackends.length > 0;
  const isLocal = selected === 'local';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onChange('local')}
          className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl border font-medium transition-all"
          style={{
            background: isLocal ? '#2a7a50' : '#ffffff',
            borderColor: isLocal ? '#2a7a50' : '#cfc0a0',
            color: isLocal ? '#fff' : '#5a6a58',
          }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isLocal ? 'rgba(255,255,255,0.7)' : '#2a7a50' }} />
          Simulación instantánea
        </button>

        {hasReal ? (
          realBackends.map(b => (
            <button
              key={b.id}
              onClick={() => onChange(b.id)}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl border font-medium transition-all"
              style={{
                background: selected === b.id ? b.color : '#ffffff',
                borderColor: selected === b.id ? b.color : '#cfc0a0',
                color: selected === b.id ? '#fff' : '#5a6a58',
              }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selected === b.id ? 'rgba(255,255,255,0.7)' : b.color }} />
              {b.label}
              <span className="text-[9px] opacity-60">{b.latency}</span>
            </button>
          ))
        ) : (
          <button
            onClick={() => setShowSetup(s => !s)}
            className="text-xs px-3 py-2 rounded-xl border transition-all hover:border-[#2a7a50] hover:text-[#2a7a50]"
            style={{ borderColor: '#cfc0a0', color: '#9aaa90', background: 'transparent', borderStyle: 'dashed' }}
          >
            + Conectar hardware cuántico real
          </button>
        )}
      </div>

      {showSetup && !hasReal && (
        <div className="rounded-xl border p-4 space-y-3 animate-fadeIn" style={{ background: '#f8f4ed', borderColor: '#e2d8c4' }}>
          <p className="text-xs font-semibold" style={{ color: '#1a2e20' }}>Conectar hardware cuántico real</p>
          <p className="text-xs" style={{ color: '#5a6a58' }}>
            Añade estas variables en{' '}
            <code className="px-1 py-0.5 rounded text-[11px]" style={{ background: '#e4dccf' }}>.env.local</code>{' '}
            y reinicia el servidor:
          </p>
          <div className="rounded-lg p-3 font-mono text-[11px] space-y-1 leading-relaxed" style={{ background: '#1a2e20', color: '#3d9a68' }}>
            <p className="opacity-40 text-[10px]"># IBM Quantum — cloud.ibm.com</p>
            <p>IBM_QUANTUM_TOKEN=tu_api_key</p>
            <p>IBM_QUANTUM_CRN=crn:v1:bluemix:...</p>
            <p className="mt-2 opacity-40 text-[10px]"># IonQ — cloud.ionq.com/settings/api-keys</p>
            <p>IONQ_API_KEY=tu_api_key</p>
          </div>
          <p className="text-[10px]" style={{ color: '#9aaa90' }}>
            IBM ofrece acceso gratuito limitado · IonQ requiere cuenta de pago para QPU real
          </p>
        </div>
      )}
    </div>
  );
}
