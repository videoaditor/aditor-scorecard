# Aditor Scorecard System — Full Build Plan

**Author:** Player (AI Ops) + Alan Simon
**Date:** 2026-02-13
**Status:** DRAFT — Awaiting team metric negotiation
**Source:** Alan's coaching call notes (Feb 2026)

---

## 1. Executive Summary

This document outlines the architecture, metrics, DRI assignments, and step-by-step build plan for Aditor's company-wide scorecard system. The scorecard is a single source of truth for company health, visible to everyone, updated weekly, and color-coded to instantly communicate whether each metric is on-track, at-risk, or failing.

The system has **two funnels** (per coaching call notes):
1. **Customer Funnel** — Marketing → Sales → Customer Success (revenue engine)
2. **People Funnel** — Recruiting → Onboarding → Retention (talent engine)

---

## 2. Architecture Decision: Three-Tier Approach

After evaluating your tech stack (Google Workspace, Airtable, Trello, Xcode, GCP/Cloudflare), here is the recommended architecture:

### Tier 1 — Data Layer: Google Sheets (Input & Storage)
**Why Sheets over Airtable for the data layer:**
- Everyone already has Google Workspace access (player@aditor.ai)
- Native conditional formatting for the "spreadsheet view" fallback
- Google Sheets API is dead simple for reading/writing
- Team members (Tim, Sean) can input data directly without learning a new tool
- "dashboards" folder already exists in your Google Drive
- Airtable's "Aditor Member Sheet" base stays for HR/member data — no duplication

**Structure:** One master Google Sheet with tabs per time-horizon (Weekly, Monthly, Quarterly, Yearly).

### Tier 2 — Dashboard Layer: Custom Web App (PWA)
**Why a PWA:**
- Accessible from any phone browser — add to home screen, full-screen, feels native
- No App Store review process, instant deploys
- Can be built in React + Tailwind in 1-2 days
- Reads directly from Google Sheets API (or a thin backend)
- Beautiful color-coded cards, responsive design
- Deployed to Cloudflare Pages (free, fast, on your domain: `score.aditor.ai`)

### Tier 3 — Native iOS App (Future V2)
**Why save this for later:**
- SwiftUI app that reads from the same data source
- Adds push notifications for red metrics, widgets for home screen
- Xcode is installed and ready, but the PWA gives 90% of the value in 10% of the time
- When the PWA is validated and the metrics are stable, port to native

### Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                 DATA SOURCES                     │
│  Stripe API → Revenue, MRR                       │
│  Meta Ads API → CPL, Ad Spend, ROAS              │
│  Trello API → Delivery times, card throughput     │
│  Manual Input → Close rate, calls, posts, hires   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│           GOOGLE SHEETS (Master Data)            │
│  Tab: Weekly Scorecard                           │
│  Tab: Monthly Rollup                             │
│  Tab: Quarterly Rollup                           │
│  Tab: Yearly Rollup                              │
│  Tab: Targets (threshold config)                 │
│  Tab: DRI Map                                    │
└──────────────────┬──────────────────────────────┘
                   │ Google Sheets API
                   ▼
┌─────────────────────────────────────────────────┐
│         DASHBOARD (score.aditor.ai)              │
│  React PWA + Tailwind                            │
│  Color-coded metric cards                        │
│  Weekly / Monthly / Quarterly / Yearly views     │
│  DRI avatars per department                      │
│  Mobile-first responsive design                  │
│  Deployed on Cloudflare Pages                    │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         FUTURE: iOS App (SwiftUI)                │
│  Same data source                                │
│  Push notifications for red metrics              │
│  Home screen widget                              │
│  Face ID lock (optional)                         │
└─────────────────────────────────────────────────┘
```

---

## 3. The Scorecard — Full Metric Map

### Department 1: MARKETING
**DRI:** Alan Simon

| # | Metric | Definition | Data Source | Frequency |
|---|--------|-----------|-------------|-----------|
| M1 | CPL (Qualified) | Cost per qualified lead from paid channels | Meta Ads API + manual qualification | Weekly |
| M2 | Sales Calls Booked | Number of discovery/sales calls scheduled | Manual input (calendar) | Weekly |
| M3 | Posts on Social Media | Total posts across all company channels (X, LinkedIn, IG) | Manual input / scheduling tool | Weekly |
| M4 | Ad Spend | Total weekly ad spend across channels | Meta Ads API | Weekly |
| M5 | Impressions / Reach | Total eyeballs on paid + organic | Meta Ads API + platform analytics | Weekly |
| M6 | Inbound Leads (Total) | All leads before qualification | CRM / form submissions | Weekly |

### Department 2: SALES
**DRI:** Alan Simon (+ Sean — to be confirmed)

| # | Metric | Definition | Data Source | Frequency |
|---|--------|-----------|-------------|-----------|
| S1 | Close Rate | % of sales calls that convert to paying clients | Manual input | Weekly |
| S2 | Revenue (MRR) | Monthly recurring revenue from active subscriptions | Stripe API | Weekly snapshot |
| S3 | Profit Margin | (Revenue - Total Costs) / Revenue × 100 | Stripe + expense tracking | Monthly (weekly estimate) |
| S4 | Pipeline Value | Total value of deals in pipeline | Manual input | Weekly |
| S5 | Average Deal Size | Average new client contract value | Stripe API | Monthly |
| S6 | Churn Rate | % of clients lost per period | Stripe / manual | Monthly |

### Department 3: CUSTOMER SUCCESS
**DRI:** Alan Simon + Tim (joint — to be negotiated)

| # | Metric | Definition | Data Source | Frequency |
|---|--------|-----------|-------------|-----------|
| C1 | Good Editors # | Number of editors rated Gold/Silver and actively delivering | team/editors/roster.md + manual | Weekly |
| C2 | Amount of Wins | Client-reported winning ads or positive outcomes | Client Slack channels / manual | Weekly |
| C3 | Delivery Times | Average turnaround time per briefing (target: 48hrs) | Trello API (card timestamps) | Weekly |
| C4 | Briefings Delivered | Total briefings completed across all clients | Trello API (card count) | Weekly |
| C5 | Client Satisfaction | Qualitative score or NPS from client interactions | Manual / quarterly survey | Monthly |
| C6 | Editor Utilization | Cards delivered / total editor capacity (19 cards/wk) | Trello API + roster data | Weekly |

### Department 4: PEOPLE (RECRUITING FUNNEL)
**DRI:** Tim

| # | Metric | Definition | Data Source | Frequency |
|---|--------|-----------|-------------|-----------|
| P1 | Applicants | Number of editor/team applicants received | Job postings / inbox | Weekly |
| P2 | Interviews Conducted | Number of interviews/trial tasks completed | Manual input | Weekly |
| P3 | Hires | New editors or team members onboarded | Manual input | Monthly |
| P4 | Editor Retention | % of active editors still active after 90 days | Roster tracking | Quarterly |
| P5 | Time-to-Productivity | Days from hire to first solo deliverable | Trello timestamps | Per hire |

---

## 4. Color Logic (Conditional Formatting)

From coaching call notes: `<10% = red, ≥ xy% = yellow, > = green`

Each metric has **three thresholds** that must be negotiated with the DRI:

| Color | Meaning | Rule |
|-------|---------|------|
| 🟢 Green | On track or exceeding target | Metric ≥ Green Threshold |
| 🟡 Yellow | At risk — needs attention | Metric ≥ Yellow Threshold AND < Green Threshold |
| 🔴 Red | Off track — immediate action needed | Metric < Yellow Threshold |

### Example Thresholds (DRAFT — to be negotiated)

| Metric | 🔴 Red (Below) | 🟡 Yellow (Between) | 🟢 Green (Above) | Notes |
|--------|----------------|---------------------|------------------|-------|
| CPL (Qualified) | > €150 | €80–150 | < €80 | Lower is better — inverted scale |
| Sales Calls | < 2/week | 2–4/week | ≥ 5/week | Based on current pipeline needs |
| SM Posts | < 3/week | 3–5/week | ≥ 7/week | Across all channels |
| Close Rate | < 15% | 15–30% | ≥ 30% | Industry avg for CaaS: 20-25% |
| Revenue (MRR) | < €25,000 | €25,000–35,000 | ≥ €35,000 | 9 clients × €3,300-3,900 |
| Profit Margin | < 30% | 30–50% | ≥ 50% | Target from unit economics: 60-70% |
| Good Editors # | < 3 | 3 | ≥ 4 | Currently 4 active editors |
| Wins | < 2/week | 2–4/week | ≥ 5/week | Across all client accounts |
| Delivery Time | > 72 hrs | 48–72 hrs | ≤ 48 hrs | Target: 48hr turnaround |
| Briefings Delivered | < 25/week | 25–35/week | ≥ 36/week | 9 clients × 4/week = 36 target |
| Editor Utilization | < 60% | 60–80% | ≥ 80% | 19 cards capacity |

**Important:** These are starter suggestions based on your current data. Each DRI negotiates their own thresholds (per coaching principle #3: "they'll fight my plans, but not theirs").

---

## 5. DRI (Directly Responsible Individual) Matrix

| Department | Primary DRI | Secondary DRI | Notes |
|-----------|-------------|---------------|-------|
| Marketing | Alan | — | All customer acquisition |
| Sales | Alan | Sean (TBD) | Sean's role to be defined |
| Customer Success | Alan | Tim | Joint — split TBD |
| People / Recruiting | Tim | Alan | Tim leads, Alan approves |

### DRI Rules:
1. Each metric has exactly ONE primary DRI who owns the number
2. DRI reports the metric weekly (even if it's automated — they own accuracy)
3. DRI sets their own targets in negotiation with Alan (coaching principle #3)
4. Red metrics require a written action plan from the DRI within 48 hours
5. The scorecard is public to the entire company (coaching principle #5)

---

## 6. Scorecard Layout — Weekly View

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                        ADITOR SCORECARD — Week 7 (Feb 10-16, 2026)              ║
╠════════════════╦═══════╦═══════╦═══════╦═══════╦═══════╦═══════╦═══════╦═══════╣
║                ║  DRI  ║ Wk 4  ║ Wk 5  ║ Wk 6  ║ Wk 7  ║  MTD  ║  QTD  ║  YTD ║
╠════════════════╬═══════╬═══════╬═══════╬═══════╬═══════╬═══════╬═══════╬═══════╣
║ MARKETING      ║       ║       ║       ║       ║       ║       ║       ║       ║
║ CPL (Qual.)    ║ Alan  ║ 🟢€72║ 🟡€95║ 🟢€68║ 🔴€160║  €99  ║  €88  ║  €85 ║
║ Sales Calls    ║ Alan  ║ 🟢 5 ║ 🟡 3 ║ 🟢 6 ║ 🟡 4 ║  18   ║  42   ║  42  ║
║ SM Posts       ║ Alan  ║ 🟢 8 ║ 🟢 7 ║ 🟡 4 ║ 🔴 2 ║  21   ║  58   ║  58  ║
╠════════════════╬═══════╬═══════╬═══════╬═══════╬═══════╬═══════╬═══════╬═══════╣
║ SALES          ║       ║       ║       ║       ║       ║       ║       ║       ║
║ Close Rate     ║ Alan  ║ 🟢33%║ 🟡20%║ 🟢40%║ 🟡25%║  30%  ║  28%  ║  28% ║
║ Revenue (MRR)  ║ Alan  ║ 🟢30k║ 🟢31k║ 🟢31k║ 🟢33k║  33k  ║  33k  ║  33k ║
║ Profit Margin  ║ Sean? ║ 🟡45%║ 🟡42%║ 🟢52%║ 🟢55%║  48%  ║  46%  ║  46% ║
╠════════════════╬═══════╬═══════╬═══════╬═══════╬═══════╬═══════╬═══════╬═══════╣
║ CUST. SUCCESS  ║       ║       ║       ║       ║       ║       ║       ║       ║
║ Good Editors # ║ Tim   ║ 🟢 4 ║ 🟢 4 ║ 🟡 3 ║ 🟢 4 ║   4   ║   4   ║   4  ║
║ Wins           ║ Alan  ║ 🟡 3 ║ 🟢 5 ║ 🟢 6 ║ 🟡 3 ║  17   ║  44   ║  44  ║
║ Delivery Time  ║ Tim   ║ 🟢42h║ 🟡56h║ 🟢44h║ 🟢46h║  47h  ║  48h  ║  48h ║
╠════════════════╬═══════╬═══════╬═══════╬═══════╬═══════╬═══════╬═══════╬═══════╣
║ PEOPLE         ║       ║       ║       ║       ║       ║       ║       ║       ║
║ Applicants     ║ Tim   ║ 🟡 2 ║ 🔴 0 ║ 🟡 1 ║ 🟢 4 ║   7   ║  12   ║  12  ║
║ Interviews     ║ Tim   ║ 🟡 1 ║ 🔴 0 ║ 🟡 1 ║ 🟢 2 ║   4   ║   8   ║   8  ║
║ Hires          ║ Tim   ║  —   ║  —   ║  —   ║ 🟢 1 ║   1   ║   2   ║   2  ║
╚════════════════╩═══════╩═══════╩═══════╩═══════╩═══════╩═══════╩═══════╩═══════╝
```

---

## 7. Google Sheets Structure

### Tab 1: `Weekly Input`
Where DRIs enter their numbers each week.

| Column | Content |
|--------|---------|
| A | Department |
| B | Metric Name |
| C | DRI |
| D | Week 1 Value |
| E | Week 2 Value |
| ... | (continues for 52 weeks) |

### Tab 2: `Targets`
Configuration sheet for color thresholds.

| Column | Content |
|--------|---------|
| A | Metric Name |
| B | Red Below (threshold) |
| C | Yellow Below (threshold) |
| D | Green Above (threshold) |
| E | Direction (higher_better / lower_better) |
| F | Unit (%, €, #, hrs) |

### Tab 3: `Scorecard View`
Auto-formatted view with conditional formatting pulling from Targets tab.
- Uses `=IF()` and `VLOOKUP()` against Targets tab
- Conditional formatting rules reference the Targets tab dynamically
- Rolling 4-week window + MTD/QTD/YTD columns

### Tab 4: `Monthly Rollup`
- Aggregates weekly data (SUM for counts, AVG for rates/percentages)
- Same color logic applied to monthly totals

### Tab 5: `Quarterly Rollup`
- Aggregates monthly data

### Tab 6: `Yearly Rollup`
- Aggregates quarterly data

### Tab 7: `DRI Map`
- Name, role, department, contact info, avatar URL
- Used by both the Sheet and the dashboard app

---

## 8. Custom Dashboard (PWA) — Technical Spec

### Stack
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Data:** Google Sheets API v4 (read-only service account)
- **Hosting:** Cloudflare Pages (`score.aditor.ai`)
- **Auth:** Simple password or Cloudflare Access (team-only)
- **PWA:** Manifest + service worker for offline caching

### Key Components

```
src/
├── App.jsx                    # Main app shell
├── components/
│   ├── ScoreCard.jsx          # Main scorecard grid
│   ├── MetricCard.jsx         # Individual metric with color
│   ├── DepartmentRow.jsx      # Department grouping
│   ├── DRIBadge.jsx           # DRI avatar + name
│   ├── TrendArrow.jsx         # ↑↓→ week-over-week trend
│   ├── TimeToggle.jsx         # Week / Month / Quarter / Year
│   └── WeekSelector.jsx       # Navigate between weeks
├── hooks/
│   ├── useSheetData.js        # Fetch from Google Sheets API
│   └── useColorLogic.js       # Apply threshold → color mapping
├── utils/
│   ├── sheets.js              # Google Sheets API client
│   └── thresholds.js          # Color calculation logic
├── manifest.json              # PWA manifest
└── sw.js                      # Service worker
```

### Design System: "Glass Grid"

The visual identity blends a **spreadsheet-like tabular grid** with modern **glassmorphism** effects. Think: if a Bloomberg terminal and a premium fintech app had a baby, raised on dark mode.

#### Core Principles
1. **Spreadsheet DNA** — the primary view is a TABLE, not stacked cards. Rows = metrics, columns = weeks. Like looking at a real scorecard in a coaching session, but premium.
2. **Glassmorphism** — frosted glass panels over a subtle dark gradient. `backdrop-filter: blur(16px)`, semi-transparent backgrounds (`rgba(255,255,255,0.04)`), thin luminous borders (`1px solid rgba(255,255,255,0.08)`).
3. **Dark Gray, Not Navy** — warm dark grays, not cold blue-blacks. Feels sophisticated, not techy.
4. **Neon Orange as Brand Accent** — the Aditor identity color. Used for: active states, selected week column highlight, header accents, the time toggle, hover states, the "ADITOR" wordmark. NOT used for metric health — that stays green/yellow/red for universal clarity.
5. **Visual Hierarchy via Opacity** — most important information is full brightness. Secondary info fades to 60% opacity. Tertiary (labels) at 40%. No need for font size gymnastics.
6. **Mobile-first but grid-native** — on phone, the table scrolls horizontally with a sticky first column (metric names). On desktop/tablet, the full grid is visible without scrolling.
7. **Real-time-ish** — polls Sheets API every 5 minutes, manual refresh via pull-down gesture.

#### Color Palette

```
BACKGROUNDS
  Body:              #141414  (near-black warm gray)
  Glass Panel:       rgba(255, 255, 255, 0.03)  +  backdrop-filter: blur(16px)
  Glass Border:      rgba(255, 255, 255, 0.08)
  Row Hover:         rgba(255, 255, 255, 0.05)
  Alt Row:           rgba(255, 255, 255, 0.02)  (subtle zebra striping)

ACCENT (Brand)
  Neon Orange:       #FF6A00  (primary accent — headers, active states, selections)
  Orange Glow:       rgba(255, 106, 0, 0.15)  (subtle glow behind active elements)
  Orange Dim:        rgba(255, 106, 0, 0.6)  (inactive/secondary accent)

METRIC STATUS (universal — NOT overridden by brand)
  Green:             #22C55E  (on-track)
  Yellow:            #FACC15  (at-risk)
  Red:               #EF4444  (off-track)
  Green Glow:        rgba(34, 197, 94, 0.12)  (cell background tint for green metrics)
  Yellow Glow:       rgba(250, 204, 21, 0.10)
  Red Glow:          rgba(239, 68, 68, 0.12)

TEXT
  Primary:           #F5F5F5  (metric values, headings)
  Secondary:         rgba(245, 245, 245, 0.6)  (labels, column headers)
  Tertiary:          rgba(245, 245, 245, 0.35)  (timestamps, footnotes)

TYPOGRAPHY
  Font:              Inter (headings) + JetBrains Mono (numbers in cells)
  Numbers are monospaced so columns stay aligned — critical for the spreadsheet feel.
```

#### Glassmorphism CSS Spec

```css
/* Glass Panel (each department section) */
.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Active column highlight (current week) */
.column-active {
  background: rgba(255, 106, 0, 0.08);
  border-top: 2px solid #FF6A00;
  box-shadow: 0 0 20px rgba(255, 106, 0, 0.1);
}

/* Metric cell with status color */
.cell-green { background: rgba(34, 197, 94, 0.08); }
.cell-yellow { background: rgba(250, 204, 21, 0.06); }
.cell-red {
  background: rgba(239, 68, 68, 0.08);
  animation: pulse-red 2s ease-in-out infinite;
}

/* Red metrics softly pulse to draw attention */
@keyframes pulse-red {
  0%, 100% { background: rgba(239, 68, 68, 0.08); }
  50% { background: rgba(239, 68, 68, 0.15); }
}
```

#### Layout: Spreadsheet Grid (NOT Cards)

The primary view is a horizontal scrollable table. This is the key differentiation from generic dashboards — it looks and feels like a scorecard from a coaching session.

```
DESKTOP VIEW (full grid visible)
┌──────────────────────────────────────────────────────────────────────────────┐
│  ▌ADITOR  SCORECARD            Week 7 · Feb 10–16     [W] [M] [Q] [Y]     │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                          ▼ active week      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │             │ DRI  │ Wk 4  │ Wk 5  │ Wk 6  │▌Wk 7 ▌│ MTD  │ QTD  │    │
│  │─────────────│──────│───────│───────│───────│───────│──────│──────│    │
│  │▌MARKETING  ▌│      │       │       │       │       │      │      │    │
│  │ CPL (Qual.) │ AS   │  €72  │  €95  │  €68  │ €160  │  €99 │  €88 │    │
│  │ Sales Calls │ AS   │   5   │   3   │   6   │   4   │  18  │  42  │    │
│  │ SM Posts    │ AS   │   8   │   7   │   4   │   2   │  21  │  58  │    │
│  │─────────────│──────│───────│───────│───────│───────│──────│──────│    │
│  │▌SALES      ▌│      │       │       │       │       │      │      │    │
│  │ Close Rate  │ AS+S │  33%  │  20%  │  40%  │  25%  │ 30%  │ 28%  │    │
│  │ Revenue     │ AS   │  30k  │  31k  │  31k  │  33k  │ 33k  │ 33k  │    │
│  │ Margin      │ AS   │  45%  │  42%  │  52%  │  55%  │ 48%  │ 46%  │    │
│  │─────────────│──────│───────│───────│───────│───────│──────│──────│    │
│  │▌CUST SUCC. ▌│      │       │       │       │       │      │      │    │
│  │ Editors #   │ T    │   4   │   4   │   3   │   4   │  4   │  4   │    │
│  │ Wins        │ AS+T │   3   │   5   │   6   │   3   │  17  │  44  │    │
│  │ Delivery    │ T    │  42h  │  56h  │  44h  │  46h  │ 47h  │ 48h  │    │
│  │─────────────│──────│───────│───────│───────│───────│──────│──────│    │
│  │▌PEOPLE     ▌│      │       │       │       │       │      │      │    │
│  │ Applicants  │ T    │   2   │   0   │   1   │   4   │  7   │  12  │    │
│  │ Interviews  │ T    │   1   │   0   │   1   │   2   │  4   │   8  │    │
│  │ Hires       │ T    │   —   │   —   │   —   │   1   │  1   │   2  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Each value cell is tinted green/yellow/red based on threshold.              │
│  The "Wk 7" column has a neon orange top-border and subtle orange glow.     │
│  Department headers (MARKETING, SALES, etc.) have orange left-accent bars.  │
│  Hover on any cell → tooltip shows target, threshold, trend.                │
└──────────────────────────────────────────────────────────────────────────────┘

MOBILE VIEW (sticky column + horizontal scroll)
┌──────────────────────┐
│ ▌ADITOR SCORECARD    │
│ Week 7 · Feb 10-16   │
│ [W] [M] [Q] [Y]      │
├──────────────────────┤
│         ← scroll →   │
│┌──────────┬──────┬───│──┬──────┐
││▌MARKETING│ Wk 6 │▌Wk│7▌│ MTD  │
│├──────────┼──────┼───│──┼──────┤
││ CPL      │  €68 │€16│0 │  €99 │
││ Calls    │   6  │  4│  │  18  │
││ Posts    │   4  │  2│  │  21  │
│├──────────┼──────┼───│──┼──────┤
││▌SALES    │      │   │  │      │
││ Close    │  40% │ 25│% │ 30%  │
││ Revenue  │  31k │ 33│k │ 33k  │
││ Margin   │  52% │ 55│% │ 48%  │
│├──────────┼──────┼───│──┼──────┤
││ ...      │      │   │  │      │
│└──────────┴──────┴───│──┴──────┘
│                      │
│ Sticky first column  │
│ Swipe to see weeks → │
└──────────────────────┘

The first column (metric names) stays pinned.
Horizontal swipe reveals week columns.
Current week column glows with orange accent.
Each cell is color-tinted by metric health status.
```

#### Interaction Details

| Element | Behavior |
|---------|----------|
| Cell tap (mobile) | Expands to show: target, threshold, trend sparkline, DRI contact |
| Column header tap | Highlights entire week column with orange glow |
| Department header tap | Collapses/expands department rows (accordion) |
| Pull down | Refresh data from Google Sheets |
| Swipe left/right | Navigate between weeks |
| Time toggle [W/M/Q/Y] | Switches grid between weekly/monthly/quarterly/yearly rollup |
| DRI avatar tap | Shows all metrics owned by that DRI |
| Long press on cell | Copy value, share, flag for discussion |

#### Component Mapping (Updated)

```
src/
├── App.jsx                     # Main app shell, dark gray body
├── components/
│   ├── ScoreGrid.jsx           # PRIMARY — the spreadsheet table
│   ├── GridCell.jsx            # Individual cell with color tint + value
│   ├── DepartmentHeader.jsx    # Orange-accented collapsible section header
│   ├── ColumnHighlight.jsx     # Active week column orange glow
│   ├── DRIChip.jsx             # Small avatar + initials chip
│   ├── TrendSparkline.jsx      # Tiny 4-week sparkline in expanded cell view
│   ├── TimeToggle.jsx          # [W] [M] [Q] [Y] toggle bar — orange active
│   ├── WeekNavigator.jsx       # ◄ Week 7 · Feb 10-16 ► header
│   ├── HealthSummary.jsx       # Top bar: "9/13 green, 3 yellow, 1 red"
│   └── GlassPanel.jsx          # Reusable glassmorphism container
├── hooks/
│   ├── useSheetData.js         # Fetch from Google Sheets API
│   ├── useColorLogic.js        # Threshold → color mapping
│   └── useScrollSync.js        # Sticky column + horizontal scroll sync
├── styles/
│   ├── glass.css               # Glassmorphism utility classes
│   └── grid.css                # Spreadsheet grid layout utilities
├── utils/
│   ├── sheets.js               # Google Sheets API client
│   └── thresholds.js           # Color calculation logic
├── manifest.json               # PWA manifest (dark theme, neon orange icon)
└── sw.js                       # Service worker
```

#### Design Reference / Mood Board Keywords

For anyone building this, search these for visual reference:
- "glassmorphism dashboard dark mode" on Dribbble/Behance
- "dark fintech analytics grid" on Mobbin
- Bloomberg Terminal (the density and grid feel, not the blue)
- Linear app (the subtle glass effects and transitions)
- Stripe Dashboard (the clean data grid + warm dark mode)
- Neon orange accent: think Strava's orange, Cloudflare's orange, but on a dark glass background

---

## 9. Future iOS App (SwiftUI) — Spec Notes

When the PWA is validated (after ~4-8 weeks of use):

### Features Beyond PWA
- **Home screen widget** showing overall health (% green metrics)
- **Push notifications** when any metric turns red
- **Face ID** optional lock for sensitive financial data
- **Haptic feedback** on metric tap
- **Siri shortcut**: "Hey Siri, how's the scorecard?" → reads summary
- **Apple Watch complication** (stretch goal)

### Tech Stack
- SwiftUI + Combine
- Same Google Sheets API backend (or migrate to Supabase for real-time)
- CloudKit for push notifications
- WidgetKit for home screen widget

---

## 10. Data Automation — Near-Zero Maintenance Architecture

**Design principle:** If a human has to remember to update a number, it will eventually stop happening. Automate everything possible. For the rest, make it so dead-simple that it takes <60 seconds per week.

### 10.1 Automation Tier Map

| Metric | Tier | Source | Script | Human Effort |
|--------|------|--------|--------|-------------|
| CPL (Qualified) | 🤖 Full Auto | Meta Ads API | `sync-meta.js` | Zero |
| Ad Spend | 🤖 Full Auto | Meta Ads API | `sync-meta.js` | Zero |
| Impressions/Reach | 🤖 Full Auto | Meta Ads API | `sync-meta.js` | Zero |
| Revenue (MRR) | 🤖 Full Auto | Stripe API | `sync-stripe.js` | Zero |
| Average Deal Size | 🤖 Full Auto | Stripe API | `sync-stripe.js` | Zero |
| Churn Rate | 🤖 Full Auto | Stripe API (subscription events) | `sync-stripe.js` | Zero |
| Delivery Time | 🤖 Full Auto | Trello API (card timestamps) | `sync-trello.js` | Zero |
| Briefings Delivered | 🤖 Full Auto | Trello API (cards → Done) | `sync-trello.js` | Zero |
| Editor Utilization | 🤖 Full Auto | Trello card count ÷ roster capacity | `sync-trello.js` | Zero |
| Good Editors # | 🤖 Full Auto | Trello activity + roster.md | `sync-trello.js` | Zero |
| Sales Calls | 🔔 Nudge Auto | Google Calendar API (count events tagged "sales") | `sync-calendar.js` | ~Zero (tag calls in calendar) |
| SM Posts | 🔔 Nudge Auto | X API + Buffer/scheduling tool | `sync-social.js` | ~Zero if using a scheduler |
| Profit Margin | 📐 Calculated | Revenue (auto) − Costs (semi-manual) | Google Sheets formula | Enter costs 1x/month |
| Pipeline Value | ✋ Quick Input | Alan's judgment | Slack bot prompt → Sheets | 10 sec/week |
| Close Rate | ✋ Quick Input | Alan's records post-call | Slack bot prompt → Sheets | 10 sec/week |
| Wins | ✋ Quick Input | Client channels | Slack bot prompt → Sheets | 10 sec/week |
| Applicants | ✋ Quick Input | Tim's inbox/job board | Slack bot prompt → Sheets | 10 sec/week |
| Interviews | ✋ Quick Input | Tim's calendar | Slack bot prompt → Sheets | 10 sec/week |
| Hires | ✋ Quick Input | Tim updates when it happens | Slack bot prompt → Sheets | Per-event only |

**Result: 10 of 16 metrics are fully automatic. 2 are nearly automatic. 4 require a 10-second weekly input. Total human time per week: ~60 seconds.**

### 10.2 Automation Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │         GitHub Actions (Weekly Cron)         │
                    │         Runs every Sunday 23:00 UTC          │
                    │                                              │
                    │  ┌──────────────┐  ┌──────────────────────┐ │
                    │  │ sync-meta.js │  │ sync-stripe.js       │ │
                    │  │ → CPL        │  │ → Revenue/MRR        │ │
                    │  │ → Ad Spend   │  │ → Deal Size          │ │
                    │  │ → Reach      │  │ → Churn Rate         │ │
                    │  └──────┬───────┘  └──────────┬───────────┘ │
                    │         │                      │             │
                    │  ┌──────┴──────┐  ┌───────────┴──────────┐ │
                    │  │sync-trello.js│ │ sync-calendar.js     │ │
                    │  │→ Delivery    │  │ → Sales Calls count  │ │
                    │  │→ Briefings   │  │                      │ │
                    │  │→ Utilization │  └───────────┬──────────┘ │
                    │  │→ Editors #   │              │            │
                    │  └──────┬───────┘              │            │
                    │         │                      │            │
                    │         ▼                      ▼            │
                    │    ┌──────────────────────────────────┐     │
                    │    │   Google Sheets API (write)       │     │
                    │    │   → Weekly Input tab              │     │
                    │    │   → Auto-populates current week   │     │
                    │    └──────────────────────────────────┘     │
                    └─────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────┐
                    │       Slack Bot (Monday 09:00 prompt)        │
                    │                                              │
                    │  DM to Alan:                                 │
                    │  "Hey — 3 quick numbers for the scorecard:  │
                    │   1. Close rate this week? (reply: 25%)      │
                    │   2. Pipeline value? (reply: €15k)           │
                    │   3. Wins this week? (reply: 4)"             │
                    │                                              │
                    │  DM to Tim:                                  │
                    │  "Hey — 2 quick numbers for the scorecard:  │
                    │   1. Applicants this week? (reply: 3)        │
                    │   2. Interviews this week? (reply: 1)"       │
                    │                                              │
                    │  Bot parses replies → writes to Sheets       │
                    └─────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────┐
                    │       Google Sheets (Calculated Fields)      │
                    │                                              │
                    │  Profit Margin = (Revenue − Costs) / Rev    │
                    │  Editor Util. = Briefings / Capacity         │
                    │  MTD/QTD/YTD = SUM/AVG of weekly values     │
                    │  Color logic = IF(value, thresholds...)      │
                    │                                              │
                    │  These are Sheets formulas — zero scripts.   │
                    └─────────────────────────────────────────────┘
```

### 10.3 Sync Script Specs

Each script is a standalone Node.js file that can run locally or in CI.

#### `sync-meta.js` — Meta Ads API → Sheets
```
INPUT:  Meta Marketing API (ad account insights, date range = last 7 days)
OUTPUT: CPL, Total Spend, Impressions, Reach → Weekly Input tab
AUTH:   Meta Business access token (stored in GitHub Secrets)
LOGIC:
  1. Fetch /act_{ad_account_id}/insights?date_preset=last_7d&fields=cost_per_action_type,spend,impressions,reach
  2. Extract CPL for "lead" action type
  3. Write to Google Sheets row for current week
```

#### `sync-stripe.js` — Stripe API → Sheets
```
INPUT:  Stripe Subscriptions API + Balance Transactions
OUTPUT: MRR, Active Clients, Avg Deal Size, Churn → Weekly Input tab
AUTH:   Stripe secret key (stored in GitHub Secrets)
LOGIC:
  1. List active subscriptions → sum = MRR
  2. Count active subscriptions = client count
  3. MRR / client count = avg deal size
  4. Count canceled subscriptions in period → churn rate
  5. Write to Sheets
```

#### `sync-trello.js` — Trello API → Sheets
```
INPUT:  Trello API (all active boards)
OUTPUT: Delivery Time, Briefings Delivered, Editor Utilization, Good Editors # → Weekly Input tab
AUTH:   Trello API key + token (stored in GitHub Secrets)
LOGIC:
  1. Get all cards moved to "Done" list in the last 7 days
  2. For each card: calculate (Done timestamp − In Progress timestamp) = delivery time
  3. Average delivery time across all cards
  4. Count cards = briefings delivered
  5. Briefings / roster capacity (from Sheets DRI Map tab) = utilization
  6. Count editors with ≥3 cards completed = "good editors"
  7. Write to Sheets
```

#### `sync-calendar.js` — Google Calendar API → Sheets
```
INPUT:  Google Calendar API (events in last 7 days)
OUTPUT: Sales Calls count → Weekly Input tab
AUTH:   Google service account with calendar read access
LOGIC:
  1. List events where title contains "sales", "discovery", "call", or "demo"
  2. Count = sales calls this week
  3. Write to Sheets
```

#### Slack Bot for Manual Inputs
```
PLATFORM: Slack Bolt (Node.js) or Zapier/Make automation
TRIGGER:  Cron — Monday 09:00 local time
LOGIC:
  1. DM each DRI with their pending manual metrics as numbered questions
  2. Parse reply messages (number extraction)
  3. Write parsed values to Google Sheets via API
  4. Reply with confirmation: "✅ Scorecard updated. 3 green, 0 yellow, 0 red."
  5. If no reply by Monday 12:00, send reminder
  6. If no reply by Monday 18:00, flag the cell as "MISSING" (shows gray on dashboard)
```

### 10.4 GitHub Actions Workflow

```yaml
# .github/workflows/scorecard-sync.yml
name: Scorecard Weekly Sync
on:
  schedule:
    - cron: '0 23 * * 0'  # Every Sunday at 23:00 UTC
  workflow_dispatch:        # Manual trigger button

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: node scripts/sync-stripe.js
        env:
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
          GOOGLE_SHEETS_ID: ${{ secrets.SHEETS_ID }}
          GOOGLE_SERVICE_ACCOUNT: ${{ secrets.GOOGLE_SA_JSON }}
      - run: node scripts/sync-meta.js
        env:
          META_ACCESS_TOKEN: ${{ secrets.META_ACCESS_TOKEN }}
          META_AD_ACCOUNT_ID: ${{ secrets.META_AD_ACCOUNT }}
          # ... same Sheets env vars
      - run: node scripts/sync-trello.js
        env:
          TRELLO_API_KEY: ${{ secrets.TRELLO_KEY }}
          TRELLO_TOKEN: ${{ secrets.TRELLO_TOKEN }}
          # ... same Sheets env vars
      - run: node scripts/sync-calendar.js
        env:
          # ... Google service account handles both Calendar + Sheets
```

### 10.5 Maintenance Estimate

| Task | Frequency | Time | Who |
|------|-----------|------|-----|
| Automated syncs (Stripe, Meta, Trello, Calendar) | Weekly (auto) | 0 min | Bot |
| Slack bot nudge for manual inputs | Weekly (auto prompt) | ~60 sec total | Alan + Tim |
| Update cost numbers for profit margin | Monthly | 5 min | Alan |
| Adjust thresholds as business grows | Quarterly | 15 min | Alan + DRIs |
| Script maintenance (API changes, etc.) | Rare | 30-60 min | Developer |
| **Total weekly time:** | | **~1 minute** | |

### 10.6 Failure Handling

- If any sync script fails → GitHub Actions sends Slack notification to #ops channel
- If a DRI doesn't reply to the Slack bot by EOD Monday → cell shows "—" with gray tint (not red — missing data ≠ bad performance)
- If Google Sheets API is down → PWA shows cached last-known data with "Last updated: X hours ago" warning
- If a metric is missing for 2+ consecutive weeks → auto-escalation DM to Alan

---

## 11. Build Plan — Step by Step

### Phase 1: Foundation (Days 1-2)
- [ ] Create Google Sheet in "dashboards" folder
- [ ] Build all tabs (Weekly Input, Targets, Scorecard View, Monthly/Quarterly/Yearly Rollups, DRI Map)
- [ ] Set up conditional formatting with dynamic threshold references
- [ ] Add sample data for Weeks 1-4 to validate formulas
- [ ] Share with team (view for all, edit for DRIs on their rows)

### Phase 2: Target Negotiation (Days 3-5)
- [ ] Alan completes the negotiation questionnaire (Section 12 below)
- [ ] Meet with Tim to negotiate People + Customer Success targets
- [ ] Meet with Sean to negotiate Sales targets (if applicable)
- [ ] Each DRI signs off on their thresholds in the Targets tab
- [ ] Lock Targets tab (only Alan can edit)

### Phase 3: Automation Scripts (Days 3-7)
- [ ] Set up Google Sheets API service account
- [ ] Write Stripe → Sheets sync script (Revenue, MRR)
- [ ] Write Meta Ads → Sheets sync script (CPL, Ad Spend)
- [ ] Write Trello → Sheets sync script (Delivery Times, Briefings, Utilization)
- [ ] Set up GitHub Actions weekly cron job
- [ ] Test all automations with real data

### Phase 4: Custom Dashboard PWA — "Glass Grid" (Days 5-10)
- [ ] Scaffold React + Vite + Tailwind project
- [ ] Implement glassmorphism base styles (glass.css: dark gray body #141414, glass panels, blur effects)
- [ ] Build `ScoreGrid` — the primary spreadsheet-style table component
- [ ] Build `GridCell` — individual cell with status color tinting + monospace numbers (JetBrains Mono)
- [ ] Build `ColumnHighlight` — neon orange glow on active/current week column
- [ ] Build `DepartmentHeader` — collapsible rows with orange left-accent bar
- [ ] Implement sticky first column + horizontal scroll sync for mobile
- [ ] Implement Google Sheets API data fetching (useSheetData hook)
- [ ] Implement color logic (useColorLogic hook — reads thresholds from Targets tab)
- [ ] Build time toggle [W/M/Q/Y] with neon orange active state
- [ ] Build health summary bar (top: "9/13 green, 3 yellow, 1 red")
- [ ] Add cell tap → expanded detail view (target, threshold, 4-week sparkline)
- [ ] Add pull-to-refresh gesture
- [ ] Add PWA manifest (dark theme, neon orange icon) + service worker
- [ ] Deploy to Cloudflare Pages (`score.aditor.ai`)
- [ ] Set up Cloudflare Access for team-only access
- [ ] Test on iPhone Safari, Android Chrome, desktop

### Phase 5: Go Live (Day 10-14)
- [ ] First real weekly data entry by all DRIs
- [ ] Team walkthrough / training (5-minute video or Slack post)
- [ ] First Monday scorecard review in team meeting
- [ ] Collect feedback, iterate

### Phase 6: iOS App (Weeks 4-8, optional)
- [ ] Port dashboard to SwiftUI
- [ ] Implement home screen widget
- [ ] Add push notifications for red metrics
- [ ] TestFlight beta to team
- [ ] Iterate based on feedback

---

## 12. Negotiation Questionnaire — Questions for Your Team

These are the questions you (Alan) should ask each DRI to set their own metric targets. Per coaching principle #3: "They'll fight my plans, but not theirs."

### For YOURSELF (Alan) — Marketing & Sales

**Marketing:**
1. What is a realistic weekly qualified lead target for the next quarter? (Current baseline: ___ leads/week)
2. What CPL would make you uncomfortable? What CPL would make you celebrate?
3. How many sales calls per week do you need to hit revenue targets? What's the minimum before you worry?
4. What's your target for social media posts per week? Across which platforms?
5. What's the current monthly ad budget? What CPL makes the budget profitable?

**Sales:**
6. What close rate would you consider "great" vs "unacceptable"? (Industry benchmark for CaaS/agency: 20-30%)
7. What is the MRR target for end of Q1 2026? Q2? (Current: ~€30k-35k with 9 clients)
8. What profit margin would make you comfortable? At what margin do you hit the alarm? (Current estimate: 30-63% per client)
9. Should pipeline value be tracked? If so, what pipeline coverage ratio do you want? (Typically 3x target)

### For TIM — People & Customer Success

**People/Recruiting:**
10. How many editor applicants per week is healthy? What number means the pipeline is dry?
11. How many interviews per month should be happening to maintain bench strength?
12. What's the target for new hires per quarter? (Current: 4 active editors, capacity 19 cards/week)
13. What editor retention rate is acceptable? (Currently tracking editor tenure)

**Customer Success (Joint with Alan):**
14. What is the minimum number of "good" (Gold/Silver) editors needed to maintain service quality?
15. How do you define a "win" for scorecard purposes? (Client reports positive ROAS? Specific metric?)
16. What delivery time threshold is unacceptable? (Current target: 48hrs, current actual: ~___ hrs)
17. What's the target weekly briefing count? (Current: 9 clients × 4 = 36/week, actual: ___/week)

### For SEAN (if applicable) — Sales

18. What specific sales metrics are you responsible for?
19. What's your personal close rate target?
20. How many calls per week is your target?
21. What revenue growth are you committing to per quarter?

### General (For all DRIs):
22. At what threshold for YOUR metrics would you want to be alerted immediately?
23. How do you want to be held accountable — weekly review call, async Slack check-in, or just the dashboard?
24. Are there any metrics you think are missing from this scorecard?

---

## 13. Industry Benchmarks for Reference

Based on CaaS/creative agency industry data to help calibrate your targets:

| Metric | Industry Low | Industry Avg | Industry Top | Aditor Current (Est.) |
|--------|-------------|-------------|-------------|----------------------|
| CPL (Qualified) | €200+ | €80-150 | <€50 | Unknown — needs Meta data |
| Close Rate | 10-15% | 20-25% | 30-40% | Unknown — needs tracking |
| Gross Margin | 30-40% | 50-60% | 65-75% | 30-63% (per unit economics) |
| Client Churn (monthly) | >10% | 5-8% | <3% | Unknown |
| Delivery Time | 5+ days | 3-4 days | <48 hrs | Target 48hrs |
| Editor Utilization | <50% | 65-75% | 80-90% | ~75% est. (14/19 cards) |
| Social Posts/Week | 1-3 | 5-7 | 10+ | Unknown |
| MRR per Headcount | <€5k | €8-12k | €15k+ | ~€30k / 6 people ≈ €5k |

---

## 14. Cost Estimate

| Item | Cost | Notes |
|------|------|-------|
| Google Sheets | Free | Already in workspace |
| Cloudflare Pages | Free | Free tier covers this |
| Google Sheets API | Free | Under free tier quotas |
| Domain (score.aditor.ai) | Free | Subdomain of existing domain |
| Development time | 2-3 days | For Sheets + PWA MVP |
| Ongoing maintenance | ~1 hr/week | Mostly automated |

**Total cost: €0** (just development time)

---

## 15. Success Criteria for the Scorecard System

The scorecard system itself is successful when:
1. ✅ All DRIs input their metrics every Monday by 10am
2. ✅ The dashboard loads in <2 seconds on mobile
3. ✅ At least one metric has been moved from red to green based on scorecard visibility
4. ✅ Team references the scorecard in weekly meetings
5. ✅ Alan can check company health in <10 seconds from his phone
6. ✅ No metric goes unreported for more than 1 week

---

*This plan is ready for review. Next steps: Answer the negotiation questionnaire (Section 12), then we build.*
