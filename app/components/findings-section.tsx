import { FindingCard } from "./finding-card";

interface FindingsSectionProps {
  heading: string;
  findings: Array<{
    id: string;
    agentId: string;
    type: string;
    priority: number;
    title: string;
    description: string;
    action?: string | null;
    status: string;
    metadata?: unknown;
  }>;
  emptyMessage: string;
  trustMap?: Record<string, string>;
  trustLevel?: "advisor" | "assistant" | "autopilot";
}

export function FindingsSection({
  heading,
  findings,
  emptyMessage,
  trustMap,
  trustLevel,
}: FindingsSectionProps) {
  return (
    <s-section heading={`${heading} (${findings.length})`}>
      {findings.length === 0 ? (
        <s-paragraph>{emptyMessage}</s-paragraph>
      ) : (
        <s-stack direction="block" gap="base">
          {findings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              trustLevel={
                trustLevel ??
                (trustMap?.[finding.agentId] as "advisor" | "assistant" | "autopilot") ??
                "assistant"
              }
            />
          ))}
        </s-stack>
      )}
    </s-section>
  );
}
