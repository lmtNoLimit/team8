import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import type { PlanTier } from "../lib/plan-config";
import {
  getShopPlan,
  updateShopPlan,
  enforcePlanLimits,
} from "../services/billing.server";

// Reverse-map subscription name -> tier
const NAME_TO_TIER: Record<string, PlanTier> = {
  "AI Secretary Starter": "starter",
  "AI Secretary Pro": "pro",
  "AI Secretary Agency": "agency",
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  const subscription = payload.app_subscription;
  if (!subscription) return new Response();

  const status = subscription.status?.toLowerCase();
  const subscriptionGid = subscription.admin_graphql_api_id;
  const subscriptionName = subscription.name;

  console.log(`[Billing Webhook] ${shop}: subscription ${status} (${subscriptionName})`);

  const plan = await getShopPlan(shop);

  // Match by GID or find pending subscription being activated
  const isMatch = plan.shopifySubscriptionId === subscriptionGid;
  const isPendingActivation =
    status === "active" &&
    plan.subscriptionStatus === "pending" &&
    !isMatch;

  if (isMatch || isPendingActivation) {
    const updateData: Record<string, unknown> = {
      subscriptionStatus: status,
      shopifySubscriptionId: subscriptionGid,
    };

    if (status === "active" && subscriptionName) {
      // Derive tier from subscription name on activation
      const tier = NAME_TO_TIER[subscriptionName];
      if (tier) {
        updateData.tier = tier;
        updateData.trialEndsAt = null;
      }
    }

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
