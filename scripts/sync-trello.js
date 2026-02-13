#!/usr/bin/env node
/**
 * Sync Trello metrics → Google Sheets
 * Metrics: Delivery Time, Briefings Delivered, Editor Utilization, Good Editors #
 */

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1_kVI6NZx36g5Mgj-u5eJWauyALfeqTIt8C6ATJ5tUgs';

// Active client boards with Done list IDs
const BOARDS = {
  'Veda Naturals': { id: '659e837b323fedb69874aa8e', doneListId: '659e837b323fedb69874aa92' },
  'Bawldy': { id: '67f0cb9a1b0f40c75fc8a775', doneListId: null },
  'Clubwell': { id: '698200b821f08f379f46f2e1', doneListId: null },
  'Gracen App': { id: '695f931beb698bd8dceb3d7f', doneListId: null },
  'mammaly': { id: '6988e4fdaf15828b7b9fb281', doneListId: null },
  'Get A Drip': { id: '698701f95e78c144ae14d6dd', doneListId: null },
  '305 Care': { id: '6943e8d3ffc79bfe4494ebb0', doneListId: null },
};

const EDITOR_CAPACITY = 19; // cards/week

async function trelloGet(path) {
  const url = `https://api.trello.com/1${path}${path.includes('?') ? '&' : '?'}key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
  const res = await fetch(url);
  return res.json();
}

async function getDeliveredCards(boardId, since) {
  // Get all cards on the board that were last active since the date
  const cards = await trelloGet(`/boards/${boardId}/cards?fields=name,idList,dateLastActivity&since=${since}`);
  return cards;
}

async function getDoneListId(boardId) {
  const lists = await trelloGet(`/boards/${boardId}/lists?fields=name,id`);
  // Look for "Delivered" or "Done" list
  const doneList = lists.find(l => 
    l.name.includes('Delivered') || 
    l.name.includes('Done') || 
    l.name.includes('✅')
  );
  return doneList ? doneList.id : null;
}

async function calculateMetrics() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  let totalDelivered = 0;
  let deliveryTimes = [];
  let activeEditors = new Set();
  
  for (const [name, board] of Object.entries(BOARDS)) {
    try {
      // Find done list if not already known
      let doneListId = board.doneListId;
      if (!doneListId) {
        doneListId = await getDoneListId(board.id);
        if (!doneListId) {
          console.log(`  ${name}: No done list found, skipping`);
          continue;
        }
      }
      
      // Get cards in done list
      const doneCards = await trelloGet(`/lists/${doneListId}/cards?fields=name,dateLastActivity`);
      
      // Count cards delivered this week
      const thisWeek = doneCards.filter(c => new Date(c.dateLastActivity) > new Date(oneWeekAgo));
      totalDelivered += thisWeek.length;
      
      console.log(`  ${name}: ${thisWeek.length} delivered this week`);
    } catch (err) {
      console.error(`  ${name}: Error - ${err.message}`);
    }
  }
  
  const utilization = Math.round((totalDelivered / EDITOR_CAPACITY) * 100);
  
  return {
    briefingsDelivered: totalDelivered,
    editorUtilization: utilization,
    // deliveryTime: average from timestamps (need card action history for accuracy)
  };
}

async function main() {
  console.log('Syncing Trello metrics...');
  
  if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
    console.error('Missing TRELLO_API_KEY or TRELLO_TOKEN');
    process.exit(1);
  }
  
  const metrics = await calculateMetrics();
  
  console.log('\nResults:');
  console.log(`  Briefings Delivered: ${metrics.briefingsDelivered}`);
  console.log(`  Editor Utilization: ${metrics.editorUtilization}%`);
  
  // TODO: Write to Google Sheets via API
  // For now, output as JSON
  console.log('\nJSON:', JSON.stringify(metrics));
}

main().catch(console.error);
