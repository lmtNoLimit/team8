# Task Breakdown - AI Store Secretary MVP

**Team:** 5 members | **Time:** 4 hours | **Base:** shopify-app-template-react-router-mongodb

---

## Shared Structure (scaffold TRƯỚC khi chia task - 30 phút)

### 1. Prisma Schema (`prisma/schema.prisma`)

```prisma
// Giữ nguyên Session model có sẵn, thêm:

model AgentFinding {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  agentId     String   // "inventory" | "review" | "trend" | "storefront"
  shop        String
  type        String   // "done" | "action_needed" | "insight"
  priority    Int      // 1-5 (1 = critical)
  title       String
  description String
  action      String?  // suggested action payload
  metadata    Json?    // agent-specific data
  status      String   @default("pending") // "pending" | "applied" | "dismissed"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Review {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  shop        String
  productId   String
  source      String   // "judgeme" | "yotpo" | "storefront_scrape" | "seed"
  author      String?
  rating      Int      // 1-5
  title       String?
  body        String
  verified    Boolean  @default(false)
  reviewDate  DateTime
  language    String?
  metadata    Json?
  createdAt   DateTime @default(now())
}
```

### 2. Folder Structure

```
app/
├── agents/                          # SHARED: agent infrastructure
│   ├── types.ts                     # AgentResult interface, shared types
│   ├── base.ts                      # BaseAgent abstract class
│   ├── inventory/                   # Person 1
│   │   ├── inventory.agent.ts
│   │   └── inventory.seed.ts        # seed fake data if needed
│   ├── review/                      # Person 2
│   │   ├── review.agent.ts
│   │   └── review.seed.ts
│   ├── trend/                       # Person 3
│   │   ├── trend.agent.ts
│   │   └── trend.seed.ts
│   └── storefront/                  # Person 4
│       ├── storefront.agent.ts
│       └── storefront.seed.ts
├── routes/
│   ├── app.tsx                      # existing - add nav item "Secretary"
│   ├── app._index.tsx               # existing
│   ├── app.secretary.tsx            # Person 5: Secretary UI / Daily Briefing
│   ├── app.secretary.agent.$id.tsx  # Person 5: Agent detail view (optional)
│   └── api.agents.run.ts            # SHARED: trigger agent runs
│   └── api.agents.findings.ts       # SHARED: CRUD findings
└── lib/
    └── ai.server.ts                 # SHARED: Claude API wrapper
```

### 3. Shared Interface (`app/agents/types.ts`)

```typescript
export type AgentId = "inventory" | "review" | "trend" | "storefront";

export type FindingType = "done" | "action_needed" | "insight";

export interface AgentFindingInput {
  agentId: AgentId;
  shop: string;
  type: FindingType;
  priority: number; // 1-5
  title: string;
  description: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentRunResult {
  agentId: AgentId;
  findings: AgentFindingInput[];
  runDuration: number; // ms
  error?: string;
}

export interface Agent {
  id: AgentId;
  name: string;
  description: string;
  run(shop: string): Promise<AgentRunResult>;
}
```

### 4. Base Agent (`app/agents/base.ts`)

```typescript
import type { Agent, AgentId, AgentFindingInput, AgentRunResult } from "./types";

export abstract class BaseAgent implements Agent {
  abstract id: AgentId;
  abstract name: string;
  abstract description: string;

  protected findings: AgentFindingInput[] = [];

  protected addFinding(finding: Omit<AgentFindingInput, "agentId" | "shop">) {
    this.findings.push({
      ...finding,
      agentId: this.id,
      shop: this._currentShop,
    });
  }

  private _currentShop = "";

  async run(shop: string): Promise<AgentRunResult> {
    this._currentShop = shop;
    this.findings = [];
    const start = Date.now();

    try {
      await this.execute(shop);
      return {
        agentId: this.id,
        findings: this.findings,
        runDuration: Date.now() - start,
      };
    } catch (error) {
      return {
        agentId: this.id,
        findings: this.findings,
        runDuration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  protected abstract execute(shop: string): Promise<void>;
}
```

### 5. Claude API Wrapper (`app/lib/ai.server.ts`)

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export async function askClaude(prompt: string, systemPrompt?: string) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt || "You are an AI assistant analyzing Shopify store data.",
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}

export async function askClaudeJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
  const text = await askClaude(
    prompt + "\n\nRespond with valid JSON only. No markdown, no explanation.",
    systemPrompt,
  );
  return JSON.parse(text) as T;
}
```

### 6. API Route: Run Agents (`app/routes/api.agents.run.ts`)

```typescript
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Import all agents
import { InventoryAgent } from "../agents/inventory/inventory.agent";
import { ReviewAgent } from "../agents/review/review.agent";
import { TrendAgent } from "../agents/trend/trend.agent";
import { StorefrontAgent } from "../agents/storefront/storefront.agent";

const agents = [
  new InventoryAgent(),
  new ReviewAgent(),
  new TrendAgent(),
  new StorefrontAgent(),
];

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Run all agents in parallel
  const results = await Promise.allSettled(
    agents.map((agent) => agent.run(shop))
  );

  // Save findings to DB
  const allFindings = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<any>).value.findings);

  if (allFindings.length > 0) {
    await db.agentFinding.createMany({ data: allFindings });
  }

  return Response.json({
    results: results.map((r, i) => ({
      agentId: agents[i].id,
      status: r.status,
      findingsCount: r.status === "fulfilled" ? r.value.findings.length : 0,
      error: r.status === "rejected" ? r.reason?.message : undefined,
    })),
  });
}
```

---

## Task Assignment

### Person 1: Inventory Agent

**File:** `app/agents/inventory/inventory.agent.ts`

**Nhiệm vụ:**
- Extend `BaseAgent`
- Dùng Shopify Admin API (`admin.graphql()`) query inventory levels, orders gần đây
- Tính sell-through velocity (đơn vị bán / ngày)
- Phát hiện: sắp hết hàng, dead stock (không bán 30+ ngày), overstocked items
- Produce ít nhất 3 findings

**Data cần:**
- `products` + `variants` + `inventoryLevels` (GraphQL Admin API)
- `orders` gần 30 ngày

**Output mẫu:**
```json
{
  "type": "action_needed",
  "priority": 1,
  "title": "Blue Widget selling out in 2 days",
  "description": "Current stock: 12 units. Avg daily sales: 5.6 units. At this pace, stockout by March 7.",
  "metadata": { "productId": "gid://shopify/Product/123", "daysUntilStockout": 2, "velocity": 5.6 }
}
```

**Lưu ý:** Nếu store demo không có order data, tạo `inventory.seed.ts` với mock data.

---

### Person 2: Review Insights Agent

**File:** `app/agents/review/review.agent.ts`

**Nhiệm vụ:**
- Extend `BaseAgent`
- Đọc reviews từ `Review` collection (normalized schema)
- Dùng Claude API phân tích: sentiment patterns, recurring complaints, praise themes, keyword mismatch (khách dùng từ khác title)
- Group insights theo product hoặc theo theme

**Data cần:**
- `Review` model (seed fake data vào đây)
- Tạo `review.seed.ts` — seed 30-50 reviews, mix ratings, nhiều products, realistic complaints

**Output mẫu:**
```json
{
  "type": "insight",
  "priority": 2,
  "title": "5 customers mention 'runs small' on Red Sneakers",
  "description": "Recurring sizing complaint. Customers say size runs 0.5-1 size smaller than expected. Consider adding sizing note to product page.",
  "metadata": { "productId": "gid://shopify/Product/456", "theme": "sizing", "mentionCount": 5, "sentiment": "negative" }
}
```

**Lưu ý:** Focus vào Claude API prompt engineering — output quality phụ thuộc prompt.

---

### Person 3: Trend Analyst Agent

**File:** `app/agents/trend/trend.agent.ts`

**Nhiệm vụ:**
- Extend `BaseAgent`
- Phân tích trending topics/keywords relevant cho store's niche
- So sánh trending terms vs store's current product titles/descriptions
- Phát hiện missed opportunities (trending mà store chưa optimize)

**Data source options (chọn 1 hoặc kết hợp):**
- Google Trends (unofficial API hoặc scrape)
- Claude API với knowledge về current trends
- Store's own search analytics nếu có
- Seed trending data cho demo

**Output mẫu:**
```json
{
  "type": "insight",
  "priority": 2,
  "title": "'Sustainable packaging' trending +340% in searches",
  "description": "You have 3 products with eco-friendly packaging but none mention 'sustainable' in title or description. Adding this keyword could capture trending search traffic.",
  "metadata": { "trend": "sustainable packaging", "growth": "+340%", "matchingProducts": 3 }
}
```

**Lưu ý:** Trend data khó lấy real-time trong 4h. OK to use Claude's knowledge + seed data. Quan trọng là logic matching trends vs store products.

---

### Person 4: Storefront Agent (QA / UX / CRO)

**File:** `app/agents/storefront/storefront.agent.ts`

**Nhiệm vụ:**
- Extend `BaseAgent`
- Audit storefront: broken images, missing alt text, page performance issues, mobile UX
- CRO checks: missing CTAs, thin product descriptions, no reviews displayed, missing trust signals
- Dùng Shopify Storefront API hoặc fetch actual storefront pages

**Data source:**
- Storefront API (product pages, collections)
- Direct HTTP fetch of store's public pages + parse HTML
- Shopify MCP nếu available

**Output mẫu:**
```json
{
  "type": "action_needed",
  "priority": 1,
  "title": "12 products missing hero images",
  "description": "These products only have placeholder images. Products with quality images convert 2-3x better.",
  "metadata": { "productIds": ["..."], "issue": "missing_image" }
}
```

**Lưu ý:** Scope rộng — pick 3-5 checks quan trọng nhất cho MVP, đừng cố cover hết.

---

### Person 5: Secretary UI + Daily Cron Concept

**File:** `app/routes/app.secretary.tsx`

**Nhiệm vụ:**
- Build Polaris dashboard đọc từ `AgentFinding`
- Layout 3 sections: **"Handled"** (type=done), **"Needs Decision"** (type=action_needed), **"Insights"** (type=insight)
- Sort by priority
- Action buttons: "Apply" → status=applied, "Dismiss" → status=dismissed
- "Run All Agents" button → POST to `/api/agents/run`
- Concept cho daily cron: show last run time, schedule indicator

**UI mockup:**
```
┌─────────────────────────────────────────────┐
│  Good morning! Here's your briefing         │
│  Last run: Today 6:00 AM | [Run Now]        │
├─────────────────────────────────────────────┤
│  HANDLED (2)                    ▼ collapse  │
│  ✅ Updated schema on 3 pages               │
│  ✅ Flagged dead stock items                 │
├─────────────────────────────────────────────┤
│  NEEDS YOUR DECISION (3)        ▼ collapse  │
│  🔴 Blue Widget stockout in 2 days  [Act]   │
│  🟡 12 products missing images     [Act]    │
│  🟡 Sizing complaints on Sneakers  [Act]    │
├─────────────────────────────────────────────┤
│  INSIGHTS (2)                   ▼ collapse  │
│  💡 "Sustainable packaging" trending +340%  │
│  💡 Customers use "lightweight" not "ultra" │
└─────────────────────────────────────────────┘
```

**Tech:** Polaris components (`s-page`, `s-card`, `s-badge`, `s-button`), `useFetcher` cho actions.

---

## Timeline

| Time | Activity |
|------|---------|
| 0:00 - 0:30 | Scaffold shared infra: schema, types, base agent, API routes, AI wrapper |
| 0:30 - 3:00 | Parallel build: mỗi người build agent/UI của mình |
| 3:00 - 3:30 | Integration: connect agents → run → UI displays |
| 3:30 - 4:00 | Demo prep + polish |

## Definition of Done

Mỗi agent phải:
- [ ] Extend `BaseAgent` đúng interface
- [ ] Produce >= 3 findings với đủ 3 types (done, action_needed, insight)
- [ ] Findings hiển thị được trên Secretary UI
- [ ] Có seed data hoặc real data chạy demo được

Secretary UI phải:
- [ ] Hiển thị findings grouped by type
- [ ] Sort by priority
- [ ] "Run All Agents" button works
- [ ] Apply/Dismiss actions update status
