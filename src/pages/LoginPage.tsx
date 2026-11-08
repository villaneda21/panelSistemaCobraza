import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function nextPath(value: unknown): string {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) return value;
  return '/';
}

export function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await signIn(username, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(nextPath(from), { replace: true });
    } catch (caught) {
      setError(errorMessage(caught, 'No fue posible iniciar sesión.'));
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#e7ebf0] px-4 py-10">
      <section className="grid w-full max-w-[980px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_80px_-36px_rgba(14,28,47,0.55)] md:grid-cols-2">
        <div className="relative flex flex-col justify-between bg-ink-900 px-8 py-10 text-white md:px-10">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 18% 18%, rgba(16,185,129,0.22), transparent 34%), linear-gradient(165deg, rgba(255,255,255,0.05), transparent 42%)',
            }}
          />
          <div className="relative">
            <div className="mb-10 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-sm font-semibold">Cg</div>
              <p className="text-sm text-white/80">Sistema de cobranza</p>
            </div>
            <h1 className="max-w-xs text-4xl font-semibold leading-tight tracking-tight">Panel gerencial</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              Recaudos, cierre de caja por ruta y trazas de auditoría en una sola vista de consulta.
            </p>
          </div>
          <ul className="relative mt-10 space-y-3 text-sm text-white/75">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Acceso exclusivo de lectura
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Liquidación calculada por ruta
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Historial de peticiones auditadas
            </li>
          </ul>
        </div>

        <div className="px-8 py-10 md:px-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">Ingreso</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Continuar al panel</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Use sus credenciales de gerencia. La sesión no habilita cambios sobre la operación.</p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Usuario
              <input
                className="field mt-1.5 bg-slate-50"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Clave
              <input
                className="field mt-1.5 bg-slate-50"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="h-12 w-full rounded-xl bg-ink-900 text-sm font-medium text-white transition hover:bg-ink-800 disabled:cursor-wait disabled:opacity-70"
            >
              {pending ? 'Ingresando…' : 'Entrar'}
            </button>
          </form>
          <p className="mt-8 text-xs leading-5 text-slate-400">Los registros de campo se hacen fuera de este panel.</p>
        </div>
      </section>
    </main>
  );
}
