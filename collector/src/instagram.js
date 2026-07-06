// Instagram source for the IG collector (Instagram API with Instagram Login).
//
// Source host: graph.instagram.com, token INSTAGRAM_ADITOR_TOKEN, account aditor.ai
// (BUSINESS). Two reads:
//   1. Weekly organic REACH  - insights `reach` metric (Meta DEPRECATED `impressions`;
//      we never request it).
//   2. Inbound DM TEXT       - me/conversations, for hot/not classification.
//
// PRIVACY: DM message text returned by fetchInboundMessages is passed ONLY to the
// classifier. It is never logged, never persisted to Teable, and never returned past
// the collector. Only the final hot COUNT is stored.
import { berlinDate, unixDay } from './week.js';
import { fetchRetry, retryOpts } from './http.js';

const UA = 'aditor-scorecard-ig-collector/1.0 (+https://score.aditor.ai)';

function igBase(env) {
  return String(env.IG_API_BASE || 'https://graph.instagram.com/v21.0').replace(/\/+$/, '');
}

function igUrl(env, path, params = {}) {
  const qs = new URLSearchParams({ ...params, access_token: env.INSTAGRAM_ADITOR_TOKEN });
  return `${igBase(env)}${path}?${qs}`;
}

async function igRequest(env, url) {
  const res = await fetchRetry(url, { headers: { 'User-Agent': UA } }, retryOpts(env));
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`IG GET -> ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// Resolve the account's own IG id (+ username) so we can tell inbound DMs from our own
// replies and use the id as the insights node. IG_USER_ID/IG_USERNAME env vars override
// the /me lookup when pinned.
export async function fetchMe(env) {
  if (env.IG_USER_ID) return { id: String(env.IG_USER_ID), username: env.IG_USERNAME || '' };
  const me = await igRequest(env, igUrl(env, '/me', { fields: 'user_id,username' }));
  return { id: String(me.user_id || me.id || ''), username: me.username || '' };
}

// Weekly reach = sum of daily `reach` insight values across the Mon-Sun window. (Daily
// reach summed may exceed a true 7-day unique reach for returning accounts; this is the
// standard windowed dashboard value and is documented in AGENTS.md.)
export async function fetchWeeklyReach(env, target, me) {
  const igId = me?.id || (await fetchMe(env)).id;
  const since = unixDay(target.weekStart);
  const until = unixDay(target.weekEnd) + 86400; // include the last day's bucket
  const data = await igRequest(
    env,
    igUrl(env, `/${igId}/insights`, { metric: 'reach', period: 'day', since: String(since), until: String(until) }),
  );
  const series = (data.data || []).find((m) => m.name === 'reach') || (data.data || [])[0];
  const values = series?.values || [];
  if (values.length === 0) return null; // absent/empty series - skip, never write a false 0
  const total = values.reduce((sum, v) => sum + (Number(v.value) || 0), 0);
  return Math.round(total);
}

// Collect inbound DM text within the target week using the TWO-STEP conversations API.
// A single inline `messages{...}` expansion trips Meta's "please reduce the amount of
// data you're asking for" cap (HTTP 500, code 1), so we:
//   1. page conversation ids (+ updated_time),
//   2. for each conversation touched since the window start, page its messages edge.
// Outbound messages (from === self) and out-of-window messages are excluded. Returns raw
// message strings - see the PRIVACY note above; callers must not log or persist these.
export async function fetchInboundMessages(env, target, me) {
  const self = me || (await fetchMe(env));
  // No self id means we cannot exclude our own replies - refuse rather than count them as
  // inbound HOT DMs. The caller nulls + skips hotDms, preserving the prior value.
  if (!self.id) throw new Error('IG self id unresolved; refusing to classify DMs (cannot exclude own replies)');

  const conversations = [];
  let url = igUrl(env, '/me/conversations', { fields: 'id,updated_time', limit: '50' });
  for (let page = 0; url && page < 40; page++) {
    const data = await igRequest(env, url);
    for (const c of data.data || []) conversations.push(c);
    url = data.paging?.next || null;
  }

  const texts = [];
  for (const convo of conversations) {
    // Skip conversations whose last message predates the window - they hold nothing in it.
    if (convo.updated_time && berlinDate(convo.updated_time) < target.weekStart) continue;
    await collectConversationMessages(env, convo.id, self, target, texts);
  }
  return texts;
}

async function collectConversationMessages(env, conversationId, self, target, texts) {
  let url = igUrl(env, `/${conversationId}/messages`, { fields: 'message,from,created_time', limit: '50' });
  for (let page = 0; url && page < 20; page++) {
    const data = await igRequest(env, url);
    let reachedOlder = false;
    for (const msg of data.data || []) {
      const day = msg.created_time ? berlinDate(msg.created_time) : null;
      if (day && day < target.weekStart) { reachedOlder = true; continue; } // older than window
      if (self.id && String(msg.from?.id || '') === self.id) continue; // our own reply
      if (typeof msg.message !== 'string' || !msg.message.trim()) continue;
      if (day && day <= target.weekEnd) texts.push(msg.message);
    }
    // The messages edge returns newest-first, so once a page reaches before the window,
    // no older page can contain in-window messages - stop paging this conversation.
    if (reachedOlder) break;
    url = data.paging?.next || null;
  }
}
