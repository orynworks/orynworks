import Link from "next/link";
import { ConnectButton } from "./ConnectButton";
import { Logo } from "./Logo";

type HeaderProps = {
  showDashboardLink?: boolean;
};

export function Header({ showDashboardLink }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-cream/10">
      <Link href="/" className="flex items-center gap-2 text-cream hover:text-orange transition-colors">
        <Logo size={28} />
        <span className="font-serif text-xl">oryn</span>
      </Link>

      <nav className="hidden md:flex items-center gap-7 text-xs font-mono uppercase tracking-wider text-cream/60">
        <Link href="/browse" className="hover:text-cream transition-colors">Browse</Link>
        <Link href="/build" className="hover:text-cream transition-colors">Build</Link>
        <Link href="/docs" className="hover:text-cream transition-colors">Docs</Link>
      </nav>

      <div className="flex items-center gap-4">
        {showDashboardLink && (
          <Link
            href="/me"
            className="text-xs font-mono tracking-wider uppercase text-cream/70 hover:text-orange transition-colors"
          >
            Dashboard →
          </Link>
        )}
        <ConnectButton />
      </div>
    </header>
  );
}
