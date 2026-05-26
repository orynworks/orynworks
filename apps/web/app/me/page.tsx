import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/get-session";

export default async function MePage() {
  const session = await getSession();

  if (!session) {
    redirect("/?error=auth_required");
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-cream/10">
        <Link href="/" className="font-serif text-xl">oryn</Link>
        <span className="text-xs font-mono tracking-wider text-cream/60 uppercase">
          {session.address.slice(0, 6)}…{session.address.slice(-4)}
        </span>
      </header>
      <div className="flex-1 px-6 py-12 max-w-3xl mx-auto w-full">
        <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4">
          Profile
        </p>
        <h1 className="font-serif text-4xl mb-6">Your wallet</h1>
        <dl className="space-y-3 font-mono text-sm">
          <div className="flex justify-between border-b border-cream/10 pb-2">
            <dt className="text-cream/60">Address</dt>
            <dd>{session.address}</dd>
          </div>
          <div className="flex justify-between border-b border-cream/10 pb-2">
            <dt className="text-cream/60">Chain ID</dt>
            <dd>{session.chainId}</dd>
          </div>
        </dl>
        <p className="text-cream/50 text-sm mt-8">
          More to come — capabilities, attestations, spending dashboard.
        </p>
      </div>
    </main>
  );
}
