import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { FigmaPage } from "../components/FigmaPage";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { useWallet } from "../context/WalletContext";
import { pool, type PoolSummary, type Claim as ClaimType } from "../lib/contracts";
import { fromStroops, shortenAddress } from "../lib/contracts/config";

type Tab = "overview" | "members" | "claims";

export default function PoolDetailsPage() {
  const router = useRouter();
  const poolAddress = (router.query.address as string) ?? "";
  const { address, isConnected, connect } = useWallet();

  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<PoolSummary | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [claims, setClaims] = useState<ClaimType[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!poolAddress) return;
    async function load() {
      setLoading(true);
      try {
        const [s, m, c] = await Promise.all([
          pool.getPoolSummary(poolAddress),
          pool.getMembers(poolAddress),
          pool.getAllClaims(poolAddress),
        ]);
        setSummary(s);
        setMembers(m);
        setClaims(c);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Failed to load pool");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [poolAddress]);

  useEffect(() => {
    if (!poolAddress || !address) return;
    pool.getMemberRole(poolAddress, address).then(setUserRole);
  }, [poolAddress, address]);

  async function handleJoin() {
    if (!isConnected) {
      await connect();
      return;
    }
    setJoining(true);
    setStatus("");
    try {
      await pool.joinPool(poolAddress, address);
      setStatus("Successfully joined the pool!");
      const [s, m] = await Promise.all([
        pool.getPoolSummary(poolAddress),
        pool.getMembers(poolAddress),
      ]);
      setSummary(s);
      setMembers(m);
      setUserRole("Member");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to join pool");
    } finally {
      setJoining(false);
    }
  }

  function claimStatusDot(s: string) {
    if (s === "PendingReview") return "bg-tertiary-container";
    if (s === "Approved") return "bg-secondary animate-pulse";
    if (s === "PaidOut") return "bg-secondary";
    if (s === "Rejected" || s === "Expired") return "bg-error";
    return "bg-outline";
  }

  function claimStatusText(s: string) {
    if (s === "PendingReview") return "Pending Review";
    if (s === "PaidOut") return "Paid Out";
    return s;
  }

  if (loading) {
    return (
      <FigmaPage title="Pool Details">
        <>
          <Header />
          <main className="pt-32 pb-xl max-w-[1280px] mx-auto px-container-padding flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="mt-md text-on-surface-variant">Loading pool data...</p>
          </main>
          <Footer />
        </>
      </FigmaPage>
    );
  }

  return (
    <FigmaPage title="Pool Details">
      <>
        <Header />
        <main className="pt-32 pb-xl max-w-[1280px] mx-auto px-container-padding">
          {/* Pool Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-lg mb-xl">
            <div className="flex-1">
              <div className="flex items-center gap-sm mb-xs">
                <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                </div>
                <span className="bg-secondary-container text-on-secondary-container px-sm py-xs rounded-full font-label-caps text-label-caps">
                  {summary?.status?.toUpperCase() ?? "POOL"}
                </span>
                {userRole && (
                  <span className="bg-primary-fixed text-on-primary-fixed px-sm py-xs rounded-full font-label-caps text-label-caps">
                    {userRole.toUpperCase()}
                  </span>
                )}
              </div>
              <h1 className="font-display-lg text-display-lg text-primary mb-xs">
                {summary?.name || "Insurance Pool"}
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                {summary?.description || "Decentralized microinsurance pool on Stellar Testnet"}
              </p>
            </div>
          </header>

          {/* Tabs */}
          <div className="flex gap-lg border-b border-outline-variant/30 mb-xl overflow-x-auto">
            {(["overview", "members", "claims"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`font-headline-sm text-headline-sm pb-md whitespace-nowrap transition-colors ${
                  tab === t
                    ? "text-primary border-b-2 border-primary"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-xl">
            {/* Left Column */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-xl">
              {tab === "overview" && summary && (
                <section className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant/30 shadow-sm">
                  <h2 className="font-headline-md text-headline-md text-primary mb-lg">Pool Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-lg">
                    <div>
                      <span className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">TOTAL FUNDS</span>
                      <span className="font-headline-sm text-headline-sm text-primary">{fromStroops(summary.totalFunds).toFixed(2)} USDC</span>
                    </div>
                    <div>
                      <span className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">MEMBERS</span>
                      <span className="font-headline-sm text-headline-sm text-primary">{summary.memberCount}/{summary.maxMembers}</span>
                    </div>
                    <div>
                      <span className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">CONTRIBUTION</span>
                      <span className="font-headline-sm text-headline-sm text-primary">{fromStroops(summary.contributionAmount).toFixed(2)} USDC</span>
                    </div>
                    <div>
                      <span className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">CLAIMS FILED</span>
                      <span className="font-headline-sm text-headline-sm text-primary">{summary.claimCount}</span>
                    </div>
                    <div>
                      <span className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">CREATOR</span>
                      <span className="font-mono-data text-mono-data">{shortenAddress(summary.creator)}</span>
                    </div>
                    <div>
                      <span className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">STATUS</span>
                      <span className="font-headline-sm text-headline-sm text-secondary">{summary.status}</span>
                    </div>
                  </div>
                  <div className="mt-lg pt-lg border-t border-outline-variant/20">
                    <span className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">POOL ADDRESS</span>
                    <span className="font-mono-data text-mono-data text-on-surface break-all">{poolAddress}</span>
                  </div>
                </section>
              )}

              {tab === "members" && (
                <section className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant/30 shadow-sm">
                  <h2 className="font-headline-md text-headline-md text-primary mb-lg">
                    Members ({members.length})
                  </h2>
                  {members.length === 0 ? (
                    <p className="text-on-surface-variant">No members yet.</p>
                  ) : (
                    <div className="space-y-sm">
                      {members.map((m, i) => (
                        <div key={m} className="flex items-center justify-between p-md bg-background rounded-lg border border-outline-variant/10">
                          <div className="flex items-center gap-sm">
                            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm">
                              {i + 1}
                            </div>
                            <span className="font-mono-data text-mono-data">{shortenAddress(m, 8)}</span>
                          </div>
                          {m === summary?.creator && (
                            <span className="font-label-caps text-label-caps text-secondary">CREATOR</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {tab === "claims" && (
                <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
                  <div className="p-xl border-b border-outline-variant/20 flex justify-between items-center">
                    <h2 className="font-headline-md text-headline-md text-primary">Claims ({claims.length})</h2>
                    {userRole && (
                      <Link
                        href={`/claims/new?pool=${poolAddress}`}
                        className="bg-primary text-on-primary px-lg py-sm rounded-lg font-bold hover:opacity-90 transition-all flex items-center gap-xs"
                      >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        Submit Claim
                      </Link>
                    )}
                  </div>
                  {claims.length === 0 ? (
                    <div className="p-xl text-center text-on-surface-variant">No claims yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-background">
                            <th className="px-xl py-md font-label-caps text-label-caps text-on-surface-variant">ID</th>
                            <th className="px-xl py-md font-label-caps text-label-caps text-on-surface-variant">CLAIMANT</th>
                            <th className="px-xl py-md font-label-caps text-label-caps text-on-surface-variant">AMOUNT</th>
                            <th className="px-xl py-md font-label-caps text-label-caps text-on-surface-variant">STATUS</th>
                            <th className="px-xl py-md font-label-caps text-label-caps text-on-surface-variant">VOTES</th>
                            <th className="px-xl py-md font-label-caps text-label-caps text-on-surface-variant">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {claims.map((c) => (
                            <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                              <td className="px-xl py-md font-mono-data">#{c.id}</td>
                              <td className="px-xl py-md font-mono-data">{shortenAddress(c.claimant)}</td>
                              <td className="px-xl py-md font-bold">{fromStroops(c.amount).toFixed(2)} USDC</td>
                              <td className="px-xl py-md">
                                <div className="flex items-center gap-xs">
                                  <span className={`w-2 h-2 rounded-full ${claimStatusDot(c.status)}`} />
                                  <span className="font-bold text-sm">{claimStatusText(c.status)}</span>
                                </div>
                              </td>
                              <td className="px-xl py-md font-mono-data">
                                <span className="text-secondary">{c.votesFor}</span>
                                {" / "}
                                <span className="text-error">{c.votesAgainst}</span>
                              </td>
                              <td className="px-xl py-md">
                                {c.status === "PendingReview" && userRole ? (
                                  <Link
                                    href={`/claim-voting?pool=${poolAddress}&claim=${c.id}`}
                                    className="text-primary font-bold hover:underline"
                                  >
                                    Vote
                                  </Link>
                                ) : (
                                  <span className="text-outline">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Right Column */}
            <aside className="col-span-12 lg:col-span-4 flex flex-col gap-xl">
              {/* Join Pool Card */}
              <section className="bg-primary text-on-primary p-xl rounded-xl shadow-sm">
                <h3 className="font-headline-md text-headline-md mb-md">Join This Pool</h3>
                <p className="font-body-sm text-body-sm mb-lg opacity-80">
                  Contribute {summary ? `${fromStroops(summary.contributionAmount).toFixed(2)} USDC` : "—"} to become a member and gain voting rights on claims.
                </p>
                {userRole ? (
                  <div className="bg-secondary-fixed text-on-secondary-fixed p-md rounded-lg text-center font-bold">
                    You are a {userRole}
                  </div>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={joining || summary?.status !== "Active"}
                    className="w-full bg-secondary-fixed text-on-secondary-fixed py-md rounded-lg font-bold hover:brightness-105 transition-all disabled:opacity-50"
                  >
                    {joining ? "Joining..." : isConnected ? "Join Pool" : "Connect Wallet"}
                  </button>
                )}
                {status && (
                  <p className="mt-md text-sm opacity-90">{status}</p>
                )}
              </section>

              {/* Pool Stats */}
              {summary && (
                <section className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant/30 shadow-sm">
                  <h3 className="font-headline-sm text-headline-sm text-primary mb-lg">Pool Health</h3>
                  <div className="flex flex-col gap-lg">
                    <div>
                      <div className="flex justify-between items-center mb-xs">
                        <span className="text-body-sm text-on-surface-variant">Capacity</span>
                        <span className="text-body-sm font-bold text-secondary">
                          {Math.round((summary.memberCount / summary.maxMembers) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className="bg-secondary h-full rounded-full"
                          style={{ width: `${(summary.memberCount / summary.maxMembers) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-xs">
                        <span className="text-body-sm text-on-surface-variant">Pending Claims</span>
                        <span className="text-body-sm font-bold text-error">
                          {claims.filter((c) => c.status === "PendingReview").length}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Members Quick List */}
              <section className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant/30 shadow-sm">
                <h3 className="font-headline-sm text-headline-sm text-primary mb-md">Members</h3>
                <div className="space-y-md">
                  {members.slice(0, 5).map((m) => (
                    <div key={m} className="flex items-center justify-between">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-sm">person</span>
                        </div>
                        <span className="font-mono-data">{shortenAddress(m)}</span>
                      </div>
                    </div>
                  ))}
                  {members.length > 5 && (
                    <button
                      onClick={() => setTab("members")}
                      className="text-primary font-bold text-sm hover:underline"
                    >
                      View all {members.length} members
                    </button>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </main>
        <Footer />
      </>
    </FigmaPage>
  );
}
