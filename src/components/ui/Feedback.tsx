export function LoadingBlock() {
  return (
    <div className="space-y-3" aria-live="polite">
      <div className="h-28 animate-pulse rounded-2xl bg-white shadow-card" />
      <div className="h-72 animate-pulse rounded-2xl bg-white shadow-card" />
    </div>
  );
}

export function TruncationNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
      El servicio entregó una parte de los registros. Las cifras de esta pantalla corresponden a esa consulta.
    </p>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white px-5 py-8 text-center shadow-card" role="alert">
      <p className="text-sm text-slate-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 h-10 rounded-xl bg-ink-900 px-4 text-sm font-medium text-white transition hover:bg-ink-800"
      >
        Reintentar
      </button>
    </div>
  );
}
