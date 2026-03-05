import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  validateToken,
  fetchAllReviews,
  syncReviewsToDb,
  registerWebhooks,
} from "../services/judgeme.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const apiToken = (formData.get("apiToken") as string)?.trim();

  if (!apiToken) {
    return data({ success: false, error: "API token is required" }, { status: 400 });
  }

  const shopDomain = shop;

  const valid = await validateToken(apiToken, shopDomain);
  if (!valid) {
    return data({
      success: false,
      error: "Invalid API token. Please check your Judge.me private token and try again.",
    }, { status: 400 });
  }

  const appUrl = process.env.SHOPIFY_APP_URL || "";
  const callbackUrl = `${appUrl}/webhooks/reviews`;

  const webhookIds = await registerWebhooks(apiToken, shopDomain, callbackUrl);

  await prisma.reviewSyncConfig.upsert({
    where: { shop },
    update: {
      apiToken,
      webhookIds,
      status: "active",
      updatedAt: new Date(),
    },
    create: {
      shop,
      provider: "judgeme",
      apiToken,
      webhookIds,
      status: "active",
    },
  });

  const reviews = await fetchAllReviews(apiToken, shopDomain);
  const synced = await syncReviewsToDb(reviews, shop);

  await prisma.reviewSyncConfig.update({
    where: { shop },
    data: {
      lastSyncedAt: new Date(),
      reviewCount: synced,
    },
  });

  return data({ success: true, synced });
};
