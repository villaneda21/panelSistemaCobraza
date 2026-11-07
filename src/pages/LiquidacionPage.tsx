import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { ErrorBlock, LoadingBlock, TruncationNote } from '../components/ui/Feedback';
import { Filters } from '../components/ui/Filters';
import { PageHeader } from '../components/ui/PageHeader';
import { errorMessage, getExpenses, getPayments, getRoutes, getSettlements } from '../lib/api';
import { PAGE_SIZE, formatMoney, inRange, monthRange, paginate } from '../lib/format';
import { buildClosures } from '../lib/settlement';
import type { ExpenseItem, PaymentItem, RouteItem, SettlementItem } from '../types';

const closureTone = {
  cuadrada: 'emerald',
  diferencia: 'amber',
  sin_registro: 'slate',
} as const;

const closureLabel = {
  cuadrada: 'Cuadrada',
  diferencia: 'Con diferencia',
  sin_registro: 'Sin registro',
} as const;

export function LiquidacionPage() {
  const initial = monthRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [routeId, setRouteId] = useState('');
  const [page, setPage] = useState(1);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
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
      getSettlements(query, controller.signal),
    ])
      .then(([nextRoutes, nextPayments, nextExpenses, nextSettlements]) => {
        setRoutes(nextRoutes.rows);
        setPayments(nextPayments.rows);
        setExpenses(nextExpenses.rows);
        setSettlements(nextSettlements.rows);
        setTruncated([nextRoutes, nextPayments, nextExpenses, nextSettlements].some((result) => result.truncated));
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

  const rows = useMemo(
    () =>
      buildClosures({
        routes,
        payments: payments.filter((item) => inRange(item.date, from, to)),
        expenses: expenses.filter((item) => inRange(item.date, from, to)),
        settlements: settlements.filter((item) => inRange(item.date, from, to)),
        routeId,
      }),
    [routes, payments, expenses, settlements, from, to, routeId],
  );

  const totals = rows.reduce(
    (acc, row) => ({
      collected: acc.collected + row.collected,
      expenses: acc.expenses + row.expenses,
      profit: acc.profit + row.profit,
    }),
    { collected: 0, expenses: 0, profit: 0 },
  );
  const paged = paginate(rows, page, PAGE_SIZE);

  return (
    <div>
      <PageHeader
        eyebrow="Liquidación"
        title="Cierre de caja por ruta"
        description="Utilidad = recaudo del período − gastos operativos. El efectivo calculado se contrasta con la liquidación registrada, cuando existe."
      />
      <Filters
        from={from}
        to={to}
        routeId={routeId}
        routes={routes}
        onFrom={(value) => {
          setFrom(value);
          setPage(1);
        }}
        onTo={(value) => {
          setTo(value);
          setPage(1);
        }}
        onRoute={(value) => {
          setRouteId(value);
          setPage(1);
        }}
      />
      <TruncationNote show={!loading && !error && truncated} />
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : (
        <>
          <section className="mb-4 grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            <div>
              <p className="text-xs text-slate-500">Recaudado</p>
              <p className="mt-1 text-xl font-semibold tabular text-slate-950">{formatMoney(totals.collected)}</p>
            </div>
            <p className="hidden text-slate-300 md:block">−</p>
            <div>
              <p className="text-xs text-slate-500">Gastos</p>
              <p className="mt-1 text-xl font-semibold tabular text-slate-950">{formatMoney(totals.expenses)}</p>
            </div>
            <p className="hidden text-slate-300 md:block">=</p>
            <div>
              <p className="text-xs text-slate-500">Utilidad</p>
              <p className={`mt-1 text-xl font-semibold tabular ${totals.profit < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                {formatMoney(totals.profit)}
              </p>
            </div>
          </section>
          <DataTable
            columns={[
              { key: 'route', header: 'Ruta', render: (row) => <span className="font-medium text-slate-950">{row.routeName}</span> },
              { key: 'collected', header: 'Recaudado', align: 'right', render: (row) => formatMoney(row.collected) },
              { key: 'expenses', header: 'Gastos', align: 'right', render: (row) => formatMoney(row.expenses) },
              {
                key: 'profit',
                header: 'Utilidad',
                align: 'right',
                render: (row) => <span className={row.profit < 0 ? 'font-medium text-rose-700' : 'font-medium text-slate-950'}>{formatMoney(row.profit)}</span>,
              },
              { key: 'cash', header: 'Efectivo calculado', align: 'right', render: (row) => formatMoney(row.profit) },
              {
                key: 'registered',
                header: 'Liquidación registrada',
                align: 'right',
                render: (row) => (row.registeredCash === null ? '—' : formatMoney(row.registeredCash)),
              },
              {
                key: 'diff',
                header: 'Diferencia',
                align: 'right',
                render: (row) => (row.difference === null ? '—' : formatMoney(row.difference)),
              },
              { key: 'moves', header: 'Pagos', align: 'right', render: (row) => row.movements },
              {
                key: 'status',
                header: 'Estado',
                render: (row) => (
                  <span className="inline-flex flex-col items-start gap-1">
                    <Badge tone={closureTone[row.status]}>{closureLabel[row.status]}</Badge>
                    {row.status !== 'sin_registro' && <span className="text-[11px] text-slate-400">{row.registeredLabel}</span>}
                  </span>
                ),
              },
            ]}
            rows={paged.slice}
            rowKey={(row) => row.id}
            page={paged.page}
            pages={paged.pages}
            total={paged.total}
            start={paged.start}
            end={paged.end}
            onPage={setPage}
          />
        </>
      )}
    </div>
  );
}
