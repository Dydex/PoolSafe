/**
 * Soroban contract interaction helpers.
 *
 * Handles building, simulating, and submitting transactions
 * that call Factory and Pool contract functions.
 */
import {
  Account,
  Contract,
  Keypair,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
  nativeToScVal,
  scValToNative,
  Address,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

import { NETWORK, CONTRACTS } from "./config";

// ─── RPC Client ──────────────────────────────────────────────────
let _server: rpc.Server | null = null;

export function getServer(): rpc.Server {
  if (!_server) {
    _server = new rpc.Server(NETWORK.rpcUrl, { allowHttp: true });
  }
  return _server;
}

// ─── Generic helpers ─────────────────────────────────────────────

/** Build, simulate & optionally submit a contract call */
export async function callContract({
  contractId,
  method,
  args = [],
  sourceAddress,
  submit = false,
}: {
  contractId: string;
  method: string;
  args?: xdr.ScVal[];
  sourceAddress: string;
  submit?: boolean;
}): Promise<xdr.ScVal | string> {
  const server = getServer();
  const account = await server.getAccount(sourceAddress);

  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  const prepared = rpc.assembleTransaction(
    tx,
    simulated as rpc.Api.SimulateTransactionSuccessResponse
  ).build();

  if (!submit) {
    // Read-only call — return the simulated result
    const successSim =
      simulated as rpc.Api.SimulateTransactionSuccessResponse;
    if (successSim.result) {
      return successSim.result.retval;
    }
    throw new Error("No return value from simulation");
  }

  // Sign with Freighter (v6 returns { signedTxXdr, signerAddress })
  const { signedTxXdr } = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK.networkPassphrase,
  });

  const signedTx = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK.networkPassphrase
  );

  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction send failed: ${sendResult.status}`);
  }

  // Poll for completion
  let getResult = await server.getTransaction(sendResult.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2000));
    getResult = await server.getTransaction(sendResult.hash);
  }

  if (getResult.status === "SUCCESS") {
    return sendResult.hash;
  }

  throw new Error(`Transaction failed: ${getResult.status}`);
}

/** Read-only contract call (no signing needed, uses a dummy source for sim) */
export async function readContract({
  contractId,
  method,
  args = [],
}: {
  contractId: string;
  method: string;
  args?: xdr.ScVal[];
}): Promise<xdr.ScVal> {
  const server = getServer();

  // Use a random keypair as source for read-only simulation
  const source = Keypair.random();
  try {
    await server.requestAirdrop(source.publicKey());
  } catch {
    // If friendbot fails, we can still try — simulation doesn't need funds
  }

  // Try to get account, if it doesn't exist create a temporary one
  let account;
  try {
    account = await server.getAccount(source.publicKey());
  } catch {
    // Use a hardcoded sequence number for simulation
    account = new Account(source.publicKey(), "0");
  }

  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account as any, {
    fee: "100",
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Read failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  const successSim =
    simulated as rpc.Api.SimulateTransactionSuccessResponse;
  if (successSim.result) {
    return successSim.result.retval;
  }
  throw new Error("No return value from read simulation");
}

// ─── Conversion helpers ──────────────────────────────────────────

export function addressToScVal(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

export function stringToScVal(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function u64ToScVal(value: number | bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

export function u32ToScVal(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function i128ToScVal(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function bytesToScVal(hash: Buffer): xdr.ScVal {
  return xdr.ScVal.scvBytes(hash);
}

export { scValToNative };
