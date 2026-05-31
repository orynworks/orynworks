import Link from "next/link";
import { ConnectButton } from "./ConnectButton";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";

type HeaderProps = {
  showDashboardLink?: boolean;
};

export function Header({ showDashboardLink }: HeaderProps) {
  return (
    <header className="relative flex items-center justify-between px-4 sm:px-6 py-4 border-b border-cream/10">
      <Link href="/" className="flex items-center gap-0 text-cream hover:text-orange transition-colors">
        <span className="md:hidden">
          <Logo size={36} />
        </span>
        <span className="hidden md:inline-flex">
          <Logo size={44} />
        </span>
        <span className="font-serif text-lg sm:text-xl -ml-1">orynworks</span>
      </Link>

      <NavLinks />

      <div className="flex items-center gap-2">
        <ConnectButton isSignedIn={!!showDashboardLink} />
        <NavLinks variant="mobile" />
      </div>
    </header>
  );
}
