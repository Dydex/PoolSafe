import Link from "next/link";

const footerLinks = [
  { href: "#", label: "Guidelines" },
  { href: "#", label: "Github" },
  { href: "#", label: "Audit Reports" },
  { href: "#", label: "Privacy Policy" },
  { href: "#", label: "Terms of Service" }
];

export function Footer() {
  return (
    <footer className="w-full border-t border-outline-variant/20 bg-surface-container-lowest py-xl">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-md px-container-padding md:flex-row">
        <div className="flex flex-col items-center gap-xs md:items-start">
          <Link className="font-headline-sm text-headline-sm font-bold text-primary" href="/">
            NexusGuard
          </Link>
          <p className="text-center font-body-sm text-body-sm text-on-surface-variant md:text-left">
            © 2024 NexusGuard Protocol. Transparent everyday microinsurance.
          </p>
        </div>

        <nav className="flex flex-wrap justify-center gap-lg" aria-label="Footer navigation">
          {footerLinks.map((item) => (
            <Link
              className="font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-primary hover:underline"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
