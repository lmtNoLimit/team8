# Design: AI Store Secretary — Full App UI

**Date:** 2026-03-05 | **Status:** Approved

---

## Concept

Morning briefing dashboard + per-agent detail pages. Merchant opens app daily, reviews findings, takes action. Each agent has its own page for deep-dive.

## Agents

| Agent | Domain | Key Output |
|-------|--------|-----------|
| Inventory | Stock & velocity | Low stock warnings, dead stock, stockout ETA |
| Reviews | Customer feedback | Sentiment themes, recurring complaints, keyword mismatches |
| Trends | Market signals | Trending keywords, missed optimization opportunities |
| Storefront | Store quality | Image issues, content gaps, UX/mobile problems |

## App Navigation

```
[Secretary]  [Inventory]  [Reviews]  [Trends]  [Store]  [Settings]
```

---

## Screens

### 1. Secretary Dashboard (`app.secretary`)

Main screen. Morning briefing grouped by finding type.

```
┌─────────────────────────────────────────────────┐
│  [Logo] AI Secretary          [Run Now] [Settings]│
├─────────────────────────────────────────────────┤
│                                                   │
│  Good morning, {store_name}!                     │
│  Last run: Today 6:00 AM · 4 agents · 12 findings│
│                                                   │
├─── HANDLED OVERNIGHT (3) ───────────────────────┤
│                                                   │
│  ✓ Flagged 2 dead stock items      [inventory]   │
│  ✓ Detected trending "eco-friendly" [trend]      │
│  ✓ Found 5 missing alt texts        [storefront] │
│                                                   │
├─── NEEDS YOUR DECISION (4) ─────────────────────┤
│                                                   │
│  ● Blue Widget stockout in 2 days   [inventory]  │
│    "12 units left, 5.6/day pace"                 │
│    [Apply Fix]  [Dismiss]                        │
│                                                   │
│  ● 5 reviews mention "runs small"   [review]     │
│    "Add sizing note to Red Sneakers"             │
│    [Apply Fix]  [Dismiss]                        │
│                                                   │
│  ● Hero image missing on 3 products [storefront] │
│    [Apply Fix]  [Dismiss]                        │
│                                                   │
│  ● Product titles don't match trend  [trend]     │
│    [Apply Fix]  [Dismiss]                        │
│                                                   │
├─── INSIGHTS (3) ────────────────────────────────┤
│                                                   │
│  💡 "Sustainable packaging" +340%    [trend]     │
│     3 products could benefit                     │
│                                                   │
│  💡 Customers say "lightweight" not  [review]    │
│     "ultra-light" — keyword mismatch             │
│                                                   │
│  💡 Bounce rate 52% on Red Sneakers  [storefront]│
│                                                   │
└─────────────────────────────────────────────────┘
```

**Interactions:**
- Badge color per agent (inventory=blue, review=purple, trend=green, storefront=orange)
- Apply Fix → status="applied", toast confirm
- Dismiss → status="dismissed", hide from briefing
- Run Now → trigger all agents, loading state
- Click finding → expand detail + metadata

---

### 2. Inventory Page (`app.inventory`)

```
┌─────────────────────────────────────────────┐
│  Inventory Health          [Run Agent]       │
├─────────────────────────────────────────────┤
│                                              │
│  Summary Cards:                              │
│  [🔴 3 Low Stock] [⚫ 5 Dead Stock] [✅ 42 OK]│
│                                              │
├─────────────────────────────────────────────┤
│  Product table:                              │
│  Name    | Stock | Velocity | Days Left | ⚠  │
│  Blue W. |  12   |  5.6/day |    2     | 🔴 │
│  Red S.  |  89   |  1.2/day |   74     | ✅  │
│  Green H.|   0   |  0/day   |   --     | ⚫  │
└─────────────────────────────────────────────┘
```

---

### 3. Reviews Page (`app.reviews`)

```
┌─────────────────────────────────────────────┐
│  Review Insights            [Run Agent]      │
├─────────────────────────────────────────────┤
│                                              │
│  Summary Cards:                              │
│  [⭐ 4.2 Avg] [📝 127 Reviews] [⚠ 3 Issues] │
│                                              │
├─── TOP THEMES ──────────────────────────────┤
│  😡 "Runs small" — 5 mentions (Red Sneakers)│
│  😡 "Slow shipping" — 3 mentions (various)  │
│  😀 "Great quality" — 12 mentions           │
│  😀 "Love packaging" — 8 mentions           │
│                                              │
├─── BY PRODUCT ──────────────────────────────┤
│  Product      | Rating | Reviews | Top Issue │
│  Red Sneakers |  3.2   |   23    | sizing   │
│  Blue Widget  |  4.8   |   45    | none     │
└─────────────────────────────────────────────┘
```

---

### 4. Trends Page (`app.trends`)

```
┌─────────────────────────────────────────────┐
│  Trend Radar                [Run Agent]      │
├─────────────────────────────────────────────┤
│                                              │
│  🔥 TRENDING NOW                             │
│  Keyword          | Growth | Your Products   │
│  sustainable pack | +340%  | 3 not optimized │
│  minimalist design| +120%  | 0 matched       │
│  wireless charging| +85%   | 2 already good  │
│                                              │
├─── OPPORTUNITIES ───────────────────────────┤
│  "You have 3 products matching 'sustainable' │
│   but none mention it in title/description"  │
│   [Optimize All]                             │
└─────────────────────────────────────────────┘
```

---

### 5. Storefront Page (`app.storefront`)

```
┌─────────────────────────────────────────────┐
│  Store Health               [Run Agent]      │
├─────────────────────────────────────────────┤
│                                              │
│  Score: 72/100                               │
│  [███████░░░]                                │
│                                              │
│  Summary Cards:                              │
│  [🖼 12 Image Issues] [📝 5 Content] [📱 2 Mobile]│
│                                              │
├─── ISSUES ──────────────────────────────────┤
│  Priority | Issue              | Page        │
│  🔴 High  | Missing hero image | /product/x │
│  🔴 High  | No alt text (12)   | various    │
│  🟡 Med   | Thin description   | /product/y │
│  🟡 Med   | Bounce rate 52%    | /product/z │
└─────────────────────────────────────────────┘
```

---

### 6. Settings Page (`app.settings`)

```
┌─────────────────────────────────────────────┐
│  Settings                                    │
├─────────────────────────────────────────────┤
│                                              │
│  Agent Status                                │
│  ┌────────────┬──────────┐                   │
│  │ Inventory  │ ✅ Active │                   │
│  │ Reviews    │ ✅ Active │                   │
│  │ Trends     │ ✅ Active │                   │
│  │ Storefront │ ✅ Active │                   │
│  └────────────┴──────────┘                   │
│                                              │
│  Schedule: Run daily at [6:00 AM ▼]          │
│  API Key: [••••••••••] [Edit]                │
└─────────────────────────────────────────────┘
```

---

## Shared UI Patterns

Every agent page follows: **Summary cards → Detail list/table → Run Agent button**

## Data Model

```prisma
model AgentFinding {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  agentId     String   // "inventory" | "review" | "trend" | "storefront"
  shop        String
  type        String   // "done" | "action_needed" | "insight"
  priority    Int      // 1-5 (1 = critical)
  title       String
  description String
  action      String?
  metadata    Json?
  status      String   @default("pending")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Review {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  shop        String
  productId   String
  source      String
  author      String?
  rating      Int
  title       String?
  body        String
  verified    Boolean  @default(false)
  reviewDate  DateTime
  language    String?
  metadata    Json?
  createdAt   DateTime @default(now())
}
```

## Route Map

| Route | Screen | Owner |
|-------|--------|-------|
| `app.secretary` | Daily Briefing | Person 5 |
| `app.inventory` | Inventory health | Person 1 |
| `app.reviews` | Review insights | Person 2 |
| `app.trends` | Trend radar | Person 3 |
| `app.storefront` | Store health | Person 4 |
| `app.settings` | Agent config | Person 5 |

## Out of Scope (MVP)

- Trust levels (Advisor/Assistant/Autopilot)
- Real cron scheduler (manual trigger only)
- Email/push notifications
- Multi-store support
- Undo/rollback actions
