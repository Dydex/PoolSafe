import Link from "next/link";

import { WalletButton } from "./wallet-button";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/explore-pools", label: "Explore Plans" },
  { href: "/claims/new", label: "Claims" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "#", label: "Help" }
];

export function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/30 bg-surface/80 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-container-padding">
        <Link className="font-headline-md text-headline-md font-bold text-primary" href="/">
          NexusGuard
        </Link>

        <nav className="hidden items-center gap-xl md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link
              className="font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-primary"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <WalletButton />
      </div>
    </header>
  );
}
