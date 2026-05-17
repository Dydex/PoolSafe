/**
 * Pool contract client — interacts with individual pool instances.
 */
import { xdr } from "@stellar/stellar-sdk";
import {
  readContract,
  callContract,
  addressToScVal,
  stringToScVal,
  i128ToScVal,
  u64ToScVal,
  u32ToScVal,
  scValToNative,
} from "./soroban";
import type { PoolSummary, Claim, ClaimStatus, Role } from "./types";
import { PoolPhase } from "./types";

// ─── Read functions ──────────────────────────────────────────────

export async function getPoolSummary(
  poolAddress: string
): Promise<PoolSummary | null> {
  try {
    const result = await readContract({
      contractId: poolAddress,
      method: "get_summary",
    });
    return parsePoolSummary(scValToNative(result));
  } catch {
    return null;
  }
}

export async function getMembers(poolAddress: string): Promise<string[]> {
  try {
    const result = await readContract({
      contractId: poolAddress,
      method: "get_members",
    });
    return scValToNative(result) as string[];
  } catch {
    return [];
  }
}

export async function getMemberRole(
  poolAddress: string,
  member: string
): Promise<Role | null> {
  if (!member) return null;
  try {
    const result = await readContract({
      contractId: poolAddress,
      method: "get_role",
      args: [addressToScVal(member)],
    });
    const raw = scValToNative(result);
    return parseRole(raw);
  } catch {
    return null;
  }
}

export async function getClaim(
  poolAddress: string,
  claimId: number
): Promise<Claim | null> {
  try {
    const result = await readContract({
      contractId: poolAddress,
      method: "get_claim",
      args: [u64ToScVal(claimId)],
    });
    return parseClaim(scValToNative(result));
  } catch {
    return null;
  }
}

export async function getAllClaims(poolAddress: string): Promise<Claim[]> {
  try {
    const result = await readContract({
      contractId: poolAddress,
      method: "get_all_claims",
    });
    const raw = scValToNative(result) as any[];
    return raw.map(parseClaim);
  } catch {
    return [];
  }
}

export async function getPendingClaims(poolAddress: string): Promise<Claim[]> {
  try {
    const result = await readContract({
      contractId: poolAddress,
      method: "get_pending_claims",
    });
    const raw = scValToNative(result) as any[];
    return raw.map(parseClaim);
  } catch {
    return [];
  }
}

export async function hasVoted(
  poolAddress: string,
  claimId: number,
  voter: string
): Promise<boolean> {
  try {
    const result = await readContract({
      contractId: poolAddress,
      method: "has_voted",
      args: [u64ToScVal(claimId), addressToScVal(voter)],
    });
    return scValToNative(result) as boolean;
  } catch {
    return false;
  }
}

export async function getSigners(poolAddress: string): Promise<string[]> {
  try {
    const result = await readContract({
      contractId: poolAddress,
      method: "get_signers",
    });
    return scValToNative(result) as string[];
  } catch {
    return [];
  }
}

export async function isSigner(
  poolAddress: string,
  addr: string
): Promise<boolean> {
  try {
    const result = await readContract({
      contractId: poolAddress,
      method: "is_signer",
      args: [addressToScVal(addr)],
    });
    return scValToNative(result) as boolean;
  } catch {
    return false;
  }
}

export async function isMemberActive(
  poolAddress: string,
  addr: string
): Promise<boolean> {
  try {
    const result = await readContract({
      contractId: poolAddress,
      method: "is_member_active",
      args: [addressToScVal(addr)],
    });
    return scValToNative(result) as boolean;
  } catch {
    return false;
  }
}

export async function hasPaidContribution(
  poolAddress: string,
  member: string,
  cycleId: number
): Promise<boolean> {
  try {
    const result = await readContract({
      contractId: poolAddress,
      method: "has_paid_contribution",
      args: [addressToScVal(member), u32ToScVal(cycleId)],
    });
    return scValToNative(result) as boolean;
  } catch {
    return false;
  }
}

// ─── Write functions ─────────────────────────────────────────────

export async function payContribution(
  poolAddress: string,
  memberAddress: string,
  cycleId: number
): Promise<string> {
  const txHash = await callContract({
    contractId: poolAddress,
    method: "pay_contribution",
    args: [addressToScVal(memberAddress), u32ToScVal(cycleId)],
    sourceAddress: memberAddress,
    submit: true,
  });
  return txHash as string;
}

export async function advanceCycle(
  poolAddress: string,
  callerAddress: string
): Promise<string> {
  const txHash = await callContract({
    contractId: poolAddress,
    method: "advance_cycle",
    args: [],
    sourceAddress: callerAddress,
    submit: true,
  });
  return txHash as string;
}

export async function rotateSigners(
  poolAddress: string,
  callerAddress: string
): Promise<string> {
  const txHash = await callContract({
    contractId: poolAddress,
    method: "rotate_signers",
    args: [],
    sourceAddress: callerAddress,
    submit: true,
  });
  return txHash as string;
}

export async function joinPool(
  poolAddress: string,
  memberAddress: string
): Promise<string> {
  const txHash = await callContract({
    contractId: poolAddress,
    method: "join_pool",
    args: [addressToScVal(memberAddress)],
    sourceAddress: memberAddress,
    submit: true,
  });
  return txHash as string;
}

export async function submitClaim(
  poolAddress: string,
  claimantAddress: string,
  params: {
    amount: bigint;
    description: string;
    evidenceCid: string;
    reviewPeriodSeconds: number;
  }
): Promise<string> {
  const txHash = await callContract({
    contractId: poolAddress,
    method: "submit_claim",
    args: [
      addressToScVal(claimantAddress),
      i128ToScVal(params.amount),
      stringToScVal(params.description),
      stringToScVal(params.evidenceCid),
      u64ToScVal(params.reviewPeriodSeconds),
    ],
    sourceAddress: claimantAddress,
    submit: true,
  });
  return txHash as string;
}

export async function voteOnClaim(
  poolAddress: string,
  voterAddress: string,
  claimId: number,
  approve: boolean
): Promise<string> {
  const txHash = await callContract({
    contractId: poolAddress,
    method: "vote_on_claim",
    args: [
      addressToScVal(voterAddress),
      u64ToScVal(claimId),
      voteChoiceToScVal(approve),
    ],
    sourceAddress: voterAddress,
    submit: true,
  });
  return txHash as string;
}

export async function resolveClaim(
  poolAddress: string,
  callerAddress: string,
  claimId: number
): Promise<string> {
  const txHash = await callContract({
    contractId: poolAddress,
    method: "resolve_claim",
    args: [u64ToScVal(claimId)],
    sourceAddress: callerAddress,
    submit: true,
  });
  return txHash as string;
}

export async function rejectClaim(
  poolAddress: string,
  callerAddress: string,
  claimId: number
): Promise<string> {
  const txHash = await callContract({
    contractId: poolAddress,
    method: "reject_claim",
    args: [addressToScVal(callerAddress), u64ToScVal(claimId)],
    sourceAddress: callerAddress,
    submit: true,
  });
  return txHash as string;
}

// ─── Parsing helpers ─────────────────────────────────────────────

function parseClaim(raw: any): Claim {
  return {
    id: Number(raw.id ?? 0),
    claimant: String(raw.claimant ?? ""),
    amount: BigInt(raw.amount ?? 0),
    description: String(raw.description ?? ""),
    evidenceCid: String(raw.evidence_cid ?? ""),
    status: parseClaimStatus(raw.status),
    votesFor: Number(raw.votes_for ?? 0),
    votesAgainst: Number(raw.votes_against ?? 0),
    submittedAt: Number(raw.submitted_at ?? 0),
    deadline: Number(raw.deadline ?? 0),
    updatedAt: Number(raw.updated_at ?? 0),
    executed: Boolean(raw.executed ?? false),
  };
}

function parseClaimStatus(raw: any): ClaimStatus {
  if (typeof raw === "string") return raw as ClaimStatus;
  // Soroban enum variants come as object keys
  const key = typeof raw === "object" ? Object.keys(raw)[0] : String(raw);
  const statusMap: Record<string, ClaimStatus> = {
    PendingReview: "PendingReview" as ClaimStatus,
    Approved: "Approved" as ClaimStatus,
    Rejected: "Rejected" as ClaimStatus,
    Expired: "Expired" as ClaimStatus,
    PaidOut: "PaidOut" as ClaimStatus,
  };
  return statusMap[key] ?? ("PendingReview" as ClaimStatus);
}

function parsePoolSummary(raw: any): PoolSummary {
  const phase = parsePoolPhase(raw.phase);
  return {
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    creator: String(raw.creator ?? ""),
    phase,
    status: phase,
    totalFunds: BigInt(raw.balance ?? 0),
    memberCount: Number(raw.member_count ?? 0),
    minMembers: Number(raw.min_members ?? 15),
    maxMembers: Number(raw.max_members ?? 30),
    contributionAmount: BigInt(raw.fixed_contribution ?? 0),
    claimCount: Number(raw.claim_count ?? 0),
    currentCycle: Number(raw.current_cycle ?? 0),
    signerCount: Number(raw.signer_count ?? 0),
    createdAt: Number(raw.created_at ?? 0),
    activatedAt: Number(raw.activated_at ?? 0),
    expiresAt: Number(raw.expires_at ?? 0),
    paused: Boolean(raw.paused ?? false),
  };
}

const VALID_ROLES: Role[] = ["Creator", "Member", "Manager"];

function parseRole(raw: any): Role | null {
  let candidate: string;
  // ScVec([ScSymbol("Variant")]) → ["Variant"]
  if (Array.isArray(raw) && raw.length > 0) candidate = String(raw[0]);
  // ScMap({ Variant: null }) → { Variant: null }
  else if (typeof raw === "object" && raw !== null) candidate = Object.keys(raw)[0];
  // ScSymbol → "Variant"
  else candidate = String(raw);
  return (VALID_ROLES as string[]).includes(candidate) ? (candidate as Role) : null;
}

function parsePoolPhase(raw: any): PoolPhase {
  if (typeof raw === "string") {
    return (raw as PoolPhase) in PoolPhase ? (raw as PoolPhase) : PoolPhase.Formation;
  }
  const key = typeof raw === "object" && raw !== null
    ? (Array.isArray(raw) ? String(raw[0]) : Object.keys(raw)[0])
    : String(raw);
  return (PoolPhase as any)[key] ?? PoolPhase.Formation;
}

/** Encode VoteChoice enum variant as Soroban contracttype ScVal */
function voteChoiceToScVal(approve: boolean): xdr.ScVal {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(approve ? "Approve" : "Reject")]);
}
