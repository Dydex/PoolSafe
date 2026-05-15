/** Network & contract configuration for Stellar Testnet */

export const NETWORK = {
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  horizonUrl: "https://horizon-testnet.stellar.org",
} as const;

/**
 * Contract IDs — update these after deploying to testnet.
 * Use `NEXT_PUBLIC_` env vars to override at runtime.
 */
export const CONTRACTS = {
  factory: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID ?? "",
  usdc: process.env.NEXT_PUBLIC_USDC_TOKEN_ID ?? "",
} as const;

/** Deployer / admin address */
export const DEPLOYER_ADDRESS =
  process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS ??
  "GDOTQ27K64VCHPHLHBYCFOF523VOEKOK6PCVRFWC3ZL6FCQCPX7RQEO2";

/** USDC has 7 decimals on Stellar */
export const USDC_DECIMALS = 7;

/** Convert human-readable USDC to contract units (stroops) */
export function toStroops(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

/** Convert contract units (stroops) to human-readable USDC */
export function fromStroops(stroops: bigint): number {
  return Number(stroops) / 10 ** USDC_DECIMALS;
}

/** Shorten a Stellar address for display */
export function shortenAddress(address: string, chars = 5): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
