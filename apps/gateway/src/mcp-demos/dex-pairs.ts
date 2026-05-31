import type { FastifyPluginAsync } from "fastify";
import { createPublicClient, http, isAddress } from "viem";
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

type DexPairsBody = {
  tokenAddress?: unknown;
  chain?: unknown;
};

type DexScreenerToken = {
  address?: string;
  name?: string;
  symbol?: string;
};

type DexScreenerTxnsBucket = {
  buys?: number;
  sells?: number;
};

type DexScreenerTxns = {
  m5?: DexScreenerTxnsBucket;
  h1?: DexScreenerTxnsBucket;
  h6?: DexScreenerTxnsBucket;
  h24?: DexScreenerTxnsBucket;
};

type DexScreenerVolume = {
  m5?: number;
  h1?: number;
  h6?: number;
  h24?: number;
};

type DexScreenerLiquidity = {
  usd?: number;
  base?: number;
  quote?: number;
};

type DexScreenerPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: DexScreenerToken;
  quoteToken?: DexScreenerToken;
  priceNative?: string;
  priceUsd?: string;
  txns?: DexScreenerTxns;
  volume?: DexScreenerVolume;
  liquidity?: DexScreenerLiquidity;
};

type NormalizedToken = {
  address: string;
  name: string;
  symbol: string;
};

type NormalizedTxns = {
  buys: number;
  sells: number;
};

type NormalizedPair = {
  dexId: string;
  pairAddress: string;
  baseToken: NormalizedToken;
  quoteToken: NormalizedToken;
  priceUsd: string | null;
  priceNative: string | null;
  liquidityUsd: number;
  volume24h: number;
  txns24h: NormalizedTxns;
  url: string | null;
};

const DEFAULT_CHAIN = "base";
const DEXSCREENER_BASE = "https://api.dexscreener.com/tokens/v1";

function parseChain(input: unknown): string {
  if (typeof input !== "string") return DEFAULT_CHAIN;
  const trimmed = input.trim().toLowerCase();
  if (trimmed.length === 0) return DEFAULT_CHAIN;
  // Restrict to a conservative slug to avoid path injection into the upstream
  // URL. DEXScreener chain identifiers are alphanumeric with optional hyphens.
  if (!/^[a-z0-9-]{1,32}$/.test(trimmed)) return DEFAULT_CHAIN;
  return trimmed;
}

function normalizeToken(input: DexScreenerToken | undefined): NormalizedToken {
  return {
    address: typeof input?.address === "string" ? input.address : "",
    name: typeof input?.name === "string" ? input.name : "",
    symbol: typeof input?.symbol === "string" ? input.symbol : "",
  };
}

function normalizeTxns(input: DexScreenerTxnsBucket | undefined): NormalizedTxns {
  const buys =
    typeof input?.buys === "number" && Number.isFinite(input.buys)
      ? input.buys
      : 0;
  const sells =
    typeof input?.sells === "number" && Number.isFinite(input.sells)
      ? input.sells
      : 0;
  return { buys, sells };
}

function normalizeLiquidityUsd(input: DexScreenerLiquidity | undefined): number {
  if (typeof input?.usd === "number" && Number.isFinite(input.usd)) {
    return input.usd;
  }
  return 0;
}

function normalizeVolume24h(input: DexScreenerVolume | undefined): number {
  if (typeof input?.h24 === "number" && Number.isFinite(input.h24)) {
    return input.h24;
  }
  return 0;
}

function normalizePriceString(input: unknown): string | null {
  if (typeof input === "string" && input.length > 0) return input;
  if (typeof input === "number" && Number.isFinite(input)) return String(input);
  return null;
}

export const dexpairsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: DexPairsBody }>(
    "/mcp/dex-pairs",
    async (req, reply) => {
      const body = (req.body ?? {}) as DexPairsBody;
      const tokenAddressRaw =
        typeof body.tokenAddress === "string" ? body.tokenAddress.trim() : "";

      if (!tokenAddressRaw) {
        return reply.code(400).send({
          capability: "dex-pairs",
          error: "missing input — provide { tokenAddress: '0x...' }",
        });
      }

      if (!isAddress(tokenAddressRaw)) {
        return reply.code(400).send({
          capability: "dex-pairs",
          error: "invalid tokenAddress — must be a 0x-prefixed EVM address",
        });
      }

      const chain = parseChain(body.chain);
      const url = `${DEXSCREENER_BASE}/${encodeURIComponent(chain)}/${encodeURIComponent(tokenAddressRaw)}`;

      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "oryn-gateway-mcp-demo/1.0",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          return reply.code(502).send({
            capability: "dex-pairs",
            error: `dexscreener responded ${res.status}`,
          });
        }

        const raw = (await res.json()) as unknown;

        // DEXScreener returns either an array of pairs or, in the case of an
        // unknown token, an empty array / null. Treat any non-array shape as
        // "no pairs" rather than an upstream error.
        if (!Array.isArray(raw)) {
          return {
            capability: "dex-pairs",
            chain,
            tokenAddress: tokenAddressRaw,
            count: 0,
            pairs: [] as NormalizedPair[],
          };
        }

        const pairs = raw as DexScreenerPair[];
        const normalized: NormalizedPair[] = [];
        for (const p of pairs) {
          if (!p || typeof p !== "object") continue;
          if (typeof p.pairAddress !== "string" || p.pairAddress.length === 0) {
            continue;
          }
          normalized.push({
            dexId: typeof p.dexId === "string" ? p.dexId : "",
            pairAddress: p.pairAddress,
            baseToken: normalizeToken(p.baseToken),
            quoteToken: normalizeToken(p.quoteToken),
            priceUsd: normalizePriceString(p.priceUsd),
            priceNative: normalizePriceString(p.priceNative),
            liquidityUsd: normalizeLiquidityUsd(p.liquidity),
            volume24h: normalizeVolume24h(p.volume),
            txns24h: normalizeTxns(p.txns?.h24),
            url: typeof p.url === "string" && p.url.length > 0 ? p.url : null,
          });
        }

        normalized.sort((a, b) => b.liquidityUsd - a.liquidityUsd);

        return {
          capability: "dex-pairs",
          chain,
          tokenAddress: tokenAddressRaw,
          count: normalized.length,
          pairs: normalized,
        };
      } catch (e) {
        return reply.code(502).send({
          capability: "dex-pairs",
          error: e instanceof Error ? e.message : "dexscreener fetch failed",
        });
      }
    }
  );

  fastify.get("/mcp/dex-pairs", async () => ({
    capability: "dex-pairs",
    description:
      "All DEX pairs for a token from DEXScreener, sorted by USD liquidity descending. Body: { tokenAddress: '0x...' (required), chain?: string (default 'base') }.",
    method: "POST",
  }));
};
