import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSession } from "@/lib/get-session";

const SECTIONS: { id: string; label: string }[] = [
  { id: "quickstart", label: "Quickstart" },
  { id: "operators", label: "For operators" },
  { id: "builders", label: "For builders" },
  { id: "x402", label: "x402 payment" },
  { id: "api", label: "API reference" },
  { id: "sdk", label: "SDK reference" },
  { id: "contracts", label: "Contracts" },
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-warmdark-light border border-cream/10 px-1.5 py-0.5 font-mono text-[0.85em] text-cream">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-warmdark-deep border border-cream/10 px-4 py-3 my-4 overflow-x-auto font-mono text-xs text-cream/90 leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="py-10 border-t border-cream/10">
      <p className="text-[10px] font-mono tracking-[0.3em] text-cream/40 uppercase mb-2">
        {eyebrow}
      </p>
      <h2 className="font-serif text-3xl mb-6">{title}</h2>
      <div className="space-y-4 text-cream/75 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default async function DocsPage() {
  const session = await getSession();
  return (
    <main className="min-h-screen flex flex-col">
      <Header showDashboardLink={!!session} />

      <section className="px-6 pt-14 pb-8 max-w-6xl mx-auto w-full">
        <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-3 font-mono">
          Docs
        </p>
        <h1 className="font-serif text-5xl mb-3">Build with Oryn.</h1>
        <p className="text-cream/60 max-w-2xl">
          One-page integration guide. For operators installing capabilities into
          their agent, and builders publishing skills or knowledge packs to the
          marketplace.
        </p>
      </section>

      <section className="px-6 pb-20 max-w-6xl mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10">
        <nav className="hidden lg:block lg:sticky lg:top-6 self-start">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-cream/40 mb-3">
            On this page
          </p>
          <ul className="space-y-2 text-xs font-mono uppercase tracking-wider">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-cream/60 hover:text-orange transition-colors"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="min-w-0">
          <Section id="quickstart" eyebrow="01" title="Quickstart">
            <p>
              Oryn is a marketplace of <strong className="text-cream">skills</strong>{" "}
              (callable MCP servers) and{" "}
              <strong className="text-cream">knowledge packs</strong> (queryable
              datasets) for AI agents. Every capability is registered on Base,
              billed per use in USDC, and reputation-tracked via on-chain
              attestations.
            </p>
            <p>Install a capability into Claude Desktop:</p>
            <CodeBlock>
              {`npx oryn install deep-research --client claude`}
            </CodeBlock>
            <p>
              Or print the config snippet to paste manually (no file writes):
            </p>
            <CodeBlock>{`npx oryn install deep-research`}</CodeBlock>
            <p>
              Make a direct call (for testing — production agents go through
              their MCP client):
            </p>
            <CodeBlock>
              {`npx oryn call deep-research --prompt "summarize the latest base ecosystem trends"`}
            </CodeBlock>
          </Section>

          <Section id="operators" eyebrow="02" title="For operators">
            <p>
              You build AI agents. Oryn lets your agent install third-party
              capabilities and pay per use, with audit trail.
            </p>
            <h3 className="font-serif text-xl text-cream mt-6">
              1. Browse the hub
            </h3>
            <p>
              Visit{" "}
              <Link href="/browse" className="text-orange hover:underline">
                /browse
              </Link>{" "}
              to filter by type (skill / knowledge), category, or price. Free
              capabilities are tagged.
            </p>
            <h3 className="font-serif text-xl text-cream mt-6">
              2. Install into your MCP client
            </h3>
            <p>
              On any capability detail page, copy the install command. The SDK
              writes an entry to your client config (Claude Desktop, Cursor) or
              prints it for manual paste.
            </p>
            <CodeBlock>
              {`# Auto-write into Claude Desktop config
npx oryn install <slug> --client claude

# Cursor
npx oryn install <slug> --client cursor

# Just print the JSON
npx oryn install <slug>`}
            </CodeBlock>
            <h3 className="font-serif text-xl text-cream mt-6">
              3. Pay per use (paid capabilities)
            </h3>
            <p>
              When your agent calls a paid capability, the gateway returns{" "}
              <Code>402 Payment Required</Code> with an x402 challenge. Your
              wallet signs an EIP-712 payment payload, the gateway verifies the
              signature against your USDC allowance, and forwards the call.
            </p>
            <p>
              Free capabilities work end-to-end without a payment header. No
              wallet, no approval, no friction.
            </p>
          </Section>

          <Section id="builders" eyebrow="03" title="For builders">
            <p>
              You have an MCP server or curated dataset. Publish it to Oryn,
              earn USDC per call, build on-chain reputation.
            </p>
            <h3 className="font-serif text-xl text-cream mt-6">
              1. Connect your wallet
            </h3>
            <p>
              Sign in via SIWE on{" "}
              <Link href="/build" className="text-orange hover:underline">
                /build
              </Link>
              . Your wallet address becomes your builder identity. You can edit
              your public profile (display name, bio, links) from{" "}
              <Code>/me</Code>.
            </p>
            <h3 className="font-serif text-xl text-cream mt-6">
              2. Publish a capability
            </h3>
            <p>
              Fill the form at{" "}
              <Link href="/build/new" className="text-orange hover:underline">
                /build/new
              </Link>
              . On submit, your wallet signs a transaction registering the
              capability on{" "}
              <Code>CapabilityRegistry</Code>. Gas is roughly $0.01 on Base.
            </p>
            <p>
              Required fields: name, slug, type (skill or knowledge), category,
              description, host URL, price (USDC). Host URLs pointing to
              private/internal IPs are rejected.
            </p>
            <h3 className="font-serif text-xl text-cream mt-6">
              3. Earn and claim
            </h3>
            <p>
              Every paid call accrues to your balance in{" "}
              <Code>RevenueEscrow</Code>. The protocol takes a 10% fee. Builders
              earn 90% of every call.
            </p>
            <CodeBlock>{`Operator pays 1.0000 USDC
        → 0.9000 USDC → builderBalance[you]
        → 0.1000 USDC → protocolTreasury`}</CodeBlock>
            <p>
              Withdraw any time from the dashboard at{" "}
              <Link href="/build" className="text-orange hover:underline">
                /build
              </Link>
              . The Claim button sends{" "}
              <Code>RevenueEscrow.claim()</Code> from your wallet, transferring
              USDC to your address.
            </p>
          </Section>

          <Section id="x402" eyebrow="04" title="x402 payment protocol">
            <p>
              x402 is the{" "}
              <a
                href="https://github.com/coinbase/x402"
                target="_blank"
                rel="noreferrer"
                className="text-orange hover:underline"
              >
                Coinbase-led open protocol
              </a>{" "}
              for HTTP-native micropayments. It piggybacks on{" "}
              <Code>HTTP 402 Payment Required</Code>, with EIP-712 signed
              payment payloads carried in an{" "}
              <Code>X-Payment</Code> header.
            </p>
            <p>Flow:</p>
            <CodeBlock>
              {`1. Agent calls a paid capability:
   POST /v1/skills/<slug>/call

2. Gateway returns 402 with a challenge:
   WWW-Authenticate: X402 realm="oryn", amount="0.0200"

3. Agent's client builds an EIP-712 payment for amount, signs
   with the operator's wallet key, retries with:
   X-Payment: <signed-payload>

4. Gateway verifies signature, nonce uniqueness, USDC allowance.
   Forwards the call to the builder's host URL.

5. Off-chain ledger records the usage event.
   Settlement worker batches per-builder accruals
   and pushes them to RevenueEscrow on a schedule.`}
            </CodeBlock>
            <p>
              Nonces are stored per-payer for replay protection. The settlement
              worker uses an idempotent lock-and-finalize pattern: events are
              locked before broadcast, finalized after on-chain confirmation,
              and reconciled at startup if a prior run crashed mid-flight.
            </p>
          </Section>

          <Section id="api" eyebrow="05" title="API reference">
            <p>
              The gateway exposes two proxy endpoints. Both require a SIWE
              session cookie (operator identity) and, for paid capabilities, an{" "}
              <Code>X-Payment</Code> header.
            </p>

            <h3 className="font-serif text-xl text-cream mt-6">
              POST /v1/skills/:slug/call
            </h3>
            <p>Invoke a skill (MCP server).</p>
            <CodeBlock>
              {`curl -X POST https://api.oryn.works/v1/skills/deep-research/call \\
  -H "Content-Type: application/json" \\
  -H "Cookie: oryn_session=..." \\
  -H "X-Payment: <eip712-signed-payload>" \\
  -d '{"prompt": "..."}'`}
            </CodeBlock>

            <h3 className="font-serif text-xl text-cream mt-6">
              POST /v1/knowledge/:slug/query
            </h3>
            <p>Query a knowledge pack.</p>
            <CodeBlock>
              {`curl -X POST https://api.oryn.works/v1/knowledge/alpha-feed/query \\
  -H "Content-Type: application/json" \\
  -H "Cookie: oryn_session=..." \\
  -H "X-Payment: <eip712-signed-payload>" \\
  -d '{"prompt": "..."}'`}
            </CodeBlock>

            <h3 className="font-serif text-xl text-cream mt-6">
              Response shape
            </h3>
            <CodeBlock>
              {`// 200 OK — capability returned a result
{
  "ok": true,
  "data": <upstream response>,
  "costUsdc": "0.0200",
  "latencyMs": 412
}

// 402 Payment Required — missing or invalid x402 header
{
  "error": "payment required",
  "priceUsdc": "0.0200",
  "protocol": "x402",
  "version": "1"
}

// 502 — upstream host failed or was blocked
{
  "error": "upstream_502" | "upstream_host_blocked" | "upstream_timeout"
}`}
            </CodeBlock>
          </Section>

          <Section id="sdk" eyebrow="06" title="SDK reference">
            <p>
              The <Code>oryn</Code> npm package ships a CLI plus a programmatic
              client.
            </p>

            <h3 className="font-serif text-xl text-cream mt-6">CLI</h3>
            <CodeBlock>
              {`oryn install <slug> [--client claude|cursor|print] [--gateway URL]
oryn call    <slug> --prompt "..." [--gateway URL] [--auth TOKEN]
oryn query   <slug> --prompt "..." [--gateway URL] [--auth TOKEN]
oryn ping    [--gateway URL]
oryn --version`}
            </CodeBlock>

            <h3 className="font-serif text-xl text-cream mt-6">Programmatic</h3>
            <CodeBlock>
              {`import { OrynClient } from "oryn";

const client = new OrynClient({
  gatewayUrl: "https://api.oryn.works",
  authToken: process.env.ORYN_AUTH_TOKEN,
});

const result = await client.query("alpha-feed", {
  prompt: "trending on base, last 24h"
});`}
            </CodeBlock>

            <h3 className="font-serif text-xl text-cream mt-6">
              Environment variables
            </h3>
            <table className="w-full text-xs font-mono border border-cream/10 my-4">
              <tbody>
                <tr className="border-b border-cream/10">
                  <td className="px-3 py-2 text-cream/80">
                    <Code>ORYN_GATEWAY_URL</Code>
                  </td>
                  <td className="px-3 py-2 text-cream/50">
                    Override default gateway URL
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-cream/80">
                    <Code>ORYN_AUTH_TOKEN</Code>
                  </td>
                  <td className="px-3 py-2 text-cream/50">
                    Session bearer token (required for paid capabilities)
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section id="contracts" eyebrow="07" title="Contracts">
            <p>
              Source:{" "}
              <Code>packages/contracts/src/CapabilityRegistry.sol</Code>,{" "}
              <Code>packages/contracts/src/RevenueEscrow.sol</Code>.
            </p>

            <h3 className="font-serif text-xl text-cream mt-6">
              CapabilityRegistry
            </h3>
            <p>
              Catalog of registered capabilities. Each entry is keyed by{" "}
              <Code>keccak256(slug)</Code> and records the builder address,
              price, type, status, and metadata hash.
            </p>

            <h3 className="font-serif text-xl text-cream mt-6">RevenueEscrow</h3>
            <p>
              Holds USDC from paid calls. Splits 90/10 between builder and
              protocol on every <Code>settle()</Code>. Builders call{" "}
              <Code>claim()</Code> to withdraw their balance.
            </p>

            <h3 className="font-serif text-xl text-cream mt-6">Addresses</h3>
            <table className="w-full text-xs font-mono border border-cream/10 my-4">
              <thead>
                <tr className="border-b border-cream/10 bg-warmdark-light text-cream/60">
                  <th className="px-3 py-2 text-left">Contract</th>
                  <th className="px-3 py-2 text-left">Network</th>
                  <th className="px-3 py-2 text-left">Address</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-cream/10">
                  <td className="px-3 py-2 text-cream/80">
                    CapabilityRegistry
                  </td>
                  <td className="px-3 py-2 text-cream/60">Base Sepolia</td>
                  <td className="px-3 py-2 text-cream">
                    <a
                      href="https://sepolia.basescan.org/address/0xB9a212DF77AEb7F4201d435381D68Ec10f5BAB5d"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-orange"
                    >
                      0xB9a2…BAB5d
                    </a>
                  </td>
                </tr>
                <tr className="border-b border-cream/10">
                  <td className="px-3 py-2 text-cream/80">RevenueEscrow</td>
                  <td className="px-3 py-2 text-cream/60">Base Sepolia</td>
                  <td className="px-3 py-2 text-cream">
                    <a
                      href="https://sepolia.basescan.org/address/0x6b29663C0802F7Bc8B8750F17627a82258EE6e31"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-orange"
                    >
                      0x6b29…6e31
                    </a>
                  </td>
                </tr>
                <tr className="border-b border-cream/10">
                  <td className="px-3 py-2 text-cream/80">USDC (testnet)</td>
                  <td className="px-3 py-2 text-cream/60">Base Sepolia</td>
                  <td className="px-3 py-2 text-cream">
                    <a
                      href="https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-orange"
                    >
                      0x036C…CF7e
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-cream/80" colSpan={3}>
                    <span className="text-cream/40">
                      Base mainnet addresses publish here after launch.
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
        </article>
      </section>

      <Footer />
    </main>
  );
}
