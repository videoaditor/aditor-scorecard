import { describe, it, expect } from 'vitest';
import { computeTargetWeek, isoWeekLabel, berlinDate, inWeek, unixDay } from '../src/week.js';

describe('computeTargetWeek - replicates the n8n previous-completed-week selection', () => {
  it('targets the previous completed week on a Monday cron run', () => {
    // Monday 2026-02-16 (KW08) -> previous completed week is KW07 (Feb 9-15).
    expect(computeTargetWeek(new Date('2026-02-16T05:00:00Z'))).toEqual({
      weekStart: '2026-02-09',
      weekEnd: '2026-02-15',
      week: 'KW07',
    });
  });

  it('matches the dashboard/n8n KW numbering on fixture weeks', () => {
    // Run on the Monday after each fixture week -> that week is the target.
    expect(computeTargetWeek(new Date('2026-02-02T05:00:00Z')).week).toBe('KW05');
    expect(computeTargetWeek(new Date('2026-02-09T05:00:00Z')).week).toBe('KW06');
    expect(computeTargetWeek(new Date('2026-03-02T05:00:00Z')).week).toBe('KW09');
  });

  it('handles the ISO year boundary', () => {
    // Monday 2026-01-05 -> previous week Dec 29 2025 .. Jan 4 2026 = ISO 2026-W01.
    const t = computeTargetWeek(new Date('2026-01-05T05:00:00Z'));
    expect(t.weekStart).toBe('2025-12-29');
    expect(t.weekEnd).toBe('2026-01-04');
    expect(t.week).toBe('KW01');
  });

  it('self-corrects to the right completed week even if run mid-week', () => {
    // Wednesday 2026-02-18 still resolves to KW07 (this Monday is Feb 16).
    expect(computeTargetWeek(new Date('2026-02-18T12:00:00Z')).week).toBe('KW07');
  });
});

describe('isoWeekLabel', () => {
  it('zero-pads to two digits', () => {
    expect(isoWeekLabel(new Date('2026-02-09T00:00:00Z'))).toBe('KW07');
    expect(isoWeekLabel(new Date('2026-06-22T00:00:00Z'))).toBe('KW26');
  });
});

describe('berlinDate / inWeek', () => {
  it('converts a stored UTC timestamp to its Berlin calendar date', () => {
    // 23:30 UTC in winter (CET, +1) is already the next day in Berlin.
    expect(berlinDate('2026-02-09T23:30:00.000Z')).toBe('2026-02-10');
    expect(berlinDate('2026-02-09T00:00:00.000Z')).toBe('2026-02-09');
  });

  it('includes messages by Berlin-local date within the window', () => {
    const target = { weekStart: '2026-02-09', weekEnd: '2026-02-15' };
    expect(inWeek('2026-02-09T08:00:00+01:00', target)).toBe(true);
    expect(inWeek('2026-02-15T23:00:00+01:00', target)).toBe(true);
    expect(inWeek('2026-02-16T00:30:00+01:00', target)).toBe(false); // KW08
    expect(inWeek('2026-02-08T22:00:00+01:00', target)).toBe(false); // KW06
  });
});

describe('unixDay', () => {
  it('returns UNIX seconds for midnight UTC', () => {
    expect(unixDay('2026-02-09')).toBe(Math.floor(Date.parse('2026-02-09T00:00:00Z') / 1000));
  });
});
