import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  address: string;
  chainId: number;
};

export async function createSessionToken(
  secret: Uint8Array,
  payload: SessionPayload
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

export async function verifySessionToken(
  secret: Uint8Array,
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.address !== "string" || typeof payload.chainId !== "number") {
      return null;
    }
    return { address: payload.address, chainId: payload.chainId };
  } catch {
    return null;
  }
}
