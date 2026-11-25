import i18n from './i18n';
import { localeTag } from './i18n';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Midnight of the local calendar day of `date`. */
const startOfDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** "12 nov" (short month in the app language). */
function shortDate(date: Date): string {
  const month = new Intl.DateTimeFormat(localeTag(), { month: 'short' }).format(date).replace(/\.$/, '').toLowerCase();
  return `${date.getDate()} ${month}`;
}

/**
 * Short relative time in the app language: "Now", "5min ago", "2h ago", "Yesterday", "3 days ago",
 * then the date ("12 nov", with the year when it is not the current one).
 */
export function formatTimeAgo(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < MINUTE) return i18n.t('time.now');
  if (diff < HOUR) return i18n.t('time.minutesAgo', { count: Math.floor(diff / MINUTE) });
  if (diff < 24 * HOUR) return i18n.t('time.hoursAgo', { count: Math.floor(diff / HOUR) });

  const then = new Date(timestamp);
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(then)) / (24 * HOUR));
  if (days <= 1) return i18n.t('time.yesterday');
  if (days < 7) return i18n.t('time.daysAgo', { count: days });

  const date = shortDate(then);
  return then.getFullYear() === new Date(now).getFullYear() ? date : `${date} ${then.getFullYear()}`;
}
