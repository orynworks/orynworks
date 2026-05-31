import type { FastifyPluginAsync } from "fastify";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

// Local viem client so this module is self-contained.
const BASE_RPC = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const baseClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });

type MarketOrder = "volume24hr" | "liquidity" | "endDate";

type PredictionMarketsBody = {
  query?: string;
  limit?: number;
  order?: MarketOrder;
};

type PolymarketMarket = {
  id?: string | number;
  question?: string;
  slug?: string;
  volume?: string | number;
  volume24hr?: string | number;
  liquidity?: string | number;
  endDate?: string;
  closed?: boolean;
  active?: boolean;
  outcomes?: string;
  outcomePrices?: string;
};

type MarketOutcome = {
  name: string;
  currentPrice: number;
};

type FormattedMarket = {
  question: string;
  slug: string;
  url: string;
  volume24hr: number;
  liquidity: number;
  endDate: string | null;
  outcomes: MarketOutcome[];
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const DEFAULT_ORDER: MarketOrder = "volume24hr";
const ALLOWED_ORDERS: ReadonlySet<MarketOrder> = new Set<MarketOrder>([
  "volume24hr",
  "liquidity",
  "endDate",
]);
const POLYMARKET_URL = "https://gamma-api.polymarket.com/markets";

function parseLimit(input: unknown): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return DEFAULT_LIMIT;
  }
  const rounded = Math.floor(input);
  if (rounded <= 0) return DEFAULT_LIMIT;
  return Math.min(rounded, MAX_LIMIT);
}

function parseOrder(input: unknown): MarketOrder {
  if (typeof input === "string" && ALLOWED_ORDERS.has(input as MarketOrder)) {
    return input as MarketOrder;
  }
  return DEFAULT_ORDER;
}

function parseQuery(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function safeJsonParseArray(raw: unknown): unknown[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toFiniteNumber(input: unknown): number {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const n = Number(input);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export const predictionmarketsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: PredictionMarketsBody }>(
    "/mcp/prediction-markets",
    async (req, reply) => {
      const body = (req.body ?? {}) as PredictionMarketsBody;
      const query = parseQuery(body.query);
      const limit = parseLimit(body.limit);
      const order = parseOrder(body.order);

      const params = new URLSearchParams({
        limit: String(limit),
        closed: "false",
        active: "true",
        order,
        ascending: "false",
      });
      if (query) {
        params.set("q", query);
      }
      const url = `${POLYMARKET_URL}?${params.toString()}`;

      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "oryn-gateway-mcp-demo/1.0",
          },
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          return reply.code(502).send({
            capability: "prediction-markets",
            error: `polymarket responded ${res.status}`,
          });
        }

        const raw = (await res.json()) as unknown;
        if (!Array.isArray(raw)) {
          return reply.code(502).send({
            capability: "prediction-markets",
            error: "unexpected polymarket payload shape",
          });
        }

        const markets = raw as PolymarketMarket[];
        const formatted: FormattedMarket[] = [];
        for (const m of markets) {
          if (!m || typeof m !== "object") continue;
          if (typeof m.question !== "string" || typeof m.slug !== "string") {
            continue;
          }

          const outcomes = safeJsonParseArray(m.outcomes);
          const prices = safeJsonParseArray(m.outcomePrices);

          const outcomeList: MarketOutcome[] = outcomes.map((name, i) => ({
            name: typeof name === "string" ? name : String(name),
            currentPrice: toFiniteNumber(prices[i]),
          }));

          formatted.push({
            question: m.question,
            slug: m.slug,
            url: `https://polymarket.com/event/${m.slug}`,
            volume24hr: toFiniteNumber(m.volume24hr),
            liquidity: toFiniteNumber(m.liquidity),
            endDate: typeof m.endDate === "string" ? m.endDate : null,
            outcomes: outcomeList,
          });
        }

        return {
          capability: "prediction-markets",
          query: query ?? null,
          count: formatted.length,
          markets: formatted,
        };
      } catch (e) {
        return reply.code(502).send({
          capability: "prediction-markets",
          error: e instanceof Error ? e.message : "polymarket fetch failed",
        });
      }
    }
  );

  fastify.get("/mcp/prediction-markets", async () => ({
    capability: "prediction-markets",
    description:
      "Live prediction markets from Polymarket Gamma API. Body: { query?: string, limit?: number (default 10, max 50), order?: 'volume24hr'|'liquidity'|'endDate' (default 'volume24hr') }.",
    method: "POST",
  }));
};
