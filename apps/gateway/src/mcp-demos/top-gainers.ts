import type { FastifyPluginAsync } from "fastify";

type Direction = "gainers" | "losers";

interface TopGainersBody {
  limit?: number;
  direction?: Direction;
}

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  price_change_percentage_24h: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
}

interface TopGainersItem {
  id: string;
  symbol: string;
  name: string;
  image: string;
  priceUsd: number | null;
  change24h: number | null;
  marketCap: number | null;
  marketCapRank: number | null;
}

const CAPABILITY = "top-gainers";
const USER_AGENT = "oryn-gateway-mcp-demo/1.0";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const topgainersRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: TopGainersBody }>(
    "/mcp/top-gainers",
    async (req, reply) => {
      const body = (req.body ?? {}) as TopGainersBody;

      const rawDirection = body.direction ?? "gainers";
      if (rawDirection !== "gainers" && rawDirection !== "losers") {
        return reply
          .code(502)
          .send({
            capability: CAPABILITY,
            error: "direction must be 'gainers' or 'losers'",
          });
      }
      const direction: Direction = rawDirection;

      const rawLimit =
        typeof body.limit === "number" && Number.isFinite(body.limit)
          ? Math.floor(body.limit)
          : DEFAULT_LIMIT;
      if (rawLimit < 1) {
        return reply
          .code(502)
          .send({ capability: CAPABILITY, error: "limit must be >= 1" });
      }
      const limit = Math.min(rawLimit, MAX_LIMIT);

      const order =
        direction === "gainers"
          ? "price_change_percentage_24h_desc"
          : "price_change_percentage_24h_asc";

      const url =
        `https://api.coingecko.com/api/v3/coins/markets` +
        `?vs_currency=usd` +
        `&order=${order}` +
        `&per_page=${limit}` +
        `&page=1` +
        `&sparkline=false` +
        `&price_change_percentage=24h`;

      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            accept: "application/json",
            "user-agent": USER_AGENT,
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          return reply.code(502).send({
            capability: CAPABILITY,
            error: `CoinGecko returned HTTP ${res.status}`,
          });
        }

        const data = (await res.json()) as unknown;
        if (!Array.isArray(data)) {
          return reply.code(502).send({
            capability: CAPABILITY,
            error: "CoinGecko returned unexpected payload",
          });
        }

        const items: TopGainersItem[] = (data as CoinGeckoMarket[]).map(
          (coin) => ({
            id: String(coin.id ?? ""),
            symbol: String(coin.symbol ?? "").toUpperCase(),
            name: String(coin.name ?? ""),
            image: String(coin.image ?? ""),
            priceUsd:
              typeof coin.current_price === "number"
                ? coin.current_price
                : null,
            change24h:
              typeof coin.price_change_percentage_24h === "number"
                ? coin.price_change_percentage_24h
                : null,
            marketCap:
              typeof coin.market_cap === "number" ? coin.market_cap : null,
            marketCapRank:
              typeof coin.market_cap_rank === "number"
                ? coin.market_cap_rank
                : null,
          }),
        );

        return {
          capability: CAPABILITY,
          direction,
          count: items.length,
          items,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "unknown fetch error";
        return reply
          .code(502)
          .send({ capability: CAPABILITY, error: message });
      }
    },
  );

  fastify.get("/mcp/top-gainers", async () => ({
    capability: CAPABILITY,
    description:
      "Returns the top gaining or losing coins by 24h price change, sourced from CoinGecko. Body: { limit?: number (default 10, max 50), direction?: 'gainers' | 'losers' (default 'gainers') }.",
    method: "POST",
  }));
};
