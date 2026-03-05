import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { getAgent } from "../agents/agent-registry.server";
import { executeAgent } from "../services/agent-executor.server";

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

  try {
    const findings = await executeAgent(agent, session.shop, admin);
    return data({
      success: true,
      agentId,
      findingsCount: findings.length,
    });
  } catch (error) {
    return data(
      { success: false, agentId, error: (error as Error).message },
      { status: 500 },
    );
  }
};
