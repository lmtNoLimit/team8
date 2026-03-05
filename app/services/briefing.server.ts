import { askClaude } from "../lib/ai.server";
import type { AgentFinding } from "@prisma/client";

export interface BriefingPriority {
  text: string;
  findingId: string;
}

export interface BriefingSummary {
  greeting: string;
  topPriorities: BriefingPriority[];
  autoHandledSummary: string | null;
  insightHighlight: string | null;
  totalEstimatedRevenue: number;
}

// Simple in-memory cache to avoid calling Claude on every page load
let cachedBriefing: { key: string; value: BriefingSummary; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Generate an AI morning briefing from today's findings. */
export async function generateBriefing(
  findings: AgentFinding[],
  storeName?: string,
): Promise<BriefingSummary> {
  // Cache key based on finding IDs + statuses
  const cacheKey = findings.map((f) => `${f.id}:${f.status}`).sort().join(",");
  if (cachedBriefing && cachedBriefing.key === cacheKey && Date.now() < cachedBriefing.expiresAt) {
    return cachedBriefing.value;
  }

  const actionNeeded = findings.filter((f) => f.type === "action_needed");
  const done = findings.filter((f) => f.type === "done");
  const insights = findings.filter((f) => f.type === "insight");

  const totalEstimatedRevenue = findings.reduce((sum, f) => {
    const meta = f.metadata as Record<string, unknown> | null;
    return sum + (typeof meta?.estimatedRevenue === "number" ? meta.estimatedRevenue : 0);
  }, 0);

  if (findings.length === 0) {
    return {
      greeting: `Good morning${storeName ? `, ${storeName}` : ""}! Your store is running smoothly — nothing needs your attention.`,
      topPriorities: [],
      autoHandledSummary: null,
      insightHighlight: null,
      totalEstimatedRevenue: 0,
    };
  }

  const prompt = `You are a Shopify merchant's AI secretary. Write a concise morning briefing focused on revenue.

Store: ${storeName || "Shopify Store"}

ACTION NEEDED (${actionNeeded.length}):
${actionNeeded.map((f) => {
  const meta = f.metadata as Record<string, unknown> | null;
  const rev = typeof meta?.estimatedRevenue === "number" ? ` (~$${meta.estimatedRevenue}/mo)` : "";
  return `- [ID:${f.id}] [P${f.priority}] ${f.title}: ${f.description}${rev}`;
}).join("\n") || "None"}

AUTO-HANDLED OVERNIGHT (${done.length}):
${done.map((f) => `- ${f.title}: ${f.description}`).join("\n") || "None"}

INSIGHTS (${insights.length}):
${insights.map((f) => `- [ID:${f.id}] ${f.title}: ${f.description}`).join("\n") || "None"}

Total estimated revenue at stake: $${totalEstimatedRevenue}/mo

Respond in JSON only:
{
  "greeting": "One warm sentence with store name. Mention how many items need attention and total $ at stake if any.",
  "topPriorities": [{"text": "One-sentence action item with $ estimate if available", "findingId": "the exact ID from the finding"}],
  // Max 3 priorities. Use exact finding IDs from the [ID:...] tags above. Rank by revenue impact.
  "autoHandledSummary": "One sentence about what was handled overnight, or null if nothing",
  "insightHighlight": "One sentence with the most impactful insight, or null"
}`;

  try {
    const text = await askClaude(
      prompt + "\n\nRespond with valid JSON only.",
      "You are a revenue-focused AI store secretary. Be concise, warm, and actionable. Use merchant language, not technical jargon.",
    );
    const result = JSON.parse(text) as Omit<BriefingSummary, "totalEstimatedRevenue">;
    const briefing = { ...result, totalEstimatedRevenue };
    cachedBriefing = { key: cacheKey, value: briefing, expiresAt: Date.now() + CACHE_TTL_MS };
    return briefing;
  } catch {
    const briefing: BriefingSummary = {
      greeting: `Good morning${storeName ? `, ${storeName}` : ""}! You have ${actionNeeded.length} items needing attention${totalEstimatedRevenue > 0 ? ` worth ~$${totalEstimatedRevenue}/mo` : ""}.`,
      topPriorities: actionNeeded
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 3)
        .map((f) => ({ text: f.title, findingId: f.id })),
      autoHandledSummary: done.length > 0 ? `${done.length} issues were auto-handled overnight.` : null,
      insightHighlight: insights[0]?.title ?? null,
      totalEstimatedRevenue,
    };
    cachedBriefing = { key: cacheKey, value: briefing, expiresAt: Date.now() + CACHE_TTL_MS };
    return briefing;
  }
}
