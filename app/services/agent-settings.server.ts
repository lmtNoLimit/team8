import prisma from "../db.server";
import { listAgents } from "../agents/agent-registry.server";

export type TrustLevel = "advisor" | "assistant" | "autopilot";

export async function getAgentSettings(shop: string) {
  const agents = listAgents();
  const existing = await prisma.agentSetting.findMany({ where: { shop } });
  const settingsMap = new Map(existing.map((s) => [s.agentId, s]));

  // Return settings for all registered agents, creating defaults for missing ones
  return agents.map((agent) => {
    const setting = settingsMap.get(agent.agentId);
    return {
      agentId: agent.agentId,
      displayName: agent.displayName,
      description: agent.description,
      trustLevel: (setting?.trustLevel as TrustLevel) ?? "advisor",
      enabled: setting?.enabled ?? true,
    };
  });
}

export async function updateAgentTrustLevel(
  shop: string,
  agentId: string,
  trustLevel: TrustLevel,
) {
  return prisma.agentSetting.upsert({
    where: { shop_agentId: { shop, agentId } },
    update: { trustLevel },
    create: { shop, agentId, trustLevel },
  });
}

export async function getAgentTrustLevel(
  shop: string,
  agentId: string,
): Promise<TrustLevel> {
  const setting = await prisma.agentSetting.findUnique({
    where: { shop_agentId: { shop, agentId } },
  });
  return (setting?.trustLevel as TrustLevel) ?? "advisor";
}
