"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/build", label: "Build" },
  { href: "/docs", label: "Docs" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-10 text-sm font-mono uppercase tracking-wider">
      {LINKS.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative py-2 transition-colors ${
              isActive
                ? "text-cream"
                : "text-cream/60 hover:text-cream"
            }`}
          >
            {link.label}
            <span
              aria-hidden
              className={`absolute left-1/2 -translate-x-1/2 -bottom-0.5 w-1 h-1 rounded-full bg-orange transition-opacity ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
