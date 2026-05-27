import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CapabilityForm } from "@/components/CapabilityForm";
import { getSession } from "@/lib/get-session";

export default async function NewCapabilityPage() {
  const session = await getSession();
  if (!session) redirect("/?error=auth_required");

  return (
    <main className="min-h-screen flex flex-col">
      <Header showDashboardLink />
      <section className="flex-1 px-6 py-12 max-w-3xl mx-auto w-full">
        <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-3 font-mono">
          Build
        </p>
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
