import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { FigmaPage } from "../components/FigmaPage";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { useWallet } from "../context/WalletContext";
import { pool, type Claim as ClaimType, type PoolSummary } from "../lib/contracts";
import { fromStroops, shortenAddress } from "../lib/contracts/config";

export default function ClaimVotingPage() {
  const router = useRouter();
  const poolAddress = (router.query.pool as string) ?? "";
  const claimId = Number(router.query.claim ?? 0);
  const { address, isConnected, connect } = useWallet();

  const [claim, setClaim] = useState<ClaimType | null>(null);
  const [summary, setSummary] = useState<PoolSummary | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!poolAddress) return;
    async function load() {
      setLoading(true);
      try {
        const [c, s] = await Promise.all([
          pool.getClaim(poolAddress, claimId),
          pool.getPoolSummary(poolAddress),
        ]);
        setClaim(c);
        setSummary(s);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Failed to load claim");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [poolAddress, claimId]);

  useEffect(() => {
    if (!poolAddress || !address) return;
    pool.hasVoted(poolAddress, claimId, address).then(setAlreadyVoted);
  }, [poolAddress, claimId, address]);

  async function handleVote(approve: boolean) {
    const connectedAddress = address || (await connect());
    if (!connectedAddress) {
      setStatus("Connect your wallet to vote.");
      return;
    }

    setVoting(true);
    setStatus(approve ? "Submitting approval vote..." : "Submitting rejection vote...");
    try {
      await pool.voteOnClaim(poolAddress, connectedAddress, claimId, approve);
      setStatus(`Vote ${approve ? "approved" : "rejected"} successfully!`);
      setAlreadyVoted(true);
      // Refresh claim data
      const updatedClaim = await pool.getClaim(poolAddress, claimId);
      setClaim(updatedClaim);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to submit vote.");
    } finally {
      setVoting(false);
    }
  }

  const totalVotes = (claim?.votesFor ?? 0) + (claim?.votesAgainst ?? 0);
  const signerCount = summary?.signerCount ?? 0;
  const quorumNeeded = Math.ceil(signerCount * 0.6);
  const quorumPct = signerCount > 0 ? Math.round((totalVotes / signerCount) * 100) : 0;
  const approvalPct = totalVotes > 0 ? Math.round(((claim?.votesFor ?? 0) / totalVotes) * 100) : 0;
  const rejectPct = totalVotes > 0 ? 100 - approvalPct : 0;
  const quorumReached = totalVotes >= quorumNeeded && quorumNeeded > 0;

  const deadlineDate = claim ? new Date(claim.deadline * 1000) : null;
  const now = Date.now();
  const timeLeft = deadlineDate ? Math.max(0, deadlineDate.getTime() - now) : 0;
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  if (loading) {
    return (
      <FigmaPage title="Claim Voting">
        <>
          <Header />
          <main className="pt-32 pb-xl max-w-[1280px] mx-auto px-container-padding flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="mt-md text-on-surface-variant">Loading claim data...</p>
          </main>
          <Footer />
        </>
      </FigmaPage>
    );
  }

  return (
    <FigmaPage title="Claim Voting">
      <>
        <Header />
        <main className="pt-24 pb-xl max-w-[1280px] mx-auto px-container-padding">
          {/* Header */}
          <div className="mb-xl flex flex-col md:flex-row md:items-end justify-between gap-md">
            <div>
              <div className="flex items-center gap-sm mb-xs">
                <span className="bg-tertiary-fixed text-on-tertiary-fixed px-sm py-[2px] rounded-full text-label-caps font-label-caps">
                  {claim?.status === "PendingReview" ? "VOTING ACTIVE" : claim?.status?.toUpperCase()}
                </span>
                <span className="text-on-surface-variant font-mono-data text-mono-data">
                  #CLAIM-{claimId}
                </span>
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface">
                {claim?.description?.slice(0, 60) || "Claim Review"}
              </h1>
              <p className="text-on-surface-variant mt-xs">
                Review and vote on this claim submitted to the pool.
              </p>
            </div>
            <div className="flex flex-col items-end">
              {timeLeft > 0 ? (
                <>
                  <div className="flex items-center gap-sm text-error mb-base">
                    <span className="material-symbols-outlined text-[18px]">timer</span>
                    <span className="font-mono-data text-mono-data">
                      Ends in {hoursLeft}h {minutesLeft}m
                    </span>
                  </div>
                  <div className="text-on-surface-variant font-body-sm text-body-sm">
                    Deadline: {deadlineDate?.toUTCString()}
                  </div>
                </>
              ) : (
                <span className="font-mono-data text-mono-data text-outline">Voting ended</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-xl">
            {/* Claim Details */}
            <div className="col-span-12 lg:col-span-8 space-y-xl">
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-xl shadow-sm">
                <h3 className="font-headline-md text-headline-md mb-lg">Claim Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                  <div className="space-y-md">
                    <div>
                      <div className="text-on-surface-variant font-label-caps text-label-caps mb-xs">CLAIMANT ADDRESS</div>
                      <div className="font-mono-data text-mono-data bg-surface-container-low p-sm rounded-lg border border-outline-variant/20 break-all">
                        {claim?.claimant ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-on-surface-variant font-label-caps text-label-caps mb-xs">CLAIM AMOUNT</div>
                      <div className="font-headline-sm text-headline-sm text-on-surface">
                        {claim ? `${fromStroops(claim.amount).toFixed(2)} USDC` : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-md">
                    <div>
                      <div className="text-on-surface-variant font-label-caps text-label-caps mb-xs">POOL</div>
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-secondary-container text-[16px]">shield</span>
                        </div>
                        <span className="font-body-lg text-body-lg">{summary?.name ?? shortenAddress(poolAddress)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-on-surface-variant font-label-caps text-label-caps mb-xs">SUBMITTED</div>
                      <div className="font-body-lg text-body-lg">
                        {claim ? new Date(claim.submittedAt * 1000).toUTCString() : "—"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-xl pt-xl border-t border-outline-variant/10">
                  <h4 className="font-headline-sm text-headline-sm mb-md">Description</h4>
                  <p className="text-on-surface-variant leading-relaxed">
                    {claim?.description || "No description provided."}
                  </p>
                </div>
                {claim?.evidenceCid && (
                  <div className="mt-lg pt-lg border-t border-outline-variant/10">
                    <h4 className="font-headline-sm text-headline-sm mb-md">Evidence</h4>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${claim.evidenceCid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-bold hover:underline flex items-center gap-xs"
                    >
                      <span className="material-symbols-outlined text-sm">link</span>
                      View on IPFS ({claim.evidenceCid.slice(0, 16)}...)
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Voting Panel */}
            <div className="col-span-12 lg:col-span-4 space-y-xl">
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-xl shadow-sm sticky top-24">
                <h3 className="font-headline-md text-headline-md mb-lg">Voting Progress</h3>
                <div className="space-y-xl">
                  {/* Quorum */}
                  <div>
                    <div className="flex justify-between items-end mb-sm">
                      <span className="text-label-caps text-on-surface-variant">QUORUM STATUS</span>
                      <span className="font-mono-data text-mono-data">{quorumPct}% / 60% Required</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(quorumPct, 100)}%` }} />
                    </div>
                    <div className="flex items-center gap-xs mt-sm">
                      {quorumReached ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          <span className="text-body-sm text-secondary">Quorum Reached</span>
                        </>
                      ) : (
                        <span className="text-body-sm text-on-surface-variant">
                          {totalVotes}/{quorumNeeded} reviewer votes needed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vote Distribution */}
                  <div>
                    <div className="flex justify-between mb-sm">
                      <span className="text-label-caps text-on-surface-variant">VOTE DISTRIBUTION</span>
                      <span className="font-mono-data text-mono-data">{totalVotes} Total</span>
                    </div>
                    {totalVotes > 0 ? (
                      <div className="flex h-6 w-full rounded-lg overflow-hidden border border-outline-variant/10">
                        <div className="bg-secondary-fixed-dim h-full flex items-center justify-center" style={{ width: `${approvalPct}%` }}>
                          {approvalPct > 15 && <span className="text-[10px] font-bold text-on-secondary-fixed-variant">{approvalPct}% YES</span>}
                        </div>
                        <div className="bg-tertiary-fixed-dim h-full flex items-center justify-center" style={{ width: `${rejectPct}%` }}>
                          {rejectPct > 15 && <span className="text-[10px] font-bold text-on-tertiary-fixed-variant">{rejectPct}% NO</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="h-6 w-full rounded-lg bg-surface-container border border-outline-variant/10 flex items-center justify-center">
                        <span className="text-[10px] text-on-surface-variant">No votes yet</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 mt-md gap-sm">
                      <div className="flex items-center gap-xs">
                        <div className="w-3 h-3 rounded-full bg-secondary-fixed-dim" />
                        <span className="text-body-sm">Approve ({claim?.votesFor ?? 0})</span>
                      </div>
                      <div className="flex items-center gap-xs">
                        <div className="w-3 h-3 rounded-full bg-tertiary-fixed-dim" />
                        <span className="text-body-sm">Reject ({claim?.votesAgainst ?? 0})</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-xl border-t border-outline-variant/10 space-y-md">
                    {alreadyVoted ? (
                      <div className="p-md bg-secondary-container rounded-lg text-center">
                        <span className="font-bold text-on-secondary-container">You have already voted on this claim.</span>
                      </div>
                    ) : claim?.status === "PendingReview" ? (
                      <>
                        <button
                          onClick={() => handleVote(true)}
                          disabled={voting}
                          className="w-full bg-primary text-white py-lg rounded-xl font-bold flex items-center justify-center gap-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined">check_circle</span>
                          {voting ? "Voting..." : "VOTE TO APPROVE"}
                        </button>
                        <button
                          onClick={() => handleVote(false)}
                          disabled={voting}
                          className="w-full bg-surface-container-lowest text-on-surface border border-outline-variant py-lg rounded-xl font-bold flex items-center justify-center gap-md hover:bg-surface-container-low active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined">cancel</span>
                          {voting ? "Voting..." : "VOTE TO REJECT"}
                        </button>
                        <p className="text-[11px] text-center text-on-surface-variant italic">
                          Only selected reviewers ({signerCount} this cycle) can vote.
                        </p>
                      </>
                    ) : (
                      <div className="p-md bg-surface-container-low rounded-lg text-center">
                        <span className="font-bold text-on-surface-variant">
                          Voting is {claim?.status === "Approved" ? "closed (Approved)" : claim?.status === "Rejected" ? "closed (Rejected)" : "no longer active"}.
                        </span>
                      </div>
                    )}

                    {status && (
                      <p className={`text-body-sm text-center ${status.includes("!") ? "text-secondary" : "text-error"}`}>
                        {status}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    </FigmaPage>
  );
}
