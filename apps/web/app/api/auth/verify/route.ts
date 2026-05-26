import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { parseSiweMessage } from "viem/siwe";
import { createSessionToken } from "@/lib/session";

const chains = { [base.id]: base, [baseSepolia.id]: baseSepolia };

export async function POST(req: NextRequest) {
  const { message, signature } = await req.json();

  if (!message || !signature) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const storedNonce = cookieStore.get("siwe_nonce")?.value;

  if (!storedNonce) {
    return NextResponse.json({ error: "no nonce in session" }, { status: 400 });
  }

  const siweMessage = parseSiweMessage(message);

  if (!siweMessage.address || !siweMessage.chainId || !siweMessage.nonce) {
    return NextResponse.json({ error: "invalid siwe message" }, { status: 400 });
  }

  if (siweMessage.nonce !== storedNonce) {
    return NextResponse.json({ error: "nonce mismatch" }, { status: 400 });
  }

  const chain = chains[siweMessage.chainId as keyof typeof chains];
  if (!chain) {
    return NextResponse.json({ error: "unsupported chain" }, { status: 400 });
  }

  const publicClient = createPublicClient({ chain, transport: http() });

  const valid = await publicClient.verifySiweMessage({ message, signature });
  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const token = await createSessionToken({
    address: siweMessage.address.toLowerCase(),
    chainId: siweMessage.chainId,
  });

  cookieStore.set("oryn_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  cookieStore.delete("siwe_nonce");

  return NextResponse.json({
    ok: true,
    address: siweMessage.address.toLowerCase(),
    chainId: siweMessage.chainId,
  });
}
