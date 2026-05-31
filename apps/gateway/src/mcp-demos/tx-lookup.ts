import type { FastifyPluginAsync } from "fastify";
import { createPublicClient, http } from "viem";
import { base, baseSepolia, mainnet } from "viem/chains";

// Standalone MCP capability: look up a transaction receipt on Base, Ethereum,
// or Base Sepolia. Uses public RPCs and avoids any shared state with the
// existing mcp-demos route module so it can be lifted out independently.

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

type ChainName = "base" | "ethereum" | "sepolia";

interface TxLookupBody {
  hash?: string;
  chain?: ChainName;
}

const HASH_RE = /^0x[0-9a-fA-F]{64}$/;

function isHex32(value: string): value is `0x${string}` {
  return HASH_RE.test(value);
}

function clientFor(chain: ChainName) {
  switch (chain) {
    case "ethereum":
      return { client: ethClient, chainId: mainnet.id, network: "ethereum" as const };
    case "sepolia":
      return {
        client: baseSepoliaClient,
        chainId: baseSepolia.id,
        network: "base-sepolia" as const,
      };
    case "base":
    default:
      return { client: baseClient, chainId: base.id, network: "base" as const };
  }
}

function explorerUrlFor(chain: ChainName, hash: string): string {
  switch (chain) {
    case "ethereum":
      return `https://etherscan.io/tx/${hash}`;
    case "sepolia":
      return `https://sepolia.basescan.org/tx/${hash}`;
    case "base":
    default:
      return `https://basescan.org/tx/${hash}`;
  }
}

export const txlookupRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: TxLookupBody }>("/mcp/tx-lookup", async (req, reply) => {
    const body = (req.body ?? {}) as TxLookupBody;
    const rawHash = (body.hash ?? "").trim();
    const requestedChain: ChainName =
      body.chain === "ethereum" || body.chain === "sepolia" || body.chain === "base"
        ? body.chain
        : "base";

    if (!rawHash) {
      return reply.code(400).send({
        capability: "tx-lookup",
        error: "missing input — provide { hash: '0x...' } (32-byte tx hash)",
      });
    }
    if (rawHash.length !== 66 || !isHex32(rawHash)) {
      return reply.code(400).send({
        capability: "tx-lookup",
        error: "invalid hash — expected 0x-prefixed 32-byte hex string (length 66)",
      });
    }

    const { client, chainId, network } = clientFor(requestedChain);

    try {
      const receipt = await client.getTransactionReceipt({ hash: rawHash });

      return {
        capability: "tx-lookup",
        hash: rawHash,
        network,
        chainId,
        status: receipt.status,
        blockNumber: Number(receipt.blockNumber),
        from: receipt.from,
        to: receipt.to,
        gasUsed: Number(receipt.gasUsed),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
        cumulativeGasUsed: Number(receipt.cumulativeGasUsed),
        logsCount: receipt.logs.length,
        transactionIndex: receipt.transactionIndex,
        explorerUrl: explorerUrlFor(requestedChain, rawHash),
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "rpc call failed";
      const notFound =
        /could not be found|not be found|not found/i.test(message) ||
        /TransactionReceiptNotFoundError/i.test(message);

      if (notFound) {
        return reply.code(404).send({
          capability: "tx-lookup",
          error: `transaction receipt not found on ${network} for hash ${rawHash} — it may be unmined, dropped, or on a different chain`,
          hash: rawHash,
          network,
          chainId,
        });
      }

      return reply.code(502).send({
        capability: "tx-lookup",
        error: message,
      });
    }
  });

  fastify.get("/mcp/tx-lookup", async () => ({
    capability: "tx-lookup",
    description:
      "Fetch a transaction receipt by hash on Base mainnet, Ethereum mainnet, or Base Sepolia. Returns status, gas, block, and explorer URL.",
    method: "POST",
    schema: {
      input: "{ hash: '0x<64 hex>', chain?: 'base'|'ethereum'|'sepolia' }",
      output:
        "{ status, blockNumber, from, to, gasUsed, effectiveGasPrice, cumulativeGasUsed, logsCount, transactionIndex, explorerUrl }",
    },
  }));
};
