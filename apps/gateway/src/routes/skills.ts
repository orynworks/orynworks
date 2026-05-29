import type { FastifyPluginAsync } from "fastify";
import { createHash } from "node:crypto";
import { getCapabilityBySlug, recordUsageEvent } from "@oryn/db";
import { requireAuth } from "../middleware/auth.js";
import { getDb } from "../lib/db.js";

type CallBody = unknown;
type CallParams = { slug: string };

export const skillsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: CallParams; Body: CallBody }>(
    "/v1/skills/:slug/call",
    { preHandler: requireAuth },
    async (req, reply) => {
      const session = req.session!;
      const { slug } = req.params;
      const db = getDb();

      const cap = await getCapabilityBySlug(db, slug);
      if (!cap || cap.status !== "published" || cap.type !== "skill") {
        return reply.code(404).send({ error: "skill not found" });
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
      // Free capabilities are auto-billed (cost 0). Paid capabilities billing=true
      // will be set by x402 verifier in Task 5 (this task always marks billed=false
      // for paid capabilities since payment not yet checked).
      await recordUsageEvent(db, {
        capabilityId: cap.id,
        callerAddress: session.address,
        eventType: "call",
        requestHash,
        success,
        latencyMs,
        errorCode,
        costUsdc: success ? cap.priceUsdc : "0",
        billed: Number(cap.priceUsdc) === 0 && success,
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
