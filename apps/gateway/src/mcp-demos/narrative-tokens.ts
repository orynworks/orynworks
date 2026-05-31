import type { FastifyPluginAsync } from "fastify";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

// Local viem client so this module is self-contained.
const BASE_RPC = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const baseClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });

type NarrativeToken = {
  symbol: string;
  coingeckoId: string;
  name: string;
};

const NARRATIVES: Record<string, ReadonlyArray<NarrativeToken>> = {
  "ai-agents": [
    { symbol: "FET", coingeckoId: "fetch-ai", name: "Fetch.ai" },
    { symbol: "TAO", coingeckoId: "bittensor", name: "Bittensor" },
    { symbol: "OCEAN", coingeckoId: "ocean-protocol", name: "Ocean Protocol" },
    { symbol: "VIRTUAL", coingeckoId: "virtual-protocol", name: "Virtuals Protocol" },
    { symbol: "AKT", coingeckoId: "akash-network", name: "Akash Network" },
    { symbol: "RNDR", coingeckoId: "render-token", name: "Render" },
    { symbol: "IO", coingeckoId: "io-net", name: "io.net" },
    { symbol: "AIOZ", coingeckoId: "aioz-network", name: "AIOZ Network" },
    { symbol: "NMR", coingeckoId: "numeraire", name: "Numeraire" },
    { symbol: "WLD", coingeckoId: "worldcoin-wld", name: "Worldcoin" },
  ],
  depin: [
    { symbol: "HNT", coingeckoId: "helium", name: "Helium" },
    { symbol: "FIL", coingeckoId: "filecoin", name: "Filecoin" },
    { symbol: "RNDR", coingeckoId: "render-token", name: "Render" },
    { symbol: "AR", coingeckoId: "arweave", name: "Arweave" },
    { symbol: "THETA", coingeckoId: "theta-token", name: "Theta Network" },
    { symbol: "HONEY", coingeckoId: "hivemapper", name: "Hivemapper" },
    { symbol: "DIMO", coingeckoId: "dimo", name: "DIMO" },
    { symbol: "GRASS", coingeckoId: "grass", name: "Grass" },
  ],
  "memes-base": [
    { symbol: "BRETT", coingeckoId: "based-brett", name: "Brett" },
    { symbol: "DEGEN", coingeckoId: "degen-base", name: "Degen" },
    { symbol: "KEYCAT", coingeckoId: "keyboard-cat-base", name: "Keyboard Cat" },
    { symbol: "MOCHI", coingeckoId: "mochi-thecatcoin", name: "Mochi" },
    { symbol: "TOSHI", coingeckoId: "toshi", name: "Toshi" },
    { symbol: "BENJI", coingeckoId: "benji-base", name: "Benji" },
  ],
  rwa: [
    { symbol: "ONDO", coingeckoId: "ondo-finance", name: "Ondo" },
    { symbol: "MPL", coingeckoId: "maple", name: "Maple" },
    { symbol: "CFG", coingeckoId: "centrifuge", name: "Centrifuge" },
    { symbol: "GFI", coingeckoId: "goldfinch", name: "Goldfinch" },
    { symbol: "POLYX", coingeckoId: "polymesh", name: "Polymesh" },
  ],
  "defi-blue-chips": [
    { symbol: "UNI", coingeckoId: "uniswap", name: "Uniswap" },
    { symbol: "AAVE", coingeckoId: "aave", name: "Aave" },
    { symbol: "LDO", coingeckoId: "lido-dao", name: "Lido DAO" },
    { symbol: "MKR", coingeckoId: "maker", name: "Maker" },
    { symbol: "CRV", coingeckoId: "curve-dao-token", name: "Curve DAO" },
    { symbol: "COMP", coingeckoId: "compound-governance-token", name: "Compound" },
    { symbol: "SNX", coingeckoId: "havven", name: "Synthetix" },
    { symbol: "PENDLE", coingeckoId: "pendle", name: "Pendle" },
  ],
  "base-ecosystem": [
    { symbol: "AERO", coingeckoId: "aerodrome-finance", name: "Aerodrome Finance" },
    { symbol: "MORPHO", coingeckoId: "morpho", name: "Morpho" },
    { symbol: "VIRTUAL", coingeckoId: "virtual-protocol", name: "Virtuals Protocol" },
    { symbol: "BRETT", coingeckoId: "based-brett", name: "Brett" },
    { symbol: "DEGEN", coingeckoId: "degen-base", name: "Degen" },
    { symbol: "PRIME", coingeckoId: "echelon-prime", name: "Echelon Prime" },
  ],
  l2s: [
    { symbol: "ARB", coingeckoId: "arbitrum", name: "Arbitrum" },
    { symbol: "OP", coingeckoId: "optimism", name: "Optimism" },
    { symbol: "STRK", coingeckoId: "starknet", name: "Starknet" },
    { symbol: "MNT", coingeckoId: "mantle", name: "Mantle" },
    { symbol: "MATIC", coingeckoId: "matic-network", name: "Polygon" },
    { symbol: "IMX", coingeckoId: "immutable-x", name: "Immutable" },
  ],
  oracles: [
    { symbol: "LINK", coingeckoId: "chainlink", name: "Chainlink" },
    { symbol: "PYTH", coingeckoId: "pyth-network", name: "Pyth Network" },
    { symbol: "TRB", coingeckoId: "tellor", name: "Tellor" },
    { symbol: "API3", coingeckoId: "api3", name: "API3" },
  ],
  gaming: [
    { symbol: "AXS", coingeckoId: "axie-infinity", name: "Axie Infinity" },
    { symbol: "GALA", coingeckoId: "gala", name: "Gala" },
    { symbol: "IMX", coingeckoId: "immutable-x", name: "Immutable" },
    { symbol: "BEAM", coingeckoId: "beam-2", name: "Beam" },
    { symbol: "RON", coingeckoId: "ronin", name: "Ronin" },
    { symbol: "PRIME", coingeckoId: "echelon-prime", name: "Echelon Prime" },
  ],
};

type NarrativeTokensBody = {
  narrative?: string;
  list?: boolean;
};

type CoinGeckoPriceEntry = {
  usd?: number;
  usd_market_cap?: number;
  usd_24h_vol?: number;
  usd_24h_change?: number;
};

type CoinGeckoPriceResponse = Record<string, CoinGeckoPriceEntry>;

type EnrichedToken = {
  symbol: string;
  name: string;
  coingeckoId: string;
  priceUsd: number | null;
  change24h: number | null;
  marketCap: number | null;
  volume24h: number | null;
};

const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price";

function availableNarratives(): string[] {
  return Object.keys(NARRATIVES);
}

function isValidNarrative(input: unknown): input is string {
  return (
    typeof input === "string" &&
    Object.prototype.hasOwnProperty.call(NARRATIVES, input)
  );
}

function pickNumber(input: unknown): number | null {
  return typeof input === "number" && Number.isFinite(input) ? input : null;
}

export const narrativetokensRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: NarrativeTokensBody }>(
    "/mcp/narrative-tokens",
    async (req, reply) => {
      const body = (req.body ?? {}) as NarrativeTokensBody;

      if (body.list === true || !isValidNarrative(body.narrative)) {
        return {
          capability: "narrative-tokens",
          availableNarratives: availableNarratives(),
          hint: "Pass { narrative: '<key>' } to fetch tokens",
        };
      }

      const narrative = body.narrative;
      const tokens = NARRATIVES[narrative];
      const ids = tokens.map((t) => t.coingeckoId).join(",");
      const url =
        `${COINGECKO_URL}?ids=${encodeURIComponent(ids)}` +
        `&vs_currencies=usd&include_24hr_change=true` +
        `&include_market_cap=true&include_24hr_vol=true`;

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
            capability: "narrative-tokens",
            error: `coingecko responded ${res.status}`,
          });
        }

        const raw = (await res.json()) as unknown;
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          return reply.code(502).send({
            capability: "narrative-tokens",
            error: "unexpected coingecko payload shape",
          });
        }

        const priceMap = raw as CoinGeckoPriceResponse;
        const enriched: EnrichedToken[] = tokens.map((t) => {
          const entry = priceMap[t.coingeckoId];
          return {
            symbol: t.symbol,
            name: t.name,
            coingeckoId: t.coingeckoId,
            priceUsd: entry ? pickNumber(entry.usd) : null,
            change24h: entry ? pickNumber(entry.usd_24h_change) : null,
            marketCap: entry ? pickNumber(entry.usd_market_cap) : null,
            volume24h: entry ? pickNumber(entry.usd_24h_vol) : null,
          };
        });

        return {
          capability: "narrative-tokens",
          narrative,
          count: enriched.length,
          tokens: enriched,
        };
      } catch (e) {
        return reply.code(502).send({
          capability: "narrative-tokens",
          error: e instanceof Error ? e.message : "coingecko fetch failed",
        });
      }
    }
  );

  fastify.get("/mcp/narrative-tokens", async () => ({
    capability: "narrative-tokens",
    description:
      "Curated narrative-based token baskets enriched with live CoinGecko prices. Body: { narrative?: string, list?: boolean }. Pass { list: true } or omit narrative to see available keys. Available narratives: " +
      availableNarratives().join(", ") +
      ".",
    method: "POST",
  }));
};
