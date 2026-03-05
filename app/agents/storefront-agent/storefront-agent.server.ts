import type {
  Agent,
  AdminClient,
  AgentFindingInput,
} from "../../lib/agent-interface";

/**
 * Storefront Agent -- Store Quality Monitoring
 * Checks live storefront for rendering issues, image quality, mobile UX.
 *
 * STUB: Replace with real implementation.
 * Owner: Developer E
 */
export const storefrontAgent: Agent = {
  agentId: "storefront",
  displayName: "Storefront QA",
  description: "Monitors live storefront quality, rendering, and UX issues",

  async run(_shop: string, _admin: AdminClient): Promise<AgentFindingInput[]> {
    return [
      {
        type: "action_needed",
        priority: 2,
        title: "'Red Sneakers' page has 52% bounce rate",
        description:
          "Significantly above store average (31%). Suggest improving hero image and adding size FAQ.",
        action: JSON.stringify({
          type: "optimizePage",
          handle: "red-sneakers",
        }),
        metadata: {
          bounceRate: 0.52,
          storeAvg: 0.31,
          pageHandle: "red-sneakers",
        },
        deduplicationKey: "storefront:high-bounce-red-sneakers",
      },
      {
        type: "done",
        priority: 4,
        title: "All product images pass quality check",
        description:
          "Scanned 89 product images. All meet minimum resolution (800x800) and load under 3s.",
        metadata: { imagesScanned: 89 },
        deduplicationKey: "storefront:image-quality-check",
      },
      {
        type: "insight",
        priority: 3,
        title: "Mobile checkout takes 4.2s to load (target: < 3s)",
        description:
          "Mobile checkout performance is below target. Main bottleneck: unoptimized JavaScript bundle.",
        metadata: { loadTime: 4.2, target: 3.0, bottleneck: "js-bundle" },
        deduplicationKey: "storefront:mobile-checkout-speed",
      },
    ];
  },
};
