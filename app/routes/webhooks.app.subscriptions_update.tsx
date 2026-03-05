import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  getShopPlan,
  updateShopPlan,
  enforcePlanLimits,
} from "../services/billing.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  const subscription = payload.app_subscription;
  if (!subscription) return new Response();

  const status = subscription.status?.toLowerCase();
  const subscriptionGid = subscription.admin_graphql_api_id;

  console.log(`[Billing Webhook] ${shop}: subscription ${status}`);

  const plan = await getShopPlan(shop);

  // RT-11: strict match only — no null fallback
  if (plan.shopifySubscriptionId === subscriptionGid) {
    const updateData: Record<string, unknown> = {
      subscriptionStatus: status,
      shopifySubscriptionId: subscriptionGid,
    };

    if (status === "cancelled" || status === "expired") {
      updateData.tier = "free";
      updateData.shopifySubscriptionId = null;
      updateData.trialEndsAt = null;
      updateData.currentPeriodEnd = null;
    }

    await updateShopPlan(shop, updateData as Parameters<typeof updateShopPlan>[1]);

    // Enforce plan limits on downgrade
    if (status === "cancelled" || status === "expired") {
      await enforcePlanLimits(shop, "free");
    }
  }

  return new Response();
};
