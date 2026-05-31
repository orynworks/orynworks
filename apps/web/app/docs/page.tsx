import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSession } from "@/lib/get-session";
import { Code, Term, Section, MiniHeading } from "./_components";
import {
  SECTIONS,
  CONTRACT_ROWS,
  QUICKSTART_INSTALL,
  QUICKSTART_PRINT,
  QUICKSTART_CALL,
  QUICKSTART_ANON_CURL,
  LIVE_SLUGS,
  OPERATORS_INSTALL,
  BUILDERS_SPLIT,
  X402_FLOW,
  API_SKILL_CURL,
  API_KNOWLEDGE_CURL,
  API_RESPONSES,
  SDK_CLI,
  SDK_PROGRAMMATIC,
} from "./_data";

const TOTAL_READ = SECTIONS.reduce((s, x) => s + x.readMin, 0);

export default async function DocsPage() {
  const session = await getSession();

  return (
    <main className="min-h-screen flex flex-col bg-warmdark">
      <Header showDashboardLink={!!session} />

      {/* Status bar — terminal-style */}
      <div className="border-b border-cream/10 bg-warmdark-light">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.25em] text-cream/40">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />
            <span>orynworks · docs</span>
            <span className="text-cream/20">/</span>
            <span className="text-cream/60">main</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <span>v0.1.0</span>
            <span className="text-cream/20">·</span>
            <span>{TOTAL_READ} min read</span>
            <span className="text-cream/20">·</span>
            <span>{SECTIONS.length} sections</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, rgba(232,220,200,0.6) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full pointer-events-none opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(229,115,79,0.5) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-12">
          <p className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.3em] text-orange uppercase mb-6 px-2 py-1 border border-orange/30 bg-orange/5">
            <span className="w-1 h-1 rounded-full bg-orange" />
            Documentation
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl tracking-tight mb-5 leading-[1.05]">
            Build with <span className="text-orange italic">orynworks</span>
            <span className="text-cream/40">.</span>
          </h1>
          <p className="text-cream/65 text-base md:text-lg max-w-2xl leading-relaxed">
            A single-page integration guide. For operators installing
            capabilities into their agent, and builders publishing skills or
            knowledge packs to the marketplace.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-mono uppercase tracking-[0.25em] text-cream/45">
            <span>{SECTIONS.length} sections</span>
            <span className="text-cream/15">·</span>
            <span>~{TOTAL_READ} min read</span>
            <span className="text-cream/15">·</span>
            <a
              href="https://github.com/orynworks/orynworks"
              className="hover:text-orange transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              view on github →
            </a>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-7xl mx-auto w-full px-6 pb-24 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6 md:gap-10">
        <article className="min-w-0 order-2 lg:order-1">
          <Section
            id="quickstart"
            num="01"
            title="Quickstart"
            intro="Oryn Works is a marketplace of MCP capabilities for AI agents. Install one into your client and use it immediately."
          >
            <p>Install <em>token-price</em> into Claude Desktop (free, live on Base mainnet):</p>
            <Term title="$ npx orynworks install --client claude">{QUICKSTART_INSTALL}</Term>
            <p>Or print the config snippet to paste manually (no file writes):</p>
            <Term>{QUICKSTART_PRINT}</Term>
            <p>Make a direct call for testing (production agents go through their MCP client):</p>
            <Term>{QUICKSTART_CALL}</Term>
            <p>All 18 launch capabilities are currently free — no wallet, no session cookie. Smallest possible test:</p>
            <Term title="$ curl ─ anonymous free call">{QUICKSTART_ANON_CURL}</Term>
          </Section>

          <Section
            id="operators"
            num="02"
            title="For operators"
            intro="You build AI agents. Oryn Works lets your agent install third-party capabilities and pay per use, with an audit trail."
          >
            <MiniHeading>Browse the hub</MiniHeading>
            <p>
              Visit{" "}
              <Link href="/browse" className="text-orange hover:underline">/browse</Link>{" "}
              to filter by type (skill / knowledge), category, or price. Free
              capabilities are tagged.
            </p>

            <MiniHeading>Live capabilities</MiniHeading>
            <p>18 capabilities are live on Base mainnet today. All free at launch:</p>
            <div className="flex flex-wrap gap-2 my-4">
              {LIVE_SLUGS.map((slug) => (
                <Code key={slug}>{slug}</Code>
              ))}
            </div>

            <MiniHeading>Install into your MCP client</MiniHeading>
            <p>
              On any capability detail page, copy the install command. The SDK
              writes an entry to your client config (Claude Desktop, Cursor) or
              prints it for manual paste.
            </p>
            <Term>{OPERATORS_INSTALL}</Term>

            <MiniHeading>Pay per use</MiniHeading>
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

          <Section
            id="builders"
            num="03"
            title="For builders"
            intro="You have an MCP server or curated dataset. Publish it to Oryn Works, earn USDC per call, build on-chain reputation."
          >
            <MiniHeading>Connect your wallet</MiniHeading>
            <p>
              Sign in via SIWE on{" "}
              <Link href="/build" className="text-orange hover:underline">/build</Link>
              . Your wallet address becomes your builder identity. Edit your
              public profile from <Code>/me</Code>.
            </p>

            <MiniHeading>Publish a capability</MiniHeading>
            <p>
              Fill the form at{" "}
              <Link href="/build/new" className="text-orange hover:underline">/build/new</Link>
              . On submit, your wallet signs a transaction registering the
              capability on <Code>CapabilityRegistry</Code>. Gas is roughly
              $0.01 on Base.
            </p>
            <p>
              Required: name, slug, type, category, description, host URL,
              price. Host URLs pointing to private/internal IPs are rejected.
            </p>

            <MiniHeading>Earn and claim</MiniHeading>
            <p>
              Every paid call accrues to your balance in{" "}
              <Code>RevenueEscrow</Code>. The protocol takes 10%. Builders earn
              90% of every call.
            </p>
            <Term title="$ revenue split (per 1.0000 USDC paid)">{BUILDERS_SPLIT}</Term>
            <p>
              Withdraw any time from{" "}
              <Link href="/build" className="text-orange hover:underline">/build</Link>
              . The Claim button sends <Code>RevenueEscrow.claim()</Code> from
              your wallet, transferring USDC to your address.
            </p>
          </Section>

          <Section
            id="x402"
            num="04"
            title="x402 payment"
            intro="The Coinbase-led open protocol for HTTP-native micropayments. We use it for per-call billing."
          >
            <p>
              Skip this section if you&apos;re only calling free capabilities — none of the 18 currently live caps use x402.
            </p>
            <p>
              x402 piggybacks on <Code>HTTP 402 Payment Required</Code>, with
              EIP-712 signed payment payloads carried in an{" "}
              <Code>X-Payment</Code> header.
            </p>
            <Term title="$ flow ─ one paid call">{X402_FLOW}</Term>
            <p>
              Nonces are stored per-payer for replay protection. The settlement
              worker uses an idempotent lock-and-finalize pattern: events are
              locked before broadcast, finalized after on-chain confirmation,
              and reconciled at startup if a prior run crashed mid-flight.
            </p>
          </Section>

          <Section
            id="api"
            num="05"
            title="API reference"
            intro="Both endpoints accept anonymous calls for free capabilities. Paid capabilities additionally require an X-Payment header (EIP-712 signed payload). The request body is forwarded verbatim to the upstream capability host — its schema is per-capability."
          >
            <MiniHeading>POST /v1/skills/:slug/call</MiniHeading>
            <p>Call a skill capability. Body is forwarded as-is to the builder&apos;s host URL.</p>
            <Term title="$ curl ─ skill call">{API_SKILL_CURL}</Term>

            <MiniHeading>POST /v1/knowledge/:slug/query</MiniHeading>
            <p>Call a knowledge capability. Body is forwarded as-is to the builder&apos;s host URL.</p>
            <Term title="$ curl ─ knowledge query">{API_KNOWLEDGE_CURL}</Term>

            <MiniHeading>Response shapes</MiniHeading>
            <Term title="$ http responses">{API_RESPONSES}</Term>
          </Section>

          <Section
            id="sdk"
            num="06"
            title="SDK reference"
            intro={(
              <>
                The{" "}
                <a
                  href="https://www.npmjs.com/package/orynworks"
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange hover:underline"
                >
                  orynworks npm package
                </a>{" "}
                ships a CLI plus a programmatic client. Install with{" "}
                <Code>npm i orynworks</Code>.
              </>
            )}
          >
            <MiniHeading>CLI</MiniHeading>
            <Term title="$ orynworks --help">{SDK_CLI}</Term>

            <MiniHeading>Programmatic</MiniHeading>
            <Term title="$ vim my-agent.ts">{SDK_PROGRAMMATIC}</Term>

            <MiniHeading>Environment</MiniHeading>
            <div className="my-4 border border-cream/10 bg-warmdark-light overflow-hidden">
              <div className="grid grid-cols-[1fr_2fr] divide-x divide-cream/10 text-[12.5px] font-mono">
                <div className="bg-warmdark-deep">
                  <div className="px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-cream/35 border-b border-cream/10">
                    var
                  </div>
                  <div className="px-4 py-3 text-orange/90 border-b border-cream/10">
                    ORYN_GATEWAY_URL
                  </div>
                  <div className="px-4 py-3 text-orange/90">ORYN_AUTH_TOKEN</div>
                </div>
                <div>
                  <div className="px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-cream/35 border-b border-cream/10">
                    purpose
                  </div>
                  <div className="px-4 py-3 text-cream/70 border-b border-cream/10">
                    Override default gateway URL
                  </div>
                  <div className="px-4 py-3 text-cream/70">
                    Optional session bearer token. Paid capabilities require an X-Payment header instead — the SDK builds it from your wallet when configured.
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="contracts"
            num="07"
            title="Contracts"
            intro="Source: packages/contracts/src/CapabilityRegistry.sol, RevenueEscrow.sol."
          >
            <MiniHeading>CapabilityRegistry</MiniHeading>
            <p>
              Catalog of registered capabilities. Each entry is keyed by{" "}
              <Code>keccak256(slug)</Code> and records the builder address,
              price, type, status, and metadata hash.
            </p>

            <MiniHeading>RevenueEscrow</MiniHeading>
            <p>
              Holds USDC from paid calls. Splits 90/10 between builder and
              protocol on every <Code>settle()</Code>. Builders call{" "}
              <Code>claim()</Code> to withdraw their balance.
            </p>

            <MiniHeading>Deployed addresses</MiniHeading>
            <div className="my-4 border border-cream/10 bg-warmdark-light overflow-hidden">
              <div className="grid grid-cols-[1.4fr_1fr_2fr] text-[12.5px] font-mono">
                <div className="px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-cream/35 bg-warmdark-deep border-b border-cream/10">
                  contract
                </div>
                <div className="px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-cream/35 bg-warmdark-deep border-b border-cream/10">
                  network
                </div>
                <div className="px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-cream/35 bg-warmdark-deep border-b border-cream/10">
                  address
                </div>
                {CONTRACT_ROWS.map((row) => (
                  <ContractRow key={row.contract} {...row} />
                ))}
              </div>
            </div>
          </Section>

          {/* End-of-docs cursor */}
          <div className="mt-12 flex items-center gap-2 text-cream/30 font-mono text-xs">
            <span className="text-orange">$</span>
            <span className="w-2 h-4 bg-orange/70 animate-pulse" />
            <span className="ml-3">end of docs · v0.1.0</span>
          </div>
        </article>

        {/* Sticky TOC */}
        <aside className="hidden lg:block order-1 lg:order-2">
          <div className="sticky top-6 border border-cream/10 bg-warmdark-light">
            <div className="px-4 py-3 border-b border-cream/10 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-cream/40">
                On this page
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />
            </div>
            <ul className="py-2">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="group flex items-center gap-3 px-4 py-2.5 hover:bg-warmdark transition-colors"
                  >
                    <span className="text-[10px] font-mono text-cream/30 group-hover:text-orange transition-colors w-5">
                      {s.num}
                    </span>
                    <span className="text-xs font-mono uppercase tracking-wider text-cream/65 group-hover:text-cream transition-colors">
                      {s.label}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="px-4 py-3 border-t border-cream/10">
              <a
                href="https://github.com/orynworks/orynworks"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-mono uppercase tracking-[0.25em] text-cream/40 hover:text-orange transition-colors flex items-center gap-2"
              >
                <span>github</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </aside>
      </section>

      <Footer />
    </main>
  );
}

function ContractRow({
  contract,
  network,
  shortAddr,
  explorerUrl,
}: {
  contract: string;
  network: string;
  shortAddr: string;
  explorerUrl: string;
}) {
  return (
    <>
      <div className="px-4 py-3 text-cream/85 border-b border-cream/10">{contract}</div>
      <div className="px-4 py-3 text-cream/55 border-b border-cream/10">{network}</div>
      <div className="px-4 py-3 border-b border-cream/10">
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="text-orange/90 hover:text-orange"
        >
          {shortAddr} ↗
        </a>
      </div>
    </>
  );
}
