import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  type Hash,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { randomUUID } from "node:crypto";
import { getDb } from "../lib/db.js";
import { env } from "../env.js";
import {
  getUnsettledByBuilder,
  lockEventsForSettle,
  attachTxHashToLock,
  markSettledByTxHash,
  releaseSettlementLock,
  getInProgressSettlements,
} from "@oryn/db";

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

const MAX_UINT256 = (1n << 256n) - 1n;

export async function runSettlement(config: SettlementConfig): Promise<{
  succeeded: number;
  failed: number;
  reconciled: number;
}> {
  const db = getDb();
  const account = privateKeyToAccount(config.privateKey);
  const chain = config.chainId === 84532 ? baseSepolia : base;

  const publicClient = createPublicClient({ chain, transport: http() });
  const walletClient = createWalletClient({ account, chain, transport: http() });

  // Phase A: reconciliation of any in-progress markers from prior runs.
  const reconciled = await reconcileInProgress(db, publicClient);

  // Phase B: pick up fresh batches.
  const unsettled = await getUnsettledByBuilder(db);
  if (unsettled.length === 0) {
    console.log("[settlement] nothing to settle");
    return { succeeded: 0, failed: 0, reconciled };
  }

  // Ensure USDC allowance: approve max-uint256 once, skip on subsequent runs.
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
    console.log("[settlement] approving USDC max-uint256");
    const approveTx = await walletClient.writeContract({
      address: config.usdcAddress,
      abi: USDC_ABI,
      functionName: "approve",
      args: [config.escrowAddress, MAX_UINT256],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
  }

  let succeeded = 0;
  let failed = 0;

  for (const u of unsettled) {
    const amountWei = parseUnits(u.totalUsdc, 6);
    const lockToken = `lock:${randomUUID()}`;

    // Step 1: acquire lock atomically. If another worker already locked these,
    // lockedCount will be < eventIds.length and we skip the batch.
    const lockedCount = await lockEventsForSettle(db, u.eventIds, lockToken);
    if (lockedCount === 0) {
      console.log(
        `[settlement] skipping ${u.builderAddress}: events already locked or settled`
      );
      continue;
    }
    if (lockedCount < u.eventIds.length) {
      console.warn(
        `[settlement] partial lock for ${u.builderAddress}: ${lockedCount}/${u.eventIds.length} — proceeding with locked subset`
      );
    }

    let txHash: Hash;
    try {
      txHash = await walletClient.writeContract({
        address: config.escrowAddress,
        abi: ESCROW_ABI,
        functionName: "settle",
        args: [u.builderAddress as `0x${string}`, amountWei],
      });
    } catch (e) {
      console.error(`[settlement] broadcast failed for ${u.builderAddress}:`, e);
      // Release lock — nothing was broadcast.
      await releaseSettlementLock(db, lockToken);
      failed++;
      continue;
    }

    // Step 2: swap lock token for real tx hash so reconciliation can find it.
    await attachTxHashToLock(db, lockToken, txHash);

    // Step 3: wait for inclusion + check status.
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 120_000,
      });
      if (receipt.status === "success") {
        const n = await markSettledByTxHash(db, txHash);
        console.log(
          `[settlement] settled ${u.builderAddress}: ${u.totalUsdc} USDC tx=${txHash} (${n} events)`
        );
        succeeded++;
      } else {
        console.error(
          `[settlement] tx reverted for ${u.builderAddress}: ${txHash}`
        );
        await releaseSettlementLock(db, txHash);
        failed++;
      }
    } catch (e) {
      // Receipt timeout — leave the lock with txHash so reconciliation on next
      // run can poll and finalize when the tx eventually mines.
      console.error(
        `[settlement] receipt wait failed for ${u.builderAddress} tx=${txHash}:`,
        e
      );
      failed++;
    }
  }

  return { succeeded, failed, reconciled };
}

/**
 * Reconcile in-progress markers from prior runs (process crashes, receipt timeouts).
 *
 *   - lock:* tokens with no real tx hash mean broadcast never happened (or crash
 *     between lock acquire and broadcast). Safe to release — no money moved.
 *   - 0x* tx hashes that aren't yet finalized — check chain status:
 *       success  → finalize (mark settled)
 *       reverted → release lock (events re-eligible for next run)
 *       pending  → leave alone, wait for next run
 *       missing  → release lock (tx was dropped from mempool)
 */
// publicClient typed as `any` to dodge a viem 2.x Base-vs-generic chain type
// mismatch (deposit tx variants in Base aren't in the generic PublicClient).
// Internal helper; runtime calls are typesafe at the use-sites above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function reconcileInProgress(
  db: ReturnType<typeof getDb>,
  publicClient: any
): Promise<number> {
  const inProgress = await getInProgressSettlements(db);
  let reconciled = 0;

  for (const item of inProgress) {
    if (item.isLock) {
      const n = await releaseSettlementLock(db, item.marker);
      console.log(
        `[reconcile] released stuck lock ${item.marker} (${n} events)`
      );
      reconciled += n;
      continue;
    }

    // Real tx hash: poll its receipt.
    const hash = item.marker as Hash;
    let receipt: Awaited<
      ReturnType<typeof publicClient.getTransactionReceipt>
    > | null = null;
    try {
      receipt = await publicClient.getTransactionReceipt({ hash });
    } catch {
      receipt = null;
    }

    if (!receipt) {
      // Check if tx is still pending in mempool.
      const tx = await publicClient
        .getTransaction({ hash })
        .catch(() => null);
      if (tx) {
        console.log(`[reconcile] tx ${hash} still pending — leaving lock`);
        continue;
      }
      // Tx not in chain and not in mempool → dropped. Safe to release.
      const n = await releaseSettlementLock(db, hash);
      console.log(`[reconcile] tx ${hash} dropped — released ${n} events`);
      reconciled += n;
      continue;
    }

    if (receipt.status === "success") {
      const n = await markSettledByTxHash(db, hash);
      console.log(`[reconcile] tx ${hash} succeeded — finalized ${n} events`);
      reconciled += n;
    } else {
      const n = await releaseSettlementLock(db, hash);
      console.log(`[reconcile] tx ${hash} reverted — released ${n} events`);
      reconciled += n;
    }
  }

  return reconciled;
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
    console.error(
      "Missing env: SETTLEMENT_PRIVATE_KEY, REVENUE_ESCROW_ADDRESS, USDC_ADDRESS"
    );
    process.exit(1);
  }

  runSettlement(config)
    .then(({ succeeded, failed, reconciled }) => {
      console.log(
        `[settlement] done — succeeded=${succeeded} failed=${failed} reconciled=${reconciled}`
      );
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
