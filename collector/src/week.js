// Week selection for the IG collector.
//
// The collector must upsert into the SAME Teable weekly row that the n8n metric
// workflows write, never a duplicate. Both "Fetch Meta Metrics" (Mon 03:50 Berlin)
// and "Compute Derived Metrics" (Mon 04:10 Berlin) target the PREVIOUS COMPLETED
// week - lastMonday = thisMonday - 7d, lastSunday = lastMonday + 6d - and key the row
// by its `start` date (converted to Berlin-local). "Compute Derived Metrics" also
// stamps `week` = "KW" + zero-padded ISO week. We replicate all three here from a
// single `now`, so weekStart/weekEnd/week line up exactly with theirs.

// { weekStart: 'YYYY-MM-DD', weekEnd: 'YYYY-MM-DD', week: 'KWnn' } for the completed
// week preceding `now`. Derived from day-of-week (not a raw -7) so a mis-timed run
// still resolves to the correct completed week.
export function computeTargetWeek(now) {
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dowMon0 = (base.getUTCDay() + 6) % 7; // 0=Mon ... 6=Sun
  const thisMonday = new Date(base);
  thisMonday.setUTCDate(base.getUTCDate() - dowMon0);
  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);
  const lastSunday = new Date(lastMonday);
  lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);

  const fmt = (d) => d.toISOString().split('T')[0];
  return {
    weekStart: fmt(lastMonday),
    weekEnd: fmt(lastSunday),
    week: isoWeekLabel(lastMonday),
  };
}

// ISO-8601 week label "KWnn". Same algorithm as n8n "Compute Last Week" and the
// dashboard's getISOWeek (App.jsx), so KW numbering is identical everywhere.
export function isoWeekLabel(monday) {
  const d = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)); // to Thursday of this week
  const week1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7);
  return `KW${String(weekNum).padStart(2, '0')}`;
}

// Berlin-local YYYY-MM-DD for a stored Teable date. Matches how the n8n workflows key
// the weekly row: new Date(start).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }).
export function berlinDate(iso) {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
}

// True if an ISO timestamp falls within [weekStart, weekEnd] by Berlin-local calendar
// date. String compare of YYYY-MM-DD is correct and DST-proof (no offset math).
export function inWeek(iso, target) {
  const d = berlinDate(iso);
  return d >= target.weekStart && d <= target.weekEnd;
}

// UNIX seconds for a YYYY-MM-DD at 00:00 UTC. Used for IG insights since/until windows.
export function unixDay(ymd) {
  return Math.floor(Date.parse(`${ymd}T00:00:00Z`) / 1000);
}
