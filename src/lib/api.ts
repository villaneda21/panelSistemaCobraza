import axios from 'axios';
import type { ClientDebt, ClientItem, ClientRow, DashboardSummary, DebtItem, DeudaCreate, LiquidarInput, PagoCreate, RouteItem, RouteStats, SessionUser, TodayDetails } from '../types';
import { asList, asNumber, asRecord, asString, fastApiDetail, summarizeClient, toClient, toClientDebt, toDebt, toRoute, toRouteStats, toTodayDetails } from './normalize';

const TOKEN_KEY = 'panel_gerencial_token';
const LOGIN_PATH = '/login';

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');
  if (configured) return configured;
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return 'http://127.0.0.1:8000';
}

export const API_BASE_URL = resolveApiBaseUrl();

const http = axios.create({
  baseURL: API_BASE_URL,
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

http.interceptors.request.use((config) => {
  const token = readToken();
  const path = requestPath(config.url ?? '');
  if (token && path !== LOGIN_PATH) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const path = requestPath(error.config?.url ?? '');
      if (path !== LOGIN_PATH) onUnauthorized();
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error: unknown, fallback = 'No fue posible cargar la información.'): string {
  if (axios.isCancel(error)) return '';
  if (axios.isAxiosError(error)) {
    const detail = fastApiDetail(error.response?.data);
    if (detail) return detail;
    if (!error.response) return 'No hay conexión con el servicio de cobranza.';
    if (error.response.status === 401) return 'La sesión no es válida.';
    if (error.response.status === 403) return 'No tiene permiso para esta consulta.';
    return fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function routeIdParam(routeId?: string) {
  if (!routeId) return undefined;
  const id = Number(routeId);
  return Number.isInteger(id) ? id : undefined;
}

async function mapPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function login(username: string, password: string): Promise<{ token: string; user: SessionUser }> {
  const form = new URLSearchParams();
  form.set('username', username);
  form.set('password', password);
  const response = await http.post(LOGIN_PATH, form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const root = asRecord(response.data) ?? {};
  const token = asString(root.access_token);
  if (!token) throw new Error('La respuesta de acceso no incluye un token.');
  return {
    token,
    user: {
      username,
      nombreCompleto: asString(root.nombre_completo, username),
      role: asString(root.rol, 'CONSULTA'),
    },
  };
}

export async function getRoutes(signal?: AbortSignal): Promise<RouteItem[]> {
  const response = await http.get('/rutas/', { signal });
  return asList(response.data).map(toRoute);
}

export async function getRouteStats(route: RouteItem, signal?: AbortSignal): Promise<RouteStats> {
  const response = await http.get(`/rutas/${route.id}/estadisticas`, { signal });
  return toRouteStats(route, asRecord(response.data) ?? {});
}

export async function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  const response = await http.get('/dashboard/resumen', { signal });
  const data = asRecord(response.data) ?? {};
  return {
    baseInyectada: asNumber(data.base_inyectada),
    cobrado: asNumber(data.cobrado_hoy),
    prestado: asNumber(data.prestado_hoy),
    gastos: asNumber(data.gastos_hoy),
    cartera: asNumber(data.total_en_calle),
    dineroEnCaja: asNumber(data.dinero_en_caja),
  };
}

export function summaryFromStats(stats: RouteStats): DashboardSummary {
  return {
    baseInyectada: stats.baseInyectada,
    cobrado: stats.totalRecaudado,
    prestado: stats.totalVendido,
    gastos: stats.totalGastos,
    cartera: stats.carteraActual,
    dineroEnCaja: stats.dineroEnCaja,
  };
}

export async function getTodayDetails(signal?: AbortSignal): Promise<TodayDetails> {
  const response = await http.get('/dashboard/detalles_hoy', { signal });
  return toTodayDetails(response.data);
}

export async function getClients(routeId: string | undefined, routes: RouteItem[], signal?: AbortSignal): Promise<ClientItem[]> {
  const rutaId = routeIdParam(routeId);
  const response = await http.get('/clientes/', {
    signal,
    params: rutaId === undefined ? undefined : { ruta_id: rutaId },
  });
  const names = new Map(routes.map((route) => [route.id, route.name]));
  return asList(response.data).map((row) => {
    const routeKey = asString(row.ruta_id);
    return toClient(row, names.get(routeKey) ?? '');
  });
}

export async function getClientHistory(clientId: string, signal?: AbortSignal): Promise<ClientDebt[]> {
  const response = await http.get(`/clientes/${clientId}/historial`, { signal });
  return asList(response.data).map(toClientDebt);
}

export async function getClientProfile(clientId: string, signal?: AbortSignal): Promise<{ client: ClientItem; debts: ClientDebt[] }> {
  const [clientResponse, debts] = await Promise.all([
    http.get(`/clientes/${clientId}`, { signal }),
    getClientHistory(clientId, signal),
  ]);
  const record = asRecord(clientResponse.data) ?? {};
  let routeName = '';
  try {
    const routes = await getRoutes(signal);
    routeName = routes.find((route) => route.id === asString(record.ruta_id))?.name ?? '';
  } catch (error) {
    if (axios.isCancel(error)) throw error;
  }
  return { client: toClient(record, routeName), debts };
}

export async function getClientRows(routeId: string | undefined, routes: RouteItem[], signal?: AbortSignal): Promise<ClientRow[]> {
  const clients = await getClients(routeId, routes, signal);
  return mapPool(clients, 5, async (client) => {
    try {
      const debts = await getClientHistory(client.id, signal);
      return summarizeClient(client, debts, true);
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      return summarizeClient(client, [], false);
    }
  });
}

export async function getPortfolio(routeId: string | undefined, routes: RouteItem[], signal?: AbortSignal): Promise<DebtItem[]> {
  const clients = await getClients(routeId, routes, signal);
  const groups = await mapPool(clients, 5, async (client) => {
    const history = await getClientHistory(client.id, signal);
    const profile = {
      id: client.id,
      name: client.fullName,
      document: client.document,
      routeId: client.routeId,
      routeName: client.routeName,
    };
    return history.map((debt) =>
      toDebt(
        {
          id: debt.id,
          descripcion_articulo: debt.description,
          saldo_pendiente: debt.balance,
          monto_total_con_interes: debt.totalWithInterest,
          monto_original: debt.totalWithInterest,
          cuotas_pendientes: debt.pendingInstallments,
          dias_atraso: debt.lateDays,
          estado: debt.rawStatus,
          fecha_inicio_pago: debt.startDate,
        },
        profile,
      ),
    );
  });
  return groups.flat();
}

export async function crearPago(body: PagoCreate) {
  const response = await http.post(
    '/pagos/',
    {
      deuda_id: body.deuda_id,
      monto: body.monto,
      latitud: body.latitud ?? 0,
      longitud: body.longitud ?? 0,
    },
    { headers: { 'Content-Type': 'application/json' } },
  );
  return response.data as unknown;
}

export async function crearDeuda(body: DeudaCreate) {
  const response = await http.post(
    '/deudas/',
    {
      cliente_id: body.cliente_id,
      tipo_servicio: body.tipo_servicio,
      descripcion_articulo: body.descripcion_articulo ?? null,
      frecuencia_pago: body.frecuencia_pago,
      monto_original: body.monto_original,
      interes_porcentaje: body.interes_porcentaje,
      num_cuotas_total: body.num_cuotas_total,
      fecha_inicio_pago: body.fecha_inicio_pago,
      latitud: body.latitud ?? 0,
      longitud: body.longitud ?? 0,
    },
    { headers: { 'Content-Type': 'application/json' } },
  );
  return response.data as unknown;
}

export async function liquidar(body: LiquidarInput = {}) {
  const payload: LiquidarInput = {};
  if (body.ruta_id !== undefined) payload.ruta_id = body.ruta_id;
  const response = await http.post('/liquidar/', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data as unknown;
}

export async function eliminarDeuda(deudaId: number, motivo?: string) {
  const text = motivo?.trim();
  const response = await http.delete(`/deudas/${deudaId}`, {
    params: text ? { motivo: text } : undefined,
  });
  return response.data as unknown;
}
