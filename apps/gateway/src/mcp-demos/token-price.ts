import type { FastifyPluginAsync } from "fastify";

// Token-price MCP capability — proxies CoinGecko's free /simple/price endpoint
// and normalizes the response into a stable shape the marketplace can render
// without per-token branching. CoinGecko is fronted directly (not via a viem
// client) because price data lives off-chain; on-chain RPC clients would add
// cost and latency for no benefit on this capability.

// Best-effort symbol -> CoinGecko id mapping for common tickers. Not
// exhaustive; callers can always pass `ids` directly for full control.
const SYMBOL_TO_ID: Record<string, string> = {
  eth: "ethereum",
  weth: "weth",
  btc: "bitcoin",
  wbtc: "wrapped-bitcoin",
  usdc: "usd-coin",
  usdt: "tether",
  dai: "dai",
  sol: "solana",
  base: "base",
  op: "optimism",
  arb: "arbitrum",
  link: "chainlink",
  uni: "uniswap",
  aave: "aave",
  matic: "matic-network",
  pol: "polygon-ecosystem-token",
  avax: "avalanche-2",
  bnb: "binancecoin",
  ada: "cardano",
  xrp: "ripple",
  doge: "dogecoin",
  ldo: "lido-dao",
  mkr: "maker",
  pepe: "pepe",
  shib: "shiba-inu",
};

interface TokenPriceBody {
  ids?: string | string[];
  symbol?: string;
  vs?: string;
}

type CoinGeckoEntry = Record<string, number | undefined>;

interface PriceOut {
  priceUsd: number | null;
  change24h: number | null;
  marketCap: number | null;
  volume24h: number | null;
}

function normalizeIds(input: string | string[] | undefined): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : input.split(",");
  return arr
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && /^[a-z0-9-]+$/.test(s));
}

function resolveSymbol(symbol: string): string | null {
  const key = symbol.trim().toLowerCase();
  if (!key) return null;
  return SYMBOL_TO_ID[key] ?? null;
}

function numberOrNull(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export const tokenpriceRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: TokenPriceBody }>(
    "/mcp/token-price",
    async (req, reply) => {
      const body = (req.body ?? {}) as TokenPriceBody;

      const vsRaw =
        typeof body.vs === "string" ? body.vs.trim().toLowerCase() : "";
      const vs =
        vsRaw.length > 0 && /^[a-z]{2,10}$/.test(vsRaw) ? vsRaw : "usd";

      let ids = normalizeIds(body.ids);
      if (
        ids.length === 0 &&
        typeof body.symbol === "string" &&
        body.symbol.trim().length > 0
      ) {
        const mapped = resolveSymbol(body.symbol);
        if (mapped) {
          ids = [mapped];
        } else {
          return reply.code(400).send({
            capability: "token-price",
            error: `unknown symbol "${body.symbol}" — pass { ids: "<coingecko-id>" } instead`,
          });
        }
      }
      if (ids.length === 0) {
        ids = ["ethereum", "usd-coin"];
      }

      const idsParam = encodeURIComponent(ids.join(","));
      const vsParam = encodeURIComponent(vs);
      const url =
        `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}` +
        `&vs_currencies=${vsParam}` +
        `&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;

      try {
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "oryn-gateway-mcp-demo/1.0",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          return reply.code(502).send({
            capability: "token-price",
            error: `coingecko api returned ${res.status}`,
          });
        }

        const payload = (await res.json()) as Record<string, CoinGeckoEntry>;

        const priceKey = vs;
        const changeKey = `${vs}_24h_change`;
        const mcapKey = `${vs}_market_cap`;
        const volKey = `${vs}_24h_vol`;

        const prices: Record<string, PriceOut> = {};
        for (const id of ids) {
          const entry = payload[id];
          if (!entry) {
            prices[id] = {
              priceUsd: null,
              change24h: null,
              marketCap: null,
              volume24h: null,
            };
            continue;
          }
          prices[id] = {
            priceUsd: numberOrNull(entry[priceKey]),
            change24h: numberOrNull(entry[changeKey]),
            marketCap: numberOrNull(entry[mcapKey]),
            volume24h: numberOrNull(entry[volKey]),
          };
        }

        return {
          capability: "token-price",
          vs,
          prices,
        };
      } catch (e) {
        return reply.code(502).send({
          capability: "token-price",
          error: e instanceof Error ? e.message : "fetch failed",
        });
      }
    }
  );

  fastify.get("/mcp/token-price", async () => ({
    capability: "token-price",
    description:
      "Spot prices, 24h change, market cap and 24h volume for one or more tokens via CoinGecko. " +
      "Pass { ids: 'ethereum,usd-coin' } (comma-separated CoinGecko ids or array), or { symbol: 'eth' } " +
      "for common tickers. Quote currency defaults to 'usd' — override with { vs: 'eur' }.",
    method: "POST",
  }));
};
