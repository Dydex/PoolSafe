# NexusGuard — Full Implementation Plan

## Overview

NexusGuard is a decentralized microinsurance DApp built on Stellar Testnet using Soroban smart contracts.

Core Features:
- Factory contract for insurance pool creation
- Pool-based microinsurance system
- Multisig/quorum-based claim approval
- Smart Accounts integration
- x402 payments/authentication
- Pinata/IPFS file uploads
- Stellar wallet integration (Freighter + others)
- Node.js backend
- Next.js frontend

---

# 1. Tech Stack

## Frontend
- Next.js 15
- TypeScript
- TailwindCSS
- Stellar Wallets Kit
- Soroban Client SDK
- Zustand or Context API

## Backend
- Node.js
- Express
- TypeScript
- Sqlite
- Pinata SDK
- x402 middleware
- Soroban RPC SDK

## Smart Contracts
- Rust
- Soroban SDK

## Infrastructure
- Vercel (frontend)
- Pinata (IPFS)
- Stellar Testnet

---
### 2. x402 Payment Layer Integration

The x402 middleware will protect specific backend routes to:
- **Anti-spam**: Gate claim submissions behind a micro-payment (e.g., 0.01 USDC) to prevent spam claims
- **Payment verification**: Automatically verify that the caller has paid before processing requests
- **Automatic micropayments**: Enable machine-to-machine payments for automated services (keeper bots, etc.)

**Protected Routes:**
| Route | Payment Amount | Purpose |
|---|---|---|
| `POST /api/claims/submit` | 0.01 USDC | Anti-spam claim submission |
| `POST /api/ipfs/upload` | 0.005 USDC | IPFS upload cost recovery |
| `GET /api/claims/:id/verify` | 0.001 USDC | Detailed claim verification report |

**Non-protected Routes:**
| Route | Purpose |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/pools` | Public pool listing |
| `GET /api/notifications/:address` | User notifications |

# 3. Smart Contract Architecture

## A. Factory Contract

Responsibilities:
- Create pools
- Track pools
- Register metadata
- Emit events

Functions:
```rust
create_pool()
get_pool()
get_all_pools()
pause_pool()
```

Storage:
```rust
PoolId => PoolAddress
PoolAddress => MetadataCID
Creator => Pools[]
```

---

## B. Pool Contract
Each pool should have a max of 30 members 

Responsibilities:
- Accept deposits
- Track members
- Handle claims
- Governance voting
- Execute payouts

Pool Structure:
```rust
struct Pool {
    id: u64,
    creator: Address,
    premium: i128,
    total_funds: i128,
    quorum_percentage: u32,
    voting_period: u64,
    active: bool,
}
```

---

# 4. Claim System

Claim Flow:
1. User uploads evidence
2. Backend uploads to Pinata
3. Backend returns CID
4. User submits claim transaction and voters get notifications through backend system
5. Members vote
6. Quorum reached
7. Payout executed

Claim Structure:
```rust
struct Claim {
    claimant: Address,
    amount: i128,
    evidence_cid: String,
    votes_for: u32,
    votes_against: u32,
    deadline: u64,
    executed: bool,
}
```

---

# 5. Quorum / Multisig Logic

Governance Model:
- Pool managers or members vote
- Quorum percentage required (60%)
- Voting deadline enforced
30 people x 0.4 = 12 voters

Quorum Formula:
Quorum = (Votes For / Total Eligible Voters) * 100

If quorum >= threshold:
- claim approved

Else:
- claim rejected
---

# 6. Smart Account Integration

Use Smart Accounts for:
- recurring premium payments
- session keys
- spending limits
- delegated voting
- wallet recovery
- programmable permissions

Features:
- auto-pay premiums
- reduced wallet popups
- social recovery
- delegated governance

---

# 7. x402 Integration

Use x402 for:
- anti-spam claim submission
- premium analytics APIs
- fraud detection APIs
- pay-per-request services

Examples:
```txt
Submit Claim -> x402 microfee
Analytics API -> x402 protected
Fraud Detection -> x402 access
```

---

# 8. Backend Responsibilities

Backend should NOT control funds.

Backend Responsibilities:
- Pinata uploads
- indexing blockchain events
- metadata serving
- Notifications for signers
- analytics
- x402 verification
- caching

---


# 10. Pinata Integration

Upload Flow:
```txt
Frontend
   ↓
POST /upload
   ↓
Backend uploads to Pinata
   ↓
Returns CID
   ↓
CID stored in contract
```

Metadata Example:
```json
{
  "title": "Hospitalization Claim",
  "description": "Medical emergency",
  "documents": [
    "ipfs://CID1",
    "ipfs://CID2"
  ]
}
```

---

# 12. Frontend Pages

Public Pages:
- landing page
- explore pools
- pool details
- governance transparency
- docs

Authenticated Pages:
- dashboard
- create pool
- submit claim
- vote on claims
- analytics

you can add based on what you think is needed 
---

# 14. Wallet Integration

Integrate:
- Freighter
- Albedo
- WalletConnect-compatible Stellar wallets

Use:
- Stellar Wallets Kit
- Soroban client SDK

Wallet Flow:
```txt
Connect Wallet
    ↓
Choose Wallet
    ↓
Get Public Key
    ↓
Store Session
```


# 15. User Flows

## Create Pool
```txt
Connect Wallet
    ↓
Fill Form
    ↓
Upload Metadata
    ↓
Factory Deploys Pool
    ↓
Pool Added To Explorer
```

## Submit Claim
```txt
Upload Evidence
    ↓
Pinata Returns CID
    ↓
submit_claim()
    ↓
Voting Starts
    ↓
Quorum Reached
    ↓
Payout Executed
```

---

# 16. Security Features

Must Implement:
- reentrancy protection
- claim cooldowns
- payout caps
- emergency pause
- role-based permissions

Roles:
- creator
- manager
- member

---

# 18. Governance Enhancements

Future Governance:
- weighted voting
- delegated voting
- community auditors
- contribution-based voting power

---



# 22. UI/UX Recommendations

Use:
- governance timelines
- claim statuses
- risk indicators
- voting activity feeds
- transparent claim history
- Signers for pools should have a page that renders only for signers and shows pools and claims they need to vote on

Microinsurance requires high-trust UX.

---
Core Principle:
- backend never controls user funds
- governance controls payouts
- transparent claim system
- decentralized insurance pools

Integrate the frontend to use the contract data deployed on stellar testnet instead of mockdata 
The pool use usdc only 

Deployer address
GDOTQ27K64VCHPHLHBYCFOF523VOEKOK6PCVRFWC3ZL6FCQCPX7RQEO2



