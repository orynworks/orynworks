import type { FastifyPluginAsync } from "fastify";

type SortMode = "gainers" | "losers" | "volume" | "trades";

interface BaseMoversBody {
  sort?: SortMode;
  limit?: number;
  minLiquidityUsd?: number;
}

interface BoostEntry {
  chainId?: string;
  tokenAddress?: string;
  icon?: string;
}

interface DexPair {
  chainId?: string;
  dexId?: string;
  url?: string;
  baseToken?: {
    address?: string;
    name?: string;
    symbol?: string;
  };
  priceUsd?: string | number;
  priceChange?: {
    h24?: number | string;
  };
  volume?: {
    h24?: number | string;
  };
  txns?: {
    h24?: {
      buys?: number;
      sells?: number;
    };
  };
  liquidity?: {
    usd?: number | string;
  };
}

interface EnrichedToken {
  tokenAddress: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceChange24h: number;
  volume24h: number;
  txns24h: number;
  liquidityUsd: number;
  dexId: string;
  pairUrl: string;
  icon: string;
}

const CAPABILITY = "base-movers";
const USER_AGENT = "oryn-gateway-mcp-demo/1.0";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;
const DEFAULT_MIN_LIQUIDITY = 10_000;
const FETCH_TIMEOUT_MS = 8_000;
const BOOSTS_URL = "https://api.dexscreener.com/token-boosts/top/v1";

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

async function fetchPairsForToken(
  tokenAddress: string,
): Promise<DexPair[] | null> {
  const url = `https://api.dexscreener.com/tokens/v1/base/${tokenAddress}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return null;
    return data as DexPair[];
  } catch {
    return null;
  }
}

export const basemoversRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: BaseMoversBody }>(
    "/mcp/base-movers",
    async (req, reply) => {
      const body = (req.body ?? {}) as BaseMoversBody;

      const rawSort = body.sort ?? "gainers";
      if (
        rawSort !== "gainers" &&
        rawSort !== "losers" &&
        rawSort !== "volume" &&
        rawSort !== "trades"
      ) {
        return reply.code(502).send({
          capability: CAPABILITY,
          error: "sort must be one of 'gainers' | 'losers' | 'volume' | 'trades'",
        });
      }
      const sort: SortMode = rawSort;

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

      const minLiquidityUsd =
        typeof body.minLiquidityUsd === "number" &&
        Number.isFinite(body.minLiquidityUsd) &&
        body.minLiquidityUsd >= 0
          ? body.minLiquidityUsd
          : DEFAULT_MIN_LIQUIDITY;

      try {
        const boostsRes = await fetch(BOOSTS_URL, {
          method: "GET",
          headers: {
            accept: "application/json",
            "user-agent": USER_AGENT,
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (!boostsRes.ok) {
          return reply.code(502).send({
            capability: CAPABILITY,
            error: `DEXScreener boosts returned HTTP ${boostsRes.status}`,
          });
        }

        const boostsData = (await boostsRes.json()) as unknown;
        if (!Array.isArray(boostsData)) {
          return reply.code(502).send({
            capability: CAPABILITY,
            error: "DEXScreener boosts returned unexpected payload",
          });
        }

        const baseBoosts = (boostsData as BoostEntry[]).filter(
          (entry) =>
            entry.chainId === "base" &&
            typeof entry.tokenAddress === "string" &&
            entry.tokenAddress.length > 0,
        );

        if (baseBoosts.length === 0) {
          return {
            capability: CAPABILITY,
            chain: "base",
            sort,
            limit,
            minLiquidityUsd,
            count: 0,
            tokens: [],
          };
        }

        const enrichedResults = await Promise.all(
          baseBoosts.map(async (boost): Promise<EnrichedToken | null> => {
            const tokenAddress = boost.tokenAddress as string;
            const pairs = await fetchPairsForToken(tokenAddress);
            if (!pairs || pairs.length === 0) return null;

            let bestPair: DexPair | null = null;
            let bestLiquidity = -Infinity;
            for (const pair of pairs) {
              const liq = toNumber(pair.liquidity?.usd, 0);
              if (liq > bestLiquidity) {
                bestLiquidity = liq;
                bestPair = pair;
              }
            }
            if (!bestPair) return null;

            const buys = bestPair.txns?.h24?.buys ?? 0;
            const sells = bestPair.txns?.h24?.sells ?? 0;

            return {
              tokenAddress,
              symbol: String(bestPair.baseToken?.symbol ?? ""),
              name: String(bestPair.baseToken?.name ?? ""),
              priceUsd: toNumber(bestPair.priceUsd, 0),
              priceChange24h: toNumber(bestPair.priceChange?.h24, 0),
              volume24h: toNumber(bestPair.volume?.h24, 0),
              txns24h: toNumber(buys, 0) + toNumber(sells, 0),
              liquidityUsd: toNumber(bestPair.liquidity?.usd, 0),
              dexId: String(bestPair.dexId ?? ""),
              pairUrl: String(bestPair.url ?? ""),
              icon: String(boost.icon ?? ""),
            };
          }),
        );

        const enriched: EnrichedToken[] = enrichedResults.filter(
          (t): t is EnrichedToken => t !== null,
        );

        const filtered = enriched.filter(
          (t) => t.liquidityUsd >= minLiquidityUsd,
        );

        filtered.sort((a, b) => {
          switch (sort) {
            case "gainers":
              return b.priceChange24h - a.priceChange24h;
            case "losers":
              return a.priceChange24h - b.priceChange24h;
            case "volume":
              return b.volume24h - a.volume24h;
            case "trades":
              return b.txns24h - a.txns24h;
          }
        });

        const tokens = filtered.slice(0, limit);

        return {
          capability: CAPABILITY,
          chain: "base",
          sort,
          limit,
          minLiquidityUsd,
          count: tokens.length,
          tokens,
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

  fastify.get("/mcp/base-movers", async () => ({
    capability: CAPABILITY,
    description:
      "Returns top Base ecosystem tokens with 24h metrics, sourced from DEXScreener boosted-tokens feed enriched with per-token pair data. Body: { sort?: 'gainers' | 'losers' | 'volume' | 'trades' (default 'gainers'), limit?: number (default 10, max 30), minLiquidityUsd?: number (default 10000) }.",
    method: "POST",
  }));
};
