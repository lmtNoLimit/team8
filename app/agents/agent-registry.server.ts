import type { Agent } from "../lib/agent-interface";

import { inventoryAgent } from "./inventory-agent/inventory-agent.server";
import { storefrontAgent } from "./storefront-agent/storefront-agent.server";
import { reviewAgent } from "./review-agent/review-agent.server";
import { trendAgent } from "./trend-agent/trend-agent.server";

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
