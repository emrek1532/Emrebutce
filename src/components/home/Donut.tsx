import React from 'react';

// Basit halka grafik: dilimler sırayla çizilir, ortasına içerik konur
export const Donut: React.FC<{
  segments: { value: number; color: string }[];
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}> = ({ segments, size = 160, stroke = 22, children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-neutral-100 dark:stroke-neutral-800" />
        {total > 0 &&
          segments.map((s, i) => {
            const len = (Math.max(0, s.value) / total) * c;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">{children}</div>
    </div>
  );
};

// Küçük çizgi grafik (son aylar)
export const Sparkline: React.FC<{ values: number[]; className?: string; stroke?: string }> = ({ values, className = '', stroke = 'currentColor' }) => {
  if (values.length < 2) return null;
  const w = 120;
  const h = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className}>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={stroke} opacity={0.12} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

// Küçük sütun grafik (kutuların sağ altında)
export const MiniBars: React.FC<{ values: number[]; className?: string }> = ({ values, className = '' }) => {
  const max = Math.max(...values, 1);
  return (
    <div className={`flex items-end gap-1 ${className}`}>
      {values.map((v, i) => (
        <div key={i} className="w-2 sm:w-2.5 rounded-t bg-white/35" style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
};
