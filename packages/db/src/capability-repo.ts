import { eq, and, desc, ilike, or, inArray, count, countDistinct } from "drizzle-orm";
import { capability, type Capability, type NewCapability } from "./schema.js";
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

export type ListFilters = {
  type?: "skill" | "knowledge";
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listPublishedCapabilities(
  db: DbClient,
  filters: ListFilters = {}
): Promise<Capability[]> {
  const conditions = [eq(capability.status, "published")];
  if (filters.type) conditions.push(eq(capability.type, filters.type));
  if (filters.category) conditions.push(eq(capability.category, filters.category));
  if (filters.search) {
    const searchClause = or(
      ilike(capability.name, `%${filters.search}%`),
      ilike(capability.description, `%${filters.search}%`),
      ilike(capability.slug, `%${filters.search}%`)
    );
    if (searchClause) conditions.push(searchClause);
  }
  return db
    .select()
    .from(capability)
    .where(and(...conditions))
    .orderBy(desc(capability.createdAt))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);
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
