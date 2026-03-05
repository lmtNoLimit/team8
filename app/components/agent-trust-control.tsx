import { useFetcher } from "react-router";
import type { TrustLevel } from "../services/agent-settings.server";

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

interface AgentTrustControlProps {
  agent: {
    agentId: string;
    displayName: string;
    description: string;
    trustLevel: TrustLevel;
    enabled: boolean;
  };
  allowedTrustLevels: TrustLevel[];
  canEnable: boolean;
  currentTier: string;
}

export function AgentTrustControl({
  agent,
  allowedTrustLevels,
  canEnable,
}: AgentTrustControlProps) {
  const fetcher = useFetcher();
  const toggleFetcher = useFetcher();
  const isSaving = fetcher.state !== "idle" || toggleFetcher.state !== "idle";

  const optimisticEnabled = toggleFetcher.formData
    ? toggleFetcher.formData.get("enabled") === "true"
    : agent.enabled;

  const fetcherData = fetcher.data as { agentId?: string; error?: string; upgrade?: boolean } | null;
  const toggleData = toggleFetcher.data as { agentId?: string; error?: string; upgrade?: boolean } | null;
  const saved =
    (fetcherData?.agentId === agent.agentId && !fetcherData?.error) ||
    (toggleData?.agentId === agent.agentId && !toggleData?.error);
  const error = fetcherData?.error || toggleData?.error;

  const enableDisabled = !canEnable && !agent.enabled;

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small">
        <s-stack direction="inline" gap="small">
          <s-checkbox
            label={agent.displayName}
            {...(optimisticEnabled ? { checked: true } : {})}
            {...(enableDisabled ? { disabled: true } : {})}
            onChange={() => {
              if (enableDisabled) return;
              const formData = new FormData();
              formData.set("_action", "toggle_enabled");
              formData.set("agentId", agent.agentId);
              formData.set("enabled", String(!optimisticEnabled));
              toggleFetcher.submit(formData, { method: "post" });
            }}
          />
          {!optimisticEnabled && <s-badge tone="critical">Disabled</s-badge>}
          {enableDisabled && (
            <s-badge tone="warning">Plan Limit</s-badge>
          )}
          {saved && <s-badge tone="success">Updated</s-badge>}
          {isSaving && <s-badge>Saving...</s-badge>}
        </s-stack>
        <s-paragraph>{agent.description}</s-paragraph>
        {error && (
          <s-banner tone="warning">
            {error}{" "}
            <s-link href="/app/upgrade">View plans</s-link>
          </s-banner>
        )}
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
            {TRUST_LEVELS.map((level) => {
              const isLocked = !allowedTrustLevels.includes(level.value);
              return (
                <s-choice
                  key={level.value}
                  value={level.value}
                  {...(level.value === agent.trustLevel ? { selected: true } : {})}
                  {...(isLocked ? { disabled: true } : {})}
                >
                  {level.label} — {level.description}
                  {isLocked ? ` (Upgrade to unlock)` : ""}
                </s-choice>
              );
            })}
          </s-choice-list>
        )}
      </s-stack>
    </s-box>
  );
}
