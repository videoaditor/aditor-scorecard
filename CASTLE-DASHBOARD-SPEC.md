# Castle Dashboard Spec — RPG Brand Health View

## Overview
Add a new "Kingdom" view to the existing Aditor Scorecard React app. It displays each brand as a small RPG-style castle on a grid. Castles visually change state (thriving → neutral → burning) based on real-time Trello board metrics.

## Architecture
- **Same React app** — add as a new tab/view alongside existing scorecard
- **New component:** `CastleGrid.jsx` in `src/components/`
- **New CSS:** `castle-grid.css` in `src/`  
- **Textures already generated:** `public/castles/castle-thriving.png`, `castle-neutral.png`, `castle-burning.png`
- **Data source:** Trello API (fetched client-side via JSONP/fetch, same pattern as Google Sheets)

## Brand List & Trello Board IDs
```json
[
  {"name": "Trimrx", "boardId": "694c0369d47a6290013618bf", "weeklyTarget": 7},
  {"name": "Bawldy", "boardId": "67f0cb9a1b0f40c75fc8a775", "weeklyTarget": 4},
  {"name": "Levide", "boardId": "67bc590812c69402ea9d9f06", "weeklyTarget": 4},
  {"name": "Proof Brother", "boardId": "68ed202b173b82026d654534", "weeklyTarget": 4},
  {"name": "Olivia Morasch", "boardId": "6967ebdad0d73178cd328741", "weeklyTarget": 4},
  {"name": "Buchmann", "boardId": "696664ab5ad668aa8fab94b1", "weeklyTarget": 4},
  {"name": "Gracen App", "boardId": "695f931beb698bd8dceb3d7f", "weeklyTarget": 3},
  {"name": "Veda Naturals", "boardId": "6982013f1b7c1907b8e1ce3e", "weeklyTarget": 3},
  {"name": "mammaly", "boardId": "699d14f9e219ce0fdee1830d", "weeklyTarget": 2},
  {"name": "Dr Franks", "boardId": "6932873feb9c3c5313aeeb1d", "weeklyTarget": 2},
  {"name": "Clubwell", "boardId": "698200b821f08f379f46f2e1", "weeklyTarget": 2},
  {"name": "Get A Drip", "boardId": "698701f95e78c144ae14d6dd", "weeklyTarget": 2},
  {"name": "Lift", "boardId": "698200c32ec3f0731aadaba2", "weeklyTarget": 2},
  {"name": "LOTUS", "boardId": "698200ab0582c207695d4d40", "weeklyTarget": 2},
  {"name": "PEAQ Skin", "boardId": "699d15b0d0e2c5eb22b640e8", "weeklyTarget": 0}
]
```

## Trello API Credentials (use in fetch calls)
```
TRELLO_KEY=bf16d408d0f653007b19b284a12722ca
TRELLO_TOKEN=ATTA84609b8ad96b75f0dd48a60169d5521d6b88bc1e2103fdbc22fc40da4fdc1177CE91BF8F
```

## Health Score Logic

Each brand gets a health score (0-100) calculated from these metrics:

### 1. Card Cadence (40% weight)
- Fetch cards moved to "Active"/"Aktiv"/"Done"/"Delivered" lists this week
- API: `GET /1/boards/{boardId}/actions?filter=updateCard:idList&since={mondayISO}&limit=200`
- Count actions where `data.listAfter.name` matches Active/Aktiv/Done/Delivered (case insensitive)
- Score: `(cardsThisWeek / weeklyTarget) * 100`, capped at 100

### 2. Queue Depth — NextUp scripts ready (30% weight)  
- Fetch lists on board: `GET /1/boards/{boardId}/lists?fields=name`
- Find list with name matching "NextUp" or "Next Up" (case insensitive)
- Count cards in that list: `GET /1/lists/{listId}/cards?fields=id`
- Score: 0 cards = 0, 1-2 cards = 50, 3+ cards = 100

### 3. Active Work — cards being worked on NOW (30% weight)
- Find list matching "Active" or "Aktiv" or "In Progress" (case insensitive)
- Count cards in that list
- Score: 0 cards = 0 (nobody working!), 1+ cards = 100

### Combined Health Score
`health = (cadence * 0.4) + (queue * 0.3) + (active * 0.3)`

### Castle State Mapping
- **health >= 70** → Thriving (castle-thriving.png) — green glow, banners wave
- **health 30-69** → Neutral (castle-neutral.png) — no effects, slightly dim
- **health < 30** → Burning (castle-burning.png) — red glow, flames animate, smoke CSS

### Special: PEAQ Skin (weeklyTarget = 0)
- Always show as neutral (new brand, no targets yet)

## UI Layout

### Navigation
Add a toggle at the top of the app — two tabs: "Scorecard" (existing) and "Kingdom" (new castle view).
Style the toggle to match the existing view-toggle pattern.

### Castle Grid
- Responsive grid: 5 columns on desktop, 3 on tablet, 2 on mobile
- Each castle cell: ~180px wide, castle image centered
- Brand name below castle in pixel-art style font (use `'Press Start 2P'` from Google Fonts, fallback to monospace)
- On hover: show tooltip card with metrics breakdown:
  - Cards this week: X / Y target
  - NextUp queue: X scripts
  - Active cards: X
  - Health score: XX%

### Castle Animations (CSS only, lightweight)
- **Thriving:** subtle pulse glow (green/gold), flag-wave keyframe (slight rotate on image)
- **Neutral:** none, slightly desaturated with CSS filter
- **Burning:** 
  - Red/orange box-shadow pulse
  - CSS fire flicker effect (pseudo-element with gradient animation)
  - Slight shake keyframe

### Castle Click Behavior
Click a castle → expand a detail panel below the grid (or slide-down accordion):
- Shows the 3 metrics with progress bars
- Links to Trello board: `https://trello.com/b/{boardId}`
- Shows last 5 card movements (from the actions API data already fetched)

### Color Scheme
Match existing dark theme:
- Background: var(--bg) #0a0a0f
- Surface: var(--surface) #111118  
- Green/Yellow/Red from existing CSS vars
- Add a subtle grass/terrain texture to the grid background (CSS gradient, no image needed)

## Data Fetching
- Fetch all board data on mount + every 5 minutes (same as scorecard)
- Use Promise.all for parallel board fetches
- Cache results in component state
- Show skeleton/loading state while fetching
- If a board fetch fails, show that castle as neutral with "?" indicator

## File Structure
```
src/
  components/
    CastleGrid.jsx      ← Main castle grid component
    CastleCard.jsx       ← Individual castle with animations
    CastleDetail.jsx     ← Expanded detail panel
  castle-grid.css        ← All castle-specific styles
  App.jsx                ← Modified: add tab navigation + CastleGrid route
  index.css              ← Add Google Font import for Press Start 2P
```

## Existing App.jsx Modifications
1. Add state for active view: `const [activeView, setActiveView] = useState('scorecard')`
2. Add navigation tabs above the header
3. Conditionally render existing scorecard content OR CastleGrid based on activeView
4. Keep all existing scorecard code untouched — just wrap it in a conditional

## Important Notes
- DO NOT break the existing scorecard. All existing code stays as-is.
- The Trello API key/token are already in the codebase (sync scripts), but for client-side use we need to be careful about exposing them. Since this is a private GitHub Pages site with no SEO, it's acceptable for now.
- The castle images in `public/castles/` are 1024x1024 PNGs. Scale them down to ~120-150px display size via CSS.
- Keep bundle size small — no extra npm dependencies. Pure React + CSS animations.
- After building, deploy with: `npm run build && npx gh-pages -d dist`

## Acquisition Rate Metric (Scorecard Addition — SEPARATE TASK)
Also add "Acquisition Rate" to the Customer Success department in the scorecard:
- Definition: (new subs created this week / "Aditor First Week" purchases this week) * 100
- This will need a new column in the Google Sheet and sync script update
- For now, just add the metric definition to METRICS and DEPARTMENTS in App.jsx with placeholder data column
- New metric key: `acquisitionRate`
- Display: percentage, higher is better, green >= 60%, yellow >= 30%
