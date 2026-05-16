import * as StellarSdk from "@stellar/stellar-sdk";
import { config } from "../config";
import { logger } from "../utils/logger";
import {
  getBackendKeypair,
  getSorobanClient,
  getNetworkPassphrase,
} from "../utils/stellar";
import {
  OnChainClaim,
  OnChainPoolSummary,
  FactoryPoolRecord,
  ProtocolStats,
  ClaimStatus,
  PoolPhase,
} from "../types";

/**
 * Soroban RPC Service
 *
 * Wraps Soroban SDK calls for reading contract state and submitting transactions.
 * Used by the keeper service, claim verification, and fraud detection.
 */

const CTX = "SorobanService";

export class SorobanService {
  private client: StellarSdk.rpc.Server;
  private keypair: StellarSdk.Keypair | null = null;

  constructor() {
    this.client = getSorobanClient();
    try {
      this.keypair = getBackendKeypair();
    } catch {
      logger.warn(CTX, "No backend keypair configured — read-only mode");
    }
  }

  // ── Generic Contract Invocation ──────────────────────────────

  /**
   * Invoke a Soroban contract function (read-only simulation).
   */
  async simulateContractCall(
    contractId: string,
    method: string,
    args: StellarSdk.xdr.ScVal[] = [],
  ): Promise<StellarSdk.xdr.ScVal | null> {
    try {
      const account = await this.client.getAccount(
        this.keypair?.publicKey() || config.stellar.publicKey,
      );

      const contract = new StellarSdk.Contract(contractId);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: getNetworkPassphrase(),
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();

      const simulation = await this.client.simulateTransaction(tx);

      if (StellarSdk.rpc.Api.isSimulationSuccess(simulation)) {
        const result = simulation.result;
        return result?.retval || null;
      }

      logger.warn(CTX, `Simulation failed for ${method}`, { contractId });
      return null;
    } catch (error) {
      logger.error(CTX, `Contract call failed: ${method}`, {
        contractId,
        error,
      });
      throw error;
    }
  }

  /**
   * Submit a contract transaction (write operation).
   */
  async submitContractCall(
    contractId: string,
    method: string,
    args: StellarSdk.xdr.ScVal[] = [],
  ): Promise<string> {
    if (!this.keypair) {
      throw new Error(
        "Backend keypair not configured — cannot submit transactions",
      );
    }

    try {
      const account = await this.client.getAccount(this.keypair.publicKey());
      const contract = new StellarSdk.Contract(contractId);

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "1000000",
        networkPassphrase: getNetworkPassphrase(),
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(60)
        .build();

      // Simulate first to get footprint
      const simulation = await this.client.simulateTransaction(tx);

      if (!StellarSdk.rpc.Api.isSimulationSuccess(simulation)) {
        throw new Error("Transaction simulation failed");
      }

      // Assemble the transaction with the simulation results
      const assembledTx = StellarSdk.rpc
        .assembleTransaction(tx, simulation)
        .build();
      assembledTx.sign(this.keypair);

      const sendResult = await this.client.sendTransaction(assembledTx);

      if (sendResult.status === "ERROR") {
        throw new Error(`Transaction send failed: ${sendResult.status}`);
      }

      // Wait for confirmation
      let result = await this.client.getTransaction(sendResult.hash);
      while (result.status === "NOT_FOUND") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        result = await this.client.getTransaction(sendResult.hash);
      }

      if (result.status === "SUCCESS") {
        logger.info(CTX, `Transaction confirmed: ${method}`, {
          hash: sendResult.hash,
        });
        return sendResult.hash;
      }

      throw new Error(`Transaction failed with status: ${result.status}`);
    } catch (error) {
      logger.error(CTX, `Submit failed: ${method}`, { contractId, error });
      throw error;
    }
  }

  // ── Factory Contract Queries ─────────────────────────────────

  async getFactoryPoolCount(): Promise<number> {
    const result = await this.simulateContractCall(
      config.contracts.factory,
      "pool_count",
    );
    if (!result) return 0;
    return Number(StellarSdk.scValToBigInt(result));
  }

  async getAllFactoryPools(): Promise<FactoryPoolRecord[]> {
    try {
      const result = await this.simulateContractCall(
        config.contracts.factory,
        "get_all_pools",
      );
      if (!result) return [];
      const native = StellarSdk.scValToNative(result) as Record<string, unknown>[];
      return native.map((r) => ({
        address: r.address as string,
        creator: r.creator as string,
        metadataCid: r.metadata_cid as string,
        createdAt: Number(r.created_at),
        paused: Boolean(r.paused),
      }));
    } catch (error) {
      logger.error(CTX, "Failed to get all factory pools", { error });
      return [];
    }
  }

  // ── Per-Pool Queries ─────────────────────────────────────────

  async getPoolSummary(poolAddress: string): Promise<OnChainPoolSummary | null> {
    try {
      const result = await this.simulateContractCall(poolAddress, "get_summary");
      if (!result) return null;
      const r = StellarSdk.scValToNative(result) as Record<string, unknown>;
      return {
        name: String(r.name ?? ""),
        description: String(r.description ?? ""),
        creator: String(r.creator ?? ""),
        phase: this.mapPhase(r.phase),
        balance: BigInt(r.balance as string | number ?? 0),
        memberCount: Number(r.member_count ?? 0),
        minMembers: Number(r.min_members ?? 15),
        maxMembers: Number(r.max_members ?? 30),
        fixedContribution: BigInt(r.fixed_contribution as string | number ?? 0),
        claimCount: Number(r.claim_count ?? 0),
        currentCycle: Number(r.current_cycle ?? 0),
        signerCount: Number(r.signer_count ?? 0),
        createdAt: Number(r.created_at ?? 0),
        activatedAt: Number(r.activated_at ?? 0),
        expiresAt: Number(r.expires_at ?? 0),
        paused: Boolean(r.paused ?? false),
      };
    } catch (error) {
      logger.error(CTX, `Failed to get pool summary: ${poolAddress}`, { error });
      return null;
    }
  }

  async isPoolMember(poolAddress: string, address: string): Promise<boolean> {
    const result = await this.simulateContractCall(poolAddress, "is_member", [
      StellarSdk.nativeToScVal(address, { type: "address" }),
    ]);
    if (!result) return false;
    return StellarSdk.scValToNative(result) as boolean;
  }

  async isPoolMemberActive(poolAddress: string, address: string): Promise<boolean> {
    const result = await this.simulateContractCall(poolAddress, "is_member_active", [
      StellarSdk.nativeToScVal(address, { type: "address" }),
    ]);
    if (!result) return false;
    return StellarSdk.scValToNative(result) as boolean;
  }

  async getPoolClaim(poolAddress: string, claimId: number): Promise<OnChainClaim | null> {
    try {
      const result = await this.simulateContractCall(poolAddress, "get_claim", [
        StellarSdk.nativeToScVal(claimId, { type: "u64" }),
      ]);
      if (!result) return null;
      return this.parseOnChainClaim(StellarSdk.scValToNative(result) as Record<string, unknown>);
    } catch (error) {
      logger.error(CTX, `Failed to get claim ${claimId} from pool ${poolAddress}`, { error });
      return null;
    }
  }

  async getPoolAllClaims(poolAddress: string): Promise<OnChainClaim[]> {
    try {
      const result = await this.simulateContractCall(poolAddress, "get_all_claims");
      if (!result) return [];
      const native = StellarSdk.scValToNative(result) as Record<string, unknown>[];
      return native.map((r) => this.parseOnChainClaim(r));
    } catch (error) {
      logger.error(CTX, `Failed to get claims for pool ${poolAddress}`, { error });
      return [];
    }
  }

  async getPoolPendingClaims(poolAddress: string): Promise<OnChainClaim[]> {
    try {
      const result = await this.simulateContractCall(poolAddress, "get_pending_claims");
      if (!result) return [];
      const native = StellarSdk.scValToNative(result) as Record<string, unknown>[];
      return native.map((r) => this.parseOnChainClaim(r));
    } catch (error) {
      logger.error(CTX, `Failed to get pending claims for pool ${poolAddress}`, { error });
      return [];
    }
  }

  // ── Protocol-wide Stats ──────────────────────────────────────

  async getProtocolStats(): Promise<ProtocolStats> {
    const pools = await this.getAllFactoryPools();
    const summaries = await Promise.allSettled(
      pools.map((p) => this.getPoolSummary(p.address))
    );

    let totalBalance = BigInt(0);
    let totalMembers = 0;
    let totalClaims = 0;
    let activePools = 0;
    let formationPools = 0;

    for (const result of summaries) {
      if (result.status === "fulfilled" && result.value) {
        const s = result.value;
        totalBalance += s.balance;
        totalMembers += s.memberCount;
        totalClaims += s.claimCount;
        if (s.phase === "Active") activePools++;
        if (s.phase === "Formation") formationPools++;
      }
    }

    return {
      totalPools: pools.length,
      activePools,
      formationPools,
      totalBalance,
      totalMembers,
      totalClaims,
    };
  }

  // ── Keeper Transaction Submissions ───────────────────────────

  async advanceCycle(poolAddress: string): Promise<string> {
    return this.submitContractCall(poolAddress, "advance_cycle", []);
  }

  async rotateSigners(poolAddress: string): Promise<string> {
    return this.submitContractCall(poolAddress, "rotate_signers", []);
  }

  async rejectExpiredClaim(poolAddress: string, claimId: number): Promise<string> {
    return this.submitContractCall(poolAddress, "reject_expired_claim", [
      StellarSdk.nativeToScVal(claimId, { type: "u64" }),
    ]);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private parseOnChainClaim(r: Record<string, unknown>): OnChainClaim {
    return {
      id: Number(r.id ?? 0),
      claimant: String(r.claimant ?? ""),
      amount: BigInt(r.amount as string | number ?? 0),
      description: String(r.description ?? ""),
      evidenceCid: String(r.evidence_cid ?? ""),
      status: this.mapClaimStatus(r.status),
      votesFor: Number(r.votes_for ?? 0),
      votesAgainst: Number(r.votes_against ?? 0),
      submittedAt: Number(r.submitted_at ?? 0),
      deadline: Number(r.deadline ?? 0),
      updatedAt: Number(r.updated_at ?? 0),
      executed: Boolean(r.executed ?? false),
    };
  }

  private mapClaimStatus(status: unknown): ClaimStatus {
    const map: Record<string, ClaimStatus> = {
      PendingReview: "PendingReview",
      Approved: "Approved",
      Rejected: "Rejected",
      Expired: "Expired",
      PaidOut: "PaidOut",
    };
    const key = typeof status === "object" && status !== null
      ? Object.keys(status as object)[0]
      : String(status);
    return map[key] ?? "PendingReview";
  }

  private mapPhase(phase: unknown): PoolPhase {
    const map: Record<string, PoolPhase> = {
      Formation: "Formation",
      Active: "Active",
      Closed: "Closed",
    };
    const key = typeof phase === "object" && phase !== null
      ? Object.keys(phase as object)[0]
      : String(phase);
    return map[key] ?? "Formation";
  }
}

// Singleton instance
export const sorobanService = new SorobanService();
