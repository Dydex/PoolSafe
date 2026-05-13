import { ArrowRight, FileUp, Info, Sparkles } from "lucide-react";
import { AppShell } from "@/components/Layout";
import { Card, FieldLabel, IconBadge } from "@/components/ui";

const steps = ["Details", "Evidence", "Review"];

export default function NewClaim() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[800px]">
        <header className="mb-stack-lg flex items-center justify-between gap-stack-md">
          <div>
            <p className="mb-1 text-label-caps uppercase tracking-wider text-secondary">Claims Protocol</p>
            <h1 className="font-heading text-headline-lg">New Claim Submission</h1>
          </div>
          <span className="rounded-full border border-outline-variant bg-surface-container-highest px-3 py-1 font-mono text-mono-data text-on-surface-variant">
            0x402...E51A
          </span>
        </header>

        <div className="mb-stack-lg flex items-center justify-between px-2">
          {steps.map((step, index) => (
            <div key={step} className="flex min-w-0 flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <div className={index === 0 ? "flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary" : "flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest text-sm font-bold text-on-surface-variant"}>
                  {index + 1}
                </div>
                <span className={index === 0 ? "text-label-caps text-primary" : "text-label-caps text-on-surface-variant"}>
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && <div className="mx-4 -mt-6 h-px flex-1 bg-outline-variant" />}
            </div>
          ))}
        </div>

        <Card className="p-stack-lg">
          <form className="flex flex-col gap-stack-lg">
            <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2">
              <div className="flex flex-col gap-stack-sm">
                <FieldLabel>Claim Category</FieldLabel>
                <select className="rounded-lg border-outline-variant bg-white px-4 py-3 text-on-surface focus:border-secondary focus:ring-secondary/20">
                  <option>Cyber Security Breach</option>
                  <option>Smart Contract Exploit</option>
                  <option>Protocol Travel Delay</option>
                  <option>Institutional Health</option>
                </select>
              </div>
              <div className="flex flex-col gap-stack-sm">
                <FieldLabel>Claim Amount</FieldLabel>
                <div className="relative">
                  <input className="w-full rounded-lg border-outline-variant bg-white px-4 py-3 pr-14 focus:border-secondary focus:ring-secondary/20" placeholder="0.00" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-on-surface-variant">USDC</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-secondary-container bg-secondary-container/30 p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="text-secondary" size={22} />
                <div>
                  <p className="text-body-sm font-semibold text-on-secondary-container">AI Risk Analysis: Low Risk</p>
                  <p className="text-xs text-on-surface-variant">Eligible for institutional fast-track settlement.</p>
                </div>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-secondary">
                Verified
              </span>
            </div>

            <div className="flex flex-col gap-stack-sm">
              <FieldLabel>Evidence Documentation</FieldLabel>
              <div className="flex cursor-pointer flex-col items-center justify-center gap-stack-sm rounded-xl border-2 border-dashed border-outline-variant p-stack-lg text-center transition hover:bg-surface-container-low">
                <IconBadge icon={FileUp} tone="neutral" />
                <div>
                  <p className="text-body-sm font-medium">Drop files here or click to upload</p>
                  <p className="text-xs text-on-surface-variant">PDF, JPG, or PNG (Max 10MB per file)</p>
                </div>
              </div>
            </div>

            <div className="border-t border-outline-variant pt-stack-lg">
              <div className="mb-stack-sm flex justify-between text-body-sm">
                <span className="text-on-surface-variant">Submission Protocol Fee</span>
                <span className="font-mono font-semibold">0.05 USDC</span>
              </div>
              <div className="mb-stack-lg flex justify-between text-body-sm">
                <span className="text-on-surface-variant">Estimated Network Fee</span>
                <span className="font-mono text-on-surface-variant">~ 0.002 USDC</span>
              </div>
              <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 font-semibold text-on-primary transition hover:opacity-90">
                Submit Claim <ArrowRight size={20} />
              </button>
              <p className="mt-4 text-center text-[11px] leading-relaxed text-on-surface-variant">
                By clicking submit, you authorize Nexus Guard to evaluate this claim using decentralized oracle networks
                and AI validation layers. Fees are non-refundable.
              </p>
            </div>
          </form>
        </Card>

        <div className="mt-stack-lg grid grid-cols-1 gap-stack-md md:grid-cols-3">
          <div className="rounded-xl border border-outline-variant bg-surface-container-high p-6 md:col-span-2">
            <div className="flex gap-4">
              <Info className="text-primary" />
              <div>
                <h2 className="text-body-sm font-bold">Claims Protocol v4.2</h2>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Low-risk claims usually resolve in 24-48 hours after oracle validation.
                </p>
              </div>
            </div>
          </div>
          <Card className="flex flex-col items-center justify-center text-center">
            <span className="text-headline-md font-bold text-secondary">98%</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Trust Score</span>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
