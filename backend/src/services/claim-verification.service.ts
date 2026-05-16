import { sorobanService } from './soroban.service';
import { ipfsService } from './ipfs.service';
import { logger } from '../utils/logger';
import { VerificationReport, VerificationCheck } from '../types';

/**
 * Claim Verification Service
 * 
 * Validates insurance claims against on-chain data and IPFS evidence.
 * Returns a structured verification report with individual check results.
 */

const CTX = 'ClaimVerification';

export class ClaimVerificationService {
  /**
   * Run full verification on a claim.
   */
  async verifyClaim(poolAddress: string, claimId: number): Promise<VerificationReport> {
    logger.info(CTX, `Starting verification for claim #${claimId} in pool ${poolAddress.slice(0, 8)}`);

    const checks: VerificationCheck[] = [];

    // 1. Check claim exists on-chain
    const claim = await sorobanService.getPoolClaim(poolAddress, claimId);
    checks.push({
      name: 'claim_exists',
      passed: claim !== null,
      detail: claim ? `Claim found on-chain (status: ${claim.status})` : 'Claim not found on-chain',
    });

    if (!claim) {
      return this.buildReport(claimId, poolAddress, checks);
    }

    // 2. Verify claimant is an active pool member
    let isActive = false;
    try {
      isActive = await sorobanService.isPoolMemberActive(poolAddress, claim.claimant);
    } catch {
      isActive = false;
    }
    checks.push({
      name: 'claimant_is_active_member',
      passed: isActive,
      detail: isActive
        ? `Claimant ${claim.claimant.slice(0, 8)}... is an active pool member`
        : `Claimant ${claim.claimant.slice(0, 8)}... is NOT an active member (may have missed contribution)`,
    });

    // 3. Verify claim amount is positive
    const amountPositive = claim.amount > BigInt(0);
    checks.push({
      name: 'amount_positive',
      passed: amountPositive,
      detail: amountPositive
        ? `Claim amount: ${claim.amount.toString()} stroops`
        : 'Claim amount is zero or negative',
    });

    // 4. Verify IPFS evidence exists
    let evidenceExists = false;
    if (claim.evidenceCid && claim.evidenceCid.length > 0) {
      try {
        evidenceExists = await ipfsService.isPinned(claim.evidenceCid);
      } catch {
        evidenceExists = false;
      }
    }
    checks.push({
      name: 'evidence_on_ipfs',
      passed: evidenceExists,
      detail: evidenceExists
        ? `Evidence pinned on IPFS: ${claim.evidenceCid}`
        : `Evidence NOT found on IPFS: ${claim.evidenceCid || 'no CID provided'}`,
    });

    // 5. Verify claim is in PendingReview state
    const validStatus = claim.status === 'PendingReview';
    checks.push({
      name: 'valid_status',
      passed: validStatus,
      detail: validStatus
        ? `Claim status (${claim.status}) is eligible for review`
        : `Claim status (${claim.status}) is not eligible for review`,
    });

    // 6. Check claim deadline has not passed
    const now = Math.floor(Date.now() / 1000);
    const deadlineOk = claim.deadline === 0 || now < claim.deadline;
    checks.push({
      name: 'within_deadline',
      passed: deadlineOk,
      detail: deadlineOk
        ? `Claim deadline: ${claim.deadline === 0 ? 'not set' : new Date(claim.deadline * 1000).toISOString()}`
        : `Claim deadline passed: ${new Date(claim.deadline * 1000).toISOString()}`,
    });

    return this.buildReport(claimId, poolAddress, checks);
  }

  /**
   * Quick check if a claim submission is valid before on-chain submission.
   */
  async preSubmissionCheck(
    poolAddress: string,
    claimantAddress: string,
    amount: bigint,
    evidenceCid: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check claimant is an active pool member
    try {
      const isActive = await sorobanService.isPoolMemberActive(poolAddress, claimantAddress);
      if (!isActive) {
        errors.push('Claimant is not an active pool member (may have missed a contribution)');
      }
    } catch {
      errors.push('Could not verify pool membership');
    }

    // Check pool is in Active phase
    try {
      const summary = await sorobanService.getPoolSummary(poolAddress);
      if (!summary) {
        errors.push('Pool not found');
      } else if (summary.phase !== 'Active') {
        errors.push(`Pool is not active (current phase: ${summary.phase})`);
      } else if (summary.paused) {
        errors.push('Pool is currently paused');
      }
    } catch {
      errors.push('Could not verify pool status');
    }

    // Check amount
    if (amount <= BigInt(0)) {
      errors.push('Claim amount must be positive');
    }

    // Check evidence CID format
    if (!evidenceCid || !ipfsService.isValidCid(evidenceCid)) {
      errors.push('Invalid or missing evidence IPFS CID');
    }

    return { valid: errors.length === 0, errors };
  }

  // ── Private ──────────────────────────────────────────────────

  private buildReport(claimId: number, poolAddress: string, checks: VerificationCheck[]): VerificationReport {
    const passedCount = checks.filter((c) => c.passed).length;
    const totalCount = checks.length;
    const overallScore = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

    const report: VerificationReport = {
      claimId,
      poolAddress,
      isValid: checks.every((c) => c.passed),
      checks,
      overallScore,
      timestamp: new Date().toISOString(),
    };

    logger.info(CTX, `Verification complete for claim #${claimId}`, {
      score: overallScore,
      valid: report.isValid,
      passed: passedCount,
      total: totalCount,
    });

    return report;
  }
}

export const claimVerificationService = new ClaimVerificationService();
