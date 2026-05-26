import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-only-secret-must-be-replaced-in-production-and-at-least-32-chars"
);

export type SessionPayload = {
  address: string;
  chainId: number;
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (typeof payload.address !== "string" || typeof payload.chainId !== "number") {
      return null;
    }
    return { address: payload.address, chainId: payload.chainId };
  } catch {
    return null;
  }
}
