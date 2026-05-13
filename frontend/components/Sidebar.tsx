import { useRouter } from "next/router";
import Link from "next/link";
import { clsx } from "clsx";
import {
  BarChart3,
  BookOpen,
  Gavel,
  LayoutDashboard,
  Plus,
  Settings,
  Shield,
  Users,
  Vote
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  activeOn?: string[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, activeOn: ["/dashboard", "/analytics"] },
  { href: "/claims/new", label: "Claims", icon: Gavel, activeOn: ["/claims/new"] },
  { href: "/governance", label: "Governance", icon: Vote, activeOn: ["/governance"] },
  { href: "/analytics", label: "Liquidity", icon: BarChart3, activeOn: ["/analytics"] },
  { href: "#", label: "Settings", icon: Settings }
];

export default function Sidebar() {
  const router = useRouter();

  return (
    <aside className="fixed hidden h-screen w-64 flex-col border-r border-outline-variant bg-surface-container-low p-stack-md md:flex">
      <Link href="/" className="mb-stack-lg flex items-center gap-3 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <Shield size={18} />
        </div>
        <div>
          <h2 className="font-heading text-headline-md font-bold">Nexus Guard</h2>
          <p className="text-body-sm leading-none text-on-surface-variant">Institutional Micro-Insurance</p>
        </div>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon, activeOn }) => {
          const active = activeOn?.includes(router.pathname);
          return (
            <Link
              key={label}
              href={href}
              className={clsx(
                "flex items-center gap-stack-md rounded-lg px-4 py-3 text-sm transition",
                active
                  ? "bg-secondary-container font-medium text-on-secondary-container"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <Link
        href="/claims/new"
        className="mb-stack-md flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white hover:opacity-90"
      >
        <Plus size={18} />
        New Claim
      </Link>
      <div className="border-t border-outline-variant pt-stack-md">
        <a className="flex items-center gap-stack-md rounded-lg px-4 py-2 text-body-sm text-on-surface-variant hover:bg-surface-container-high">
          <BookOpen size={18} />
          Docs
        </a>
        <a className="flex items-center gap-stack-md rounded-lg px-4 py-2 text-body-sm text-on-surface-variant hover:bg-surface-container-high">
          <Users size={18} />
          Community
        </a>
      </div>
    </aside>
  );
}