const moneyFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const compactFmt = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFmt = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const shortMonths = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const PAGE_SIZE = 10;

export function formatMoney(value: number): string {
  return moneyFmt.format(Number.isFinite(value) ? value : 0);
}

export function formatCompact(value: number): string {
  return compactFmt.format(Number.isFinite(value) ? value : 0);
}

export function dayKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  if (match && !value.includes('T')) return match[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return match ? match[1] : null;
  return dayFmt.format(parsed);
}

export function formatDate(value: string | null): string {
  const key = dayKey(value);
  if (!key) return '—';
  const [year, month, day] = key.split('-').map(Number);
  return dateFmt.format(new Date(Date.UTC(year, month - 1, day, 17)));
}

export function formatShortDay(key: string): string {
  const [, month, day] = key.split('-').map(Number);
  return `${day} ${shortMonths[month - 1] ?? ''}`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDate(value);
  return dateTimeFmt.format(parsed);
}

export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toLocaleString('es-CO', { maximumFractionDigits: 2 })} s`;
}

export function todayInBogota(now = new Date()): string {
  return dayFmt.format(now);
}

export function monthRange(now = new Date()): { from: string; to: string } {
  const today = todayInBogota(now);
  return { from: `${today.slice(0, 8)}01`, to: today };
}

export function inRange(value: string | null, from: string, to: string): boolean {
  const key = dayKey(value);
  if (!key) return !from && !to;
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return days;
  const cursor = new Date(start);
  while (cursor <= end && days.length < 400) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    days.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(page, 1), pages);
  const start = (current - 1) * pageSize;
  return {
    slice: rows.slice(start, start + pageSize),
    total,
    pages,
    page: current,
    start,
    end: Math.min(start + pageSize, total),
  };
}
