import Link from "next/link";
import { useEffect, useState } from "react";

import { FigmaPage } from "../components/FigmaPage";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { useWallet } from "../context/WalletContext";
import {
  factory,
  pool,
  type FactoryPoolInfo,
  type PoolSummary,
  type Claim as ClaimType,
} from "../lib/contracts";
import { fromStroops, shortenAddress, CONTRACTS } from "../lib/contracts/config";

type UserPool = FactoryPoolInfo & { summary: PoolSummary | null };

export default function DashboardPage() {
  const { address, isConnected, connect } = useWallet();
  const [userPools, setUserPools] = useState<UserPool[]>([]);
  const [userClaims, setUserClaims] = useState<{ claim: ClaimType; poolAddr: string; poolName: string }[]>([]);
  const [pendingVotes, setPendingVotes] = useState<{ claim: ClaimType; poolAddr: string; poolName: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address || !CONTRACTS.factory) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        // Get all pools and find ones the user is a member of
        const allPools = await factory.getAllPools();
        const poolsWithSummaries: UserPool[] = [];
        const claimsList: typeof userClaims = [];
        const votesList: typeof pendingVotes = [];

        await Promise.all(
          allPools.map(async (fp) => {
            try {
              const [summary, members] = await Promise.all([
                pool.getPoolSummary(fp.address),
                pool.getMembers(fp.address),
              ]);

              const isMember = members.some(
                (m) => m.toLowerCase() === address.toLowerCase()
              );

              if (isMember && summary) {
                poolsWithSummaries.push({ ...fp, summary });

                // Get claims for this pool
                const claims = await pool.getAllClaims(fp.address);
                for (const c of claims) {
                  if (c.claimant.toLowerCase() === address.toLowerCase()) {
                    claimsList.push({ claim: c, poolAddr: fp.address, poolName: summary.name });
                  }
                  if (c.status === "PendingReview") {
                    const voted = await pool.hasVoted(fp.address, c.id, address);
                    if (!voted) {
                      votesList.push({ claim: c, poolAddr: fp.address, poolName: summary.name });
                    }
                  }
                }
              }
            } catch {
              // Skip pools that error
            }
          })
        );

        setUserPools(poolsWithSummaries);
        setUserClaims(claimsList);
        setPendingVotes(votesList);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [address]);

  const totalFunds = userPools.reduce(
    (sum, p) => sum + Number(p.summary?.totalFunds ?? BigInt(0)),
    0
  );
  const totalClaims = userClaims.length;
  const resolvedClaims = userClaims.filter(
    (c) => c.claim.status === "Approved" || c.claim.status === "PaidOut"
  ).length;

  function claimStatusBadge(status: string) {
    if (status === "Approved" || status === "PaidOut")
      return { bg: "bg-primary-fixed text-on-primary-fixed-variant", dot: "bg-secondary", label: status === "PaidOut" ? "Paid Out" : "Approved" };
    if (status === "PendingReview")
      return { bg: "bg-tertiary-fixed text-on-tertiary-fixed-variant", dot: "bg-error", label: "Pending Review" };
    if (status === "Rejected")
      return { bg: "bg-error-container text-on-error-container", dot: "bg-error", label: "Rejected" };
    return { bg: "bg-surface-container-high text-on-surface-variant", dot: "bg-outline", label: status };
  }

  if (!isConnected) {
    return (
      <FigmaPage title="Dashboard">
        <>
          <Header />
          <main className="pt-32 pb-xl max-w-[1280px] mx-auto px-container-padding flex flex-col items-center justify-center min-h-[60vh] gap-lg">
            <span className="material-symbols-outlined text-[64px] text-outline">account_balance_wallet</span>
            <h2 className="font-headline-md text-headline-md text-primary">Connect Your Wallet</h2>
            <p className="text-on-surface-variant text-center max-w-md">
              Connect your Freighter wallet to view your pools, claims, and voting activity.
            </p>
            <button
              onClick={connect}
              className="bg-primary text-on-primary px-xl py-md rounded-lg font-bold hover:opacity-90 transition-all"
            >
              Connect Freighter
            </button>
          </main>
          <Footer />
        </>
      </FigmaPage>
    );
  }

  return (
    <FigmaPage title="Dashboard">
      <>
        <Header />
        <main className="pt-24 pb-xl px-container-padding max-w-[1280px] mx-auto min-h-screen">
          {/* Welcome */}
          <div className="mb-xl">
            <h2 className="text-headline-md font-headline-md text-primary">Portfolio Overview</h2>
            <p className="text-body-sm text-on-surface-variant">
              Connected as {shortenAddress(address, 8)} — manage your pools, claims, and votes.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-[80px] gap-md">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-on-surface-variant font-body-sm">Loading your dashboard...</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
                <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-label-caps text-on-surface-variant">Total Pool Exposure</span>
                    <span className="material-symbols-outlined text-primary">payments</span>
                  </div>
                  <span className="text-display-lg font-display-lg text-primary">
                    {fromStroops(BigInt(totalFunds)).toFixed(2)}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">USDC across {userPools.length} pool(s)</span>
                </div>
                <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-label-caps text-on-surface-variant">Active Pools</span>
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>waves</span>
                  </div>
                  <span className="text-display-lg font-display-lg text-primary">{userPools.length}</span>
                  <span className="text-body-sm text-on-surface-variant">Pool memberships</span>
                </div>
                <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-label-caps text-on-surface-variant">Claims Filed</span>
                    <span className="material-symbols-outlined text-primary">assignment_late</span>
                  </div>
                  <span className="text-display-lg font-display-lg text-primary">{totalClaims}</span>
                  <span className="text-label-caps text-secondary font-bold">{resolvedClaims} Resolved</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
                {/* Left Column */}
                <div className="lg:col-span-8 flex flex-col gap-xl">
                  {/* My Pools */}
                  <section className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                    <div className="px-lg py-md border-b border-surface-variant flex justify-between items-center">
                      <h3 className="text-headline-sm font-headline-sm text-primary">My Pools</h3>
                      <Link href="/explore-pools" className="text-label-caps text-secondary hover:underline">
                        View All
                      </Link>
                    </div>
                    {userPools.length === 0 ? (
                      <div className="p-xl text-center text-on-surface-variant">
                        <p>You haven&apos;t joined any pools yet.</p>
                        <Link href="/explore-pools" className="text-primary font-bold hover:underline mt-sm inline-block">
                          Explore Pools
                        </Link>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-surface-container-low border-b border-surface-variant">
                            <tr>
                              <th className="px-lg py-sm text-label-caps text-on-surface-variant">Pool</th>
                              <th className="px-lg py-sm text-label-caps text-on-surface-variant">Balance</th>
                              <th className="px-lg py-sm text-label-caps text-on-surface-variant">Contribution</th>
                              <th className="px-lg py-sm text-label-caps text-on-surface-variant">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-variant">
                            {userPools.map((p) => (
                              <tr key={p.id} className="hover:bg-surface-container-high/30 transition-colors">
                                <td className="px-lg py-md">
                                  <Link href={`/pool-details?address=${p.address}`} className="flex items-center gap-sm hover:underline">
                                    <div className="w-8 h-8 rounded-full bg-surface-container shadow-sm flex items-center justify-center">
                                      <span className="material-symbols-outlined text-primary text-sm">shield</span>
                                    </div>
                                    <span className="font-mono-data text-on-surface">{p.summary?.name || `Pool #${p.id}`}</span>
                                  </Link>
                                </td>
                                <td className="px-lg py-md font-mono-data">
                                  {p.summary ? `${fromStroops(p.summary.totalFunds).toFixed(2)} USDC` : "—"}
                                </td>
                                <td className="px-lg py-md text-secondary font-bold">
                                  {p.summary ? `${fromStroops(p.summary.contributionAmount).toFixed(2)} USDC` : "—"}
                                </td>
                                <td className="px-lg py-md">
                                  <div className="flex items-center gap-xs">
                                    <span className={`w-2 h-2 rounded-full ${p.summary?.status === "Active" ? "bg-secondary-fixed-dim animate-pulse" : "bg-outline"}`} />
                                    <span className="text-body-sm text-on-surface-variant">{p.summary?.status ?? "—"}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  {/* My Claims */}
                  <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm">
                    <div className="px-lg py-md border-b border-surface-variant flex justify-between items-center">
                      <h3 className="text-headline-sm font-headline-sm text-primary">My Claims</h3>
                    </div>
                    <div className="p-lg flex flex-col gap-md">
                      {userClaims.length === 0 ? (
                        <p className="text-on-surface-variant text-center py-md">No claims filed yet.</p>
                      ) : (
                        userClaims.map(({ claim: c, poolAddr, poolName }) => {
                          const badge = claimStatusBadge(c.status);
                          return (
                            <div key={`${poolAddr}-${c.id}`} className="flex items-center justify-between p-md bg-background rounded-lg border border-outline-variant/30">
                              <div className="flex items-center gap-md">
                                <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center">
                                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {c.status === "Approved" || c.status === "PaidOut" ? "check_circle" : "report_problem"}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-headline-sm text-primary">{c.description.slice(0, 40) || `Claim #${c.id}`}</p>
                                  <p className="text-body-sm text-outline">{poolName} • {fromStroops(c.amount).toFixed(2)} USDC</p>
                                </div>
                              </div>
                              <div className={`flex items-center gap-xs ${badge.bg} px-md py-xs rounded-full`}>
                                <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                                <span className="text-label-caps">{badge.label}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-4 flex flex-col gap-xl">
                  {/* Pending Votes */}
                  <section className="bg-primary-container text-on-primary-container rounded-xl p-lg shadow-sm">
                    <h3 className="text-headline-sm font-headline-sm text-white mb-md">
                      Pending Votes ({pendingVotes.length})
                    </h3>
                    {pendingVotes.length === 0 ? (
                      <p className="text-body-sm opacity-70">No pending votes at this time.</p>
                    ) : (
                      <div className="flex flex-col gap-md">
                        {pendingVotes.slice(0, 5).map(({ claim: c, poolAddr, poolName }) => (
                          <div key={`${poolAddr}-${c.id}`} className="bg-primary/40 rounded-lg p-md border border-on-primary-container/20">
                            <p className="text-body-sm text-secondary-fixed mb-xs">
                              #{c.id} • {poolName}
                            </p>
                            <h4 className="text-body-lg font-bold text-white mb-sm">
                              {c.description.slice(0, 50) || `Claim #${c.id}`}
                            </h4>
                            <p className="text-body-sm text-secondary-fixed mb-sm">
                              {fromStroops(c.amount).toFixed(2)} USDC
                            </p>
                            <Link
                              href={`/claim-voting?pool=${poolAddr}&claim=${c.id}`}
                              className="block w-full bg-secondary-fixed text-on-secondary-fixed px-sm py-xs rounded-lg text-label-caps font-bold text-center hover:brightness-110 transition-all"
                            >
                              Vote Now
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Quick Actions */}
                  <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
                    <h3 className="text-headline-sm font-headline-sm text-primary mb-md">Quick Actions</h3>
                    <div className="flex flex-col gap-sm">
                      <Link
                        href="/explore-pools"
                        className="flex items-center gap-md text-on-surface-variant px-md py-sm hover:bg-surface-container-high rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined">explore</span>
                        <span className="font-body-sm">Explore Pools</span>
                      </Link>
                      <Link
                        href="/create-pool"
                        className="flex items-center gap-md text-on-surface-variant px-md py-sm hover:bg-surface-container-high rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined">add_circle</span>
                        <span className="font-body-sm">Create Pool</span>
                      </Link>
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}
        </main>
        <Footer />

        {/* Mobile Nav */}
        <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-surface-container-lowest border-t border-outline-variant/20 h-16 flex items-center justify-around px-md z-50">
          <Link className="flex flex-col items-center text-primary" href="/dashboard">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-[10px] font-bold">Dash</span>
          </Link>
          <Link className="flex flex-col items-center text-on-surface-variant" href="/explore-pools">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="text-[10px]">Pools</span>
          </Link>
          <Link className="flex flex-col items-center text-on-surface-variant" href="/claims/new">
            <span className="material-symbols-outlined">gavel</span>
            <span className="text-[10px]">Claims</span>
          </Link>
          <Link className="flex flex-col items-center text-on-surface-variant" href="/create-pool">
            <span className="material-symbols-outlined">add_circle</span>
            <span className="text-[10px]">Create</span>
          </Link>
        </nav>
      </>
    </FigmaPage>
  );
}
