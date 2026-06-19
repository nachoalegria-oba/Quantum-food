import type { FermentationType } from '../../types';

const styles: Record<FermentationType, { bg: string; color: string; border: string }> = {
  koji:     { bg: '#e8f5ee', color: '#0f4a20', border: '#a0d4b4' },
  miso:     { bg: '#fff3e0', color: '#6a3a00', border: '#f0c070' },
  kefir:    { bg: '#e8f0ff', color: '#003a6a', border: '#90b4f0' },
  kombucha: { bg: '#f3e8ff', color: '#4a0068', border: '#c090e0' },
  lacto:    { bg: '#f0f8e8', color: '#3a5a00', border: '#a8d070' },
  beverage: { bg: '#fff0e8', color: '#6a2000', border: '#f0a880' },
  general:  { bg: '#f0f0f0', color: '#404040', border: '#c0c0c0' },
};

export function Tag({ type }: { type: FermentationType }) {
  const s = styles[type] ?? styles.general;
  return (
    <span
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
      className="inline-block text-[9px] px-2 py-0.5 rounded-full border font-semibold tracking-widest uppercase flex-shrink-0 leading-none"
    >
      {type}
    </span>
  );
}
