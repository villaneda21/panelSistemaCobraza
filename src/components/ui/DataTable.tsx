import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  page,
  pages,
  total,
  start,
  end,
  onPage,
  minWidth = 880,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  page: number;
  pages: number;
  total: number;
  start: number;
  end: number;
  onPage: (page: number) => void;
  minWidth?: number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-left text-sm" style={{ minWidth }}>
          <thead>
            <tr className="bg-slate-50/90 text-[11px] uppercase tracking-[0.12em] text-slate-500">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-3 font-medium ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-slate-500">
                  No hay registros para el filtro seleccionado.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="border-t border-slate-100 transition-colors hover:bg-slate-50/80">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`border-t border-slate-100 px-4 py-3.5 text-slate-700 ${column.align === 'right' ? 'text-right tabular' : ''}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          {total === 0 ? 'Sin registros' : `Mostrando ${start + 1}–${end} de ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <span className="min-w-16 text-center text-sm tabular text-slate-600">
            {page} / {pages}
          </span>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onPage(page + 1)}
            disabled={page >= pages}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
