import { pgTable, uuid, text, timestamp, pgEnum, numeric, boolean, integer, index } from "drizzle-orm/pg-core";
import { desc } from "drizzle-orm";

export const walletRoleEnum = pgEnum("wallet_role", ["builder", "operator", "both"]);

export const wallet = pgTable("wallet", {
  id: uuid("id").primaryKey().defaultRandom(),
  address: text("address").notNull().unique(),
  role: walletRoleEnum("role").notNull().default("both"),
  displayName: text("display_name"),
  bio: text("bio"),
  twitter: text("twitter"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Wallet = typeof wallet.$inferSelect;
export type NewWallet = typeof wallet.$inferInsert;

export const capabilityTypeEnum = pgEnum("capability_type", ["skill", "knowledge"]);
export const capabilityStatusEnum = pgEnum("capability_status", ["draft", "published", "deprecated"]);

export const capability = pgTable("capability", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  type: capabilityTypeEnum("type").notNull(),
  builderId: uuid("builder_id").notNull().references(() => wallet.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  hostUrl: text("host_url").notNull(),
  priceUsdc: numeric("price_usdc", { precision: 10, scale: 6 }).notNull().default("0"),
  tokenGated: boolean("token_gated").notNull().default(false),
  requiredToken: text("required_token"),
  status: capabilityStatusEnum("status").notNull().default("draft"),
  version: text("version").notNull().default("1.0.0"),
  metadataUri: text("metadata_uri"),
  onchainHash: text("onchain_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Capability = typeof capability.$inferSelect;
export type NewCapability = typeof capability.$inferInsert;

export const usageEventTypeEnum = pgEnum("usage_event_type", ["call", "query"]);

export const usageEvent = pgTable("usage_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  capabilityId: uuid("capability_id").notNull().references(() => capability.id),
  callerAddress: text("caller_address").notNull(),
  eventType: usageEventTypeEnum("event_type").notNull(),
  requestHash: text("request_hash").notNull(),
  success: boolean("success").notNull(),
  latencyMs: integer("latency_ms"),
  errorCode: text("error_code"),
  costUsdc: numeric("cost_usdc", { precision: 10, scale: 6 }).notNull().default("0"),
  billed: boolean("billed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  capabilityCreatedIdx: index("idx_usage_event_capability_created").on(t.capabilityId, desc(t.createdAt)),
  callerCreatedIdx: index("idx_usage_event_caller_created").on(t.callerAddress, desc(t.createdAt)),
}));

export type UsageEvent = typeof usageEvent.$inferSelect;
export type NewUsageEvent = typeof usageEvent.$inferInsert;

export const x402Nonce = pgTable("x402_nonce", {
  signature: text("signature").primaryKey(),
  usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
});

export type X402Nonce = typeof x402Nonce.$inferSelect;
export type NewX402Nonce = typeof x402Nonce.$inferInsert;
