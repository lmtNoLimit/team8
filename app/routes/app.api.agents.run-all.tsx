import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { getAllAgents } from "../agents/agent-registry.server";
import { getEnabledAgentIds } from "../services/agent-settings.server";
import { executeAllAgents } from "../services/agent-executor.server";
import { getAgentTrustLevel } from "../services/agent-settings.server";
import { updateFindingStatus } from "../services/finding-storage.server";
import { logActivity } from "../services/activity-log.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const enabledIds = await getEnabledAgentIds(session.shop);
  const agents = getAllAgents().filter((a) => enabledIds.includes(a.agentId));

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

  return data({ success: true, results });
};
