/**
 * Agent Interface Contract
 * LOCKED after kickoff -- do not modify during hackathon.
 *
 * Every agent must implement the Agent interface.
 * The executor calls run(), saves findings to DB.
 */

/** Finding types for the Secretary briefing */
export type FindingType = "done" | "action_needed" | "insight";

/** Priority levels: 1 = critical, 5 = nice-to-have */
export type FindingPriority = 1 | 2 | 3 | 4 | 5;

/** What an agent returns from run(). Each item becomes a row in AgentFinding. */
export interface AgentFindingInput {
  type: FindingType;
  priority: FindingPriority;
  /** Short headline for briefing. Keep under 80 chars. */
  title: string;
  /** Longer explanation. Keep under 300 chars. */
  description: string;
  /** Suggested action as JSON string, or human-readable instruction */
  action?: string;
  /** Agent-specific structured data */
  metadata?: Record<string, unknown>;
  /**
   * Deduplication key. If same key exists for this agent+shop, the finding
   * is updated instead of duplicated. Format: "topic:identifier"
   */
  deduplicationKey?: string;
  /** External identifier from the agent's domain (e.g., product GID) */
  externalId?: string;
}

/**
 * Admin GraphQL client type.
 * Matches the `admin` object from authenticate.admin(request).
 */
export interface AdminClient {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
}

/** Base interface all agents must implement. */
export interface Agent {
  readonly agentId: string;
  readonly displayName: string;
  readonly description: string;

  /**
   * Main execution method. Runs the agent against a shop's data.
   * - Must be idempotent (safe to run multiple times)
   * - Should complete within 30 seconds
   * - Return empty array if nothing found (don't throw)
   * - Throw only on unrecoverable errors
   */
  run(shop: string, admin: AdminClient): Promise<AgentFindingInput[]>;
}
