// Hermetic fetch fake + HARD RAIL for the collector T1 suite.
//
// The collector talks to exactly THREE external hosts: graph.instagram.com (IG),
// api.anthropic.com (classifier), app.teable.ai (Teable write). This installs a
// globalThis.fetch that:
//   - records every request (method, url, body),
//   - ABORTS + records any request to a host outside the allowlist (the hard rail:
//     tests physically cannot reach the real IG account, Teable, or Anthropic),
//   - otherwise routes to the first matching handler.
// Every test asserts `transcript.railViolations` is empty.
import { vi } from 'vitest';

const ALLOWED_HOSTS = new Set(['graph.instagram.com', 'api.anthropic.com', 'app.teable.ai']);

export function installFetchMock(handlers) {
  const transcript = { calls: [], railViolations: [] };
  const original = globalThis.fetch;

  globalThis.fetch = vi.fn(async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init.method || 'GET').toUpperCase();
    transcript.calls.push({ method, url, body: init.body });

    let host = '';
    try {
      host = new URL(url).host;
    } catch {
      host = '';
    }
    if (!ALLOWED_HOSTS.has(host)) {
      transcript.railViolations.push({ method, url });
      throw new Error(`HARD RAIL: blocked request to non-allowlisted host "${host}" (${url})`);
    }

    for (const h of handlers) {
      if (h.method && h.method.toUpperCase() !== method) continue;
      if (!h.match(url, init)) continue;
      const r = await h.respond(url, init);
      if (r instanceof Response) return r;
      const status = r.status ?? 200;
      if (r.json !== undefined) {
        return new Response(JSON.stringify(r.json), {
          status,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(r.text ?? '', { status });
    }
    throw new Error(`unhandled ${method} ${url}`);
  });

  transcript.restore = () => {
    globalThis.fetch = original;
  };
  return transcript;
}
