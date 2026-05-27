import type { FastifyPluginAsync } from "fastify";
import { createDbClient, upsertWalletByAddress, type DbClient } from "@oryn/db";
import { requireAuth } from "../middleware/auth.js";
import { env } from "../env.js";

let _db: DbClient | undefined;
function getDb(): DbClient {
  if (!_db) _db = createDbClient(env.DATABASE_URL);
  return _db;
}

export const meRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/me", { preHandler: requireAuth }, async (req) => {
    const session = req.session!;
    const walletRecord = await upsertWalletByAddress(getDb(), session.address);
    return {
      address: walletRecord.address,
      role: walletRecord.role,
      displayName: walletRecord.displayName,
      chainId: session.chainId,
      createdAt: walletRecord.createdAt,
    };
  });
};
