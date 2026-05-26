import { cookies } from "next/headers";
import { verifySessionToken, type SessionPayload } from "./session";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("oryn_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
