import axios from 'axios';
import type { AuditItem, DebtItem, ExpenseItem, ListQuery, PaymentItem, RouteItem, SessionUser, SettlementItem } from '../types';
import {
  toAudit,
  toDebt,
  toExpense,
  toPayment,
  toRoute,
  toSettlement,
  unwrapList,
  asRecord,
  asString,
  pick,
} from './normalize';

export interface ReadResult<T> {
  rows: T[];
  truncated: boolean;
}

const READ_LIMIT = 1000;

const LOGIN_PATH = '/auth/login';
const TOKEN_KEY = 'panel_gerencial_token';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

let onUnauthorized = () => {};

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export function readToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function writeToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

function requestPath(url: string): string {
  const withoutQuery = url.split('?')[0];
  const pathname = withoutQuery.startsWith('http://') || withoutQuery.startsWith('https://')
    ? new URL(withoutQuery).pathname
    : withoutQuery;
  return pathname.replace(/\/+$/, '') || '/';
}

export function isAllowedRequest(method: string, url: string): boolean {
  const normalized = method.toLowerCase();
  if (normalized === 'get' || normalized === 'head') return true;
  return normalized === 'post' && requestPath(url) === LOGIN_PATH;
}

http.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase();
  const url = config.url ?? '';
  if (!isAllowedRequest(method, url)) {
    return Promise.reject(new Error('El panel gerencial es de solo lectura.'));
  }
  const token = readToken();
  if (token && requestPath(url) !== LOGIN_PATH) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? '';
      if (requestPath(url) !== LOGIN_PATH) onUnauthorized();
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error: unknown, fallback = 'No fue posible cargar la información.'): string {
  if (axios.isCancel(error)) return '';
  if (axios.isAxiosError(error)) {
    if (error.message === 'El panel gerencial es de solo lectura.') return error.message;
    if (!error.response) return 'No hay conexión con el servicio de cobranza.';
    if (error.response.status === 401) return 'Usuario o clave incorrectos.';
    if (error.response.status === 403) return 'No tiene permiso para consultar este recurso.';
    return fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function queryParams(query: ListQuery = {}) {
  return {
    fecha_desde: query.from || undefined,
    fecha_hasta: query.to || undefined,
    ruta_id: query.routeId || undefined,
    page: query.page,
    page_size: query.pageSize ?? READ_LIMIT,
    limit: query.pageSize ?? READ_LIMIT,
  };
}

async function getRows(path: string, query?: ListQuery, signal?: AbortSignal) {
  const response = await http.get(path, { params: queryParams(query), signal });
  const { items, total } = unwrapList(response.data);
  return { items, truncated: total !== null && total > items.length };
}

export async function login(username: string, password: string): Promise<{ token: string; user: SessionUser }> {
  const response = await http.post(LOGIN_PATH, { username, password });
  const root = asRecord(response.data) ?? {};
  const nested = asRecord(root.data) ?? {};
  const token = asString(
    pick(root, ['access_token', 'token', 'accessToken']) ?? pick(nested, ['access_token', 'token', 'accessToken']),
  );
  if (!token) throw new Error('La respuesta de acceso no incluye un token.');
  const userRecord = asRecord(root.user) ?? asRecord(root.usuario) ?? asRecord(nested.user) ?? {};
  return {
    token,
    user: {
      username: asString(pick(userRecord, ['username', 'usuario', 'email', 'nombre']), username),
      role: asString(pick(userRecord, ['role', 'rol', 'perfil']), 'Gerencia'),
    },
  };
}

export async function getRoutes(signal?: AbortSignal): Promise<ReadResult<RouteItem>> {
  const { items, truncated } = await getRows('/rutas', undefined, signal);
  return { rows: items.map(toRoute), truncated };
}

export async function getDebts(query?: ListQuery, signal?: AbortSignal): Promise<ReadResult<DebtItem>> {
  const { items, truncated } = await getRows('/deudas', query, signal);
  return { rows: items.map(toDebt), truncated };
}

export async function getPayments(query?: ListQuery, signal?: AbortSignal): Promise<ReadResult<PaymentItem>> {
  const { items, truncated } = await getRows('/pagos', query, signal);
  return { rows: items.map(toPayment), truncated };
}

export async function getExpenses(query?: ListQuery, signal?: AbortSignal): Promise<ReadResult<ExpenseItem>> {
  const { items, truncated } = await getRows('/gastos', query, signal);
  return { rows: items.map(toExpense), truncated };
}

export async function getSettlements(query?: ListQuery, signal?: AbortSignal): Promise<ReadResult<SettlementItem>> {
  const { items, truncated } = await getRows('/liquidaciones', query, signal);
  return { rows: items.map(toSettlement), truncated };
}

export async function getAuditLogs(query?: ListQuery, signal?: AbortSignal): Promise<ReadResult<AuditItem>> {
  const { items, truncated } = await getRows('/logs_auditoria', query, signal);
  return { rows: items.map(toAudit), truncated };
}
