import { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, HandCoins, Landmark, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MoneyTooltip } from '../components/charts/MoneyTooltip';
import { DataTable } from '../components/ui/DataTable';
import { ErrorBlock, LoadingBlock } from '../components/ui/Feedback';
import { Filters } from '../components/ui/Filters';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { errorMessage, getDashboardSummary, getRouteStats, getRoutes, getTodayDetails, summaryFromStats } from '../lib/api';
import { PAGE_SIZE, formatCompact, formatMoney, paginate } from '../lib/format';
import type { DashboardSummary, RouteItem, RouteStats, TodayDetails } from '../types';

const emptySummary: DashboardSummary = {
  baseInyectada: 0,
  cobrado: 0,
  prestado: 0,
  gastos: 0,
  cartera: 0,
  dineroEnCaja: 0,
};

export function DashboardPage() {
  const [routeId, setRouteId] = useState('');
  const [page, setPage] = useState(1);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [stats, setStats] = useState<RouteStats[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [today, setToday] = useState<TodayDetails>({ pagos: [], prestamos: [], gastos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getRoutes(controller.signal)
      .then(async (nextRoutes) => {
        const [nextStats, nextSummary, nextToday] = await Promise.all([
          Promise.all(nextRoutes.map((route) => getRouteStats(route, controller.signal))),
          getDashboardSummary(controller.signal),
          getTodayDetails(controller.signal),
        ]);
        setRoutes(nextRoutes);
        setStats(nextStats);
        setSummary(nextSummary);
        setToday(nextToday);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(caught));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  const view = useMemo(() => {
    const selected = stats.find((item) => item.routeId === routeId);
    const cards = selected ? summaryFromStats(selected) : summary;
    const bars = [...stats]
      .sort((a, b) => b.totalRecaudado - a.totalRecaudado)
      .slice(0, 8)
      .map((item) => ({ label: item.routeName, total: item.totalRecaudado }));
    const byHour = new Map<string, number>();
    for (const payment of today.pagos) {
      const hour = payment.hora.slice(0, 2) || payment.hora;
      byHour.set(hour, (byHour.get(hour) ?? 0) + payment.monto);
    }
    const line = [...byHour.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, total]) => ({ label: `${hour}:00`, total }));
    return { cards, bars, line };
  }, [routeId, stats, summary, today.pagos]);

  const payments = paginate(today.pagos, page, PAGE_SIZE);

  return (
    <div>
      <PageHeader
        eyebrow="Resumen"
        title="Tablero ejecutivo"
        description="Cifras de /dashboard/resumen y de /rutas/{id}/estadisticas. El recaudo y la venta corresponden al ciclo desde el último corte."
      />
      <Filters
        showDates={false}
        from=""
        to=""
        routeId={routeId}
        routes={routes}
        onFrom={() => undefined}
        onTo={() => undefined}
        onRoute={(value) => {
          setRouteId(value);
          setPage(1);
        }}
      />
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Recaudado del ciclo" value={formatMoney(view.cards.cobrado)} hint="Pagos desde el último corte" icon={<CircleDollarSign className="h-4 w-4" />} />
            <StatCard label="Gastos del ciclo" value={formatMoney(view.cards.gastos)} hint="Desde el último cierre manual" icon={<HandCoins className="h-4 w-4" />} tone="slate" />
            <StatCard label="Dinero en caja" value={formatMoney(view.cards.dineroEnCaja)} hint="Base, recaudo, ventas y gastos" icon={<Landmark className="h-4 w-4" />} tone="ink" negative={view.cards.dineroEnCaja < 0} />
            <StatCard label="Cartera activa" value={formatMoney(view.cards.cartera)} hint="Saldo de deudas activas" icon={<Wallet className="h-4 w-4" />} tone="rose" />
          </section>
          <section className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              ['Prestado en el ciclo', formatMoney(view.cards.prestado), 'Capital colocado desde el corte'],
              ['Base inyectada', formatMoney(view.cards.baseInyectada), 'Capital neto de la ruta'],
              ['Pagos de hoy', String(today.pagos.length), 'Movimientos del día'],
            ].map(([label, value, hint]) => (
              <article key={label} className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-card">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular text-slate-950">{value}</p>
                <p className="text-xs text-slate-400">{hint}</p>
              </article>
            ))}
          </section>
          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-950">Recaudo por ruta</h2>
                <p className="text-xs text-slate-500">Total recaudado del ciclo en cada ruta</p>
              </div>
              <div className="h-72">
                {view.bars.length === 0 ? (
                  <p className="grid h-full place-items-center text-sm text-slate-400">Sin rutas para este usuario.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={view.bars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#eef2f6" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tickFormatter={formatCompact} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
                      <Tooltip content={<MoneyTooltip />} cursor={{ fill: 'rgba(15, 118, 110, 0.06)' }} />
                      <Bar dataKey="total" fill="#0f766e" radius={[7, 7, 0, 0]} maxBarSize={42} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-950">Pagos de hoy</h2>
                <p className="text-xs text-slate-500">Detalle horario de /dashboard/detalles_hoy</p>
              </div>
              <div className="h-72">
                {view.line.length === 0 ? (
                  <p className="grid h-full place-items-center text-sm text-slate-400">Hoy no hay pagos registrados.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={view.line} margin={{ top: 8, right: 28, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#eef2f6" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} padding={{ left: 8, right: 12 }} />
                      <YAxis tickFormatter={formatCompact} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
                      <Tooltip content={<MoneyTooltip />} />
                      <Line type="monotone" dataKey="total" stroke="#17324c" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>
          </section>
          <section className="mt-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-950">Recaudo registrado hoy</h2>
            <DataTable
              columns={[
                { key: 'client', header: 'Cliente', render: (row) => <span className="font-medium text-slate-950">{row.cliente}</span> },
                { key: 'hour', header: 'Hora', render: (row) => row.hora },
                { key: 'debt', header: 'Deuda', render: (row) => row.deudaId || '—' },
                { key: 'amount', header: 'Monto', align: 'right', render: (row) => formatMoney(row.monto) },
              ]}
              rows={payments.slice}
              rowKey={(row) => `${row.deudaId}-${row.hora}-${row.monto}`}
              page={payments.page}
              pages={payments.pages}
              total={payments.total}
              start={payments.start}
              end={payments.end}
              onPage={setPage}
            />
          </section>
        </>
      )}
    </div>
  );
}
