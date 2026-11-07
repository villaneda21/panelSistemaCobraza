import type { ReactNode } from 'react';

const tones = {
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-700/15',
  rose: 'bg-rose-50 text-rose-800 ring-rose-700/15',
  amber: 'bg-amber-50 text-amber-900 ring-amber-700/15',
  sky: 'bg-sky-50 text-sky-900 ring-sky-800/15',
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/15',
  ink: 'bg-ink-900 text-white ring-ink-900',
} as const;

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}
