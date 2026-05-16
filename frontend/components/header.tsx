import Link from "next/link";
import { useRouter } from "next/router";

import { WalletButton } from "./wallet-button";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/explore-pools", label: "Explore Plans" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/guidelines", label: "How It Works" },
];

export function Header() {
  const router = useRouter();

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/30 bg-surface/80 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-container-padding">
        <Link className="font-headline-md text-headline-md font-bold text-primary" href="/">
          NexusGuard
        </Link>

        <nav className="hidden items-center gap-xl md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link
              className={`font-body-sm text-body-sm transition-colors hover:text-primary ${
                router.pathname === item.href ? "text-primary font-bold" : "text-on-surface-variant"
              }`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-md">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
