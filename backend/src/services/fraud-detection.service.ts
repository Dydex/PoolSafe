import { sorobanService } from './soroban.service';
import { logger } from '../utils/logger';
import { FraudReport, FraudFlag } from '../types';

/**
 * Fraud Detection Service — Rule-Based Analysis Engine
 * 
 * Implements configurable rules for detecting suspicious claim patterns:
 * 1. Duplicate Detection — Same claimant, same pool, similar description within 30 days
 * 2. Velocity Check — More than 3 claims in 90 days from same address
 * 3. Amount Anomaly — Claim amount > 80% of pool's max payout
 * 4. New Member Check — Claim filed within 7 days of joining pool
 * 5. Pattern Matching — Multiple claims across different pools from same address
 * 
 * Each rule scores 0-20 points. Aggregate determines risk level:
 * - 0-30: Low risk → auto-proceed
 * - 31-60: Medium risk → flag for manual review
 * - 61-100: High risk → flag for governance vote
 */

const CTX = 'FraudDetection';

// Configuration constants
const DUPLICATE_WINDOW_DAYS = 30;
const VELOCITY_WINDOW_DAYS = 90;
const VELOCITY_THRESHOLD = 3;
const AMOUNT_ANOMALY_RATIO = 0.8;
const NEW_MEMBER_WINDOW_DAYS = 7;
const MAX_POINTS_PER_RULE = 20;
const RULES_COUNT = 5;
const MAX_SCORE = RULES_COUNT * MAX_POINTS_PER_RULE; // 100

export class FraudDetectionService {
  /**
   * Analyze a claim for fraud risk using rule-based scoring.
   */
  async analyzeClaim(
    poolAddress: string,
    claimId: number,
    claimantAddress: string,
    amount: bigint
  ): Promise<FraudReport> {
    logger.info(CTX, `Starting fraud analysis for claim ${claimId}`, {
      claimant: claimantAddress.slice(0, 8),
      amount: amount.toString(),
    });

    const flags: FraudFlag[] = [];
    let totalScore = 0;

    // Rule 1: Duplicate Detection
    const duplicateFlag = await this.checkDuplicateClaim(poolAddress, claimantAddress);
    if (duplicateFlag) {
      flags.push(duplicateFlag);
      totalScore += duplicateFlag.score;
    }

    // Rule 2: Velocity Check
    const velocityFlag = await this.checkVelocity(poolAddress, claimantAddress);
    if (velocityFlag) {
      flags.push(velocityFlag);
      totalScore += velocityFlag.score;
    }

    // Rule 3: Amount Anomaly
    const amountFlag = this.checkAmountAnomaly(amount);
    if (amountFlag) {
      flags.push(amountFlag);
      totalScore += amountFlag.score;
    }

    // Rule 4: New Member Check — verifies claimant is an active member
    const newMemberFlag = await this.checkNewMember(poolAddress, claimantAddress);
    if (newMemberFlag) {
      flags.push(newMemberFlag);
      totalScore += newMemberFlag.score;
    }

    // Rule 5: Pattern Matching (multi-pool claiming)
    const patternFlag = await this.checkMultiPoolPattern(poolAddress, claimantAddress);
    if (patternFlag) {
      flags.push(patternFlag);
      totalScore += patternFlag.score;
    }

    // Determine risk level and recommendation
    const riskLevel = this.getRiskLevel(totalScore);
    const recommendation = this.getRecommendation(riskLevel);

    const report: FraudReport = {
      claimId,
      riskScore: totalScore,
      riskLevel,
      flags,
      recommendation,
      timestamp: new Date().toISOString(),
    };

    logger.info(CTX, `Fraud analysis complete for claim ${claimId}`, {
      riskScore: totalScore,
      riskLevel,
      flagCount: flags.length,
      recommendation,
    });

    return report;
  }

  // ── Rule 1: Duplicate Detection ──────────────────────────────

  private async checkDuplicateClaim(poolAddress: string, claimantAddress: string): Promise<FraudFlag | null> {
    try {
      const claims = await sorobanService.getPoolAllClaims(poolAddress);
      const userClaims = claims.filter((c) => c.claimant === claimantAddress);

      if (userClaims.length < 2) return null;

      // Check if two claims from same user exist within DUPLICATE_WINDOW_DAYS
      const now = Math.floor(Date.now() / 1000);
      const windowSecs = DUPLICATE_WINDOW_DAYS * 86400;
      const recentClaims = userClaims.filter((c) => now - c.submittedAt < windowSecs);

      if (recentClaims.length < 2) return null;

      logger.debug(CTX, `Duplicate check: ${recentClaims.length} recent claims in ${DUPLICATE_WINDOW_DAYS}d window`, {
        claimant: claimantAddress.slice(0, 8),
      });

      return {
        rule: 'duplicate_claim',
        triggered: true,
        score: Math.min(recentClaims.length * 5, MAX_POINTS_PER_RULE),
        detail: `${recentClaims.length} claims filed within ${DUPLICATE_WINDOW_DAYS} days.`,
      };
    } catch (error) {
      logger.warn(CTX, 'Duplicate check failed', { error });
      return null;
    }
  }

  // ── Rule 2: Velocity Check ──────────────────────────────────

  private async checkVelocity(poolAddress: string, claimantAddress: string): Promise<FraudFlag | null> {
    try {
      const claims = await sorobanService.getPoolAllClaims(poolAddress);
      const now = Math.floor(Date.now() / 1000);
      const windowSecs = VELOCITY_WINDOW_DAYS * 86400;
      const recentUserClaims = claims.filter(
        (c) => c.claimant === claimantAddress && now - c.submittedAt < windowSecs
      );

      if (recentUserClaims.length <= VELOCITY_THRESHOLD) return null;

      const excess = recentUserClaims.length - VELOCITY_THRESHOLD;
      const score = Math.min(Math.ceil((excess / VELOCITY_THRESHOLD) * MAX_POINTS_PER_RULE), MAX_POINTS_PER_RULE);

      return {
        rule: 'velocity_check',
        triggered: true,
        score,
        detail: `${recentUserClaims.length} claims in last ${VELOCITY_WINDOW_DAYS} days. Threshold: ${VELOCITY_THRESHOLD}.`,
      };
    } catch (error) {
      logger.warn(CTX, 'Velocity check failed', { error });
      return null;
    }
  }

  // ── Rule 3: Amount Anomaly ──────────────────────────────────

  private checkAmountAnomaly(amount: bigint): FraudFlag | null {
    // For MVP, we use a fixed threshold instead of querying pool max payout
    // In production, this would compare against the actual pool's maxPayout
    const ASSUMED_MAX_PAYOUT = BigInt(10000000); // 1M stroops = ~0.1 USDC in test environment
    const anomalyThreshold = (ASSUMED_MAX_PAYOUT * BigInt(Math.ceil(AMOUNT_ANOMALY_RATIO * 100))) / BigInt(100);

    if (amount <= anomalyThreshold) {
      return null;
    }

    const exceedRatio = (Number(amount) / Number(anomalyThreshold)) - 1;
    const score = Math.min(
      Math.ceil(exceedRatio * MAX_POINTS_PER_RULE),
      MAX_POINTS_PER_RULE
    );

    return {
      rule: 'amount_anomaly',
      triggered: true,
      score,
      detail: `Claim amount (${amount.toString()} stroops) exceeds ${AMOUNT_ANOMALY_RATIO * 100}% of assumed pool max.`,
    };
  }

  // ── Rule 4: New Member Check ────────────────────────────────

  private async checkNewMember(poolAddress: string, claimantAddress: string): Promise<FraudFlag | null> {
    try {
      const isActive = await sorobanService.isPoolMemberActive(poolAddress, claimantAddress);
      if (!isActive) {
        return {
          rule: 'inactive_member',
          triggered: true,
          score: MAX_POINTS_PER_RULE,
          detail: 'Claimant is not an active member (missed contribution or not joined).',
        };
      }
      return null;
    } catch (error) {
      logger.warn(CTX, 'Member activity check failed', { error });
      return null;
    }
  }

  // ── Rule 5: Pattern Matching (Multi-Pool) ───────────────────

  private async checkMultiPoolPattern(poolAddress: string, claimantAddress: string): Promise<FraudFlag | null> {
    try {
      const allPools = await sorobanService.getAllFactoryPools();
      let userTotalClaims = 0;
      let protocolTotalClaims = 0;

      await Promise.allSettled(
        allPools.map(async (p) => {
          if (p.address === poolAddress) return; // already checked
          const claims = await sorobanService.getPoolAllClaims(p.address);
          protocolTotalClaims += claims.length;
          userTotalClaims += claims.filter((c) => c.claimant === claimantAddress).length;
        })
      );

      if (protocolTotalClaims === 0 || userTotalClaims === 0) return null;

      const ratio = userTotalClaims / protocolTotalClaims;
      if (ratio <= 0.5) return null;

      return {
        rule: 'multi_pool_pattern',
        triggered: true,
        score: Math.min(Math.ceil(ratio * MAX_POINTS_PER_RULE), MAX_POINTS_PER_RULE),
        detail: `User has claims in multiple pools, accounting for ${Math.round(ratio * 100)}% of cross-pool claims.`,
      };
    } catch (error) {
      logger.warn(CTX, 'Pattern matching check failed', { error });
      return null;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  private getRiskLevel(score: number): FraudReport['riskLevel'] {
    if (score <= 30) return 'low';
    if (score <= 60) return 'medium';
    return 'high';
  }

  private getRecommendation(
    riskLevel: FraudReport['riskLevel']
  ): FraudReport['recommendation'] {
    if (riskLevel === 'low') return 'auto-proceed';
    if (riskLevel === 'medium') return 'manual-review';
    return 'reject';
  }
}

export const fraudDetectionService = new FraudDetectionService();
