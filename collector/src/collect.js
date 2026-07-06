// Orchestration for one weekly IG collection run.
//
// Collects the two captain-settled metrics - organic reach + classified hot-DM count -
// and upserts them into the previous completed week's Teable row (matching the n8n
// cadence). reach and hotDms are collected INDEPENDENTLY: if one source fails we still
// write the other, and a failed metric is omitted from the upsert (its prior value is
// preserved). Followers is intentionally NOT written - the n8n "Fetch Meta Metrics"
// workflow owns it.
import { computeTargetWeek } from './week.js';
import { ensureReachField, upsertWeekMetrics } from './teable.js';
import { fetchMe, fetchWeeklyReach, fetchInboundMessages } from './instagram.js';
import { countHotDms } from './classify.js';

export async function runCollection(env, { now = new Date(), log = console.log } = {}) {
  const target = computeTargetWeek(now);
  log(`[ig-collector] target week ${target.week} (${target.weekStart}..${target.weekEnd})`);

  await ensureReachField(env);
  const me = await fetchMe(env);

  let reach = null;
  try {
    reach = await fetchWeeklyReach(env, target, me);
    log(`[ig-collector] reach=${reach}`);
  } catch (e) {
    log(`[ig-collector] reach FAILED: ${e.message}`);
  }

  let hotDms = null;
  try {
    const inbound = await fetchInboundMessages(env, target, me);
    // inbound holds raw DM text - passed only to the classifier below, never logged or
    // persisted. We log the COUNT of messages, never their content.
    log(`[ig-collector] classifying ${inbound.length} inbound DMs`);
    hotDms = await countHotDms(inbound, env);
    log(`[ig-collector] hotDms=${hotDms}`);
  } catch (e) {
    log(`[ig-collector] hotDms FAILED: ${e.message}`);
  }

  const result = await upsertWeekMetrics(env, target, { reach, hotDms });
  log(`[ig-collector] upsert mode=${result.mode} record=${result.recordId} fields=${JSON.stringify(result.fields)}`);
  return { target, reach, hotDms, ...result };
}
