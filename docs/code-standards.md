# Code Standards - AI Store Secretary

## File Naming & Organization

### Naming Conventions

**TypeScript/React Files:**
- Use **kebab-case** for file names: `agent-executor.server.ts`, `plan-comparison-table.tsx`
- Descriptive names that indicate purpose: `agent-trust-control.tsx` (not `control.tsx`)
- Use `.server.ts` suffix for server-only code (never bundled to client)
- Use `.tsx` for React components, `.ts` for utilities

**Folder Structure:**
```
app/
├── agents/                          # Agent implementations
│   ├── aeo-agent/
│   │   └── aeo-agent.server.ts     # Single agent file pattern
│   ├── review-agent/
│   │   ├── review-agent.server.ts
│   │   └── review.seed.ts          # Test data
│   └── agent-registry.server.ts    # Central registry
│
├── components/                      # Reusable UI components
│   ├── finding-card.tsx
│   ├── agent-trust-control.tsx
│   └── plan-comparison-table.tsx
│
├── lib/                             # Utilities & config
│   ├── agent-interface.ts          # Locked agent contract
│   ├── ai.server.ts                # Claude API wrapper
│   └── plan-config.ts              # Billing tier limits
│
├── routes/                          # Route handlers
│   ├── app.tsx                     # Main layout
│   ├── app.agents._index.tsx
│   ├── app.api.*.tsx               # API route pattern
│   └── webhooks.app.*.tsx          # Webhook handlers
│
├── services/                        # Business logic
│   ├── billing.server.ts           # Core service
│   ├── billing-mutations.server.ts # GraphQL mutations
│   ├── agent-executor.server.ts
│   ├── finding-storage.server.ts
│   └── activity-log.server.ts
│
└── root.tsx, entry.server.tsx, ...  # App bootstrap
```

## Code Quality Standards

### TypeScript

**Strict Mode:** Enabled
- All functions should have explicit return types
- Avoid `any`; use `unknown` with type guards if necessary
- Use type inference for variable declarations only when obvious

**Example:**
```typescript
// ✅ GOOD: Explicit return type
export async function getShopPlan(shop: string): Promise<ShopPlan> {
  return prisma.shopPlan.findUnique({ where: { shop } });
}

// ❌ BAD: Missing return type
export async function getShopPlan(shop: string) {
  return prisma.shopPlan.findUnique({ where: { shop } });
}

// ✅ GOOD: Type inference for obvious cases
const runsUsed = await getRunsThisWeek(shop); // type: number
```

### Error Handling

**Always use try-catch for async operations:**

```typescript
// ✅ GOOD: Proper error handling
export async function runAgent(shop: string, agentId: string) {
  try {
    const canRun = await canRunAgents(shop);
    if (!canRun.allowed) {
      return { error: canRun.reason };
    }
    const findings = await executor.run(agent);
    await upsertFindings(shop, findings);
  } catch (error) {
    console.error(`Agent run failed: ${agentId}`, error);
    throw new Error(`Agent execution failed: ${(error as Error).message}`);
  }
}

// ❌ BAD: Unhandled promise rejection
export async function runAgent(shop: string, agentId: string) {
  const findings = await executor.run(agent); // What if this fails?
}
```

**Throw only on unrecoverable errors:**

```typescript
// ✅ GOOD: Plan limit errors are recoverable
if (!canRun.allowed) {
  return { allowed: false, reason: "Weekly limit reached" };
}

// ✅ GOOD: Unrecoverable error
if (!shop) {
  throw new Error("Shop ID is required");
}
```

### Agent Interface Contract

**LOCKED** — Do not modify `app/lib/agent-interface.ts`.

Every agent implementation must conform:

```typescript
export interface Agent {
  id: string;           // e.g., "review_agent"
  name: string;         // e.g., "Review Agent"
  description: string;
  run(context: AgentContext): Promise<AgentFindingInput[]>;
}

export interface AgentContext {
  shop: string;
  admin: AdminClient;
  db?: PrismaClient;
}

export interface AgentFindingInput {
  type: "done" | "action_needed" | "insight";
  priority: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  action?: string;
  deduplicationKey?: string;
}
```

**Requirements:**
- `run()` must complete within 30 seconds (timeout protection in executor)
- `run()` must be idempotent (safe to call multiple times)
- Return empty array `[]` if no findings
- Throw only on unrecoverable errors (not business logic)
- Always use `deduplicationKey` to prevent duplicates

### Polaris Web Components

**Mandatory rule:** ALWAYS use Polaris web components (`s-*` custom elements). Never use raw HTML or `@shopify/polaris` React components.

**Approved Components:**
- Layout: `s-page`, `s-section`, `s-stack`, `s-box`
- Text: `s-text`, `s-paragraph`
- Interactive: `s-button`, `s-link`, `s-badge`
- Forms: `s-text-field`, `s-choice-list`, `s-choice`
- Feedback: `s-banner`, `s-toast`

**Example:**
```typescript
// ✅ GOOD: Polaris web components
<s-page heading="Plan Comparison">
  <s-section>
    <s-stack direction="block" gap="base">
      <s-text>
        <strong>Select a plan to continue.</strong>
      </s-text>
      <s-button onClick={handleSelect}>
        Upgrade to Pro
      </s-button>
    </s-stack>
  </s-section>
</s-page>

// ❌ BAD: Raw HTML
<div className="page">
  <div className="heading">Plan Comparison</div>
  <div>
    <h2>Select a plan to continue.</h2>
    <button onClick={handleSelect}>Upgrade to Pro</button>
  </div>
</div>

// ❌ BAD: React Polaris (not web components)
import { Page, Section, Button } from "@shopify/polaris";
```

**Layout Patterns:**

```typescript
// Navigation link in page header
<s-page heading="Agents">
  <s-link slot="breadcrumb-actions" href="/app">
    Back to Dashboard
  </s-link>
</s-page>

// Primary action button in header
<s-page heading="Settings">
  <s-button slot="primary-action" onClick={handleSave}>
    Save Settings
  </s-button>
</s-page>

// Sidebar in responsive layout
<s-page heading="My Team">
  <s-section>Primary content</s-section>
  <s-section slot="aside">Sidebar content</s-section>
</s-page>
```

### React Router Patterns

**Data Loading (loaders):**

```typescript
// ✅ GOOD: Type-safe loader
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const plan = await getShopPlan(session.shop);
  return { plan, shop: session.shop };
};

export default function Page() {
  const { plan, shop } = useLoaderData<typeof loader>();
  // ...
}

// ❌ BAD: No types
export const loader = async ({ request }) => {
  // type any, no IDE support
};
```

**Form Handling with Fetcher:**

```typescript
// ✅ GOOD: Type-safe fetcher
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const _action = formData.get("_action");

  if (_action === "update-trust-level") {
    const agentId = formData.get("agentId") as string;
    const trustLevel = formData.get("trustLevel") as string;
    await updateAgentSetting(session.shop, agentId, { trustLevel });
    return { success: true };
  }

  return { error: "Unknown action" };
}

export default function Page() {
  const fetcher = useFetcher<typeof action>();

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="_action" value="update-trust-level" />
      <input type="hidden" name="agentId" value={agent.id} />
      <select name="trustLevel" onChange={(e) => fetcher.submit({...})}>
        <option>advisor</option>
        <option>assistant</option>
      </select>
    </fetcher.Form>
  );
}
```

**Navigation:**

```typescript
// ✅ GOOD: Use Link from react-router
import { Link } from "react-router";

<s-link href="/app/agents">View All Agents</s-link>

// ✅ GOOD: Redirect from action/loader
import { redirect } from "react-router";

return redirect("/app/upgrade?error=limit_reached");

// ❌ BAD: Raw <a> tag
<a href="/app/agents">View All Agents</a>

// ❌ BAD: window.location (breaks embedded app)
window.location.href = "/app/agents";
```

## Billing Service Patterns

### Plan Limit Checks

**Always call `canRunAgents()` before executing agents:**

```typescript
// ✅ GOOD: Check gate before running
export async function runAgentAction({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const gateResult = await canRunAgents(session.shop);
  if (!gateResult.allowed) {
    return { error: gateResult.reason };
  }

  const findings = await executor.run(agents);
  await incrementRunCount(session.shop);

  return { findings };
}

// ❌ BAD: No gate check
export async function runAgentAction({ request }: ActionFunctionArgs) {
  const findings = await executor.run(agents);
  return { findings };
}
```

### Trust Level Enforcement

**Check trust level allowance when UI updates:**

```typescript
// ✅ GOOD: Validate against plan
const plan = await getShopPlan(shop);
const limits = getPlanLimits(plan.tier as PlanTier);

if (!limits.allowedTrustLevels.includes(newTrustLevel)) {
  throw new PlanLimitError(
    `Trust level ${newTrustLevel} not available on ${plan.tier} plan`
  );
}

// ❌ BAD: No validation
await updateAgentSetting(shop, agentId, { trustLevel: "autopilot" });
// What if on Free tier?
```

### Adding New Plan Tiers

**Edit `app/lib/plan-config.ts`:**

```typescript
export type PlanTier = "free" | "starter" | "pro" | "agency" | "enterprise";

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  // ... existing tiers ...
  enterprise: {
    maxProducts: -1,
    maxAgents: 10,              // Custom agent count
    maxRunsPerWeek: -1,
    allowedTrustLevels: ["advisor", "assistant", "autopilot"],
    maxStores: -1,              // Unlimited
    price: 999,                 // Custom pricing
  },
};

export const TIER_ORDER: PlanTier[] = [
  "free",
  "starter",
  "pro",
  "agency",
  "enterprise",  // Add to order
];
```

## Agent Development

### Implementing a New Agent

**1. Create agent file:**

```typescript
// app/agents/my-agent/my-agent.server.ts
import { Agent, AgentContext, AgentFindingInput } from "../../lib/agent-interface";

export const myAgent: Agent = {
  id: "my_agent",
  name: "My Agent",
  description: "Monitors X and recommends Y",

  async run(context: AgentContext): Promise<AgentFindingInput[]> {
    const findings: AgentFindingInput[] = [];

    try {
      // Query store data
      const response = await context.admin.graphql(`
        query { products(first: 10) { edges { node { id title } } } }
      `);
      const data = await response.json();
      const products = data.data?.products?.edges ?? [];

      // Analyze with Claude
      const analysisPrompt = `Analyze these products and find issues: ${JSON.stringify(products)}`;
      const analysis = await askClaudeJSON<{ issues: Array<{ title: string; action: string }> }>(
        analysisPrompt
      );

      // Create findings
      for (const issue of analysis.issues) {
        findings.push({
          type: "action_needed",
          priority: 2,
          title: issue.title,
          action: issue.action,
          deduplicationKey: `issue_${issue.title}`, // Prevent duplicates
        });
      }
    } catch (error) {
      console.error("MyAgent error:", error);
      throw error; // Unrecoverable
    }

    return findings;
  },
};
```

**2. Register agent:**

```typescript
// app/agents/agent-registry.server.ts
import { myAgent } from "./my-agent/my-agent.server.ts";

export const agentList: Agent[] = [
  aeoAgent,
  contentAgent,
  inventoryAgent,
  reviewAgent,
  schemaAgent,
  storefront,
  myAgent,  // Add to registry
];
```

**3. Add UI label:**

```typescript
// app/components/finding-card.tsx or app/routes/app.agents._index.tsx
export const AGENT_LABELS: Record<string, { name: string; color: string }> = {
  // ... existing ...
  my_agent: { name: "My Agent", color: "info" },
};
```

## Testing Patterns

### Unit Tests

```typescript
// ✅ GOOD: Test error scenarios
describe("canRunAgents", () => {
  it("blocks frozen subscription", async () => {
    const plan = { tier: "pro", subscriptionStatus: "frozen" };
    prisma.shopPlan.findUnique.mockResolvedValue(plan);

    const result = await canRunAgents("shop123");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("inactive");
  });

  it("allows active subscription", async () => {
    const plan = { tier: "starter", subscriptionStatus: "active" };
    prisma.shopPlan.findUnique.mockResolvedValue(plan);

    const result = await canRunAgents("shop123");
    expect(result.allowed).toBe(true);
  });
});
```

### Integration Tests

Test actual agent flows with mocked external services:

```typescript
// ✅ GOOD: Integration test
describe("Agent execution flow", () => {
  it("executes agents and stores findings", async () => {
    const shop = "test-shop.myshopify.com";
    const admin = mockAdminClient();

    // Ensure plan allows run
    await updateShopPlan(shop, { tier: "starter" });

    // Execute agents
    const findings = await executor.execute([reviewAgent], { shop, admin });

    // Verify findings stored
    expect(findings.length).toBeGreaterThan(0);
    const stored = await prisma.agentFinding.findMany({ where: { shop } });
    expect(stored.length).toBeGreaterThan(0);
  });
});
```

## Security Best Practices

### Data Isolation

**Always filter by shop:**

```typescript
// ✅ GOOD: Shop-scoped query
const findings = await prisma.agentFinding.findMany({
  where: { shop: session.shop },  // Critical
});

// ❌ BAD: No shop filter (data leak)
const findings = await prisma.agentFinding.findMany();
```

### API Key Protection

**Never commit `.env` file:**

```bash
# ✅ In .gitignore
.env

# ✅ Use .env.example for template
ANTHROPIC_API_KEY=sk-...
DATABASE_URL=mongodb+srv://...
```

**Always read from environment:**

```typescript
// ✅ GOOD
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

// ❌ BAD: Hardcoded
const apiKey = "sk-123abc...";
```

### Subscription Status Verification

**Always verify subscription before granting features:**

```typescript
// ✅ GOOD: Check status
if (
  plan.subscriptionStatus === "frozen" ||
  plan.subscriptionStatus === "cancelled"
) {
  throw new PlanLimitError("Subscription inactive");
}

// ❌ BAD: Assume active
const findings = await executor.run(agents);
```

## Performance Guidelines

### Database Indexing

**Critical indexes defined in Prisma schema:**

```prisma
model AgentFinding {
  @@index([shop, agentId])              // Common filter
  @@index([shop, type, status])         // Grouping
  @@index([createdAt])                  // Time-based queries
  @@unique([shop, agentId, deduplicationKey])  // Dedup
}

model ActivityLog {
  @@index([shop, createdAt])            // Dashboard queries
  @@index([shop, agentId])              // Agent-scoped audits
}
```

### Caching Strategy

**ProductCount cached 24 hours:**

```typescript
// ✅ GOOD: TTL-based cache
const PRODUCT_COUNT_TTL_MS = 24 * 60 * 60 * 1000;

const cached = await prisma.productCount.findUnique({ where: { shop } });
if (cached && Date.now() - cached.syncedAt.getTime() < PRODUCT_COUNT_TTL_MS) {
  return cached.count;
}

// Refresh if stale or missing
return await syncProductCount(shop, admin);
```

### Agent Parallelization

**Run agents in parallel, not sequentially:**

```typescript
// ✅ GOOD: Parallel execution
const results = await Promise.all(
  agents.map(agent =>
    executeWithTimeout(agent.run(context), 30_000)
      .catch(error => {
        console.error(`${agent.id} failed:`, error);
        return []; // Graceful failure
      })
  )
);

// ❌ BAD: Sequential (slow)
const results = [];
for (const agent of agents) {
  results.push(await agent.run(context));
}
```

## Commit Message Standards

Use conventional commit format:

```
feat: add Agency multi-store management with usage-based billing
fix: correct product limit gate check for starter tier
docs: update billing system architecture
refactor: extract billing logic into separate service
test: add plan enforcement integration tests
chore: update dependencies
```

## Comments & Documentation

**Comment complex logic, not obvious code:**

```typescript
// ✅ GOOD: Explains why
// RT-5: only block trial expiry if NOT actively paying.
// Free tier never expires. Paying tiers need active subscription.
if (
  plan.trialEndsAt &&
  new Date() > plan.trialEndsAt &&
  plan.tier !== "free" &&
  plan.subscriptionStatus !== "active"
) {
  return { allowed: false, reason: "Trial expired" };
}

// ❌ BAD: Restates code
// Check if trial ended
if (plan.trialEndsAt && new Date() > plan.trialEndsAt) {
  // ...
}
```

## File Size Limits

- **Max 200 lines per file** (target)
- Prefer composition over monolithic files
- Split components into separate files once they exceed 150 lines
- Utility functions belong in `lib/` or service-specific modules

**Example refactoring:**
```
❌ app/components/plan-settings.tsx (350 lines)

✅ app/components/plan-settings/index.tsx (50 lines, composition)
✅ app/components/plan-settings/tier-selector.tsx (100 lines)
✅ app/components/plan-settings/limit-summary.tsx (80 lines)
```
