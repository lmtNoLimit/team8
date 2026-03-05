import type {
  Agent,
  AdminClient,
  AgentFindingInput,
} from "../../lib/agent-interface";
import { askClaudeJSON } from "../../lib/ai.server";
import { getStoreProfile } from "../../services/store-profile.server";
import { fetchTrendingTopics } from "../../services/trending-data.server";

interface TrendMatch {
  trend: string;
  trafficVolume: string;
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
    "Identifies real-time trending topics from Google Trends and matches them to your product catalog",

  async run(shop: string, admin: AdminClient): Promise<AgentFindingInput[]> {
    const [products, trendingTopics] = await Promise.all([
      fetchProducts(admin),
      fetchTrendingTopics("US"),
    ]);

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

    // Build trending data section
    const hasTrendData = trendingTopics.length > 0;
    const trendingSection = hasTrendData
      ? `\nReal-time trending topics (from Google Trends, today):\n${trendingTopics.map((t) => `- "${t.title}" (${t.trafficVolume} searches)`).join("\n")}`
      : "";

    const prompt = hasTrendData
      ? `You are a market trend analyst. You have access to REAL trending topics from Google Trends (provided below) and a product catalog.

Your task:
1. Analyze which of these real trending topics are relevant to this store's products
2. For relevant trends, check if the store's products are already optimized for them
3. Also identify 1-2 additional seasonal or emerging trends based on your knowledge that are relevant to this catalog

Product catalog:
${productSummary}
${profileContext}
${trendingSection}

For each relevant trend, provide:
- trend: the trending keyword/topic (use the exact term from Google Trends when applicable)
- trafficVolume: the search volume from the data (e.g., "200,000+" for Google Trends data, or "estimated" for your own suggestions)
- relevance: how relevant to this store ("high", "medium", "low") — only include "medium" or "high" relevance trends
- category: "keyword" (from Google Trends data), "seasonal" (seasonal opportunity), or "emerging" (your analysis of an emerging trend)
- matchingProducts: array of product titles that could benefit
- optimized: whether the product titles/descriptions already mention this trend
- suggestion: what the merchant should do (under 200 chars)

Return JSON array sorted by relevance then trafficVolume. Only include trends with medium or high relevance to this specific store. If no Google Trends topics are relevant, focus on seasonal and emerging trends for this catalog.`
      : `You are a market trend analyst. Analyze this product catalog and identify 4-6 current consumer/search trends that are relevant.

Product catalog:
${productSummary}
${profileContext}

For each trend, provide:
- trend: the trending keyword/topic
- trafficVolume: estimated search interest (e.g., "high", "medium")
- relevance: how relevant to this store ("high", "medium", "low")
- category: "keyword" (search term trend), "seasonal" (seasonal opportunity), or "emerging" (new market trend)
- matchingProducts: array of product titles that could benefit
- optimized: whether the product titles/descriptions already mention this trend
- suggestion: what the merchant should do (under 200 chars)

Return JSON array sorted by relevance.`;

    const systemPrompt = hasTrendData
      ? "You are a market research analyst. You are given REAL Google Trends data — use it as your primary source. Be precise and actionable. Only include trends genuinely relevant to the store's products."
      : "You are a market research analyst specializing in e-commerce and consumer search trends. Use your knowledge of current 2026 trends. Focus on actionable, specific trends — not generic advice.";

    const trends = await askClaudeJSON<TrendMatch[]>(prompt, systemPrompt);

    const findings: AgentFindingInput[] = [];

    // Add a source info finding
    if (hasTrendData) {
      findings.push({
        type: "insight",
        priority: 5,
        title: `Analyzed ${trendingTopics.length} real-time Google Trends topics`,
        description: `Data sourced from Google Trends daily trending searches. Top trends: ${trendingTopics.slice(0, 3).map((t) => t.title).join(", ")}.`,
        metadata: {
          source: "google_trends",
          totalTopics: trendingTopics.length,
          fetchedAt: new Date().toISOString(),
        },
        deduplicationKey: `trend:source-info`,
      });
    }

    for (const t of trends) {
      const volume = t.trafficVolume || "N/A";

      if (!t.optimized && t.matchingProducts.length > 0) {
        findings.push({
          type: "action_needed",
          priority: t.relevance === "high" ? 2 : 3,
          title: `"${t.trend}" trending (${volume} searches) — ${t.matchingProducts.length} products not optimized`,
          description: t.suggestion,
          action: `Optimize ${t.matchingProducts.join(", ")} for "${t.trend}"`,
          metadata: {
            trend: t.trend,
            trafficVolume: volume,
            category: t.category || "keyword",
            relevance: t.relevance,
            matchingProducts: t.matchingProducts,
            source: t.category === "keyword" ? "google_trends" : "ai_analysis",
          },
          deduplicationKey: `trend:optimize-${t.trend.toLowerCase().replace(/\s+/g, "-")}`,
        });
      } else if (t.optimized) {
        findings.push({
          type: "done",
          priority: 5,
          title: `Already optimized for "${t.trend}" (${volume} searches)`,
          description: "Your products already mention this trend. Good job.",
          metadata: {
            trend: t.trend,
            trafficVolume: volume,
            category: t.category || "keyword",
            relevance: t.relevance,
            source: t.category === "keyword" ? "google_trends" : "ai_analysis",
          },
          deduplicationKey: `trend:optimized-${t.trend.toLowerCase().replace(/\s+/g, "-")}`,
        });
      } else {
        findings.push({
          type: "insight",
          priority: 4,
          title: `"${t.trend}" trending (${volume} searches)`,
          description: `${t.suggestion}. Could be relevant if you expand your catalog.`,
          metadata: {
            trend: t.trend,
            trafficVolume: volume,
            category: t.category || "keyword",
            relevance: t.relevance,
            source: t.category === "keyword" ? "google_trends" : "ai_analysis",
          },
          deduplicationKey: `trend:insight-${t.trend.toLowerCase().replace(/\s+/g, "-")}`,
        });
      }
    }

    return findings;
  },
};
