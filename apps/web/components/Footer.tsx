import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-cream/10 px-4 sm:px-6 py-10 mt-12">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
        <div className="flex items-start gap-0">
          <Logo size={52} className="text-cream" />
          <div className="-ml-1">
            <p className="font-serif text-lg">orynworks</p>
            <p className="text-xs text-cream/50 font-mono tracking-wider mt-1">
              the capability marketplace for AI agents.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 text-xs font-mono uppercase tracking-wider">
          <div>
            <p className="text-cream/40 mb-3">Product</p>
            <ul className="space-y-2">
              <li><Link href="/browse" className="text-cream/70 hover:text-orange">Browse</Link></li>
              <li><Link href="/build" className="text-cream/70 hover:text-orange">Build</Link></li>
              <li><Link href="/docs" className="text-cream/70 hover:text-orange">Docs</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-cream/40 mb-3">Community</p>
            <ul className="space-y-2">
              <li><a href="https://x.com/orynworks" target="_blank" rel="noreferrer" className="text-cream/70 hover:text-orange">Twitter</a></li>
              <li><a href="https://github.com/orynworks" target="_blank" rel="noreferrer" className="text-cream/70 hover:text-orange">GitHub</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-10 pt-6 border-t border-cream/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] sm:text-xs font-mono uppercase tracking-wider text-cream/40">
        <span>© 2026 Oryn Works</span>
        <span>Est. MMXXVI / Built on Base</span>
      </div>
    </footer>
  );
}
