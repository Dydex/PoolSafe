
## Overview

**PoolSafe** is a decentralized peer-to-peer microinsurance platform designed for Nigeria's uninsured majority. It enables small groups of people (10–30 members) to form **cover pools** for specific everyday risks — like phone screen cracks, minor medical emergencies, and laptop theft — and collectively protect each other through transparent, blockchain-enforced rules.

No insurance company. No middleman. Just people protecting people, powered by Stellar.

---

## The Problem

Most Nigerians don't have **insurance**. The formal insurance industry is:

- **Expensive** — premiums are unaffordable for the average student or young professional
- **Slow** — claims take weeks or months to process
- **Deeply distrusted** — opaque processes and denied claims have eroded confidence

Meanwhile, **everyday financial shocks are constant**:

| Risk Category      | Example                                 |
|--------------------|-----------------------------------------|
| Phone Damage       | Cracked screen, water damage            |   
| Medical Emergency  | Hospital visit, prescriptions           | 
| Device Theft       | Stolen laptop, snatched phone           |
| Minor Accidents    | Minor road accident repairs             | 

---

## The Solution

PoolSafe takes the **age-old concept of community risk-sharing** and puts it on-chain with transparent, enforceable rules.

### How It Works

1. **Create a Pool** — A user creates a cover pool for a specific risk (e.g. "Phone Damage Cover") with defined parameters: max members, weekly contribution amount, maximum payout per claim, and voting quorum.

2. **Join & Contribute** — Members join the pool and make small weekly contributions.

3. **File a Claim** — When a covered event happens, a member submits a claim with evidence. The claim amount must be within the pool's maximum payout limit.

4. **Peer Voting** — All pool members review the claim and vote: **approve**, **reject**, or **abstain**. The claim must reach a configurable quorum (e.g. 60% approval) within a voting window.

5. **Payout or Rollover** — Approved claims trigger an automatic on-chain payout to the claimant. Unclaimed funds roll over to the next period or are **returned to members quarterly** as a dividend.

### Key Design Principles

- **Transparency** — All contributions, claims, and votes are recorded on the Stellar blockchain
- **Trust Minimization** — Smart contracts enforce rules; no single admin can steal funds
- **Community Governance** — Pool members collectively decide on claims through democratic voting
- **Micro-Affordability** — Low Contributions make coverage accessible to students and gig workers
- **Quarterly Returns** — Unclaimed funds aren't lost; they're returned to contributors proportionally

---

### Data Flow

1. **User** connects their Stellar wallet via the Next.js frontend
2. **Pool interactions** (create, join, contribute) are sent directly to Soroban smart contracts via the Stellar SDK
3. **Claims & voting** transactions are submitted on-chain for full transparency
4. **Next.js API routes** handle any off-chain needs (event indexing, notifications)
5. All **funds are held in smart contracts** — no custodial backend

---

## Tech Stack

| Layer           | Technology                          | Purpose                                       |
|-----------------|-------------------------------------|-----------------------------------------------|
| **Frontend**    | Next.js 16 (App Router, TypeScript) | Server-rendered UI with React 19              |
| **Wallet**      | Freighter Wallet                    | Stellar wallet connection and tx signing      |
| **State**       | Zustand                             | Lightweight client-side state management      |
| **Blockchain**  | Stellar (Soroban)                   | Smart contract platform for on-chain logic    |
| **Contracts**   | Rust (Soroban SDK)                  | Five modular smart contracts                  |
| **SDK**         | @stellar/stellar-sdk                | JavaScript SDK for Stellar/Soroban interaction|

---

## Project Structure

```
PoolSafe/
├── README.md
├── .gitignore
│
├── frontend/                           # Next.js 16 application
│   ├── src/
│   │   ├── app/                        # Next.js App Router pages
│   │   ├── components/
│   │   │   ├── pools/                 # Pool management UI components
│   │   │   │   ├── PoolCard.tsx
│   │   │   │   ├── PoolList.tsx
│   │   │   │   ├── CreatePoolForm.tsx
│   │   │   │   ├── JoinPoolModal.tsx
│   │   │   │   └── PoolDetails.tsx
│   │   │   ├── claims/                # Claim submission & tracking
│   │   │   │   ├── ClaimForm.tsx
│   │   │   │   ├── ClaimCard.tsx
│   │   │   │   ├── ClaimList.tsx
│   │   │   │   └── ClaimTimeline.tsx
│   │   │   ├── voting/                # Peer voting interface
│   │   │   │   ├── VotingPanel.tsx
│   │   │   │   ├── VoteCard.tsx
│   │   │   │   └── VotingResults.tsx
│   │   │   ├── dashboard/             # User dashboard & analytics
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── StatsOverview.tsx
│   │   │   │   ├── ActivityFeed.tsx
│   │   │   │   └── PoolSummary.tsx
│   │   │   ├── layout/                # App shell components
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   └── shared/                # Reusable UI primitives
│   │   │       ├── Button.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Avatar.tsx
│   │   │       ├── Badge.tsx
│   │   │       └── Loader.tsx
│   │   ├── hooks/                      # Custom React hooks
│   │   │   ├── useWallet.ts           # Freighter wallet connection
│   │   │   ├── usePools.ts            # Pool CRUD operations
│   │   │   ├── useClaims.ts           # Claim management
│   │   │   ├── useVoting.ts           # Vote submission & results
│   │   │   └── useSoroban.ts          # Generic Soroban contract calls
│   │   ├── lib/                        # Core libraries
│   │   │   ├── stellar.ts             # Stellar SDK configuration
│   │   │   ├── soroban.ts             # Soroban client helpers
│   │   │   └── utils.ts               # General utilities
│   │   ├── services/                   # API client services
│   │   │   ├── api.ts                 # Base API client (fetch wrapper)
│   │   │   ├── pool.service.ts
│   │   │   ├── claim.service.ts
│   │   │   └── vote.service.ts
│   │   ├── types/                      # Shared TypeScript types
│   │   │   ├── pool.types.ts
│   │   │   ├── claim.types.ts
│   │   │   ├── vote.types.ts
│   │   │   ├── user.types.ts
│   │   │   └── index.ts
│   │   ├── context/                    # React context providers
│   │   │   ├── WalletContext.tsx
│   │   │   └── PoolContext.tsx
│   │   └── styles/                     # Global CSS
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
│
└── contracts/                          # Soroban smart contracts (Rust)
    ├── Cargo.toml                      # Workspace manifest
    └── contracts/
        ├── pool/                       # Cover pool management
        │   ├── Cargo.toml
        │   └── src/lib.rs
        ├── claims/                     # Claim submission & payouts
        │   ├── Cargo.toml
        │   └── src/lib.rs
        ├── voting/                     # Peer voting engine
        │   ├── Cargo.toml
        │   └── src/lib.rs
        ├── governance/                 # Pool parameter governance
        │   ├── Cargo.toml
        │   └── src/lib.rs
        └── token/                      # Contribution tracking token
            ├── Cargo.toml
            └── src/lib.rs
```
---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- **Rust** (latest stable) — for Soroban contract development
- **Stellar CLI** — `cargo install stellar-cli` (for contract building & deployment)

---
## Contributing

We welcome contributions! Please check [issues](issues) tab .

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT 

---
