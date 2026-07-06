// Shared, fully synthetic scenario for the collector T1 suite. Reverse-engineered from
// the consumer code (IG Graph shapes, Teable record shapes, Anthropic messages shape) -
// never captured from a live call. All DM text is fictional and tagged with DM_MARKER so
// tests can assert it never leaks into a Teable payload or a log line.

export const SELF_ID = '17841400000000000';

// Monday 05:00 UTC (the cron instant). Target = previous completed week = KW07
// (2026-02-09 .. 2026-02-15), aligned with the dashboard's Feb-2026 fixtures.
export const NOW = new Date('2026-02-16T05:00:00Z');

export const REACH_DAILY = [812, 903, 777, 845, 760, 731, 756];
export const REACH_TOTAL = REACH_DAILY.reduce((a, b) => a + b, 0); // 5584

export const DM_MARKER = 'SYNTH_DM_TEXT'; // privacy tripwire - must never reach Teable/logs

// Inbound-DM fixtures. Only in-week (KW07) inbound messages are classified. HOT-by-meaning
// = a sales inquiry (pricing / booking a call / ads). These strings are invented.
export const MESSAGES = [
  { message: `${DM_MARKER} what are your pricing packages?`, from: { id: 'user_a' }, created_time: '2026-02-10T10:00:00+01:00' }, // in-week, HOT
  { message: `${DM_MARKER} can I book a call this week?`, from: { id: 'user_b' }, created_time: '2026-02-12T09:00:00+01:00' }, // in-week, HOT
  { message: `${DM_MARKER} love your edits, big fan!`, from: { id: 'user_c' }, created_time: '2026-02-13T18:00:00+01:00' }, // in-week, NOT
  { message: `${DM_MARKER} thanks, sending our deck now`, from: { id: SELF_ID }, created_time: '2026-02-13T18:05:00+01:00' }, // outbound -> excluded
  { message: `${DM_MARKER} interested in your ads service`, from: { id: 'user_d' }, created_time: '2026-02-16T09:00:00+01:00' }, // KW08 -> excluded
  { message: `${DM_MARKER} how much do you charge?`, from: { id: 'user_e' }, created_time: '2026-02-08T22:00:00+01:00' }, // KW06 -> excluded
];
export const EXPECTED_HOT = 2; // user_a + user_b
export const EXPECTED_CLASSIFIED = 3; // user_a, user_b, user_c reach the classifier

export function makeEnv(overrides = {}) {
  return {
    TEABLE_CLOUD_BASE_URL: 'https://app.teable.ai',
    TEABLE_TABLE_ID: 'tbl7295480347s6oVaI',
    TEABLE_CLOUD_GENERAL_ACCESS: 'test-teable-token',
    INSTAGRAM_ADITOR_TOKEN: 'test-ig-token',
    ANTHROPIC_API_KEY_ADITOR: 'test-anthropic-key',
    IG_API_BASE: 'https://graph.instagram.com/v21.0',
    ANTHROPIC_MODEL: 'claude-haiku-4-5-20251001',
    RETRY_BASE_MS: '1', // keep retry backoff ~instant under test
    ...overrides,
  };
}

const FIELDS = ['week', 'start', 'end', 'followers', 'impressions', 'hotDms', 'reach'].map((name) => ({
  name,
  type: 'number',
}));

export const ROW_KW07 = {
  id: 'recKW07',
  fields: { week: 'KW07', start: '2026-02-09T00:00:00.000Z', end: '2026-02-15T00:00:00.000Z' },
};

export const ROWS_WITH_KW07 = [
  { id: 'recKW05', fields: { week: 'KW05', start: '2026-01-26T00:00:00.000Z' } },
  { id: 'recKW06', fields: { week: 'KW06', start: '2026-02-02T00:00:00.000Z' } },
  ROW_KW07,
];

export const ROWS_WITHOUT_KW07 = [
  { id: 'recKW05', fields: { week: 'KW05', start: '2026-01-26T00:00:00.000Z' } },
  { id: 'recKW06', fields: { week: 'KW06', start: '2026-02-02T00:00:00.000Z' } },
];

// Stand-in for the Haiku judgment: HOT if the DM reads as a sales inquiry (pricing,
// cost, booking a call, or ads). Substring match on purpose - "pricing"/"packages" are
// prefixes, so this must not require whole-word boundaries.
function classifyText(text) {
  return /pric|cost|charge|book a call|package|ads/i.test(text);
}

export function makeHandlers({
  records = ROWS_WITH_KW07,
  fields = FIELDS,
  reachValues = REACH_DAILY,
  messages = MESSAGES,
  reachFail = false,
  classifyFail = false,
  meNoId = false,
} = {}) {
  const has = (u, s) => u.includes(s);
  return [
    // Teable: list fields (ensureReachField)
    { method: 'GET', match: (u) => has(u, '/field'), respond: () => ({ json: fields }) },
    // Teable: list records
    { method: 'GET', match: (u) => has(u, '/record') && !has(u, '/record/'), respond: () => ({ json: { records } }) },
    // Teable: PATCH existing row
    { method: 'PATCH', match: (u) => has(u, '/record/'), respond: () => ({ json: { record: {} } }) },
    // Teable: POST create row
    { method: 'POST', match: (u) => has(u, '/record'), respond: () => ({ json: { records: [{ id: 'recNEW' }] } }) },
    // IG: profile
    {
      method: 'GET',
      match: (u) => has(u, '/me?fields=user_id'),
      respond: () => ({ json: meNoId ? { username: 'aditor.ai' } : { user_id: SELF_ID, username: 'aditor.ai' } }),
    },
    // IG: insights reach
    {
      method: 'GET',
      match: (u) => has(u, '/insights'),
      respond: () =>
        reachFail
          ? { status: 500 }
          : {
              json: {
                data: [
                  {
                    name: 'reach',
                    period: 'day',
                    values: reachValues.map((v, i) => ({ value: v, end_time: `2026-02-${9 + i}T08:00:00+0000` })),
                  },
                ],
              },
            },
    },
    // IG: conversations (step 1 - ids + updated_time only)
    {
      method: 'GET',
      match: (u) => has(u, '/me/conversations'),
      respond: () => ({ json: { data: [{ id: 'conv1', updated_time: '2026-02-15T10:00:00+01:00' }], paging: {} } }),
    },
    // IG: conversation messages (step 2)
    {
      method: 'GET',
      match: (u) => has(u, '/messages'),
      respond: () => ({ json: { data: messages, paging: {} } }),
    },
    // Anthropic: classify one DM
    {
      method: 'POST',
      match: (u) => has(u, 'api.anthropic.com/v1/messages'),
      respond: (_u, init) => {
        if (classifyFail) return { status: 500 };
        const body = JSON.parse(init.body);
        const text = body.messages?.[0]?.content ?? '';
        return { json: { content: [{ type: 'text', text: classifyText(text) ? 'HOT' : 'NOT' }] } };
      },
    },
  ];
}
