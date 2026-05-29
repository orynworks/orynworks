import Link from "next/link";
import { ConnectButton } from "./ConnectButton";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";

type HeaderProps = {
  showDashboardLink?: boolean;
};

export function Header({ showDashboardLink }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-cream/10">
      <Link href="/" className="flex items-center gap-0 text-cream hover:text-orange transition-colors">
        <Logo size={44} />
        <span className="font-serif text-xl -ml-1">orynworks</span>
      </Link>

      <NavLinks />

      <div className="flex items-center">
        <ConnectButton isSignedIn={!!showDashboardLink} />
      </div>
    </header>
  );
}
