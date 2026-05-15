/**
 * Factory contract client — reads pool listings and creates pools.
 */
import {
  readContract,
  callContract,
  addressToScVal,
  stringToScVal,
  i128ToScVal,
  u32ToScVal,
  scValToNative,
} from "./soroban";
import { CONTRACTS } from "./config";
import type { FactoryPoolInfo, CreatePoolParams } from "./types";

// ─── Read functions ──────────────────────────────────────────────

export async function getPoolCount(): Promise<number> {
  const result = await readContract({
    contractId: CONTRACTS.factory,
    method: "pool_count",
  });
  return scValToNative(result) as number;
}

export async function getActivePoolCount(): Promise<number> {
  const result = await readContract({
    contractId: CONTRACTS.factory,
    method: "active_pool_count",
  });
  return scValToNative(result) as number;
}

export async function getAllPools(): Promise<FactoryPoolInfo[]> {
  try {
    const result = await readContract({
      contractId: CONTRACTS.factory,
      method: "get_all_pools",
    });
    const raw = scValToNative(result) as any[];
    return raw.map(parsePoolInfo);
  } catch {
    return [];
  }
}

export async function getPoolsByCreator(
  creator: string
): Promise<FactoryPoolInfo[]> {
  try {
    const result = await readContract({
      contractId: CONTRACTS.factory,
      method: "get_pools_by_creator",
      args: [addressToScVal(creator)],
    });
    const raw = scValToNative(result) as any[];
    return raw.map(parsePoolInfo);
  } catch {
    return [];
  }
}

export async function getPool(poolId: number): Promise<FactoryPoolInfo | null> {
  try {
    const result = await readContract({
      contractId: CONTRACTS.factory,
      method: "get_pool",
      args: [u32ToScVal(poolId)],
    });
    return parsePoolInfo(scValToNative(result));
  } catch {
    return null;
  }
}

export async function getPoolMetadata(poolAddress: string): Promise<string> {
  try {
    const result = await readContract({
      contractId: CONTRACTS.factory,
      method: "get_pool_metadata",
      args: [addressToScVal(poolAddress)],
    });
    return scValToNative(result) as string;
  } catch {
    return "";
  }
}

// ─── Write functions ─────────────────────────────────────────────

export async function createPool(
  creatorAddress: string,
  params: CreatePoolParams
): Promise<string> {
  const txHash = await callContract({
    contractId: CONTRACTS.factory,
    method: "create_pool",
    args: [
      addressToScVal(creatorAddress),
      stringToScVal(params.name),
      stringToScVal(params.description),
      i128ToScVal(params.contributionAmount),
      u32ToScVal(params.maxMembers),
      stringToScVal(params.metadataCid),
    ],
    sourceAddress: creatorAddress,
    submit: true,
  });
  return txHash as string;
}

// ─── Parsing helpers ─────────────────────────────────────────────

function parsePoolInfo(raw: any): FactoryPoolInfo {
  return {
    id: Number(raw.id ?? raw[0] ?? 0),
    address: String(raw.address ?? raw[1] ?? ""),
    creator: String(raw.creator ?? raw[2] ?? ""),
    metadataCid: String(raw.metadata_cid ?? raw[3] ?? ""),
    createdAt: Number(raw.created_at ?? raw[4] ?? 0),
    active: Boolean(raw.active ?? raw[5] ?? true),
  };
}
