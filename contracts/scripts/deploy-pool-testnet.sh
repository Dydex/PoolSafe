#!/usr/bin/env bash
set -euo pipefail

# ── NexusGuard Testnet Deployment ─────────────────────────────────
# Deploys: Factory contract + Pool WASM (uploaded for factory use)
#
# Environment variables:
#   STELLAR_SOURCE_ACCOUNT  - Stellar identity name (default: nexusguard-deployer)
#   POOL_TOKEN_ADDRESS      - USDC token contract address on testnet
#   FACTORY_ADMIN           - Admin address for the factory (default: deployer public key)

if ! command -v stellar >/dev/null 2>&1; then
  echo "Stellar CLI is required. Install it with: cargo install stellar-cli"
  exit 1
fi

SOURCE_ACCOUNT="${STELLAR_SOURCE_ACCOUNT:-nexusguard-deployer}"
TOKEN_ADDRESS="${POOL_TOKEN_ADDRESS:-}"
POOL_WASM="target/wasm32v1-none/release/nexusguard_pool.wasm"
FACTORY_WASM="target/wasm32v1-none/release/nexusguard_factory.wasm"

cd "$(dirname "$0")/.."

# ── 1. Generate identity if needed ────────────────────────────────
if ! stellar keys public-key "$SOURCE_ACCOUNT" >/dev/null 2>&1; then
  echo "Creating and funding Stellar testnet identity: $SOURCE_ACCOUNT"
  stellar keys generate "$SOURCE_ACCOUNT" --network testnet --fund
fi

ADMIN_ADDRESS="${FACTORY_ADMIN:-$(stellar keys public-key "$SOURCE_ACCOUNT")}"

# ── 2. Build contracts ───────────────────────────────────────────
echo "Building contracts..."
stellar contract build --package nexusguard-pool
stellar contract build --package nexusguard-factory

# ── 3. Upload pool WASM and get hash ─────────────────────────────
echo "Uploading pool WASM..."
POOL_WASM_HASH="$(
  stellar contract install \
    --wasm "$POOL_WASM" \
    --source-account "$SOURCE_ACCOUNT" \
    --network testnet
)"
echo "Pool WASM hash: $POOL_WASM_HASH"

# ── 4. Deploy factory contract ───────────────────────────────────
echo "Deploying factory contract..."
FACTORY_ID="$(
  stellar contract deploy \
    --wasm "$FACTORY_WASM" \
    --source-account "$SOURCE_ACCOUNT" \
    --network testnet
)"
echo "Factory contract: $FACTORY_ID"

# ── 5. Initialize factory ────────────────────────────────────────
if [ -n "$TOKEN_ADDRESS" ]; then
  echo "Initializing factory..."
  stellar contract invoke \
    --id "$FACTORY_ID" \
    --source-account "$SOURCE_ACCOUNT" \
    --network testnet \
    -- initialize \
    --admin "$ADMIN_ADDRESS" \
    --pool_wasm_hash "$POOL_WASM_HASH" \
    --token_address "$TOKEN_ADDRESS"

  echo "Factory initialized."
else
  echo ""
  echo "Factory deployed but NOT initialized."
  echo "Set POOL_TOKEN_ADDRESS and run:"
  echo "  stellar contract invoke --id $FACTORY_ID --source-account $SOURCE_ACCOUNT --network testnet -- initialize --admin $ADMIN_ADDRESS --pool_wasm_hash $POOL_WASM_HASH --token_address <USDC_ADDRESS>"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo " Deployment Summary"
echo "═══════════════════════════════════════════════"
echo " Factory:     $FACTORY_ID"
echo " Pool WASM:   $POOL_WASM_HASH"
echo " Admin:       $ADMIN_ADDRESS"
echo " Token:       ${TOKEN_ADDRESS:-<not set>}"
echo "═══════════════════════════════════════════════"
