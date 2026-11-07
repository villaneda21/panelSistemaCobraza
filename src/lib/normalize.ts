import type {
  AuditItem,
  DebtItem,
  DebtStatus,
  ExpenseItem,
  PaymentItem,
  RouteItem,
  SettlementItem,
} from '../types';

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const parsed = Number(normalized.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function unwrapList(data: unknown): { items: Record<string, unknown>[]; total: number | null } {
  if (Array.isArray(data)) {
    return { items: data.map(asRecord).filter((item): item is Record<string, unknown> => item !== null), total: null };
  }
  const record = asRecord(data);
  if (!record) return { items: [], total: null };
  const keys = ['items', 'data', 'results', 'registros', 'logs', 'rows', 'rutas', 'clientes', 'deudas', 'pagos', 'gastos', 'liquidaciones'];
  for (const key of keys) {
    if (Array.isArray(record[key])) {
      const items = record[key]
        .map(asRecord)
        .filter((item): item is Record<string, unknown> => item !== null);
      const totalRaw = record.total ?? record.count ?? record.total_count;
      return { items, total: typeof totalRaw === 'number' ? totalRaw : null };
    }
  }
  return { items: [], total: null };
}

export function debtStatus(raw: unknown, balance: number): DebtStatus {
  const text = asString(raw)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/(sald|pagad|cancel)/.test(text) || balance <= 0) return 'saldada';
  if (/(mora|venc|atras)/.test(text)) return 'mora';
  if (/parc/.test(text)) return 'parcial';
  return 'vigente';
}

export function routeIdOf(record: Record<string, unknown>): string {
  const direct = pick(record, ['ruta_id', 'route_id', 'id_ruta']);
  if (typeof direct === 'string' || typeof direct === 'number') return String(direct);
  const route = record.ruta ?? record.route;
  if (typeof route === 'string' || typeof route === 'number') return String(route);
  const nested = asRecord(route);
  return nested ? asString(pick(nested, ['id', 'ruta_id', 'codigo'])) : '';
}

function nestedName(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const direct = asString(record[key]);
    if (direct) return direct;
    const nested = asRecord(record[key]);
    if (!nested) continue;
    const name = asString(pick(nested, ['nombre', 'name', 'full_name', 'razon_social', 'username', 'usuario']));
    if (name) return name;
  }
  return '';
}

export function toRoute(record: Record<string, unknown>, index: number): RouteItem {
  const id = asString(pick(record, ['id', 'ruta_id', 'codigo', 'code']), `ruta-${index + 1}`);
  return {
    id,
    name: asString(pick(record, ['nombre', 'name', 'descripcion', 'description']), `Ruta ${id}`),
    code: asString(pick(record, ['codigo', 'code', 'sigla']), id),
  };
}

export function toDebt(record: Record<string, unknown>, index: number): DebtItem {
  const balance = asNumber(pick(record, ['saldo', 'balance', 'saldo_actual', 'valor_pendiente', 'monto_pendiente']));
  const client = asRecord(record.cliente) ?? asRecord(record.client);
  return {
    id: asString(pick(record, ['id', 'deuda_id']), `deuda-${index + 1}`),
    clientName:
      nestedName(record, ['cliente_nombre', 'nombre_cliente', 'cliente', 'client']) ||
      asString(client ? pick(client, ['nombre', 'name']) : undefined, 'Cliente sin nombre'),
    document: asString(
      pick(record, ['documento', 'cedula', 'nit', 'identificacion']) ??
        (client ? pick(client, ['documento', 'cedula', 'nit', 'identificacion']) : undefined),
      '—',
    ),
    routeId: routeIdOf(record),
    principal: asNumber(pick(record, ['monto_original', 'capital', 'valor', 'monto', 'principal']), balance),
    balance,
    dueDate: asString(pick(record, ['fecha_vencimiento', 'vencimiento', 'due_date', 'fecha_limite'])) || null,
    status: debtStatus(pick(record, ['estado', 'status', 'situacion']), balance),
  };
}

export function toPayment(record: Record<string, unknown>, index: number): PaymentItem {
  return {
    id: asString(pick(record, ['id', 'pago_id']), `pago-${index + 1}`),
    routeId: routeIdOf(record),
    amount: asNumber(pick(record, ['monto', 'valor', 'amount', 'abono', 'total'])),
    date: asString(pick(record, ['fecha', 'fecha_pago', 'created_at', 'date', 'pagado_en'])) || null,
  };
}

export function toExpense(record: Record<string, unknown>, index: number): ExpenseItem {
  return {
    id: asString(pick(record, ['id', 'gasto_id']), `gasto-${index + 1}`),
    routeId: routeIdOf(record),
    amount: asNumber(pick(record, ['monto', 'valor', 'amount', 'total'])),
    concept: asString(pick(record, ['concepto', 'descripcion', 'description', 'detalle']), 'Gasto operativo'),
    date: asString(pick(record, ['fecha', 'fecha_gasto', 'created_at', 'date'])) || null,
  };
}

export function toSettlement(record: Record<string, unknown>, index: number): SettlementItem {
  const collected = asNumber(pick(record, ['total_recaudado', 'recaudado', 'recaudo']));
  const expenses = asNumber(pick(record, ['total_gastos', 'gastos']));
  const profit = asNumber(pick(record, ['utilidad', 'profit']), collected - expenses);
  return {
    id: asString(pick(record, ['id', 'liquidacion_id']), `liq-${index + 1}`),
    routeId: routeIdOf(record),
    cashToDeliver: asNumber(
      pick(record, ['efectivo_entregar', 'efectivo', 'caja', 'valor_entregar', 'total_entregar']),
      profit,
    ),
    status: asString(pick(record, ['estado', 'status']), 'Registrada'),
    date: asString(pick(record, ['fecha', 'fecha_cierre', 'created_at', 'date'])) || null,
  };
}

export function toAudit(record: Record<string, unknown>, index: number): AuditItem {
  const statusRaw = pick(record, ['codigo_http', 'status_code', 'status', 'codigo', 'http_status']);
  const durationRaw = pick(record, ['tiempo_ms', 'duration_ms', 'response_time_ms', 'elapsed_ms', 'duracion_ms', 'tiempo_respuesta']);
  return {
    id: asString(pick(record, ['id', 'log_id']), `log-${index + 1}`),
    at: asString(pick(record, ['fecha', 'created_at', 'timestamp', 'fecha_hora', 'occurred_at'])) || null,
    method: asString(pick(record, ['metodo', 'method', 'http_method']), 'GET').toUpperCase(),
    path: asString(pick(record, ['ruta', 'path', 'endpoint', 'url', 'recurso']), '—'),
    status: statusRaw === undefined ? null : asNumber(statusRaw),
    durationMs: durationRaw === undefined ? null : asNumber(durationRaw),
    user: asString(pick(record, ['usuario', 'username', 'user', 'actor']), '—'),
    ip: asString(pick(record, ['ip', 'ip_address', 'remote_addr', 'cliente_ip']), '—'),
  };
}
