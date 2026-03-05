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
  }>;
  emptyMessage: string;
}

export function FindingsSection({
  heading,
  findings,
  emptyMessage,
}: FindingsSectionProps) {
  return (
    <s-section heading={`${heading} (${findings.length})`}>
      {findings.length === 0 ? (
        <s-paragraph>{emptyMessage}</s-paragraph>
      ) : (
        <s-stack direction="block" gap="base">
          {findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </s-stack>
      )}
    </s-section>
  );
}
