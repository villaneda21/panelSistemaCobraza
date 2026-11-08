import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { HandCoins, PieChart, Receipt, Wallet } from 'lucide-react';
import { MoneyTooltip } from '../components/charts/MoneyTooltip';
import { DataTable } from '../components/ui/DataTable';
import { ErrorBlock, LoadingBlock } from '../components/ui/Feedback';
import { Filters } from '../components/ui/Filters';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { errorMessage, getRouteStats, getRoutes, getTodayDetails } from '../lib/api';
import { PAGE_SIZE, formatCompact, formatMoney, paginate } from '../lib/format';
import type { RouteItem, RouteStats, TodayExpense } from '../types';

type ExpenseRow = TodayExpense & { id: string };

const expenseColor = '#b45309';
const collectedColor = '#0f766e';

export function GastosPage() {
  const [routeId, setRouteId] = useState('');
  const [routePage, setRoutePage] = useState(1);
  const [todayPage, setTodayPage] = useState(1);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [stats, setStats] = useState<RouteStats[]>([]);
  const [today, setToday] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getRoutes(controller.signal)
      .then(async (nextRoutes) => {
        const [nextStats, details] = await Promise.all([
          Promise.all(nextRoutes.map((route) => getRouteStats(route, controller.signal))),
          getTodayDetails(controller.signal),
        ]);
        setRoutes(nextRoutes);
        setStats(nextStats);
        setToday(details.gastos.map((item, index) => ({ ...item, id: String(index) })));
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
    const ordered = [...stats].sort((a, b) => b.totalGastos - a.totalGastos);
    const selected = ordered.filter((item) => !routeId || item.routeId === routeId);
    const spent = selected.reduce((sum, item) => sum + item.totalGastos, 0);
    const collected = selected.reduce((sum, item) => sum + item.totalRecaudado, 0);
    const general = stats.reduce((sum, item) => sum + item.totalGastos, 0);
    const todayTotal = today.reduce((sum, item) => sum + item.monto, 0);
    const bars = ordered.map((item) => ({
      routeId: item.routeId,
      label: item.routeName,
      gastos: item.totalGastos,
      recaudado: item.totalRecaudado,
    }));
    const rows = selected.map((item) => ({
      ...item,
      share: general > 0 ? (item.totalGastos / general) * 100 : 0,
    }));
    return { spent, collected, general, todayTotal, bars, rows, net: collected - spent };
  }, [routeId, stats, today]);

  const routeRows = paginate(view.rows, routePage, PAGE_SIZE);
  const todayRows = paginate(today, todayPage, PAGE_SIZE);
  const chartHeight = Math.min(460, Math.max(240, view.bars.length * 44));

  return (
    <div>
      <PageHeader
        eyebrow="Gastos"
        title="Gastos generales y por ruta"
        description="El acumulado de cada ruta corre desde el último cierre manual. Abajo está el detalle de los gastos registrados hoy."
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
          setRoutePage(1);
        }}
      />
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Gastos del ciclo" value={formatMoney(view.spent)} hint={routeId ? 'Ruta seleccionada' : 'Suma de todas las rutas'} icon={<HandCoins className="h-4 w-4" />} tone="slate" />
            <StatCard label="Gasto de hoy" value={formatMoney(view.todayTotal)} hint={`${today.length} movimiento${today.length === 1 ? '' : 's'} del día`} icon={<Receipt className="h-4 w-4" />} />
            <StatCard label="Recaudado del ciclo" value={formatMoney(view.collected)} hint="Para contrastar con el gasto" icon={<Wallet className="h-4 w-4" />} tone="ink" />
            <StatCard
              label="Recaudo menos gasto"
              value={formatMoney(view.net)}
              hint={view.general > 0 && routeId ? `${((view.spent / view.general) * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })}% del gasto general` : 'Del mismo ciclo'}
              icon={<PieChart className="h-4 w-4" />}
              tone="rose"
              negative={view.net < 0}
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-950">Gasto por ruta</h2>
                <p className="text-xs text-slate-500">La barra marcada corresponde al filtro. El resto queda visible para comparar.</p>
              </div>
              <div style={{ height: chartHeight }}>
                {view.bars.length === 0 ? (
                  <p className="grid h-full place-items-center text-sm text-slate-400">Sin rutas para este usuario.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={view.bars} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                      <CartesianGrid horizontal={false} stroke="#eef2f6" />
                      <XAxis type="number" tickFormatter={formatCompact} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" width={108} tick={{ fill: '#334155', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<MoneyTooltip />} cursor={{ fill: 'rgba(180, 83, 9, 0.06)' }} />
                      <Bar dataKey="gastos" name="Gastos" radius={[0, 7, 7, 0]} maxBarSize={22}>
                        {view.bars.map((row) => (
                          <Cell key={row.routeId} fill={!routeId || row.routeId === routeId ? expenseColor : '#d6d3d1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Recaudo frente a gasto</h2>
                  <p className="text-xs text-slate-500">Misma escala, por ruta del ciclo</p>
                </div>
                <div className="flex gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: collectedColor }} />Recaudo</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: expenseColor }} />Gasto</span>
                </div>
              </div>
              <div className="h-80">
                {view.bars.length === 0 ? (
                  <p className="grid h-full place-items-center text-sm text-slate-400">Sin rutas para este usuario.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={view.bars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#eef2f6" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tickFormatter={formatCompact} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
                      <Tooltip content={<MoneyTooltip />} cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} />
                      <Bar dataKey="recaudado" name="Recaudo" fill={collectedColor} radius={[7, 7, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="gastos" name="Gasto" fill={expenseColor} radius={[7, 7, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>
          </section>

          <section className="mt-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-950">Participación por ruta</h2>
            <div className="mb-4 grid gap-3">
              {view.rows.length === 0 ? (
                <p className="rounded-2xl border border-slate-200/80 bg-white px-5 py-8 text-center text-sm text-slate-400 shadow-card">No hay gastos para el filtro.</p>
              ) : (
                view.rows.map((row) => (
                  <div key={row.routeId} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-card">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-950">{row.routeName}</span>
                      <span className="tabular text-slate-700">{formatMoney(row.totalGastos)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-amber-700" style={{ width: `${Math.min(100, row.share)}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">{row.share.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% del gasto general · {row.collector}</p>
                  </div>
                ))
              )}
            </div>
            <DataTable
              columns={[
                { key: 'route', header: 'Ruta', render: (row) => <span className="font-medium text-slate-950">{row.routeName}</span> },
                { key: 'collector', header: 'Cobrador', render: (row) => row.collector },
                { key: 'expenses', header: 'Gastos', align: 'right', render: (row) => formatMoney(row.totalGastos) },
                { key: 'share', header: 'Parte', align: 'right', render: (row) => `${row.share.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%` },
                { key: 'collected', header: 'Recaudado', align: 'right', render: (row) => formatMoney(row.totalRecaudado) },
                { key: 'cash', header: 'En caja', align: 'right', render: (row) => formatMoney(row.dineroEnCaja) },
              ]}
              rows={routeRows.slice}
              rowKey={(row) => row.routeId}
              page={routeRows.page}
              pages={routeRows.pages}
              total={routeRows.total}
              start={routeRows.start}
              end={routeRows.end}
              onPage={setRoutePage}
            />
          </section>

          <section className="mt-6">
            <h2 className="mb-1 text-sm font-semibold text-slate-950">Gastos de hoy</h2>
            <p className="mb-3 text-xs text-slate-500">El servicio entrega estos movimientos del día sin separarlos por ruta.</p>
            <DataTable
              columns={[
                { key: 'concept', header: 'Descripción', render: (row) => <span className="font-medium text-slate-950">{row.descripcion}</span> },
                { key: 'hour', header: 'Hora', render: (row) => row.hora },
                { key: 'amount', header: 'Monto', align: 'right', render: (row) => formatMoney(row.monto) },
              ]}
              rows={todayRows.slice}
              minWidth={560}
              rowKey={(row) => row.id}
              page={todayRows.page}
              pages={todayRows.pages}
              total={todayRows.total}
              start={todayRows.start}
              end={todayRows.end}
              onPage={setTodayPage}
            />
          </section>
        </>
      )}
    </div>
  );
}
