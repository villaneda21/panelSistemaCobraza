import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, BrowserRouter, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const CarteraPage = lazy(() => import('./pages/CarteraPage').then((module) => ({ default: module.CarteraPage })));
const LiquidacionPage = lazy(() => import('./pages/LiquidacionPage').then((module) => ({ default: module.LiquidacionPage })));
const AuditoriaPage = lazy(() => import('./pages/AuditoriaPage').then((module) => ({ default: module.AuditoriaPage })));

function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route
                element={
                  <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-white shadow-card" />}>
                    <Outlet />
                  </Suspense>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/cartera" element={<CarteraPage />} />
                <Route path="/liquidacion" element={<LiquidacionPage />} />
                <Route path="/auditoria" element={<AuditoriaPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
