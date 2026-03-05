import { useFetcher, useRevalidator } from "react-router";
import { useEffect } from "react";

interface AgentStatusBarProps {
  agents: Array<{
    agentId: string;
    displayName: string;
    description: string;
  }>;
}

export function AgentStatusBar({ agents }: AgentStatusBarProps) {
  return (
    <s-stack direction="block" gap="base">
      {agents.map((agent) => (
        <AgentRow key={agent.agentId} agent={agent} />
      ))}
    </s-stack>
  );
}

function AgentRow({
  agent,
}: {
  agent: { agentId: string; displayName: string; description: string };
}) {
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const isRunning = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      revalidator.revalidate();
      shopify.toast.show(`${agent.displayName} finished`);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small">
        <s-text>
          <strong>{agent.displayName}</strong>
        </s-text>
        <s-paragraph>{agent.description}</s-paragraph>
        <s-button
          variant="secondary"
          onClick={() =>
            fetcher.submit(
              {},
              {
                method: "POST",
                action: `/app/api/agents/${agent.agentId}/run`,
              },
            )
          }
          {...(isRunning ? { loading: true } : {})}
        >
          Run
        </s-button>
      </s-stack>
    </s-box>
  );
}
