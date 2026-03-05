import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { updateFindingStatus } from "../services/finding-storage.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    return data({ error: "Missing finding ID" }, { status: 400 });
  }

  const formData = await request.formData();
  const status = formData.get("status") as string;

  if (!["pending", "applied", "dismissed"].includes(status)) {
    return data(
      { error: "Invalid status. Must be: pending, applied, dismissed" },
      { status: 400 },
    );
  }

  try {
    const updated = await updateFindingStatus(
      id,
      status as "pending" | "applied" | "dismissed",
    );
    return data({
      success: true,
      finding: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        agentId: updated.agentId,
      },
    });
  } catch (error) {
    return data(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
};
