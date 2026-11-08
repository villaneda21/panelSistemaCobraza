export type DebtStatus = 'saldada' | 'mora' | 'vigente' | 'parcial';

export interface SessionUser {
  username: string;
  nombreCompleto: string;
  role: string;
}

export interface RouteItem {
  id: string;
  name: string;
  collector: string;
}

export interface DashboardSummary {
  baseInyectada: number;
  cobrado: number;
  prestado: number;
  gastos: number;
  cartera: number;
  dineroEnCaja: number;
}

export interface RouteStats {
  routeId: string;
  routeName: string;
  collector: string;
  baseInyectada: number;
  totalVendido: number;
  totalRecaudado: number;
  totalGastos: number;
  dineroEnCaja: number;
  carteraActual: number;
}

export interface TodayPayment {
  cliente: string;
  monto: number;
  hora: string;
  deudaId: string;
}

export interface TodayLoan {
  cliente: string;
  monto: number;
  hora: string;
  deudaId: string;
}

export interface TodayExpense {
  descripcion: string;
  monto: number;
  hora: string;
}

export interface TodayDetails {
  pagos: TodayPayment[];
  prestamos: TodayLoan[];
  gastos: TodayExpense[];
}

export interface DebtItem {
  id: string;
  clientId: string;
  clientName: string;
  document: string;
  routeId: string;
  routeName: string;
  description: string;
  principal: number;
  totalWithInterest: number;
  balance: number;
  pendingInstallments: number;
  lateDays: number;
  startDate: string | null;
  status: DebtStatus;
}

export interface PagoCreate {
  deuda_id: number;
  monto: number;
  latitud?: number;
  longitud?: number;
}

export interface DeudaCreate {
  cliente_id: number;
  tipo_servicio: string;
  descripcion_articulo?: string | null;
  frecuencia_pago: string;
  monto_original: number;
  interes_porcentaje: number;
  num_cuotas_total: number;
  fecha_inicio_pago: string;
  latitud?: number;
  longitud?: number;
}

export interface LiquidarInput {
  ruta_id?: number;
}
