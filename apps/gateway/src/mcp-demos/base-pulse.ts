import type { FastifyPluginAsync } from "fastify";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

// Base Pulse MCP capability. Composite "what's happening on Base right now"
// dashboard that fans out to viem (gas), DEXScreener (boosted + latest
// profiles), and DefiLlama (chain TVL) in parallel and synthesizes a single
// snapshot. Each upstream slot degrades gracefully — a single failure does
// not collapse the whole call.

const BASE_RPC = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const baseClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });

const USER_AGENT = "oryn-gateway-mcp-demo/1.0";
const FETCH_TIMEOUT_MS = 8000;

const DEXSCREENER_BOOSTED_URL =
  "https://api.dexscreener.com/token-boosts/top/v1";
const DEXSCREENER_LATEST_PROFILES_URL =
  "https://api.dexscreener.com/token-profiles/latest/v1";
const DEFILLAMA_CHAINS_URL = "https://api.llama.fi/v2/chains";

type BasePulseBody = Record<string, never>;

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

type DexScreenerTokenProfile = {
  url?: string;
  chainId?: string;
  tokenAddress?: string;
  icon?: string;
  header?: string;
  description?: string;
  links?: DexScreenerLink[];
};

type LlamaChainItem = {
  gecko_id?: unknown;
  tvl?: unknown;
  tokenSymbol?: unknown;
  cmcId?: unknown;
  name?: unknown;
  chainId?: unknown;
};

type GasSlot = {
  baseFeeGwei: number;
  gasPriceGwei: number;
  blockNumber: number;
};

type HotTokenItem = {
  tokenAddress: string;
  description: string | null;
  links: DexScreenerLink[];
};

type BaseTvlSlot = {
  tvlUsd: number | null;
  tokenSymbol: string | null;
};

type SettledOk<T> = { ok: true; value: T };
type SettledErr = { ok: false; error: string };
type Settled<T> = SettledOk<T> | SettledErr;

export const basepulseRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: BasePulseBody }>(
    "/mcp/base-pulse",
    async (_req, reply) => {
      try {
        const [gasResult, dexResult, tvlResult] = await Promise.all([
          fetchGas(),
          fetchDexSignals(),
          fetchBaseTvl(),
        ]);

        const notes: string[] = [];

        const gas: GasSlot | null = gasResult.ok ? gasResult.value : null;
        if (!gasResult.ok) notes.push(`gas: ${gasResult.error}`);

        const hotTokens: HotTokenItem[] = dexResult.ok
          ? dexResult.value.hotTokens
          : [];
        const newlyFeaturedCount: number | null = dexResult.ok
          ? dexResult.value.newlyFeaturedCount
          : null;
        if (!dexResult.ok) notes.push(`dexscreener: ${dexResult.error}`);

        const baseTvl: BaseTvlSlot | null = tvlResult.ok ? tvlResult.value : null;
        if (!tvlResult.ok) notes.push(`tvl: ${tvlResult.error}`);

        const vibe = synthesizeVibe({
          gas,
          hotTokenCount: hotTokens.length,
          newlyFeaturedCount,
          baseTvl,
        });

        return {
          capability: "base-pulse",
          timestamp: new Date().toISOString(),
          gas,
          hotTokens,
          newlyFeaturedCount,
          baseTvl,
          vibe,
          ...(notes.length > 0 ? { notes } : {}),
        };
      } catch (e) {
        return reply.code(502).send({
          capability: "base-pulse",
          error: e instanceof Error ? e.message : "base-pulse failed",
        });
      }
    }
  );

  fastify.get("/mcp/base-pulse", async () => ({
    capability: "base-pulse",
    description:
      "Snapshot of current Base activity: gas, trending tokens, new launches, TVL.",
    method: "POST",
  }));
};

async function fetchGas(): Promise<Settled<GasSlot>> {
  try {
    const [gasPrice, block] = await Promise.all([
      baseClient.getGasPrice(),
      baseClient.getBlock({ blockTag: "latest" }),
    ]);

    const baseFeePerGas = block.baseFeePerGas ?? 0n;
    const gasPriceGwei = Number(gasPrice) / 1e9;
    const baseFeeGwei = Number(baseFeePerGas) / 1e9;
    const blockNumber = Number(block.number ?? 0n);

    return {
      ok: true,
      value: { baseFeeGwei, gasPriceGwei, blockNumber },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "rpc call failed",
    };
  }
}

type DexSignals = {
  hotTokens: HotTokenItem[];
  newlyFeaturedCount: number;
};

async function fetchDexSignals(): Promise<Settled<DexSignals>> {
  try {
    const [boostedRes, profilesRes] = await Promise.all([
      fetch(DEXSCREENER_BOOSTED_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }),
      fetch(DEXSCREENER_LATEST_PROFILES_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }),
    ]);

    if (!boostedRes.ok) {
      return {
        ok: false,
        error: `boosted endpoint responded ${boostedRes.status}`,
      };
    }
    if (!profilesRes.ok) {
      return {
        ok: false,
        error: `profiles endpoint responded ${profilesRes.status}`,
      };
    }

    const boostedRaw = (await boostedRes.json()) as unknown;
    const profilesRaw = (await profilesRes.json()) as unknown;

    if (!Array.isArray(boostedRaw)) {
      return { ok: false, error: "unexpected boosted payload shape" };
    }
    if (!Array.isArray(profilesRaw)) {
      return { ok: false, error: "unexpected profiles payload shape" };
    }

    const boosted = boostedRaw as DexScreenerBoostedToken[];
    const hotTokens: HotTokenItem[] = [];
    for (const t of boosted) {
      if (hotTokens.length >= 5) break;
      if (!t || typeof t !== "object") continue;
      if (t.chainId !== "base") continue;
      if (typeof t.tokenAddress !== "string" || t.tokenAddress.length === 0) {
        continue;
      }
      hotTokens.push({
        tokenAddress: t.tokenAddress,
        description: typeof t.description === "string" ? t.description : null,
        links: Array.isArray(t.links) ? t.links : [],
      });
    }

    const profiles = profilesRaw as DexScreenerTokenProfile[];
    let newlyFeaturedCount = 0;
    for (const p of profiles) {
      if (!p || typeof p !== "object") continue;
      if (p.chainId === "base") newlyFeaturedCount += 1;
    }

    return {
      ok: true,
      value: { hotTokens, newlyFeaturedCount },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "dexscreener fetch failed",
    };
  }
}

async function fetchBaseTvl(): Promise<Settled<BaseTvlSlot>> {
  try {
    const res = await fetch(DEFILLAMA_CHAINS_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      return { ok: false, error: `defillama responded ${res.status}` };
    }

    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw)) {
      return { ok: false, error: "unexpected defillama payload shape" };
    }

    const chains = raw as LlamaChainItem[];
    const found = chains.find(
      (c) => typeof c?.name === "string" && c.name === "Base"
    );

    if (!found) {
      return { ok: false, error: "base chain not found in defillama response" };
    }

    const tvlUsd =
      typeof found.tvl === "number" && Number.isFinite(found.tvl)
        ? found.tvl
        : null;
    const tokenSymbol =
      typeof found.tokenSymbol === "string" && found.tokenSymbol.length > 0
        ? found.tokenSymbol
        : null;

    return {
      ok: true,
      value: { tvlUsd, tokenSymbol },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "defillama fetch failed",
    };
  }
}

type VibeInput = {
  gas: GasSlot | null;
  hotTokenCount: number;
  newlyFeaturedCount: number | null;
  baseTvl: BaseTvlSlot | null;
};

function synthesizeVibe(input: VibeInput): string {
  const parts: string[] = [];

  if (input.gas) {
    const gwei = input.gas.gasPriceGwei;
    const mood =
      gwei < 0.01 ? "chill" : gwei < 0.05 ? "calm" : gwei < 0.2 ? "warm" : "hot";
    parts.push(`Base gas is ${mood} (${formatGwei(gwei)} gwei)`);
  } else {
    parts.push("gas unknown");
  }

  if (input.hotTokenCount > 0) {
    parts.push(`${input.hotTokenCount} tokens trending`);
  } else {
    parts.push("no trending tokens");
  }

  if (typeof input.newlyFeaturedCount === "number") {
    parts.push(`${input.newlyFeaturedCount} new profiles`);
  }

  if (input.baseTvl && typeof input.baseTvl.tvlUsd === "number") {
    parts.push(`${formatUsdShort(input.baseTvl.tvlUsd)} TVL`);
  }

  const tail =
    input.gas && input.gas.gasPriceGwei < 0.05 && input.hotTokenCount > 0
      ? " — quiet but liquid"
      : input.hotTokenCount >= 5
      ? " — active flow"
      : "";

  return parts.join(", ") + tail;
}

function formatGwei(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value < 0.001) return value.toExponential(2);
  if (value < 1) return value.toFixed(4);
  return value.toFixed(2);
}

function formatUsdShort(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}
