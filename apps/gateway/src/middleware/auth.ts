import type { FastifyRequest, FastifyReply } from "fastify";
import { verifySessionToken, type SessionPayload } from "@oryn/db";
import { env } from "../env.js";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

declare module "fastify" {
  interface FastifyRequest {
    session?: SessionPayload;
  }
}

function extractToken(req: FastifyRequest): string | undefined {
  const cookieMatch = (req.headers.cookie ?? "").match(/oryn_session=([^;]+)/);
  const authHeader = req.headers.authorization;
  const bearerMatch =
    typeof authHeader === "string" ? authHeader.match(/^Bearer (.+)$/) : null;
  return cookieMatch?.[1] ?? bearerMatch?.[1];
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const token = extractToken(req);

  if (!token) {
    reply.code(401).send({ error: "no session" });
    return;
  }

  const session = await verifySessionToken(SECRET, token);
  if (!session) {
    reply.code(401).send({ error: "invalid session" });
    return;
  }

  req.session = session;
}

export async function optionalAuth(req: FastifyRequest, _reply: FastifyReply) {
  const token = extractToken(req);
  if (!token) return;
  const session = await verifySessionToken(SECRET, token);
  if (session) req.session = session;
}
