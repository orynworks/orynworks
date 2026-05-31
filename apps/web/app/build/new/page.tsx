import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CapabilityForm } from "@/components/CapabilityForm";
import { StatusBar } from "@/components/StatusBar";
import { EyebrowChip } from "@/components/EyebrowChip";
import { getSession } from "@/lib/get-session";

export default async function NewCapabilityPage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="min-h-screen flex flex-col bg-warmdark">
        <Header showDashboardLink={false} />
        <StatusBar />
        <section className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="text-center max-w-md">
            <div className="flex justify-center mb-4">
              <EyebrowChip>Build</EyebrowChip>
            </div>
            <h1 className="font-serif text-4xl mb-4">Sign in to publish.</h1>
            <p className="text-cream/60 text-sm mb-8">
              Connect your wallet and sign in to publish a new Skill or Knowledge pack.
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

  return (
    <main className="min-h-screen flex flex-col bg-warmdark">
      <Header showDashboardLink />
      <StatusBar />
      <section className="flex-1 px-6 py-12 max-w-3xl mx-auto w-full">
        <div className="mb-3">
          <EyebrowChip>Build</EyebrowChip>
        </div>
        <h1 className="font-serif text-4xl mb-2">Publish a capability</h1>
        <p className="text-cream/60 mb-10">
          Skill (MCP server) or Knowledge pack. Builders earn USDC per call.
        </p>
        <CapabilityForm />
      </section>
      <Footer />
    </main>
  );
}
