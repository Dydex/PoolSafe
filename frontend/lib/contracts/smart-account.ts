/**
 * Smart Account contract client.
 * Handles recurring payments, spending limits, multisig, and scheduled transfers.
 * Contract: CCERWUE35WN7M4PN6XYK7CDCJZX35TC53TFATJNBRA6I3FDS3RVS65YF
 */
import { xdr } from "@stellar/stellar-sdk";
import {
  readContract,
  callContract,
  addressToScVal,
  i128ToScVal,
  u64ToScVal,
  u32ToScVal,
  scValToNative,
} from "./soroban";
import { CONTRACTS } from "./config";

const CONTRACT_ID = CONTRACTS.smartAccount;

// ── Types ────────────────────────────────────────────────────────

export type RecurringInterval = "Weekly" | "Monthly";

export type RecurringPayment = {
  id: bigint;
  owner: string;
  recipient: string;
  token: string;
  amount: bigint;
  interval: RecurringInterval;
  nextExecution: bigint;
  totalExecuted: bigint;
  maxExecutions: bigint;
  isActive: boolean;
};

export type SpendingLimit = {
  owner: string;
  token: string;
  maxAmount: bigint;
  periodSeconds: bigint;
  currentSpent: bigint;
  periodStart: bigint;
};

export type ScheduledTransfer = {
  id: bigint;
  owner: string;
  recipient: string;
  token: string;
  amount: bigint;
  executeAfter: bigint;
  executed: boolean;
};

// ── Read Functions ───────────────────────────────────────────────

export async function getRecurringPayment(
  paymentId: bigint
): Promise<RecurringPayment | null> {
  try {
    const result = await readContract({
      contractId: CONTRACT_ID,
      method: "get_recurring",
      args: [u64ToScVal(Number(paymentId))],
    });
    return parseRecurringPayment(scValToNative(result));
  } catch {
    return null;
  }
}

export async function recurringCount(): Promise<number> {
  try {
    const result = await readContract({
      contractId: CONTRACT_ID,
      method: "recurring_count",
    });
    return Number(scValToNative(result));
  } catch {
    return 0;
  }
}

export async function getDuePayments(): Promise<bigint[]> {
  try {
    const result = await readContract({
      contractId: CONTRACT_ID,
      method: "get_due_payments",
    });
    const raw = scValToNative(result) as any[];
    return raw.map((v) => BigInt(v));
  } catch {
    return [];
  }
}

export async function checkSpending(
  owner: string,
  token: string,
  amount: bigint
): Promise<boolean> {
  try {
    const result = await readContract({
      contractId: CONTRACT_ID,
      method: "check_spending",
      args: [addressToScVal(owner), addressToScVal(token), i128ToScVal(amount)],
    });
    return Boolean(scValToNative(result));
  } catch {
    return true;
  }
}

export async function getSpendingLimit(
  owner: string,
  token: string
): Promise<SpendingLimit | null> {
  try {
    const result = await readContract({
      contractId: CONTRACT_ID,
      method: "get_spending_limit",
      args: [addressToScVal(owner), addressToScVal(token)],
    });
    return parseSpendingLimit(scValToNative(result));
  } catch {
    return null;
  }
}

// ── Write Functions ──────────────────────────────────────────────

/**
 * Create a recurring payment for pool contributions.
 * The member must first approve the smart account contract to spend their USDC.
 *
 * @param owner       - Member's Stellar address
 * @param recipient   - Pool contract address (receives the contribution)
 * @param token       - USDC contract address
 * @param amount      - Contribution amount in stroops
 * @param interval    - "Weekly" | "Monthly"
 * @param maxExecutions - 0 = unlimited
 */
export async function createRecurring(
  owner: string,
  recipient: string,
  token: string,
  amount: bigint,
  interval: RecurringInterval,
  maxExecutions: bigint
): Promise<bigint> {
  const result = await callContract({
    contractId: CONTRACT_ID,
    method: "create_recurring",
    args: [
      addressToScVal(owner),
      addressToScVal(recipient),
      addressToScVal(token),
      i128ToScVal(amount),
      intervalToScVal(interval),
      u64ToScVal(Number(maxExecutions)),
    ],
    sourceAddress: owner,
    submit: true,
  });
  return BigInt(scValToNative(result as xdr.ScVal) as number);
}

/** Execute a due recurring payment (called by keeper or any member). */
export async function executeRecurring(
  caller: string,
  paymentId: bigint
): Promise<string> {
  const txHash = await callContract({
    contractId: CONTRACT_ID,
    method: "execute_recurring",
    args: [addressToScVal(caller), u64ToScVal(Number(paymentId))],
    sourceAddress: caller,
    submit: true,
  });
  return txHash as string;
}

/** Cancel a recurring payment. */
export async function cancelRecurring(
  owner: string,
  paymentId: bigint
): Promise<string> {
  const txHash = await callContract({
    contractId: CONTRACT_ID,
    method: "cancel_recurring",
    args: [addressToScVal(owner), u64ToScVal(Number(paymentId))],
    sourceAddress: owner,
    submit: true,
  });
  return txHash as string;
}

/** Set a spending limit for a token over a period. */
export async function setSpendingLimit(
  owner: string,
  token: string,
  maxAmount: bigint,
  periodSeconds: bigint
): Promise<string> {
  const txHash = await callContract({
    contractId: CONTRACT_ID,
    method: "set_spending_limit",
    args: [
      addressToScVal(owner),
      addressToScVal(token),
      i128ToScVal(maxAmount),
      u64ToScVal(Number(periodSeconds)),
    ],
    sourceAddress: owner,
    submit: true,
  });
  return txHash as string;
}

// ── Helpers ──────────────────────────────────────────────────────

function intervalToScVal(interval: RecurringInterval): xdr.ScVal {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(interval)]);
}

function parseRecurringPayment(raw: any): RecurringPayment {
  return {
    id: BigInt(raw.id ?? 0),
    owner: String(raw.owner ?? ""),
    recipient: String(raw.recipient ?? ""),
    token: String(raw.token ?? ""),
    amount: BigInt(raw.amount ?? 0),
    interval: (raw.interval?.Monthly !== undefined ? "Monthly" : "Weekly") as RecurringInterval,
    nextExecution: BigInt(raw.next_execution ?? 0),
    totalExecuted: BigInt(raw.total_executed ?? 0),
    maxExecutions: BigInt(raw.max_executions ?? 0),
    isActive: Boolean(raw.is_active ?? false),
  };
}

function parseSpendingLimit(raw: any): SpendingLimit {
  return {
    owner: String(raw.owner ?? ""),
    token: String(raw.token ?? ""),
    maxAmount: BigInt(raw.max_amount ?? 0),
    periodSeconds: BigInt(raw.period_seconds ?? 0),
    currentSpent: BigInt(raw.current_spent ?? 0),
    periodStart: BigInt(raw.period_start ?? 0),
  };
}
