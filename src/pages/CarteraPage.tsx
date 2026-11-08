import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { ErrorBlock, LoadingBlock } from '../components/ui/Feedback';
import { Filters } from '../components/ui/Filters';
import { PageHeader } from '../components/ui/PageHeader';
import { errorMessage, getPortfolio, getRoutes } from '../lib/api';
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
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getRoutes(controller.signal)
      .then(async (nextRoutes) => {
        const portfolio = await getPortfolio(routeId || undefined, nextRoutes, controller.signal);
        setRoutes(nextRoutes);
        setDebts(portfolio);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(caught));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [routeId, reloadKey]);

  const rows = useMemo(
    () => debts.filter((debt) => debt.status === 'mora' || inRange(debt.startDate, from, to) || !debt.startDate),
    [debts, from, to],
  );
  const paged = paginate(rows, page, PAGE_SIZE);

  return (
    <div>
      <PageHeader
        eyebrow="Cartera"
        title="Estado de las obligaciones"
        description="Clientes de GET /clientes/ y préstamos de GET /clientes/{id}/historial. La ruta viaja como ?ruta_id=. En mora sigue visible aunque el inicio quede fuera del rango."
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
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : (
        <DataTable
          columns={[
            { key: 'client', header: 'Cliente', render: (row) => <span className="font-medium text-slate-950">{row.clientName}</span> },
            { key: 'document', header: 'Cédula', render: (row) => row.document },
            { key: 'route', header: 'Ruta', render: (row) => row.routeName },
            { key: 'description', header: 'Préstamo', render: (row) => row.description },
            { key: 'balance', header: 'Saldo', align: 'right', render: (row) => <span className="font-medium text-slate-950">{formatMoney(row.balance)}</span> },
            { key: 'installments', header: 'Cuotas', align: 'right', render: (row) => row.pendingInstallments },
            { key: 'late', header: 'Atraso', align: 'right', render: (row) => (row.lateDays > 0 ? `${row.lateDays} días` : '—') },
            { key: 'start', header: 'Inicio', render: (row) => formatDate(row.startDate) },
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
