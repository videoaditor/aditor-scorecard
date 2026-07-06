import { describe, it, expect } from 'vitest';
import { installFetchMock } from './helpers/mockFetch.js';
import * as S from './helpers/scenario.js';
import { findWeekRow, upsertWeekMetrics } from '../src/teable.js';

const TARGET = { weekStart: '2026-02-09', weekEnd: '2026-02-15', week: 'KW07' };

describe('findWeekRow', () => {
  it('matches by start-date (Berlin-local), like the n8n workflows', () => {
    expect(findWeekRow(S.ROWS_WITH_KW07, TARGET)?.id).toBe('recKW07');
  });

  it('falls back to the KW week string when no start matches', () => {
    const rows = [{ id: 'recX', fields: { week: 'KW07' } }];
    expect(findWeekRow(rows, TARGET)?.id).toBe('recX');
  });

  it('returns null when neither start nor week matches', () => {
    expect(findWeekRow(S.ROWS_WITHOUT_KW07, TARGET)).toBeNull();
  });
});

describe('upsertWeekMetrics', () => {
  it('no-ops (no network) when both metrics are null', async () => {
    const t = installFetchMock(S.makeHandlers());
    try {
      const res = await upsertWeekMetrics(S.makeEnv(), TARGET, { reach: null, hotDms: null });
      expect(res.mode).toBe('noop');
      expect(t.calls).toHaveLength(0);
    } finally {
      t.restore();
    }
  });

  it('omits a null field from the PATCH (preserves any prior value)', async () => {
    const t = installFetchMock(S.makeHandlers());
    try {
      await upsertWeekMetrics(S.makeEnv(), TARGET, { reach: 4200, hotDms: null });
      const patch = t.calls.find((c) => c.method === 'PATCH');
      expect(JSON.parse(patch.body).record.fields).toEqual({ reach: 4200 });
      expect(t.railViolations).toEqual([]);
    } finally {
      t.restore();
    }
  });
});
