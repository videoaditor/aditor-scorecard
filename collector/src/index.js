// Cloudflare Worker entry point for the aditor-scorecard IG collector.
//
// Runs on a weekly cron (Monday 05:00 UTC - always after the n8n metric fetchers in
// both DST states; see wrangler.jsonc). The scheduled handler is a thin wrapper around
// runCollection so the full data path is unit/E2E-testable in plain Node without workerd.
import { runCollection } from './collect.js';

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCollection(env, { now: new Date(event.scheduledTime) }));
  },

  // Liveness only. The collector has no HTTP mutation surface - all writes happen on the
  // cron path. `wrangler tail` / the cron trigger are how you observe or force a run.
  async fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname === '/health') return new Response('ok\n', { status: 200 });
    return new Response('not found\n', { status: 404 });
  },
};
