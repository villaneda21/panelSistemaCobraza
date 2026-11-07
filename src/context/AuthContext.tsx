import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SessionUser } from '../types';
import { clearToken, login as requestLogin, readToken, setUnauthorizedHandler, writeToken } from '../lib/api';

const USER_KEY = 'panel_gerencial_user';

interface AuthState {
  user: SessionUser | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function readUser(): SessionUser | null {
  if (!readToken()) return null;
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return { username: 'Gerencia', role: 'Consulta' };
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.username) return { username: 'Gerencia', role: 'Consulta' };
    return parsed;
  } catch {
    return { username: 'Gerencia', role: 'Consulta' };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => readUser());

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      sessionStorage.removeItem(USER_KEY);
      setUser(null);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      async signIn(username: string, password: string) {
        const session = await requestLogin(username.trim(), password);
        writeToken(session.token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(session.user));
        setUser(session.user);
      },
      signOut() {
        clearToken();
        sessionStorage.removeItem(USER_KEY);
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
