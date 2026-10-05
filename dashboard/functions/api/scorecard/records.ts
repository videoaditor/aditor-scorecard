// Server-side proxy for the one scorecard read. The data-source token lives only
// in the Cloudflare Pages project (TEABLE_TOKEN), never in the client bundle -
// this closes the old leak where the token shipped inside the page's JavaScript.
// The route sits behind the gate (_middleware.ts), so only a signed-in internal
// viewer reaches it, and it forwards exactly one thing: the read of the scorecard
// table. The table id is fixed server-side, so the client cannot repoint the
// token at any other table or endpoint; only the query string (paging) is passed.
interface Env {
  TEABLE_URL: string; // e.g. https://app.teable.ai
  TEABLE_TOKEN: string; // read-only token, held server-side
  TEABLE_TABLE_ID: string; // the scorecard table id
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// Only GET is defined, so any other method to this route gets a 405 from Pages -
// the scorecard is read-only.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.TEABLE_URL || !env.TEABLE_TOKEN || !env.TEABLE_TABLE_ID) {
    return json({ error: "scorecard source not configured" }, 500);
  }

  const base = env.TEABLE_URL.replace(/\/+$/, "");
  const incoming = new URL(request.url);
  const target = `${base}/api/table/${env.TEABLE_TABLE_ID}/record${incoming.search}`;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: { Authorization: `Bearer ${env.TEABLE_TOKEN}`, Accept: "application/json" },
    });
  } catch {
    return json({ error: "scorecard source unreachable" }, 502);
  }

  // Pass the body through unchanged; do not echo upstream headers (they could
  // carry auth or cookies). The client only reads data.records.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
