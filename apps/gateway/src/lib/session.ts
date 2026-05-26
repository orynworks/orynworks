import { jwtVerify } from "jose";
import { env } from "../env.js";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

export type SessionPayload = {
  address: string;
  chainId: number;
};

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
