import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, data } from "react-router";
import { authenticate } from "../shopify.server";
import { getStoreProfile, updateStoreProfile } from "../services/store-profile.server";
import {
  getAgentSettings,
  updateAgentTrustLevel,
  toggleAgentEnabled,
  type TrustLevel,
} from "../services/agent-settings.server";
import { getAgent } from "../agents/agent-registry.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [profile, agentSettings] = await Promise.all([
    getStoreProfile(session.shop),
    getAgentSettings(session.shop),
  ]);
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const reviewSyncConfig = await prisma.reviewSyncConfig.findUnique({
    where: { shop: session.shop },
  });
  return {
    profile,
    agentSettings,
    hasAnthropicKey,
    reviewSync: reviewSyncConfig ? {
      status: reviewSyncConfig.status,
      reviewCount: reviewSyncConfig.reviewCount,
      lastSyncedAt: reviewSyncConfig.lastSyncedAt?.toISOString() ?? null,
    } : null,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;

  if (actionType === "update_profile") {
    await updateStoreProfile(session.shop, {
      storeName: formData.get("storeName") as string,
      industry: formData.get("industry") as string,
      targetAudience: formData.get("targetAudience") as string,
      storeDescription: formData.get("storeDescription") as string,
    });
    return data({ success: true, action: "profile" });
  }

  if (actionType === "update_trust_level") {
    const agentId = formData.get("agentId") as string;
    const trustLevel = formData.get("trustLevel") as string;
    if (!agentId || !getAgent(agentId)) {
      return data({ success: false, error: "Invalid agentId" }, { status: 400 });
    }
    if (!VALID_TRUST_LEVELS.has(trustLevel)) {
      return data({ success: false, error: "Invalid trust level" }, { status: 400 });
    }
    await updateAgentTrustLevel(session.shop, agentId, trustLevel as TrustLevel);
    return data({ success: true, action: "trust_level", agentId });
  }

  if (actionType === "update_briefing") {
    await updateStoreProfile(session.shop, {
      briefingEmail: (formData.get("briefingEmail") as string) || undefined,
      briefingEnabled: formData.get("briefingEnabled") === "true",
    });
    return data({ success: true, action: "briefing" });
  }

  if (actionType === "toggle_enabled") {
    const agentId = formData.get("agentId") as string;
    if (!agentId || !getAgent(agentId)) {
      return data({ success: false, error: "Invalid agentId" }, { status: 400 });
    }
    const enabled = formData.get("enabled") === "true";
    await toggleAgentEnabled(session.shop, agentId, enabled);
    return data({ success: true, action: "toggle_enabled", agentId });
  }

  return data({ success: false, error: "Unknown action" }, { status: 400 });
};

const VALID_TRUST_LEVELS = new Set<string>(["advisor", "assistant", "autopilot"]);

const TRUST_LEVELS: { value: TrustLevel; label: string; description: string }[] = [
  {
    value: "advisor",
    label: "Advisor",
    description: "Recommend only. You review and decide.",
  },
  {
    value: "assistant",
    label: "Assistant",
    description: "Recommends with one-click apply. You approve.",
  },
  {
    value: "autopilot",
    label: "Autopilot",
    description: "Handles tasks automatically. You review after.",
  },
];

export default function SettingsPage() {
  const { profile, agentSettings, hasAnthropicKey, reviewSync } = useLoaderData<typeof loader>();
  const profileFetcher = useFetcher();
  const isSavingProfile = profileFetcher.state !== "idle";
  const profileSaved =
    profileFetcher.data != null &&
    (profileFetcher.data as { action?: string }).action === "profile";

  return (
    <s-page heading="Settings">
      <s-section heading="Store Profile">
        <s-paragraph>
          Tell your AI team about your store. This context helps agents give
          better, more relevant recommendations.
        </s-paragraph>
        <profileFetcher.Form method="post">
          <input type="hidden" name="_action" value="update_profile" />
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Store Name"
              name="storeName"
              defaultValue={profile.storeName ?? ""}
            />
            <s-text-field
              label="Industry / Niche"
              name="industry"
              defaultValue={profile.industry ?? ""}
              placeholder="e.g. Fashion, Electronics, Home & Garden"
            />
            <s-text-field
              label="Target Audience"
              name="targetAudience"
              defaultValue={profile.targetAudience ?? ""}
              placeholder="e.g. Women 25-40, eco-conscious shoppers"
            />
            <s-text-field
              label="Store Description"
              name="storeDescription"
              defaultValue={profile.storeDescription ?? ""}
              placeholder="Brief description of what you sell and your unique value"
            />
            <s-stack direction="inline" gap="small">
              <s-button
                variant="primary"
                type="submit"
                {...(isSavingProfile ? { loading: true } : {})}
              >
                Save Profile
              </s-button>
              {profileSaved && (
                <s-badge tone="success">Saved</s-badge>
              )}
            </s-stack>
          </s-stack>
        </profileFetcher.Form>
      </s-section>

      <s-section heading="Agent Configuration">
        <s-paragraph>
          Enable or disable agents and control their autonomy level. Disabled
          agents won&apos;t run or appear in your briefing.
        </s-paragraph>
        <s-stack direction="block" gap="base">
          {agentSettings.map((agent) => (
            <AgentTrustControl key={agent.agentId} agent={agent} />
          ))}
        </s-stack>
      </s-section>

      <s-section heading="Morning Briefing Email">
        <s-paragraph>
          Get your daily briefing delivered to your inbox every morning.
          No need to open Shopify — your top priorities come to you.
        </s-paragraph>
        <BriefingEmailConfig
          email={profile.briefingEmail ?? ""}
          enabled={profile.briefingEnabled ?? false}
        />
      </s-section>

      <s-section heading="API Configuration">
        <s-stack direction="block" gap="small">
          <s-paragraph>
            <s-text>
              <strong>Anthropic API:</strong>
            </s-text>{" "}
            {hasAnthropicKey ? (
              <s-badge tone="success">Connected</s-badge>
            ) : (
              <s-badge tone="critical">Not configured</s-badge>
            )}
          </s-paragraph>
          <s-paragraph>
            API keys are managed via environment variables. Contact your
            administrator to update.
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Review Sync (Judge.me)">
        {reviewSync && reviewSync.status === "active" ? (
          <s-stack direction="block" gap="small">
            <s-paragraph>
              <s-badge tone="success">Connected</s-badge>{" "}
              {reviewSync.reviewCount} reviews synced
              {reviewSync.lastSyncedAt && ` — last sync: ${new Date(reviewSync.lastSyncedAt).toLocaleDateString()}`}
            </s-paragraph>
            <s-paragraph>
              Manage your connection on the{" "}
              <s-link href="/app/agents/review">Review Analyst page</s-link>.
            </s-paragraph>
          </s-stack>
        ) : (
          <s-stack direction="block" gap="small">
            <s-paragraph>
              <s-badge tone="critical">Not connected</s-badge>
            </s-paragraph>
            <s-paragraph>
              Connect Judge.me to automatically sync your product reviews.{" "}
              <s-link href="/app/agents/review">Set up on the Review Analyst page</s-link>.
            </s-paragraph>
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

function BriefingEmailConfig({
  email,
  enabled,
}: {
  email: string;
  enabled: boolean;
}) {
  const fetcher = useFetcher();
  const testFetcher = useFetcher();
  const isSaving = fetcher.state !== "idle";
  const saved =
    fetcher.data != null &&
    (fetcher.data as { action?: string }).action === "briefing";
  const isSending = testFetcher.state !== "idle";
  const testResult = testFetcher.data as { success?: boolean; reason?: string } | null;

  return (
    <s-stack direction="block" gap="base">
      <fetcher.Form method="post">
        <input type="hidden" name="_action" value="update_briefing" />
        <s-stack direction="block" gap="base">
          <s-text-field
            label="Email address"
            name="briefingEmail"
            defaultValue={email}
            placeholder="you@example.com"
          />
          <s-choice-list name="briefingEnabled">
            <s-choice
              value="true"
              {...(enabled ? { selected: true } : {})}
            >
              Send me a daily morning briefing
            </s-choice>
          </s-choice-list>
          <s-stack direction="inline" gap="small">
            <s-button
              variant="primary"
              type="submit"
              {...(isSaving ? { loading: true } : {})}
            >
              Save
            </s-button>
            {saved && <s-badge tone="success">Saved</s-badge>}
          </s-stack>
        </s-stack>
      </fetcher.Form>

      {enabled && email && (
        <s-stack direction="inline" gap="small">
          <s-button
            variant="secondary"
            onClick={() =>
              testFetcher.submit(
                {},
                { method: "POST", action: "/app/api/briefing/send" },
              )
            }
            {...(isSending ? { loading: true } : {})}
          >
            Send Test Email
          </s-button>
          {testResult?.success && <s-badge tone="success">Sent!</s-badge>}
          {testResult && !testResult.success && (
            <s-badge tone="critical">{testResult.reason || "Failed"}</s-badge>
          )}
        </s-stack>
      )}
    </s-stack>
  );
}

function AgentTrustControl({
  agent,
}: {
  agent: {
    agentId: string;
    displayName: string;
    description: string;
    trustLevel: TrustLevel;
    enabled: boolean;
  };
}) {
  const fetcher = useFetcher();
  const toggleFetcher = useFetcher();
  const isSaving = fetcher.state !== "idle" || toggleFetcher.state !== "idle";

  const optimisticEnabled =
    toggleFetcher.formData
      ? toggleFetcher.formData.get("enabled") === "true"
      : agent.enabled;

  const fetcherData = fetcher.data as { agentId?: string } | null;
  const toggleData = toggleFetcher.data as { agentId?: string } | null;
  const saved =
    (fetcherData?.agentId === agent.agentId) ||
    (toggleData?.agentId === agent.agentId);

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small">
        <s-stack direction="inline" gap="small">
          <s-checkbox
            label={agent.displayName}
            {...(optimisticEnabled ? { checked: true } : {})}
            onChange={() => {
              const formData = new FormData();
              formData.set("_action", "toggle_enabled");
              formData.set("agentId", agent.agentId);
              formData.set("enabled", String(!optimisticEnabled));
              toggleFetcher.submit(formData, { method: "post" });
            }}
          />
          {!optimisticEnabled && <s-badge tone="critical">Disabled</s-badge>}
          {saved && <s-badge tone="success">Updated</s-badge>}
          {isSaving && <s-badge>Saving...</s-badge>}
        </s-stack>
        <s-paragraph>{agent.description}</s-paragraph>
        {optimisticEnabled && (
          <s-choice-list
            name={`trust-${agent.agentId}`}
            onChange={(e: Event) => {
              const target = e.currentTarget as HTMLElement & { values: string[] };
              const newLevel = target.values[0];
              if (newLevel && newLevel !== agent.trustLevel) {
                const formData = new FormData();
                formData.set("_action", "update_trust_level");
                formData.set("agentId", agent.agentId);
                formData.set("trustLevel", newLevel);
                fetcher.submit(formData, { method: "post" });
              }
            }}
          >
            {TRUST_LEVELS.map((level) => (
              <s-choice
                key={level.value}
                value={level.value}
                {...(level.value === agent.trustLevel ? { selected: true } : {})}
              >
                {level.label} — {level.description}
              </s-choice>
            ))}
          </s-choice-list>
        )}
      </s-stack>
    </s-box>
  );
}
