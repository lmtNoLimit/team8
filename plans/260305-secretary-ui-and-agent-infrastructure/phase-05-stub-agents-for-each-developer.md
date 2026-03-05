---
phase: 5
title: "Stub Agents for Each Developer"
status: pending
owner: Lead
effort: 20min
---

# Phase 5: Stub Agents for Each Developer

## Context Links
- [Agent Interface](./phase-02-agent-interface-contract.md)
- [Agent Registry](./phase-03-agent-registry-and-executor-services.md)

## Overview

Create placeholder agent implementations for all 5 agents. Each stub:
1. Implements the `Agent` interface
2. Returns 3 hardcoded findings (so the dashboard has data immediately)
3. Lives in its own folder (clear ownership boundary)

Developers replace the stub with real logic during the hackathon. The stub ensures the entire system compiles and runs end-to-end before anyone writes agent code.

## Key Insights

- Stubs return realistic-looking findings so the dashboard UI can be developed in parallel
- Each stub agent file is the ONLY file the agent developer needs to modify initially
- Use `.server.ts` suffix (not `.tsx`) since agents are server-only code
- Export a singleton object, not a class -- simpler and sufficient for MVP

## Requirements

**Functional:**
- Each stub returns exactly 3 `AgentFindingInput` items with realistic titles/descriptions
- Cover all 3 finding types: "done", "action_needed", "insight"
- Each stub sets a unique `deduplicationKey` per finding

**Non-functional:**
- No external dependencies (no API calls, no DB queries)
- Instant return (no async delay)

## Related Code Files

**Create:**
- `app/agents/aeo-agent/aeo-agent.server.ts`
- `app/agents/content-agent/content-agent.server.ts`
- `app/agents/schema-agent/schema-agent.server.ts`
- `app/agents/inventory-agent/inventory-agent.server.ts`
- `app/agents/storefront-agent/storefront-agent.server.ts`

## Implementation Steps

### Step 1: Create directories

```bash
mkdir -p app/agents/aeo-agent
mkdir -p app/agents/content-agent
mkdir -p app/agents/schema-agent
mkdir -p app/agents/inventory-agent
mkdir -p app/agents/storefront-agent
```

### Step 2: AEO Agent Stub -- `app/agents/aeo-agent/aeo-agent.server.ts`

```typescript
import type { Agent, AdminClient, AgentFindingInput } from "../../lib/agent-interface";

/**
 * AEO Agent -- AI Engine Optimization
 * Monitors product visibility to AI agents (ChatGPT, Perplexity, Gemini).
 *
 * STUB: Replace this with real implementation.
 * Owner: Developer A
 */
export const aeoAgent: Agent = {
  agentId: "aeo",
  displayName: "AEO Specialist",
  description: "Monitors product visibility to AI search engines",

  async run(shop: string, _admin: AdminClient): Promise<AgentFindingInput[]> {
    // TODO: Replace with real AEO analysis
    return [
      {
        type: "action_needed",
        priority: 2,
        title: "18 products invisible to ChatGPT Shopping",
        description:
          "These products lack metadata required for AI agent discovery. Optimized descriptions ready to apply.",
        action: JSON.stringify({ type: "applyMetadata", productCount: 18 }),
        metadata: { missingFields: ["description", "gtin"], productCount: 18 },
        deduplicationKey: "aeo:invisible-products",
      },
      {
        type: "done",
        priority: 4,
        title: "Updated llms.txt with 12 new products",
        description:
          "Automatically added 12 recently published products to your llms.txt file for AI crawlers.",
        metadata: { productsAdded: 12 },
        deduplicationKey: "aeo:llms-txt-update",
      },
      {
        type: "insight",
        priority: 3,
        title: "Competitor appeared in Perplexity for 'wireless headphones'",
        description:
          "CompetitorX now ranks in Perplexity Shopping for a keyword you target. Your listing can be optimized.",
        metadata: { keyword: "wireless headphones", competitor: "CompetitorX" },
        deduplicationKey: "aeo:competitor-perplexity",
      },
    ];
  },
};
```

### Step 3: Content Agent Stub -- `app/agents/content-agent/content-agent.server.ts`

```typescript
import type { Agent, AdminClient, AgentFindingInput } from "../../lib/agent-interface";

/**
 * Content Agent -- Product Content Quality
 * Audits titles/descriptions for quality, flags thin or duplicate content.
 *
 * STUB: Replace with real implementation.
 * Owner: Developer B
 */
export const contentAgent: Agent = {
  agentId: "content",
  displayName: "Content Writer",
  description: "Audits product content quality and drafts improvements",

  async run(shop: string, _admin: AdminClient): Promise<AgentFindingInput[]> {
    return [
      {
        type: "action_needed",
        priority: 2,
        title: "7 products have thin descriptions (< 50 words)",
        description:
          "Short descriptions hurt conversion and AI discoverability. Expanded drafts are ready for review.",
        action: JSON.stringify({ type: "expandDescriptions", productCount: 7 }),
        metadata: { avgWordCount: 23, targetWordCount: 150 },
        deduplicationKey: "content:thin-descriptions",
      },
      {
        type: "action_needed",
        priority: 3,
        title: "3 duplicate product titles detected",
        description:
          "Products share identical titles which confuses search engines and AI agents.",
        metadata: { duplicateGroups: 2 },
        deduplicationKey: "content:duplicate-titles",
      },
      {
        type: "insight",
        priority: 4,
        title: "'Sustainable packaging' trending +340% in AI searches",
        description:
          "You have 3 matching products not optimized for this trend. Consider updating their descriptions.",
        metadata: { keyword: "sustainable packaging", matchingProducts: 3 },
        deduplicationKey: "content:trending-sustainable",
      },
    ];
  },
};
```

### Step 4: Schema Agent Stub -- `app/agents/schema-agent/schema-agent.server.ts`

```typescript
import type { Agent, AdminClient, AgentFindingInput } from "../../lib/agent-interface";

/**
 * Schema Agent -- Structured Data Validation
 * Validates JSON-LD/structured data and auto-generates missing schema.
 *
 * STUB: Replace with real implementation.
 * Owner: Developer C
 */
export const schemaAgent: Agent = {
  agentId: "schema",
  displayName: "Schema Expert",
  description: "Validates and fixes structured data (JSON-LD) on your storefront",

  async run(shop: string, _admin: AdminClient): Promise<AgentFindingInput[]> {
    return [
      {
        type: "done",
        priority: 3,
        title: "Fixed broken structured data on 3 product pages",
        description:
          "Detected and corrected invalid JSON-LD markup that was preventing rich results in Google.",
        metadata: { fixedPages: 3, errorType: "missing-price" },
        deduplicationKey: "schema:fixed-jsonld",
      },
      {
        type: "action_needed",
        priority: 1,
        title: "Homepage missing Organization schema",
        description:
          "Your homepage has no Organization structured data. This hurts brand knowledge panel in search.",
        action: JSON.stringify({ type: "addSchema", page: "homepage", schemaType: "Organization" }),
        deduplicationKey: "schema:missing-org-schema",
      },
      {
        type: "insight",
        priority: 4,
        title: "FAQ schema could boost 5 collection pages",
        description:
          "Adding FAQ structured data to your top collection pages could enable rich FAQ snippets.",
        metadata: { eligiblePages: 5 },
        deduplicationKey: "schema:faq-opportunity",
      },
    ];
  },
};
```

### Step 5: Inventory Agent Stub -- `app/agents/inventory-agent/inventory-agent.server.ts`

```typescript
import type { Agent, AdminClient, AgentFindingInput } from "../../lib/agent-interface";

/**
 * Inventory Agent -- Stock & Sales Monitoring
 * Monitors stock levels, calculates velocity, flags stockouts and dead stock.
 *
 * STUB: Replace with real implementation.
 * Owner: Developer D
 */
export const inventoryAgent: Agent = {
  agentId: "inventory",
  displayName: "Inventory Manager",
  description: "Monitors stock levels and predicts stockouts",

  async run(shop: string, _admin: AdminClient): Promise<AgentFindingInput[]> {
    return [
      {
        type: "action_needed",
        priority: 1,
        title: "'Blue Widget' selling out in 2 days at current pace",
        description:
          "Current stock: 14 units. Avg daily sales: 7. Reorder recommended immediately.",
        action: JSON.stringify({ type: "reorderAlert", productTitle: "Blue Widget", daysLeft: 2 }),
        metadata: { currentStock: 14, dailySales: 7, daysUntilStockout: 2 },
        deduplicationKey: "inventory:stockout-blue-widget",
      },
      {
        type: "insight",
        priority: 3,
        title: "5 products have zero sales in 30 days (dead stock)",
        description:
          "These products haven't sold in a month. Consider discounting or bundling them.",
        metadata: { deadStockCount: 5, totalInventoryValue: "$2,340" },
        deduplicationKey: "inventory:dead-stock",
      },
      {
        type: "done",
        priority: 5,
        title: "Inventory sync verified -- all counts match Shopify",
        description:
          "Checked 142 SKUs against Shopify inventory. No discrepancies found.",
        metadata: { skusChecked: 142 },
        deduplicationKey: "inventory:sync-check",
      },
    ];
  },
};
```

### Step 6: Storefront Agent Stub -- `app/agents/storefront-agent/storefront-agent.server.ts`

```typescript
import type { Agent, AdminClient, AgentFindingInput } from "../../lib/agent-interface";

/**
 * Storefront Agent -- Store Quality Monitoring
 * Checks live storefront for rendering issues, image quality, mobile UX.
 *
 * STUB: Replace with real implementation.
 * Owner: Developer E
 */
export const storefrontAgent: Agent = {
  agentId: "storefront",
  displayName: "Storefront QA",
  description: "Monitors live storefront quality, rendering, and UX issues",

  async run(shop: string, _admin: AdminClient): Promise<AgentFindingInput[]> {
    return [
      {
        type: "action_needed",
        priority: 2,
        title: "'Red Sneakers' page has 52% bounce rate",
        description:
          "Significantly above store average (31%). Suggest improving hero image and adding size FAQ.",
        action: JSON.stringify({ type: "optimizePage", handle: "red-sneakers" }),
        metadata: { bounceRate: 0.52, storeAvg: 0.31, pageHandle: "red-sneakers" },
        deduplicationKey: "storefront:high-bounce-red-sneakers",
      },
      {
        type: "done",
        priority: 4,
        title: "All product images pass quality check",
        description:
          "Scanned 89 product images. All meet minimum resolution (800x800) and load under 3s.",
        metadata: { imagesScanned: 89 },
        deduplicationKey: "storefront:image-quality-check",
      },
      {
        type: "insight",
        priority: 3,
        title: "Mobile checkout takes 4.2s to load (target: < 3s)",
        description:
          "Mobile checkout performance is below target. Main bottleneck: unoptimized JavaScript bundle.",
        metadata: { loadTime: 4.2, target: 3.0, bottleneck: "js-bundle" },
        deduplicationKey: "storefront:mobile-checkout-speed",
      },
    ];
  },
};
```

### Step 7: Verify everything compiles

```bash
npm run typecheck
```

## Todo List

- [ ] Create all 5 agent directories
- [ ] Create `app/agents/aeo-agent/aeo-agent.server.ts`
- [ ] Create `app/agents/content-agent/content-agent.server.ts`
- [ ] Create `app/agents/schema-agent/schema-agent.server.ts`
- [ ] Create `app/agents/inventory-agent/inventory-agent.server.ts`
- [ ] Create `app/agents/storefront-agent/storefront-agent.server.ts`
- [ ] Verify registry imports all stubs (Phase 3 file)
- [ ] Run `npm run typecheck`
- [ ] Run `npm run dev` and trigger via POST to verify end-to-end

## Success Criteria

- All 5 stubs implement the `Agent` interface without type errors
- `npm run dev` starts without import errors
- POST to `/app/api/agents/aeo/run` returns `{ success: true, findingsCount: 3 }`
- POST to `/app/api/agents/run-all` returns results for all 5 agents
- Findings appear in MongoDB `AgentFinding` collection
- Dashboard (Phase 6) can render these findings

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Developer forgets to match stub export name | Registry imports by specific export name; TypeScript catches mismatches |
| Stub findings don't cover all finding types | Each stub intentionally covers all 3 types: done, action_needed, insight |

## Next Steps

With stubs in place, the full stack compiles. Proceed to:
- Phase 6: Secretary Dashboard UI
- Phase 9: Developer guide (so agents can start replacing stubs)
