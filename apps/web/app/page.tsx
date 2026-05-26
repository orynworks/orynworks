import { ConnectButton } from "@/components/ConnectButton";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-cream/10">
        <span className="font-serif text-xl">oryn</span>
        <ConnectButton />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-2xl text-center">
          <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4">
            A capability marketplace
          </p>
          <h1 className="font-serif text-5xl md:text-6xl leading-tight tracking-tight mb-6">
            The capability<br />marketplace<br />
            <span className="text-orange">for AI agents.</span>
          </h1>
          <p className="text-cream/70 text-lg mb-8 max-w-md mx-auto">
            Skills, knowledge, and reputation — discovered, installed, attested.
            Built on Base. Settled in USDC.
          </p>
          <div className="text-xs font-mono text-cream/50 tracking-wider">
            EST. 2026 / BUILT ON BASE
          </div>
        </div>
      </div>
    </main>
  );
}
