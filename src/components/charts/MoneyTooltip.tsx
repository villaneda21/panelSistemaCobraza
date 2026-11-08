import { formatMoney } from '../../lib/format';

export function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string; name?: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-card">
      {label ? <p className="text-xs text-slate-500">{label}</p> : null}
      <div className={label ? 'mt-1 space-y-1' : 'space-y-1'}>
        {payload.map((entry) => (
          <p key={`${entry.name ?? 'valor'}-${entry.value}`} className="flex items-center gap-2 text-sm font-semibold tabular text-slate-950">
            {payload.length > 1 && entry.color ? <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} /> : null}
            {payload.length > 1 && entry.name ? <span className="font-medium text-slate-500">{entry.name}</span> : null}
            {formatMoney(Number(entry.value ?? 0))}
          </p>
        ))}
      </div>
    </div>
  );
}
