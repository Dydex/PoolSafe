import Link from "next/link";
import { useEffect, useState } from "react";

import { FigmaPage } from "../components/FigmaPage";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { useWallet } from "../context/WalletContext";
import { factory, pool, type FactoryPoolInfo, type PoolSummary } from "../lib/contracts";
import { fromStroops, shortenAddress, CONTRACTS } from "../lib/contracts/config";

type PoolCard = FactoryPoolInfo & { summary: PoolSummary | null };

export default function ExplorePoolsPage() {
  const { connect, isConnected, isConnecting } = useWallet();
  const [pools, setPools] = useState<PoolCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!CONTRACTS.factory) {
        setError("Factory contract not configured. Set NEXT_PUBLIC_FACTORY_CONTRACT_ID.");
        setLoading(false);
        return;
      }
      try {
        const factoryPools = await factory.getAllPools();
        const withSummaries = await Promise.all(
          factoryPools.map(async (fp) => {
            const summary = await pool.getPoolSummary(fp.address);
            return { ...fp, summary };
          })
        );
        setPools(withSummaries);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load pools");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function phaseDot(phase: string) {
    if (phase === "Active") return "bg-secondary animate-pulse";
    if (phase === "Formation") return "bg-tertiary-container";
    if (phase === "Closed") return "bg-outline";
    return "bg-outline";
  }

  function phaseLabel(phase: string) {
    if (phase === "Active") return "text-secondary";
    if (phase === "Formation") return "text-on-tertiary-container";
    return "text-on-surface-variant";
  }

  function claimRisk(claimCount: number, memberCount: number) {
    if (memberCount === 0) return { label: "No Activity", pct: 0, color: "bg-surface-variant" };
    const ratio = claimCount / memberCount;
    if (ratio < 0.2) return { label: "Low Risk", pct: Math.round(ratio * 100), color: "bg-secondary" };
    if (ratio < 0.5) return { label: "Moderate Risk", pct: Math.round(ratio * 100), color: "bg-tertiary-container" };
    return { label: "High Activity", pct: Math.min(100, Math.round(ratio * 100)), color: "bg-error" };
  }

  return (
    <FigmaPage title="Explore Pools">
      <>
        <Header />
        <main className="flex-grow pt-24 pb-xl px-container-padding max-w-[1280px] mx-auto w-full">
          <header className="mb-xl">
            <h1 className="font-display-lg text-display-lg text-on-background mb-xs">
              Risk Mitigation Pools
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
              Explore decentralized microinsurance pools on Stellar Testnet. Join a pool or create your own.
            </p>
          </header>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-[120px] gap-md">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-on-surface-variant font-body-sm">Loading pools from Stellar Testnet...</p>
            </div>
          ) : error ? (
            <div className="bg-error-container text-on-error-container p-xl rounded-xl text-center">
              <p className="font-headline-sm mb-xs">Unable to load pools</p>
              <p className="font-body-sm">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-xl">
              {pools.map((p) => {
                const s = p.summary;
                const risk = claimRisk(s?.claimCount ?? 0, s?.memberCount ?? 0);
                return (
                  <div
                    key={p.id}
                    className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="h-24 bg-primary-container relative flex items-center justify-center">
                      <span className="material-symbols-outlined text-[48px] text-on-primary-container/30">
                        shield
                      </span>
                      <span className="absolute top-md right-md px-sm py-xs bg-surface-container-lowest/90 backdrop-blur rounded-full font-label-caps text-label-caps text-primary">
                        POOL #{p.id}
                      </span>
                    </div>
                    <div className="p-lg flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-sm">
                        <h3 className="font-headline-md text-headline-md text-on-surface">
                          {s?.name || `Pool #${p.id}`}
                        </h3>
                        <div className="flex items-center gap-xs">
                          <span className={`w-2 h-2 rounded-full ${phaseDot(s?.phase ?? (p.active ? "Active" : "Closed"))}`} />
                          <span className={`font-label-caps text-label-caps ${phaseLabel(s?.phase ?? "Active")}`}>
                            {(s?.phase ?? (p.active ? "ACTIVE" : "CLOSED")).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mb-lg flex-grow">
                        {s?.description || "Decentralized microinsurance pool"}
                      </p>
                      <div className="grid grid-cols-2 gap-md pt-md border-t border-outline-variant/20">
                        <div>
                          <span className="block font-label-caps text-label-caps text-on-surface-variant">
                            POOL BALANCE
                          </span>
                          <span className="font-mono-data text-mono-data text-on-surface">
                            {s ? `${fromStroops(s.totalFunds).toFixed(2)} USDC` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="block font-label-caps text-label-caps text-on-surface-variant">
                            MEMBERS
                          </span>
                          <span className="font-mono-data text-mono-data text-on-surface">
                            {s ? `${s.memberCount}/${s.maxMembers}` : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-lg">
                        <div className="flex justify-between items-center mb-xs">
                          <span className="font-label-caps text-label-caps text-on-surface-variant">
                            CLAIM ACTIVITY
                          </span>
                          <span className="font-label-caps text-label-caps text-on-surface">
                            {risk.label}
                          </span>
                        </div>
                        <div className="w-full bg-surface-variant h-1 rounded-full overflow-hidden">
                          <div
                            className={`${risk.color} h-full`}
                            style={{ width: `${Math.max(risk.pct, 2)}%` }}
                          />
                        </div>
                      </div>
                      {s?.phase === "Formation" && (
                        <div className="mt-md">
                          <div className="flex justify-between items-center mb-xs">
                            <span className="font-label-caps text-label-caps text-on-surface-variant">FORMATION PROGRESS</span>
                            <span className="font-label-caps text-label-caps text-secondary">{s.memberCount}/{s.minMembers} min</span>
                          </div>
                          <div className="w-full bg-surface-variant h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-tertiary h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.round((s.memberCount / s.minMembers) * 100))}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-on-surface-variant mt-xs">
                            {s.minMembers - s.memberCount} more member{s.minMembers - s.memberCount !== 1 ? "s" : ""} needed to activate
                          </p>
                        </div>
                      )}
                      <div className="mt-md font-body-sm text-on-surface-variant">
                        Contribution: {s ? `${fromStroops(s.contributionAmount).toFixed(2)} USDC/mo` : "—"}
                      </div>
                      <div className="text-body-sm text-outline">
                        Creator: {shortenAddress(p.creator)}
                      </div>
                      <Link
                        className="mt-lg w-full py-sm bg-primary text-on-primary rounded-lg font-headline-sm text-headline-sm hover:opacity-90 transition-opacity text-center block"
                        href={`/pool-details?address=${p.address}`}
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Create Pool Card */}
              <div className="bg-surface-container-low border border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-xl text-center">
                <span className="material-symbols-outlined text-[48px] text-outline mb-md">
                  add_circle
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">
                  Create a Pool
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-lg max-w-[240px]">
                  Start a new microinsurance pool for your community.
                </p>
                <Link
                  className="px-lg py-sm border border-primary text-primary rounded-lg font-headline-sm text-headline-sm hover:bg-primary/5 transition-colors"
                  href="/create-pool"
                >
                  Start Pool
                </Link>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </>
    </FigmaPage>
  );
}
