import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // ── Server ──────────────────────────────────────────────────
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // ── Stellar / Soroban ───────────────────────────────────────
  stellar: {
    network: process.env.STELLAR_NETWORK || 'testnet',
    rpcUrl: process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
    horizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
    secretKey: process.env.STELLAR_SECRET_KEY || '',
    publicKey: process.env.STELLAR_PUBLIC_KEY || '',
  },

  // ── Contract Addresses ──────────────────────────────────────
  contracts: {
    factory: process.env.CONTRACT_FACTORY || '',
    token: process.env.CONTRACT_TOKEN || '',
    smartAccount: process.env.CONTRACT_SMART_ACCOUNT || '',
    poolWasmHash: process.env.POOL_WASM_HASH || '',
  },

  // ── x402 ────────────────────────────────────────────────────
  x402: {
    paymentAsset: process.env.X402_PAYMENT_ASSET || 'USDC',
    facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://x402.stellar.org/facilitator',
  },

  // ── Pinata IPFS ─────────────────────────────────────────────
  pinata: {
    apiKey: process.env.PINATA_API_KEY || '',
    secretKey: process.env.PINATA_SECRET_KEY || '',
    gatewayUrl: process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs',
  },

  // ── SQLite ──────────────────────────────────────────────────
  sqlite: {
    dbPath: process.env.SQLITE_DB_PATH || './data/nexusguard.db',
  },
} as const;

export type Config = typeof config;
