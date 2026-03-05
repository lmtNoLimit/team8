import type { Prisma } from "@prisma/client";
import prisma from "../db.server";

export type ActivityType =
  | "agent_run"
  | "finding_applied"
  | "finding_dismissed"
  | "agent_auto_executed";

export async function logActivity(
  shop: string,
  type: ActivityType,
  agentId: string | null,
  message: string,
  metadata?: Record<string, unknown>,
) {
  return prisma.activityLog.create({
    data: {
      shop,
      type,
      agentId,
      message,
      metadata: (metadata as Prisma.InputJsonValue) ?? null,
    },
  });
}

export interface ActivityLogFilters {
  agentId?: string;
  limit?: number;
  offset?: number;
}

export async function getActivityLog(
  shop: string,
  filters?: ActivityLogFilters,
) {
  return prisma.activityLog.findMany({
    where: {
      shop,
      ...(filters?.agentId ? { agentId: filters.agentId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 50,
    skip: filters?.offset ?? 0,
  });
}
