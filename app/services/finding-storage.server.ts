import type { Prisma } from "@prisma/client";
import prisma from "../db.server";
import type { AgentFindingInput } from "../lib/agent-interface";
import { logActivity } from "./activity-log.server";

export interface FindingFilters {
  agentId?: string;
  type?: string;
  status?: string;
}

/** Save findings with upsert deduplication on [shop, agentId, deduplicationKey]. */
export async function saveFindings(
  agentId: string,
  shop: string,
  inputs: AgentFindingInput[],
) {
  const saved = [];

  for (const input of inputs) {
    const dedupKey =
      input.deduplicationKey ?? `${agentId}:${input.title}`;

    const data = {
      agentId,
      shop,
      type: input.type,
      priority: input.priority,
      title: input.title,
      description: input.description,
      action: input.action ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? null,
      externalId: input.externalId ?? null,
      deduplicationKey: dedupKey,
    };

    const finding = await prisma.agentFinding.upsert({
      where: {
        shop_agentId_deduplicationKey: {
          shop,
          agentId,
          deduplicationKey: dedupKey,
        },
      },
      update: {
        type: data.type,
        priority: data.priority,
        title: data.title,
        description: data.description,
        action: data.action,
        metadata: data.metadata,
      },
      create: {
        ...data,
        status: "pending",
      },
    });

    saved.push(finding);
  }

  return saved;
}

/** Query findings for a shop with optional filters. */
export async function getFindings(shop: string, filters?: FindingFilters) {
  const where: Record<string, unknown> = { shop };
  if (filters?.agentId) where.agentId = filters.agentId;
  if (filters?.type) where.type = filters.type;
  if (filters?.status) where.status = filters.status;

  return prisma.agentFinding.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });
}

/** Update a finding's status (dismiss, apply, etc.) */
export async function updateFindingStatus(
  id: string,
  status: "pending" | "applied" | "dismissed",
) {
  const finding = await prisma.agentFinding.update({
    where: { id },
    data: { status },
  });

  const activityType =
    status === "applied" ? "finding_applied" : "finding_dismissed";
  await logActivity(
    finding.shop,
    activityType,
    finding.agentId,
    `"${finding.title}" was ${status}`,
    { findingId: id, findingType: finding.type },
  );

  return finding;
}
