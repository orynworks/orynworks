"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/build", label: "Build" },
  { href: "/docs", label: "Docs" },
];

type NavLinksProps = {
  variant?: "desktop" | "mobile";
};

export function NavLinks({ variant = "desktop" }: NavLinksProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (variant === "mobile") {
    return (
      <div className="md:hidden">
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-center w-9 h-9 border border-cream/20 text-cream/70 hover:border-orange hover:text-orange transition-colors"
        >
          <span aria-hidden className="font-mono text-base leading-none">
            {open ? "×" : "≡"}
          </span>
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-full mt-0 bg-warmdark-light border-b border-cream/10 z-50 shadow-xl">
            <nav className="flex flex-col px-6 py-2 text-sm font-mono uppercase tracking-wider">
              {LINKS.map((link) => {
                const isActive =
                  pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`py-3 border-b border-cream/5 last:border-b-0 transition-colors ${
                      isActive ? "text-orange" : "text-cream/70 hover:text-orange"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    );
  }

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
