"use client";

import Link from "next/link";
import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { useChainId, useSignMessage, useDisconnect } from "wagmi";
import { useState, useEffect, useRef } from "react";
import { fetchNonce, buildSiweMessage, verifySiwe, logout } from "@/lib/auth";

type ConnectButtonProps = {
  isSignedIn?: boolean;
};

export function ConnectButton({ isSignedIn = false }: ConnectButtonProps) {
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const [signedIn, setSignedIn] = useState(isSignedIn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSignedIn(isSignedIn);
  }, [isSignedIn]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleSignIn(address: `0x${string}`) {
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

  async function handleDisconnect() {
    await logout();
    disconnect();
    setSignedIn(false);
    setMenuOpen(false);
  }

  return (
    <RainbowConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <div className="h-9 w-32 border border-cream/10 animate-pulse" />
          );
        }

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              className="border border-cream/30 text-cream/70 hover:border-orange hover:text-orange px-2 sm:px-3 py-2 font-mono text-[10px] sm:text-xs uppercase tracking-wider transition-colors"
            >
              Sign In
            </button>
          );
        }

        if (!signedIn) {
          return (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs font-mono text-cream/40 tracking-wider">
                {shorten(account.address)}
              </span>
              <button
                onClick={() => handleSignIn(account.address as `0x${string}`)}
                disabled={busy}
                className="bg-orange text-warmdark px-3 sm:px-4 py-2 font-mono text-[10px] sm:text-xs uppercase tracking-widest hover:bg-orange-light transition-colors disabled:opacity-50"
              >
                {busy ? "Signing…" : "Sign In"}
              </button>
              {error && (
                <span className="text-xs font-mono text-orange/80">{error}</span>
              )}
            </div>
          );
        }

        return (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 border border-cream/20 hover:border-orange transition-colors px-2 sm:px-3 py-2 font-mono text-[10px] sm:text-xs uppercase tracking-wider text-cream/80"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange" />
              {shorten(account.address)}
              <span className="text-cream/40 ml-1">▾</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-warmdark-light border border-cream/10 w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[200px] max-w-xs z-50 shadow-xl">
                <Link
                  href="/me"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-xs font-mono uppercase tracking-wider text-cream/70 hover:text-orange hover:bg-warmdark transition-colors border-b border-cream/10"
                >
                  Dashboard
                </Link>
                <Link
                  href="/build"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-xs font-mono uppercase tracking-wider text-cream/70 hover:text-orange hover:bg-warmdark transition-colors border-b border-cream/10"
                >
                  My Capabilities
                </Link>
                <button
                  onClick={handleDisconnect}
                  className="block w-full text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-cream/70 hover:text-orange hover:bg-warmdark transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
