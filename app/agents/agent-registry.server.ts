import type { Agent } from "../lib/agent-interface";

import { inventoryAgent } from "./inventory-agent/inventory-agent.server";
import { storefrontAgent } from "./storefront-agent/storefront-agent.server";
import { reviewAgent } from "./review-agent/review-agent.server";
import { trendAgent } from "./trend-agent/trend-agent.server";

/** Metadata-only type for agents not yet implemented */
export interface ComingSoonAgent {
  readonly agentId: string;
  readonly displayName: string;
  readonly description: string;
}

/**
 * Central agent registry. All agents registered via explicit imports.
 *
 * To add a new agent:
 * 1. Create folder app/agents/{name}-agent/
 * 2. Export an Agent-conforming object from {name}-agent.server.ts
 * 3. Import + add to agentList below
 */
const agentList: Agent[] = [
  inventoryAgent,
  storefrontAgent,
  reviewAgent,
  trendAgent,
];

/** Agents announced but not yet implemented */
const comingSoonList: ComingSoonAgent[] = [
  {
    agentId: "churn",
    displayName: "Churn Risk Analyzer",
    description:
      "Predicts customer churn via RFM analysis and triggers win-back campaigns before customers go silent.",
  },
  {
    agentId: "revenue-detective",
    displayName: "Revenue Detective",
    description:
      "Explains WHY your sales changed with root cause breakdown and confidence scores.",
  },
  {
    agentId: "cart-recovery",
    displayName: "Cart Recovery Orchestrator",
    description:
      "Personalizes abandoned cart recovery — optimal timing, channel, and incentive based on customer history and margins.",
  },
  {
    agentId: "return-flow",
    displayName: "Return Flow Optimizer",
    description:
      "Classifies returns as resaleable, repairable, or liquidation and automates refund decisions based on cost and velocity.",
  },
  {
    agentId: "product-performance",
    displayName: "Product Performance Analyzer",
    description:
      "Weekly SKU audit covering momentum, margins, and bundle opportunities. Flags underperformers with root causes.",
  },
  {
    agentId: "rfm-segmentation",
    displayName: "RFM Segmentation Engine",
    description:
      "Auto-segments customers into VIP, Loyal, At-Risk, New, and Dormant tiers with tailored offers per segment.",
  },
  {
    agentId: "order-risk",
    displayName: "Order Risk Analyzer",
    description:
      "Layers custom fraud rules on Shopify ML — order size, customer age, velocity, and address mismatch with explainability.",
  },
  {
    agentId: "privacy-audit",
    displayName: "Privacy Audit Agent",
    description:
      "Scans installed apps and theme scripts for GDPR/CCPA violations. Validates consent flows and privacy policies.",
  },
];

const agentMap = new Map<string, Agent>(
  agentList.map((a) => [a.agentId, a]),
);

/** Get a single agent by ID */
export function getAgent(agentId: string): Agent | undefined {
  return agentMap.get(agentId);
}

/** Get all registered agents */
export function getAllAgents(): Agent[] {
  return agentList;
}

/** Get agent metadata (for UI listing) */
export function listAgents() {
  return agentList.map((a) => ({
    agentId: a.agentId,
    displayName: a.displayName,
    description: a.description,
  }));
}

/** Get coming soon agents metadata (for UI listing) */
export function listComingSoonAgents(): ComingSoonAgent[] {
  return comingSoonList;
}
