import { pgTable, uuid, text, timestamp, pgEnum, numeric, boolean } from "drizzle-orm/pg-core";

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
