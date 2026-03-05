import type {
  Agent,
  AdminClient,
  AgentFindingInput,
} from "../../lib/agent-interface";
import { askClaudeJSON } from "../../lib/ai.server";

// --- Type definitions ---

interface RawProduct {
  id: string;
  title: string;
  totalInventory: number;
  tracksInventory: boolean;
  createdAt: string;
  variants: {
    id: string;
    sku: string | null;
    price: string;
    inventoryQuantity: number;
  }[];
}

interface RawOrderLineItem {
  quantity: number;
  productId: string | null;
}

interface ProductInventory {
  productId: string;
  title: string;
  totalStock: number;
  tracksInventory: boolean;
  variants: {
    id: string;
    sku: string | null;
    price: string;
    inventoryQuantity: number;
  }[];
  totalUnitsSold30d: number;
  dailyVelocity: number;
  daysUntilStockout: number;
  createdAt: string;
}

interface ClassifiedInventory {
  critical: ProductInventory[];
  low: ProductInventory[];
  deadStock: ProductInventory[];
  outOfStock: ProductInventory[];
  healthy: ProductInventory[];
}

interface InventoryAnalysis {
  findings: {
    type: "done" | "action_needed" | "insight";
    priority: number;
    title: string;
    description: string;
    metadata: Record<string, unknown>;
    deduplicationKey: string;
  }[];
}

// --- GraphQL queries ---

const PRODUCTS_QUERY = `
  query InventoryProducts($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          title
          totalInventory
          tracksInventory
          createdAt
          variants(first: 10) {
            edges {
              node {
                id
                sku
                price
                inventoryQuantity
              }
            }
          }
        }
      }
    }
  }
`;

const ORDERS_QUERY = `
  query RecentOrders($cursor: String, $query: String!) {
    orders(first: 50, after: $cursor, query: $query) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          lineItems(first: 50) {
            edges {
              node {
                quantity
                product { id }
              }
            }
          }
        }
      }
    }
  }
`;

// --- Data fetching ---

async function fetchProducts(admin: AdminClient): Promise<RawProduct[]> {
  const allProducts: RawProduct[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 3; page++) {
    const response = await admin.graphql(PRODUCTS_QUERY, {
      variables: { cursor },
    });
    const json: any = await response.json();
    const { edges, pageInfo } = json.data.products;

    for (const { node } of edges) {
      if (!node.tracksInventory) continue;
      allProducts.push({
        id: node.id,
        title: node.title,
        totalInventory: node.totalInventory,
        tracksInventory: node.tracksInventory,
        createdAt: node.createdAt,
        variants: node.variants.edges.map((v: any) => v.node),
      });
    }

    if (!pageInfo.hasNextPage) break;
    cursor = pageInfo.endCursor;
  }

  return allProducts;
}

async function fetchRecentOrders(
  admin: AdminClient,
): Promise<RawOrderLineItem[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const queryFilter = `created_at:>${thirtyDaysAgo}`;

  const allLineItems: RawOrderLineItem[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 3; page++) {
    const response = await admin.graphql(ORDERS_QUERY, {
      variables: { cursor, query: queryFilter },
    });
    const json: any = await response.json();
    const { edges, pageInfo } = json.data.orders;

    for (const { node: order } of edges) {
      for (const { node: li } of order.lineItems.edges) {
        allLineItems.push({
          quantity: li.quantity,
          productId: li.product?.id || null,
        });
      }
    }

    if (!pageInfo.hasNextPage) break;
    cursor = pageInfo.endCursor;
  }

  return allLineItems;
}

// --- Data processing ---

const LOOKBACK_DAYS = 30;

function buildProductInventoryMap(
  products: RawProduct[],
  lineItems: RawOrderLineItem[],
): ProductInventory[] {
  const salesMap = new Map<string, number>();
  for (const li of lineItems) {
    if (li.productId) {
      salesMap.set(
        li.productId,
        (salesMap.get(li.productId) || 0) + li.quantity,
      );
    }
  }

  return products.map((p) => {
    const totalStock = Math.max(0, p.totalInventory);
    const totalSold = salesMap.get(p.id) || 0;
    const dailyVelocity =
      Math.round((totalSold / LOOKBACK_DAYS) * 10) / 10;
    const daysUntilStockout =
      dailyVelocity > 0 && totalStock > 0
        ? Math.round(totalStock / dailyVelocity)
        : totalStock <= 0
          ? 0
          : Infinity;

    return {
      productId: p.id,
      title: p.title,
      totalStock,
      tracksInventory: p.tracksInventory,
      variants: p.variants,
      totalUnitsSold30d: totalSold,
      dailyVelocity,
      daysUntilStockout,
      createdAt: p.createdAt,
    };
  });
}

function classifyProducts(products: ProductInventory[]): ClassifiedInventory {
  const result: ClassifiedInventory = {
    critical: [],
    low: [],
    deadStock: [],
    outOfStock: [],
    healthy: [],
  };

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const p of products) {
    if (p.totalStock <= 0) {
      result.outOfStock.push(p);
    } else if (p.dailyVelocity > 0 && p.daysUntilStockout <= 7) {
      result.critical.push(p);
    } else if (p.dailyVelocity > 0 && p.daysUntilStockout <= 14) {
      result.low.push(p);
    } else if (
      p.totalUnitsSold30d === 0 &&
      p.totalStock > 0 &&
      new Date(p.createdAt).getTime() < thirtyDaysAgo
    ) {
      result.deadStock.push(p);
    } else {
      result.healthy.push(p);
    }
  }

  result.critical.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

  return result;
}

// --- Claude AI prompt ---

const SYSTEM_PROMPT = `You are an inventory analyst for a Shopify store. You analyze stock levels and sales velocity to find actionable insights for the store owner. Be specific with numbers: cite exact stock counts, days until stockout, and daily sell rates. Focus on findings that protect revenue (preventing stockouts) and improve cash flow (identifying dead stock).`;

function buildClaudePrompt(
  classified: ClassifiedInventory,
  allProducts: ProductInventory[],
): string {
  const formatProduct = (p: ProductInventory) =>
    `  - "${p.title}": ${p.totalStock} units, ${p.dailyVelocity}/day, ~${p.daysUntilStockout === Infinity ? "no sales" : p.daysUntilStockout + " days left"}`;

  const formatDeadStock = (p: ProductInventory) =>
    `  - "${p.title}": ${p.totalStock} units in stock, 0 sold in 30 days`;

  const sections: string[] = [];
  sections.push(`INVENTORY SUMMARY:`);
  sections.push(`- Total products tracked: ${allProducts.length}`);
  sections.push(`- Healthy: ${classified.healthy.length}`);

  if (classified.critical.length > 0) {
    sections.push(
      `\nCRITICAL — Stockout within 7 days (${classified.critical.length}):`,
    );
    sections.push(classified.critical.map(formatProduct).join("\n"));
  }
  if (classified.low.length > 0) {
    sections.push(
      `\nLOW STOCK — Stockout within 14 days (${classified.low.length}):`,
    );
    sections.push(classified.low.map(formatProduct).join("\n"));
  }
  if (classified.outOfStock.length > 0) {
    sections.push(
      `\nOUT OF STOCK (${classified.outOfStock.length}):`,
    );
    sections.push(
      classified.outOfStock.map((p) => `  - "${p.title}"`).join("\n"),
    );
  }
  if (classified.deadStock.length > 0) {
    sections.push(
      `\nDEAD STOCK — No sales in 30 days (${classified.deadStock.length}):`,
    );
    sections.push(classified.deadStock.map(formatDeadStock).join("\n"));
  }

  return `Analyze this inventory data and return 3-8 findings as JSON.

${sections.join("\n")}

Return JSON in this exact format:
{
  "findings": [
    {
      "type": "action_needed" | "insight" | "done",
      "priority": 1-5,
      "title": "short headline under 80 chars",
      "description": "detailed explanation under 300 chars with specific numbers",
      "metadata": { "productId": "...", "currentStock": N, "dailyVelocity": N, "daysLeft": N },
      "deduplicationKey": "inventory:category-identifier"
    }
  ]
}

Rules:
- "action_needed": stockout risks, out-of-stock products that need reordering (priority 1-2)
- "insight": dead stock patterns, velocity trends, overstocking (priority 2-4)
- "done": healthy inventory confirmations, positive trends (priority 4-5)
- Include at least one of each type if the data supports it
- For stockout risks: mention product name, current stock, daily velocity, days until out
- For dead stock: mention total units and count of affected products
- Each deduplicationKey must be unique and start with "inventory:"`;
}

// --- Fallback findings ---

function buildFallbackFindings(
  classified: ClassifiedInventory,
  allProducts: ProductInventory[],
): AgentFindingInput[] {
  const findings: AgentFindingInput[] = [];

  if (classified.critical.length > 0) {
    const worst = classified.critical[0];
    findings.push({
      type: "action_needed",
      priority: 1,
      title: `'${worst.title}' selling out in ${worst.daysUntilStockout} days`.slice(0, 80),
      description:
        `Current stock: ${worst.totalStock} units. Selling ${worst.dailyVelocity}/day. Reorder immediately to prevent stockout.`.slice(0, 300),
      metadata: {
        productId: worst.productId,
        currentStock: worst.totalStock,
        dailyVelocity: worst.dailyVelocity,
        daysUntilStockout: worst.daysUntilStockout,
      },
      deduplicationKey: `inventory:stockout-${worst.productId}`,
      externalId: worst.productId,
    });
  }

  if (classified.outOfStock.length > 0) {
    findings.push({
      type: "action_needed",
      priority: 2,
      title:
        `${classified.outOfStock.length} product(s) currently out of stock`.slice(0, 80),
      description:
        `These products have zero inventory and may be losing sales: ${classified.outOfStock.slice(0, 3).map((p) => p.title).join(", ")}.`.slice(0, 300),
      metadata: {
        outOfStockCount: classified.outOfStock.length,
        productIds: classified.outOfStock.map((p) => p.productId),
      },
      deduplicationKey: "inventory:out-of-stock",
    });
  }

  if (classified.deadStock.length > 0) {
    findings.push({
      type: "insight",
      priority: 3,
      title:
        `${classified.deadStock.length} product(s) have zero sales in 30 days`.slice(0, 80),
      description:
        `Total of ${classified.deadStock.reduce((sum, p) => sum + p.totalStock, 0)} units sitting idle. Consider discounting or bundling to free up capital.`.slice(0, 300),
      metadata: {
        deadStockCount: classified.deadStock.length,
        totalIdleUnits: classified.deadStock.reduce(
          (sum, p) => sum + p.totalStock,
          0,
        ),
      },
      deduplicationKey: "inventory:dead-stock",
    });
  }

  const healthyPct =
    allProducts.length > 0
      ? Math.round((classified.healthy.length / allProducts.length) * 100)
      : 100;
  findings.push({
    type: "done",
    priority: 5,
    title:
      `Inventory scan complete — ${allProducts.length} products analyzed`.slice(0, 80),
    description:
      `${healthyPct}% of tracked inventory is healthy. ${classified.critical.length} critical, ${classified.low.length} low, ${classified.outOfStock.length} out of stock, ${classified.deadStock.length} dead stock.`.slice(0, 300),
    metadata: {
      totalProducts: allProducts.length,
      healthyCount: classified.healthy.length,
      healthyPct,
      criticalCount: classified.critical.length,
      lowCount: classified.low.length,
      outOfStockCount: classified.outOfStock.length,
      deadStockCount: classified.deadStock.length,
    },
    deduplicationKey: "inventory:health-check",
  });

  return findings;
}

// --- Agent export ---

export const inventoryAgent: Agent = {
  agentId: "inventory",
  displayName: "Inventory Manager",
  description: "Monitors stock levels and predicts stockouts",

  async run(shop: string, admin: AdminClient): Promise<AgentFindingInput[]> {
    // 1. Fetch products with inventory tracking
    const products = await fetchProducts(admin);

    if (products.length === 0) {
      return [
        {
          type: "done",
          priority: 5,
          title: "No products found to analyze",
          description:
            "This store has no products with inventory tracking enabled.",
          deduplicationKey: "inventory:no-products",
        },
      ];
    }

    // 2. Fetch recent orders (graceful if scope missing)
    let orderLineItems: RawOrderLineItem[] = [];
    try {
      orderLineItems = await fetchRecentOrders(admin);
    } catch (e) {
      console.warn("[InventoryAgent] Could not fetch orders:", e);
    }

    // 3. Build inventory map with velocity
    const inventoryMap = buildProductInventoryMap(products, orderLineItems);

    // 4. Classify into risk buckets
    const classified = classifyProducts(inventoryMap);

    // 5. Claude analysis with fallback
    try {
      const analysis = await askClaudeJSON<InventoryAnalysis>(
        buildClaudePrompt(classified, inventoryMap),
        SYSTEM_PROMPT,
      );

      return analysis.findings.map((f) => ({
        type: f.type as AgentFindingInput["type"],
        priority: Math.max(1, Math.min(5, f.priority)) as AgentFindingInput["priority"],
        title: f.title.slice(0, 80),
        description: f.description.slice(0, 300),
        metadata: f.metadata,
        deduplicationKey:
          f.deduplicationKey ||
          `inventory:${f.type}-${f.title.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}`,
      }));
    } catch (error) {
      console.error(
        "[InventoryAgent] Claude API error, using fallback:",
        error,
      );
      return buildFallbackFindings(classified, inventoryMap);
    }
  },
};
