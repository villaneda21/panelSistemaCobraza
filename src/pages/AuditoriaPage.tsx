import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { ErrorBlock, LoadingBlock, TruncationNote } from '../components/ui/Feedback';
import { Filters } from '../components/ui/Filters';
import { PageHeader } from '../components/ui/PageHeader';
import { errorMessage, getAuditLogs } from '../lib/api';
import { PAGE_SIZE, formatDateTime, formatDuration, inRange, monthRange, paginate } from '../lib/format';
import type { AuditItem } from '../types';

function statusTone(status: number | null): 'emerald' | 'amber' | 'rose' | 'slate' {
  if (status === null) return 'slate';
  if (status >= 500) return 'rose';
  if (status >= 400) return 'amber';
  if (status >= 200) return 'emerald';
  return 'slate';
}

export function AuditoriaPage() {
  const initial = monthRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getAuditLogs({ from, to }, controller.signal)
      .then((result) => {
        setLogs(result.rows);
        setTruncated(result.truncated);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(caught));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [from, to, reloadKey]);

  const rows = useMemo(() => logs.filter((log) => inRange(log.at, from, to)), [logs, from, to]);
  const paged = paginate(rows, page, PAGE_SIZE);

  return (
    <div>
      <PageHeader
        eyebrow="Auditoría"
        title="Trazas de consulta"
        description="Lectura del registro que deja el API: método, ruta, código HTTP y tiempo de respuesta. Esta vista no genera ni altera eventos."
      />
      <Filters
        from={from}
        to={to}
        routeId=""
        routes={[]}
        showRoute={false}
        onFrom={(value) => {
          setFrom(value);
          setPage(1);
        }}
        onTo={(value) => {
          setTo(value);
          setPage(1);
        }}
        onRoute={() => undefined}
      />
      <TruncationNote show={!loading && !error && truncated} />
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : (
        <DataTable
          columns={[
            { key: 'at', header: 'Fecha', render: (row) => formatDateTime(row.at) },
            { key: 'method', header: 'Método', render: (row) => <Badge tone={row.method === 'GET' ? 'sky' : 'slate'}>{row.method}</Badge> },
            { key: 'path', header: 'Ruta consultada', render: (row) => <span className="font-medium text-slate-950">{row.path}</span> },
            { key: 'status', header: 'Código', render: (row) => <Badge tone={statusTone(row.status)}>{row.status ?? '—'}</Badge> },
            { key: 'time', header: 'Tiempo', align: 'right', render: (row) => formatDuration(row.durationMs) },
            { key: 'user', header: 'Usuario', render: (row) => row.user },
            { key: 'ip', header: 'Origen', render: (row) => row.ip },
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
