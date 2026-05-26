import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

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
