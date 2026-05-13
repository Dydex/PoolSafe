import {
  ArrowRight,
  Bolt,
  CheckCircle2,
  RefreshCcw,
  ShieldCheck,
  Vote,
} from "lucide-react";
import MarketingNav from "@/components/MarketingNav";
import { ButtonLink, Card, IconBadge } from "@/components/ui";
import Footer from "@/components/Footer";

const stats = [
  ["Total Insured", "$42M+", "Global TVL Growth"],
  ["Pool Balance", "$12.5M", "Available Liquidity"],
  ["Claims Processed", "1,240+", "Automated Verifications"],
];

const features = [
  {
    title: "Automated Recurring Contributions",
    text: "Stream premiums with predictable micro-deductions and low-friction wallet approvals.",
    icon: RefreshCcw,
    wide: true,
  },
  {
    title: "Transparent Voting",
    text: "Claims are validated by the collective with clear quorum and reward mechanics.",
    icon: Vote,
  },
  {
    title: "Instant Payouts",
    text: "MultiSig mechanism move funds as soon as covered conditions are met.",
    icon: Bolt,
  },
  {
    title: "Institutional Solvency",
    text: "Capital pools remain over-collateralized with transparent reserve reporting.",
    icon: ShieldCheck,
    wide: true,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main>
        <section className="overflow-hidden py-20 md:py-28">
          <div className="mx-auto grid max-w-container-max grid-cols-1 items-center gap-gutter px-margin-mobile md:grid-cols-12 md:px-margin-desktop">
            <div className="space-y-stack-lg md:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-3 py-1 text-on-secondary-container">
                <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Live Mainnet Alpha
                </span>
              </div>
              <h1 className="max-w-2xl font-display text-5xl font-semibold leading-tight text-on-surface md:text-display">
                Protecting the{" "}
                <span className="text-secondary">Collective.</span>
              </h1>
              <p className="max-w-xl text-base leading-7 text-on-surface-variant">
                Transparent, community-driven insurance pools for the digital
                age. Leverage decentralized capital to mitigate risk with
                institutional precision and algorithmic fairness.
              </p>
              <div className="flex flex-wrap gap-stack-md">
                <ButtonLink href="/dashboard">Join the Pool</ButtonLink>
                <ButtonLink href="/governance" variant="secondary">
                  Explore Governance
                </ButtonLink>
              </div>
            </div>
            <div className="md:col-span-5">
              <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-white p-4 shadow-soft">
                <div className="aspect-[4/3] rounded-xl bg-[radial-gradient(circle_at_30%_30%,#86f2e4,transparent_28%),linear-gradient(135deg,#fff,#d3e4fe_55%,#131b2e)] p-8">
                  <div className="grid h-full grid-cols-3 gap-3 opacity-90">
                    {Array.from({ length: 9 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-white/50 bg-white/35 backdrop-blur"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto grid max-w-container-max grid-cols-1 gap-gutter px-margin-mobile md:grid-cols-3 md:px-margin-desktop">
            {stats.map(([label, value, helper], index) => (
              <Card
                key={label}
                className={index === 0 ? "bg-primary-container text-white" : ""}
              >
                <p className="text-label-caps uppercase text-on-surface-variant/80">
                  {label}
                </p>
                <div className="mt-12">
                  <h2 className="font-heading text-headline-lg">{value}</h2>
                  <p className="font-mono text-mono-data text-secondary">
                    {helper}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-surface-container-low py-24">
          <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
            <div className="mb-stack-lg max-w-2xl">
              <h2 className="font-heading text-headline-lg">
                Precision-Engineered Protection
              </h2>
              <p className="mt-2 text-on-surface-variant">
                Smart contracts, transparent reserves, and community validation
                replace slow paperwork with visible protocol logic.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className={feature.wide ? "md:col-span-8" : "md:col-span-4"}
                >
                  <IconBadge
                    icon={feature.icon}
                    tone={feature.wide ? "secondary" : "primary"}
                  />
                  <h3 className="mt-stack-md font-heading text-headline-md">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-body-sm text-on-surface-variant">
                    {feature.text}
                  </p>
                  {!feature.wide && (
                    <a className="mt-stack-md inline-flex items-center gap-2 text-sm font-semibold text-secondary">
                      Learn more <ArrowRight size={16} />
                    </a>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto flex max-w-container-max flex-col gap-stack-lg px-margin-mobile md:flex-row md:items-center md:justify-between md:px-margin-desktop">
            <div>
              <p className="text-label-caps uppercase tracking-wider text-secondary">
                Protocol Readiness
              </p>
              <h2 className="mt-2 font-heading text-headline-lg">
                Built for collective risk coverage.
              </h2>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-white p-5 shadow-soft">
              <CheckCircle2 className="text-secondary" />
              <div>
                <p className="font-semibold">150% collateralization ratio</p>
                <p className="text-body-sm text-on-surface-variant">
                  Across all active micro-insurance products
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
