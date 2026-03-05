---
phase: 9
title: "Agent Developer Guide"
status: pending
owner: Lead
effort: 20min
---

# Phase 9: Agent Developer Guide

## Context Links
- [Agent Interface](./phase-02-agent-interface-contract.md)
- [Stub Agents](./phase-05-stub-agents-for-each-developer.md)

## Overview

Document the exact steps each hackathon developer follows to build their agent. This guide is the single reference they need. Deliver as a markdown file in the project root or `docs/` folder.

## Related Code Files

**Create:**
- `docs/agent-developer-guide.md`

## Implementation Steps

### Step 1: Create `docs/agent-developer-guide.md`

```markdown
# Agent Developer Guide

## Quick Start (3 Steps)

### 1. Find your agent folder

Your stub is already created. Find it and replace the TODO logic:

| Agent | Folder | File to Edit |
|-------|--------|-------------|
| AEO | `app/agents/aeo-agent/` | `aeo-agent.server.ts` |
| Content | `app/agents/content-agent/` | `content-agent.server.ts` |
| Schema | `app/agents/schema-agent/` | `schema-agent.server.ts` |
| Inventory | `app/agents/inventory-agent/` | `inventory-agent.server.ts` |
| Storefront | `app/agents/storefront-agent/` | `storefront-agent.server.ts` |

### 2. Implement the `run()` method

Your agent file already has the structure. Replace the hardcoded stub findings with real logic:

```typescript
import type { Agent, AdminClient, AgentFindingInput } from "../../lib/agent-interface";

export const myAgent: Agent = {
  agentId: "my-agent",
  displayName: "My Agent Name",
  description: "What this agent does",

  async run(shop: string, admin: AdminClient): Promise<AgentFindingInput[]> {
    // 1. Fetch data from Shopify
    const response = await admin.graphql(`
      query {
        products(first: 50) {
          edges {
            node {
              id
              title
              description
            }
          }
        }
      }
    `);
    const json = await response.json();
    const products = json.data.products.edges.map((e: any) => e.node);

    // 2. Analyze the data (use Claude API, custom logic, etc.)
    const issues = analyzeProducts(products);

    // 3. Return findings
    return issues.map((issue) => ({
      type: issue.severity === "high" ? "action_needed" : "insight",
      priority: issue.severity === "high" ? 2 : 4,
      title: issue.title,
      description: issue.description,
      metadata: { productId: issue.productId },
      deduplicationKey: `my-agent:${issue.id}`,
    }));
  },
};
```

### 3. Test it

Open the app in your dev store, go to the dashboard, and click "Run" next to your agent in the sidebar. Or trigger directly:

```bash
# The app handles auth automatically in the embedded context.
# Just click the Run button in the UI.
```

## The Agent Interface

Your agent must satisfy this contract:

```typescript
interface Agent {
  agentId: string;        // unique ID: "aeo", "content", etc.
  displayName: string;    // shown in UI: "AEO Specialist"
  description: string;    // one-line description
  run(shop: string, admin: AdminClient): Promise<AgentFindingInput[]>;
}
```

### `run()` Method Contract

- **Input:** `shop` (domain string) and `admin` (Shopify Admin API client)
- **Output:** Array of `AgentFindingInput` objects
- **Timeout:** 30 seconds max
- **Idempotent:** Safe to run multiple times (use `deduplicationKey`)
- **Errors:** Return `[]` for "nothing found". Only throw on unrecoverable errors.

### `AgentFindingInput` Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"done" \| "action_needed" \| "insight"` | Yes | Finding category |
| `priority` | `1-5` | Yes | 1=critical, 5=nice-to-have |
| `title` | `string` | Yes | Headline, max 80 chars |
| `description` | `string` | Yes | Explanation, max 300 chars |
| `action` | `string?` | No | Suggested action (JSON or text) |
| `metadata` | `Record<string, unknown>?` | No | Agent-specific data |
| `deduplicationKey` | `string?` | Recommended | Prevents duplicate findings |
| `externalId` | `string?` | No | External reference ID |

### Finding Types Explained

- **`"done"`** -- "Handled Overnight" section. Use when your agent fixed something automatically.
- **`"action_needed"`** -- "Needs Your Decision" section. Use when the merchant must approve/decide.
- **`"insight"`** -- "Insights" section. Informational finding, no action required.

## Using the Shopify Admin API

The `admin` object is pre-authenticated. Use `admin.graphql()`:

```typescript
const response = await admin.graphql(`
  query {
    products(first: 10) {
      edges {
        node {
          id
          title
          description
          vendor
          productType
          variants(first: 5) {
            edges {
              node {
                id
                price
                inventoryQuantity
              }
            }
          }
        }
      }
    }
  }
`);

const json = await response.json();
const products = json.data.products.edges.map((e: any) => e.node);
```

With variables:
```typescript
const response = await admin.graphql(
  `query getProduct($id: ID!) {
    product(id: $id) { title description }
  }`,
  { variables: { id: "gid://shopify/Product/123" } }
);
```

## Using Claude API (Optional)

If your agent uses Claude for analysis, add your logic in a separate file:

```typescript
// app/agents/my-agent/my-agent-analysis.server.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function analyzeWithClaude(data: unknown): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      { role: "user", content: `Analyze this store data: ${JSON.stringify(data)}` },
    ],
  });
  return message.content[0].type === "text" ? message.content[0].text : "";
}
```

**Note:** Add `@anthropic-ai/sdk` to dependencies if using Claude:
```bash
npm install @anthropic-ai/sdk
```

## File Organization

Create additional files in YOUR agent folder only:

```
app/agents/my-agent/
  my-agent.server.ts          # Main agent (implements Agent interface)
  my-agent-queries.server.ts  # GraphQL queries (optional)
  my-agent-analysis.server.ts # Claude/AI analysis (optional)
  my-agent-prompts.ts         # Prompt templates (optional)
```

**Do NOT edit files outside your folder** (except your one import in `agent-registry.server.ts` if needed).

## Rules

1. **Stay in your folder.** Only create/edit files in `app/agents/{your-agent}/`.
2. **Return 3+ findings** for the demo. Cover at least 2 finding types.
3. **Use `deduplicationKey`** on every finding to prevent duplicates on re-run.
4. **30-second timeout.** Keep API calls efficient. Batch queries.
5. **No PII/secrets in metadata.** Don't store access tokens or customer emails.
6. **Commit to your branch:** `feat/{your-agent}-agent` (e.g., `feat/aeo-agent`).

## Available Shopify Scopes

Current app scopes (from `shopify.app.toml`):
- `write_products` -- read/write products, variants, metafields
- Add `read_inventory`, `read_orders` if your agent needs them (tell the lead)

## Definition of Done

Your agent is complete when:
- [ ] `run()` returns 3+ real findings (not hardcoded stubs)
- [ ] Findings use all 3 types where appropriate (done, action_needed, insight)
- [ ] Each finding has a `deduplicationKey`
- [ ] Findings appear correctly in the Secretary Dashboard
- [ ] No TypeScript errors (`npm run typecheck`)
```

## Todo List

- [ ] Create `docs/agent-developer-guide.md`
- [ ] Review with team before kickoff
- [ ] Verify all code examples compile

## Success Criteria

- Any developer can read this guide and build an agent in < 3 hours
- No questions about "where do I put my code" or "what do I return"
- Guide covers GraphQL usage, Claude API (optional), and testing

## Next Steps

Distribute guide to team 30 minutes before hackathon kickoff.
