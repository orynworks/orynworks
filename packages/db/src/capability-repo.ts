import {
  eq,
  and,
  desc,
  asc,
  ilike,
  or,
  inArray,
  count,
  countDistinct,
  gt,
  sql as drizzleSql,
} from "drizzle-orm";
import { capability, wallet, usageEvent, type Capability, type NewCapability } from "./schema.js";
import type { DbClient } from "./client.js";

export async function createCapability(
  db: DbClient,
  data: NewCapability
): Promise<Capability> {
  const [created] = await db.insert(capability).values(data).returning();
  return created;
}

export async function getCapabilityBySlug(
  db: DbClient,
  slug: string
): Promise<Capability | null> {
  const result = await db
    .select()
    .from(capability)
    .where(eq(capability.slug, slug))
    .limit(1);
  return result[0] ?? null;
}

export type SortMode = "recent" | "popular" | "price-asc" | "price-desc";
export type PriceFilter = "free" | "paid";

export type ListFilters = {
  type?: "skill" | "knowledge";
  category?: string;
  search?: string;
  price?: PriceFilter;
  builderAddress?: string;
  sort?: SortMode;
  limit?: number;
  offset?: number;
};

function buildConditions(filters: ListFilters, builderId: string | null) {
  const conditions = [eq(capability.status, "published")];
  if (filters.type) conditions.push(eq(capability.type, filters.type));
  if (filters.category) conditions.push(eq(capability.category, filters.category));
  if (filters.price === "free") {
    conditions.push(eq(capability.priceUsdc, "0"));
  } else if (filters.price === "paid") {
    conditions.push(gt(capability.priceUsdc, "0"));
  }
  if (builderId) {
    conditions.push(eq(capability.builderId, builderId));
  }
  if (filters.search) {
    const searchClause = or(
      ilike(capability.name, `%${filters.search}%`),
      ilike(capability.description, `%${filters.search}%`),
      ilike(capability.slug, `%${filters.search}%`)
    );
    if (searchClause) conditions.push(searchClause);
  }
  return conditions;
}

async function resolveBuilderIdByAddress(
  db: DbClient,
  address: string
): Promise<string | null> {
  const row = await db
    .select({ id: wallet.id })
    .from(wallet)
    .where(eq(wallet.address, address.toLowerCase()))
    .limit(1);
  return row[0]?.id ?? null;
}

export async function listPublishedCapabilities(
  db: DbClient,
  filters: ListFilters = {}
): Promise<Capability[]> {
  let builderId: string | null = null;
  if (filters.builderAddress) {
    builderId = await resolveBuilderIdByAddress(db, filters.builderAddress);
    if (!builderId) return []; // no such builder = no rows
  }

  const conditions = buildConditions(filters, builderId);
  const sort = filters.sort ?? "recent";

  // "popular" sort needs an aggregated call-count join. We implement it as a
  // subquery so the ordering plays nicely with limit/offset.
  if (sort === "popular") {
    const counted = await db
      .select({
        cap: capability,
        callCount: drizzleSql<number>`COALESCE((
          SELECT COUNT(*) FROM ${usageEvent}
          WHERE ${usageEvent.capabilityId} = ${capability.id}
            AND ${usageEvent.success} = true
        ), 0)`,
      })
      .from(capability)
      .where(and(...conditions))
      .orderBy(
        drizzleSql`COALESCE((
          SELECT COUNT(*) FROM ${usageEvent}
          WHERE ${usageEvent.capabilityId} = ${capability.id}
            AND ${usageEvent.success} = true
        ), 0) DESC`,
        desc(capability.createdAt)
      )
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);
    return counted.map((r) => r.cap);
  }

  let orderBy;
  switch (sort) {
    case "price-asc":
      orderBy = [asc(capability.priceUsdc), desc(capability.createdAt)];
      break;
    case "price-desc":
      orderBy = [desc(capability.priceUsdc), desc(capability.createdAt)];
      break;
    case "recent":
    default:
      orderBy = [desc(capability.createdAt)];
  }

  return db
    .select()
    .from(capability)
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);
}

export async function countPublishedCapabilities(
  db: DbClient,
  filters: ListFilters = {}
): Promise<number> {
  let builderId: string | null = null;
  if (filters.builderAddress) {
    builderId = await resolveBuilderIdByAddress(db, filters.builderAddress);
    if (!builderId) return 0;
  }
  const conditions = buildConditions(filters, builderId);
  const rows = await db
    .select({ total: count() })
    .from(capability)
    .where(and(...conditions));
  return Number(rows[0]?.total ?? 0);
}

export async function listCapabilitiesByBuilder(
  db: DbClient,
  builderId: string
): Promise<Capability[]> {
  return db
    .select()
    .from(capability)
    .where(eq(capability.builderId, builderId))
    .orderBy(desc(capability.createdAt));
}

export type CapabilitySummary = {
  id: string;
  name: string;
  slug: string;
};

export async function listCapabilitySummariesByIds(
  db: DbClient,
  ids: string[]
): Promise<CapabilitySummary[]> {
  if (ids.length === 0) return [];
  return db
    .select({
      id: capability.id,
      name: capability.name,
      slug: capability.slug,
    })
    .from(capability)
    .where(inArray(capability.id, ids));
}

export type LandingStats = {
  totalCapabilities: number;
  totalBuilders: number;
  totalSkills: number;
  totalKnowledge: number;
};

export async function getLandingStats(db: DbClient): Promise<LandingStats> {
  const rows = await db
    .select({
      totalCapabilities: count(),
      totalBuilders: countDistinct(capability.builderId),
    })
    .from(capability)
    .where(eq(capability.status, "published"));

  const byType = await db
    .select({
      type: capability.type,
      count: count(),
    })
    .from(capability)
    .where(eq(capability.status, "published"))
    .groupBy(capability.type);

  const skills = byType.find((r) => r.type === "skill")?.count ?? 0;
  const knowledge = byType.find((r) => r.type === "knowledge")?.count ?? 0;

  return {
    totalCapabilities: Number(rows[0]?.totalCapabilities ?? 0),
    totalBuilders: Number(rows[0]?.totalBuilders ?? 0),
    totalSkills: Number(skills),
    totalKnowledge: Number(knowledge),
  };
}

export async function listFeaturedCapabilities(
  db: DbClient,
  limit = 6
): Promise<Capability[]> {
  return db
    .select()
    .from(capability)
    .where(eq(capability.status, "published"))
    .orderBy(desc(capability.createdAt))
    .limit(limit);
}
