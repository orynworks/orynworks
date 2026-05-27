import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSession } from "@/lib/get-session";
import { getDb } from "@/lib/db";
import { listCapabilitiesByBuilder, upsertWalletByAddress } from "@oryn/db";

export default async function BuildDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/?error=auth_required");

  const db = getDb();
  const walletRecord = await upsertWalletByAddress(db, session.address);
  const myCapabilities = await listCapabilitiesByBuilder(db, walletRecord.id);

  return (
    <main className="min-h-screen flex flex-col">
      <Header showDashboardLink />
      <section className="flex-1 px-6 py-12 max-w-5xl mx-auto w-full">
        <div className="flex items-baseline justify-between mb-10">
          <div>
            <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-3 font-mono">
              Build
            </p>
            <h1 className="font-serif text-4xl">Your capabilities</h1>
          </div>
          <Link
            href="/build/new"
            className="bg-orange text-warmdark px-6 py-3 font-mono text-xs uppercase tracking-widest hover:bg-orange-light transition-colors"
          >
            + Publish new
          </Link>
        </div>

        {myCapabilities.length === 0 ? (
          <div className="border border-cream/10 px-8 py-16 text-center">
            <p className="text-cream/60 mb-4">No capabilities yet.</p>
            <p className="text-cream/40 text-sm">
              Publish your first Skill (MCP server URL) or Knowledge pack.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {myCapabilities.map((cap) => (
              <li
                key={cap.id}
                className="border border-cream/10 px-5 py-4 flex items-center justify-between hover:border-orange/40 transition-colors"
              >
                <div>
                  <Link
                    href={`/capability/${cap.slug}`}
                    className="font-serif text-lg hover:text-orange"
                  >
                    {cap.name}
                  </Link>
                  <p className="text-xs font-mono text-cream/50 mt-1">
                    {cap.slug} · {cap.type} · {cap.category} · {cap.status}
                  </p>
                </div>
                <span className="text-xs font-mono text-cream/60">
                  ${cap.priceUsdc}/call
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Footer />
    </main>
  );
}
