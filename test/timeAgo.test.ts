import { formatTimeAgo } from '../lib/timeAgo';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const NOW = new Date(2026, 10, 12, 15, 0, 0).getTime(); // 12 Nov 2026, 15:00 local time

describe('formatTimeAgo', () => {
  it('says "Agora" for the first minute (and for future timestamps)', () => {
    expect(formatTimeAgo(NOW - 10 * 1000, NOW)).toBe('Agora');
    expect(formatTimeAgo(NOW + 5 * MINUTE, NOW)).toBe('Agora');
  });

  it('uses minutes and hours within a day', () => {
    expect(formatTimeAgo(NOW - 5 * MINUTE, NOW)).toBe('Há 5min');
    expect(formatTimeAgo(NOW - 59 * MINUTE, NOW)).toBe('Há 59min');
    expect(formatTimeAgo(NOW - 2 * HOUR, NOW)).toBe('Há 2h');
    expect(formatTimeAgo(NOW - 23 * HOUR, NOW)).toBe('Há 23h');
  });

  it('says "Ontem" for the previous calendar day and counts days after that', () => {
    expect(formatTimeAgo(new Date(2026, 10, 11, 9, 0).getTime(), NOW)).toBe('Ontem');
    expect(formatTimeAgo(new Date(2026, 10, 9, 20, 0).getTime(), NOW)).toBe('Há 3 dias');
    expect(formatTimeAgo(new Date(2026, 10, 6, 9, 0).getTime(), NOW)).toBe('Há 6 dias');
  });

  it('falls back to the date after a week, adding the year when it differs', () => {
    expect(formatTimeAgo(new Date(2026, 9, 20, 9, 0).getTime(), NOW)).toBe('20 out');
    expect(formatTimeAgo(new Date(2025, 11, 25, 9, 0).getTime(), NOW)).toBe('25 dez 2025');
  });
});
