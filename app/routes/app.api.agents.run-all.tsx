import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { getAllAgents } from "../agents/agent-registry.server";
import { getEnabledAgentIds } from "../services/agent-settings.server";
import { executeAllAgents } from "../services/agent-executor.server";
import { getAgentTrustLevel } from "../services/agent-settings.server";
import { updateFindingStatus } from "../services/finding-storage.server";
import { logActivity } from "../services/activity-log.server";
import {
  canRunAgents,
  incrementRunCount,
  decrementRunCount,
  getShopPlan,
} from "../services/billing.server";
import { getPlanLimits, type PlanTier } from "../lib/plan-config";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  // Plan gate
  const gate = await canRunAgents(session.shop);
  if (!gate.allowed) {
    return data(
      { success: false, error: gate.reason, upgradeUrl: "/app/upgrade" },
      { status: 403 },
    );
  }

  // RT-3: enforce agent count limit
  const plan = await getShopPlan(session.shop);
  const limits = getPlanLimits(plan.tier as PlanTier);
  const enabledIds = await getEnabledAgentIds(session.shop);
  const cappedIds = enabledIds.slice(0, limits.maxAgents);
  const agents = getAllAgents().filter((a) => cappedIds.includes(a.agentId));

  // RT-2: increment before execute
  await incrementRunCount(session.shop);

  try {
    const results = await executeAllAgents(agents, session.shop, admin);
    
    // Auto-apply findings for autopilot agents
    for (const result of results) {
      if (!result.success || !result.findings) continue;
      const trustLevel = await getAgentTrustLevel(session.shop, result.agentId);
      if (trustLevel !== "autopilot") continue;

      for (const finding of result.findings) {
        if (finding.type === "action_needed" && finding.status === "pending") {
          await updateFindingStatus(finding.id, "applied");
          await logActivity(
            session.shop,
            "agent_auto_executed",
            result.agentId,
            `Auto-applied: "${finding.title}"`,
            { findingId: finding.id },
          );
        }
      }
    }
    
    return data({
      success: true,
      results,
      usage: { runsUsed: (gate.runsUsed ?? 0) + 1, runsLimit: gate.runsLimit },
    });
  } catch (error) {
    // Rollback on failure
    await decrementRunCount(session.shop);
    return data(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
};
