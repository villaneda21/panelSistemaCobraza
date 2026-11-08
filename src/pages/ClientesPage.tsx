import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, Wallet } from 'lucide-react';
import { MoneyTooltip } from '../components/charts/MoneyTooltip';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { ErrorBlock, LoadingBlock } from '../components/ui/Feedback';
import { Filters } from '../components/ui/Filters';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { errorMessage, getClientRows, getRoutes } from '../lib/api';
import { PAGE_SIZE, formatCompact, formatMoney, paginate } from '../lib/format';
import type { ClientRow, ClientStanding, RouteItem } from '../types';

const standingLabel: Record<ClientStanding, string> = {
  saldada: 'Saldado',
  mora: 'En mora',
  vigente: 'Con saldo',
  parcial: 'Pago parcial',
  sin_deuda: 'Sin deuda',
};

const standingTone: Record<ClientStanding, 'emerald' | 'rose' | 'sky' | 'amber' | 'slate'> = {
  saldada: 'emerald',
  mora: 'rose',
  vigente: 'sky',
  parcial: 'amber',
  sin_deuda: 'slate',
};

export function ClientesPage() {
  const [routeId, setRouteId] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getRoutes(controller.signal)
      .then(async (nextRoutes) => {
        const rows = await getClientRows(routeId || undefined, nextRoutes, controller.signal);
        setRoutes(nextRoutes);
        setClients(rows);
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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((client) =>
      [client.fullName, client.document, client.phone, client.routeName].join(' ').toLowerCase().includes(needle),
    );
  }, [clients, query]);

  const totals = useMemo(() => {
    const withHistory = filtered.filter((client) => client.historyAvailable);
    const balance = withHistory.reduce((sum, client) => sum + client.activeBalance, 0);
    const late = withHistory.filter((client) => client.standing === 'mora').length;
    const byRoute = new Map<string, number>();
    for (const client of withHistory) {
      byRoute.set(client.routeName, (byRoute.get(client.routeName) ?? 0) + client.activeBalance);
    }
    const bars = [...byRoute.entries()]
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
    return { balance, late, bars, people: filtered.length };
  }, [filtered]);

  const paged = paginate(filtered, page, PAGE_SIZE);

  return (
    <div>
      <PageHeader
        eyebrow="Clientes"
        title="Cartera por persona"
        description="Cada ficha abre el resumen del cliente: deudas activas, cuotas y los pagos aplicados a cada una."
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
      <label className="mb-5 flex max-w-md flex-col gap-1.5 text-xs font-medium text-slate-500">
        Buscar cliente
        <input
          className="field"
          value={query}
          placeholder="Nombre, cédula o teléfono"
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
      </label>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label="Clientes" value={String(totals.people)} hint="Con el filtro actual" icon={<Users className="h-4 w-4" />} tone="ink" />
            <StatCard label="Saldo en calle" value={formatMoney(totals.balance)} hint="Suma de deudas no saldadas" icon={<Wallet className="h-4 w-4" />} tone="rose" />
            <StatCard label="En mora" value={String(totals.late)} hint="Clientes con atraso" icon={<Users className="h-4 w-4" />} tone="slate" />
          </section>
          <section className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-950">Saldo por ruta</h2>
              <p className="text-xs text-slate-500">Deuda vigente de los clientes de esta consulta</p>
            </div>
            <div className="h-72">
              {totals.bars.length === 0 ? (
                <p className="grid h-full place-items-center text-sm text-slate-400">No hay saldo para mostrar.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={totals.bars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#eef2f6" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tickFormatter={formatCompact} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
                    <Tooltip content={<MoneyTooltip />} cursor={{ fill: 'rgba(190, 18, 60, 0.06)' }} />
                    <Bar dataKey="total" name="Saldo" fill="#be123c" radius={[7, 7, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
          <section className="mt-4">
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Cliente',
                  render: (row) => (
                    <Link to={`/clientes/${row.id}`} className="font-medium text-slate-950 underline-offset-2 hover:underline">
                      {row.fullName}
                    </Link>
                  ),
                },
                { key: 'document', header: 'Cédula', render: (row) => row.document },
                { key: 'phone', header: 'Teléfono', render: (row) => row.phone },
                { key: 'route', header: 'Ruta', render: (row) => row.routeName },
                { key: 'debts', header: 'Deudas', align: 'right', render: (row) => (row.historyAvailable ? row.debtCount : '—') },
                {
                  key: 'balance',
                  header: 'Saldo',
                  align: 'right',
                  render: (row) => (row.historyAvailable ? <span className="font-medium text-slate-950">{formatMoney(row.activeBalance)}</span> : 'No disponible'),
                },
                { key: 'late', header: 'Atraso', align: 'right', render: (row) => (row.historyAvailable && row.lateDays > 0 ? `${row.lateDays} días` : '—') },
                {
                  key: 'status',
                  header: 'Estado',
                  render: (row) => <Badge tone={standingTone[row.standing]}>{row.historyAvailable ? standingLabel[row.standing] : 'Sin historial'}</Badge>,
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
          </section>
        </>
      )}
    </div>
  );
}
