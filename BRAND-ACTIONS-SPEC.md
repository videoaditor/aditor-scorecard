# Brand Actions — Pokémon-Style Command System

## Concept

When you open a struggling brand's detail panel, you see a set of **action buttons** styled like Pokémon attacks. Each action directly triggers a real backend task — writing scripts, rebalancing queues, dispatching editors, etc. The dashboard becomes a **command center**, not just a status screen.

## Visual Design

```
┌─────────────────────────────────────────────────────┐
│  🏰 Trimrx                          Health: 81% ✨  │
│  ─────────────────────────────────────────────────── │
│  📦 Delivery 7/7  🎵 Rhythm: consistent  💬 +1.2   │
│                                                      │
│  ⚔️ ACTIONS                                         │
│  ┌─────────────────┐ ┌─────────────────┐            │
│  │ 📜 WRITE SCRIPTS │ │ 📋 FILL QUEUE   │            │
│  │ PP: 15/15       │ │ PP: 10/10       │            │
│  │ "Generate 2 new │ │ "Move Pipeline  │            │
│  │  ad scripts"    │ │  → NextUp"      │            │
│  └─────────────────┘ └─────────────────┘            │
│  ┌─────────────────┐ ┌─────────────────┐            │
│  │ 🎯 DISPATCH     │ │ 🔥 EMERGENCY    │            │
│  │ PP: 8/8         │ │ PP: 20/20       │            │
│  │ "Assign editor  │ │ "Full pipeline: │            │
│  │  to NextUp card"│ │  scripts→queue→ │            │
│  └─────────────────┘ │  dispatch"      │            │
│                       └─────────────────┘            │
└─────────────────────────────────────────────────────┘
```

## The Attacks

### 1. 📜 WRITE SCRIPTS — "Scriptorium"
**PP:** 15 (daily limit)
**Type:** Creative
**Effect:** Sends command to Player (me) to write N new ad scripts for the brand
**Trigger conditions:** Queue < 3 scripts, or brand health < 50%

**What happens:**
1. Frontend sends `POST /api/brand-health/action`
2. Backend queues a task: `{ action: "write_scripts", brand: "Trimrx", count: 2 }`
3. Player receives Telegram notification: "🏰 SCRIPTORIUM activated for Trimrx — write 2 scripts"
4. Player executes the scripting pipeline (ad-scripting skill)
5. Status updates in real-time on the dashboard

**Smart defaults:**
- count = `Math.max(2, weeklyTarget - deliveredThisWeek)` (fill the gap)
- Uses brand context from `brands/[brand]/brand.md`
- Follows mandatory scripting pipeline (AGENTS.md)

### 2. 📋 FILL QUEUE — "Queue Aikido"
**PP:** 10
**Type:** Management
**Effect:** Moves cards from Pipeline → NextUp, or rebalances between brands

**What happens:**
1. Scans Trello Pipeline list for approved scripts
2. Moves up to N cards to NextUp
3. If Pipeline is empty, suggests WRITE SCRIPTS first
4. Returns count of cards moved

**Smart defaults:**
- count = `Math.max(1, 3 - queueDepth)` (fill to 3)
- Skips cards with unresolved comments
- Prioritizes oldest Pipeline cards

### 3. 🎯 DISPATCH — "Call to Arms"
**PP:** 8
**Type:** Assignment
**Effect:** Finds an available editor and assigns them to the brand's NextUp card

**What happens:**
1. Checks NextUp for unassigned cards
2. Finds editors with `kappa=open` and matching language
3. Sends Slack DM to editor with card details
4. Updates Trello card (assigns member)
5. Notifies Alan via Telegram

**Smart defaults:**
- Prioritizes editors who've worked this brand before (familiarity)
- Falls back to highest trust score if no familiar editors available
- Won't dispatch to editors already at capacity (3+ active cards)

### 4. 🔥 EMERGENCY — "Blitz Protocol"
**PP:** 20 (weekly limit: 3)
**Type:** Ultimate
**Effect:** Full pipeline blast: write scripts → queue → dispatch — all in one

**What happens:**
1. Writes `weeklyTarget` scripts for the brand
2. Creates Trello cards in Pipeline
3. After Alan review (24h timer), auto-moves to NextUp
4. Auto-dispatches to available editors
5. Sends full status report to Alan

**Cooldown:** 48h per brand (prevents spam)

### 5. 🔍 DIAGNOSE — "Health Scan"
**PP:** 5
**Type:** Utility
**Effect:** Deep analysis of what's wrong and recommended fix

**What happens:**
1. Runs full brand health analysis
2. Identifies root cause: scripts shortage? editor bottleneck? client feedback loop?
3. Returns prioritized action plan
4. Recommends which attack to use

**Output example:**
```
🔍 DIAGNOSIS: Dr Franks (0% health)
Root cause: 4 cards stuck in Amends >3 weeks
├── Sentiment: negative (client unhappy with recent work)
├── Queue: empty (no scripts ready)
└── Freshness: 13 days since delivery

Recommended: 
1. First: resolve Amends feedback (manual)
2. Then: WRITE SCRIPTS (new angle, avoid past mistakes)
3. Then: DISPATCH to experienced editor (not newbie)
```

### 6. 📊 ITERATE — "Ad Forge"
**PP:** 12
**Type:** Creative/Technical
**Effect:** Runs the winning-iterations pipeline on the brand's best ads

**What happens:**
1. Pulls Meta performance data for the brand
2. Identifies top performers (hook rate, CPL, CTR)
3. Generates iteration combos (cross-pollination, new hooks on proven bodies)
4. Stitches videos via local ffmpeg
5. Uploads to Google Drive test folder
6. Notifies Alan with Drive link

**Requirements:**
- Brand must have chopped ad components in Drive
- Meta ad account access configured
- Only available for brands with existing winning ads

## Backend Architecture

### New Endpoint: `POST /api/brand-health/action`

```json
{
  "action": "write_scripts" | "fill_queue" | "dispatch" | "emergency" | "diagnose" | "iterate",
  "brand": "Trimrx",
  "params": {
    "count": 2,
    "editorId": "recXXX"  // optional, for dispatch
  }
}
```

**Response:**
```json
{
  "taskId": "task_abc123",
  "status": "queued" | "running" | "completed" | "failed",
  "message": "Writing 2 scripts for Trimrx...",
  "estimatedTime": "~5 min"
}
```

### Task Queue

Tasks are stored in `backend/data/action-queue.json`:
```json
[
  {
    "id": "task_abc123",
    "action": "write_scripts",
    "brand": "Trimrx",
    "brandBoard": "694c0369d47a6290013618bf",
    "params": { "count": 2 },
    "status": "queued",
    "createdAt": "2026-02-25T22:30:00Z",
    "completedAt": null,
    "result": null
  }
]
```

### Execution: Telegram Webhook to Player

For actions that need Player (me) to execute:
1. Backend sends Telegram message to Player bot with structured command
2. Message format: `🎮 ACTION: {action}\n🏰 Brand: {brand}\n📋 Details: {params}\n🆔 Task: {taskId}`
3. Player parses and executes
4. Player calls `POST /api/brand-health/action/{taskId}/complete` when done

For actions that are fully automated (FILL QUEUE, DIAGNOSE):
1. Backend executes directly via Trello API
2. No human-in-loop needed
3. Instant result

### PP (Power Points) System

Each action has a cost. PP regenerates daily at midnight JST.
- Daily PP pool: 50
- Weekly PP pool: 250 (for EMERGENCY caps)
- PP tracks usage to prevent over-automation
- Visual: progress bar on each attack button showing PP remaining

**PP costs reflect effort:**
- DIAGNOSE: 5 PP (automated, cheap)
- DISPATCH: 8 PP (semi-automated)
- FILL QUEUE: 10 PP (Trello API calls)
- ITERATE: 12 PP (compute-heavy)
- WRITE SCRIPTS: 15 PP (creative AI work)
- EMERGENCY: 20 PP (full pipeline)

### Cooldowns

Per-brand cooldowns prevent spam:
- WRITE SCRIPTS: 4h
- FILL QUEUE: 1h
- DISPATCH: 2h
- EMERGENCY: 48h
- DIAGNOSE: 30min
- ITERATE: 24h

Stored in `backend/data/action-cooldowns.json`

## Frontend Components

### New: `BrandActions.jsx`
- Renders inside `CastleDetail.jsx` below metrics
- Grid of attack buttons (2 cols)
- Each button shows: icon, name, PP cost, description, cooldown timer
- Disabled state when: on cooldown, insufficient PP, or prerequisites not met
- Click → confirmation modal → POST → status toast
- Real-time status polling for running tasks

### New: `ActionButton.jsx`
- Pokémon battle menu style
- Gradient background based on type (Creative=purple, Management=blue, Assignment=green, Ultimate=red)
- PP indicator bar
- Cooldown overlay with countdown timer
- Hover: shows full description tooltip
- Click animation: press down + flash

### New: `ActionStatus.jsx`  
- Shows active/recent tasks for this brand
- Status badges: ⏳ queued, 🔄 running, ✅ completed, ❌ failed
- Auto-refreshes every 10s while tasks are running

### Updated: `CastleDetail.jsx`
- Add `<BrandActions brand={brand} />` section between metrics and activity
- Section header: "⚔️ ACTIONS" in Silkscreen font

## CSS Design

```css
/* Attack button — Pokémon battle menu style */
.action-btn {
  background: linear-gradient(135deg, var(--action-bg) 0%, var(--action-bg-end) 100%);
  border: 2px solid var(--action-border);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px var(--action-glow);
}

.action-btn:active:not(:disabled) {
  transform: translateY(1px) scale(0.98);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

/* Type colors */
.action-btn.creative { 
  --action-bg: rgba(139, 92, 246, 0.15);
  --action-bg-end: rgba(168, 85, 247, 0.1);
  --action-border: rgba(139, 92, 246, 0.3);
  --action-glow: rgba(139, 92, 246, 0.2);
}
.action-btn.management {
  --action-bg: rgba(59, 130, 246, 0.15);
  --action-bg-end: rgba(96, 165, 250, 0.1);
  --action-border: rgba(59, 130, 246, 0.3);
  --action-glow: rgba(59, 130, 246, 0.2);
}
.action-btn.assignment {
  --action-bg: rgba(34, 197, 94, 0.15);
  --action-bg-end: rgba(74, 222, 128, 0.1);
  --action-border: rgba(34, 197, 94, 0.3);
  --action-glow: rgba(34, 197, 94, 0.2);
}
.action-btn.ultimate {
  --action-bg: rgba(239, 68, 68, 0.15);
  --action-bg-end: rgba(248, 113, 113, 0.1);
  --action-border: rgba(239, 68, 68, 0.3);
  --action-glow: rgba(239, 68, 68, 0.2);
}

/* PP bar */
.action-pp {
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  margin-top: 8px;
}
.action-pp-fill {
  height: 100%;
  background: var(--action-border);
  border-radius: 2px;
  transition: width 0.3s;
}

/* Cooldown overlay */
.action-cooldown {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: var(--text-muted);
  border-radius: 12px;
}
```

## Smart Suggestions

The dashboard should suggest which actions to take based on the brand's health metrics:

```javascript
function suggestActions(brand) {
  const suggestions = []
  const { metrics, health } = brand
  
  // Low queue → write scripts
  if (metrics.queueDepth?.count < 2) {
    suggestions.push({ action: 'write_scripts', priority: 'high', reason: 'Queue nearly empty' })
  }
  
  // Nothing active → dispatch
  if (metrics.activeWork?.count === 0 && metrics.queueDepth?.count > 0) {
    suggestions.push({ action: 'dispatch', priority: 'high', reason: 'Scripts ready but no editor working' })
  }
  
  // Pipeline cards sitting → fill queue
  if (brand.pipelineCount > 0) {
    suggestions.push({ action: 'fill_queue', priority: 'medium', reason: `${brand.pipelineCount} scripts awaiting review` })
  }
  
  // Everything broken → emergency
  if (health < 20) {
    suggestions.push({ action: 'emergency', priority: 'critical', reason: 'Brand health critical' })
  }
  
  // Has winning ads → iterate
  if (brand.hasComponents) {
    suggestions.push({ action: 'iterate', priority: 'medium', reason: 'Generate new ad iterations' })
  }
  
  return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}
```

Suggested actions appear as a glowing border on the relevant button + a small "⚡ Recommended" badge.

## Implementation Order

### Phase 1 — MVP (build first)
1. `BrandActions.jsx` + `ActionButton.jsx` with UI only
2. `POST /api/brand-health/action` endpoint (queues to file)
3. DIAGNOSE action (fully automated, instant)
4. FILL QUEUE action (Trello API, instant)
5. Smart suggestions logic

### Phase 2 — Player Integration
6. WRITE SCRIPTS → Telegram notification to Player
7. DISPATCH → Slack + Trello automation
8. Task status polling + `ActionStatus.jsx`
9. PP system + cooldowns

### Phase 3 — Advanced
10. EMERGENCY full pipeline
11. ITERATE with winning-iterations skill
12. Action history log
13. PP analytics (which actions used most, ROI)

## Notes

- All actions are **reversible** except EMERGENCY (which is a chain)
- Actions log to `backend/data/action-log.json` for audit trail
- Alan can also trigger actions manually from the dashboard
- Player can trigger actions from Telegram too (bidirectional)
- The PP system is more flavor than restriction — it's about making the interface fun
- Cooldowns prevent accidental double-triggers, not intentional use
