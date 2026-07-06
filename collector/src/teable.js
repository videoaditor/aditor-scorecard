// Teable delivery for the IG collector.
//
// Base host is BARE ("https://app.teable.ai", no /api) and carries a possible trailing
// slash to strip, or you get //api 404s. A real User-Agent is required to clear the WAF.
// Token TEABLE_CLOUD_GENERAL_ACCESS has full write scope (field|create, record|update).
//
// The collector writes ONLY `reach` + `hotDms` into the target week's row. Every other
// field (followers, followersCount, impressions, and the n8n-derived ratios) is owned by
// the n8n workflows and is left untouched.
import { berlinDate } from './week.js';
import { fetchRetry, retryOpts } from './http.js';

const UA = 'aditor-scorecard-ig-collector/1.0 (+https://score.aditor.ai)';

function apiBase(env) {
  return String(env.TEABLE_CLOUD_BASE_URL || '').replace(/\/+$/, '');
}

async function teableFetch(env, path, init = {}) {
  const res = await fetchRetry(`${apiBase(env)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.TEABLE_CLOUD_GENERAL_ACCESS}`,
      'User-Agent': UA,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  }, retryOpts(env));
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Teable ${init.method || 'GET'} ${path} -> ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.status === 204 ? null : res.json();
}

// Idempotently ensure the `reach` number field exists (self-heal if the table is ever
// rebuilt). No-op on every normal run once the field is present.
export async function ensureReachField(env) {
  const tableId = env.TEABLE_TABLE_ID;
  const data = await teableFetch(env, `/api/table/${tableId}/field`);
  const fields = Array.isArray(data) ? data : data.fields || [];
  if (fields.some((f) => f.name === 'reach')) return false;
  await teableFetch(env, `/api/table/${tableId}/field`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'reach',
      type: 'number',
      description:
        'Organic Instagram reach for the week (unique accounts reached). Written by the wire-ig-metrics collector. NOT paid-ad impressions.',
      options: { formatting: { type: 'decimal', precision: 0 } },
    }),
  });
  return true;
}

export async function getRecords(env) {
  const tableId = env.TEABLE_TABLE_ID;
  const data = await teableFetch(env, `/api/table/${tableId}/record?take=1000&fieldKeyType=name`);
  return data.records || [];
}

// Find the target week's row the same way the n8n workflows do: match by `start` date
// (Berlin-local) === weekStart. Fall back to the `week` KW string in case a row exists
// before its start date has settled. Returns the record or null.
export function findWeekRow(records, target) {
  const byStart = records.find(
    (r) => r.fields && r.fields.start && berlinDate(r.fields.start) === target.weekStart,
  );
  if (byStart) return byStart;
  return records.find((r) => r.fields && r.fields.week === target.week) || null;
}

// Upsert reach + hotDms into the target week's row. Only finite numbers are written, so
// a failed source (null) is simply omitted and any prior value is preserved. If the row
// does not exist yet, create it with week/start/end so it is a valid, matchable row.
export async function upsertWeekMetrics(env, target, metrics) {
  const tableId = env.TEABLE_TABLE_ID;
  const fields = {};
  if (Number.isFinite(metrics.reach)) fields.reach = metrics.reach;
  if (Number.isFinite(metrics.hotDms)) fields.hotDms = metrics.hotDms;
  if (Object.keys(fields).length === 0) return { mode: 'noop', recordId: null, fields };

  const records = await getRecords(env);
  const row = findWeekRow(records, target);

  if (row) {
    await teableFetch(env, `/api/table/${tableId}/record/${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fieldKeyType: 'name', record: { fields } }),
    });
    return { mode: 'update', recordId: row.id, fields };
  }

  const created = await teableFetch(env, `/api/table/${tableId}/record`, {
    method: 'POST',
    body: JSON.stringify({
      fieldKeyType: 'name',
      records: [{ fields: { week: target.week, start: target.weekStart, end: target.weekEnd, ...fields } }],
    }),
  });
  return { mode: 'create', recordId: created?.records?.[0]?.id || null, fields };
}
