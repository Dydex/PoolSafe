export default function Footer() {
  return (
    <footer className="border-t border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto flex w-full max-w-container-max flex-col items-center justify-between gap-stack-md px-margin-mobile py-stack-lg md:flex-row md:px-margin-desktop">
        <div className="text-center md:text-left">
          <p className="font-heading text-headline-md font-bold text-primary">Nexus Guard</p>
          <p className="text-body-sm text-on-surface-variant">© 2026 Nexus Guard Protocol. Decentralized & Fully Audited.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-stack-md text-body-sm text-on-surface-variant">
          <a className="hover:text-primary">Privacy Policy</a>
          <a className="hover:text-primary">Terms of Service</a>
          <a className="hover:text-primary">Risk Disclosure</a>
          <a className="font-mono hover:text-primary">Whitepaper</a>
        </div>
      </div>
    </footer>
  );
}