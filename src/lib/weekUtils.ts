/**
 * Week utilities — the app-wide week convention.
 *
 * A week runs Monday 00:00 → Sunday 23:59:59.
 * Week numbers are ISO-8601 calendar weeks: a week belongs to the year
 * that contains its Thursday, so month and year transitions are correct.
 *
 * All date keys are `YYYY-MM-DD` strings handled in UTC to avoid
 * timezone drift (a UTC-midnight parse in a negative-offset timezone
 * would otherwise roll the date back a day).
 */

/** Parse a YYYY-MM-DD string to UTC midnight. Invalid input → Invalid Date. */
export function parseDateKey(key: string | Date): Date {
  if (key instanceof Date) {
    if (Number.isNaN(key.getTime())) return key;
    return new Date(Date.UTC(key.getFullYear(), key.getMonth(), key.getDate()));
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
  if (!m) return new Date(key);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** Format a Date as YYYY-MM-DD. */
export function toDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Monday of the week containing the given date, as YYYY-MM-DD. */
export function toWeekStart(dateLike: string | Date): string {
  const d = parseDateKey(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const offset = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - offset);
  return toDateKey(d);
}

/** Sunday of the week containing the given date, as YYYY-MM-DD. */
export function toWeekEnd(dateLike: string | Date): string {
  const d = parseDateKey(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() + 6);
  return toDateKey(d);
}

/** ISO-8601 week number and ISO week-year: the year that contains the week's Thursday. */
export function isoWeek(dateLike: string | Date): { year: number; week: number } {
  const d = parseDateKey(dateLike);
  if (Number.isNaN(d.getTime())) return { year: 0, week: 0 };
  const offset = (d.getUTCDay() + 6) % 7;
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() - offset + 3); // Thursday of this week

  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstOffset = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstOffset + 3); // Week-1 Thursday

  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return { year: thursday.getUTCFullYear(), week };
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Human label for a week, e.g. "Week 44 · Oct 26".
 * The label is derived from the week's Monday and the ISO week number
 * (calendar weeks, not day-of-month ÷ 7). When the week belongs to the
 * next ISO year (year-end crossover) the year is appended, e.g. "Week 1 '27 · Dec 29".
 */
export function formatWeekLabel(weekStartKey: string): string {
  const d = parseDateKey(weekStartKey);
  if (Number.isNaN(d.getTime())) return 'Week —';
  const { year, week } = isoWeek(d);
  const crossesYear = year !== d.getUTCFullYear();
  const yearSuffix = crossesYear ? ` '${String(year).slice(2)}` : '';
  return `Week ${week}${yearSuffix} · ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
