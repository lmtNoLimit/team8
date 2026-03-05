import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import {
  createSubscription,
  cancelSubscription,
} from "../services/billing-mutations.server";
import {
  getShopPlan,
  updateShopPlan,
  downgradeToFree,
  enforcePlanLimits,
} from "../services/billing.server";
import { PLAN_LIMITS, type PlanTier } from "../lib/plan-config";

const PLAN_NAMES: Record<string, string> = {
  starter: "AI Secretary Starter",
  pro: "AI Secretary Pro",
  agency: "AI Secretary Agency",
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;

  // RT-6: Cancel / downgrade handler
  if (actionType === "cancel") {
    const existingPlan = await getShopPlan(session.shop);
    if (
      existingPlan.shopifySubscriptionId &&
      existingPlan.subscriptionStatus === "active"
    ) {
      try {
        await cancelSubscription(admin, existingPlan.shopifySubscriptionId);
      } catch (error) {
        return data(
          { error: (error as Error).message },
          { status: 500 },
        );
      }
    }
    await downgradeToFree(session.shop);
    await enforcePlanLimits(session.shop, "free");
    return data({ success: true, cancelled: true });
  }

  const tier = formData.get("tier") as string;
  const withTrial = formData.get("trial") === "true";

  if (!tier || !PLAN_NAMES[tier]) {
    return data({ error: "Invalid plan tier" }, { status: 400 });
  }

  if (tier === "free") {
    return data({ error: "Use cancel to downgrade to free" }, { status: 400 });
  }

  // RT-7: cancel existing active subscription before creating new
  const existingPlan = await getShopPlan(session.shop);
  if (
    existingPlan.shopifySubscriptionId &&
    existingPlan.subscriptionStatus === "active"
  ) {
    try {
      await cancelSubscription(admin, existingPlan.shopifySubscriptionId);
    } catch {
      // Continue — Shopify may auto-replace via new subscription
    }
  }

  const limits = PLAN_LIMITS[tier as PlanTier];
  const appUrl = process.env.SHOPIFY_APP_URL || "";
  const returnUrl = `${appUrl}/app/api/billing/callback?shop=${encodeURIComponent(session.shop)}`;

  try {
    const { subscriptionId, confirmationUrl } = await createSubscription(
      admin,
      {
        planName: PLAN_NAMES[tier],
        price: limits.price,
        returnUrl,
        trialDays: withTrial ? 7 : undefined,
        isAgency: tier === "agency",
      },
    );

    // M-1 fix: don't change tier here — callback derives tier from subscription name
    // Only store subscription ID + pending status so callback can verify
    await updateShopPlan(session.shop, {
      shopifySubscriptionId: subscriptionId,
      subscriptionStatus: "pending",
    });

    return data({ confirmationUrl });
  } catch (error) {
    return data({ error: (error as Error).message }, { status: 500 });
  }
};
