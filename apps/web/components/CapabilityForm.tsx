"use client";

import { useState, useTransition } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWriteContract,
} from "wagmi";
import { parseUnits, keccak256, toBytes } from "viem";
import { createCapabilityAction, type ActionResult } from "@/app/build/new/actions";
import { toSlug } from "@/lib/slug";
import {
  CAPABILITY_REGISTRY_ABI,
  CAP_TYPE,
  getCapabilityRegistryAddress,
} from "@/lib/contracts";

type Phase = "idle" | "signing" | "confirming" | "submitting" | "done" | "error";

export function CapabilityForm() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const registryAddress = getCapabilityRegistryAddress(chainId);

  const [, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tokenGated, setTokenGated] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [chainError, setChainError] = useState<string | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | null>(null);

  const { writeContractAsync } = useWriteContract();

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(toSlug(value));
  }

  function handleSlugChange(value: string) {
    setSlug(toSlug(value));
    setSlugTouched(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    setChainError(null);

    if (!isConnected || !address) {
      setChainError("Connect wallet and sign in first.");
      return;
    }
    if (!registryAddress) {
      setChainError(`Registry not configured for chain ${chainId}.`);
      return;
    }

    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    formData.set("slug", slug);
    if (!tokenGated) formData.delete("requiredToken");

    const type = (formData.get("type") as string) ?? "skill";
    const description = (formData.get("description") as string) ?? "";
    const category = (formData.get("category") as string) ?? "utility";
    const hostUrl = (formData.get("hostUrl") as string) ?? "";
    const priceUsdc = (formData.get("priceUsdc") as string) ?? "0";

    let priceWei: bigint;
    try {
      priceWei = parseUnits(priceUsdc || "0", 6);
    } catch {
      setChainError("Invalid price format.");
      return;
    }

    const slugHash = keccak256(toBytes(slug));
    const metadataHash = keccak256(
      toBytes(
        JSON.stringify({
          name,
          description,
          category,
          hostUrl,
          version: "1.0.0",
        })
      )
    );
    const capType = CAP_TYPE[type as "skill" | "knowledge"];

    setPhase("signing");
    let confirmedTxHash: `0x${string}`;
    try {
      confirmedTxHash = await writeContractAsync({
        address: registryAddress,
        abi: CAPABILITY_REGISTRY_ABI,
        functionName: "register",
        args: [slugHash, priceWei, capType, metadataHash],
      });
    } catch (e) {
      setPhase("error");
      setChainError(
        e instanceof Error
          ? e.message.split("\n")[0]
          : "Transaction rejected or failed."
      );
      return;
    }

    setPendingTxHash(confirmedTxHash);
    setPhase("confirming");

    try {
      if (!publicClient) throw new Error("Public client unavailable.");
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: confirmedTxHash,
      });
      if (receipt.status === "reverted") {
        setPhase("error");
        setChainError("Transaction reverted on-chain. Slug may already be registered.");
        return;
      }
    } catch (e) {
      setPhase("error");
      setChainError(
        e instanceof Error ? e.message.split("\n")[0] : "Receipt wait failed."
      );
      return;
    }

    formData.set("chainId", String(chainId));
    formData.set("txHash", confirmedTxHash);

    setPhase("submitting");
    startTransition(async () => {
      const res = await createCapabilityAction(formData);
      if (!res.ok) {
        setResult(res);
        setPhase("error");
        return;
      }
      setPhase("done");
    });
  }

  const fieldError = (key: string) =>
    result && !result.ok ? result.fieldErrors?.[key] : undefined;

  const busy =
    phase === "signing" || phase === "confirming" || phase === "submitting";

  const buttonLabel = (() => {
    switch (phase) {
      case "signing":
        return "Confirm in wallet…";
      case "confirming":
        return "Confirming on Base…";
      case "submitting":
        return "Finalizing…";
      case "done":
        return "Published";
      default:
        return "Publish capability";
    }
  })();

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Name */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
          Name *
        </label>
        <input
          name="name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          placeholder="e.g., Deep Research"
          className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-sans focus:outline-none focus:border-orange"
        />
        {fieldError("name") && <p className="text-xs text-orange mt-1">{fieldError("name")}</p>}
      </div>

      {/* Slug */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
          Slug *
        </label>
        <input
          name="slug"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          required
          placeholder="e.g., deep-research"
          className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-mono text-sm focus:outline-none focus:border-orange"
        />
        <p className="text-xs text-cream/40 mt-1 font-mono">
          oryn.works/capability/{slug || "your-slug"}
        </p>
        {fieldError("slug") && <p className="text-xs text-orange mt-1">{fieldError("slug")}</p>}
      </div>

      {/* Type + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
            Type *
          </label>
          <select
            name="type"
            required
            defaultValue="skill"
            className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-sans focus:outline-none focus:border-orange"
          >
            <option value="skill">Skill (MCP server)</option>
            <option value="knowledge">Knowledge pack</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
            Category *
          </label>
          <select
            name="category"
            required
            defaultValue="utility"
            className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-sans focus:outline-none focus:border-orange"
          >
            <option value="data">Data</option>
            <option value="action">Action</option>
            <option value="knowledge">Knowledge</option>
            <option value="utility">Utility</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
          Description *
        </label>
        <textarea
          name="description"
          required
          rows={5}
          placeholder="What does this capability do? Markdown supported."
          className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-sans focus:outline-none focus:border-orange resize-y"
        />
        {fieldError("description") && (
          <p className="text-xs text-orange mt-1">{fieldError("description")}</p>
        )}
      </div>

      {/* Host URL */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
          Host URL *
        </label>
        <input
          name="hostUrl"
          type="url"
          required
          placeholder="https://your-mcp-server.com/sse"
          className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-mono text-sm focus:outline-none focus:border-orange"
        />
        <p className="text-xs text-cream/40 mt-1">
          MCP server endpoint or knowledge pack URI
        </p>
        {fieldError("hostUrl") && <p className="text-xs text-orange mt-1">{fieldError("hostUrl")}</p>}
      </div>

      {/* Price */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
          Price (USDC per call)
        </label>
        <input
          name="priceUsdc"
          defaultValue="0"
          placeholder="0.001"
          className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-mono text-sm focus:outline-none focus:border-orange"
        />
        {fieldError("priceUsdc") && <p className="text-xs text-orange mt-1">{fieldError("priceUsdc")}</p>}
      </div>

      {/* Token gating */}
      <div>
        <label className="flex items-center gap-2 text-sm text-cream/80">
          <input
            type="checkbox"
            name="tokenGated"
            checked={tokenGated}
            onChange={(e) => setTokenGated(e.target.checked)}
            className="accent-orange"
          />
          Token-gated capability
        </label>
        {tokenGated && (
          <input
            name="requiredToken"
            placeholder="0x… (ERC-20 or ERC-721 contract address)"
            className="w-full mt-3 bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-mono text-sm focus:outline-none focus:border-orange"
          />
        )}
      </div>

      {/* On-chain notice */}
      <div className="border border-cream/15 bg-warmdark-light px-4 py-3 text-xs font-mono text-cream/60">
        Publishing registers your capability on{" "}
        <span className="text-cream">CapabilityRegistry</span> at chain{" "}
        <span className="text-cream">{chainId ?? "?"}</span>. Costs ~$0.01 in gas.
      </div>

      {/* Submit */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={busy || phase === "done" || !registryAddress}
          className="w-full sm:w-auto bg-orange text-warmdark px-7 py-3 font-mono text-xs uppercase tracking-widest hover:bg-orange-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {buttonLabel}
        </button>
        {(phase === "confirming" || phase === "submitting") && pendingTxHash && (
          <span className="text-xs font-mono text-cream/40 break-all">
            tx {pendingTxHash.slice(0, 10)}…
          </span>
        )}
        {(chainError || (result && !result.ok)) && (
          <p className="text-xs text-orange break-words">
            {chainError ?? (result && !result.ok ? result.error : null)}
          </p>
        )}
      </div>
    </form>
  );
}
