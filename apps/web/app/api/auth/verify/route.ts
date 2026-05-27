import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { parseSiweMessage } from "viem/siwe";
import { createDbClient, createSessionToken, upsertWalletByAddress, type DbClient } from "@oryn/db";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-only-secret-must-be-replaced-in-production-and-at-least-32-chars"
);

let _db: DbClient | undefined;
function getDb(): DbClient {
  if (!_db) _db = createDbClient(process.env.DATABASE_URL!);
  return _db;
}

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

  const expectedDomain = req.headers.get("host") ?? undefined;

  const valid = await publicClient.verifySiweMessage({
    message,
    signature,
    domain: expectedDomain,
    nonce: storedNonce,
    time: new Date(),
  });
  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const walletRecord = await upsertWalletByAddress(
    getDb(),
    siweMessage.address.toLowerCase()
  );

  const token = await createSessionToken(SECRET, {
    address: walletRecord.address,
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
    address: walletRecord.address,
    chainId: siweMessage.chainId,
  });
}
