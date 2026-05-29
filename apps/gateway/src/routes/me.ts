import type { FastifyPluginAsync } from "fastify";
import { upsertWalletByAddress } from "@oryn/db";
import { requireAuth } from "../middleware/auth.js";
import { getDb } from "../lib/db.js";

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
