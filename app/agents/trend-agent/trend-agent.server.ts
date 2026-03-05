import type {
  Agent,
  AdminClient,
  AgentFindingInput,
} from "../../lib/agent-interface";
import { askClaudeJSON } from "../../lib/ai.server";
import { getStoreProfile } from "../../services/store-profile.server";

interface TrendMatch {
  trend: string;
  growth: string;
  relevance: "high" | "medium" | "low";
  category: "keyword" | "seasonal" | "emerging";
  matchingProducts: string[];
  optimized: boolean;
  suggestion: string;
}

const SEED_PRODUCTS = [
  { id: "1", title: "Red Sneakers", productType: "Footwear", tags: ["shoes", "casual"], description: "Classic red athletic footwear for everyday wear" },
  { id: "2", title: "Blue Widget", productType: "Gadgets", tags: ["tech", "portable"], description: "Compact ultra-light portable widget for professionals" },
  { id: "3", title: "Green Hoodie", productType: "Apparel", tags: ["clothing", "eco"], description: "Comfortable cotton hoodie with eco-friendly packaging" },
  { id: "4", title: "Yellow Cap", productType: "Accessories", tags: ["hat", "outdoor"], description: "Bright yellow baseball cap for outdoor activities" },
  { id: "5", title: "Wireless Earbuds Pro", productType: "Electronics", tags: ["audio", "wireless"], description: "Premium wireless earbuds with noise cancellation" },
];

async function fetchProducts(admin: AdminClient): Promise<any[]> {
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
    return data.data?.products?.edges?.map((e: any) => e.node) || [];
  } catch {
    return SEED_PRODUCTS;
  }
}

function buildProductSummary(products: any[]): string {
  return products
    .map(
      (p: any) =>
        `- ${p.title} (${p.productType || "no type"}) [tags: ${Array.isArray(p.tags) ? p.tags.join(", ") : "none"}]: ${(p.description || "").slice(0, 100)}`,
    )
    .join("\n");
}

export const trendAgent: Agent = {
  agentId: "trend",
  displayName: "Trend Analyst",
  description:
    "Identifies trending topics and matches them to your product catalog",

  async run(shop: string, admin: AdminClient): Promise<AgentFindingInput[]> {
    const products = await fetchProducts(admin);

    if (products.length === 0) {
      return [
        {
          type: "done",
          priority: 5,
          title: "No products to analyze",
          description: "Add products to your store to get trend insights.",
          deduplicationKey: "trend:no-products",
        },
      ];
    }

    let profileContext = "";
    try {
      const profile = await getStoreProfile(shop);
      if (profile.industry || profile.targetAudience) {
        profileContext = `\nStore context: Industry: ${profile.industry || "unknown"}, Target audience: ${profile.targetAudience || "general"}, Description: ${profile.storeDescription || "N/A"}`;
      }
    } catch { /* profile unavailable, continue without */ }

    const productSummary = buildProductSummary(products);

    const trends = await askClaudeJSON<TrendMatch[]>(
      `You are a market trend analyst. Given this product catalog, identify 4-6 current consumer/search trends that are relevant.

Product catalog:
${productSummary}
${profileContext}

For each trend, determine:
- trend: the trending keyword/topic
- growth: estimated growth (e.g., "+340%", "+120%")
- relevance: how relevant to this store ("high", "medium", "low")
- category: "keyword" (search term trend), "seasonal" (seasonal opportunity), or "emerging" (new market trend)
- matchingProducts: array of product titles that could benefit
- optimized: whether the product titles/descriptions already mention this trend
- suggestion: what the merchant should do (under 200 chars)

Return JSON array sorted by relevance then growth.`,
      "You are a market research analyst specializing in e-commerce and consumer search trends. Use your knowledge of current 2026 trends. Focus on actionable, specific trends — not generic advice.",
    );

    const findings: AgentFindingInput[] = [];

    for (const t of trends) {
      if (!t.optimized && t.matchingProducts.length > 0) {
        findings.push({
          type: "action_needed",
          priority: t.relevance === "high" ? 2 : 3,
          title: `"${t.trend}" trending ${t.growth} — ${t.matchingProducts.length} products not optimized`,
          description: t.suggestion,
          action: `Optimize ${t.matchingProducts.join(", ")} for "${t.trend}"`,
          metadata: {
            trend: t.trend,
            growth: t.growth,
            category: t.category || "keyword",
            relevance: t.relevance,
            matchingProducts: t.matchingProducts,
          },
          deduplicationKey: `trend:optimize-${t.trend.toLowerCase().replace(/\s+/g, "-")}`,
        });
      } else if (t.optimized) {
        findings.push({
          type: "done",
          priority: 5,
          title: `Already optimized for "${t.trend}" (${t.growth})`,
          description: "Your products already mention this trend. Good job.",
          metadata: { trend: t.trend, growth: t.growth, category: t.category || "keyword", relevance: t.relevance },
          deduplicationKey: `trend:optimized-${t.trend.toLowerCase().replace(/\s+/g, "-")}`,
        });
      } else {
        findings.push({
          type: "insight",
          priority: 4,
          title: `"${t.trend}" trending ${t.growth}`,
          description: `${t.suggestion}. Could be relevant if you expand your catalog.`,
          metadata: { trend: t.trend, growth: t.growth, category: t.category || "keyword", relevance: t.relevance },
          deduplicationKey: `trend:insight-${t.trend.toLowerCase().replace(/\s+/g, "-")}`,
        });
      }
    }

    return findings;
  },
};
