import type { FastifyPluginAsync } from "fastify";
import { createHash } from "node:crypto";
import {
  getCapabilityBySlug,
  getWalletById,
  recordUsageEvent,
} from "@oryn/db";
import type { Address } from "viem";
import { requireAuth } from "../middleware/auth.js";
import { verifyX402 } from "../middleware/x402.js";
import { getDb } from "../lib/db.js";

type QueryBody = unknown;
type QueryParams = { slug: string };

export const knowledgeRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: QueryParams; Body: QueryBody }>(
    "/v1/knowledge/:slug/query",
    { preHandler: requireAuth },
    async (req, reply) => {
      const session = req.session!;
      const { slug } = req.params;
      const db = getDb();

      const cap = await getCapabilityBySlug(db, slug);
      if (!cap || cap.status !== "published" || cap.type !== "knowledge") {
        return reply.code(404).send({ error: "knowledge pack not found" });
      }

      let payerAddress: string | undefined;

      if (Number(cap.priceUsdc) > 0) {
        const paymentHeader = req.headers["x-payment"];
        if (!paymentHeader || typeof paymentHeader !== "string") {
          return reply
            .code(402)
            .header(
              "WWW-Authenticate",
              `X402 realm="oryn", amount="${cap.priceUsdc}"`
            )
            .send({
              error: "payment required",
              priceUsdc: cap.priceUsdc,
              protocol: "x402",
              version: "1",
            });
        }

        const builder = await getWalletById(db, cap.builderId);
        if (!builder) {
          return reply.code(500).send({ error: "builder not found" });
        }

        const verifyResult = await verifyX402(
          paymentHeader,
          cap.priceUsdc,
          builder.address as Address
        );

        if (!verifyResult.ok) {
          return reply.code(verifyResult.status).send({
            error: verifyResult.reason,
            priceUsdc: cap.priceUsdc,
          });
        }

        payerAddress = verifyResult.payerAddress.toLowerCase();
      }

      const bodyString = JSON.stringify(req.body ?? {});
      const requestHash = createHash("sha256").update(bodyString).digest("hex");

      const startTime = Date.now();
      let success = false;
      let errorCode: string | undefined;
      let proxyResponse: unknown = null;

      try {
        const upstream = await fetch(cap.hostUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyString,
        });

        if (!upstream.ok) {
          errorCode = `upstream_${upstream.status}`;
          success = false;
        } else {
          const ct = upstream.headers.get("content-type") ?? "";
          proxyResponse = ct.includes("application/json")
            ? await upstream.json()
            : await upstream.text();
          success = true;
        }
      } catch (e) {
        errorCode = e instanceof Error ? e.message.slice(0, 100) : "fetch_failed";
        success = false;
      }

      const latencyMs = Date.now() - startTime;

      // Record usage event (off-chain ledger).
      // Free capabilities are auto-billed (cost 0). Paid capabilities are
      // marked billed=true when an x402 payment was verified (payerAddress set).
      await recordUsageEvent(db, {
        capabilityId: cap.id,
        callerAddress: session.address.toLowerCase(),
        eventType: "query",
        requestHash,
        success,
        latencyMs,
        errorCode,
        costUsdc: success ? cap.priceUsdc : "0",
        billed:
          success && (Number(cap.priceUsdc) === 0 || payerAddress !== undefined),
      });

      if (!success) {
        return reply.code(502).send({ error: errorCode ?? "upstream_error" });
      }

      return {
        ok: true,
        data: proxyResponse,
        costUsdc: cap.priceUsdc,
        latencyMs,
      };
    }
  );
};
