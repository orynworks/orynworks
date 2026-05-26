import type { FastifyRequest, FastifyReply } from "fastify";
import { verifySessionToken, type SessionPayload } from "../lib/session.js";

declare module "fastify" {
  interface FastifyRequest {
    session?: SessionPayload;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const cookie = req.headers.cookie ?? "";
  const match = cookie.match(/oryn_session=([^;]+)/);
  if (!match) {
    reply.code(401).send({ error: "no session" });
    return;
  }

  const session = await verifySessionToken(match[1]);
  if (!session) {
    reply.code(401).send({ error: "invalid session" });
    return;
  }

  req.session = session;
}
