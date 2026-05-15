// ── Shared backend types ────────────────────────────────────────

/**
 * Claim verification report returned by the claim-verification service.
 */
export interface VerificationReport {
  claimId: number;
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

/**
 * Fraud detection result from the fraud-detection service.
 */
export interface FraudReport {
  claimId: number;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  flags: FraudFlag[];
  recommendation: 'auto-proceed' | 'manual-review' | 'governance-vote';
  timestamp: string;
}

export interface FraudFlag {
  rule: string;
  triggered: boolean;
  score: number;
  detail: string;
}

/**
 * Notification stored in SQLite.
 */
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
  | 'smart_account_execution'
  | 'pool_joined'
  | 'general';

/**
 * IPFS upload result.
 */
export interface IpfsUploadResult {
  cid: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pinataUrl: string;
  gatewayUrl: string;
  timestamp: string;
}

/**
 * Keeper execution log entry.
 */
export interface KeeperLog {
  id: string;
  type: 'recurring_payment' | 'scheduled_transfer';
  contractEntryId: number;
  success: boolean;
  txHash?: string;
  error?: string;
  executedAt: string;
}

/**
 * On-chain claim data (mirror of Soroban contract state).
 */
export interface OnChainClaim {
  id: number;
  claimant: string;
  amount: bigint;
  descriptionHash: string;
  evidenceIpfs: string;
  status: ClaimStatus;
  submittedAt: number;
  updatedAt: number;
}

export type ClaimStatus =
  | 'PendingReview'
  | 'Approved'
  | 'Submitted'
  | 'UnderReview'
  | 'ApprovedByGovernance'
  | 'Rejected'
  | 'Resolved'
  | 'PaidOut';

export interface ProtocolPoolTotals {
  totalPaidClaimAmount: bigint;
  totalBalanceAllPools: bigint;
  totalApprovedClaimAmount: bigint;
  activePoolCount: number;
  totalClaimsSubmitted: number;
}

/**
 * On-chain pool info.
 */
export interface OnChainPoolInfo {
  totalDeposits: bigint;
  memberCount: number;
  tokenAddress: string;
}

/**
 * Recurring payment from Smart Account contract.
 */
export interface OnChainRecurringPayment {
  id: number;
  owner: string;
  recipient: string;
  token: string;
  amount: bigint;
  interval: 'Weekly' | 'Monthly';
  nextExecution: number;
  totalExecuted: number;
  maxExecutions: number;
  isActive: boolean;
}

/**
 * Scheduled transfer from Smart Account contract.
 */
export interface OnChainScheduledTransfer {
  id: number;
  owner: string;
  recipient: string;
  token: string;
  amount: bigint;
  executeAfter: number;
  executed: boolean;
}

/**
 * API error response.
 */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

/**
 * API success response wrapper.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
