import type {
  Agent,
  AdminClient,
  AgentFindingInput,
} from "../../lib/agent-interface";

/**
 * Schema Agent -- Structured Data Validation
 * Validates JSON-LD/structured data and auto-generates missing schema.
 *
 * STUB: Replace with real implementation.
 * Owner: Developer C
 */
export const schemaAgent: Agent = {
  agentId: "schema",
  displayName: "Schema Expert",
  description:
    "Validates and fixes structured data (JSON-LD) on your storefront",

  async run(_shop: string, _admin: AdminClient): Promise<AgentFindingInput[]> {
    return [
      {
        type: "done",
        priority: 3,
        title: "Fixed broken structured data on 3 product pages",
        description:
          "Detected and corrected invalid JSON-LD markup that was preventing rich results in Google.",
        metadata: { fixedPages: 3, errorType: "missing-price" },
        deduplicationKey: "schema:fixed-jsonld",
      },
      {
        type: "action_needed",
        priority: 1,
        title: "Homepage missing Organization schema",
        description:
          "Your homepage has no Organization structured data. This hurts brand knowledge panel in search.",
        action: JSON.stringify({
          type: "addSchema",
          page: "homepage",
          schemaType: "Organization",
        }),
        deduplicationKey: "schema:missing-org-schema",
      },
      {
        type: "insight",
        priority: 4,
        title: "FAQ schema could boost 5 collection pages",
        description:
          "Adding FAQ structured data to your top collection pages could enable rich FAQ snippets.",
        metadata: { eligiblePages: 5 },
        deduplicationKey: "schema:faq-opportunity",
      },
    ];
  },
};
