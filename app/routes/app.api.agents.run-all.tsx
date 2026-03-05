import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { getAllAgents } from "../agents/agent-registry.server";
import { getEnabledAgentIds } from "../services/agent-settings.server";
import { executeAllAgents } from "../services/agent-executor.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const enabledIds = await getEnabledAgentIds(session.shop);
  const agents = getAllAgents().filter((a) => enabledIds.includes(a.agentId));

  const results = await executeAllAgents(agents, session.shop, admin);

  return data({ success: true, results });
};
