import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '../components/ui/DataTable';
import { ErrorBlock, LoadingBlock } from '../components/ui/Feedback';
import { Filters } from '../components/ui/Filters';
import { PageHeader } from '../components/ui/PageHeader';
import { errorMessage, getRouteStats, getRoutes } from '../lib/api';
import { PAGE_SIZE, formatMoney, paginate } from '../lib/format';
import type { RouteItem, RouteStats } from '../types';

export function LiquidacionPage() {
  const [routeId, setRouteId] = useState('');
  const [page, setPage] = useState(1);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [stats, setStats] = useState<RouteStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getRoutes(controller.signal)
      .then(async (nextRoutes) => {
        const nextStats = await Promise.all(nextRoutes.map((route) => getRouteStats(route, controller.signal)));
        setRoutes(nextRoutes);
        setStats(nextStats);
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

  const rows = useMemo(() => stats.filter((item) => !routeId || item.routeId === routeId), [stats, routeId]);
  const totals = rows.reduce(
    (acc, row) => ({
      collected: acc.collected + row.totalRecaudado,
      expenses: acc.expenses + row.totalGastos,
      cash: acc.cash + row.dineroEnCaja,
    }),
    { collected: 0, expenses: 0, cash: 0 },
  );
  const paged = paginate(rows, page, PAGE_SIZE);

  return (
    <div>
      <PageHeader
        eyebrow="Liquidación"
        title="Cierre de caja por ruta"
        description="Cada fila sale de GET /rutas/{id}/estadisticas. El recaudo corre desde el último corte y los gastos desde el último cierre manual. Cerrar el ciclo es POST /liquidar/ con ruta_id opcional; esta pantalla solo consulta."
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
          <section className="mb-4 grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card md:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Recaudado del ciclo</p>
              <p className="mt-1 text-xl font-semibold tabular text-slate-950">{formatMoney(totals.collected)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Gastos del ciclo</p>
              <p className="mt-1 text-xl font-semibold tabular text-slate-950">{formatMoney(totals.expenses)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Dinero en caja</p>
              <p className={`mt-1 text-xl font-semibold tabular ${totals.cash < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                {formatMoney(totals.cash)}
              </p>
            </div>
          </section>
          <DataTable
            columns={[
              { key: 'route', header: 'Ruta', render: (row) => <span className="font-medium text-slate-950">{row.routeName}</span> },
              { key: 'collector', header: 'Cobrador', render: (row) => row.collector },
              { key: 'sold', header: 'Vendido', align: 'right', render: (row) => formatMoney(row.totalVendido) },
              { key: 'collected', header: 'Recaudado', align: 'right', render: (row) => formatMoney(row.totalRecaudado) },
              { key: 'expenses', header: 'Gastos', align: 'right', render: (row) => formatMoney(row.totalGastos) },
              { key: 'cash', header: 'En caja', align: 'right', render: (row) => formatMoney(row.dineroEnCaja) },
              { key: 'portfolio', header: 'Cartera', align: 'right', render: (row) => formatMoney(row.carteraActual) },
            ]}
            rows={paged.slice}
            rowKey={(row) => row.routeId}
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
