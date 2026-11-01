import { describe, it, expect } from 'vitest';
import { toWeekStart, toWeekEnd, isoWeek, formatWeekLabel, parseDateKey } from '@/lib/weekUtils';

/**
 * Week convention (app-wide): Monday 00:00 → Sunday 23:59:59.
 * Week numbers are ISO-8601 calendar weeks — a week belongs to the year
 * that contains its Thursday, never day-of-month ÷ 7.
 *
 * Reference dates requested by the user:
 *   Oct 26 2025 (Sun) → week of Mon Oct 20 – Sun Oct 26 (week 43)
 *   Oct 28 2025 (Tue) → week of Mon Oct 27 – Sun Nov 2  (week 44)
 *   Nov 1  2025 (Sat) → same week as Oct 28             (week 44)
 *   Nov 2  2025 (Sun) → same week as Oct 28             (week 44)
 *   Nov 8  2025 (Sat) → week of Mon Nov 3 – Sun Nov 9   (week 45)
 *   Nov 9  2025 (Sun) → same week as Nov 8              (week 45)
 */

describe('toWeekStart (Monday-based weeks)', () => {
  it.each([
    ['2025-10-26', '2025-10-20'], // Sunday → previous Monday
    ['2025-10-27', '2025-10-27'], // Monday → itself
    ['2025-10-28', '2025-10-27'], // Tuesday → Monday
    ['2025-11-01', '2025-10-27'], // Saturday → same Monday
    ['2025-11-02', '2025-10-27'], // Sunday ends the Oct 27 week
    ['2025-11-03', '2025-11-03'], // next Monday
    ['2025-11-08', '2025-11-03'],
    ['2025-11-09', '2025-11-03'],
    ['2026-01-01', '2025-12-29'], // year transition
    ['2027-01-01', '2026-12-28'],
  ])('%s → %s', (input, expected) => {
    expect(toWeekStart(input)).toBe(expected);
  });

  it('accepts Date inputs and is timezone-safe (UTC keys)', () => {
    expect(toWeekStart(new Date(Date.UTC(2025, 9, 26)))).toBe('2025-10-20');
  });

  it('never rolls back a day in negative-offset timezones', () => {
    // 23:30 local on Nov 9 in UTC-5 is Nov 10 UTC — the local day must win.
    const localSunday = new Date(2025, 10, 9, 23, 30);
    expect(toWeekStart(localSunday)).toBe('2025-11-03');
  });
});

describe('toWeekEnd (Sunday end of week)', () => {
  it('returns the Sunday 23:59:59-boundary date key', () => {
    expect(toWeekEnd('2025-10-27')).toBe('2025-11-02');
    expect(toWeekEnd('2025-11-03')).toBe('2025-11-09');
  });
});

describe('isoWeek (ISO-8601 calendar week numbers)', () => {
  it.each([
    ['2025-10-26', 43],
    ['2025-10-28', 44],
    ['2025-11-01', 44],
    ['2025-11-02', 44],
    ['2025-11-08', 45],
    ['2025-11-09', 45],
    // ISO edge cases: Jan 1 in week 52/53 of the previous year.
    ['2026-01-01', 1], // Jan 1 2026 is a Thursday → week 1 of 2026
    ['2025-01-01', 1],
    ['2021-01-01', 53], // Jan 1 2021 is a Friday → week 53 of 2020
    ['2021-01-03', 53],
    ['2021-01-04', 1], // Monday Jan 4 → week 1 of 2021
  ])('%s → week %i', (input, expected) => {
    expect(isoWeek(input).week).toBe(expected);
  });

  it('reports the ISO year, not the calendar year, for year-end weeks', () => {
    expect(isoWeek('2021-01-01').year).toBe(2020);
    expect(isoWeek('2024-12-30').year).toBe(2025); // Mon Dec 30 2024 → week 1 of 2025
    expect(isoWeek('2024-12-30').week).toBe(1);
  });
});

describe('formatWeekLabel', () => {
  it('labels from calendar weeks, not day-of-month ÷ 7', () => {
    // Old logic: Math.ceil(28 / 7) = "Week 4"; ISO says week 44.
    expect(formatWeekLabel('2025-10-27')).toBe("Week 44 · Oct 27");
    expect(formatWeekLabel('2025-11-03')).toBe("Week 45 · Nov 3");
  });

  it('flags the ISO year on year-crossover weeks', () => {
    // Mon Dec 29 2025 belongs to week 1 of 2026.
    expect(formatWeekLabel('2025-12-29')).toBe("Week 1 '26 · Dec 29");
  });

  it('handles invalid keys without crashing', () => {
    expect(formatWeekLabel('')).toBe('Week —');
    expect(formatWeekLabel('not-a-date')).toBe('Week —');
  });
});

describe('parseDateKey', () => {
  it('parses YYYY-MM-DD to UTC midnight', () => {
    const d = parseDateKey('2025-11-01');
    expect(d.toISOString()).toBe('2025-11-01T00:00:00.000Z');
  });

  it('accepts Date inputs by their local calendar date', () => {
    const local = new Date(2025, 10, 1, 23, 59);
    expect(parseDateKey(local).toISOString()).toBe('2025-11-01T00:00:00.000Z');
  });
});
