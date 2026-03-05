import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, data } from "react-router";
import { authenticate } from "../shopify.server";
import { getStoreProfile, updateStoreProfile } from "../services/store-profile.server";
import {
  getAgentSettings,
  updateAgentTrustLevel,
  type TrustLevel,
} from "../services/agent-settings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [profile, agentSettings] = await Promise.all([
    getStoreProfile(session.shop),
    getAgentSettings(session.shop),
  ]);
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  return { profile, agentSettings, hasAnthropicKey };
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
    const trustLevel = formData.get("trustLevel") as TrustLevel;
    await updateAgentTrustLevel(session.shop, agentId, trustLevel);
    return data({ success: true, action: "trust_level", agentId });
  }

  return data({ success: false, error: "Unknown action" }, { status: 400 });
};

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
  const { profile, agentSettings, hasAnthropicKey } = useLoaderData<typeof loader>();
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

      <s-section heading="Agent Trust Levels">
        <s-paragraph>
          Control how much autonomy each agent has. Advisor mode is read-only.
          Assistant lets you apply with one click. Autopilot handles things
          automatically.
        </s-paragraph>
        <s-stack direction="block" gap="base">
          {agentSettings.map((agent) => (
            <AgentTrustControl key={agent.agentId} agent={agent} />
          ))}
        </s-stack>
      </s-section>

      <s-section heading="Notifications">
        <s-banner tone="info">
          Email briefings and notification preferences coming soon.
        </s-banner>
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
    </s-page>
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
  };
}) {
  const fetcher = useFetcher();
  const isSaving = fetcher.state !== "idle";
  const saved =
    fetcher.data != null &&
    (fetcher.data as { agentId?: string }).agentId === agent.agentId;

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small">
        <s-stack direction="inline" gap="small">
          <s-text>
            <strong>{agent.displayName}</strong>
          </s-text>
          {saved && <s-badge tone="success">Updated</s-badge>}
          {isSaving && <s-badge>Saving...</s-badge>}
        </s-stack>
        <s-paragraph>{agent.description}</s-paragraph>
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
      </s-stack>
    </s-box>
  );
}
