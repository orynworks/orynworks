import { createSiweMessage } from "viem/siwe";

export async function fetchNonce(): Promise<string> {
  const res = await fetch("/api/auth/nonce", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch nonce");
  return res.text();
}

export function buildSiweMessage(args: {
  address: `0x${string}`;
  chainId: number;
  nonce: string;
}) {
  return createSiweMessage({
    address: args.address,
    chainId: args.chainId,
    domain: window.location.host,
    uri: window.location.origin,
    statement: "Sign in to Oryn Works — the capability marketplace for AI agents.",
    nonce: args.nonce,
    version: "1",
    issuedAt: new Date(),
  });
}

export async function verifySiwe(message: string, signature: string) {
  const res = await fetch("/api/auth/verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Verification failed");
  }
  return res.json();
}

export async function logout() {
  const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  return res.ok;
}
