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
  OnChainPoolInfo,
  ProtocolPoolTotals,
  OnChainRecurringPayment,
  OnChainScheduledTransfer,
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

  // ── Pool Contract Queries ────────────────────────────────────

  async getPoolTotalDeposits(): Promise<bigint> {
    const result = await this.simulateContractCall(
      config.contracts.pool,
      "total_deposits",
    );
    if (!result) return BigInt(0);
    return StellarSdk.scValToBigInt(result);
  }

  async getPoolMemberCount(): Promise<number> {
    const result = await this.simulateContractCall(
      config.contracts.pool,
      "member_count",
    );
    if (!result) return 0;
    return Number(StellarSdk.scValToBigInt(result));
  }

  async getProtocolPoolTotals(): Promise<ProtocolPoolTotals> {
    const result = await this.simulateContractCall(
      config.contracts.pool,
      "protocol_totals",
    );

    if (!result) {
      return {
        totalPaidClaimAmount: BigInt(0),
        totalBalanceAllPools: BigInt(0),
        totalApprovedClaimAmount: BigInt(0),
        activePoolCount: 0,
        totalClaimsSubmitted: 0,
      };
    }

    const native = StellarSdk.scValToNative(result) as Record<string, unknown>;

    return {
      totalPaidClaimAmount: BigInt(
        native.total_paid_claim_amount as string | number,
      ),
      totalBalanceAllPools: BigInt(
        native.total_balance_all_pools as string | number,
      ),
      totalApprovedClaimAmount: BigInt(
        native.total_approved_claim_amount as string | number,
      ),
      activePoolCount: Number(native.active_pool_count),
      totalClaimsSubmitted: Number(native.total_claims_submitted),
    };
  }

  async isPoolMember(address: string): Promise<boolean> {
    const result = await this.simulateContractCall(
      config.contracts.pool,
      "is_member",
      [StellarSdk.nativeToScVal(address, { type: "address" })],
    );
    if (!result) return false;
    return StellarSdk.scValToNative(result) as boolean;
  }

  // ── Claims Contract Queries ──────────────────────────────────

  async getClaimCount(): Promise<number> {
    const result = await this.simulateContractCall(
      config.contracts.claims,
      "claim_count",
    );
    if (!result) return 0;
    return Number(StellarSdk.scValToBigInt(result));
  }

  async getClaim(claimId: number): Promise<OnChainClaim | null> {
    try {
      const result = await this.simulateContractCall(
        config.contracts.claims,
        "get_claim",
        [StellarSdk.nativeToScVal(claimId, { type: "u64" })],
      );
      if (!result) return null;

      const native = StellarSdk.scValToNative(result) as Record<
        string,
        unknown
      >;
      return {
        id: Number(native.id),
        claimant: native.claimant as string,
        amount: BigInt(native.amount as string | number),
        descriptionHash: native.description_hash as string,
        evidenceIpfs: native.evidence_ipfs as string,
        status: this.mapClaimStatus(native.status),
        submittedAt: Number(native.submitted_at),
        updatedAt: Number(native.updated_at),
      };
    } catch (error) {
      logger.error(CTX, `Failed to get claim ${claimId}`, { error });
      return null;
    }
  }

  async getUserClaimCount(address: string): Promise<number> {
    const result = await this.simulateContractCall(
      config.contracts.claims,
      "user_claim_count",
      [StellarSdk.nativeToScVal(address, { type: "address" })],
    );
    if (!result) return 0;
    return Number(StellarSdk.scValToBigInt(result));
  }

  // ── Smart Account Queries ────────────────────────────────────

  async getRecurringPaymentCount(): Promise<number> {
    const result = await this.simulateContractCall(
      config.contracts.smartAccount,
      "recurring_count",
    );
    if (!result) return 0;
    return Number(StellarSdk.scValToBigInt(result));
  }

  async getRecurringPayment(
    paymentId: number,
  ): Promise<OnChainRecurringPayment | null> {
    try {
      const result = await this.simulateContractCall(
        config.contracts.smartAccount,
        "get_recurring",
        [StellarSdk.nativeToScVal(paymentId, { type: "u64" })],
      );
      if (!result) return null;

      const native = StellarSdk.scValToNative(result) as Record<
        string,
        unknown
      >;
      return {
        id: Number(native.id),
        owner: native.owner as string,
        recipient: native.recipient as string,
        token: native.token as string,
        amount: BigInt(native.amount as string | number),
        interval:
          (native.interval as string) === "Weekly" ? "Weekly" : "Monthly",
        nextExecution: Number(native.next_execution),
        totalExecuted: Number(native.total_executed),
        maxExecutions: Number(native.max_executions),
        isActive: native.is_active as boolean,
      };
    } catch (error) {
      logger.error(CTX, `Failed to get recurring payment ${paymentId}`, {
        error,
      });
      return null;
    }
  }

  async getScheduledTransferCount(): Promise<number> {
    const result = await this.simulateContractCall(
      config.contracts.smartAccount,
      "scheduled_count",
    );
    if (!result) return 0;
    return Number(StellarSdk.scValToBigInt(result));
  }

  async getScheduledTransfer(
    transferId: number,
  ): Promise<OnChainScheduledTransfer | null> {
    try {
      const result = await this.simulateContractCall(
        config.contracts.smartAccount,
        "get_scheduled",
        [StellarSdk.nativeToScVal(transferId, { type: "u64" })],
      );
      if (!result) return null;

      const native = StellarSdk.scValToNative(result) as Record<
        string,
        unknown
      >;
      return {
        id: Number(native.id),
        owner: native.owner as string,
        recipient: native.recipient as string,
        token: native.token as string,
        amount: BigInt(native.amount as string | number),
        executeAfter: Number(native.execute_after),
        executed: native.executed as boolean,
      };
    } catch (error) {
      logger.error(CTX, `Failed to get scheduled transfer ${transferId}`, {
        error,
      });
      return null;
    }
  }

  // ── Transaction Submission (for keeper) ──────────────────────

  async executeRecurringPayment(paymentId: number): Promise<string> {
    if (!this.keypair) throw new Error("No backend keypair configured");

    return this.submitContractCall(
      config.contracts.smartAccount,
      "execute_recurring",
      [
        StellarSdk.nativeToScVal(this.keypair.publicKey(), { type: "address" }),
        StellarSdk.nativeToScVal(paymentId, { type: "u64" }),
      ],
    );
  }

  async executeScheduledTransfer(transferId: number): Promise<string> {
    if (!this.keypair) throw new Error("No backend keypair configured");

    return this.submitContractCall(
      config.contracts.smartAccount,
      "execute_scheduled",
      [
        StellarSdk.nativeToScVal(this.keypair.publicKey(), { type: "address" }),
        StellarSdk.nativeToScVal(transferId, { type: "u64" }),
      ],
    );
  }

  // ── Helpers ──────────────────────────────────────────────────

  private mapClaimStatus(status: unknown): OnChainClaim["status"] {
    const statusMap: Record<string, OnChainClaim["status"]> = {
      Submitted: "Submitted",
      UnderReview: "UnderReview",
      ApprovedByGovernance: "ApprovedByGovernance",
      Rejected: "Rejected",
      PaidOut: "PaidOut",
      PendingReview: "PendingReview",
      Approved: "Approved",
      Resolved: "Resolved",
    };
    return statusMap[String(status)] || "Submitted";
  }
}

// Singleton instance
export const sorobanService = new SorobanService();
