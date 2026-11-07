import type { ExpenseItem, PaymentItem, RouteItem, SettlementItem } from '../types';

export interface ClosureRow {
  id: string;
  routeId: string;
  routeName: string;
  collected: number;
  expenses: number;
  profit: number;
  movements: number;
  registeredCash: number | null;
  difference: number | null;
  status: 'cuadrada' | 'diferencia' | 'sin_registro';
  registeredLabel: string;
}

function sumByRoute(rows: Array<{ routeId: string; amount: number }>): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = row.routeId || 'sin-ruta';
    totals.set(key, (totals.get(key) ?? 0) + row.amount);
  }
  return totals;
}

export function buildClosures(input: {
  routes: RouteItem[];
  payments: PaymentItem[];
  expenses: ExpenseItem[];
  settlements: SettlementItem[];
  routeId?: string;
}): ClosureRow[] {
  const names = new Map(input.routes.map((route) => [route.id, route.name]));
  const collected = sumByRoute(input.payments);
  const spent = sumByRoute(input.expenses);
  const moves = new Map<string, number>();
  for (const payment of input.payments) {
    const key = payment.routeId || 'sin-ruta';
    moves.set(key, (moves.get(key) ?? 0) + 1);
  }

  const registered = new Map<string, { cash: number; label: string }>();
  for (const settlement of input.settlements) {
    const key = settlement.routeId || 'sin-ruta';
    const current = registered.get(key);
    registered.set(key, {
      cash: (current?.cash ?? 0) + settlement.cashToDeliver,
      label: settlement.status || current?.label || 'Registrada',
    });
  }

  const ids = new Set<string>([
    ...input.routes.map((route) => route.id),
    ...collected.keys(),
    ...spent.keys(),
    ...registered.keys(),
  ]);

  const rows: ClosureRow[] = [];
  for (const id of ids) {
    if (input.routeId && id !== input.routeId) continue;
    const collectedAmount = collected.get(id) ?? 0;
    const expenseAmount = spent.get(id) ?? 0;
    const official = registered.get(id);
    if (collectedAmount === 0 && expenseAmount === 0 && !official) continue;
    const profit = collectedAmount - expenseAmount;
    const difference = official ? official.cash - profit : null;
    let status: ClosureRow['status'] = 'sin_registro';
    if (official) status = Math.abs(official.cash - profit) < 1 ? 'cuadrada' : 'diferencia';
    rows.push({
      id,
      routeId: id,
      routeName: names.get(id) ?? (id === 'sin-ruta' ? 'Sin ruta' : `Ruta ${id}`),
      collected: collectedAmount,
      expenses: expenseAmount,
      profit,
      movements: moves.get(id) ?? 0,
      registeredCash: official ? official.cash : null,
      difference,
      status,
      registeredLabel: official?.label ?? 'Sin registro',
    });
  }

  return rows.sort((a, b) => b.collected - a.collected || a.routeName.localeCompare(b.routeName, 'es'));
}
