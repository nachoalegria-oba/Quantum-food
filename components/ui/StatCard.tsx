interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  color?: string;
}

export function StatCard({ label, value, unit, sub, color = '#1a2e20' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border p-4 transition-shadow hover:shadow-md" style={{ borderColor: '#e2d8c4' }}>
      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#9aaa90' }}>{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-serif leading-none" style={{ color, fontFamily: 'Georgia, serif' }}>
          {value}
        </span>
        {unit && <span className="text-xs font-normal" style={{ color: '#5a6a58' }}>{unit}</span>}
      </div>
      {sub && <p className="text-[9px] mt-1.5 leading-tight" style={{ color: '#9aaa90' }}>{sub}</p>}
    </div>
  );
}
