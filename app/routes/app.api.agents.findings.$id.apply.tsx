import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { updateFindingStatus } from "../services/finding-storage.server";
import { getAgentTrustLevel } from "../services/agent-settings.server";
import { executeFix } from "../services/fix-executor.server";
import prisma from "../db.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    return data({ error: "Missing finding ID" }, { status: 400 });
  }

  const finding = await prisma.agentFinding.findUnique({ where: { id } });

  if (!finding || finding.shop !== session.shop) {
    return data({ error: "Finding not found" }, { status: 404 });
  }

  if (!finding.action) {
    return data({ error: "This finding has no associated fix" }, { status: 400 });
  }

  const trustLevel = await getAgentTrustLevel(session.shop, finding.agentId);
  if (trustLevel === "advisor") {
    return data(
      { error: "Cannot apply fixes in advisor mode. Change trust level in Settings." },
      { status: 403 },
    );
  }

  try {
    const actionData = JSON.parse(finding.action) as Record<string, unknown>;
    const result = await executeFix(actionData, admin);

    if (result.success) {
      await updateFindingStatus(id, "applied");
    }

    return data(result);
  } catch (error) {
    return data(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
};
