// Shared fetch with retry + backoff for transient failures.
//
// One collection run makes many sequential calls (dozens of IG conversation/message
// reads + one classify per inbound DM, often 150+ calls over a couple of minutes). A
// single transient network blip ("fetch failed" / ECONNRESET / socket hang up) or a
// 429/5xx must not abort an entire metric, so those are retried with exponential backoff.
// Non-transient responses (2xx/4xx) are returned to the caller unchanged.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function retryOpts(env) {
  return {
    attempts: Number(env?.RETRY_ATTEMPTS ?? 4),
    baseMs: Number(env?.RETRY_BASE_MS ?? 500),
  };
}

export async function fetchRetry(url, init = {}, { attempts = 4, baseMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if ((res.status === 429 || res.status >= 500) && attempt < attempts) {
        await sleep(backoff(attempt, baseMs, res));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e; // network-level failure - retry
      if (attempt >= attempts) throw e;
      await sleep(backoff(attempt, baseMs));
    }
  }
  throw lastErr;
}

function backoff(attempt, baseMs, res) {
  const retryAfter = res ? Number(res.headers.get('retry-after')) : 0;
  if (retryAfter > 0) return Math.min(retryAfter * 1000, 15000);
  const exp = baseMs * 2 ** (attempt - 1);
  return Math.min(exp + Math.floor(Math.random() * 250), 15000);
}
