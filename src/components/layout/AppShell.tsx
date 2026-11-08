import { HandCoins, LayoutDashboard, LogOut, ReceiptText, ScrollText, Users, Wallet } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/gastos', label: 'Gastos', icon: HandCoins, end: false },
  { to: '/clientes', label: 'Clientes', icon: Users, end: false },
  { to: '/cartera', label: 'Cartera', icon: Wallet, end: false },
  { to: '/liquidacion', label: 'Liquidación', icon: ReceiptText, end: false },
  { to: '/auditoria', label: 'Auditoría', icon: ScrollText, end: false },
];

function navClass(active: boolean) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
    active ? 'bg-ink-900 text-white shadow-card' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;
}

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f3f5f7] text-slate-900 md:grid md:grid-cols-[248px_1fr]">
      <aside className="hidden border-r border-slate-200/80 bg-white md:flex md:flex-col">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-900 text-sm font-semibold tracking-tight text-white">
            Cg
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Cobranza</p>
            <p className="text-xs text-slate-500">Panel gerencial</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Secciones">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => navClass(isActive)}>
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <p className="px-5 py-5 text-xs leading-5 text-slate-400">Consulta únicamente. Este panel no modifica la operación.</p>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="flex items-center gap-3 md:hidden">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink-900 text-xs font-semibold text-white">Cg</div>
              <p className="text-sm font-semibold">Cobranza</p>
            </div>
            <p className="hidden text-sm text-slate-500 md:block">Vista ejecutiva de recaudos</p>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-700/10 sm:inline">
                Solo lectura
              </span>
              <span className="max-w-44 truncate text-sm text-slate-700">{user?.nombreCompleto || user?.username}</span>
              <span className="hidden text-xs text-slate-400 sm:inline">{user?.role}</span>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-50"
                onClick={() => {
                  signOut();
                  navigate('/login', { replace: true });
                }}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden" aria-label="Secciones">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${isActive ? 'bg-ink-900 text-white' : 'bg-slate-100 text-slate-600'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1380px] px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
