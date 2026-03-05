import prisma from "../db.server";
import { listAgents } from "../agents/agent-registry.server";
import {
  type PlanLimits,
  PlanLimitError,
} from "../lib/plan-config";

export type TrustLevel = "advisor" | "assistant" | "autopilot";

export async function getAgentSettings(shop: string) {
  const agents = listAgents();
  const existing = await prisma.agentSetting.findMany({ where: { shop } });
  const settingsMap = new Map(existing.map((s) => [s.agentId, s]));

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
  planLimits?: PlanLimits,
) {
  if (planLimits && !planLimits.allowedTrustLevels.includes(trustLevel)) {
    throw new PlanLimitError(
      `${trustLevel} mode requires ${trustLevel === "autopilot" ? "Pro" : "Starter"} plan or higher.`,
    );
  }

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

export async function toggleAgentEnabled(
  shop: string,
  agentId: string,
  enabled: boolean,
  planLimits?: PlanLimits,
) {
  if (enabled && planLimits) {
    const currentlyEnabled = await getEnabledAgentIds(shop);
    const otherEnabled = currentlyEnabled.filter((id) => id !== agentId);
    if (otherEnabled.length >= planLimits.maxAgents) {
      throw new PlanLimitError(
        `Your plan allows ${planLimits.maxAgents} agents. Upgrade to enable more.`,
      );
    }
  }

  return prisma.agentSetting.upsert({
    where: { shop_agentId: { shop, agentId } },
    update: { enabled },
    create: { shop, agentId, enabled },
  });
}

export async function getEnabledAgentIds(shop: string): Promise<string[]> {
  const agents = listAgents();
  const settings = await prisma.agentSetting.findMany({
    where: { shop },
    select: { agentId: true, enabled: true },
  });
  const settingsMap = new Map(settings.map((s) => [s.agentId, s.enabled]));
  return agents
    .map((a) => a.agentId)
    .filter((id) => settingsMap.get(id) ?? true);
}

export async function isAgentEnabled(
  shop: string,
  agentId: string,
): Promise<boolean> {
  const setting = await prisma.agentSetting.findUnique({
    where: { shop_agentId: { shop, agentId } },
  });
  return setting?.enabled ?? true;
}
