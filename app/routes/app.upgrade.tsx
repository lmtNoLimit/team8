import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import { getShopPlan, getUsageSummary } from "../services/billing.server";
import { PlanComparisonTable } from "../components/plan-comparison-table";
import type { PlanTier } from "../lib/plan-config";
import { useEffect, useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [plan, usage] = await Promise.all([
    getShopPlan(session.shop),
    getUsageSummary(session.shop),
  ]);
  return { currentTier: plan.tier, usage };
};

export default function UpgradePage() {
  const { currentTier, usage } = useLoaderData<typeof loader>();
  const subscribeFetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "true";
  const error = searchParams.get("error");
  const withTrial = searchParams.get("trial") === "true";
  const isSubmitting = subscribeFetcher.state !== "idle";
  const [redirecting, setRedirecting] = useState(false);

  const fetcherData = subscribeFetcher.data as {
    confirmationUrl?: string;
    error?: string;
    cancelled?: boolean;
  } | null;

  // Redirect to Shopify billing approval in parent frame
  useEffect(() => {
    if (fetcherData?.confirmationUrl && !redirecting) {
      setRedirecting(true);
      window.top!.location.href = fetcherData.confirmationUrl;
    }
  }, [fetcherData?.confirmationUrl, redirecting]);

  function handleSelectPlan(tier: PlanTier) {
    if (tier === "free") {
      subscribeFetcher.submit(
        { _action: "cancel" },
        { method: "POST", action: "/app/api/billing/subscribe" },
      );
    } else {
      subscribeFetcher.submit(
        { tier, trial: withTrial ? "true" : "false" },
        { method: "POST", action: "/app/api/billing/subscribe" },
      );
    }
  }

  const runsDisplay =
    usage.limits.maxRunsPerWeek === -1
      ? "Unlimited"
      : `${usage.runsUsed} / ${usage.limits.maxRunsPerWeek}`;

  const productsDisplay =
    usage.limits.maxProducts === -1
      ? `${usage.productCount} (Unlimited)`
      : `${usage.productCount} / ${usage.limits.maxProducts}`;

  return (
    <s-page heading="Choose Your Plan">
      <s-link slot="breadcrumb-actions" href="/app">
        Home
      </s-link>

      {success && (
        <s-banner tone="success">
          Plan updated successfully! Your new features are now active.
        </s-banner>
      )}
      {error && (
        <s-banner tone="critical">
          Something went wrong: {error}. Please try again.
        </s-banner>
      )}
      {fetcherData?.error && (
        <s-banner tone="critical">{fetcherData.error}</s-banner>
      )}
      {fetcherData?.cancelled && (
        <s-banner tone="success">
          Subscription cancelled. You are now on the Free plan.
        </s-banner>
      )}
      <s-stack direction="block" gap="base">
        <s-section>
          <s-text>
            Pick the plan that fits your store. Upgrade or downgrade anytime.
          </s-text>
        </s-section>

        <PlanComparisonTable
          currentTier={currentTier}
          onSelectPlan={handleSelectPlan}
          isSubmitting={isSubmitting || redirecting}
        />

        <s-section heading="Current Usage">
          <s-stack direction="inline" gap="base">
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small">
                <s-text>
                  <strong>Runs this week</strong>
                </s-text>
                <s-text>{runsDisplay}</s-text>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small">
                <s-text>
                  <strong>Products</strong>
                </s-text>
                <s-text>{productsDisplay}</s-text>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small">
                <s-text>
                  <strong>Agents</strong>
                </s-text>
                <s-text>{usage.limits.maxAgents} available</s-text>
              </s-stack>
            </s-box>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}
