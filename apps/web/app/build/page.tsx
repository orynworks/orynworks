import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSession } from "@/lib/get-session";

export default async function BuildPage() {
  const session = await getSession();
  return (
    <main className="min-h-screen flex flex-col">
      <Header showDashboardLink={!!session} />
      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center max-w-md">
          <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4 font-mono">Build</p>
          <h1 className="font-serif text-4xl mb-4">Coming soon.</h1>
          <p className="text-cream/60 text-sm">
            Publish your MCP server or knowledge pack to the Oryn marketplace.
            Earn USDC per call, build on-chain reputation.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
