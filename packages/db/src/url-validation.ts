// Pure URL validation: reject schemes other than http(s) and hosts that
// resolve to private/internal IP ranges (SSRF guard).
// String-based check only — DNS resolution is the caller's responsibility.

export type UrlValidation = { ok: true } | { ok: false; reason: string };

function parseIpv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums;
}

export function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().trim();
  if (!h) return true;

  // Hostname strings
  if (h === "localhost") return true;
  if (h.endsWith(".localhost")) return true;
  if (h === "localhost.localdomain") return true;

  // IPv6 forms
  const stripped = h.startsWith("[") && h.endsWith("]") ? h.slice(1, -1) : h;
  if (stripped === "::" || stripped === "::1") return true;
  if (
    stripped.startsWith("fc") ||
    stripped.startsWith("fd") || // fc00::/7 unique-local
    stripped.startsWith("fe80:") || // link-local
    stripped.startsWith("::ffff:") // IPv4-mapped IPv6 — extract embedded v4
  ) {
    if (stripped.startsWith("::ffff:")) {
      return isPrivateHostname(stripped.slice("::ffff:".length));
    }
    return true;
  }

  // IPv4 literal
  const ipv4 = parseIpv4(stripped);
  if (ipv4) {
    const [a, b] = ipv4;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 192 && b === 0) return true; // documentation range
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true; // multicast / reserved
  }

  // Heuristic: bare IPs without dots aren't reachable; treat as private if numeric.
  if (/^\d+$/.test(stripped)) return true;

  return false;
}

export function validateHostUrl(input: string): UrlValidation {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "Only http(s) URLs are allowed" };
  }

  // Strip brackets for IPv6 hostnames
  const hostname = url.hostname;
  if (isPrivateHostname(hostname)) {
    return {
      ok: false,
      reason: "Host points to a private, loopback, or reserved address",
    };
  }

  return { ok: true };
}
