import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSession } from "@/lib/get-session";
import { getDb } from "@/lib/db";
import {
  getOperatorSpending,
  getOperatorTotalCalls,
  listRecentUsageByCaller,
  listCapabilitySummariesByIds,
} from "@oryn/db";

export default async function MePage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="min-h-screen flex flex-col">
        <Header showDashboardLink={false} />
        <section className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="text-center max-w-md">
            <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-3 font-mono">
              Profile
            </p>
            <h1 className="font-serif text-4xl mb-4">Sign in to continue.</h1>
            <p className="text-cream/60 text-sm mb-8">
              Connect your wallet and sign in to see your spending, recent calls, and
              installed capabilities.
            </p>
            <Link
              href="/"
              className="inline-block bg-orange text-warmdark px-6 py-3 font-mono text-xs uppercase tracking-widest hover:bg-orange-light transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const db = getDb();
  const [spending, totalCalls, usageEvents] = await Promise.all([
    getOperatorSpending(db, session.address),
    getOperatorTotalCalls(db, session.address),
    listRecentUsageByCaller(db, session.address, 10),
  ]);

  const uniqueCapIds = Array.from(new Set(usageEvents.map((e) => e.capabilityId)));
  const caps = await listCapabilitySummariesByIds(db, uniqueCapIds);
  const capMap = new Map(caps.map((c) => [c.id, c]));

  return (
    <main className="min-h-screen flex flex-col">
      <Header showDashboardLink={false} />
      <section className="flex-1 px-6 py-12 max-w-4xl mx-auto w-full">
        <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-3 font-mono">
          Profile
        </p>
        <h1 className="font-serif text-4xl mb-6">Your wallet</h1>

        {/* Identity */}
        <dl className="space-y-3 font-mono text-sm mb-10">
          <div className="flex justify-between border-b border-cream/10 pb-2">
            <dt className="text-cream/60">Address</dt>
            <dd className="break-all">{session.address}</dd>
          </div>
          <div className="flex justify-between border-b border-cream/10 pb-2">
            <dt className="text-cream/60">Chain ID</dt>
            <dd>{session.chainId}</dd>
          </div>
        </dl>

        {/* Spending */}
        <div className="grid grid-cols-2 gap-3 mb-10 max-w-md">
          <Stat label="Spent (USDC)" value={Number(spending).toFixed(4)} />
          <Stat label="Calls" value={totalCalls} />
        </div>

        {/* Recent activity */}
        <h2 className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4 font-mono">
          Recent activity
        </h2>
        {usageEvents.length === 0 ? (
          <div className="border border-cream/10 px-8 py-12 text-center">
            <p className="text-cream/60 mb-2">No usage yet.</p>
            <p className="text-cream/40 text-sm">
              <Link href="/browse" className="text-orange hover:underline">
                Browse capabilities
              </Link>{" "}
              and install one to start tracking.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {usageEvents.map((event) => {
              const cap = capMap.get(event.capabilityId);
              const success = event.success;
              return (
                <li
                  key={event.id}
                  className="border border-cream/10 px-4 py-3 flex items-center justify-between text-sm"
                >
                  <div className="min-w-0">
                    {cap ? (
                      <Link
                        href={`/capability/${cap.slug}`}
                        className="font-serif hover:text-orange truncate block"
                      >
                        {cap.name}
                      </Link>
                    ) : (
                      <span className="font-mono text-cream/40">deleted capability</span>
                    )}
                    <p className="text-[10px] font-mono text-cream/40 uppercase tracking-wider mt-1">
                      {event.eventType} · {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className={`text-xs font-mono ${success ? "text-cream/80" : "text-orange"}`}>
                      {success ? "OK" : event.errorCode ?? "FAIL"}
                    </p>
                    <p className="text-[10px] font-mono text-cream/40 mt-1">
                      ${Number(event.costUsdc).toFixed(4)}
                      {event.latencyMs !== null && ` · ${event.latencyMs}ms`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <Footer />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-cream/10 px-4 py-5 text-center">
      <div className="font-serif text-2xl text-cream">{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-cream/40 mt-1">
        {label}
      </div>
    </div>
  );
}
