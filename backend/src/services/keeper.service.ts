import cron from 'node-cron';
import { sorobanService } from './soroban.service';
import { notificationService } from './notification.service';
import { logger } from '../utils/logger';
import { KeeperLog } from '../types';

/**
 * Keeper Service — NexusGuard Protocol Automation
 *
 * Runs on a schedule to maintain pool health:
 *  - advance_cycle: called monthly on each Active pool (8th of month)
 *  - rotate_signers: called every 60 days on Active pools
 *  - reject_expired_claim: sweeps expired pending claims on all Active pools
 */

const CTX = 'KeeperService';

// 60 days in seconds
const SIGNER_ROTATION_SECONDS = 60 * 24 * 60 * 60;
// Track last known cycle & signer rotation per pool
const cycleAdvancedAt = new Map<string, number>();
const signersRotatedAt = new Map<string, number>();

export class KeeperService {
  private isRunning = false;
  private logs: KeeperLog[] = [];
  private cronJob: cron.ScheduledTask | null = null;

  start(schedule = '*/15 * * * *'): void {
    if (this.cronJob) {
      logger.warn(CTX, 'Keeper already running');
      return;
    }
    this.cronJob = cron.schedule(schedule, async () => {
      await this.runCycle();
    });
    logger.info(CTX, `Keeper started with schedule: ${schedule}`);
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info(CTX, 'Keeper stopped');
    }
  }

  async runCycle(): Promise<void> {
    if (this.isRunning) {
      logger.debug(CTX, 'Skipping cycle — previous cycle still running');
      return;
    }
    this.isRunning = true;
    logger.info(CTX, 'Starting keeper cycle');
    try {
      const pools = await sorobanService.getAllFactoryPools();
      logger.debug(CTX, `Processing ${pools.length} pools`);

      for (const pool of pools) {
        if (pool.paused) continue;
        try {
          const summary = await sorobanService.getPoolSummary(pool.address);
          if (!summary || summary.phase !== 'Active') continue;

          await this.processAdvanceCycle(pool.address, summary.currentCycle);
          await this.processRotateSigners(pool.address, summary.activatedAt);
          await this.processExpiredClaims(pool.address);
        } catch (error) {
          logger.error(CTX, `Failed processing pool ${pool.address.slice(0, 8)}`, { error });
        }
      }
    } catch (error) {
      logger.error(CTX, 'Keeper cycle failed', { error });
    } finally {
      this.isRunning = false;
    }
  }

  getRecentLogs(limit = 50): KeeperLog[] {
    return this.logs.slice(-limit);
  }

  // ── Cycle Advancement ────────────────────────────────────────
  // Advance cycle if the current day-of-month >= 8 and we haven't
  // already advanced for this cycle number.

  private async processAdvanceCycle(poolAddress: string, currentCycle: number): Promise<void> {
    const now = new Date();
    const lastAdvanced = cycleAdvancedAt.get(poolAddress) ?? -1;

    // Only advance once per cycle — track by cycle number
    if (lastAdvanced === currentCycle) return;

    // Only call on/after the 8th of the month
    if (now.getUTCDate() < 8) return;

    try {
      logger.info(CTX, `Advancing cycle on pool ${poolAddress.slice(0, 8)} (was cycle #${currentCycle})`);
      const txHash = await sorobanService.advanceCycle(poolAddress);
      cycleAdvancedAt.set(poolAddress, currentCycle);
      this.addLog({
        id: `cycle-${poolAddress.slice(0, 8)}-${Date.now()}`,
        type: 'advance_cycle',
        poolAddress,
        detail: `Advanced from cycle #${currentCycle}`,
        success: true,
        txHash,
        executedAt: new Date().toISOString(),
      });
    } catch (error) {
      this.addLog({
        id: `cycle-${poolAddress.slice(0, 8)}-${Date.now()}`,
        type: 'advance_cycle',
        poolAddress,
        detail: `Failed to advance cycle #${currentCycle}`,
        success: false,
        error: String(error),
        executedAt: new Date().toISOString(),
      });
    }
  }

  // ── Signer Rotation ──────────────────────────────────────────
  // Rotate every 60 days from activatedAt.

  private async processRotateSigners(poolAddress: string, activatedAt: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const lastRotated = signersRotatedAt.get(poolAddress) ?? activatedAt;
    if (now - lastRotated < SIGNER_ROTATION_SECONDS) return;

    try {
      logger.info(CTX, `Rotating signers on pool ${poolAddress.slice(0, 8)}`);
      const txHash = await sorobanService.rotateSigners(poolAddress);
      signersRotatedAt.set(poolAddress, now);
      this.addLog({
        id: `rotate-${poolAddress.slice(0, 8)}-${Date.now()}`,
        type: 'rotate_signers',
        poolAddress,
        detail: 'Signer set rotated',
        success: true,
        txHash,
        executedAt: new Date().toISOString(),
      });
      notificationService.notifySignerRotation(poolAddress);
    } catch (error) {
      this.addLog({
        id: `rotate-${poolAddress.slice(0, 8)}-${Date.now()}`,
        type: 'rotate_signers',
        poolAddress,
        detail: 'Signer rotation failed',
        success: false,
        error: String(error),
        executedAt: new Date().toISOString(),
      });
    }
  }

  // ── Expired Claims ───────────────────────────────────────────

  private async processExpiredClaims(poolAddress: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    let pending;
    try {
      pending = await sorobanService.getPoolPendingClaims(poolAddress);
    } catch {
      return;
    }

    for (const claim of pending) {
      if (claim.deadline === 0 || now < claim.deadline) continue;
      try {
        logger.info(CTX, `Rejecting expired claim #${claim.id} on pool ${poolAddress.slice(0, 8)}`);
        const txHash = await sorobanService.rejectExpiredClaim(poolAddress, claim.id);
        this.addLog({
          id: `expire-${claim.id}-${Date.now()}`,
          type: 'reject_expired_claim',
          poolAddress,
          detail: `Claim #${claim.id} expired`,
          success: true,
          txHash,
          executedAt: new Date().toISOString(),
        });
        notificationService.notifyClaimStatusUpdate(claim.claimant, claim.id, 'Expired');
      } catch (error) {
        this.addLog({
          id: `expire-${claim.id}-${Date.now()}`,
          type: 'reject_expired_claim',
          poolAddress,
          detail: `Failed to reject expired claim #${claim.id}`,
          success: false,
          error: String(error),
          executedAt: new Date().toISOString(),
        });
      }
    }
  }

  // ── Internal ─────────────────────────────────────────────────

  private addLog(log: KeeperLog): void {
    this.logs.push(log);
    if (this.logs.length > 500) this.logs = this.logs.slice(-500);
  }
}

export const keeperService = new KeeperService();
