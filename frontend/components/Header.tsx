import Link from "next/link";
import { Menu, Activity } from "lucide-react";
import WalletButton from "@/components/WalletButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-container-max items-center justify-between px-margin-mobile py-4 md:px-margin-desktop">
        <div className="flex items-center gap-stack-lg">
          <Menu className="md:hidden" size={22} />
          <div className="hidden items-center gap-stack-lg md:flex">
            <Link className="text-label-caps text-on-surface-variant hover:text-primary" href="/">
              Platform
            </Link>
            <Link className="text-label-caps text-on-surface-variant hover:text-primary" href="/governance">
              Governance
            </Link>
            <Link className="text-label-caps text-on-surface-variant hover:text-primary" href="/analytics">
              Analytics
            </Link>
            <Link className="text-label-caps text-on-surface-variant hover:text-primary" href="#">
              Support
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-stack-sm">
          <Activity className="text-on-surface-variant" size={20} />
          <WalletButton compact />
        </div>
      </div>
    </header>
  );
}