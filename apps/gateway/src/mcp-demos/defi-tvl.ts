import type { FastifyPluginAsync } from "fastify";
import { createPublicClient, http } from "viem";
import { base, baseSepolia, mainnet } from "viem/chains";

// DeFi TVL MCP capability. Wraps DeFiLlama's free public API to expose either
// a single-protocol detail view or a ranked top-N snapshot. Hosted directly by
// the gateway so the marketplace has a working DeFi-data capability at launch.

const ETH_RPC = process.env.ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com";
const BASE_RPC = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const BASE_SEPOLIA_RPC =
  process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

// Clients kept local to this module — do not import from the routes file.
// Unused-by-default but instantiated to mirror the demo pattern and keep
// chain-aware extensions (e.g. on-chain price oracles) cheap to add later.
const _ethClient = createPublicClient({ chain: mainnet, transport: http(ETH_RPC) });
const _baseClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });
const _baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC),
});

void _ethClient;
void _baseClient;
void _baseSepoliaClient;

const LLAMA_BASE = "https://api.llama.fi";
const USER_AGENT = "oryn-gateway-mcp-demo/1.0";
const FETCH_TIMEOUT_MS = 8000;

type DefiTvlBody = {
  protocol?: string;
  limit?: number;
};

type ProtocolSummary = {
  name: string | null;
  slug: string | null;
  tvl: number | null;
  change1d: number | null;
  change7d: number | null;
  chains: string[];
  category: string | null;
  url: string | null;
};

type LlamaProtocolListItem = {
  name?: unknown;
  slug?: unknown;
  tvl?: unknown;
  change_1d?: unknown;
  change_7d?: unknown;
  chains?: unknown;
  category?: unknown;
  url?: unknown;
};

type LlamaProtocolDetail = {
  name?: unknown;
  slug?: unknown;
  tvl?: unknown;
  currentChainTvls?: Record<string, unknown>;
  change_1d?: unknown;
  change_7d?: unknown;
  chains?: unknown;
  category?: unknown;
  url?: unknown;
};

export const defitvlRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: DefiTvlBody }>(
    "/mcp/defi-tvl",
    async (req, reply) => {
      const body = (req.body ?? {}) as DefiTvlBody;
      const rawProtocol =
        typeof body.protocol === "string" ? body.protocol.trim() : "";
      const limit = Math.min(
        Math.max(typeof body.limit === "number" ? body.limit : 10, 1),
        50
      );

      try {
        if (rawProtocol.length > 0) {
          const slug = normalizeSlug(rawProtocol);
          if (!slug) {
            return reply.code(400).send({
              capability: "defi-tvl",
              error: "invalid protocol slug",
            });
          }

          const url = `${LLAMA_BASE}/protocol/${encodeURIComponent(slug)}`;
          const res = await fetch(url, {
            headers: {
              Accept: "application/json",
              "User-Agent": USER_AGENT,
            },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          });

          if (!res.ok) {
            return reply.code(502).send({
              capability: "defi-tvl",
              error: `defillama api returned ${res.status}`,
            });
          }

          const payload = (await res.json()) as LlamaProtocolDetail;
          const tvlFromChains = sumChainTvls(payload.currentChainTvls);
          const tvlValue =
            typeof payload.tvl === "number" ? payload.tvl : tvlFromChains;

          const summary: ProtocolSummary = {
            name: asString(payload.name),
            slug: asString(payload.slug) ?? slug,
            tvl: tvlValue,
            change1d: asNumber(payload.change_1d),
            change7d: asNumber(payload.change_7d),
            chains: asStringArray(payload.chains),
            category: asString(payload.category),
            url: asString(payload.url),
          };

          return {
            capability: "defi-tvl",
            mode: "detail" as const,
            protocols: [summary],
          };
        }

        const url = `${LLAMA_BASE}/protocols`;
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT,
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (!res.ok) {
          return reply.code(502).send({
            capability: "defi-tvl",
            error: `defillama api returned ${res.status}`,
          });
        }

        const payload = (await res.json()) as unknown;
        if (!Array.isArray(payload)) {
          return reply.code(502).send({
            capability: "defi-tvl",
            error: "unexpected defillama payload shape",
          });
        }

        const sorted = [...(payload as LlamaProtocolListItem[])]
          .filter((p) => typeof p?.tvl === "number")
          .sort((a, b) => {
            const at = typeof a.tvl === "number" ? a.tvl : 0;
            const bt = typeof b.tvl === "number" ? b.tvl : 0;
            return bt - at;
          })
          .slice(0, limit)
          .map<ProtocolSummary>((p) => ({
            name: asString(p.name),
            slug: asString(p.slug),
            tvl: asNumber(p.tvl),
            change1d: asNumber(p.change_1d),
            change7d: asNumber(p.change_7d),
            chains: asStringArray(p.chains),
            category: asString(p.category),
            url: asString(p.url),
          }));

        return {
          capability: "defi-tvl",
          mode: "top" as const,
          protocols: sorted,
        };
      } catch (e) {
        return reply.code(502).send({
          capability: "defi-tvl",
          error: e instanceof Error ? e.message : "fetch failed",
        });
      }
    }
  );

  fastify.get("/mcp/defi-tvl", async () => ({
    capability: "defi-tvl",
    description:
      "DeFi TVL via DeFiLlama. With { protocol: 'uniswap' } returns that protocol's detail; otherwise returns top N protocols by TVL (default 10, max 50).",
    method: "POST",
  }));
};

function normalizeSlug(input: string): string | null {
  const cleaned = input.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  const trimmed = cleaned.replace(/^-+|-+$/g, "");
  return trimmed.length > 0 ? trimmed : null;
}

function sumChainTvls(chainTvls: Record<string, unknown> | undefined): number | null {
  if (!chainTvls || typeof chainTvls !== "object") return null;
  let total = 0;
  let found = false;
  for (const value of Object.values(chainTvls)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      total += value;
      found = true;
    }
  }
  return found ? total : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0);
}
