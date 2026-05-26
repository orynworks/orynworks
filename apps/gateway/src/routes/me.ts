import type { FastifyPluginAsync } from "fastify";
import { createDbClient, upsertWalletByAddress } from "@oryn/db";
import { requireAuth } from "../middleware/auth.js";
import { env } from "../env.js";

const db = createDbClient(env.DATABASE_URL);

export const meRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/me", { preHandler: requireAuth }, async (req) => {
    const session = req.session!;
    const walletRecord = await upsertWalletByAddress(db, session.address);
    return {
      address: walletRecord.address,
      role: walletRecord.role,
      displayName: walletRecord.displayName,
      chainId: session.chainId,
      createdAt: walletRecord.createdAt,
    };
  });
};
