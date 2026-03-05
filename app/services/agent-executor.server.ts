import type {
  Agent,
  AdminClient,
  AgentFindingInput,
} from "../lib/agent-interface";
import { saveFindings } from "./finding-storage.server";

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
        success: true,
        findingsCount: result.value.length,
      };
    }
    return {
      agentId: agent.agentId,
      success: false,
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
