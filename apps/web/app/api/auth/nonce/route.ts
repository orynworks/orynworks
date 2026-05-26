import { NextResponse } from "next/server";
import { generateSiweNonce } from "viem/siwe";
import { cookies } from "next/headers";

export async function GET() {
  const nonce = generateSiweNonce();
  const cookieStore = await cookies();
  cookieStore.set("siwe_nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });
  return new NextResponse(nonce, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
