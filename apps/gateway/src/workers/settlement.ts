import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { base, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getDb } from "../lib/db.js";
import { env } from "../env.js";
import { getUnsettledByBuilder, markEventsSettled } from "@oryn/db";

const ESCROW_ABI = [
  {
    name: "settle",
    type: "function",
    inputs: [
      { name: "builder", type: "address" },
      { name: "amountUSDC", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const USDC_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    name: "allowance",
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export type SettlementConfig = {
  privateKey: `0x${string}`;
  escrowAddress: `0x${string}`;
  usdcAddress: `0x${string}`;
  chainId: number;
};

export async function runSettlement(config: SettlementConfig) {
  const db = getDb();
  const account = privateKeyToAccount(config.privateKey);
  const chain = config.chainId === 84532 ? baseSepolia : base;

  const publicClient = createPublicClient({ chain, transport: http() });
  const walletClient = createWalletClient({ account, chain, transport: http() });

  const unsettled = await getUnsettledByBuilder(db);
  if (unsettled.length === 0) {
    console.log("[settlement] nothing to settle");
    return;
  }

  // Ensure USDC allowance to escrow
  const totalUsdcWei = unsettled.reduce(
    (acc, u) => acc + parseUnits(u.totalUsdc, 6),
    0n
  );
  const currentAllowance = (await publicClient.readContract({
    address: config.usdcAddress,
    abi: USDC_ABI,
    functionName: "allowance",
    args: [account.address, config.escrowAddress],
  })) as bigint;

  if (currentAllowance < totalUsdcWei) {
    console.log(`[settlement] approving USDC: ${totalUsdcWei}`);
    const approveTx = await walletClient.writeContract({
      address: config.usdcAddress,
      abi: USDC_ABI,
      functionName: "approve",
      args: [config.escrowAddress, totalUsdcWei],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
  }

  for (const u of unsettled) {
    const amountWei = parseUnits(u.totalUsdc, 6);
    console.log(`[settlement] settling builder ${u.builderAddress}: ${u.totalUsdc} USDC`);
    try {
      const tx = await walletClient.writeContract({
        address: config.escrowAddress,
        abi: ESCROW_ABI,
        functionName: "settle",
        args: [u.builderAddress as `0x${string}`, amountWei],
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      await markEventsSettled(db, u.eventIds, tx);
      console.log(`  ok tx ${tx}`);
    } catch (e) {
      console.error(`  failed for ${u.builderAddress}:`, e);
      // Don't mark settled; leave for retry
    }
  }
}

// CLI entry point
if (process.argv[1].endsWith("settlement.js") || process.argv[1].endsWith("settlement.ts")) {
  const config: SettlementConfig = {
    privateKey: process.env.SETTLEMENT_PRIVATE_KEY as `0x${string}`,
    escrowAddress: process.env.REVENUE_ESCROW_ADDRESS as `0x${string}`,
    usdcAddress: process.env.USDC_ADDRESS as `0x${string}`,
    chainId: env.X402_CHAIN_ID,
  };

  if (!config.privateKey || !config.escrowAddress || !config.usdcAddress) {
    console.error("Missing env: SETTLEMENT_PRIVATE_KEY, REVENUE_ESCROW_ADDRESS, USDC_ADDRESS");
    process.exit(1);
  }

  runSettlement(config)
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
