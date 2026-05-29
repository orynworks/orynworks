import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CapabilityCard } from "@/components/CapabilityCard";
import { TerminalDemo } from "@/components/TerminalDemo";
import { getSession } from "@/lib/get-session";
import { getDb } from "@/lib/db";
import { listFeaturedCapabilities, getLandingStats } from "@oryn/db";

export default async function HomePage() {
  const session = await getSession();
  const db = getDb();
  const [featured, stats] = await Promise.all([
    listFeaturedCapabilities(db, 6),
    getLandingStats(db),
  ]);

  return (
    <main className="min-h-screen flex flex-col">
      <Header showDashboardLink={!!session} />

      <section className="flex flex-col items-center justify-center px-6 py-16 md:py-20">
        <div className="max-w-xl text-center">
          <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4 font-mono">
            A capability marketplace
          </p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight tracking-tight mb-5">
            The capability marketplace{" "}
            <span className="text-orange">for AI agents.</span>
          </h1>
          <p className="text-cream/70 text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Builders publish skills and knowledge packs. Operators install them
            with one command. Payments settle automatically, and reputation
            lives on-chain.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/browse"
              className="bg-orange text-warmdark px-6 py-3 font-mono text-xs uppercase tracking-widest hover:bg-orange-light transition-colors"
            >
              Browse the Hub →
            </Link>
            <Link
              href="/build/new"
              className="border border-cream/30 text-cream px-6 py-3 font-mono text-xs uppercase tracking-widest hover:border-orange hover:text-orange transition-colors"
            >
              List a capability
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-t border-cream/10 px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs font-mono uppercase tracking-widest text-cream/60">
          <span>
            <span className="text-cream font-serif text-base normal-case tracking-normal">
              {stats.totalCapabilities}
            </span>{" "}
            capabilities
          </span>
          <span className="text-cream/20">·</span>
          <span>
            <span className="text-cream font-serif text-base normal-case tracking-normal">
              {stats.totalSkills}
            </span>{" "}
            skills
          </span>
          <span className="text-cream/20">·</span>
          <span>
            <span className="text-cream font-serif text-base normal-case tracking-normal">
              {stats.totalKnowledge}
            </span>{" "}
            knowledge
          </span>
          <span className="text-cream/20">·</span>
          <span>
            <span className="text-cream font-serif text-base normal-case tracking-normal">
              {stats.totalBuilders}
            </span>{" "}
            builders
          </span>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-cream/10 px-6 py-16 max-w-5xl mx-auto w-full">
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-2 font-mono">
            How it works
          </p>
          <h2 className="font-serif text-3xl">Three steps to a capable agent.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-xs font-mono text-orange tracking-widest mb-3">01 · DISCOVER</p>
            <h3 className="font-serif text-xl mb-2">Browse capabilities</h3>
            <p className="text-sm text-cream/60 leading-relaxed">
              Filter skills, knowledge packs, and reputation signals by category. Find what
              your agent needs.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-orange tracking-widest mb-3">02 · INSTALL</p>
            <h3 className="font-serif text-xl mb-2">One-line setup</h3>
            <p className="text-sm text-cream/60 leading-relaxed">
              Copy the install snippet into Claude, Cursor, or any MCP-aware client. Pay
              per use, settled instantly.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-orange tracking-widest mb-3">03 · ATTEST</p>
            <h3 className="font-serif text-xl mb-2">Build reputation</h3>
            <p className="text-sm text-cream/60 leading-relaxed">
              Every interaction earns on-chain trust signals. Capabilities and builders grow
              their reputation as agents use them.
            </p>
          </div>
        </div>
      </section>

      {/* Terminal demo */}
      <section className="border-t border-cream/10 px-6 py-16 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-2 font-mono">
            Agent shell
          </p>
          <h2 className="font-serif text-3xl mb-3">Install. Run. Settle.</h2>
          <p className="text-cream/60 text-sm max-w-md mx-auto">
            How it looks from your agent&apos;s CLI.
          </p>
        </div>
        <TerminalDemo />
      </section>

      {featured.length > 0 && (
        <section className="px-6 py-16 max-w-6xl mx-auto w-full border-t border-cream/10">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-2 font-mono">
                Featured
              </p>
              <h2 className="font-serif text-3xl">Recent capabilities</h2>
            </div>
            <Link
              href="/browse"
              className="text-xs font-mono uppercase tracking-widest text-cream/70 hover:text-orange transition-colors"
            >
              Browse all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((cap) => (
              <CapabilityCard key={cap.id} capability={cap} />
            ))}
          </div>
        </section>
      )}

      <div className="flex-1" />

      <Footer />
    </main>
  );
}
