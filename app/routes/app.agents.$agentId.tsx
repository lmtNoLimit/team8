import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useRevalidator, data } from "react-router";
import { useEffect } from "react";
import { authenticate } from "../shopify.server";
import { getFindings } from "../services/finding-storage.server";
import { getAgent } from "../agents/agent-registry.server";
import { isAgentEnabled } from "../services/agent-settings.server";
import prisma from "../db.server";
import { FindingCard } from "../components/finding-card";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { agentId } = params;

  if (!agentId) {
    throw data({ error: "Missing agentId" }, { status: 400 });
  }

  const agent = getAgent(agentId);
  if (!agent) {
    throw data({ error: `Agent "${agentId}" not found` }, { status: 404 });
  }

  const enabled = await isAgentEnabled(session.shop, agentId);
  if (!enabled) {
    throw data(
      { error: `Agent "${agentId}" is disabled for this shop` },
      { status: 403 },
    );
  }

  const findings = await getFindings(session.shop, { agentId });

  let syncConfig = null;
  let reviewsByProduct: {
    productId: string;
    productTitle: string;
    avgRating: number;
    reviewCount: number;
    latestDate: string;
  }[] = [];

  if (agentId === "review") {
    syncConfig = await prisma.reviewSyncConfig.findUnique({
      where: { shop: session.shop },
    });

    const reviews = await prisma.review.findMany({
      where: { shop: session.shop },
      orderBy: { reviewDate: "desc" },
    });

    const grouped = new Map<string, {
      productId: string;
      productTitle: string;
      totalRating: number;
      count: number;
      latestDate: Date;
    }>();

    for (const r of reviews) {
      const existing = grouped.get(r.productId);
      if (existing) {
        existing.totalRating += r.rating;
        existing.count++;
        if (r.reviewDate > existing.latestDate) {
          existing.latestDate = r.reviewDate;
        }
      } else {
        grouped.set(r.productId, {
          productId: r.productId,
          productTitle: r.productTitle,
          totalRating: r.rating,
          count: 1,
          latestDate: r.reviewDate,
        });
      }
    }

    reviewsByProduct = Array.from(grouped.values()).map((g) => ({
      productId: g.productId,
      productTitle: g.productTitle,
      avgRating: Math.round((g.totalRating / g.count) * 10) / 10,
      reviewCount: g.count,
      latestDate: g.latestDate.toISOString(),
    }));
  }

  return {
    agent: {
      agentId: agent.agentId,
      displayName: agent.displayName,
      description: agent.description,
    },
    findings,
    syncConfig: syncConfig ? {
      status: syncConfig.status,
      provider: syncConfig.provider,
      reviewCount: syncConfig.reviewCount,
      lastSyncedAt: syncConfig.lastSyncedAt?.toISOString() ?? null,
    } : null,
    reviewsByProduct,
  };
};

export default function AgentDetailPage() {
  const { agent, findings, syncConfig, reviewsByProduct } = useLoaderData<typeof loader>();
  const runFetcher = useFetcher();
  const revalidator = useRevalidator();
  const isRunning = runFetcher.state !== "idle";

  useEffect(() => {
    if (runFetcher.state === "idle" && runFetcher.data) {
      revalidator.revalidate();
      shopify.toast.show(`${agent.displayName} finished running`);
    }
  }, [runFetcher.state, runFetcher.data]);

  const actionNeeded = findings.filter((f) => f.type === "action_needed");
  const done = findings.filter((f) => f.type === "done");
  const insights = findings.filter((f) => f.type === "insight");

  return (
    <s-page heading={agent.displayName}>
      <s-link slot="breadcrumb-actions" href="/app/agents">My Team</s-link>
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() =>
          runFetcher.submit(
            {},
            { method: "POST", action: `/app/api/agents/${agent.agentId}/run` },
          )
        }
        {...(isRunning ? { loading: true } : {})}
      >
        Run Now
      </s-button>

      <s-banner tone="info">{agent.description}</s-banner>

      {agent.agentId === "review" && (
        !syncConfig || syncConfig.status === "disconnected"
          ? <JudgeMeSetupBanner />
          : <JudgeMeConnectedBanner syncConfig={syncConfig} />
      )}

      {agent.agentId === "review" && reviewsByProduct.length > 0 && (
        <s-section heading={`Reviews by Product (${reviewsByProduct.length} products)`}>
          <s-box>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e1e3e5", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Product</th>
                  <th style={{ padding: "12px 16px" }}>Avg Rating</th>
                  <th style={{ padding: "12px 16px" }}>Reviews</th>
                  <th style={{ padding: "12px 16px" }}>Latest Review</th>
                </tr>
              </thead>
              <tbody>
                {reviewsByProduct.map((product) => (
                  <tr key={product.productId} style={{ borderBottom: "1px solid #f1f2f3" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <s-text><strong>{product.productTitle}</strong></s-text>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <s-badge tone={product.avgRating >= 4 ? "success" : product.avgRating >= 3 ? "warning" : "critical"}>
                        {"★".repeat(Math.round(product.avgRating))} {product.avgRating}/5
                      </s-badge>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <s-text>{product.reviewCount}</s-text>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <s-text>{new Date(product.latestDate).toLocaleDateString()}</s-text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </s-box>
        </s-section>
      )}

      {findings.length === 0 ? (
        <s-section heading="No Findings">
          <s-paragraph>
            This agent hasn&apos;t produced any findings yet. Click &quot;Run Now&quot; to
            start.
          </s-paragraph>
        </s-section>
      ) : (
        <>
          {actionNeeded.length > 0 && (
            <s-section heading={`Needs Decision (${actionNeeded.length})`}>
              <s-stack direction="block" gap="base">
                {actionNeeded.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </s-stack>
            </s-section>
          )}
          {done.length > 0 && (
            <s-section heading={`Handled (${done.length})`}>
              <s-stack direction="block" gap="base">
                {done.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </s-stack>
            </s-section>
          )}
          {insights.length > 0 && (
            <s-section heading={`Insights (${insights.length})`}>
              <s-stack direction="block" gap="base">
                {insights.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </s-stack>
            </s-section>
          )}
        </>
      )}

      <s-section slot="aside" heading="Agent Info">
        <s-paragraph>
          <s-text><strong>ID:</strong></s-text> {agent.agentId}
        </s-paragraph>
        <s-paragraph>
          <s-text><strong>Total Findings:</strong></s-text> {findings.length}
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

function JudgeMeSetupBanner() {
  const connectFetcher = useFetcher();
  const isConnecting = connectFetcher.state !== "idle";
  const connectResult = connectFetcher.data as { success?: boolean; error?: string; synced?: number } | null;

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="base">
        <s-text><strong>Connect Judge.me to sync your product reviews</strong></s-text>
        <s-paragraph>
          Connect your Judge.me account to automatically import and monitor all your product reviews. This is a one-time setup.
        </s-paragraph>

        <s-banner tone="info">
          <s-stack direction="block" gap="small">
            <s-text><strong>How to find your Judge.me API token:</strong></s-text>
            <s-paragraph>
              1. Open <strong>Judge.me</strong> from your Shopify Admin sidebar (under Apps)
            </s-paragraph>
            <s-paragraph>
              2. Click <strong>Settings</strong> in the Judge.me navigation
            </s-paragraph>
            <s-paragraph>
              3. Click <strong>Integrations</strong>
            </s-paragraph>
            <s-paragraph>
              4. Find the API section and click <strong>View API token</strong>
            </s-paragraph>
            <s-paragraph>
              5. Copy the <strong>private API token</strong> (not the public one) and paste it below
            </s-paragraph>
          </s-stack>
        </s-banner>

        <connectFetcher.Form method="post" action="/app/api/reviews/connect">
          <s-stack direction="block" gap="small">
            <s-text-field
              label="Judge.me Private API Token"
              name="apiToken"
              placeholder="e.g. abc123def456..."
              autocomplete="off"
            />
            <s-button
              variant="primary"
              type="submit"
              {...(isConnecting ? { loading: true } : {})}
            >
              {isConnecting ? "Connecting & syncing reviews..." : "Connect Judge.me"}
            </s-button>
          </s-stack>
        </connectFetcher.Form>

        {connectResult?.error && (
          <s-banner tone="critical">{connectResult.error}</s-banner>
        )}
        {connectResult?.success && connectResult.synced === 0 && (
          <s-banner tone="warning">
            Connected successfully, but no reviews were found. If you have reviews in Judge.me, they may take a moment to appear. Try running the agent after a few minutes.
          </s-banner>
        )}
        {connectResult?.success && (connectResult.synced ?? 0) > 0 && (
          <s-banner tone="success">
            Connected! {connectResult.synced} reviews synced from Judge.me.
          </s-banner>
        )}
      </s-stack>
    </s-box>
  );
}

function JudgeMeConnectedBanner({ syncConfig }: {
  syncConfig: { status: string; provider: string; reviewCount: number; lastSyncedAt: string | null };
}) {
  const disconnectFetcher = useFetcher();
  const isDisconnecting = disconnectFetcher.state !== "idle";

  return (
    <s-banner tone="success">
      <s-stack direction="block" gap="small">
        <s-text>
          <strong>Judge.me connected</strong> — {syncConfig.reviewCount} reviews synced
          {syncConfig.lastSyncedAt && ` (last sync: ${new Date(syncConfig.lastSyncedAt).toLocaleDateString()})`}
        </s-text>
        <disconnectFetcher.Form method="post" action="/app/api/reviews/disconnect">
          <s-button variant="tertiary" type="submit" {...(isDisconnecting ? { loading: true } : {})}>
            Disconnect
          </s-button>
        </disconnectFetcher.Form>
      </s-stack>
    </s-banner>
  );
}
