import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { ErrorBlock, LoadingBlock, TruncationNote } from '../components/ui/Feedback';
import { Filters } from '../components/ui/Filters';
import { PageHeader } from '../components/ui/PageHeader';
import { errorMessage, getDebts, getRoutes } from '../lib/api';
import { PAGE_SIZE, formatDate, formatMoney, inRange, monthRange, paginate } from '../lib/format';
import type { DebtItem, DebtStatus, RouteItem } from '../types';

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

export function CarteraPage() {
  const initial = monthRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [routeId, setRouteId] = useState('');
  const [page, setPage] = useState(1);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    Promise.all([getRoutes(controller.signal), getDebts({ from, to, routeId }, controller.signal)])
      .then(([nextRoutes, nextDebts]) => {
        setRoutes(nextRoutes.rows);
        setDebts(nextDebts.rows);
        setTruncated(nextRoutes.truncated || nextDebts.truncated);
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

  const rows = useMemo(() => {
    const names = new Map(routes.map((route) => [route.id, route.name]));
    return debts
      .filter((debt) => (!routeId || debt.routeId === routeId) && (debt.status === 'mora' || inRange(debt.dueDate, from, to) || !debt.dueDate))
      .map((debt) => ({
        ...debt,
        routeName: names.get(debt.routeId) ?? (debt.routeId ? `Ruta ${debt.routeId}` : 'Sin ruta'),
      }));
  }, [debts, routes, routeId, from, to]);

  const paged = paginate(rows, page, PAGE_SIZE);

  return (
    <div>
      <PageHeader
        eyebrow="Cartera"
        title="Estado de las obligaciones"
        description="Saldos consultados por ruta. El vencimiento acota la vista; las deudas en mora permanecen visibles aunque queden fuera del rango."
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
        <DataTable
          columns={[
            { key: 'client', header: 'Cliente', render: (row) => <span className="font-medium text-slate-950">{row.clientName}</span> },
            { key: 'document', header: 'Documento', render: (row) => row.document },
            { key: 'route', header: 'Ruta', render: (row) => row.routeName },
            { key: 'principal', header: 'Capital', align: 'right', render: (row) => formatMoney(row.principal) },
            { key: 'balance', header: 'Saldo', align: 'right', render: (row) => <span className="font-medium text-slate-950">{formatMoney(row.balance)}</span> },
            { key: 'due', header: 'Vencimiento', render: (row) => formatDate(row.dueDate) },
            { key: 'status', header: 'Estado', render: (row) => <Badge tone={statusTone[row.status]}>{statusLabel[row.status]}</Badge> },
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
      )}
    </div>
  );
}
