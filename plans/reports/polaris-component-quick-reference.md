# Polaris Web Components Quick Reference
## Cheat Sheet for Dashboard Development

---

## Component Syntax

All Polaris web components use the `<s-*>` prefix and support JSX-style syntax in React:

```jsx
<s-component-name
  attribute="value"
  booleanAttribute
  onClick={handler}
  slot="slot-name"
>
  Children or slot content
</s-component-name>
```

---

## Layout Quick Reference

```jsx
// Main page container
<s-page heading="Dashboard" size="base">
  {/* Primary action button in top-right */}
  <s-button slot="primary-action" onClick={action}>Generate Report</s-button>

  {/* Main content section */}
  <s-section heading="Results">
    {/* Inline layout - horizontal */}
    <s-stack direction="inline" gap="base">
      <s-box padding="base">Item 1</s-box>
      <s-box padding="base">Item 2</s-box>
    </s-stack>

    {/* Block layout - vertical */}
    <s-stack direction="block" gap="base">
      <s-box>Item A</s-box>
      <s-box>Item B</s-box>
    </s-stack>
  </s-section>

  {/* Sidebar via aside slot */}
  <s-section slot="aside" heading="Quick Info">
    <s-text>Sidebar content</s-text>
  </s-section>
</s-page>
```

**Spacing:**
- `gap="base"` = 16px spacing (use this consistently)
- `padding="base"` = default padding (context-aware)
- `padding="none"` = no padding (for full-width content)

---

## Data Display Quick Reference

### Data Table (Tabular Data)
```jsx
<s-data-table
  items={[
    { id: 1, name: "Finding 1", priority: "High" },
    { id: 2, name: "Finding 2", priority: "Low" },
  ]}
  headings={["ID", "Name", "Priority"]}
  columnContentTypes={["text", "text", "text"]}
/>
```

### Lists (Ordered/Unordered)
```jsx
// Numbered list
<s-ordered-list>
  <s-list-item>First item</s-list-item>
  <s-list-item>Second item</s-list-item>
</s-ordered-list>

// Bulleted list
<s-unordered-list>
  <s-list-item>Item A</s-list-item>
  <s-list-item>Item B</s-list-item>
</s-unordered-list>
```

### Badges (Status Tags)
```jsx
// Priority levels
<s-badge tone="critical">High Priority</s-badge>      {/* Red */}
<s-badge tone="warning">Medium</s-badge>              {/* Orange */}
<s-badge tone="info">Low</s-badge>                    {/* Blue */}
<s-badge tone="success">Approved</s-badge>            {/* Green */}
<s-badge tone="subdued">Dismissed</s-badge>           {/* Gray */}
```

---

## Feedback & Alerts Quick Reference

### Banner (Notifications)
```jsx
{/* Critical alert */}
<s-banner heading="Action Required" tone="critical">
  <p>3 items need approval</p>
  <s-button slot="secondary-actions" onClick={handleClick}>
    Review
  </s-button>
</s-banner>

{/* Success feedback */}
<s-banner heading="Saved" tone="success" status />

{/* Info message */}
<s-banner heading="Syncing..." tone="info">
  <s-spinner slot="primary-action" size="small" />
</s-banner>
```

**Tone options:** `critical`, `warning`, `success`, `info`

### Spinner (Loading)
```jsx
<s-spinner size="small" />     {/* Inline spinner */}
<s-spinner size="base" />
<s-spinner size="large" />
```

---

## Actions Quick Reference

### Buttons
```jsx
{/* Primary - main action */}
<s-button variant="primary" onClick={handleClick}>
  Approve
</s-button>

{/* Secondary - alternative action */}
<s-button variant="secondary" onClick={handleClick}>
  Dismiss
</s-button>

{/* Tertiary - less important */}
<s-button variant="tertiary" onClick={handleClick}>
  Edit
</s-button>

{/* States */}
<s-button disabled>Disabled</s-button>
<s-button loading={isLoading}>Submitting...</s-button>
<s-button href="/page">Link Button</s-button>
<s-button target="_blank" href="/external">External</s-button>
```

### Link
```jsx
<s-link href="/app/page">Navigate here</s-link>
<s-link href="https://external.com" target="_blank">External link</s-link>
```

### Button Groups (for related actions)
```jsx
<s-stack direction="inline" gap="base">
  <s-button variant="primary" onClick={approve}>Approve</s-button>
  <s-button variant="secondary" onClick={dismiss}>Dismiss</s-button>
  <s-button variant="tertiary" onClick={edit}>Edit</s-button>
</s-stack>
```

---

## Typography Quick Reference

```jsx
<s-heading>Page Title (h2 by default)</s-heading>
<s-heading level="h1">Explicit H1</s-heading>
<s-heading level="h3">Section Subheading</s-heading>

<s-paragraph>
  Main paragraph text. Use for larger text blocks.
</s-paragraph>

<s-text>
  Inline text element. Use for single lines.
</s-text>

{/* Combine for labels */}
<s-text><strong>Priority:</strong> High</s-text>
```

---

## Common Dashboard Patterns

### Summary Stats Cards
```jsx
<s-stack direction="inline" gap="base">
  {stats.map(stat => (
    <s-box
      key={stat.id}
      padding="base"
      background="subdued"
      borderRadius="base"
      style={{ flex: "1", textAlign: "center" }}
    >
      <s-heading level="h3">{stat.label}</s-heading>
      <s-text style={{ fontSize: "24px", fontWeight: "bold" }}>
        {stat.value}
      </s-text>
    </s-box>
  ))}
</s-stack>
```

### Item Cards with Actions
```jsx
<s-box padding="base" borderWidth="base" borderRadius="base">
  <s-stack direction="block" gap="base">
    <s-heading level="h3">{item.title}</s-heading>
    <s-paragraph>{item.description}</s-paragraph>

    <s-stack direction="inline" gap="small">
      <s-badge tone={getTone(item.priority)}>
        {item.priority}
      </s-badge>
      <s-badge>{item.type}</s-badge>
    </s-stack>

    <s-stack direction="inline" gap="base">
      <s-button variant="primary" onClick={() => approve(item.id)}>
        Approve
      </s-button>
      <s-button variant="secondary" onClick={() => dismiss(item.id)}>
        Dismiss
      </s-button>
    </s-stack>
  </s-stack>
</s-box>
```

### Tab-like Navigation (No Native Tabs Yet)
```jsx
<s-stack direction="inline" gap="base">
  {['pending', 'approved', 'dismissed'].map(tab => (
    <s-button
      key={tab}
      variant={activeTab === tab ? 'primary' : 'secondary'}
      onClick={() => setActiveTab(tab)}
    >
      {tab.charAt(0).toUpperCase() + tab.slice(1)}
    </s-button>
  ))}
</s-stack>

{/* Show content based on activeTab */}
{activeTab === 'pending' && <PendingList />}
{activeTab === 'approved' && <ApprovedList />}
{activeTab === 'dismissed' && <DismissedList />}
```

---

## Form Components (For Settings/Configuration)

```jsx
{/* Text input */}
<s-text-field
  label="Name"
  value={value}
  onInput={(e) => setValue(e.target.value)}
/>

{/* Dropdown */}
<s-select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
  <s-option value="high">High</s-option>
  <s-option value="medium">Medium</s-option>
  <s-option value="low">Low</s-option>
</s-select>

{/* Checkbox */}
<s-checkbox
  label="Mark as read"
  checked={isRead}
  onChange={(e) => setIsRead(e.target.checked)}
/>

{/* Search */}
<s-search-field
  placeholder="Search findings..."
  onInput={(e) => setSearchQuery(e.target.value)}
/>

{/* Multi-select */}
<s-choice-list multiple>
  <s-choice value="security">Security</s-choice>
  <s-choice value="performance">Performance</s-choice>
  <s-choice value="content">Content</s-choice>
</s-choice-list>
```

---

## Box Styling Options

```jsx
{/* Background colors */}
<s-box background="subdued">Light gray background</s-box>
<s-box background="success">Green background</s-box>
<s-box background="warning">Orange background</s-box>
<s-box background="critical">Red background</s-box>

{/* Padding */}
<s-box padding="base">Default padding (16px)</s-box>
<s-box padding="none">No padding</s-box>

{/* Border */}
<s-box borderWidth="base" borderRadius="base">
  Bordered box with rounded corners
</s-box>

{/* Combine */}
<s-box
  padding="base"
  background="subdued"
  borderWidth="base"
  borderRadius="base"
>
  Card-like appearance
</s-box>
```

---

## Slots (Advanced)

Some components accept slotted content:

```jsx
{/* s-page primary action */}
<s-page heading="Dashboard">
  <s-button slot="primary-action">Generate Report</s-button>
</s-page>

{/* s-section aside slot for sidebar */}
<s-section slot="aside" heading="Quick Stats">
  Sidebar content here
</s-section>

{/* s-banner secondary actions */}
<s-banner heading="Alert" tone="critical">
  Main content
  <s-button slot="secondary-actions">Action</s-button>
</s-banner>
```

---

## Common Attribute Patterns

```jsx
{/* Event handlers - use camelCase */}
<s-button onClick={handleClick}>Click me</s-button>
<s-text-field onInput={(e) => setValue(e.target.value)} />
<s-text-field onChange={(e) => setValue(e.target.value)} />

{/* Boolean attributes */}
<s-button disabled>Disabled</s-button>
<s-checkbox checked={true} />
<s-banner status />  {/* Renders status indicator */}

{/* Link-like buttons */}
<s-button href="/app/page">Navigate</s-button>
<s-button href="https://external.com" target="_blank">External</s-button>

{/* CSS inline styles */}
<s-box style={{ minWidth: "200px", textAlign: "center" }}>
  Styled box
</s-box>
```

---

## Responsive Considerations

```jsx
{/* Use s-page size for width management */}
<s-page size="base">      {/* Default, narrow - good for forms */}
  {/* Content */}
</s-page>

<s-page size="large">      {/* Full width - for data tables */}
  {/* Content */}
</s-page>

{/* Use wrapping stacks for responsive layouts */}
<s-stack direction="inline" gap="base" wrap={true}>
  <s-box style={{ flex: "1", minWidth: "200px" }}>Responsive box 1</s-box>
  <s-box style={{ flex: "1", minWidth: "200px" }}>Responsive box 2</s-box>
</s-stack>
```

---

## Accessibility Reminders

```jsx
{/* Always provide heading or accessibilityLabel for sections */}
<s-section heading="Results">
  {/* Good - has visible heading */}
</s-section>

<s-section accessibilityLabel="Search results">
  {/* Good - hidden heading for screen readers */}
</s-section>

{/* Link headings properly in heirarchy */}
<s-heading>Page Title</s-heading>
<s-section heading="Main Section">
  {/* Heading automatically becomes h3 inside section */}
</s-section>

{/* Use semantic HTML */}
<s-text><strong>Label:</strong> Value</s-text>

{/* Form labels are built-in */}
<s-text-field label="Email" />
<s-select label="Type" />
```

---

## Performance Tips

1. Use `gap="base"` consistently instead of custom margins
2. Let `s-page`, `s-section`, and `s-stack` handle spacing (avoid overriding)
3. Minimize custom CSS — Polaris components come pre-styled
4. Use `direction="inline"` with `wrap={true}` for responsive layouts
5. Rely on component defaults (padding, background) before adding custom styles

---

## Common Gotchas

❌ **DON'T:**
- Use `<a>` for navigation — use `<s-link>` or `<s-button href>`
- Mix `gap` spacing with custom margin — pick one approach
- Nest multiple levels of `s-sections` (2-3 levels max)
- Use multiple `s-banner` notifications at once (stack them or use modal)

✅ **DO:**
- Use `s-stack` for spacing between elements
- Leverage slots (`slot="primary-action"`, `slot="aside"`) for positioning
- Use badges for metadata, buttons for actions
- Keep action buttons in logical groups with `s-stack direction="inline"`

---

## Integration Checklist for Dashboard

- [ ] Wrap in `<s-page heading="Dashboard">`
- [ ] Add `<s-button slot="primary-action">` for main action
- [ ] Use `<s-section heading="...">` for content areas
- [ ] Use `<s-stack direction="inline" gap="base">` for horizontal layouts
- [ ] Add `<s-badge>` for status/priority indicators
- [ ] Add `<s-banner>` for alerts/notifications
- [ ] Use `<s-data-table>` or cards for findings list
- [ ] Add `<s-section slot="aside">` for sidebar stats
- [ ] Test button variants (primary, secondary, tertiary)
- [ ] Ensure all sections have `heading` or `accessibilityLabel`
