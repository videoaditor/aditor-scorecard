import { describe, it, expect } from 'vitest';
import { installFetchMock } from './helpers/mockFetch.js';
import * as S from './helpers/scenario.js';
import { classifyHot, countHotDms } from '../src/classify.js';

// A tiny Anthropic-only mock that echoes HOT/NOT based on a keyword, so we can drive the
// classifier without any live API. DM text is synthetic.
function anthropicMock(decideHot) {
  return [
    {
      method: 'POST',
      match: (u) => u.includes('api.anthropic.com/v1/messages'),
      respond: (_u, init) => {
        const text = JSON.parse(init.body).messages[0].content;
        return { json: { content: [{ type: 'text', text: decideHot(text) ? 'HOT' : 'NOT' }] } };
      },
    },
  ];
}

describe('classifyHot', () => {
  it('returns true only when Haiku replies HOT', async () => {
    const t = installFetchMock(anthropicMock((text) => text.includes('pricing')));
    try {
      expect(await classifyHot('what is your pricing', S.makeEnv())).toBe(true);
      expect(await classifyHot('nice reels', S.makeEnv())).toBe(false);
    } finally {
      t.restore();
    }
  });

  it('sends the DM text to Anthropic only (never to Teable), and throws on API error', async () => {
    const t = installFetchMock([
      { method: 'POST', match: (u) => u.includes('api.anthropic.com'), respond: () => ({ status: 500 }) },
    ]);
    try {
      await expect(classifyHot('anything', S.makeEnv())).rejects.toThrow(/Anthropic classify -> 500/);
      // Only the anthropic host was contacted.
      expect(t.calls.every((c) => c.url.includes('api.anthropic.com'))).toBe(true);
      expect(t.railViolations).toEqual([]);
    } finally {
      t.restore();
    }
  });
});

describe('countHotDms', () => {
  it('counts the HOT classifications across a list', async () => {
    const t = installFetchMock(anthropicMock((text) => /pric|book/.test(text)));
    try {
      const n = await countHotDms(['pricing?', 'book a call', 'hi', 'love it'], S.makeEnv());
      expect(n).toBe(2);
    } finally {
      t.restore();
    }
  });
});
