import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSession } from "@/lib/get-session";

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="min-h-screen flex flex-col">
      <Header showDashboardLink={!!session} />

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center">
          <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4 font-mono">
            A capability marketplace
          </p>
          <h1 className="font-serif text-5xl md:text-6xl leading-tight tracking-tight mb-6">
            The capability<br />marketplace<br />
            <span className="text-orange">for AI agents.</span>
          </h1>
          <p className="text-cream/70 text-lg mb-10 max-w-md mx-auto">
            Skills, knowledge, and reputation — discovered, installed, attested.
            Built on Base. Settled in USDC.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link
              href="/browse"
              className="bg-orange text-warmdark px-7 py-3 font-mono text-xs uppercase tracking-widest hover:bg-orange-light transition-colors"
            >
              Browse the Hub →
            </Link>
            <Link
              href="/build"
              className="border border-cream/30 text-cream px-7 py-3 font-mono text-xs uppercase tracking-widest hover:border-orange hover:text-orange transition-colors"
            >
              List a capability
            </Link>
          </div>

          <div className="text-xs font-mono text-cream/50 tracking-wider">
            EST. 2026 / BUILT ON BASE
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
