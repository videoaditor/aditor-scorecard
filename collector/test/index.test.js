import { describe, it, expect } from 'vitest';
import { installFetchMock } from './helpers/mockFetch.js';
import * as S from './helpers/scenario.js';
import worker from '../src/index.js';

describe('worker entry point', () => {
  it('scheduled() runs the collection at the cron instant and upserts the row', async () => {
    const t = installFetchMock(S.makeHandlers());
    try {
      const promises = [];
      const ctx = { waitUntil: (p) => promises.push(p) };
      await worker.scheduled({ scheduledTime: S.NOW.getTime() }, S.makeEnv(), ctx);
      await Promise.all(promises);

      const patch = t.calls.find((c) => c.method === 'PATCH');
      expect(patch.url).toContain('/record/recKW07');
      expect(JSON.parse(patch.body).record.fields).toEqual({
        reach: S.REACH_TOTAL,
        hotDms: S.EXPECTED_HOT,
      });
      expect(t.railViolations).toEqual([]);
    } finally {
      t.restore();
    }
  });

  it('fetch() answers /health and 404s everything else (no mutation surface)', async () => {
    const ok = await worker.fetch(new Request('https://collector/health'));
    expect(ok.status).toBe(200);
    const nf = await worker.fetch(new Request('https://collector/run', { method: 'POST' }));
    expect(nf.status).toBe(404);
  });
});
