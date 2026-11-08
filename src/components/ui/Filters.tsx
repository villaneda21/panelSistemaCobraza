import type { RouteItem } from '../../types';

export function Filters({
  from,
  to,
  routeId,
  routes,
  onFrom,
  onTo,
  onRoute,
  showRoute = true,
  showDates = true,
}: {
  from: string;
  to: string;
  routeId: string;
  routes: RouteItem[];
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onRoute: (value: string) => void;
  showRoute?: boolean;
  showDates?: boolean;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
      {showDates && (
        <>
          <label className="flex min-w-[10.5rem] flex-1 flex-col gap-1.5 text-xs font-medium text-slate-500">
            Desde
            <input className="field" type="date" value={from} max={to || undefined} onChange={(event) => onFrom(event.target.value)} />
          </label>
          <label className="flex min-w-[10.5rem] flex-1 flex-col gap-1.5 text-xs font-medium text-slate-500">
            Hasta
            <input className="field" type="date" value={to} min={from || undefined} onChange={(event) => onTo(event.target.value)} />
          </label>
        </>
      )}
      {showRoute && (
        <label className="flex min-w-[14rem] flex-[1.4] flex-col gap-1.5 text-xs font-medium text-slate-500">
          Ruta
          <select className="field" value={routeId} onChange={(event) => onRoute(event.target.value)}>
            <option value="">Todas las rutas</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
