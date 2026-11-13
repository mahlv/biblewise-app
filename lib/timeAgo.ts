const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Midnight of the local calendar day of `date`. */
const startOfDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * Short relative time in Portuguese: "Agora", "Há 5min", "Há 2h", "Ontem", "Há 3 dias",
 * then the date ("12 nov", with the year when it is not the current one).
 */
export function formatTimeAgo(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < MINUTE) return 'Agora';
  if (diff < HOUR) return `Há ${Math.floor(diff / MINUTE)}min`;
  if (diff < 24 * HOUR) return `Há ${Math.floor(diff / HOUR)}h`;

  const then = new Date(timestamp);
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(then)) / (24 * HOUR));
  if (days <= 1) return 'Ontem';
  if (days < 7) return `Há ${days} dias`;

  const date = `${then.getDate()} ${MONTHS[then.getMonth()]}`;
  return then.getFullYear() === new Date(now).getFullYear() ? date : `${date} ${then.getFullYear()}`;
}
