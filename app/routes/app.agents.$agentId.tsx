import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, data } from "react-router";
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
  const { agent, findings } = useLoaderData<typeof loader>();
  const runFetcher = useFetcher();
  const isRunning = runFetcher.state !== "idle";

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
