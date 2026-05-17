import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { FigmaPage } from "../components/FigmaPage";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { useWallet } from "../context/WalletContext";
import { pool, smartAccount, type PoolSummary, type Claim as ClaimType } from "../lib/contracts";
import { PoolPhase } from "../lib/contracts/types";
import { fromStroops, shortenAddress, CONTRACTS } from "../lib/contracts/config";
import { callContract, addressToScVal, i128ToScVal, u32ToScVal } from "../lib/contracts/soroban";

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
  const [paying, setPaying] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMode, setPayMode] = useState<"once" | "auto">("once");
  const [recurringId, setRecurringId] = useState<bigint | null>(null);
  const [approvingAllowance, setApprovingAllowance] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [isMemberSigner, setIsMemberSigner] = useState(false);
  const [isMemberActiveState, setIsMemberActiveState] = useState(false);
  const [signers, setSigners] = useState<string[]>([]);
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
    if (!poolAddress || !address) { setRoleLoaded(true); return; }
    setRoleLoaded(false);
    Promise.all([
      pool.getMemberRole(poolAddress, address),
      pool.isSigner(poolAddress, address),
      pool.isMemberActive(poolAddress, address),
    ]).then(([role, signer, active]) => {
      setUserRole(role);
      setIsMemberSigner(signer);
      setIsMemberActiveState(active);
      setRoleLoaded(true);
    });
  }, [poolAddress, address]);

  useEffect(() => {
    if (!poolAddress) return;
    pool.getSigners(poolAddress).then(setSigners);
  }, [poolAddress]);

  async function handleJoin() {
    if (!isConnected) { await connect(); return; }
    setJoining(true);
    setStatus("");
    try {
      await pool.joinPool(poolAddress, address);
      setStatus("Successfully joined the pool!");
      const [s, m] = await Promise.all([pool.getPoolSummary(poolAddress), pool.getMembers(poolAddress)]);
      setSummary(s);
      setMembers(m);
      setUserRole("Member");
      setIsMemberActiveState(true);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to join pool");
    } finally {
      setJoining(false);
    }
  }

  async function handlePayOnce() {
    if (!isConnected) { await connect(); return; }
    setPaying(true);
    setStatus("");
    setShowPayModal(false);
    try {
      const cycle = summary?.currentCycle ?? 0;
      await pool.payContribution(poolAddress, address, cycle);
      setStatus(`Contribution paid for cycle ${cycle}!`);
      const s = await pool.getPoolSummary(poolAddress);
      setSummary(s);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to pay contribution");
    } finally {
      setPaying(false);
    }
  }

  async function handleSetupAutoPay() {
    if (!isConnected) { await connect(); return; }
    setApprovingAllowance(true);
    setShowPayModal(false);
    setStatus("Step 1/2: Approving smart account allowance...");
    try {
      const amount = summary?.contributionAmount ?? BigInt(0);
      const maxAllowance = amount * BigInt(120); // 10 years of monthly payments
      const expirationLedger = 999999999; // far future
      await callContract({
        contractId: CONTRACTS.usdc,
        method: "approve",
        args: [
          addressToScVal(address),
          addressToScVal(CONTRACTS.smartAccount),
          i128ToScVal(maxAllowance),
          u32ToScVal(expirationLedger),
        ],
        sourceAddress: address,
        submit: true,
      });
      setStatus("Step 2/2: Setting up recurring payment...");
      const id = await smartAccount.createRecurring(
        address,
        poolAddress,
        CONTRACTS.usdc,
        amount,
        "Monthly",
        BigInt(0)
      );
      setRecurringId(id);
      setStatus(`Auto-pay enabled! Recurring payment #${id} created. Contributions will be paid automatically each month.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to set up auto-pay");
    } finally {
      setApprovingAllowance(false);
    }
  }

  function handlePayContribution() {
    if (!isConnected) { connect(); return; }
    setShowPayModal(true);
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
                <span className={`px-sm py-xs rounded-full font-label-caps text-label-caps ${
                  summary?.phase === PoolPhase.Active
                    ? "bg-secondary-container text-on-secondary-container"
                    : summary?.phase === PoolPhase.Formation
                    ? "bg-tertiary-container text-on-tertiary-container"
                    : "bg-surface-container text-on-surface-variant"
                }`}>
                  {summary?.phase?.toUpperCase() ?? "POOL"}
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
                <>
                {userRole && (
                  <div className="flex flex-wrap gap-md mb-xl">
                    <Link
                      href={`/claims/new?pool=${poolAddress}`}
                      className="flex items-center gap-sm bg-primary text-on-primary px-lg py-sm rounded-lg font-bold hover:opacity-90 transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">add_circle</span>
                      Make a Claim
                    </Link>
                    <Link
                      href={`/claim-voting?pool=${poolAddress}`}
                      className="flex items-center gap-sm border border-primary text-primary px-lg py-sm rounded-lg font-bold hover:bg-primary/5 transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">how_to_vote</span>
                      Vote on Claims
                    </Link>
                  </div>
                )}
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
                      <span className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">PHASE</span>
                      <span className="font-headline-sm text-headline-sm text-secondary">{summary.phase}</span>
                    </div>
                    <div>
                      <span className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">CYCLE</span>
                      <span className="font-headline-sm text-headline-sm text-primary">#{summary.currentCycle}</span>
                    </div>
                    <div>
                      <span className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">REVIEWERS</span>
                      <span className="font-headline-sm text-headline-sm text-primary">{summary.signerCount}</span>
                    </div>
                  </div>
                  {summary.phase === PoolPhase.Active && summary.activatedAt > 0 && (() => {
                    const waitEnd = (summary.activatedAt + 60 * 24 * 60 * 60) * 1000;
                    const now = Date.now();
                    const waitDone = now >= waitEnd;
                    const daysLeft = waitDone ? 0 : Math.ceil((waitEnd - now) / (1000 * 60 * 60 * 24));
                    return (
                      <div className={`mt-lg p-md rounded-lg flex items-start gap-sm ${
                        waitDone ? "bg-secondary-container text-on-secondary-container" : "bg-tertiary-container text-on-tertiary-container"
                      }`}>
                        <span className="material-symbols-outlined text-[20px] mt-[2px]">
                          {waitDone ? "verified" : "hourglass_top"}
                        </span>
                        <div>
                          <p className="font-label-caps text-label-caps">
                            {waitDone ? "CLAIMS OPEN" : "WAITING PERIOD"}
                          </p>
                          <p className="font-body-sm text-body-sm opacity-80">
                            {waitDone
                              ? "60-day waiting period complete. Members can now file claims."
                              : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining before claims open.`}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="mt-lg pt-lg border-t border-outline-variant/20">
                    <span className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">POOL ADDRESS</span>
                    <span className="font-mono-data text-mono-data text-on-surface break-all">{poolAddress}</span>
                  </div>
                </section>
                </>
              )}

              {tab === "members" && (
                <section className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant/30 shadow-sm">
                  <div className="flex items-center justify-between mb-lg">
                    <h2 className="font-headline-md text-headline-md text-primary">
                      Members ({members.length}/{summary?.maxMembers ?? 30})
                    </h2>
                    {signers.length > 0 && (
                      <span className="font-label-caps text-label-caps text-secondary">
                        {signers.length} Reviewer{signers.length !== 1 ? "s" : ""} this cycle
                      </span>
                    )}
                  </div>
                  {members.length === 0 ? (
                    <p className="text-on-surface-variant">No members yet.</p>
                  ) : (
                    <div className="space-y-sm">
                      {members.map((m, i) => {
                        const isReviewer = signers.includes(m);
                        return (
                          <div key={m} className="flex items-center justify-between p-md bg-background rounded-lg border border-outline-variant/10">
                            <div className="flex items-center gap-sm">
                              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm">
                                {i + 1}
                              </div>
                              <span className="font-mono-data text-mono-data">{shortenAddress(m, 8)}</span>
                            </div>
                            <div className="flex items-center gap-xs">
                              {isReviewer && (
                                <span className="bg-secondary-container text-on-secondary-container px-sm py-[2px] rounded-full font-label-caps text-label-caps flex items-center gap-xs">
                                  <span className="material-symbols-outlined text-[12px]">manage_accounts</span>
                                  REVIEWER
                                </span>
                              )}
                              {m === summary?.creator && (
                                <span className="font-label-caps text-label-caps text-secondary">CREATOR</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
              {/* Join / Member Actions Card */}
              <section className="bg-primary text-on-primary p-xl rounded-xl shadow-sm">
                {!roleLoaded ? (
                  <div className="flex items-center gap-sm opacity-60">
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    <span className="text-sm">Checking membership...</span>
                  </div>
                ) : userRole ? (
                  <>
                    <div className="flex items-center gap-sm mb-xs">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      <h3 className="font-headline-md text-headline-md">You are a {userRole}</h3>
                    </div>
                    {isMemberSigner && (
                      <div className="flex items-center gap-xs mb-xs">
                        <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                        <span className="font-label-caps text-label-caps opacity-90">SELECTED REVIEWER</span>
                      </div>
                    )}
                    {!isMemberActiveState && (
                      <p className="text-sm bg-on-primary/20 rounded-lg px-sm py-xs mb-sm">
                        ⚠ Coverage paused — missed contribution
                      </p>
                    )}
                    <p className="font-body-sm text-body-sm mb-lg opacity-80">
                      Monthly contribution: {summary ? `${fromStroops(summary.contributionAmount).toFixed(2)} USDC` : "—"} · Cycle #{summary?.currentCycle ?? 0}
                    </p>
                    {/* Auto-pay status badge */}
                    {recurringId !== null && (
                      <div className="flex items-center gap-xs mb-sm text-sm bg-secondary/20 rounded-lg px-sm py-xs">
                        <span className="material-symbols-outlined text-[16px] text-secondary">autorenew</span>
                        <span className="text-secondary font-medium">Auto-pay active (#{recurringId.toString()})</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-sm">
                      {summary?.phase === PoolPhase.Active && (
                        <button
                          onClick={handlePayContribution}
                          disabled={paying || approvingAllowance || !isMemberActiveState}
                          className="w-full bg-on-primary/15 border border-on-primary/40 text-on-primary py-md rounded-lg font-bold hover:bg-on-primary/25 transition-all disabled:opacity-40 flex items-center justify-center gap-sm"
                        >
                          <span className="material-symbols-outlined text-[20px]">{recurringId !== null ? "autorenew" : "payments"}</span>
                          {paying || approvingAllowance ? "Processing..." : recurringId !== null ? "Auto-pay Enabled" : "Pay Monthly Contribution"}
                        </button>
                      )}

                      {/* Pay contribution modal */}
                      {showPayModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                          <div className="bg-surface-container border border-outline/20 rounded-2xl p-xl w-full max-w-sm mx-md shadow-2xl">
                            <h3 className="font-headline-sm text-headline-sm mb-xs">Monthly Contribution</h3>
                            <p className="font-body-sm text-body-sm opacity-70 mb-lg">
                              {summary ? `${fromStroops(summary.contributionAmount).toFixed(2)} USDC` : "—"} · Cycle #{summary?.currentCycle ?? 0}
                            </p>

                            <div className="flex flex-col gap-sm mb-lg">
                              <button
                                onClick={() => setPayMode("once")}
                                className={`w-full flex items-start gap-md p-md rounded-xl border transition-all ${
                                  payMode === "once"
                                    ? "border-secondary bg-secondary/10"
                                    : "border-outline/30 hover:border-outline/60"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[22px] mt-[2px] shrink-0">payments</span>
                                <div className="text-left">
                                  <p className="font-bold text-sm">Pay Once</p>
                                  <p className="text-xs opacity-60">Sign a single payment now via Freighter</p>
                                </div>
                              </button>

                              <button
                                onClick={() => setPayMode("auto")}
                                className={`w-full flex items-start gap-md p-md rounded-xl border transition-all ${
                                  payMode === "auto"
                                    ? "border-secondary bg-secondary/10"
                                    : "border-outline/30 hover:border-outline/60"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[22px] mt-[2px] shrink-0">autorenew</span>
                                <div className="text-left">
                                  <p className="font-bold text-sm">Enable Auto-pay</p>
                                  <p className="text-xs opacity-60">Approve the smart account once — contributions are paid automatically every month</p>
                                </div>
                              </button>
                            </div>

                            <div className="flex gap-sm">
                              <button
                                onClick={() => setShowPayModal(false)}
                                className="flex-1 border border-outline/30 text-on-surface py-sm rounded-lg font-medium text-sm hover:bg-outline/10 transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={payMode === "once" ? handlePayOnce : handleSetupAutoPay}
                                className="flex-1 bg-secondary text-on-secondary py-sm rounded-lg font-bold text-sm hover:brightness-110 transition-all"
                              >
                                {payMode === "once" ? "Pay Now" : "Set Up Auto-pay"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      <Link
                        href={`/claims/new?pool=${poolAddress}`}
                        className="w-full bg-on-primary text-primary py-md rounded-lg font-bold text-center hover:brightness-105 transition-all flex items-center justify-center gap-sm"
                      >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        Make a Claim
                      </Link>
                      {isMemberSigner && (
                        <Link
                          href={`/claim-voting?pool=${poolAddress}`}
                          className="w-full border border-on-primary/40 text-on-primary py-md rounded-lg font-bold text-center hover:bg-on-primary/10 transition-all flex items-center justify-center gap-sm"
                        >
                          <span className="material-symbols-outlined text-[20px]">how_to_vote</span>
                          Review Claims
                        </Link>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-headline-md text-headline-md mb-md">Join This Pool</h3>
                    <p className="font-body-sm text-body-sm mb-lg opacity-80">
                      Pay {summary ? `${fromStroops(summary.contributionAmount).toFixed(2)} USDC` : "—"} to join.
                      Monthly contributions required · 60-day waiting period before claims.
                    </p>
                    {summary?.phase === PoolPhase.Formation && (
                      <p className="text-xs opacity-70 mb-sm">
                        Pool needs {(summary.minMembers - summary.memberCount)} more member{summary.minMembers - summary.memberCount !== 1 ? "s" : ""} to activate
                        ({summary.memberCount}/{summary.minMembers} min).
                      </p>
                    )}
                    <button
                      onClick={handleJoin}
                      disabled={joining || summary?.phase === PoolPhase.Closed || summary?.paused}
                      className="w-full bg-secondary-fixed text-on-secondary-fixed py-md rounded-lg font-bold hover:brightness-105 transition-all disabled:opacity-50"
                    >
                      {joining ? "Joining..." : isConnected ? "Pay & Join Pool" : "Connect Wallet"}
                    </button>
                  </>
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
