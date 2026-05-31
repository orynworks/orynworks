import type { FastifyPluginAsync } from "fastify";
import { createPublicClient, http } from "viem";
import { base, baseSepolia, mainnet } from "viem/chains";

// Local viem clients so this module is self-contained and does not couple to
// the main mcp-demos route file. Defaults match the existing public RPCs.
const ETH_RPC = process.env.ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com";
const BASE_RPC = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const BASE_SEPOLIA_RPC =
  process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ethClient = createPublicClient({ chain: mainnet, transport: http(ETH_RPC) });
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const baseClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC),
});

type SupportedChain = "base" | "ethereum" | "solana";

type TrendingTokensBody = {
  chain?: SupportedChain;
  limit?: number;
};

type DexScreenerLink = {
  type?: string;
  label?: string;
  url?: string;
};

type DexScreenerBoostedToken = {
  url?: string;
  chainId?: string;
  tokenAddress?: string;
  icon?: string;
  header?: string;
  description?: string;
  links?: DexScreenerLink[];
  amount?: number;
  totalAmount?: number;
};

type TrendingItem = {
  tokenAddress: string;
  chainId: string;
  icon: string | null;
  description: string | null;
  links: DexScreenerLink[];
};

const SUPPORTED_CHAINS: ReadonlySet<SupportedChain> = new Set<SupportedChain>([
  "base",
  "ethereum",
  "solana",
]);

const DEFAULT_CHAIN: SupportedChain = "base";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const DEXSCREENER_URL =
  "https://api.dexscreener.com/token-boosts/top/v1";

function parseChain(input: unknown): SupportedChain {
  if (typeof input === "string" && SUPPORTED_CHAINS.has(input as SupportedChain)) {
    return input as SupportedChain;
  }
  return DEFAULT_CHAIN;
}

function parseLimit(input: unknown): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return DEFAULT_LIMIT;
  }
  const rounded = Math.floor(input);
  if (rounded <= 0) return DEFAULT_LIMIT;
  return Math.min(rounded, MAX_LIMIT);
}

export const trendingtokensRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: TrendingTokensBody }>(
    "/mcp/trending-tokens",
    async (req, reply) => {
      const body = (req.body ?? {}) as TrendingTokensBody;
      const chain = parseChain(body.chain);
      const limit = parseLimit(body.limit);

      try {
        const res = await fetch(DEXSCREENER_URL, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "oryn-gateway-mcp-demo/1.0",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          return reply.code(502).send({
            capability: "trending-tokens",
            error: `dexscreener responded ${res.status}`,
          });
        }

        const raw = (await res.json()) as unknown;
        if (!Array.isArray(raw)) {
          return reply.code(502).send({
            capability: "trending-tokens",
            error: "unexpected dexscreener payload shape",
          });
        }

        const tokens = raw as DexScreenerBoostedToken[];
        const filtered: TrendingItem[] = [];
        for (const t of tokens) {
          if (filtered.length >= limit) break;
          if (!t || typeof t !== "object") continue;
          if (t.chainId !== chain) continue;
          if (typeof t.tokenAddress !== "string" || t.tokenAddress.length === 0) {
            continue;
          }
          filtered.push({
            tokenAddress: t.tokenAddress,
            chainId: t.chainId,
            icon: typeof t.icon === "string" ? t.icon : null,
            description:
              typeof t.description === "string" ? t.description : null,
            links: Array.isArray(t.links) ? t.links : [],
          });
        }

        return {
          capability: "trending-tokens",
          chain,
          count: filtered.length,
          items: filtered,
        };
      } catch (e) {
        return reply.code(502).send({
          capability: "trending-tokens",
          error: e instanceof Error ? e.message : "dexscreener fetch failed",
        });
      }
    }
  );

  fastify.get("/mcp/trending-tokens", async () => ({
    capability: "trending-tokens",
    description:
      "Top boosted/trending tokens from DEXScreener, filtered by chain. Body: { chain?: 'base'|'ethereum'|'solana' (default 'base'), limit?: number (default 10, max 20) }.",
    method: "POST",
  }));
};
