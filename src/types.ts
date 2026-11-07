export type DebtStatus = 'saldada' | 'mora' | 'vigente' | 'parcial';

export interface SessionUser {
  username: string;
  role: string;
}

export interface RouteItem {
  id: string;
  name: string;
  code: string;
}

export interface DebtItem {
  id: string;
  clientName: string;
  document: string;
  routeId: string;
  principal: number;
  balance: number;
  dueDate: string | null;
  status: DebtStatus;
}

export interface PaymentItem {
  id: string;
  routeId: string;
  amount: number;
  date: string | null;
}

export interface ExpenseItem {
  id: string;
  routeId: string;
  amount: number;
  concept: string;
  date: string | null;
}

export interface SettlementItem {
  id: string;
  routeId: string;
  cashToDeliver: number;
  status: string;
  date: string | null;
}

export interface AuditItem {
  id: string;
  at: string | null;
  method: string;
  path: string;
  status: number | null;
  durationMs: number | null;
  user: string;
  ip: string;
}

export interface ListQuery {
  from?: string;
  to?: string;
  routeId?: string;
  page?: number;
  pageSize?: number;
}
