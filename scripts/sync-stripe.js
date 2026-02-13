#!/usr/bin/env node
/**
 * Sync Stripe metrics → Google Sheets
 * Metrics: Revenue (MRR), Avg Deal Size, Churn Rate, Active Clients
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1_kVI6NZx36g5Mgj-u5eJWauyALfeqTIt8C6ATJ5tUgs';

async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
  });
  return res.json();
}

async function calculateMetrics() {
  // Get all active subscriptions
  const subs = await stripeGet('/subscriptions?status=active&limit=100');
  
  const activeSubs = subs.data || [];
  const activeCount = activeSubs.length;
  
  // Calculate MRR (sum of all subscription amounts)
  let totalMRR = 0;
  for (const sub of activeSubs) {
    // Amount is in cents, items may have multiple line items
    for (const item of sub.items.data) {
      const amount = item.price.unit_amount || 0;
      const interval = item.price.recurring?.interval || 'month';
      const intervalCount = item.price.recurring?.interval_count || 1;
      
      // Normalize to monthly
      if (interval === 'year') {
        totalMRR += (amount / 100) / 12;
      } else if (interval === 'month') {
        totalMRR += (amount / 100) / intervalCount;
      }
    }
  }
  
  const avgDealSize = activeCount > 0 ? Math.round(totalMRR / activeCount) : 0;
  
  // Get recent cancellations for churn
  const oneMonthAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  const canceled = await stripeGet(`/subscriptions?status=canceled&created[gte]=${oneMonthAgo}&limit=100`);
  const canceledCount = (canceled.data || []).length;
  const churnRate = activeCount > 0 ? Math.round((canceledCount / (activeCount + canceledCount)) * 100) : 0;
  
  return {
    mrr: Math.round(totalMRR),
    activeClients: activeCount,
    avgDealSize,
    churnRate,
  };
}

async function main() {
  console.log('Syncing Stripe metrics...');
  
  if (!STRIPE_SECRET_KEY) {
    console.error('Missing STRIPE_SECRET_KEY');
    process.exit(1);
  }
  
  const metrics = await calculateMetrics();
  
  console.log('\nResults:');
  console.log(`  MRR: €${metrics.mrr}`);
  console.log(`  Active Clients: ${metrics.activeClients}`);
  console.log(`  Avg Deal Size: €${metrics.avgDealSize}`);
  console.log(`  Churn Rate: ${metrics.churnRate}%`);
  
  console.log('\nJSON:', JSON.stringify(metrics));
}

main().catch(console.error);
