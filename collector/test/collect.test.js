// T1 E2E: the full weekly collection data path with IG, Anthropic, and Teable faked at
// the network boundary. This is the primary gate for the Teable data-mutation write and
// the DM-classification path.
import { describe, it, expect } from 'vitest';
import { installFetchMock } from './helpers/mockFetch.js';
import * as S from './helpers/scenario.js';
import { runCollection } from '../src/collect.js';

function captureLogs() {
  const logs = [];
  return { log: (...a) => logs.push(a.join(' ')), logs };
}

describe('runCollection - weekly IG collection (hermetic, hard rail)', () => {
  it('upserts reach + hotDms into the existing target-week row', async () => {
    const t = installFetchMock(S.makeHandlers());
    try {
      const { log, logs } = captureLogs();
      const result = await runCollection(S.makeEnv(), { now: S.NOW, log });

      // Selected the previous completed week and computed both metrics.
      expect(result.target).toEqual({ weekStart: '2026-02-09', weekEnd: '2026-02-15', week: 'KW07' });
      expect(result.reach).toBe(S.REACH_TOTAL); // 5584 = sum of daily reach
      expect(result.hotDms).toBe(S.EXPECTED_HOT); // 2 in-window hot DMs
      expect(result.mode).toBe('update');
      expect(result.recordId).toBe('recKW07');

      // Exactly one PATCH, to the KW07 row, writing ONLY reach + hotDms (nothing else).
      const patches = t.calls.filter((c) => c.method === 'PATCH');
      expect(patches).toHaveLength(1);
      expect(patches[0].url).toContain('/record/recKW07');
      expect(JSON.parse(patches[0].body)).toEqual({
        fieldKeyType: 'name',
        record: { fields: { reach: S.REACH_TOTAL, hotDms: S.EXPECTED_HOT } },
      });

      // Never created a row when one already exists.
      expect(t.calls.some((c) => c.method === 'POST' && c.url.includes('/record'))).toBe(false);

      // Classifier saw only the in-window inbound DMs (outbound + other weeks excluded).
      const classifyCalls = t.calls.filter((c) => c.url.includes('api.anthropic.com'));
      expect(classifyCalls).toHaveLength(S.EXPECTED_CLASSIFIED); // 3

      // HARD RAIL: nothing escaped the allowlisted hosts.
      expect(t.railViolations).toEqual([]);

      // PRIVACY: DM text never appears in a Teable body nor in any log line.
      const teableBodies = t.calls
        .filter((c) => c.url.includes('app.teable.ai'))
        .map((c) => c.body || '')
        .join('\n');
      expect(teableBodies).not.toContain(S.DM_MARKER);
      expect(logs.join('\n')).not.toContain(S.DM_MARKER);
    } finally {
      t.restore();
    }
  });

  it('creates the week row when none exists yet (upsert insert path)', async () => {
    const t = installFetchMock(S.makeHandlers({ records: S.ROWS_WITHOUT_KW07 }));
    try {
      const result = await runCollection(S.makeEnv(), { now: S.NOW, log: () => {} });

      expect(result.mode).toBe('create');
      const posts = t.calls.filter((c) => c.method === 'POST' && c.url.includes('/record'));
      expect(posts).toHaveLength(1);
      const body = JSON.parse(posts[0].body);
      expect(body.records[0].fields).toEqual({
        week: 'KW07',
        start: '2026-02-09',
        end: '2026-02-15',
        reach: S.REACH_TOTAL,
        hotDms: S.EXPECTED_HOT,
      });
      // No PATCH when creating.
      expect(t.calls.some((c) => c.method === 'PATCH')).toBe(false);
      expect(t.railViolations).toEqual([]);
    } finally {
      t.restore();
    }
  });

  it('writes only hotDms when the reach source fails (independent metrics)', async () => {
    const t = installFetchMock(S.makeHandlers({ reachFail: true }));
    try {
      const result = await runCollection(S.makeEnv(), { now: S.NOW, log: () => {} });
      expect(result.reach).toBeNull();
      expect(result.hotDms).toBe(S.EXPECTED_HOT);
      const patch = t.calls.find((c) => c.method === 'PATCH');
      expect(JSON.parse(patch.body).record.fields).toEqual({ hotDms: S.EXPECTED_HOT });
      expect(t.railViolations).toEqual([]);
    } finally {
      t.restore();
    }
  });

  it('writes only reach when the classifier fails (independent metrics)', async () => {
    const t = installFetchMock(S.makeHandlers({ classifyFail: true }));
    try {
      const result = await runCollection(S.makeEnv(), { now: S.NOW, log: () => {} });
      expect(result.reach).toBe(S.REACH_TOTAL);
      expect(result.hotDms).toBeNull();
      const patch = t.calls.find((c) => c.method === 'PATCH');
      expect(JSON.parse(patch.body).record.fields).toEqual({ reach: S.REACH_TOTAL });
      expect(t.railViolations).toEqual([]);
    } finally {
      t.restore();
    }
  });

  it('leaves hotDms unwritten when the IG self id cannot be resolved (never counts own replies)', async () => {
    const t = installFetchMock(S.makeHandlers({ meNoId: true }));
    try {
      const result = await runCollection(S.makeEnv(), { now: S.NOW, log: () => {} });
      // Without a self id we refuse to classify DMs: hotDms stays null and is skipped.
      expect(result.hotDms).toBeNull();
      // The classifier is never reached, so no own-reply can be counted as HOT.
      expect(t.calls.some((c) => c.url.includes('api.anthropic.com'))).toBe(false);
      const patch = t.calls.find((c) => c.method === 'PATCH');
      expect(JSON.parse(patch.body).record.fields.hotDms).toBeUndefined();
      expect(t.railViolations).toEqual([]);
    } finally {
      t.restore();
    }
  });

  it('skips reach (never writes a false 0) when IG returns an empty reach series', async () => {
    const t = installFetchMock(S.makeHandlers({ reachValues: [] }));
    try {
      const result = await runCollection(S.makeEnv(), { now: S.NOW, log: () => {} });
      // An empty series is an anomaly, not a real zero-reach week - skip rather than write 0.
      expect(result.reach).toBeNull();
      expect(result.hotDms).toBe(S.EXPECTED_HOT);
      const patch = t.calls.find((c) => c.method === 'PATCH');
      expect(JSON.parse(patch.body).record.fields).toEqual({ hotDms: S.EXPECTED_HOT });
      expect(t.railViolations).toEqual([]);
    } finally {
      t.restore();
    }
  });

  it('hard rail records and blocks any non-allowlisted host', async () => {
    const t = installFetchMock([]);
    try {
      await expect(fetch('https://evil.example.com/exfil')).rejects.toThrow(/HARD RAIL/);
      expect(t.railViolations).toHaveLength(1);
      expect(t.railViolations[0].url).toContain('evil.example.com');
    } finally {
      t.restore();
    }
  });
});
