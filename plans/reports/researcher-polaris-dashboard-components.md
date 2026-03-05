# Shopify Polaris Web Components Research Report
## Dashboard UI Building Guide for AI Secretary App

**Date:** 2026-03-05
**Focus:** Polaris web components (not React Polaris) for embedded Shopify admin dashboard
**Scope:** Components available, dashboard patterns, data display, status indicators

---

## Executive Summary

Shopify Polaris web components provide a complete set of custom HTML elements (`<s-*>`) for building consistent admin interfaces. The app uses **web components (native HTML elements), not React components**, allowing JSX-style syntax that compiles to actual `<s-page>`, `<s-button>`, etc. elements. This research identifies available components, layout patterns for "morning briefing" style UIs, data display options, and status/feedback mechanisms.

**Key Finding:** Polaris web components are optimized for admin-facing dashboards with built-in styling, accessibility, and spacing aligned to Shopify's 4px grid.

---

## 1. Available Polaris Web Components by Category

### 1.1 Layout & Structure Components

| Component | Element | Purpose | Key Attributes |
|-----------|---------|---------|-----------------|
| **Page** | `<s-page>` | Primary app container with global padding/background | `heading`, `size` ("base" or "large"), `variant`, `slot="primary-action"` for top-right button |
| **Section** | `<s-section>` | Groups related content with visual hierarchy; auto-nesting styling | `heading`, `padding` ("base" or "none"), `accessibilityLabel`, `slot="aside"` for sidebars |
| **Stack** | `<s-stack>` | Arranges elements horizontally/vertically | `direction` ("inline" or "block"), `gap` ("base" for spacing), `wrap` (boolean) |
| **Box** | `<s-box>` | Flexible generic container | `padding`, `background`, `borderWidth`, `borderRadius` |
| **Grid** | `<s-grid>` | CSS Grid layout | Requires proper `templateRows`/`templateColumns` configuration |
| **Divider** | `<s-divider>` | Visual separator between content | — |
| **QueryContainer** | `<s-query-container>` | Enables responsive design via container queries | `containername` attribute |

**Dashboard Layout Pattern:**
```
<s-page heading="AI Secretary Dashboard">
  <!-- Primary content -->
  <s-section heading="Morning Briefing">
    <s-stack direction="block" gap="base">
      <!-- Content here -->
    </s-stack>
  </s-section>

  <!-- Sidebar via aside slot -->
  <s-section slot="aside" heading="Quick Stats">
    <!-- Sidebar content -->
  </s-section>
</s-page>
```

**Spacing Notes:**
- `s-page` adds global padding (context-aware based on size)
- `s-section` includes automatic padding and white space between children
- Use `s-stack` with `gap="base"` for consistent 4px grid-aligned spacing
- `s-box` allows custom padding values for non-standard layouts

---

### 1.2 Data Display Components

| Component | Element | Purpose | Use Case |
|-----------|---------|---------|----------|
| **Data Table** | `<s-data-table>` | Display structured data in rows/columns | Agent findings, action items lists, insights |
| **Ordered List** | `<s-ordered-list>` | Numbered list | Priority-ordered items |
| **Unordered List** | `<s-unordered-list>` | Bulleted list | Non-sequential items, recommendations |
| **Table** | `<s-table>` | Semantic table element | Alternative to data-table for custom layouts |
| **Badge** | `<s-badge>` | Status indicator tag | Priority levels (High/Medium/Low), agent type, completion status |
| **Avatar** | `<s-avatar>` | User profile image/initials | Agent identity, user assignment |
| **Thumbnail** | `<s-thumbnail>` | Small image preview | Content previews |

**Data Table Example:**
```jsx
<s-data-table
  items={agentFindings}
  headings={["Agent", "Finding", "Priority", "Status"]}
  columnContentTypes={["text", "text", "text", "text"]}
/>
```

**Badge Usage for Status:**
```jsx
<s-badge tone="critical">High Priority</s-badge>
<s-badge tone="warning">In Progress</s-badge>
<s-badge tone="success">Approved</s-badge>
<s-badge tone="info">Pending</s-badge>
```

---

### 1.3 Feedback & Status Components

| Component | Element | Purpose | Attributes |
|-----------|---------|---------|-----------|
| **Banner** | `<s-banner>` | Highlights critical info/required actions | `heading`, `tone` ("critical", "warning", "success", "info"), `status` (boolean), `slot="secondary-actions"` |
| **Spinner** | `<s-spinner>` | Loading indicator | `size` ("small", "base", "large") |
| **Tooltip** | `<s-tooltip>` | Contextual help on hover | `content`, position attributes |

**Banner Examples:**
```jsx
// Alert/notification
<s-banner heading="Urgent Items" tone="critical">
  <p>3 high-priority findings require approval</p>
  <s-button slot="secondary-actions">Review Now</s-button>
</s-banner>

// Success feedback
<s-banner heading="Findings Published" tone="success" status />

// Action required
<s-banner heading="Review Needed" tone="warning">
  Agent X flagged security issue
</s-banner>
```

**Spinner (async operations):**
```jsx
{isLoading && <s-spinner size="base" />}
```

---

### 1.4 Action Components

| Component | Element | Purpose | Key Attributes |
|-----------|---------|---------|-----------------|
| **Button** | `<s-button>` | Trigger actions | `variant` ("primary", "secondary", "tertiary"), `tone`, `onClick`, `href`, `loading`, `disabled` |
| **Link** | `<s-link>` | Navigation | `href`, `target="_blank"` |
| **ClickableChip** | `<s-clickablechip>` | Categorize/filter content | Interactive tag button |
| **ButtonGroup** | `<s-buttongroup>` | Multiple related buttons | Groups related actions |
| **Menu** | `<s-menu>` | Dropdown actions | Context-specific options |

**Approve/Dismiss Buttons:**
```jsx
<s-stack direction="inline" gap="base">
  <s-button variant="primary" onClick={handleApprove}>
    Approve
  </s-button>
  <s-button variant="secondary" onClick={handleDismiss}>
    Dismiss
  </s-button>
</s-stack>
```

---

### 1.5 Typography Components

| Component | Element | Usage |
|-----------|---------|-------|
| **Heading** | `<s-heading>` | Section titles (auto h2/h3 based on nesting) |
| **Paragraph** | `<s-paragraph>` | Text blocks |
| **Text** | `<s-text>` | Inline text |
| **Chip** | `<s-chip>` | Keyword/tag display |

---

### 1.6 Form Components (for configuration/settings)

Key inputs for dashboard filters or settings:
- `<s-text-field>` — Text input
- `<s-search-field>` — Search input
- `<s-select>` / `<s-option>` — Dropdown
- `<s-checkbox>` — Checkboxes
- `<s-choice-list>` / `<s-choice>` — Multi-select
- `<s-switch>` — Toggle
- `<s-date-picker>` — Date selection

---

### 1.7 Overlay Components (advanced)

- `<s-modal>` — Dialog overlays
- `<s-popover>` — Context-triggered panels

---

## 2. Dashboard Layout Patterns

### 2.1 "Morning Briefing" Dashboard Structure

Recommended 3-section layout:

```jsx
<s-page heading="AI Secretary Dashboard" size="base">
  {/* Alert banner if needed */}
  {urgentItems > 0 && (
    <s-banner heading={`${urgentItems} Urgent Items`} tone="critical">
      <s-button slot="secondary-actions" onClick={scrollToActionItems}>
        Review
      </s-button>
    </s-banner>
  )}

  {/* Section 1: Summary Stats */}
  <s-section heading="Summary">
    <s-stack direction="inline" gap="base">
      <s-box padding="base" background="subdued" borderRadius="base">
        <s-heading>Total Agents</s-heading>
        <s-text>{totalAgents}</s-text>
      </s-box>
      <s-box padding="base" background="subdued" borderRadius="base">
        <s-heading>Pending Approvals</s-heading>
        <s-text>{pendingApprovals}</s-text>
      </s-box>
      <s-box padding="base" background="subdued" borderRadius="base">
        <s-heading>Today's Insights</s-heading>
        <s-text>{insightsCount}</s-text>
      </s-box>
    </s-stack>
  </s-section>

  {/* Section 2: Action Items (with data table) */}
  <s-section heading="Action Items - Requires Your Approval">
    <s-data-table
      items={actionItems}
      headings={["Agent", "Finding", "Priority", "Actions"]}
    />
  </s-section>

  {/* Section 3: Insights Feed */}
  <s-section heading="Insights Feed">
    <s-stack direction="block" gap="base">
      {insights.map(insight => (
        <s-box key={insight.id} padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-heading>{insight.title}</s-heading>
            <s-paragraph>{insight.description}</s-paragraph>
            <s-stack direction="inline" gap="base">
              <s-badge tone={getPriorityTone(insight.priority)}>
                {insight.priority}
              </s-badge>
              <s-badge tone={getAgentTypeTone(insight.agentType)}>
                {insight.agentType}
              </s-badge>
            </s-stack>
          </s-stack>
        </s-box>
      ))}
    </s-stack>
  </s-section>

  {/* Sidebar: Quick stats */}
  <s-section slot="aside" heading="Quick Stats">
    <s-stack direction="block" gap="base">
      <s-text><strong>Active Agents:</strong> {activeAgents}</s-text>
      <s-text><strong>Last Sync:</strong> {lastSyncTime}</s-text>
      <s-text><strong>Success Rate:</strong> {successRate}%</s-text>
    </s-stack>
  </s-section>
</s-page>
```

### 2.2 Two-Column Layout (Editor Pattern)

For content-dense pages with real-time preview:

```jsx
<s-page>
  <s-section heading="Findings Editor">
    <s-stack direction="inline" gap="base">
      {/* Left column: Form */}
      <s-box style={{ flex: "1" }}>
        {/* Form fields */}
      </s-box>
      {/* Right column: Preview */}
      <s-box style={{ flex: "1", borderLeft: "1px solid var(--color-border)" }}>
        <s-heading>Preview</s-heading>
        {/* Preview content */}
      </s-box>
    </s-stack>
  </s-section>
</s-page>
```

### 2.3 Summary Stats with Cards

```jsx
<s-stack direction="inline" gap="base" wrap>
  {stats.map(stat => (
    <s-box
      key={stat.id}
      padding="base"
      background="subdued"
      borderRadius="base"
      style={{ minWidth: "150px", textAlign: "center" }}
    >
      <s-heading level="h3">{stat.label}</s-heading>
      <s-text style={{ fontSize: "24px", fontWeight: "bold" }}>
        {stat.value}
      </s-text>
      <s-text style={{ color: "var(--color-text-subdued)" }}>
        {stat.subtitle}
      </s-text>
    </s-box>
  ))}
</s-stack>
```

---

## 3. Data Display: Agent Findings & Lists

### 3.1 Data Table for Findings List

```jsx
<s-data-table
  items={agentFindings.map(finding => ({
    id: finding.id,
    agent: finding.agentName,
    finding: finding.title,
    priority: finding.priority,
    status: finding.status,
    createdAt: new Date(finding.createdAt).toLocaleDateString(),
    actions: finding.id, // Use ID to identify row for actions
  }))}
  headings={["Agent", "Finding", "Priority", "Status", "Created", "Actions"]}
  columnContentTypes={["text", "text", "text", "text", "text", "text"]}
/>
```

### 3.2 Insights Feed as List

Alternative using `s-unordered-list`:

```jsx
<s-unordered-list>
  {insights.map(insight => (
    <s-list-item key={insight.id}>
      <s-stack direction="block" gap="small">
        <s-heading level="h4">{insight.title}</s-heading>
        <s-paragraph>{insight.description}</s-paragraph>
        <s-stack direction="inline" gap="small">
          <s-badge tone={getPriorityTone(insight.priority)}>
            {insight.priority}
          </s-badge>
          <s-text>by {insight.agentName}</s-text>
        </s-stack>
      </s-stack>
    </s-list-item>
  ))}
</s-unordered-list>
```

### 3.3 Custom Card Layout for Complex Findings

```jsx
{findings.map(finding => (
  <s-section
    key={finding.id}
    heading={finding.title}
    padding="base"
    accessibilityLabel={`Finding: ${finding.title}`}
  >
    <s-stack direction="block" gap="base">
      <s-paragraph>{finding.description}</s-paragraph>

      <s-stack direction="inline" gap="base" wrap>
        <s-badge tone={getPriorityTone(finding.priority)}>
          Priority: {finding.priority}
        </s-badge>
        <s-badge tone="info">
          Agent: {finding.agentType}
        </s-badge>
        <s-badge tone={getStatusTone(finding.status)}>
          {finding.status}
        </s-badge>
      </s-stack>

      <s-paragraph>
        <s-text style={{ color: "var(--color-text-subdued)" }}>
          Generated {new Date(finding.createdAt).toLocaleString()}
        </s-text>
      </s-paragraph>

      <s-stack direction="inline" gap="base">
        <s-button
          variant="primary"
          onClick={() => handleApprove(finding.id)}
        >
          Approve
        </s-button>
        <s-button
          variant="secondary"
          onClick={() => handleDismiss(finding.id)}
        >
          Dismiss
        </s-button>
        <s-button
          variant="tertiary"
          onClick={() => handleEdit(finding.id)}
        >
          Edit
        </s-button>
      </s-stack>
    </s-stack>
  </s-section>
))}
```

---

## 4. Status Indicators: Badges & Priority Levels

### 4.1 Priority Badge System

```jsx
// Priority levels
const priorityTones = {
  "Critical": "critical",     // Red
  "High": "warning",          // Orange
  "Medium": "info",           // Blue
  "Low": "success",           // Green
};

<s-badge tone={priorityTones[finding.priority]}>
  {finding.priority} Priority
</s-badge>
```

### 4.2 Agent Type Badges

```jsx
const agentTypeTones = {
  "Security": "critical",
  "Performance": "warning",
  "Content": "info",
  "Commerce": "success",
};

<s-badge tone={agentTypeTones[agentType]}>
  {agentType} Agent
</s-badge>
```

### 4.3 Status Badges

```jsx
const statusTones = {
  "Pending": "info",
  "In Progress": "warning",
  "Approved": "success",
  "Dismissed": "subdued",
  "Failed": "critical",
};

<s-badge tone={statusTones[status]}>
  {status}
</s-badge>
```

---

## 5. Alerts & Notifications: Banners

### 5.1 Urgent Items Alert

```jsx
{urgentCount > 0 && (
  <s-banner
    heading={`${urgentCount} Urgent Item${urgentCount > 1 ? 's' : ''} Require Attention`}
    tone="critical"
  >
    <p>Multiple high-priority findings await approval.</p>
    <s-button
      slot="secondary-actions"
      onClick={() => scrollToSection('action-items')}
    >
      Review Now
    </s-button>
  </s-banner>
)}
```

### 5.2 Sync Status Banner

```jsx
{syncStatus === "syncing" && (
  <s-banner heading="Synchronizing agents..." tone="info">
    <s-spinner slot="primary-action" size="small" />
  </s-banner>
)}

{syncStatus === "error" && (
  <s-banner
    heading="Sync failed"
    tone="warning"
  >
    <p>Last successful sync: {lastSync}</p>
    <s-button
      slot="secondary-actions"
      onClick={retrySyncx}
    >
      Retry
    </s-button>
  </s-banner>
)}
```

### 5.3 Success Feedback

```jsx
{showSuccessMessage && (
  <s-banner
    heading="Finding approved"
    tone="success"
    status
  />
)}
```

---

## 6. Navigation & Tab Patterns

### 6.1 Primary Navigation (App-level)

Use `<s-app-nav>` in layout (already in `app.tsx`):
```jsx
<s-app-nav>
  <s-link href="/app">Dashboard</s-link>
  <s-link href="/app/agents">Agents</s-link>
  <s-link href="/app/settings">Settings</s-link>
</s-app-nav>
```

### 6.2 Tab Navigation (Page-level Content Switching)

**Note:** Polaris web components don't have a native `<s-tabs>` yet. Use button groups or custom tab UI:

**Option A: Button Group Pattern**
```jsx
<s-stack direction="inline" gap="base">
  <s-button
    variant={activeTab === 'pending' ? 'primary' : 'secondary'}
    onClick={() => setActiveTab('pending')}
  >
    Pending ({pendingCount})
  </s-button>
  <s-button
    variant={activeTab === 'approved' ? 'primary' : 'secondary'}
    onClick={() => setActiveTab('approved')}
  >
    Approved ({approvedCount})
  </s-button>
  <s-button
    variant={activeTab === 'dismissed' ? 'primary' : 'secondary'}
    onClick={() => setActiveTab('dismissed')}
  >
    Dismissed ({dismissedCount})
  </s-button>
</s-stack>

{/* Content switches based on activeTab */}
{activeTab === 'pending' && <PendingList />}
{activeTab === 'approved' && <ApprovedList />}
{activeTab === 'dismissed' && <DismissedList />}
```

**Option B: ClickableChip Filter Pattern**
```jsx
<s-stack direction="inline" gap="base">
  {['All', 'Pending', 'Approved', 'Dismissed'].map(filter => (
    <s-clickablechip
      key={filter}
      selected={activeFilter === filter}
      onClick={() => setActiveFilter(filter)}
    >
      {filter}
    </s-clickablechip>
  ))}
</s-stack>
```

---

## 7. Responsive Design Patterns

### 7.1 Using QueryContainer for Responsive Layouts

```jsx
<s-query-container containername="dashboard">
  <s-stack direction="inline" gap="base">
    {/* On narrow screens, switches to block direction */}
    <s-box style={{
      flex: "1",
      "@container (max-width: 500px)": { width: "100%" }
    }}>
      Section 1
    </s-box>
    <s-box style={{ flex: "1" }}>
      Section 2
    </s-box>
  </s-stack>
</s-query-container>
```

### 7.2 Single vs. Two-Column

Keep narrow on small screens:
```jsx
<s-page size="base">  {/* "large" for full-width tables */}
  {/* Content */}
</s-page>
```

---

## 8. Component Integration Examples

### 8.1 Complete Action Item Card with All Elements

```jsx
<s-box
  padding="base"
  borderWidth="base"
  borderRadius="base"
  background="subdued"
>
  <s-stack direction="block" gap="base">
    {/* Header with badges */}
    <s-stack direction="inline" gap="base" wrap="true">
      <s-heading level="h3" style={{ margin: 0, flex: "1" }}>
        {actionItem.title}
      </s-heading>
      <s-stack direction="inline" gap="small">
        <s-badge tone={priorityTones[actionItem.priority]}>
          {actionItem.priority}
        </s-badge>
        <s-badge tone={agentTypeTones[actionItem.agentType]}>
          {actionItem.agentType}
        </s-badge>
      </s-stack>
    </s-stack>

    {/* Description */}
    <s-paragraph>{actionItem.description}</s-paragraph>

    {/* Metadata */}
    <s-stack direction="inline" gap="base" wrap="true">
      <s-text>
        <strong>Agent:</strong> {actionItem.agentName}
      </s-text>
      <s-text>
        <strong>Created:</strong> {new Date(actionItem.createdAt).toLocaleDateString()}
      </s-text>
      <s-text>
        <strong>Status:</strong> {actionItem.status}
      </s-text>
    </s-stack>

    {/* Actions */}
    <s-stack direction="inline" gap="base">
      <s-button
        variant="primary"
        onClick={() => handleApprove(actionItem.id)}
      >
        Approve
      </s-button>
      <s-button
        variant="secondary"
        onClick={() => handleDismiss(actionItem.id)}
      >
        Dismiss
      </s-button>
      <s-button
        variant="tertiary"
        onClick={() => setEditingId(actionItem.id)}
      >
        Edit
      </s-button>
    </s-stack>
  </s-stack>
</s-box>
```

### 8.2 Complete Dashboard with All Sections

See implementation guide in section 2.1 above.

---

## 9. Key Design Principles for Dashboard

1. **Information Hierarchy**
   - Urgent items first (banners for alerts)
   - Summary stats above detailed lists
   - Action items in center, quick stats in sidebar

2. **Spacing & Grid Alignment**
   - Use `gap="base"` for consistent 4px-aligned spacing
   - Avoid mixing loose and tight spacing
   - Let `s-section` handle auto-spacing

3. **Visual Emphasis**
   - Primary buttons for main actions (approve)
   - Secondary buttons for alternative actions (dismiss)
   - Badges for metadata (priority, agent type, status)
   - Banners for critical alerts only

4. **Data Density**
   - Use data tables for large datasets (action items)
   - Use card layouts for individual findings with detailed info
   - Lists for simple sequential items

5. **Accessibility**
   - Always provide heading or `accessibilityLabel` for sections
   - Use semantic heading levels (`s-heading` auto-adjusts based on nesting)
   - Ensure sufficient color contrast with badge tones
   - Provide keyboard navigation support

6. **Container Sizing**
   - `s-page size="base"` for most dashboards (narrow, form-friendly)
   - `s-page size="large"` only for full-width data tables
   - Sidebar via `slot="aside"` for secondary info

---

## 10. Component Availability Summary Table

| Category | Components | Web Components Included? | Notes |
|----------|-----------|-------------------------|-------|
| Layout | Page, Section, Stack, Box, Grid | ✅ Full support | Use `s-page`, `s-section`, `s-stack`, `s-box`, `s-grid` |
| Data Display | DataTable, Lists, Badge | ✅ Full support | `s-data-table`, `s-unordered-list`, `s-ordered-list`, `s-badge` |
| Feedback | Banner, Spinner, Tooltip | ✅ Full support | `s-banner`, `s-spinner`, `s-tooltip` |
| Actions | Button, Link, Menu, ClickableChip | ✅ Full support | `s-button`, `s-link`, `s-menu`, `s-clickablechip` |
| Forms | TextField, Select, Checkbox, etc. (18 types) | ✅ Full support | `s-text-field`, `s-select`, `s-checkbox`, etc. |
| Typography | Heading, Paragraph, Text | ✅ Full support | `s-heading`, `s-paragraph`, `s-text` |
| Overlays | Modal, Popover | ✅ Full support | `s-modal`, `s-popover` |
| Media | Avatar, Icon, Image, Thumbnail | ✅ Full support | `s-avatar`, `s-icon`, `s-image`, `s-thumbnail` |

---

## 11. Recommended Implementation Structure

For the AI Secretary app dashboard:

```
app/
  routes/
    app._index.tsx          # Main dashboard
    app.agents.tsx          # Agent management
    app.findings.tsx        # Detailed findings view
  components/
    dashboard-summary.tsx   # Summary stats boxes
    action-items-list.tsx   # Data table with findings
    insights-feed.tsx       # Insights cards list
    alert-banner.tsx        # Reusable alert component
    priority-badge.tsx      # Priority badge helper
    agent-badge.tsx         # Agent type badge helper
    status-badge.tsx        # Status badge helper
```

---

## 12. Integration with Existing App

Current app (`app.tsx`, `app._index.tsx`) already uses:
- ✅ `<s-page>` for main container
- ✅ `<s-button>` for actions
- ✅ `<s-section>` for content areas
- ✅ `<s-stack>` for layout
- ✅ `<s-box>` for containers
- ✅ `<s-heading>` for titles
- ✅ `<s-paragraph>` for text
- ✅ `<s-banner>` for notifications (not yet)
- ✅ `<s-badge>` for status (not yet)
- ✅ `<s-data-table>` for lists (not yet)

All components are already available via `@shopify/polaris-types` (dev dependency for TypeScript typing of web components).

---

## Unresolved Questions / Next Steps

1. **Tab Navigation:** Should use button group pattern or custom CSS-based tabs until native `<s-tabs>` is available in web components
2. **Sorting/Filtering:** Polaris data table may need custom implementation for server-side sorting/filtering on large datasets
3. **Pagination:** How to handle large datasets — implement custom pagination UI or rely on data table's built-in features?
4. **Modal Forms:** For editing findings, should use `<s-modal>` or navigate to detail page?
5. **Real-time Updates:** WebSocket integration for live sync status in banner?
6. **Dark Mode:** Check if Polaris web components auto-support Shopify Admin's theme switching

---

## Sources

- [Using Polaris Web Components - Shopify Dev](https://shopify.dev/docs/api/app-home/using-polaris-components)
- [Polaris Web Components Reference - Shopify Dev](https://shopify.dev/docs/api/app-home/polaris-web-components)
- [Polaris Section Component - Shopify Dev](https://shopify.dev/docs/api/app-home/polaris-web-components/layout-and-structure/section)
- [Polaris Web Components Overview - Shopify Dev](https://shopify.dev/docs/api/pos-ui-extensions/2026-01-rc/polaris-web-components)
- [Data Table Component - Shopify Polaris React](https://polaris-react.shopify.com/components/tables/data-table)
- [Banner Component - Shopify Polaris React](https://polaris-react.shopify.com/components/feedback-indicators/banner)
- [Badge Component - Shopify Dev](https://shopify.dev/docs/api/pos-ui-extensions/latest/polaris-web-components/feedback-and-status-indicators/badge)
- [Apps Design Layout - Shopify Dev](https://shopify.dev/docs/apps/design/layout)
- [Tabs Component - Shopify Polaris React](https://polaris-react.shopify.com/components/navigation/tabs)
- [Polaris Reporting Dashboard - Shopify Partners Blog](https://www.shopify.com/partners/blog/polaris-reporting-dashboard)
- [Polaris—Unified and for the Web (2025) - Shopify](https://www.shopify.com/partners/blog/polaris-unified-and-for-the-web)
