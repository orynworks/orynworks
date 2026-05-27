import { eq } from "drizzle-orm";
import { wallet, type Wallet } from "./schema.js";
import type { DbClient } from "./client.js";

export async function upsertWalletByAddress(
  db: DbClient,
  address: string
): Promise<Wallet> {
  const lower = address.toLowerCase();
  const existing = await db.select().from(wallet).where(eq(wallet.address, lower)).limit(1);
  if (existing.length > 0) return existing[0];

  const [created] = await db.insert(wallet).values({ address: lower }).returning();
  return created;
}
