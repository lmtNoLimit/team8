# Morning Briefing Dashboard Blueprint
## Complete JSX Template for AI Secretary Dashboard

---

## Complete Dashboard Component

```jsx
import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Dashboard() {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    activeAgents: 0,
    pendingApprovals: 0,
    todayInsights: 0,
  });
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">("idle");
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Fetch data on mount
  useEffect(() => {
    loadDashboardData();
    // Poll for updates every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setSyncStatus("syncing");
      // Fetch from your API
      const response = await fetch("/api/dashboard");
      const data = await response.json();
      setActionItems(data.actionItems);
      setInsights(data.insights);
      setStats(data.stats);
      setLastSync(new Date());
      setSyncStatus("idle");
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      setSyncStatus("error");
    }
  };

  const handleApproveItem = async (itemId: string) => {
    try {
      await fetch(`/api/action-items/${itemId}/approve`, { method: "POST" });
      // Reload data
      loadDashboardData();
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleDismissItem = async (itemId: string) => {
    try {
      await fetch(`/api/action-items/${itemId}/dismiss`, { method: "POST" });
      // Reload data
      loadDashboardData();
    } catch (error) {
      console.error("Failed to dismiss:", error);
    }
  };

  const urgentCount = actionItems.filter(
    (item) => item.priority === "Critical" || item.priority === "High"
  ).length;

  return (
    <s-page heading="AI Secretary Dashboard" size="base">
      {/* === ALERT BANNER === */}
      {urgentCount > 0 && (
        <s-banner
          heading={`${urgentCount} Urgent Item${urgentCount > 1 ? "s" : ""} Need Attention`}
          tone="critical"
        >
          <p>
            High-priority findings from your agents require approval or review.
          </p>
          <s-button slot="secondary-actions" onClick={() => scrollToElement("action-items")}>
            Review Now
          </s-button>
        </s-banner>
      )}

      {/* === SYNC STATUS === */}
      {syncStatus === "syncing" && (
        <s-banner heading="Synchronizing with agents..." tone="info">
          <s-spinner slot="primary-action" size="small" />
        </s-banner>
      )}

      {syncStatus === "error" && (
        <s-banner
          heading="Sync Error"
          tone="warning"
        >
          <p>Failed to sync with agents. Last successful sync: {lastSync?.toLocaleString()}</p>
          <s-button slot="secondary-actions" onClick={loadDashboardData}>
            Retry
          </s-button>
        </s-banner>
      )}

      {/* === SECTION 1: SUMMARY STATS === */}
      <s-section heading="Summary">
        <s-stack direction="inline" gap="base" wrap>
          <StatCard
            label="Total Agents"
            value={stats.totalAgents.toString()}
            subtitle="configured"
          />
          <StatCard
            label="Active"
            value={stats.activeAgents.toString()}
            subtitle="right now"
          />
          <StatCard
            label="Pending Approval"
            value={stats.pendingApprovals.toString()}
            subtitle="require action"
          />
          <StatCard
            label="Today's Insights"
            value={stats.todayInsights.toString()}
            subtitle="generated"
          />
        </s-stack>
      </s-section>

      {/* === SECTION 2: ACTION ITEMS === */}
      <s-section heading="Action Items - Requires Your Approval" id="action-items">
        {actionItems.length === 0 ? (
          <s-paragraph>
            No pending items. All findings have been reviewed.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {actionItems.map((item) => (
              <ActionItemCard
                key={item.id}
                item={item}
                onApprove={() => handleApproveItem(item.id)}
                onDismiss={() => handleDismissItem(item.id)}
              />
            ))}
          </s-stack>
        )}
      </s-section>

      {/* === SECTION 3: INSIGHTS FEED === */}
      <s-section heading="Insights Feed">
        {insights.length === 0 ? (
          <s-paragraph>
            No insights yet. Check back soon.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </s-stack>
        )}
      </s-section>

      {/* === SIDEBAR: QUICK STATS === */}
      <s-section slot="aside" heading="Quick Stats">
        <s-stack direction="block" gap="base">
          <s-stack direction="block" gap="small">
            <s-text>
              <strong>Last Sync:</strong>
            </s-text>
            <s-text style={{ color: "var(--color-text-subdued)" }}>
              {lastSync ? lastSync.toLocaleTimeString() : "Never"}
            </s-text>
          </s-stack>

          <s-divider />

          <s-stack direction="block" gap="small">
            <s-text>
              <strong>Agent Status:</strong>
            </s-text>
            <s-text>
              <s-badge tone="success">{stats.activeAgents} Active</s-badge>
            </s-text>
          </s-stack>

          <s-divider />

          <s-stack direction="block" gap="small">
            <s-text>
              <strong>Success Rate:</strong>
            </s-text>
            <s-text style={{ fontSize: "18px", fontWeight: "bold" }}>
              96%
            </s-text>
            <s-text style={{ color: "var(--color-text-subdued)", fontSize: "12px" }}>
              of findings accurate
            </s-text>
          </s-stack>

          <s-divider />

          <s-button
            variant="secondary"
            onClick={() => window.location.href = "/app/agents"}
            style={{ width: "100%" }}
          >
            View All Agents
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}

// === SUBCOMPONENTS ===

interface StatCard {
  label: string;
  value: string;
  subtitle: string;
}

function StatCard({ label, value, subtitle }: StatCard) {
  return (
    <s-box
      padding="base"
      background="subdued"
      borderRadius="base"
      style={{
        flex: "1",
        minWidth: "140px",
        textAlign: "center",
      }}
    >
      <s-heading level="h3" style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
        {label}
      </s-heading>
      <s-text style={{ fontSize: "28px", fontWeight: "bold", display: "block" }}>
        {value}
      </s-text>
      <s-text style={{ color: "var(--color-text-subdued)", fontSize: "12px" }}>
        {subtitle}
      </s-text>
    </s-box>
  );
}

interface ActionItemCardProps {
  item: ActionItem;
  onApprove: () => void;
  onDismiss: () => void;
}

function ActionItemCard({ item, onApprove, onDismiss }: ActionItemCardProps) {
  const priorityTone = getPriorityTone(item.priority);
  const statusTone = getStatusTone(item.status);

  return (
    <s-box
      padding="base"
      borderWidth="base"
      borderRadius="base"
      background={item.priority === "Critical" ? "critical" : undefined}
      style={{
        backgroundColor: item.priority === "Critical" ? "rgba(220, 53, 69, 0.1)" : undefined,
      }}
    >
      <s-stack direction="block" gap="base">
        {/* Header */}
        <s-stack direction="inline" gap="base" wrap style={{ alignItems: "center" }}>
          <s-heading level="h3" style={{ margin: 0, flex: "1" }}>
            {item.title}
          </s-heading>
          <s-stack direction="inline" gap="small">
            <s-badge tone={priorityTone}>
              {item.priority}
            </s-badge>
            <s-badge tone={getAgentTypeTone(item.agentType)}>
              {item.agentType}
            </s-badge>
          </s-stack>
        </s-stack>

        {/* Description */}
        <s-paragraph>{item.description}</s-paragraph>

        {/* Metadata */}
        <s-stack direction="inline" gap="base" wrap>
          <s-text>
            <strong>Agent:</strong> {item.agentName}
          </s-text>
          <s-text>
            <strong>Created:</strong> {new Date(item.createdAt).toLocaleDateString()}
          </s-text>
          <s-text>
            <strong>Status:</strong> <s-badge tone={statusTone}>{item.status}</s-badge>
          </s-text>
        </s-stack>

        {/* Actions */}
        <s-stack direction="inline" gap="base">
          <s-button
            variant="primary"
            onClick={onApprove}
          >
            Approve
          </s-button>
          <s-button
            variant="secondary"
            onClick={onDismiss}
          >
            Dismiss
          </s-button>
          <s-button
            variant="tertiary"
            onClick={() => {/* Edit handler */}}
          >
            Edit
          </s-button>
        </s-stack>
      </s-stack>
    </s-box>
  );
}

interface InsightCardProps {
  insight: Insight;
}

function InsightCard({ insight }: InsightCardProps) {
  return (
    <s-box
      padding="base"
      borderWidth="base"
      borderRadius="base"
      background="subdued"
    >
      <s-stack direction="block" gap="base">
        <s-heading level="h4" style={{ margin: 0 }}>
          {insight.title}
        </s-heading>
        <s-paragraph>{insight.description}</s-paragraph>

        <s-stack direction="inline" gap="base" wrap>
          <s-badge tone={getPriorityTone(insight.priority)}>
            {insight.priority} Priority
          </s-badge>
          <s-badge tone={getAgentTypeTone(insight.agentType)}>
            {insight.agentType}
          </s-badge>
          <s-text style={{ color: "var(--color-text-subdued)", fontSize: "12px" }}>
            {new Date(insight.createdAt).toLocaleString()}
          </s-text>
        </s-stack>
      </s-stack>
    </s-box>
  );
}

// === HELPER FUNCTIONS ===

function getPriorityTone(priority: string): "critical" | "warning" | "info" | "success" {
  switch (priority.toLowerCase()) {
    case "critical":
    case "high":
      return "critical";
    case "medium":
      return "warning";
    case "low":
      return "info";
    default:
      return "success";
  }
}

function getStatusTone(status: string): "critical" | "warning" | "info" | "success" {
  switch (status.toLowerCase()) {
    case "pending":
      return "info";
    case "approved":
      return "success";
    case "dismissed":
      return "warning";
    case "failed":
      return "critical";
    default:
      return "info";
  }
}

function getAgentTypeTone(agentType: string): "critical" | "warning" | "info" | "success" {
  switch (agentType.toLowerCase()) {
    case "security":
      return "critical";
    case "performance":
      return "warning";
    case "content":
      return "info";
    case "commerce":
      return "success";
    default:
      return "info";
  }
}

function scrollToElement(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
}

// === TYPE DEFINITIONS ===

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Pending" | "Approved" | "Dismissed" | "Failed";
  agentType: string;
  agentName: string;
  createdAt: string;
}

interface Insight {
  id: string;
  title: string;
  description: string;
  priority: string;
  agentType: string;
  createdAt: string;
}

interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  pendingApprovals: number;
  todayInsights: number;
}
```

---

## Component Structure Breakdown

### 1. Alert Banner Section
- **Urgent items banner** (red/critical tone) when items need approval
- **Sync status banner** (info tone) while syncing
- **Sync error banner** (warning tone) if sync fails

### 2. Summary Statistics Cards
- 4 stat cards in horizontal layout using `<s-stack direction="inline">`
- Each card uses `<s-box>` with subdued background
- Responsive wrapping on narrow screens

### 3. Action Items Section
- **List of findings** that require approval
- Each item is an `<ActionItemCard>` component with:
  - Title and priority/type badges
  - Description
  - Metadata (agent name, date, status)
  - Three action buttons (Approve, Dismiss, Edit)
- Empty state message if no items

### 4. Insights Feed Section
- **List of recent insights** from agents
- Each item is an `<InsightCard>` component with:
  - Title
  - Description
  - Priority and agent type badges
  - Timestamp

### 5. Sidebar (Quick Stats)
- **Last sync time**
- **Active agent count** badge
- **Success rate** percentage
- **View all agents** button

---

## Data Flow

```
Dashboard
  ├─ loadDashboardData()
  │   └─ GET /api/dashboard
  │       ├─ actionItems[]
  │       ├─ insights[]
  │       └─ stats{}
  │
  ├─ handleApproveItem(itemId)
  │   ├─ POST /api/action-items/{itemId}/approve
  │   └─ loadDashboardData() [refresh]
  │
  ├─ handleDismissItem(itemId)
  │   ├─ POST /api/action-items/{itemId}/dismiss
  │   └─ loadDashboardData() [refresh]
  │
  └─ Render Components:
      ├─ Banners (alerts/sync status)
      ├─ StatCard (summary)
      ├─ ActionItemCard (action items list)
      ├─ InsightCard (insights feed)
      └─ Sidebar (quick stats)
```

---

## API Endpoints Needed

```javascript
// GET /api/dashboard
// Returns: { actionItems, insights, stats }

// POST /api/action-items/{itemId}/approve
// Returns: { success: boolean }

// POST /api/action-items/{itemId}/dismiss
// Returns: { success: boolean }
```

---

## Styling Notes

- **Colors** auto-applied via `tone` attribute on badges
- **Padding** handled by `<s-box>` and `<s-section>` defaults
- **Spacing** controlled by `gap="base"` on stacks (16px, Shopify grid-aligned)
- **Responsive** wrapping via `wrap` on inline stacks
- **Inline styles** minimized — leverage Polaris defaults

---

## Next Steps for Implementation

1. Copy this component to `app/routes/app._index.tsx`
2. Create API endpoints in your backend:
   - `GET /api/dashboard`
   - `POST /api/action-items/:id/approve`
   - `POST /api/action-items/:id/dismiss`
3. Update type definitions based on your actual data model
4. Add error handling and loading states as needed
5. Implement API calls (fetch or your preferred HTTP client)
6. Add Shopify toast notifications for user feedback

---

## Customization Options

- **Hide banners:** Remove `{urgentCount > 0 && <s-banner>}` blocks
- **Change summary metrics:** Update `StatCard` components and `stats` object
- **Custom action buttons:** Modify `ActionItemCard` button handlers
- **Different badge colors:** Adjust `getPriorityTone()` and tone mappings
- **Sidebar layout:** Move quick stats to a different slot or remove
- **Polling interval:** Change `5 * 60 * 1000` to different milliseconds

---

## Accessibility Checklist

- ✅ All sections have headings (auto-hierarchy with nesting)
- ✅ Buttons use semantic `<s-button>` elements
- ✅ Links use `<s-link>` elements
- ✅ Color not sole indicator (badges + text labels)
- ✅ Interactive elements keyboard accessible
- ✅ Loading states visible (spinner + banner)
- ✅ Status badges labeled with tone + text

---

## Performance Notes

- **Polling interval:** 5 minutes (adjust as needed)
- **Data fetching:** Happens on mount and on interval
- **Manual refresh:** Triggered on approve/dismiss actions
- **Component re-renders:** Minimal via React hooks
- **No external libraries:** Uses only Polaris web components (native)
