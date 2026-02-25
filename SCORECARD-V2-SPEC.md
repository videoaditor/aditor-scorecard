# Scorecard V2 — Feature Spec

## Overview
Transform the castle brand health dashboard into an interactive management tool with editor assignment, drag-and-drop, and performance scorecards.

## Visual Changes

### 1. Bigger Castle Images
- Castle image wrapper: **120x120** (was 80x80)
- Editor sprites next to castles: **40x40** (was 28x28)
- All images use `image-rendering: pixelated` for crisp pixel art

### 2. Minecraft-style Font
- Use **Minecraft font** via Google Fonts or self-hosted
- URL: `https://fonts.googleapis.com/css2?family=Silkscreen&display=swap` (Silkscreen is the closest Google Font to Minecraft)
- Alternative: download "Minecraft" font from CDN, self-host as woff2
- Apply to: castle names, health badges, section headers, editor names
- Body text (metrics, labels): keep JetBrains Mono for readability

### 3. Grid Layout
- Keep 6 columns on large screens (castles are bigger now, 8 was too cramped)
- Responsive: 4 cols at 1000px, 3 cols at 700px, 2 cols at 500px

## Interactive Features

### 4. Editor Cards Section
Below the castle grid, add an "Editors" section showing ALL editors as playing-card style cards:

```
┌─────────────────────────────────────────┐
│  🏰 BRANDS (castle grid above)          │
├─────────────────────────────────────────┤
│  ⚔️ EDITORS                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │sprite│ │sprite│ │sprite│ │sprite│   │
│  │Patryk│ │Jerome│ │Tim   │ │Nico  │   │
│  │⭐⭐⭐ │ │⭐⭐   │ │⭐⭐   │ │⭐     │   │
│  │busy  │ │open  │ │out   │ │busy  │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────────────────────────────────┘
```

Each editor card shows:
- Pixel art sprite (deterministic by name hash, same system as current)
- First name
- Star rating (Trust Score from Airtable, 1-5 stars)
- Status badge: kappa value (open/busy) + rank
- Glow effect: green=assigned to brand, dim=unassigned

### 5. Drag & Drop Editor → Castle
- Editor cards are **draggable** (`draggable="true"`)
- Castles are **drop targets** (show highlight on dragover)
- When an editor is dropped on a castle:
  - Show confirmation toast: "Assign {editor} to {brand}?"
  - On confirm: PATCH Airtable Brands record to add editor to `Player 1` field
  - Update UI immediately (optimistic)
  - Editor sprite appears next to that castle
- Visual feedback: castle glows purple during dragover, editor card shows "dragging" state

### 6. Brand Detail Panel (on castle click)
When clicking a castle, show expanded detail with:
- All current metrics (keep existing)
- **Assigned Editors** section with their sprites + names
- **Brand Stats:**
  - Total projects (count from Airtable Projects where Brand matches)
  - Projects by status (Queue/Dispatched/In Progress/Delivered)
  - Total bounty earned
  - Average delivery time (if Start Time and Delivery Date exist)
- Link to Trello board (keep existing)

### 7. Editor Detail Panel (on editor card click)
When clicking an editor card, show:
- Large sprite + name
- **Performance Stats** from Airtable:
  - Rank (Stage 1/2/3)
  - Trust Score (as star rating)
  - Kappa (open/busy)
  - Total Projects completed
  - Gold earned
  - Assigned brands (with castle sprites)
- **Project History** (last 10 projects):
  - Project name, brand, status, delivery date, bounty

## API Endpoints Needed

### GET /api/brand-health/editors (existing — enhance)
Add to response:
```json
{
  "editors": { "BrandName": [{ "name": "...", "sprite": "..." }] },
  "allEditors": [
    {
      "id": "recXXX",
      "name": "Patryk Matuszak", 
      "sprite": "orange-viking",
      "rank": "Stage 1",
      "kappa": "busy",
      "trustScore": 4,
      "totalProjects": 12,
      "gold": 960,
      "brands": ["Bawldy", "Veda"]
    }
  ]
}
```

### GET /api/brand-health/editor/:id
Detailed editor profile with project history:
```json
{
  "editor": { "name": "...", "rank": "...", ... },
  "projects": [
    { "name": "...", "brand": "...", "status": "Delivered", "bounty": 80, "deliveryDate": "2026-02-20" }
  ]
}
```

### PATCH /api/brand-health/assign-editor
Assign editor to brand:
```json
{ "brandRecordId": "recXXX", "editorRecordId": "recYYY" }
```
- Updates Airtable Brands.`Player 1` field
- Returns updated brand-editor mapping

**Important:** Airtable PAT only has `data.records:read` scope. The PATCH endpoint will fail without write access. Add a TODO comment noting this, and show a toast "Read-only mode — contact admin to enable editor assignment" if the write fails.

## Tech Stack
- React (existing Vite setup)
- No additional dependencies needed
- HTML5 Drag and Drop API (native)
- Fetch API for Airtable calls (through gen.aditor.ai proxy)

## File Structure
```
dashboard/src/
  components/
    CastleCard.jsx (update: bigger, font)
    CastleGrid.jsx (update: editor section, drag-drop)
    CastleDetail.jsx (update: brand stats)
    EditorCard.jsx (NEW)
    EditorDetail.jsx (NEW)
    EditorSection.jsx (NEW)
  castle-grid.css (update: all styles)
  
dashboard/public/
  castles/ (existing)
  editors/ (existing)
  fonts/ (NEW — Minecraft font if self-hosted)
```

## Priority Order
1. Font change + bigger images (quick visual win)
2. Editor cards section below castles
3. Click editor → detail panel
4. Click castle → enhanced brand stats
5. Drag-and-drop assignment (last, depends on Airtable write access)
