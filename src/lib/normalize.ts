import type { ClientDebt, ClientItem, ClientPayment, ClientRow, ClientStanding, DebtItem, DebtStatus, RouteItem, RouteStats, TodayDetails } from '../types';

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

export function asList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.map(asRecord).filter((item): item is Record<string, unknown> => item !== null);
  }
  const record = asRecord(data);
  if (!record) return [];
  for (const key of ['items', 'data', 'results', 'pagos', 'prestamos', 'gastos']) {
    if (Array.isArray(record[key])) return asList(record[key]);
  }
  return [];
}

export function fastApiDetail(data: unknown): string | null {
  const record = asRecord(data);
  if (!record) return null;
  const detail = record.detail;
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  if (!Array.isArray(detail)) return null;
  const messages = detail
    .map((item) => {
      if (typeof item === 'string') return item;
      const row = asRecord(item);
      return row ? asString(row.msg) : '';
    })
    .filter(Boolean);
  return messages.length ? messages.join(' ') : null;
}

export function toRoute(record: Record<string, unknown>, index: number): RouteItem {
  const id = asString(pick(record, ['id']), String(index + 1));
  return {
    id,
    name: asString(pick(record, ['nombre_ruta', 'nombre']), `Ruta ${id}`),
    collector: asString(pick(record, ['nombre_cobrador']), 'Sin asignar'),
  };
}

export function toRouteStats(route: RouteItem, record: Record<string, unknown>): RouteStats {
  return {
    routeId: route.id,
    routeName: route.name,
    collector: route.collector,
    baseInyectada: asNumber(record.base_inyectada),
    totalVendido: asNumber(record.total_vendido),
    totalRecaudado: asNumber(record.total_recaudado),
    totalGastos: asNumber(record.total_gastos),
    dineroEnCaja: asNumber(record.dinero_en_caja),
    carteraActual: asNumber(record.cartera_actual),
  };
}

export function debtStatus(estado: string, balance: number, total: number, lateDays: number): DebtStatus {
  const value = estado.toUpperCase();
  if (value === 'PAGADA' || balance <= 0) return 'saldada';
  if (lateDays > 0 || value.includes('MORA')) return 'mora';
  if (total > 0 && balance < total) return 'parcial';
  return 'vigente';
}

export function toDebt(
  record: Record<string, unknown>,
  client: { id: string; name: string; document: string; routeId: string; routeName: string },
): DebtItem {
  const balance = asNumber(pick(record, ['saldo_pendiente', 'saldo']));
  const total = asNumber(pick(record, ['monto_total_con_interes']), balance);
  const lateDays = asNumber(record.dias_atraso);
  const rawStatus = asString(pick(record, ['estado']), 'ACTIVA');
  return {
    id: asString(record.id),
    clientId: client.id,
    clientName: client.name,
    document: client.document,
    routeId: client.routeId,
    routeName: client.routeName,
    description: asString(pick(record, ['descripcion_articulo', 'tipo_servicio']), 'Préstamo'),
    principal: asNumber(record.monto_original, total),
    totalWithInterest: total,
    balance,
    pendingInstallments: asNumber(record.cuotas_pendientes),
    lateDays,
    startDate: asString(pick(record, ['fecha_inicio_pago', 'fecha_creacion'])) || null,
    status: debtStatus(rawStatus, balance, total, lateDays),
  };
}

export function toClient(record: Record<string, unknown>, routeName: string): ClientItem {
  const firstName = asString(record.nombre);
  const lastName = asString(record.apellido);
  const id = asString(record.id);
  const routeId = asString(record.ruta_id);
  return {
    id,
    fullName: `${firstName} ${lastName}`.trim() || (id ? `Cliente ${id}` : 'Cliente'),
    document: asString(record.cedula_identidad, '—'),
    phone: asString(record.telefono, '—'),
    address: asString(record.direccion, '—'),
    routeId,
    routeName: routeName || (routeId ? `Ruta ${routeId}` : 'Sin ruta'),
  };
}

export function toClientPayment(record: Record<string, unknown>, debtId: string): ClientPayment {
  return {
    id: asString(record.id) || `${debtId}-${asString(record.fecha_pago)}-${asNumber(record.monto)}`,
    debtId,
    amount: asNumber(record.monto),
    paidAt: asString(record.fecha_pago) || null,
  };
}

export function toClientDebt(record: Record<string, unknown>): ClientDebt {
  const id = asString(record.id);
  const payments = asList(record.pagos)
    .map((row) => toClientPayment(row, id))
    .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''));
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balance = asNumber(pick(record, ['saldo_pendiente', 'saldo']));
  const total = asNumber(pick(record, ['monto_total_con_interes']), balance + paid);
  const lateDays = asNumber(record.dias_atraso);
  const rawStatus = asString(pick(record, ['estado']), 'ACTIVA');
  const description = asString(pick(record, ['descripcion_articulo', 'tipo_servicio']), 'Préstamo');
  return {
    id,
    description,
    service: asString(record.tipo_servicio),
    frequency: asString(record.frecuencia_pago),
    totalWithInterest: total,
    balance,
    paid,
    installmentsTotal: asNumber(record.num_cuotas_total),
    pendingInstallments: asNumber(record.cuotas_pendientes),
    installmentValue: asNumber(record.valor_cuota_promedio),
    lateDays,
    status: debtStatus(rawStatus, balance, total, lateDays),
    rawStatus,
    startDate: asString(pick(record, ['fecha_inicio_pago', 'fecha_creacion'])) || null,
    createdAt: asString(record.fecha_creacion) || null,
    endDate: asString(record.fecha_final_estimada) || null,
    payments,
  };
}

export function summarizeClient(client: ClientItem, debts: ClientDebt[], historyAvailable: boolean): ClientRow {
  const activeBalance = debts.filter((debt) => debt.status !== 'saldada').reduce((sum, debt) => sum + debt.balance, 0);
  const totalPaid = debts.reduce((sum, debt) => sum + debt.paid, 0);
  const lateDays = debts.reduce((max, debt) => Math.max(max, debt.lateDays), 0);
  let standing: ClientStanding = 'sin_deuda';
  if (!historyAvailable) standing = 'sin_deuda';
  else if (debts.some((debt) => debt.status === 'mora')) standing = 'mora';
  else if (debts.length === 0) standing = 'sin_deuda';
  else if (activeBalance <= 0) standing = 'saldada';
  else if (debts.some((debt) => debt.status === 'parcial')) standing = 'parcial';
  else standing = 'vigente';
  return {
    ...client,
    activeBalance,
    totalPaid,
    debtCount: debts.length,
    lateDays,
    standing,
    historyAvailable,
  };
}

export function toTodayDetails(data: unknown): TodayDetails {
  const record = asRecord(data) ?? {};
  const pagos = asList(record.pagos).map((row) => ({
    cliente: asString(row.cliente, 'Cliente'),
    monto: asNumber(row.monto),
    hora: asString(row.hora, '—'),
    deudaId: asString(row.deuda_id),
  }));
  const prestamos = asList(record.prestamos).map((row) => ({
    cliente: asString(row.cliente, 'Cliente'),
    monto: asNumber(row.monto),
    hora: asString(row.hora, '—'),
    deudaId: asString(row.deuda_id),
  }));
  const gastos = asList(record.gastos).map((row) => ({
    descripcion: asString(row.descripcion, 'Gasto'),
    monto: asNumber(row.monto),
    hora: asString(row.hora, '—'),
  }));
  return { pagos, prestamos, gastos };
}
