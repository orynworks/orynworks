import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env } from "./env.js";
import { healthRoute } from "./routes/health.js";
import { meRoute } from "./routes/me.js";
import { skillsRoute } from "./routes/skills.js";
import { knowledgeRoute } from "./routes/knowledge.js";
import { mcpDemosRoute } from "./routes/mcp-demos.js";
import { tokenpriceRoute } from "./mcp-demos/token-price.js";
import { trendingtokensRoute } from "./mcp-demos/trending-tokens.js";
import { topgainersRoute } from "./mcp-demos/top-gainers.js";
import { dexpairsRoute } from "./mcp-demos/dex-pairs.js";
import { defitvlRoute } from "./mcp-demos/defi-tvl.js";
import { walletportfolioRoute } from "./mcp-demos/wallet-portfolio.js";
import { basegasRoute } from "./mcp-demos/base-gas.js";
import { erc20infoRoute } from "./mcp-demos/erc20-info.js";
import { txlookupRoute } from "./mcp-demos/tx-lookup.js";
import { uniswapquoteRoute } from "./mcp-demos/uniswap-quote.js";

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

  await fastify.register(import("@fastify/rate-limit"), {
    max: 60,
    timeWindow: "1 minute",
    keyGenerator: (req) => {
      return (req as any).session?.address ?? req.ip;
    },
  });

  await fastify.register(healthRoute);
  await fastify.register(meRoute);
  await fastify.register(skillsRoute);
  await fastify.register(knowledgeRoute);
  await fastify.register(mcpDemosRoute);
  await fastify.register(tokenpriceRoute);
  await fastify.register(trendingtokensRoute);
  await fastify.register(topgainersRoute);
  await fastify.register(dexpairsRoute);
  await fastify.register(defitvlRoute);
  await fastify.register(walletportfolioRoute);
  await fastify.register(basegasRoute);
  await fastify.register(erc20infoRoute);
  await fastify.register(txlookupRoute);
  await fastify.register(uniswapquoteRoute);

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

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  main();
}
