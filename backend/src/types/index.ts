// ── Shared backend types ────────────────────────────────────────

// ── Pool / Protocol ──────────────────────────────────────────────

export type PoolPhase = 'Formation' | 'Active' | 'Closed';

export type ClaimStatus = 'PendingReview' | 'Approved' | 'Rejected' | 'Expired' | 'PaidOut';

/**
 * On-chain pool summary (mirrors PoolSummary struct in pool contract).
 */
export interface OnChainPoolSummary {
  name: string;
  description: string;
  creator: string;
  phase: PoolPhase;
  balance: bigint;
  memberCount: number;
  minMembers: number;
  maxMembers: number;
  fixedContribution: bigint;
  claimCount: number;
  currentCycle: number;
  signerCount: number;
  createdAt: number;
  activatedAt: number;
  expiresAt: number;
  paused: boolean;
}

/**
 * On-chain claim data (mirrors Claim struct in pool contract).
 */
export interface OnChainClaim {
  id: number;
  claimant: string;
  amount: bigint;
  description: string;
  evidenceCid: string;
  status: ClaimStatus;
  votesFor: number;
  votesAgainst: number;
  submittedAt: number;
  deadline: number;
  updatedAt: number;
  executed: boolean;
}

/**
 * Factory pool record.
 */
export interface FactoryPoolRecord {
  address: string;
  creator: string;
  metadataCid: string;
  createdAt: number;
  paused: boolean;
}

/**
 * Protocol-wide aggregate stats (computed from all pools via factory).
 */
export interface ProtocolStats {
  totalPools: number;
  activePools: number;
  formationPools: number;
  totalBalance: bigint;
  totalMembers: number;
  totalClaims: number;
}

// ── Keeper ───────────────────────────────────────────────────────

export type KeeperTaskType =
  | 'advance_cycle'
  | 'rotate_signers'
  | 'reject_expired_claim';

export interface KeeperLog {
  id: string;
  type: KeeperTaskType;
  poolAddress: string;
  detail: string;
  success: boolean;
  txHash?: string;
  error?: string;
  executedAt: string;
}

// ── Claim Verification ───────────────────────────────────────────

export interface VerificationReport {
  claimId: number;
  poolAddress: string;
  isValid: boolean;
  checks: VerificationCheck[];
  overallScore: number; // 0-100
  timestamp: string;
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  detail: string;
}

// ── Fraud Detection ──────────────────────────────────────────────

export interface FraudReport {
  claimId: number;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  flags: FraudFlag[];
  recommendation: 'auto-proceed' | 'manual-review' | 'reject';
  timestamp: string;
}

export interface FraudFlag {
  rule: string;
  triggered: boolean;
  score: number;
  detail: string;
}

// ── Notifications ────────────────────────────────────────────────

export interface Notification {
  id: string;
  recipientAddress: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'contribution_reminder'
  | 'claim_submitted'
  | 'claim_status_update'
  | 'vote_request'
  | 'payout_confirmation'
  | 'fraud_alert'
  | 'pool_activated'
  | 'pool_joined'
  | 'signer_selected'
  | 'general';

// ── IPFS ─────────────────────────────────────────────────────────

export interface IpfsUploadResult {
  cid: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pinataUrl: string;
  gatewayUrl: string;
  timestamp: string;
}

// ── API ──────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
