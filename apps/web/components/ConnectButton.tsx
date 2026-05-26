"use client";

import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage, useChainId } from "wagmi";
import { useState } from "react";
import { fetchNonce, buildSiweMessage, verifySiwe, logout } from "@/lib/auth";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      const nonce = await fetchNonce();
      const message = buildSiweMessage({ address, chainId, nonce });
      const signature = await signMessageAsync({ message });
      await verifySiwe(message, signature);
      setSignedIn(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await logout();
    setSignedIn(false);
  }

  if (!isConnected) {
    return <RainbowConnectButton />;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <RainbowConnectButton />
      {!signedIn ? (
        <button
          onClick={handleSignIn}
          disabled={busy}
          className="text-xs font-mono tracking-wider uppercase bg-orange text-warmdark px-4 py-2 disabled:opacity-50"
        >
          {busy ? "Signing..." : "Sign in with wallet"}
        </button>
      ) : (
        <button
          onClick={handleSignOut}
          className="text-xs font-mono tracking-wider uppercase border border-cream/30 px-4 py-2"
        >
          Sign out
        </button>
      )}
      {error && <p className="text-xs text-orange/80">{error}</p>}
    </div>
  );
}
