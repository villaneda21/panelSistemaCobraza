import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'emerald',
  negative = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: 'emerald' | 'slate' | 'ink' | 'rose';
  negative?: boolean;
}) {
  const iconTone = {
    emerald: 'bg-emerald-50 text-emerald-800',
    slate: 'bg-slate-100 text-slate-700',
    ink: 'bg-ink-900 text-white',
    rose: 'bg-rose-50 text-rose-800',
  }[tone];

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconTone}`}>{icon}</span>
      </div>
      <p className={`mt-4 text-[1.65rem] font-semibold leading-none tracking-tight tabular ${negative ? 'text-rose-700' : 'text-slate-950'}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </article>
  );
}
