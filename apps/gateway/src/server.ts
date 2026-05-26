import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env } from "./env.js";
import { healthRoute } from "./routes/health.js";

export async function buildServer() {
  const fastify = Fastify({
    logger: env.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : true,
  });

  await fastify.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await fastify.register(healthRoute);

  return fastify;
}

async function main() {
  const fastify = await buildServer();
  try {
    await fastify.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`Oryn Gateway listening on port ${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
