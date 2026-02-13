#!/usr/bin/env node
/**
 * Sync Meta Ads metrics → Google Sheets
 * Metrics: CPL, Ad Spend, Impressions/Reach
 */

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1_kVI6NZx36g5Mgj-u5eJWauyALfeqTIt8C6ATJ5tUgs';

async function metaGet(path) {
  const url = `https://graph.facebook.com/v19.0${path}${path.includes('?') ? '&' : '?'}access_token=${META_ACCESS_TOKEN}`;
  const res = await fetch(url);
  return res.json();
}

async function calculateMetrics() {
  if (!META_AD_ACCOUNT_ID) {
    console.error('Missing META_AD_ACCOUNT_ID');
    return null;
  }
  
  // Get last 7 days insights
  const insights = await metaGet(
    `/act_${META_AD_ACCOUNT_ID}/insights?fields=spend,impressions,reach,cost_per_action_type,actions&date_preset=last_7d`
  );
  
  if (!insights.data || insights.data.length === 0) {
    console.log('No insights data returned');
    return { cpl: 0, adSpend: 0, impressions: 0, reach: 0 };
  }
  
  const data = insights.data[0];
  const spend = parseFloat(data.spend || 0);
  const impressions = parseInt(data.impressions || 0);
  const reach = parseInt(data.reach || 0);
  
  // Find CPL (cost per lead)
  let cpl = 0;
  const costPerAction = data.cost_per_action_type || [];
  const leadCost = costPerAction.find(a => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead');
  if (leadCost) {
    cpl = parseFloat(leadCost.value);
  } else if (data.actions) {
    // Fallback: total spend / total leads
    const leads = data.actions.find(a => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead');
    if (leads) {
      cpl = spend / parseInt(leads.value);
    }
  }
  
  return {
    cpl: Math.round(cpl * 100) / 100,
    adSpend: Math.round(spend * 100) / 100,
    impressions,
    reach,
  };
}

async function main() {
  console.log('Syncing Meta Ads metrics...');
  
  if (!META_ACCESS_TOKEN) {
    console.error('Missing META_ACCESS_TOKEN');
    process.exit(1);
  }
  
  const metrics = await calculateMetrics();
  if (!metrics) return;
  
  console.log('\nResults:');
  console.log(`  CPL: €${metrics.cpl}`);
  console.log(`  Ad Spend: €${metrics.adSpend}`);
  console.log(`  Impressions: ${metrics.impressions.toLocaleString()}`);
  console.log(`  Reach: ${metrics.reach.toLocaleString()}`);
  
  console.log('\nJSON:', JSON.stringify(metrics));
}

main().catch(console.error);
