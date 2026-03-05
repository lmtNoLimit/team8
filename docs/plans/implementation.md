# AI Store Secretary — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI Secretary app with 4 agents (Inventory, Reviews, Trends, Storefront) and a daily briefing dashboard for Shopify merchants.

**Architecture:** Each agent extends a shared `BaseAgent` class, runs independently, writes findings to MongoDB via Prisma. Secretary UI reads findings grouped by type. All agents triggered via a single API endpoint.

**Tech Stack:** React Router v7 + Shopify Polaris web components + Prisma/MongoDB + Claude API (`@anthropic-ai/sdk`)

**Base project:** `/Users/bbadmin/projects/shopify-app-template-react-router-mongodb`

---

## Task 0: Shared Infrastructure (Lead dev — before parallel work)

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `package.json` (add `@anthropic-ai/sdk`)
- Modify: `shopify.app.toml` (add scopes)
- Modify: `app/routes/app.tsx` (update nav)
- Create: `app/agents/types.ts`
- Create: `app/agents/base.ts`
- Create: `app/agents/registry.ts`
- Create: `app/lib/ai.server.ts`
- Create: `app/routes/api.agents.run.ts`
- Create: `app/routes/api.agents.findings.ts`

### Step 1: Add dependencies

```bash
cd /Users/bbadmin/projects/shopify-app-template-react-router-mongodb
npm install @anthropic-ai/sdk
```

### Step 2: Update Prisma schema

Add to `prisma/schema.prisma` after the Session model:

```prisma
model AgentFinding {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  agentId     String
  shop        String
  type        String
  priority    Int
  title       String
  description String
  action      String?
  metadata    Json?
  status      String   @default("pending")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([shop, status])
  @@index([shop, agentId])
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

  @@index([shop, productId])
}
```

Run:
```bash
npx prisma generate && npx prisma db push
```

### Step 3: Update scopes in `shopify.app.toml`

Change line 25:
```toml
scopes = "write_products,read_products,read_orders,read_inventory"
```

### Step 4: Create agent types (`app/agents/types.ts`)

```typescript
export type AgentId = "inventory" | "review" | "trend" | "storefront";

export type FindingType = "done" | "action_needed" | "insight";

export interface AgentFindingInput {
  agentId: AgentId;
  shop: string;
  type: FindingType;
  priority: number;
  title: string;
  description: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentRunResult {
  agentId: AgentId;
  findings: AgentFindingInput[];
  runDuration: number;
  error?: string;
}

export interface Agent {
  id: AgentId;
  name: string;
  description: string;
  run(shop: string, admin?: any): Promise<AgentRunResult>;
}
```

### Step 5: Create base agent (`app/agents/base.ts`)

```typescript
import type {
  Agent,
  AgentId,
  AgentFindingInput,
  AgentRunResult,
  FindingType,
} from "./types";

export abstract class BaseAgent implements Agent {
  abstract id: AgentId;
  abstract name: string;
  abstract description: string;

  protected findings: AgentFindingInput[] = [];
  private _currentShop = "";

  protected addFinding(finding: {
    type: FindingType;
    priority: number;
    title: string;
    description: string;
    action?: string;
    metadata?: Record<string, unknown>;
  }) {
    this.findings.push({
      ...finding,
      agentId: this.id,
      shop: this._currentShop,
    });
  }

  async run(shop: string, admin?: any): Promise<AgentRunResult> {
    this._currentShop = shop;
    this.findings = [];
    const start = Date.now();

    try {
      await this.execute(shop, admin);
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

  protected abstract execute(shop: string, admin?: any): Promise<void>;
}
```

### Step 6: Create agent registry (`app/agents/registry.ts`)

```typescript
import type { Agent } from "./types";

// Agents register themselves here. Import as they're built.
// import { InventoryAgent } from "./inventory/inventory.agent";
// import { ReviewAgent } from "./review/review.agent";
// import { TrendAgent } from "./trend/trend.agent";
// import { StorefrontAgent } from "./storefront/storefront.agent";

const agents: Agent[] = [
  // Uncomment as agents are built:
  // new InventoryAgent(),
  // new ReviewAgent(),
  // new TrendAgent(),
  // new StorefrontAgent(),
];

export function getAllAgents(): Agent[] {
  return agents;
}

export function getAgent(id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}
```

### Step 7: Create Claude API wrapper (`app/lib/ai.server.ts`)

```typescript
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient() {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export async function askClaude(
  prompt: string,
  systemPrompt?: string,
): Promise<string> {
  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system:
      systemPrompt ||
      "You are an AI assistant analyzing Shopify store data. Be concise and actionable.",
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}

export async function askClaudeJSON<T>(
  prompt: string,
  systemPrompt?: string,
): Promise<T> {
  const text = await askClaude(
    prompt + "\n\nRespond with valid JSON only. No markdown, no code fences, no explanation.",
    systemPrompt,
  );

  const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as T;
}
```

### Step 8: Create API route — run agents (`app/routes/api.agents.run.ts`)

```typescript
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getAllAgents } from "../agents/registry";

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const agents = getAllAgents();

  const results = await Promise.allSettled(
    agents.map((agent) => agent.run(shop, admin)),
  );

  const allFindings = results
    .filter(
      (r): r is PromiseFulfilledResult<any> => r.status === "fulfilled",
    )
    .flatMap((r) => r.value.findings);

  if (allFindings.length > 0) {
    for (const finding of allFindings) {
      await db.agentFinding.create({ data: finding });
    }
  }

  return Response.json({
    results: results.map((r, i) => ({
      agentId: agents[i].id,
      status: r.status,
      findingsCount:
        r.status === "fulfilled" ? r.value.findings.length : 0,
      error: r.status === "rejected" ? String(r.reason) : undefined,
    })),
    totalFindings: allFindings.length,
  });
}
```

### Step 9: Create API route — findings CRUD (`app/routes/api.agents.findings.ts`)

```typescript
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId");
  const status = url.searchParams.get("status");

  const where: any = { shop };
  if (agentId) where.agentId = agentId;
  if (status) where.status = status;

  const findings = await db.agentFinding.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return Response.json({ findings });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action") as string;
  const findingId = formData.get("findingId") as string;

  if (action === "update_status" && findingId) {
    const newStatus = formData.get("status") as string;
    await db.agentFinding.update({
      where: { id: findingId },
      data: { status: newStatus },
    });
    return Response.json({ success: true });
  }

  if (action === "clear_all") {
    await db.agentFinding.deleteMany({
      where: { shop: session.shop },
    });
    return Response.json({ success: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
```

### Step 10: Update app nav (`app/routes/app.tsx`)

Replace the `<s-app-nav>` block (lines 20-23):

```tsx
<s-app-nav>
  <s-link href="/app">Secretary</s-link>
  <s-link href="/app/inventory">Inventory</s-link>
  <s-link href="/app/reviews">Reviews</s-link>
  <s-link href="/app/trends">Trends</s-link>
  <s-link href="/app/storefront">Store Health</s-link>
  <s-link href="/app/settings">Settings</s-link>
</s-app-nav>
```

### Step 11: Push schema and verify

```bash
npx prisma generate && npx prisma db push
npm run typecheck
```

### Step 12: Commit

```bash
git add -A
git commit -m "feat: scaffold shared agent infrastructure

- Add AgentFinding + Review Prisma models
- Add BaseAgent class + agent types + registry
- Add Claude API wrapper
- Add API routes for running agents and CRUD findings
- Update app nav for all agent pages"
```

---

## Task 1: Inventory Agent (Person 1)

**Files:**
- Create: `app/agents/inventory/inventory.agent.ts`
- Create: `app/routes/app.inventory.tsx`
- Modify: `app/agents/registry.ts` (uncomment InventoryAgent)

### Step 1: Create inventory agent

Create `app/agents/inventory/inventory.agent.ts`:

```typescript
import { BaseAgent } from "../base";
import type { AgentId } from "../types";
import { askClaudeJSON } from "../../lib/ai.server";

export class InventoryAgent extends BaseAgent {
  id: AgentId = "inventory";
  name = "Inventory Agent";
  description = "Monitors stock levels, sell-through velocity, stockout risks";

  protected async execute(shop: string, admin?: any): Promise<void> {
    if (!admin) {
      await this.runWithSeedData(shop);
      return;
    }

    try {
      const response = await admin.graphql(
        `#graphql
        query {
          products(first: 50) {
            edges {
              node {
                id
                title
                totalInventory
                status
                variants(first: 5) {
                  edges {
                    node {
                      id
                      inventoryQuantity
                      sku
                    }
                  }
                }
              }
            }
          }
        }`,
      );
      const data = await response.json();
      const products = data.data?.products?.edges?.map((e: any) => e.node) || [];

      await this.analyzeInventory(products);
    } catch {
      await this.runWithSeedData(shop);
    }
  }

  private async analyzeInventory(products: any[]) {
    const lowStock = products.filter(
      (p: any) => p.totalInventory > 0 && p.totalInventory < 10,
    );
    const outOfStock = products.filter((p: any) => p.totalInventory === 0);
    const overStocked = products.filter((p: any) => p.totalInventory > 500);

    for (const p of outOfStock) {
      this.addFinding({
        type: "action_needed",
        priority: 1,
        title: `${p.title} is out of stock`,
        description: `This product has 0 inventory. Customers cannot purchase it.`,
        action: `Review and restock ${p.title}`,
        metadata: { productId: p.id, totalInventory: 0 },
      });
    }

    for (const p of lowStock) {
      const daysLeft = Math.round(p.totalInventory / 2.5); // estimated velocity
      this.addFinding({
        type: "action_needed",
        priority: 2,
        title: `${p.title} — low stock (${p.totalInventory} units)`,
        description: `At estimated pace, stockout in ~${daysLeft} days. Consider reordering.`,
        metadata: {
          productId: p.id,
          totalInventory: p.totalInventory,
          estimatedDaysLeft: daysLeft,
        },
      });
    }

    for (const p of overStocked) {
      this.addFinding({
        type: "insight",
        priority: 4,
        title: `${p.title} may be overstocked (${p.totalInventory} units)`,
        description: `High inventory levels. Consider running a promotion to move stock.`,
        metadata: { productId: p.id, totalInventory: p.totalInventory },
      });
    }

    if (outOfStock.length === 0 && lowStock.length === 0) {
      this.addFinding({
        type: "done",
        priority: 5,
        title: "Inventory levels healthy",
        description: `Checked ${products.length} products. No stockout risks detected.`,
      });
    }
  }

  private async runWithSeedData(shop: string) {
    // Seed data for demo
    this.addFinding({
      type: "action_needed",
      priority: 1,
      title: "Blue Widget selling out in 2 days",
      description:
        "Current stock: 12 units. Average daily sales: 5.6 units. At this pace, stockout by March 7.",
      metadata: { productId: "demo-1", stock: 12, velocity: 5.6, daysLeft: 2 },
    });

    this.addFinding({
      type: "action_needed",
      priority: 2,
      title: "Red Sneakers — low stock (8 units)",
      description: "Selling 1.5/day. Stockout in ~5 days. Top seller last month.",
      metadata: { productId: "demo-2", stock: 8, velocity: 1.5, daysLeft: 5 },
    });

    this.addFinding({
      type: "insight",
      priority: 4,
      title: "Green Hoodie — possible dead stock",
      description: "142 units in stock, 0 sales in last 30 days. Consider discounting or bundling.",
      metadata: { productId: "demo-3", stock: 142, velocity: 0, daysWithoutSale: 30 },
    });

    this.addFinding({
      type: "done",
      priority: 5,
      title: "Flagged 2 dead stock items",
      description: "Green Hoodie and Yellow Cap have had zero sales in 30+ days.",
    });
  }
}
```

### Step 2: Create inventory page

Create `app/routes/app.inventory.tsx`:

```tsx
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const findings = await db.agentFinding.findMany({
    where: { shop: session.shop, agentId: "inventory" },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return { findings };
}

export default function InventoryPage() {
  const { findings } = useLoaderData<typeof loader>();

  const actionNeeded = findings.filter((f) => f.type === "action_needed");
  const insights = findings.filter((f) => f.type === "insight");
  const done = findings.filter((f) => f.type === "done");

  return (
    <s-page heading="Inventory Health">
      <s-section heading="Summary">
        <s-stack direction="inline" gap="base">
          <s-badge tone={actionNeeded.length > 0 ? "critical" : "success"}>
            {actionNeeded.length} Low Stock
          </s-badge>
          <s-badge tone="info">{insights.length} Insights</s-badge>
          <s-badge>{done.length} Healthy</s-badge>
        </s-stack>
      </s-section>

      {actionNeeded.length > 0 && (
        <s-section heading="Needs Attention">
          {actionNeeded.map((f) => (
            <s-box key={f.id} padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-stack direction="inline" gap="tight">
                  <s-badge tone="critical">Priority {f.priority}</s-badge>
                  <s-text fontWeight="bold">{f.title}</s-text>
                </s-stack>
                <s-paragraph>{f.description}</s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-section>
      )}

      {insights.length > 0 && (
        <s-section heading="Insights">
          {insights.map((f) => (
            <s-box key={f.id} padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-text fontWeight="bold">{f.title}</s-text>
                <s-paragraph>{f.description}</s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-section>
      )}
    </s-page>
  );
}
```

### Step 3: Register agent in registry

Uncomment in `app/agents/registry.ts`:
```typescript
import { InventoryAgent } from "./inventory/inventory.agent";
// ... in agents array:
new InventoryAgent(),
```

### Step 4: Verify and commit

```bash
npm run typecheck
git add app/agents/inventory/ app/routes/app.inventory.tsx app/agents/registry.ts
git commit -m "feat: add inventory agent + UI page"
```

---

## Task 2: Review Insights Agent (Person 2)

**Files:**
- Create: `app/agents/review/review.agent.ts`
- Create: `app/agents/review/review.seed.ts`
- Create: `app/routes/app.reviews.tsx`
- Modify: `app/agents/registry.ts` (uncomment ReviewAgent)

### Step 1: Create seed script

Create `app/agents/review/review.seed.ts`:

```typescript
import db from "../../db.server";

const SEED_REVIEWS = [
  { productId: "prod-red-sneakers", author: "Mike T.", rating: 2, title: "Runs small", body: "Love the look but had to return. Size 10 felt like a 9. Order a full size up.", verified: true },
  { productId: "prod-red-sneakers", author: "Sarah L.", rating: 3, title: "Sizing is off", body: "Quality is great but definitely runs small. I'm usually a 7 and needed an 8.", verified: true },
  { productId: "prod-red-sneakers", author: "James K.", rating: 1, title: "Too small!", body: "These run at least a full size small. Very disappointed. Returning.", verified: true },
  { productId: "prod-red-sneakers", author: "Anna P.", rating: 4, title: "Great once you get right size", body: "Beautiful sneakers. Order one size up — they run small. Otherwise perfect.", verified: true },
  { productId: "prod-red-sneakers", author: "Tom B.", rating: 2, title: "Size chart is wrong", body: "Followed the size chart and they were way too tight. Runs small for sure.", verified: false },
  { productId: "prod-blue-widget", author: "Lisa M.", rating: 5, title: "Amazing quality!", body: "Best widget I've ever bought. The build quality is incredible. Lightweight and durable.", verified: true },
  { productId: "prod-blue-widget", author: "Dave R.", rating: 5, title: "Worth every penny", body: "Super lightweight and works perfectly. Great packaging too — very eco-friendly.", verified: true },
  { productId: "prod-blue-widget", author: "Chris H.", rating: 4, title: "Great product, slow shipping", body: "Product is fantastic and lightweight. Took 2 weeks to arrive though.", verified: true },
  { productId: "prod-blue-widget", author: "Emma S.", rating: 5, title: "Love it", body: "So lightweight! Perfect for travel. Sustainable packaging was a nice touch.", verified: true },
  { productId: "prod-blue-widget", author: "Ryan W.", rating: 3, title: "Good but shipping was slow", body: "Widget is fine but shipping took forever. 12 business days is too long.", verified: false },
  { productId: "prod-green-hoodie", author: "Pat N.", rating: 4, title: "Comfortable", body: "Nice hoodie, very comfortable. Material feels premium.", verified: true },
  { productId: "prod-green-hoodie", author: "Kelly F.", rating: 2, title: "Faded after first wash", body: "Color faded significantly after just one wash. Disappointed with durability.", verified: true },
  { productId: "prod-green-hoodie", author: "Alex J.", rating: 2, title: "Color bleeds", body: "Green color started fading after washing. Not great for the price.", verified: true },
  { productId: "prod-green-hoodie", author: "Morgan D.", rating: 5, title: "Best hoodie ever", body: "Incredibly soft and warm. Been wearing it every day.", verified: true },
  { productId: "prod-yellow-cap", author: "Sam K.", rating: 4, title: "Nice fit", body: "Good quality cap. Fits well and looks great.", verified: true },
];

export async function seedReviews(shop: string) {
  const existing = await db.review.count({ where: { shop } });
  if (existing > 0) return { seeded: false, count: existing };

  for (const r of SEED_REVIEWS) {
    await db.review.create({
      data: {
        shop,
        productId: r.productId,
        source: "seed",
        author: r.author,
        rating: r.rating,
        title: r.title,
        body: r.body,
        verified: r.verified,
        reviewDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  return { seeded: true, count: SEED_REVIEWS.length };
}
```

### Step 2: Create review agent

Create `app/agents/review/review.agent.ts`:

```typescript
import { BaseAgent } from "../base";
import type { AgentId } from "../types";
import { askClaudeJSON } from "../../lib/ai.server";
import { seedReviews } from "./review.seed";
import db from "../../db.server";

interface ReviewInsight {
  theme: string;
  sentiment: "positive" | "negative" | "neutral";
  productId: string;
  productName: string;
  mentionCount: number;
  summary: string;
  suggestedAction: string;
}

export class ReviewAgent extends BaseAgent {
  id: AgentId = "review";
  name = "Review Insights Agent";
  description = "Analyzes customer reviews for patterns, complaints, and opportunities";

  protected async execute(shop: string): Promise<void> {
    // Ensure seed data exists for demo
    await seedReviews(shop);

    const reviews = await db.review.findMany({
      where: { shop },
      orderBy: { reviewDate: "desc" },
    });

    if (reviews.length === 0) {
      this.addFinding({
        type: "done",
        priority: 5,
        title: "No reviews to analyze",
        description: "No customer reviews found. Connect a review source to get insights.",
      });
      return;
    }

    // Group reviews by product
    const byProduct = new Map<string, typeof reviews>();
    for (const r of reviews) {
      const list = byProduct.get(r.productId) || [];
      list.push(r);
      byProduct.set(r.productId, list);
    }

    // Ask Claude to analyze
    const reviewText = reviews
      .map((r) => `[${r.productId}] ${r.rating}/5 "${r.title}" — ${r.body}`)
      .join("\n");

    const insights = await askClaudeJSON<ReviewInsight[]>(
      `Analyze these customer reviews and identify the top recurring themes (complaints and praise).

Reviews:
${reviewText}

Return a JSON array of insights, each with:
- theme: short theme name (e.g., "sizing", "shipping speed")
- sentiment: "positive" | "negative" | "neutral"
- productId: which product (or "various" if multiple)
- productName: human-readable product name
- mentionCount: how many reviews mention this theme
- summary: one sentence summary
- suggestedAction: what the merchant should do

Return 3-6 insights, sorted by importance.`,
      "You are an e-commerce review analyst. Identify actionable patterns in customer feedback.",
    );

    // Convert insights to findings
    for (const insight of insights) {
      const isNegative = insight.sentiment === "negative";
      this.addFinding({
        type: isNegative ? "action_needed" : "insight",
        priority: isNegative ? 2 : 4,
        title: `${insight.mentionCount} reviews mention "${insight.theme}" (${insight.productName})`,
        description: `${insight.summary}\n\nSuggested: ${insight.suggestedAction}`,
        metadata: {
          theme: insight.theme,
          sentiment: insight.sentiment,
          productId: insight.productId,
          mentionCount: insight.mentionCount,
        },
      });
    }

    // Summary finding
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    this.addFinding({
      type: "done",
      priority: 5,
      title: `Analyzed ${reviews.length} reviews across ${byProduct.size} products`,
      description: `Average rating: ${avgRating.toFixed(1)}/5. Found ${insights.length} patterns.`,
      metadata: { totalReviews: reviews.length, avgRating, productCount: byProduct.size },
    });
  }
}
```

### Step 3: Create reviews page

Create `app/routes/app.reviews.tsx`:

```tsx
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const findings = await db.agentFinding.findMany({
    where: { shop: session.shop, agentId: "review" },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  const reviewStats = await db.review.aggregate({
    where: { shop: session.shop },
    _count: true,
    _avg: { rating: true },
  });

  return { findings, reviewStats };
}

export default function ReviewsPage() {
  const { findings, reviewStats } = useLoaderData<typeof loader>();

  const actionNeeded = findings.filter((f) => f.type === "action_needed");
  const insights = findings.filter((f) => f.type === "insight");

  return (
    <s-page heading="Review Insights">
      <s-section heading="Overview">
        <s-stack direction="inline" gap="base">
          <s-badge>
            {reviewStats._avg.rating?.toFixed(1) || "—"} Avg Rating
          </s-badge>
          <s-badge>{reviewStats._count} Total Reviews</s-badge>
          <s-badge tone={actionNeeded.length > 0 ? "warning" : "success"}>
            {actionNeeded.length} Issues
          </s-badge>
        </s-stack>
      </s-section>

      {actionNeeded.length > 0 && (
        <s-section heading="Top Complaints">
          {actionNeeded.map((f) => (
            <s-box key={f.id} padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-stack direction="inline" gap="tight">
                  <s-badge tone="warning">{(f.metadata as any)?.sentiment}</s-badge>
                  <s-text fontWeight="bold">{f.title}</s-text>
                </s-stack>
                <s-paragraph>{f.description}</s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-section>
      )}

      {insights.length > 0 && (
        <s-section heading="Positive Themes">
          {insights.map((f) => (
            <s-box key={f.id} padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-text fontWeight="bold">{f.title}</s-text>
                <s-paragraph>{f.description}</s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-section>
      )}
    </s-page>
  );
}
```

### Step 4: Register and commit

Update `app/agents/registry.ts`, add import + instance.

```bash
npm run typecheck
git add app/agents/review/ app/routes/app.reviews.tsx app/agents/registry.ts
git commit -m "feat: add review insights agent with seed data + UI"
```

---

## Task 3: Trend Analyst Agent (Person 3)

**Files:**
- Create: `app/agents/trend/trend.agent.ts`
- Create: `app/routes/app.trends.tsx`
- Modify: `app/agents/registry.ts` (uncomment TrendAgent)

### Step 1: Create trend agent

Create `app/agents/trend/trend.agent.ts`:

```typescript
import { BaseAgent } from "../base";
import type { AgentId } from "../types";
import { askClaudeJSON } from "../../lib/ai.server";

interface TrendMatch {
  trend: string;
  growth: string;
  relevance: "high" | "medium" | "low";
  matchingProducts: string[];
  optimized: boolean;
  suggestion: string;
}

export class TrendAgent extends BaseAgent {
  id: AgentId = "trend";
  name = "Trend Analyst";
  description = "Identifies trending topics and matches them to your product catalog";

  protected async execute(shop: string, admin?: any): Promise<void> {
    let products: any[] = [];

    if (admin) {
      try {
        const response = await admin.graphql(
          `#graphql
          query {
            products(first: 50) {
              edges {
                node {
                  id
                  title
                  description
                  productType
                  tags
                }
              }
            }
          }`,
        );
        const data = await response.json();
        products = data.data?.products?.edges?.map((e: any) => e.node) || [];
      } catch {
        products = this.getSeedProducts();
      }
    } else {
      products = this.getSeedProducts();
    }

    const productSummary = products
      .map((p: any) => `- ${p.title} (${p.productType || "no type"}) [tags: ${p.tags?.join(", ") || "none"}]: ${(p.description || "").slice(0, 100)}`)
      .join("\n");

    const trends = await askClaudeJSON<TrendMatch[]>(
      `You are a market trend analyst. Given this product catalog, identify 4-6 current consumer/search trends that are relevant.

Product catalog:
${productSummary}

For each trend, determine:
- trend: the trending keyword/topic
- growth: estimated growth (e.g., "+340%", "+120%")
- relevance: how relevant to this store ("high", "medium", "low")
- matchingProducts: array of product titles that could benefit
- optimized: whether the product titles/descriptions already mention this trend
- suggestion: what the merchant should do

Return JSON array sorted by relevance then growth.`,
      "You are a market research analyst specializing in e-commerce and consumer search trends. Use your knowledge of current 2026 trends.",
    );

    for (const t of trends) {
      if (!t.optimized && t.matchingProducts.length > 0) {
        this.addFinding({
          type: "action_needed",
          priority: t.relevance === "high" ? 2 : 3,
          title: `"${t.trend}" trending ${t.growth} — ${t.matchingProducts.length} products not optimized`,
          description: `${t.suggestion}`,
          action: `Optimize ${t.matchingProducts.join(", ")} for "${t.trend}"`,
          metadata: {
            trend: t.trend,
            growth: t.growth,
            matchingProducts: t.matchingProducts,
          },
        });
      } else if (t.optimized) {
        this.addFinding({
          type: "done",
          priority: 5,
          title: `Already optimized for "${t.trend}" (${t.growth})`,
          description: `Your products already mention this trend. Good job.`,
          metadata: { trend: t.trend, growth: t.growth },
        });
      } else {
        this.addFinding({
          type: "insight",
          priority: 4,
          title: `"${t.trend}" trending ${t.growth}`,
          description: `${t.suggestion}. Could be relevant if you expand your catalog.`,
          metadata: { trend: t.trend, growth: t.growth },
        });
      }
    }
  }

  private getSeedProducts() {
    return [
      { id: "1", title: "Red Sneakers", productType: "Footwear", tags: ["shoes", "casual"], description: "Classic red athletic footwear for everyday wear" },
      { id: "2", title: "Blue Widget", productType: "Gadgets", tags: ["tech", "portable"], description: "Compact ultra-light portable widget for professionals" },
      { id: "3", title: "Green Hoodie", productType: "Apparel", tags: ["clothing", "eco"], description: "Comfortable cotton hoodie with eco-friendly packaging" },
      { id: "4", title: "Yellow Cap", productType: "Accessories", tags: ["hat", "outdoor"], description: "Bright yellow baseball cap for outdoor activities" },
      { id: "5", title: "Wireless Earbuds Pro", productType: "Electronics", tags: ["audio", "wireless"], description: "Premium wireless earbuds with noise cancellation" },
    ];
  }
}
```

### Step 2: Create trends page

Create `app/routes/app.trends.tsx`:

```tsx
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const findings = await db.agentFinding.findMany({
    where: { shop: session.shop, agentId: "trend" },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return { findings };
}

export default function TrendsPage() {
  const { findings } = useLoaderData<typeof loader>();

  const opportunities = findings.filter((f) => f.type === "action_needed");
  const insights = findings.filter((f) => f.type === "insight");
  const optimized = findings.filter((f) => f.type === "done");

  return (
    <s-page heading="Trend Radar">
      {opportunities.length > 0 && (
        <s-section heading="Opportunities">
          {opportunities.map((f) => (
            <s-box key={f.id} padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-stack direction="inline" gap="tight">
                  <s-badge tone="critical">{(f.metadata as any)?.growth}</s-badge>
                  <s-text fontWeight="bold">{f.title}</s-text>
                </s-stack>
                <s-paragraph>{f.description}</s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-section>
      )}

      {insights.length > 0 && (
        <s-section heading="Trending Now">
          {insights.map((f) => (
            <s-box key={f.id} padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-badge tone="info">{(f.metadata as any)?.growth}</s-badge>
                <s-text fontWeight="bold">{f.title}</s-text>
                <s-paragraph>{f.description}</s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-section>
      )}

      {optimized.length > 0 && (
        <s-section heading="Already Optimized">
          {optimized.map((f) => (
            <s-box key={f.id} padding="base" borderWidth="base" borderRadius="base">
              <s-badge tone="success">{f.title}</s-badge>
            </s-box>
          ))}
        </s-section>
      )}
    </s-page>
  );
}
```

### Step 3: Register and commit

```bash
npm run typecheck
git add app/agents/trend/ app/routes/app.trends.tsx app/agents/registry.ts
git commit -m "feat: add trend analyst agent + UI page"
```

---

## Task 4: Storefront Agent (Person 4)

**Files:**
- Create: `app/agents/storefront/storefront.agent.ts`
- Create: `app/routes/app.storefront.tsx`
- Modify: `app/agents/registry.ts` (uncomment StorefrontAgent)

### Step 1: Create storefront agent

Create `app/agents/storefront/storefront.agent.ts`:

```typescript
import { BaseAgent } from "../base";
import type { AgentId } from "../types";
import { askClaudeJSON } from "../../lib/ai.server";

interface StorefrontIssue {
  category: "image" | "content" | "mobile" | "ux" | "cro";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  page: string;
  suggestion: string;
}

export class StorefrontAgent extends BaseAgent {
  id: AgentId = "storefront";
  name = "Storefront Agent";
  description = "Audits store quality — images, content, UX, CRO issues";

  protected async execute(shop: string, admin?: any): Promise<void> {
    let products: any[] = [];

    if (admin) {
      try {
        const response = await admin.graphql(
          `#graphql
          query {
            products(first: 30) {
              edges {
                node {
                  id
                  title
                  description
                  descriptionHtml
                  featuredMedia {
                    preview {
                      image {
                        url
                        altText
                      }
                    }
                  }
                  media(first: 5) {
                    edges {
                      node {
                        ... on MediaImage {
                          image {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }`,
        );
        const data = await response.json();
        products = data.data?.products?.edges?.map((e: any) => e.node) || [];
      } catch {
        products = [];
      }
    }

    if (products.length > 0) {
      await this.analyzeRealProducts(products);
    } else {
      await this.runWithSeedData();
    }
  }

  private async analyzeRealProducts(products: any[]) {
    // Check for missing images
    const noImage = products.filter((p) => !p.featuredMedia?.preview?.image?.url);
    if (noImage.length > 0) {
      this.addFinding({
        type: "action_needed",
        priority: 1,
        title: `${noImage.length} products missing hero image`,
        description: `Products without images convert 2-3x worse. Missing: ${noImage.map((p) => p.title).join(", ")}`,
        metadata: { productIds: noImage.map((p) => p.id), issue: "missing_image" },
      });
    }

    // Check for missing alt text
    const noAlt = products.filter((p) => {
      const img = p.featuredMedia?.preview?.image;
      return img?.url && !img?.altText;
    });
    if (noAlt.length > 0) {
      this.addFinding({
        type: "action_needed",
        priority: 2,
        title: `${noAlt.length} products missing image alt text`,
        description: `Alt text improves accessibility and SEO. Missing on: ${noAlt.map((p) => p.title).join(", ")}`,
        metadata: { productIds: noAlt.map((p) => p.id), issue: "missing_alt" },
      });
    }

    // Check for thin descriptions
    const thinContent = products.filter(
      (p) => !p.description || p.description.length < 50,
    );
    if (thinContent.length > 0) {
      this.addFinding({
        type: "action_needed",
        priority: 2,
        title: `${thinContent.length} products have thin descriptions`,
        description: `Short descriptions hurt SEO and conversion. Products: ${thinContent.map((p) => p.title).join(", ")}`,
        metadata: { productIds: thinContent.map((p) => p.id), issue: "thin_content" },
      });
    }

    // Ask Claude for deeper CRO analysis
    const productSummary = products
      .slice(0, 10)
      .map(
        (p) =>
          `- ${p.title}: desc length=${p.description?.length || 0}, hasImage=${!!p.featuredMedia?.preview?.image?.url}, hasAlt=${!!p.featuredMedia?.preview?.image?.altText}`,
      )
      .join("\n");

    const issues = await askClaudeJSON<StorefrontIssue[]>(
      `Analyze this product data for a Shopify store and identify 2-3 UX/CRO issues:

${productSummary}

Return JSON array with: category, severity, title, description, page, suggestion`,
      "You are a CRO and UX expert auditing a Shopify storefront.",
    );

    for (const issue of issues) {
      this.addFinding({
        type: "insight",
        priority: issue.severity === "high" ? 2 : 3,
        title: issue.title,
        description: `${issue.description}\n\nSuggestion: ${issue.suggestion}`,
        metadata: { category: issue.category, page: issue.page },
      });
    }

    // Health score
    const totalChecks = products.length * 3; // image, alt, description
    const issues_count = noImage.length + noAlt.length + thinContent.length;
    const score = Math.round(((totalChecks - issues_count) / totalChecks) * 100);

    this.addFinding({
      type: "done",
      priority: 5,
      title: `Store health score: ${score}/100`,
      description: `Checked ${products.length} products. Found ${issues_count} issues across images, alt text, and content.`,
      metadata: { score, productsChecked: products.length, issuesFound: issues_count },
    });
  }

  private async runWithSeedData() {
    this.addFinding({
      type: "action_needed",
      priority: 1,
      title: "12 products missing hero images",
      description: "Products with quality images convert 2-3x better. These products only have placeholders.",
      metadata: { issue: "missing_image", count: 12 },
    });

    this.addFinding({
      type: "action_needed",
      priority: 2,
      title: "8 products missing image alt text",
      description: "Alt text improves accessibility and helps with SEO rankings.",
      metadata: { issue: "missing_alt", count: 8 },
    });

    this.addFinding({
      type: "action_needed",
      priority: 2,
      title: "5 products have descriptions under 50 characters",
      description: "Thin product descriptions hurt both SEO and conversion rates.",
      metadata: { issue: "thin_content", count: 5 },
    });

    this.addFinding({
      type: "insight",
      priority: 3,
      title: "Red Sneakers page has 52% bounce rate",
      description: "Higher than store average (35%). Consider improving hero image and adding size FAQ.",
      metadata: { page: "/products/red-sneakers", bounceRate: 52, avgBounceRate: 35 },
    });

    this.addFinding({
      type: "done",
      priority: 5,
      title: "Store health score: 72/100",
      description: "Checked 50 products. Found 25 issues across images, alt text, and content.",
      metadata: { score: 72, productsChecked: 50, issuesFound: 25 },
    });
  }
}
```

### Step 2: Create storefront page

Create `app/routes/app.storefront.tsx`:

```tsx
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const findings = await db.agentFinding.findMany({
    where: { shop: session.shop, agentId: "storefront" },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return { findings };
}

export default function StorefrontPage() {
  const { findings } = useLoaderData<typeof loader>();

  const scoreFinding = findings.find(
    (f) => (f.metadata as any)?.score !== undefined,
  );
  const score = (scoreFinding?.metadata as any)?.score ?? "—";
  const issues = findings.filter((f) => f.type === "action_needed");
  const insights = findings.filter((f) => f.type === "insight");

  return (
    <s-page heading="Store Health">
      <s-section heading={`Score: ${score}/100`}>
        <s-stack direction="inline" gap="base">
          <s-badge tone={issues.length > 3 ? "critical" : "warning"}>
            {issues.length} Issues
          </s-badge>
          <s-badge tone="info">{insights.length} Suggestions</s-badge>
        </s-stack>
      </s-section>

      {issues.length > 0 && (
        <s-section heading="Issues">
          {issues.map((f) => (
            <s-box key={f.id} padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-stack direction="inline" gap="tight">
                  <s-badge tone={f.priority <= 1 ? "critical" : "warning"}>
                    {f.priority <= 1 ? "High" : "Medium"}
                  </s-badge>
                  <s-text fontWeight="bold">{f.title}</s-text>
                </s-stack>
                <s-paragraph>{f.description}</s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-section>
      )}

      {insights.length > 0 && (
        <s-section heading="Suggestions">
          {insights.map((f) => (
            <s-box key={f.id} padding="base" borderWidth="base" borderRadius="base">
              <s-text fontWeight="bold">{f.title}</s-text>
              <s-paragraph>{f.description}</s-paragraph>
            </s-box>
          ))}
        </s-section>
      )}
    </s-page>
  );
}
```

### Step 3: Register and commit

```bash
npm run typecheck
git add app/agents/storefront/ app/routes/app.storefront.tsx app/agents/registry.ts
git commit -m "feat: add storefront QA agent + UI page"
```

---

## Task 5: Secretary UI + Settings (Person 5)

**Files:**
- Create: `app/routes/app.secretary.tsx`
- Create: `app/routes/app.settings.tsx`
- Modify: `app/routes/app._index.tsx` (redirect to secretary)

### Step 1: Create Secretary dashboard

Create `app/routes/app.secretary.tsx`:

```tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const findings = await db.agentFinding.findMany({
    where: { shop: session.shop, status: "pending" },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  const lastRun = findings.length > 0
    ? findings.reduce((latest, f) =>
        f.createdAt > latest ? f.createdAt : latest,
        findings[0].createdAt,
      )
    : null;

  return {
    findings,
    lastRun,
    shopName: session.shop.replace(".myshopify.com", ""),
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update_status") {
    const findingId = formData.get("findingId") as string;
    const status = formData.get("status") as string;
    await db.agentFinding.update({
      where: { id: findingId },
      data: { status },
    });
    return { success: true };
  }

  return { error: "Unknown intent" };
}

const AGENT_COLORS: Record<string, string> = {
  inventory: "info",
  review: "new",
  trend: "success",
  storefront: "warning",
};

export default function SecretaryPage() {
  const { findings, lastRun, shopName } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const runAgents = useFetcher();
  const shopify = useAppBridge();

  const isRunning = runAgents.state !== "idle";

  const done = findings.filter((f) => f.type === "done");
  const actionNeeded = findings.filter((f) => f.type === "action_needed");
  const insights = findings.filter((f) => f.type === "insight");

  useEffect(() => {
    if (runAgents.data && !isRunning) {
      shopify.toast.show("Agents finished running!");
    }
  }, [runAgents.data, isRunning, shopify]);

  const handleRunAgents = () => {
    runAgents.submit({}, { method: "POST", action: "/api/agents/run" });
  };

  const handleStatus = (findingId: string, status: string) => {
    fetcher.submit(
      { intent: "update_status", findingId, status },
      { method: "POST" },
    );
  };

  const lastRunText = lastRun
    ? new Date(lastRun).toLocaleString()
    : "Never";

  return (
    <s-page heading={`Good morning, ${shopName}!`}>
      <s-button
        slot="primary-action"
        onClick={handleRunAgents}
        {...(isRunning ? { loading: true } : {})}
      >
        Run All Agents
      </s-button>

      <s-section>
        <s-paragraph>
          Last run: {lastRunText} · {findings.length} findings
        </s-paragraph>
      </s-section>

      {done.length > 0 && (
        <s-section heading={`Handled (${done.length})`}>
          {done.map((f) => (
            <s-box key={f.id} padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="inline" gap="tight">
                <s-badge tone="success">Done</s-badge>
                <s-badge tone={AGENT_COLORS[f.agentId] || "info"}>
                  {f.agentId}
                </s-badge>
                <s-text>{f.title}</s-text>
              </s-stack>
            </s-box>
          ))}
        </s-section>
      )}

      {actionNeeded.length > 0 && (
        <s-section heading={`Needs Your Decision (${actionNeeded.length})`}>
          {actionNeeded.map((f) => (
            <s-box key={f.id} padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-stack direction="inline" gap="tight">
                  <s-badge tone="critical">Priority {f.priority}</s-badge>
                  <s-badge tone={AGENT_COLORS[f.agentId] || "info"}>
                    {f.agentId}
                  </s-badge>
                  <s-text fontWeight="bold">{f.title}</s-text>
                </s-stack>
                <s-paragraph>{f.description}</s-paragraph>
                <s-stack direction="inline" gap="tight">
                  <s-button
                    variant="primary"
                    size="slim"
                    onClick={() => handleStatus(f.id, "applied")}
                  >
                    Apply
                  </s-button>
                  <s-button
                    size="slim"
                    onClick={() => handleStatus(f.id, "dismissed")}
                  >
                    Dismiss
                  </s-button>
                </s-stack>
              </s-stack>
            </s-box>
          ))}
        </s-section>
      )}

      {insights.length > 0 && (
        <s-section heading={`Insights (${insights.length})`}>
          {insights.map((f) => (
            <s-box key={f.id} padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-stack direction="inline" gap="tight">
                  <s-badge tone={AGENT_COLORS[f.agentId] || "info"}>
                    {f.agentId}
                  </s-badge>
                  <s-text fontWeight="bold">{f.title}</s-text>
                </s-stack>
                <s-paragraph>{f.description}</s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-section>
      )}

      {findings.length === 0 && (
        <s-section>
          <s-empty-state heading="No findings yet">
            <s-paragraph>
              Click "Run All Agents" to get your first briefing.
            </s-paragraph>
          </s-empty-state>
        </s-section>
      )}
    </s-page>
  );
}
```

### Step 2: Create settings page

Create `app/routes/app.settings.tsx`:

```tsx
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getAllAgents } from "../agents/registry";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  const agents = getAllAgents().map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
  }));
  return { agents };
}

export default function SettingsPage() {
  const { agents } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Settings">
      <s-section heading="Active Agents">
        {agents.map((a) => (
          <s-box key={a.id} padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="inline" gap="base">
              <s-badge tone="success">Active</s-badge>
              <s-stack direction="block" gap="tight">
                <s-text fontWeight="bold">{a.name}</s-text>
                <s-paragraph>{a.description}</s-paragraph>
              </s-stack>
            </s-stack>
          </s-box>
        ))}
      </s-section>

      <s-section heading="Schedule (Coming Soon)">
        <s-paragraph>
          Daily briefing at 6:00 AM. Automatic scheduling will be available in the next version.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
```

### Step 3: Redirect home to secretary

Replace `app/routes/app._index.tsx` content:

```tsx
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return redirect("/app/secretary");
}

export default function Index() {
  return null;
}
```

### Step 4: Commit

```bash
npm run typecheck
git add app/routes/app.secretary.tsx app/routes/app.settings.tsx app/routes/app._index.tsx
git commit -m "feat: add secretary dashboard + settings + redirect home"
```

---

## Integration (Final — after all tasks merge)

### Step 1: Ensure all agents registered in `app/agents/registry.ts`

```typescript
import type { Agent } from "./types";
import { InventoryAgent } from "./inventory/inventory.agent";
import { ReviewAgent } from "./review/review.agent";
import { TrendAgent } from "./trend/trend.agent";
import { StorefrontAgent } from "./storefront/storefront.agent";

const agents: Agent[] = [
  new InventoryAgent(),
  new ReviewAgent(),
  new TrendAgent(),
  new StorefrontAgent(),
];

export function getAllAgents(): Agent[] {
  return agents;
}

export function getAgent(id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}
```

### Step 2: Full verification

```bash
npx prisma generate && npx prisma db push
npm run typecheck
npm run dev
```

### Step 3: Demo flow

1. Open app → redirects to Secretary dashboard
2. Click "Run All Agents" → triggers all 4 agents
3. Findings appear grouped: Handled / Needs Decision / Insights
4. Click Apply or Dismiss on action items
5. Navigate to each agent page for detail view

### Step 4: Final commit

```bash
git add -A
git commit -m "feat: integrate all agents into secretary dashboard"
```
