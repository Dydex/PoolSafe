# NexusGuard

**NexusGuard** is a decentralized peer-to-peer microinsurance protocol built on 
Stellar that enables communities to create transparent protection pools for everyday 
risks using on-chain governance, automated recurring USDC contributions, and smart 
contract enforced payouts. Built for emerging markets and underserved communities 
powered by blockchain infrastructure.

---

## The Problem

Nigeria's formal insurance industry is expensive, opaque, and out of reach for most people. Premiums are unaffordable, claims take weeks, and years of denied payouts have eroded trust entirely.

Meanwhile everyday shocks are constant — a cracked screen, a hospital visit, a stolen laptop — and most people have no fallback.

---

## Core Features

- **Cover Pools** — Any member can create a pool for a specific risk category with a fixed contribution amount and member cap.
- **On-chain Contributions** — Members pay monthly in USDC. Missed payments trigger a 7-day grace period before removal.
- **IPFS Evidence** — Claim evidence (photos, receipts) is pinned to IPFS via Pinata and linked on-chain.
- **Signer Voting** — A randomly selected 30% of members are designated signers who review and vote on claims. 60% quorum required.
- **Automatic Payouts** — Approved claims trigger an immediate on-chain USDC transfer. Single cap: 10% of balance. Monthly cap: 25%.
- **Signer Rotation** — Signers rotate every 60 days using a pseudo-random on-chain selection.

## Pool Lifecycle

1. **Formation** — Creator initialises the pool and pays the first contribution. Others join until the minimum (15) is reached.
2. **Active** — Pool auto-activates at minimum members. Signers are selected. Claims can be filed after a 60-day waiting period.
3. **Closed** — Pool is closed by the creator. Remaining balance is distributed equally to all active members.

## Smart Accounts & x402

**Smart Account** (`poolsafe-smart-account`) enables hands-free auto-pay:
- Member approves a USDC spending allowance once via Freighter.
- The smart account executes the monthly contribution automatically — no repeated wallet prompts.
- Also supports spending limits, multisig proposals, and scheduled transfers.

**x402** gates IPFS upload API routes with a one-time micropayment (0.005 USDC), preventing abuse without requiring user accounts or API keys.

---

## API Routes

All backend functionality runs as Next.js API routes — no separate server required.

| Route | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/pools` | GET | List all pools from Factory |
| `/api/pools/stats` | GET | Aggregate protocol stats |
| `/api/ipfs/upload` | POST | Upload evidence file to Pinata (x402 gated) |
| `/api/ipfs/upload-json` | POST | Upload metadata JSON to Pinata (x402 gated) |
| `/api/ipfs/pin/[cid]` | GET | Check pin status |
| `/api/claims/precheck` | POST | Pre-validate a claim before submission |
| `/api/notifications` | GET | Fetch user notifications |
| `/api/notifications/read-all` | PATCH | Mark all notifications read |
| `/api/notifications/[id]` | PATCH / DELETE | Update or delete a notification |

---

## Smart Contracts

Three Soroban contracts (Rust, SDK v22) deployed on Stellar Testnet:

| Contract | Package | Description |
|---|---|---|
| **Factory** | `nexusguard-factory` | Deploys and indexes all pool instances via WASM hash |
| **Pool** | `nexusguard-pool` | Members, contributions, claims, signer voting, payouts |
| **Smart Account** | `poolsafe-smart-account` | Recurring auto-pay, spending limits, multisig |

### Deployed Addresses (Testnet)

| | Address |
|---|---|
| **Factory** | `CAWXDSZM52E5BW7G6TFX7DTXSHF7F75TUSSWW7B442NBEU3CADXNVTXH` |
| **Smart Account** | `CCERWUE35WN7M4PN6XYK7CDCJZX35TC53TFATJNBRA6I3FDS3RVS65YF` |
| **USDC Token (SAC)** | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
| **Deployer/Admin** | `GALK2FN3QXLETSVMUEVWR4IE2FYEFEMWZR2QXU5EU6APVJVATFLS7HON` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, TypeScript, TailwindCSS, Material Symbols |
| **Wallet** | Freighter + `@stellar/freighter-api` v6 |
| **Payments** | x402 protocol (micropayment API gating) |
| **Auto-pay** | Smart Account contract (recurring USDC contributions) |
| **IPFS** | Pinata via Next.js API routes |
| **Blockchain** | Stellar Testnet / Soroban |
| **Contracts** | Rust, Soroban SDK v22 |
| **SDK** | `@stellar/stellar-sdk` v15 |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.0.0
- **Rust** (latest stable) + `wasm32v1-none` target
- **Stellar CLI** — `cargo install stellar-cli`
- **Freighter Wallet** browser extension — [freighter.app](https://freighter.app)
- **Pinata account** — for IPFS uploads ([pinata.cloud](https://pinata.cloud))

---

### 1. Clone the Repository

```bash
git clone https://github.com/AstronLabs/nexusGuard.git
cd nexusGuard
```

---

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_FACTORY_CONTRACT_ID=CAWXDSZM52E5BW7G6TFX7DTXSHF7F75TUSSWW7B442NBEU3CADXNVTXH
NEXT_PUBLIC_USDC_TOKEN_ID=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
NEXT_PUBLIC_DEPLOYER_ADDRESS=GALK2FN3QXLETSVMUEVWR4IE2FYEFEMWZR2QXU5EU6APVJVATFLS7HON
NEXT_PUBLIC_SMART_ACCOUNT_CONTRACT_ID=CCERWUE35WN7M4PN6XYK7CDCJZX35TC53TFATJNBRA6I3FDS3RVS65YF
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret
```

Run the dev server:

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`

---

### 3. Contract Deployment (Soroban)

Contracts are already deployed on Stellar Testnet (see addresses above). To redeploy:

```bash
cd contracts
```

Create `contracts/.env`:

```env
STELLAR_SOURCE_ACCOUNT=nexusguard-deployer
FACTORY_ADMIN=<your_stellar_address>
POOL_TOKEN_ADDRESS=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
```

Run the deploy script:

```bash
bash scripts/deploy-pool-testnet.sh
```

This builds both contracts, uploads the Pool WASM, deploys the Factory, initialises it, and writes all addresses back to `contracts/.env` and `frontend/.env.local` automatically.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT
