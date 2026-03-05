import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { removeWebhooks } from "../services/judgeme.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await prisma.reviewSyncConfig.findUnique({ where: { shop } });
  if (!config) {
    return data({ success: false, error: "No sync config found" }, { status: 404 });
  }

  const appUrl = process.env.SHOPIFY_APP_URL || "";
  const callbackUrl = `${appUrl}/webhooks/reviews`;
  await removeWebhooks(config.apiToken, shop, callbackUrl);

  await prisma.reviewSyncConfig.update({
    where: { shop },
    data: { status: "disconnected" },
  });

  return data({ success: true });
};
