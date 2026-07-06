// Hot-DM classifier for the IG collector.
//
// Each inbound DM is classified by Claude Haiku (claude-haiku-4-5-20251001) as HOT (a
// sales-relevant inquiry: about paid services/ads, booking a call, or pricing) vs NOT.
// Only the resulting count is ever stored.
//
// PRIVACY: the message text is sent ONLY to the Anthropic API for this single judgment.
// It is never logged and never persisted.

import { fetchRetry, retryOpts } from './http.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM = [
  'You classify a single inbound Instagram direct message sent to a video-editing agency.',
  'Answer HOT only if it is a sales-relevant inquiry: asking about the agency’s paid',
  'services or ads, wanting to book a call/demo, or asking about pricing, cost, or packages.',
  'Answer NOT for everything else: greetings, spam, collaboration or partnership pitches,',
  'job/editor applications, fan messages, or unrelated chatter.',
  'Reply with exactly one word: HOT or NOT.',
].join(' ');

// Classify one DM. Returns true if HOT. Throws on API failure so the caller can decide
// to skip the whole hotDms metric rather than silently undercount.
export async function classifyHot(text, env) {
  const res = await fetchRetry(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY_ADITOR,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 5,
      system: SYSTEM,
      messages: [{ role: 'user', content: text }],
    }),
  }, retryOpts(env));
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Anthropic classify -> ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const out = (data.content?.[0]?.text || '').trim().toUpperCase();
  return out.startsWith('HOT');
}

// Count hot DMs across a list of message texts. Sequential (weekly volume is low); a
// classification failure propagates so the caller can leave hotDms unwritten.
export async function countHotDms(texts, env) {
  let count = 0;
  for (const text of texts) {
    if (await classifyHot(text, env)) count += 1;
  }
  return count;
}
