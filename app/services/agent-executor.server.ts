import type {
  Agent,
  AdminClient,
} from "../lib/agent-interface";
import { saveFindings, updateFindingStatus } from "./finding-storage.server";
import { logActivity } from "./activity-log.server";
import { getAgentTrustLevel } from "./agent-settings.server";
import { executeFix } from "./fix-executor.server";

const AGENT_TIMEOUT_MS = 30_000;

/** Runs a single agent with timeout protection and persists findings. */
export async function executeAgent(
  agent: Agent,
  shop: string,
  admin: AdminClient,
) {
  console.log(`[AgentExecutor] Starting ${agent.agentId} for ${shop}`);
  const startTime = Date.now();

  try {
    const findings = await Promise.race([
      agent.run(shop, admin),
      rejectAfterTimeout(AGENT_TIMEOUT_MS, agent.agentId),
    ]);

    if (!findings || findings.length === 0) {
      console.log(`[AgentExecutor] ${agent.agentId}: 0 findings`);
      return [];
    }

    const saved = await saveFindings(agent.agentId, shop, findings);
    const elapsed = Date.now() - startTime;
    console.log(
      `[AgentExecutor] ${agent.agentId}: ${saved.length} findings saved (${elapsed}ms)`,
    );

    await logActivity(
      shop,
      "agent_run",
      agent.agentId,
      `${agent.displayName} completed in ${elapsed}ms with ${saved.length} findings`,
      { findingsCount: saved.length, durationMs: elapsed },
    );

    // Autopilot: auto-apply fixable findings
    const trustLevel = await getAgentTrustLevel(shop, agent.agentId);
    if (trustLevel === "autopilot") {
      const fixable = saved.filter(
        (f) => f.action && f.status === "pending" && f.type === "action_needed",
      );
      for (const finding of fixable.slice(0, 5)) {
        try {
          const actionData = JSON.parse(finding.action!) as Record<string, unknown>;
          if (actionData.fixType === "manual_upload_image") continue;
          const result = await executeFix(actionData, admin);
          if (result.success) await updateFindingStatus(finding.id, "applied");
        } catch (e) {
          console.error(`[AgentExecutor] Auto-fix failed for ${finding.id}:`, e);
        }
      }
    }

    return saved;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(
      `[AgentExecutor] ${agent.agentId} failed after ${elapsed}ms:`,
      error,
    );
    throw error;
  }
}

/** Run ALL registered agents in parallel. Returns per-agent summary. */
export async function executeAllAgents(
  agents: Agent[],
  shop: string,
  admin: AdminClient,
) {
  const results = await Promise.allSettled(
    agents.map((agent) => executeAgent(agent, shop, admin)),
  );

  return agents.map((agent, i) => {
    const result = results[i];
    if (result.status === "fulfilled") {
      return {
        agentId: agent.agentId,
        success: true as const,
        findingsCount: result.value.length,
        findings: result.value,
      };
    }
    return {
      agentId: agent.agentId,
      success: false as const,
      error: (result.reason as Error).message,
    };
  });
}

function rejectAfterTimeout(ms: number, agentId: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`Agent "${agentId}" timed out after ${ms}ms`)),
      ms,
    ),
  );
}
