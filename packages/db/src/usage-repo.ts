import { eq, and, gte, desc, sql as drizzleSql, count, avg } from "drizzle-orm";
import { usageEvent, capability, type UsageEvent, type NewUsageEvent } from "./schema.js";
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

export type BuilderEarnings = {
  grossUsdc: string;       // total operator spend across all capabilities
  builderShareUsdc: string; // 90% of gross
};

export async function getBuilderEarnings(
  db: DbClient,
  builderId: string
): Promise<BuilderEarnings> {
  const rows = await db
    .select({
      total: drizzleSql<string>`COALESCE(SUM(${usageEvent.costUsdc}), 0)`,
    })
    .from(usageEvent)
    .innerJoin(capability, eq(capability.id, usageEvent.capabilityId))
    .where(
      and(
        eq(capability.builderId, builderId),
        eq(usageEvent.billed, true)
      )
    );

  const gross = rows[0]?.total ?? "0";
  const grossNum = Number(gross);
  const builderShare = (grossNum * 0.9).toFixed(6);
  return { grossUsdc: gross, builderShareUsdc: builderShare };
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

// Aggregate billed=true, settled=false, NOT-in-progress events grouped by builder.
// settled_tx IS NULL ensures we don't re-pick up rows that are mid-settlement.
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
      AND ue.settled_tx IS NULL
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

// Lock events for settlement by stamping settled_tx with a lock token.
// Only locks rows that are still unsettled AND not already locked — this is the
// atomic guard against two workers racing on the same batch.
export async function lockEventsForSettle(
  db: DbClient,
  eventIds: string[],
  lockToken: string
): Promise<number> {
  if (eventIds.length === 0) return 0;
  const result: any = await db.execute(drizzleSql`
    UPDATE usage_event
    SET settled_tx = ${lockToken}
    WHERE id = ANY(${eventIds}::uuid[])
      AND settled = false
      AND settled_tx IS NULL
  `);
  return Number(result?.rowCount ?? result?.count ?? 0);
}

// Swap a lock token for the real tx hash once broadcast succeeded.
export async function attachTxHashToLock(
  db: DbClient,
  lockToken: string,
  txHash: string
): Promise<void> {
  await db.execute(drizzleSql`
    UPDATE usage_event
    SET settled_tx = ${txHash}
    WHERE settled_tx = ${lockToken}
      AND settled = false
  `);
}

// Finalize: mark events as settled once tx has succeeded on-chain.
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

// Mark a batch as settled by their tx hash. Used for idempotent finalize.
export async function markSettledByTxHash(
  db: DbClient,
  txHash: string
): Promise<number> {
  const result: any = await db.execute(drizzleSql`
    UPDATE usage_event
    SET settled = true
    WHERE settled_tx = ${txHash}
      AND settled = false
  `);
  return Number(result?.rowCount ?? result?.count ?? 0);
}

// Release a lock so events can be re-picked up by a future run.
export async function releaseSettlementLock(
  db: DbClient,
  lockOrTxHash: string
): Promise<number> {
  const result: any = await db.execute(drizzleSql`
    UPDATE usage_event
    SET settled_tx = NULL
    WHERE settled_tx = ${lockOrTxHash}
      AND settled = false
  `);
  return Number(result?.rowCount ?? result?.count ?? 0);
}

// Return distinct in-progress markers (locks or tx hashes) for reconciliation.
export type InProgressSettlement = {
  marker: string; // either a lock token (lock:...) or a real tx hash (0x...)
  isLock: boolean; // true if it's a lock token, false if it's a real tx hash
};

export async function getInProgressSettlements(
  db: DbClient
): Promise<InProgressSettlement[]> {
  const rows = await db.execute(drizzleSql`
    SELECT DISTINCT settled_tx
    FROM usage_event
    WHERE settled = false
      AND settled_tx IS NOT NULL
  `);
  return (rows as any[]).map((r: any) => {
    const marker: string = r.settled_tx;
    return { marker, isLock: marker.startsWith("lock:") };
  });
}
