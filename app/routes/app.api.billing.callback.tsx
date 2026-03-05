import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getShopPlan, updateShopPlan } from "../services/billing.server";
import { getSubscriptionStatus } from "../services/billing-mutations.server";
import type { PlanTier } from "../lib/plan-config";

// Reverse-map subscription name -> tier
const NAME_TO_TIER: Record<string, PlanTier> = {
  "AI Secretary Starter": "starter",
  "AI Secretary Pro": "pro",
  "AI Secretary Agency": "agency",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Use Shopify's embedded-aware redirect (not react-router's)
  // so the merchant is properly redirected back into the admin iframe
  const { session, admin, redirect } = await authenticate.admin(request);
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");

  if (!chargeId) {
    return redirect("/app/upgrade?error=missing_params");
  }

  try {
    // C-2 fix: use stored GID for GraphQL query, not raw charge_id
    const plan = await getShopPlan(session.shop);
    const subscriptionGid = plan.shopifySubscriptionId;

    if (!subscriptionGid) {
      return redirect("/app/upgrade?error=no_pending_subscription");
    }

    const sub = await getSubscriptionStatus(admin, subscriptionGid);

    if (sub?.status === "ACTIVE") {
      // M-1 fix: derive tier from subscription name (not stored during subscribe)
      const tier = NAME_TO_TIER[sub.name] ?? plan.tier;

      await updateShopPlan(session.shop, {
        tier: tier as PlanTier,
        shopifySubscriptionId: subscriptionGid,
        subscriptionStatus: "active",
        // RT-5: clear trialEndsAt on paid conversion
        trialEndsAt: null,
        currentPeriodEnd: sub.currentPeriodEnd
          ? new Date(sub.currentPeriodEnd)
          : null,
      });
      return redirect("/app/upgrade?success=true");
    }

    // Not approved — revert to previous state
    await updateShopPlan(session.shop, {
      shopifySubscriptionId: null,
      subscriptionStatus: "active",
    });
    return redirect("/app/upgrade?error=not_approved");
  } catch {
    return redirect("/app/upgrade?error=verification_failed");
  }
};
