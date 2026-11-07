import { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, HandCoins, TrendingUp, TriangleAlert } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Filters } from '../components/ui/Filters';
import { ErrorBlock, LoadingBlock, TruncationNote } from '../components/ui/Feedback';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { MoneyTooltip } from '../components/charts/MoneyTooltip';
import { errorMessage, getDebts, getExpenses, getPayments, getRoutes } from '../lib/api';
import { dayKey, eachDay, formatCompact, formatMoney, formatShortDay, inRange, monthRange } from '../lib/format';
import type { DebtItem, ExpenseItem, PaymentItem, RouteItem } from '../types';

export function DashboardPage() {
  const initial = monthRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [routeId, setRouteId] = useState('');
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const query = { from, to, routeId };
    Promise.all([
      getRoutes(controller.signal),
      getPayments(query, controller.signal),
      getExpenses(query, controller.signal),
      getDebts(query, controller.signal),
    ])
      .then(([nextRoutes, nextPayments, nextExpenses, nextDebts]) => {
        setRoutes(nextRoutes.rows);
        setPayments(nextPayments.rows);
        setExpenses(nextExpenses.rows);
        setDebts(nextDebts.rows);
        setTruncated([nextRoutes, nextPayments, nextExpenses, nextDebts].some((result) => result.truncated));
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(caught));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [from, to, routeId, reloadKey]);

  const view = useMemo(() => {
    const routePayments = payments.filter((item) => (!routeId || item.routeId === routeId) && inRange(item.date, from, to));
    const routeExpenses = expenses.filter((item) => (!routeId || item.routeId === routeId) && inRange(item.date, from, to));
    const routeDebts = debts.filter((item) => !routeId || item.routeId === routeId);
    const collected = routePayments.reduce((sum, item) => sum + item.amount, 0);
    const spent = routeExpenses.reduce((sum, item) => sum + item.amount, 0);
    const mora = routeDebts.filter((item) => item.status === 'mora').reduce((sum, item) => sum + item.balance, 0);
    const names = new Map(routes.map((route) => [route.id, route.name]));

    const byRoute = new Map<string, number>();
    for (const payment of routePayments) {
      const key = payment.routeId || 'sin-ruta';
      byRoute.set(key, (byRoute.get(key) ?? 0) + payment.amount);
    }
    const bars = [...byRoute.entries()]
      .map(([id, total]) => ({ label: names.get(id) ?? (id === 'sin-ruta' ? 'Sin ruta' : id), total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const byDay = new Map<string, number>();
    for (const payment of routePayments) {
      const day = dayKey(payment.date);
      if (!day) continue;
      byDay.set(day, (byDay.get(day) ?? 0) + payment.amount);
    }
    const line = eachDay(from, to).map((day) => ({
      label: formatShortDay(day),
      total: byDay.get(day) ?? 0,
    }));

    return {
      collected,
      spent,
      profit: collected - spent,
      mora,
      operations: routePayments.length,
      average: routePayments.length ? collected / routePayments.length : 0,
      activeRoutes: byRoute.size,
      openDebts: routeDebts.filter((item) => item.status !== 'saldada').length,
      bars,
      line,
    };
  }, [payments, expenses, debts, routes, from, to, routeId]);

  return (
    <div>
      <PageHeader
        eyebrow="Resumen"
        title="Tablero ejecutivo"
        description="Recaudo, gasto operativo y utilidad del período. Las cifras salen de los pagos, gastos y deudas consultados."
      />
      <Filters
        from={from}
        to={to}
        routeId={routeId}
        routes={routes}
        onFrom={(value) => setFrom(value)}
        onTo={(value) => setTo(value)}
        onRoute={(value) => setRouteId(value)}
      />
      <TruncationNote show={!loading && !error && truncated} />
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total recaudado" value={formatMoney(view.collected)} hint="Pagos del rango seleccionado" icon={<CircleDollarSign className="h-4 w-4" />} tone="emerald" />
            <StatCard label="Total gastos" value={formatMoney(view.spent)} hint="Gastos operativos de campo" icon={<HandCoins className="h-4 w-4" />} tone="slate" />
            <StatCard label="Utilidad" value={formatMoney(view.profit)} hint="Recaudo menos gastos" icon={<TrendingUp className="h-4 w-4" />} tone="ink" negative={view.profit < 0} />
            <StatCard label="Cartera en mora" value={formatMoney(view.mora)} hint={`${view.openDebts} obligaciones abiertas`} icon={<TriangleAlert className="h-4 w-4" />} tone="rose" />
          </section>

          <section className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              ['Operaciones', String(view.operations), 'Pagos registrados'],
              ['Ticket promedio', formatMoney(view.average), 'Recaudo por pago'],
              ['Rutas con recaudo', String(view.activeRoutes), 'En el período'],
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
                <p className="text-xs text-slate-500">Barras de las rutas con mayor recaudo</p>
              </div>
              <div className="h-72">
                {view.bars.length === 0 ? (
                  <p className="grid h-full place-items-center text-sm text-slate-400">Sin pagos en este rango.</p>
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
                <h2 className="text-sm font-semibold text-slate-950">Historial de recaudo</h2>
                <p className="text-xs text-slate-500">Evolución diaria dentro del rango</p>
              </div>
              <div className="h-72">
                {view.line.length === 0 ? (
                  <p className="grid h-full place-items-center text-sm text-slate-400">Defina un rango de fechas válido.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={view.line} margin={{ top: 8, right: 28, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#eef2f6" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} interval={view.line.length > 12 ? Math.ceil(view.line.length / 7) : 0} padding={{ left: 8, right: 12 }} />
                      <YAxis tickFormatter={formatCompact} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
                      <Tooltip content={<MoneyTooltip />} />
                      <Line type="monotone" dataKey="total" stroke="#17324c" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
