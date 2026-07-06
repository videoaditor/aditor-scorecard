// Regression tests for the retry layer. A single weekly run makes 150+ sequential calls;
// a transient "fetch failed" or 429/5xx on any one of them must NOT abort the metric.
// (This pins the backfill bug where one transient network blip nulled the whole hotDms.)
import { describe, it, expect, vi } from 'vitest';
import { fetchRetry } from '../src/http.js';

const FAST = { attempts: 4, baseMs: 1 };

function mockFetch(seq) {
  // seq: array of () => Response | throws, consumed one per call.
  let i = 0;
  globalThis.fetch = vi.fn(async () => {
    const step = seq[Math.min(i, seq.length - 1)];
    i += 1;
    return step();
  });
  return () => i;
}

describe('fetchRetry', () => {
  const original = globalThis.fetch; // restored in each test's finally (globals not enabled)

  it('retries a transient network throw, then succeeds', async () => {
    const calls = mockFetch([
      () => { throw new TypeError('fetch failed'); },
      () => new Response('ok', { status: 200 }),
    ]);
    try {
      const res = await fetchRetry('https://app.teable.ai/x', {}, FAST);
      expect(res.status).toBe(200);
      expect(calls()).toBe(2);
    } finally {
      globalThis.fetch = original;
    }
  });

  it('retries 429 / 5xx, then returns the eventual success', async () => {
    const calls = mockFetch([
      () => new Response('busy', { status: 429 }),
      () => new Response('err', { status: 503 }),
      () => new Response('ok', { status: 200 }),
    ]);
    try {
      const res = await fetchRetry('https://api.anthropic.com/v1/messages', { method: 'POST' }, FAST);
      expect(res.status).toBe(200);
      expect(calls()).toBe(3);
    } finally {
      globalThis.fetch = original;
    }
  });

  it('gives up after the attempt budget and rethrows the last network error', async () => {
    const calls = mockFetch([() => { throw new TypeError('fetch failed'); }]);
    try {
      await expect(fetchRetry('https://graph.instagram.com/x', {}, { attempts: 3, baseMs: 1 })).rejects.toThrow(
        /fetch failed/,
      );
      expect(calls()).toBe(3);
    } finally {
      globalThis.fetch = original;
    }
  });

  it('returns a 4xx immediately without retrying (not transient)', async () => {
    const calls = mockFetch([() => new Response('bad', { status: 400 })]);
    try {
      const res = await fetchRetry('https://app.teable.ai/x', {}, FAST);
      expect(res.status).toBe(400);
      expect(calls()).toBe(1);
    } finally {
      globalThis.fetch = original;
    }
  });
});
