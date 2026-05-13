import Link from "next/link";
import WalletButton from "@/components/WalletButton";

export default function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface/80 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-container-max items-center justify-between px-margin-mobile py-4 md:px-margin-desktop">
        <div className="flex items-center gap-gutter">
          <Link href="/" className="font-heading text-headline-md font-bold text-on-surface">
            Nexus Guard
          </Link>
          <div className="hidden items-center gap-stack-lg md:flex">
            <Link className="text-label-caps font-semibold text-primary" href="/">
              Platform
            </Link>
            <Link className="text-label-caps text-on-surface-variant hover:text-primary" href="/governance">
              Governance
            </Link>
            <Link className="text-label-caps text-on-surface-variant hover:text-primary" href="/analytics">
              Analytics
            </Link>
            <Link className="text-label-caps text-on-surface-variant hover:text-primary" href="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-stack-sm">
          <WalletButton />
        </div>
      </nav>
    </header>
  );
}