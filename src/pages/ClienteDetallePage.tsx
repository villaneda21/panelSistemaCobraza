import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CircleDollarSign, HandCoins, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MoneyTooltip } from '../components/charts/MoneyTooltip';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { ErrorBlock, LoadingBlock } from '../components/ui/Feedback';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { errorMessage, getClientProfile } from '../lib/api';
import { PAGE_SIZE, dayKey, formatCompact, formatDate, formatMoney, formatShortDay, paginate } from '../lib/format';
import type { ClientDebt, ClientItem, ClientPayment, DebtStatus } from '../types';

const statusLabel: Record<DebtStatus, string> = {
  saldada: 'Deuda saldada',
  mora: 'En mora',
  vigente: 'Vigente',
  parcial: 'Pago parcial',
};

const statusTone: Record<DebtStatus, 'emerald' | 'rose' | 'sky' | 'amber'> = {
  saldada: 'emerald',
  mora: 'rose',
  vigente: 'sky',
  parcial: 'amber',
};

export function ClienteDetallePage() {
  const { clientId = '' } = useParams();
  const [client, setClient] = useState<ClientItem | null>(null);
  const [debts, setDebts] = useState<ClientDebt[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getClientProfile(clientId, controller.signal)
      .then((profile) => {
        setClient(profile.client);
        setDebts(profile.debts);
        setSelectedId((current) => {
          if (profile.debts.some((debt) => debt.id === current)) return current;
          return profile.debts.find((debt) => debt.status !== 'saldada')?.id ?? profile.debts[0]?.id ?? '';
        });
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setClient(null);
        setDebts([]);
        setError(errorMessage(caught, 'No fue posible cargar el cliente.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [clientId, reloadKey]);

  const selected = debts.find((debt) => debt.id === selectedId) ?? null;
  const payments = useMemo(() => {
    const source: ClientPayment[] = selected ? selected.payments : debts.flatMap((debt) => debt.payments);
    return [...source].sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''));
  }, [debts, selected]);

  const summary = useMemo(() => {
    const active = debts.filter((debt) => debt.status !== 'saldada');
    const balance = active.reduce((sum, debt) => sum + debt.balance, 0);
    const paid = debts.reduce((sum, debt) => sum + debt.paid, 0);
    const lateDays = debts.reduce((max, debt) => Math.max(max, debt.lateDays), 0);
    const covered = paid + balance;
    const progress = covered > 0 ? Math.min(100, (paid / covered) * 100) : 0;
    const byDay = new Map<string, number>();
    for (const payment of payments) {
      const key = dayKey(payment.paidAt);
      if (!key) continue;
      byDay.set(key, (byDay.get(key) ?? 0) + payment.amount);
    }
    const bars = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, total]) => ({ label: formatShortDay(key), total }));
    return { balance, paid, lateDays, progress, bars, activeCount: active.length };
  }, [debts, payments]);

  const paged = paginate(payments, page, PAGE_SIZE);
  const debtName = new Map(debts.map((debt) => [debt.id, debt.description || `Deuda ${debt.id}`]));

  return (
    <div>
      <Link to="/clientes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" />
        Clientes
      </Link>
      <PageHeader
        eyebrow="Resumen del cliente"
        title={client?.fullName ?? 'Cliente'}
        description="Deudas y pagos de esta persona. Elija una deuda para ver solo sus abonos, o deje todas para el historial completo."
      />
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : client ? (
        <>
          <section className="mb-4 grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Cédula', client.document],
              ['Teléfono', client.phone],
              ['Dirección', client.address],
              ['Ruta', client.routeName],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-medium text-slate-950">{value}</p>
              </div>
            ))}
          </section>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Saldo pendiente" value={formatMoney(summary.balance)} hint={`${summary.activeCount} deuda${summary.activeCount === 1 ? '' : 's'} activa${summary.activeCount === 1 ? '' : 's'}`} icon={<Wallet className="h-4 w-4" />} tone="rose" />
            <StatCard label="Total pagado" value={formatMoney(summary.paid)} hint="Suma de los abonos registrados" icon={<CircleDollarSign className="h-4 w-4" />} />
            <StatCard label="Atraso" value={summary.lateDays > 0 ? `${summary.lateDays} días` : 'Sin atraso'} hint="Mayor atraso entre sus deudas" icon={<CalendarClock className="h-4 w-4" />} tone="slate" />
            <StatCard label="Avance de pago" value={`${summary.progress.toLocaleString('es-CO', { maximumFractionDigits: 0 })}%`} hint="Pagado sobre pagado más saldo" icon={<HandCoins className="h-4 w-4" />} tone="ink" />
          </section>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-emerald-700" style={{ width: `${summary.progress}%` }} />
          </div>

          <section className="mt-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-950">Deudas</h2>
            {debts.length === 0 ? (
              <p className="rounded-2xl border border-slate-200/80 bg-white px-5 py-8 text-center text-sm text-slate-400 shadow-card">Este cliente no tiene deudas registradas.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {debts.map((debt) => {
                  const active = debt.id === selectedId;
                  return (
                    <button
                      key={debt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setSelectedId(debt.id);
                        setPage(1);
                      }}
                      className={`rounded-2xl border bg-white p-4 text-left shadow-card transition ${active ? 'border-emerald-700 ring-2 ring-emerald-700/20' : 'border-slate-200/80 hover:border-slate-300'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-950">{debt.description}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Deuda {debt.id || '—'}
                            {debt.frequency ? ` · ${debt.frequency}` : ''}
                            {debt.service ? ` · ${debt.service}` : ''}
                          </p>
                        </div>
                        <Badge tone={statusTone[debt.status]}>{statusLabel[debt.status]}</Badge>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <div>
                          <dt className="text-xs text-slate-500">Saldo</dt>
                          <dd className="font-medium tabular text-slate-950">{formatMoney(debt.balance)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Pagado</dt>
                          <dd className="tabular text-slate-700">{formatMoney(debt.paid)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Cuota</dt>
                          <dd className="tabular text-slate-700">{formatMoney(debt.installmentValue)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Cuotas</dt>
                          <dd className="tabular text-slate-700">{debt.pendingInstallments} de {debt.installmentsTotal}</dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-xs text-slate-500">
                        Inicio {formatDate(debt.startDate)} · Fin estimado {formatDate(debt.endDate)}
                        {debt.lateDays > 0 ? ` · ${debt.lateDays} días de atraso` : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Pagos en el tiempo</h2>
                <p className="text-xs text-slate-500">{selected ? selected.description : 'Todas las deudas'}</p>
              </div>
              <button
                type="button"
                className="h-9 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setSelectedId('');
                  setPage(1);
                }}
              >
                Ver todos los pagos
              </button>
            </div>
            <div className="h-64">
              {summary.bars.length === 0 ? (
                <p className="grid h-full place-items-center text-sm text-slate-400">Esta selección no tiene pagos.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.bars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#eef2f6" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatCompact} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
                    <Tooltip content={<MoneyTooltip />} cursor={{ fill: 'rgba(15, 118, 110, 0.06)' }} />
                    <Bar dataKey="total" name="Pagos" fill="#0f766e" radius={[7, 7, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="mt-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-950">Detalle de pagos</h2>
            <DataTable
              columns={[
                { key: 'date', header: 'Fecha', render: (row) => formatDate(row.paidAt) },
                { key: 'debt', header: 'Deuda', render: (row) => debtName.get(row.debtId) ?? `Deuda ${row.debtId}` },
                { key: 'amount', header: 'Monto', align: 'right', render: (row) => <span className="font-medium text-slate-950">{formatMoney(row.amount)}</span> },
              ]}
              rows={paged.slice}
              minWidth={640}
              rowKey={(row) => row.id}
              page={paged.page}
              pages={paged.pages}
              total={paged.total}
              start={paged.start}
              end={paged.end}
              onPage={setPage}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
