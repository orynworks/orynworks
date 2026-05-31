"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  REVENUE_ESCROW_ABI,
  getRevenueEscrowAddress,
  formatUsdc,
} from "@/lib/contracts";

type EarningsCardProps = {
  lifetimeBuilderShareUsdc: string;
};

export function EarningsCard({ lifetimeBuilderShareUsdc }: EarningsCardProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const escrowAddress = getRevenueEscrowAddress(chainId);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const {
    data: balanceWei,
    refetch: refetchBalance,
    isLoading: balanceLoading,
  } = useReadContract({
    address: escrowAddress ?? undefined,
    abi: REVENUE_ESCROW_ABI,
    functionName: "builderBalance",
    args: address ? [address] : undefined,
    query: { enabled: !!escrowAddress && !!address },
  });

  const {
    writeContract,
    data: txHash,
    isPending: txPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: txConfirming, isSuccess: txSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txSuccess) {
      setStatusMsg("Claimed successfully.");
      refetchBalance();
      const t = setTimeout(() => {
        setStatusMsg(null);
        resetWrite();
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [txSuccess, refetchBalance, resetWrite]);

  useEffect(() => {
    if (writeError) {
      setStatusMsg(writeError.message.split("\n")[0]);
    }
  }, [writeError]);

  const claimable = balanceWei ? formatUsdc(balanceWei as bigint) : "0.0000";
  const hasBalance = balanceWei ? (balanceWei as bigint) > 0n : false;
  const claiming = txPending || txConfirming;

  function handleClaim() {
    if (!escrowAddress || !hasBalance) return;
    setStatusMsg(null);
    writeContract({
      address: escrowAddress,
      abi: REVENUE_ESCROW_ABI,
      functionName: "claim",
    });
  }

  return (
    <div className="border border-cream/15 bg-warmdark-light px-8 py-7 mb-8">
      <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4 sm:gap-6">
        <div className="flex-1 min-w-[200px]">
          <p className="text-[10px] font-mono tracking-[0.3em] text-cream/40 uppercase mb-2">
            Claimable balance
          </p>
          <p className="font-serif text-4xl text-cream mb-1">
            {balanceLoading ? "…" : claimable}{" "}
            <span className="text-xl text-cream/50">USDC</span>
          </p>
          <p className="text-xs font-mono text-cream/50">
            Lifetime earnings: {Number(lifetimeBuilderShareUsdc).toFixed(4)} USDC
            <span className="text-cream/30"> · 90% builder share</span>
          </p>
        </div>

        <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
          <button
            onClick={handleClaim}
            disabled={!hasBalance || claiming || !escrowAddress}
            className="w-full sm:w-auto bg-orange text-warmdark px-5 py-3 font-mono text-xs uppercase tracking-widest hover:bg-orange-light transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {claiming ? "Confirming…" : "Claim to wallet"}
          </button>
          <p className="text-[10px] font-mono text-cream/40 text-left sm:text-right">
            ~$0.01 gas on Base
          </p>
        </div>
      </div>

      {!escrowAddress && (
        <p className="mt-4 text-xs font-mono text-orange/70">
          Escrow not configured for chain {chainId}.
        </p>
      )}

      {statusMsg && (
        <p
          className={`mt-4 text-xs font-mono ${
            txSuccess ? "text-orange" : "text-orange/70"
          }`}
        >
          {statusMsg}
        </p>
      )}
    </div>
  );
}
