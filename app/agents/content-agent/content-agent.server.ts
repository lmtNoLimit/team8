import type {
  Agent,
  AdminClient,
  AgentFindingInput,
} from "../../lib/agent-interface";

/**
 * Content Agent -- Product Content Quality
 * Audits titles/descriptions for quality, flags thin or duplicate content.
 *
 * STUB: Replace with real implementation.
 * Owner: Developer B
 */
export const contentAgent: Agent = {
  agentId: "content",
  displayName: "Content Writer",
  description: "Audits product content quality and drafts improvements",

  async run(_shop: string, _admin: AdminClient): Promise<AgentFindingInput[]> {
    return [
      {
        type: "action_needed",
        priority: 2,
        title: "7 products have thin descriptions (< 50 words)",
        description:
          "Short descriptions hurt conversion and AI discoverability. Expanded drafts are ready for review.",
        action: JSON.stringify({ type: "expandDescriptions", productCount: 7 }),
        metadata: { avgWordCount: 23, targetWordCount: 150 },
        deduplicationKey: "content:thin-descriptions",
      },
      {
        type: "action_needed",
        priority: 3,
        title: "3 duplicate product titles detected",
        description:
          "Products share identical titles which confuses search engines and AI agents.",
        metadata: { duplicateGroups: 2 },
        deduplicationKey: "content:duplicate-titles",
      },
      {
        type: "insight",
        priority: 4,
        title: "'Sustainable packaging' trending +340% in AI searches",
        description:
          "You have 3 matching products not optimized for this trend. Consider updating their descriptions.",
        metadata: { keyword: "sustainable packaging", matchingProducts: 3 },
        deduplicationKey: "content:trending-sustainable",
      },
    ];
  },
};
