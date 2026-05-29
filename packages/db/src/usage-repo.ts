import { eq, and, gte, desc, sql as drizzleSql, count, avg } from "drizzle-orm";
import { usageEvent, type UsageEvent, type NewUsageEvent } from "./schema.js";
import type { DbClient } from "./client.js";

export async function recordUsageEvent(
  db: DbClient,
  data: NewUsageEvent
): Promise<UsageEvent> {
  const [created] = await db.insert(usageEvent).values(data).returning();
  return created;
}

export type UsageStats = {
  totalCalls: number;
  successCount: number;
  successRate: number;       // 0..1
  avgLatencyMs: number | null;
};

export async function getUsageStats(
  db: DbClient,
  capabilityId: string,
  sinceDate: Date
): Promise<UsageStats> {
  const rows = await db
    .select({
      total: count(),
      successCount: drizzleSql<number>`count(*) FILTER (WHERE ${usageEvent.success})`,
      avgLatency: avg(usageEvent.latencyMs),
    })
    .from(usageEvent)
    .where(
      and(
        eq(usageEvent.capabilityId, capabilityId),
        gte(usageEvent.createdAt, sinceDate)
      )
    );

  const r = rows[0];
  const total = Number(r.total ?? 0);
  const successCount = Number(r.successCount ?? 0);
  const avgLatencyValue = r.avgLatency === null ? null : Number(r.avgLatency);

  return {
    totalCalls: total,
    successCount,
    successRate: total === 0 ? 0 : successCount / total,
    avgLatencyMs: avgLatencyValue,
  };
}

export async function getCapabilityRevenue(
  db: DbClient,
  capabilityId: string
): Promise<string> {
  const rows = await db
    .select({
      total: drizzleSql<string>`COALESCE(SUM(${usageEvent.costUsdc}), 0)`,
    })
    .from(usageEvent)
    .where(
      and(
        eq(usageEvent.capabilityId, capabilityId),
        eq(usageEvent.billed, true)
      )
    );

  return rows[0]?.total ?? "0";
}

export async function listRecentUsageByCapability(
  db: DbClient,
  capabilityId: string,
  limit = 20
): Promise<UsageEvent[]> {
  return db
    .select()
    .from(usageEvent)
    .where(eq(usageEvent.capabilityId, capabilityId))
    .orderBy(desc(usageEvent.createdAt))
    .limit(limit);
}

export async function listRecentUsageByCaller(
  db: DbClient,
  callerAddress: string,
  limit = 20
): Promise<UsageEvent[]> {
  return db
    .select()
    .from(usageEvent)
    .where(eq(usageEvent.callerAddress, callerAddress.toLowerCase()))
    .orderBy(desc(usageEvent.createdAt))
    .limit(limit);
}

export async function getOperatorSpending(
  db: DbClient,
  callerAddress: string
): Promise<string> {
  const rows = await db
    .select({
      total: drizzleSql<string>`COALESCE(SUM(${usageEvent.costUsdc}), 0)`,
    })
    .from(usageEvent)
    .where(
      and(
        eq(usageEvent.callerAddress, callerAddress.toLowerCase()),
        eq(usageEvent.billed, true)
      )
    );

  return rows[0]?.total ?? "0";
}
