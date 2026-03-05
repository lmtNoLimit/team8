import type {
  Agent,
  AdminClient,
  AgentFindingInput,
} from "../../lib/agent-interface";

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

  async run(_shop: string, _admin: AdminClient): Promise<AgentFindingInput[]> {
    return [
      {
        type: "action_needed",
        priority: 2,
        title: "18 products invisible to ChatGPT Shopping",
        description:
          "These products lack metadata required for AI agent discovery. Optimized descriptions ready to apply.",
        action: JSON.stringify({ type: "applyMetadata", productCount: 18 }),
        metadata: { missingFields: ["description", "gtin"], productCount: 18, estimatedRevenue: 120 },
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
        metadata: { keyword: "wireless headphones", competitor: "CompetitorX", estimatedRevenue: 80 },
        deduplicationKey: "aeo:competitor-perplexity",
      },
    ];
  },
};
