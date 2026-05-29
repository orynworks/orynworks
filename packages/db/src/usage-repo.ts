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

export async function getOperatorTotalCalls(
  db: DbClient,
  callerAddress: string
): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(usageEvent)
    .where(eq(usageEvent.callerAddress, callerAddress.toLowerCase()));
  return Number(rows[0]?.total ?? 0);
}

export type UnsettledByBuilder = {
  builderId: string;
  builderAddress: string;
  totalUsdc: string;
  eventIds: string[];
};

// Aggregate billed=true, settled=false events grouped by builder
export async function getUnsettledByBuilder(
  db: DbClient
): Promise<UnsettledByBuilder[]> {
  const rows = await db.execute(drizzleSql`
    SELECT
      w.id as builder_id,
      w.address as builder_address,
      COALESCE(SUM(ue.cost_usdc), 0)::text as total_usdc,
      ARRAY_AGG(ue.id::text) as event_ids
    FROM usage_event ue
    JOIN capability c ON c.id = ue.capability_id
    JOIN wallet w ON w.id = c.builder_id
    WHERE ue.billed = true
      AND ue.settled = false
      AND ue.cost_usdc > 0
    GROUP BY w.id, w.address
    HAVING SUM(ue.cost_usdc) > 0
  `);

  return (rows as any[]).map((r: any) => ({
    builderId: r.builder_id,
    builderAddress: r.builder_address,
    totalUsdc: r.total_usdc,
    eventIds: r.event_ids,
  }));
}

export async function markEventsSettled(
  db: DbClient,
  eventIds: string[],
  txHash: string
): Promise<void> {
  if (eventIds.length === 0) return;
  await db.execute(drizzleSql`
    UPDATE usage_event
    SET settled = true, settled_tx = ${txHash}
    WHERE id = ANY(${eventIds}::uuid[])
  `);
}
