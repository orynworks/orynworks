import type { FastifyPluginAsync } from "fastify";
import { createPublicClient, http, isAddress, getAddress } from "viem";
import { base, baseSepolia, mainnet } from "viem/chains";
import { randomBytes } from "node:crypto";

// Built-in demo MCP capabilities, hosted directly by the gateway. These exist
// so the marketplace is functional end-to-end at launch without depending on
// external builder infra. Each is small and uses only public free RPCs.

const ETH_RPC = process.env.ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com";
const BASE_RPC = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const BASE_SEPOLIA_RPC =
  process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

const ethClient = createPublicClient({ chain: mainnet, transport: http(ETH_RPC) });
const baseClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });
const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC),
});

export const mcpDemosRoute: FastifyPluginAsync = async (fastify) => {
  // ─── echo ──────────────────────────────────────────────────────────────
  fastify.post("/mcp/echo", async (req) => {
    return {
      capability: "echo",
      version: "1.0.0",
      receivedAt: new Date().toISOString(),
      requestId: randomBytes(8).toString("hex"),
      echo: req.body ?? null,
    };
  });

  fastify.get("/mcp/echo", async () => ({
    capability: "echo",
    description: "Debugging MCP that mirrors any input.",
    method: "POST",
    schema: { input: "any json", output: "{ echo, receivedAt, requestId }" },
  }));

  // ─── base-block ────────────────────────────────────────────────────────
  fastify.post<{ Body: { network?: string; prompt?: string } }>(
    "/mcp/base-block",
    async (req, reply) => {
      const body = (req.body ?? {}) as { network?: string; prompt?: string };
      const requested =
        body.network === "mainnet" || body.network === "sepolia"
          ? body.network
          : inferNetwork(body.prompt) ?? "sepolia";

      try {
        const client = requested === "mainnet" ? baseClient : baseSepoliaClient;
        const chainId = requested === "mainnet" ? base.id : baseSepolia.id;
        const [number, block] = await Promise.all([
          client.getBlockNumber(),
          client.getBlock({ blockTag: "latest", includeTransactions: false }),
        ]);
        return {
          capability: "base-block",
          network: requested,
          chainId,
          blockNumber: Number(number),
          blockHash: block.hash,
          blockTimestampUnix: Number(block.timestamp),
          blockTimestampIso: new Date(Number(block.timestamp) * 1000).toISOString(),
          txCount: Array.isArray(block.transactions) ? block.transactions.length : 0,
        };
      } catch (e) {
        return reply.code(502).send({
          capability: "base-block",
          error: e instanceof Error ? e.message : "rpc call failed",
        });
      }
    }
  );

  fastify.get("/mcp/base-block", async () => ({
    capability: "base-block",
    description:
      "Latest block info on Base mainnet or Sepolia. Use { network: 'mainnet'|'sepolia' } or include the word in `prompt`.",
    method: "POST",
  }));

  // ─── ens-lookup ────────────────────────────────────────────────────────
  fastify.post<{ Body: { prompt?: string; name?: string; address?: string } }>(
    "/mcp/ens-lookup",
    async (req, reply) => {
      const body = (req.body ?? {}) as {
        prompt?: string;
        name?: string;
        address?: string;
      };
      const raw = (body.name ?? body.address ?? body.prompt ?? "").trim();
      if (!raw) {
        return reply.code(400).send({
          capability: "ens-lookup",
          error: "missing input — provide { name: 'vitalik.eth' } or { address: '0x...' }",
        });
      }

      try {
        if (isAddress(raw)) {
          const checksummed = getAddress(raw);
          const ensName = await ethClient.getEnsName({ address: checksummed });
          return {
            capability: "ens-lookup",
            direction: "address → name",
            address: checksummed,
            ensName,
            resolved: ensName !== null,
          };
        }
        const name = raw.toLowerCase();
        const address = await ethClient.getEnsAddress({ name });
        return {
          capability: "ens-lookup",
          direction: "name → address",
          name,
          address,
          resolved: address !== null,
        };
      } catch (e) {
        return reply.code(502).send({
          capability: "ens-lookup",
          error: e instanceof Error ? e.message : "lookup failed",
        });
      }
    }
  );

  fastify.get("/mcp/ens-lookup", async () => ({
    capability: "ens-lookup",
    description:
      "Resolve ENS name to mainnet address or reverse-resolve an address to its primary ENS name.",
    method: "POST",
  }));

  // ─── github-trending ───────────────────────────────────────────────────
  fastify.post<{ Body: { language?: string; prompt?: string; limit?: number } }>(
    "/mcp/github-trending",
    async (req, reply) => {
      const body = (req.body ?? {}) as {
        language?: string;
        prompt?: string;
        limit?: number;
      };
      const language =
        body.language ?? inferLanguage(body.prompt) ?? "typescript";
      const limit = Math.min(Math.max(body.limit ?? 10, 1), 20);

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const url = `https://api.github.com/search/repositories?q=created:>${since}+language:${encodeURIComponent(
        language
      )}&sort=stars&order=desc&per_page=${limit}`;

      try {
        const res = await fetch(url, {
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "oryn-gateway-mcp-demo/1.0",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          return reply.code(502).send({
            capability: "github-trending",
            error: `github api returned ${res.status}`,
            rateLimitRemaining: res.headers.get("x-ratelimit-remaining"),
          });
        }

        const payload = (await res.json()) as { items?: any[] };
        const items = (payload.items ?? []).map((it: any) => ({
          name: it.full_name,
          owner: it.owner?.login,
          url: it.html_url,
          description: it.description,
          stars: it.stargazers_count,
          language: it.language,
          createdAt: it.created_at,
        }));

        return {
          capability: "github-trending",
          language,
          since,
          count: items.length,
          items,
        };
      } catch (e) {
        return reply.code(502).send({
          capability: "github-trending",
          error: e instanceof Error ? e.message : "fetch failed",
        });
      }
    }
  );

  fastify.get("/mcp/github-trending", async () => ({
    capability: "github-trending",
    description: "Top GitHub repos created in the last 7 days, by language.",
    method: "POST",
  }));
};

function inferNetwork(prompt?: string): "mainnet" | "sepolia" | null {
  if (!prompt) return null;
  const lower = prompt.toLowerCase();
  if (lower.includes("mainnet") || lower.includes("8453")) return "mainnet";
  if (lower.includes("sepolia") || lower.includes("84532") || lower.includes("testnet"))
    return "sepolia";
  return null;
}

function inferLanguage(prompt?: string): string | null {
  if (!prompt) return null;
  const lower = prompt.toLowerCase();
  for (const lang of [
    "typescript",
    "javascript",
    "python",
    "rust",
    "go",
    "solidity",
    "java",
    "swift",
    "kotlin",
  ]) {
    if (lower.includes(lang)) return lang;
  }
  return null;
}
