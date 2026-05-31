import { promises as dns } from "node:dns";
import { isPrivateHostname, validateHostUrl } from "@oryn/db";

export type ProxyUrlVerdict =
  | { ok: true; resolvedHost: string }
  | { ok: false; reason: string };

// Resolve hostname and reject if ANY resolved address falls in private/internal
// ranges. Defends against DNS rebinding where the static URL check passes but
// the resolver returns an internal IP.
export async function verifyProxyUrl(input: string): Promise<ProxyUrlVerdict> {
  const stringCheck = validateHostUrl(input);
  if (!stringCheck.ok) return { ok: false, reason: stringCheck.reason };

  const url = new URL(input);
  const host = url.hostname;

  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch (e) {
    return {
      ok: false,
      reason: `DNS resolution failed: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }

  if (addresses.length === 0) {
    return { ok: false, reason: "DNS returned no addresses" };
  }

  // Dev/test bypass: same gate as validateHostUrl. Lets local MCP demos
  // (gateway proxying to its own /mcp/* routes via localhost) work end-to-end
  // without disabling the production SSRF rule.
  const allowLoopback =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_LOOPBACK_HOSTS === "1";

  for (const a of addresses) {
    if (isPrivateHostname(a.address) && !allowLoopback) {
      return {
        ok: false,
        reason: `Host resolves to private address ${a.address}`,
      };
    }
  }

  return { ok: true, resolvedHost: host };
}
