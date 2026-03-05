import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { getAgent } from "../agents/agent-registry.server";
import {
  isAgentEnabled,
  getEnabledAgentIds,
} from "../services/agent-settings.server";
import { executeAgent } from "../services/agent-executor.server";
import {
  canRunAgents,
  incrementRunCount,
  decrementRunCount,
  getShopPlan,
} from "../services/billing.server";
import { getPlanLimits, type PlanTier } from "../lib/plan-config";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { agentId } = params;

  if (!agentId) {
    return data({ error: "Missing agentId" }, { status: 400 });
  }

  const agent = getAgent(agentId);
  if (!agent) {
    return data({ error: `Agent "${agentId}" not found` }, { status: 404 });
  }

  const enabled = await isAgentEnabled(session.shop, agentId);
  if (!enabled) {
    return data({ error: "Agent not enabled" }, { status: 403 });
  }

  // C-1 fix: enforce agent count limit on single agent runs too
  const plan = await getShopPlan(session.shop);
  const limits = getPlanLimits(plan.tier as PlanTier);
  const enabledIds = await getEnabledAgentIds(session.shop);
  const allowedIds = enabledIds.slice(0, limits.maxAgents);
  if (!allowedIds.includes(agentId)) {
    return data(
      {
        success: false,
        error: `Your ${plan.tier} plan allows ${limits.maxAgents} agents. This agent exceeds that limit.`,
        upgradeUrl: "/app/upgrade",
      },
      { status: 403 },
    );
  }

  // Plan gate
  const gate = await canRunAgents(session.shop);
  if (!gate.allowed) {
    return data(
      { success: false, error: gate.reason, upgradeUrl: "/app/upgrade" },
      { status: 403 },
    );
  }

  // RT-2: increment before execute
  await incrementRunCount(session.shop);

  try {
    const findings = await executeAgent(agent, session.shop, admin);
    return data({
      success: true,
      agentId,
      findingsCount: findings.length,
    });
  } catch (error) {
    await decrementRunCount(session.shop);
    return data(
      { success: false, agentId, error: (error as Error).message },
      { status: 500 },
    );
  }
};
