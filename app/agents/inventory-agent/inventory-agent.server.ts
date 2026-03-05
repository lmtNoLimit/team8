import type {
  Agent,
  AdminClient,
  AgentFindingInput,
} from "../../lib/agent-interface";

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

  async run(_shop: string, _admin: AdminClient): Promise<AgentFindingInput[]> {
    return [
      {
        type: "action_needed",
        priority: 1,
        title: "'Blue Widget' selling out in 2 days at current pace",
        description:
          "Current stock: 14 units. Avg daily sales: 7. Reorder recommended immediately.",
        action: JSON.stringify({
          type: "reorderAlert",
          productTitle: "Blue Widget",
          daysLeft: 2,
        }),
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
