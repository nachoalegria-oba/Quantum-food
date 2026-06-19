'use client';

import type { BackendId, BackendMeta } from '../types';
import { BACKENDS } from '../lib/quantum-backends';

interface Props {
  selected: BackendId;
  onChange: (id: BackendId) => void;
  configuredBackends: Set<BackendId>;
}

const PROVIDER_DOTS: Record<string, string> = {
  local: '#2a7a50',
  ibm:   '#0f62fe',
  ionq:  '#7040b0',
};

export function BackendPicker({ selected, onChange, configuredBackends }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-widest flex-shrink-0 mr-0.5" style={{ color: '#9aaa90' }}>
        Backend
      </span>
      {BACKENDS.map((b: BackendMeta) => {
        const available = b.id === 'local' || configuredBackends.has(b.id);
        const active = selected === b.id;
        return (
          <button
            key={b.id}
            onClick={() => available && onChange(b.id)}
            disabled={!available}
            title={available ? `${b.sublabel} · ${b.latency}` : `Requiere: ${b.envKeys.join(', ')}`}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full border font-medium transition-all"
            style={{
              background: active ? b.color : 'transparent',
              borderColor: active ? b.color : available ? '#cfc0a0' : '#e2d8c4',
              color: active ? '#ffffff' : available ? '#1a2e20' : '#b0b8ae',
              opacity: available ? 1 : 0.45,
              cursor: available ? 'pointer' : 'not-allowed',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: active ? 'rgba(255,255,255,0.65)' : PROVIDER_DOTS[b.provider] ?? b.color }}
            />
            <span>{b.label}</span>
            <span
              className="text-[8px] leading-none"
              style={{ opacity: active ? 0.75 : 0.55 }}
            >
              {b.latency}
            </span>
          </button>
        );
      })}
    </div>
  );
}
