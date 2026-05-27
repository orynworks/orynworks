import { cookies } from "next/headers";
import { verifySessionToken, type SessionPayload } from "@oryn/db";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-only-secret-must-be-replaced-in-production-and-at-least-32-chars"
);

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("oryn_session")?.value;
  if (!token) return null;
  return verifySessionToken(SECRET, token);
}
