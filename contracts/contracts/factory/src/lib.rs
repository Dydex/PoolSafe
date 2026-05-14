#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String, Vec};

// ── Storage Keys ────────────────────────────────────────────────
#[contracttype]
pub enum DataKey {
    Admin,
    PoolWasmHash,
    TokenAddress,
    PoolCount,
    ActivePoolCount,
    /// Pool address by index: PoolAt(index)
    PoolAt(u64),
    /// Pool metadata CID: PoolMeta(pool_address)
    PoolMeta(Address),
    /// Whether a pool address is registered
    PoolRegistered(Address),
    /// Whether a pool is paused
    PoolPaused(Address),
    /// Pools created by a specific creator: CreatorPoolCount(creator)
    CreatorPoolCount(Address),
    /// Creator pool at index: CreatorPoolAt(creator, index)
    CreatorPoolAt(Address, u64),
}

// ── Pool Record ─────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug)]
pub struct PoolRecord {
    pub address: Address,
    pub creator: Address,
    pub metadata_cid: String,
    pub created_at: u64,
    pub paused: bool,
}

#[contract]
pub struct FactoryContract;

#[contractimpl]
impl FactoryContract {
    /// Initialize the factory with admin, pool WASM hash, and USDC token address.
    pub fn initialize(
        env: Env,
        admin: Address,
        pool_wasm_hash: BytesN<32>,
        token_address: Address,
    ) {
        admin.require_auth();

        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PoolWasmHash, &pool_wasm_hash);
        env.storage()
            .instance()
            .set(&DataKey::TokenAddress, &token_address);
        env.storage().instance().set(&DataKey::PoolCount, &0u64);
        env.storage()
            .instance()
            .set(&DataKey::ActivePoolCount, &0u64);
    }

    /// Deploy a new pool contract via the factory.
    /// The pool WASM is deployed with a deterministic salt derived from pool count.
    /// After deployment, the pool is initialized with the creator, token, and parameters.
    pub fn create_pool(
        env: Env,
        creator: Address,
        name: String,
        description: String,
        category: u32,
        fixed_contribution: i128,
        max_members: u32,
        metadata_cid: String,
    ) -> Address {
        creator.require_auth();

        let pool_wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::PoolWasmHash)
            .expect("not initialized");

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .expect("not initialized");

        let mut pool_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::PoolCount)
            .unwrap_or(0);

        // Create a deterministic salt from pool count
        let salt = Self::pool_salt(&env, pool_count);

        // Deploy the pool WASM
        let pool_address = env
            .deployer()
            .with_current_contract(salt)
            .deploy_v2(pool_wasm_hash, ());

        // Initialize the pool contract via cross-contract call
        let pool_client = PoolInitClient::new(&env, &pool_address);
        pool_client.initialize(
            &creator,
            &token_address,
            &name,
            &description,
            &category,
            &fixed_contribution,
            &max_members,
        );

        let now = env.ledger().timestamp();

        // Store pool record
        let record = PoolRecord {
            address: pool_address.clone(),
            creator: creator.clone(),
            metadata_cid: metadata_cid.clone(),
            created_at: now,
            paused: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::PoolAt(pool_count), &record);
        env.storage()
            .persistent()
            .set(&DataKey::PoolRegistered(pool_address.clone()), &true);
        env.storage()
            .persistent()
            .set(&DataKey::PoolMeta(pool_address.clone()), &metadata_cid);
        env.storage()
            .persistent()
            .set(&DataKey::PoolPaused(pool_address.clone()), &false);

        // Track creator's pools
        let creator_count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::CreatorPoolCount(creator.clone()))
            .unwrap_or(0);
        env.storage().persistent().set(
            &DataKey::CreatorPoolAt(creator.clone(), creator_count),
            &pool_address,
        );
        env.storage().persistent().set(
            &DataKey::CreatorPoolCount(creator.clone()),
            &(creator_count + 1),
        );

        pool_count += 1;
        env.storage()
            .instance()
            .set(&DataKey::PoolCount, &pool_count);

        let active: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ActivePoolCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::ActivePoolCount, &(active + 1));

        env.events().publish(
            ("factory", "pool_created"),
            (pool_address.clone(), creator, now),
        );

        pool_address
    }

    /// Pause a pool — only admin or pool creator can pause.
    pub fn pause_pool(env: Env, caller: Address, pool_address: Address) {
        caller.require_auth();

        let is_admin = Self::is_admin(&env, &caller);
        let record = Self::get_pool_record_by_address(&env, &pool_address);
        assert!(
            is_admin || caller == record.creator,
            "unauthorized: not admin or creator"
        );
        assert!(!record.paused, "pool already paused");

        env.storage()
            .persistent()
            .set(&DataKey::PoolPaused(pool_address.clone()), &true);

        // Update record
        Self::update_pool_paused(&env, &pool_address, true);

        let active: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ActivePoolCount)
            .unwrap_or(1);
        if active > 0 {
            env.storage()
                .instance()
                .set(&DataKey::ActivePoolCount, &(active - 1));
        }

        env.events()
            .publish(("factory", "pool_paused"), (pool_address, caller));
    }

    /// Unpause a pool — only admin can unpause.
    pub fn unpause_pool(env: Env, admin: Address, pool_address: Address) {
        admin.require_auth();
        Self::require_admin(&env, &admin);

        let record = Self::get_pool_record_by_address(&env, &pool_address);
        assert!(record.paused, "pool not paused");

        env.storage()
            .persistent()
            .set(&DataKey::PoolPaused(pool_address.clone()), &false);

        Self::update_pool_paused(&env, &pool_address, false);

        let active: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ActivePoolCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::ActivePoolCount, &(active + 1));

        env.events()
            .publish(("factory", "pool_unpaused"), (pool_address, admin));
    }

    /// Update the pool WASM hash for future deployments.
    pub fn update_pool_wasm(env: Env, admin: Address, new_wasm_hash: BytesN<32>) {
        admin.require_auth();
        Self::require_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PoolWasmHash, &new_wasm_hash);
    }

    // ── View Functions ──────────────────────────────────────────

    /// Get a pool record by index.
    pub fn get_pool(env: Env, index: u64) -> PoolRecord {
        env.storage()
            .persistent()
            .get(&DataKey::PoolAt(index))
            .expect("pool not found")
    }

    /// Get all pool records.
    pub fn get_all_pools(env: Env) -> Vec<PoolRecord> {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::PoolCount)
            .unwrap_or(0);
        let mut pools = Vec::new(&env);
        for i in 0..count {
            if let Some(record) = env
                .storage()
                .persistent()
                .get::<_, PoolRecord>(&DataKey::PoolAt(i))
            {
                pools.push_back(record);
            }
        }
        pools
    }

    /// Get pools created by a specific address.
    pub fn get_pools_by_creator(env: Env, creator: Address) -> Vec<Address> {
        let count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::CreatorPoolCount(creator.clone()))
            .unwrap_or(0);
        let mut pools = Vec::new(&env);
        for i in 0..count {
            if let Some(addr) = env
                .storage()
                .persistent()
                .get::<_, Address>(&DataKey::CreatorPoolAt(creator.clone(), i))
            {
                pools.push_back(addr);
            }
        }
        pools
    }

    /// Get the metadata CID for a pool.
    pub fn get_pool_metadata(env: Env, pool_address: Address) -> String {
        env.storage()
            .persistent()
            .get(&DataKey::PoolMeta(pool_address))
            .expect("pool metadata not found")
    }

    /// Check if a pool is paused.
    pub fn is_pool_paused(env: Env, pool_address: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::PoolPaused(pool_address))
            .unwrap_or(false)
    }

    /// Check if an address is a registered pool.
    pub fn is_registered_pool(env: Env, pool_address: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::PoolRegistered(pool_address))
            .unwrap_or(false)
    }

    /// Total number of pools created.
    pub fn pool_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::PoolCount)
            .unwrap_or(0)
    }

    /// Number of active (non-paused) pools.
    pub fn active_pool_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::ActivePoolCount)
            .unwrap_or(0)
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized")
    }

    // ── Internal ────────────────────────────────────────────────

    fn pool_salt(env: &Env, index: u64) -> BytesN<32> {
        let mut salt_bytes = [0u8; 32];
        let idx_bytes = index.to_be_bytes();
        salt_bytes[24..32].copy_from_slice(&idx_bytes);
        BytesN::from_array(env, &salt_bytes)
    }

    fn require_admin(env: &Env, addr: &Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        assert!(*addr == admin, "unauthorized: not admin");
    }

    fn is_admin(env: &Env, addr: &Address) -> bool {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        *addr == admin
    }

    fn get_pool_record_by_address(env: &Env, pool_address: &Address) -> PoolRecord {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::PoolCount)
            .unwrap_or(0);
        for i in 0..count {
            if let Some(record) = env
                .storage()
                .persistent()
                .get::<_, PoolRecord>(&DataKey::PoolAt(i))
            {
                if record.address == *pool_address {
                    return record;
                }
            }
        }
        panic!("pool not found");
    }

    fn update_pool_paused(env: &Env, pool_address: &Address, paused: bool) {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::PoolCount)
            .unwrap_or(0);
        for i in 0..count {
            if let Some(mut record) = env
                .storage()
                .persistent()
                .get::<_, PoolRecord>(&DataKey::PoolAt(i))
            {
                if record.address == *pool_address {
                    record.paused = paused;
                    env.storage().persistent().set(&DataKey::PoolAt(i), &record);
                    return;
                }
            }
        }
    }
}

// ── Cross-contract interface for Pool initialization ────────────
// This trait defines the init function the factory calls on deployed pools.
#[soroban_sdk::contractclient(name = "PoolInitClient")]
pub trait PoolInit {
    fn initialize(
        env: Env,
        creator: Address,
        token: Address,
        name: String,
        description: String,
        category: u32,
        fixed_contribution: i128,
        max_members: u32,
    );
}

// ════════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════════

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register(FactoryContract, ());
        let client = FactoryContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let wasm_hash = BytesN::from_array(&env, &[0u8; 32]);

        env.mock_all_auths();
        client.initialize(&admin, &wasm_hash, &token);

        assert_eq!(client.pool_count(), 0);
        assert_eq!(client.active_pool_count(), 0);
        assert_eq!(client.admin(), admin);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize() {
        let env = Env::default();
        let contract_id = env.register(FactoryContract, ());
        let client = FactoryContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let wasm_hash = BytesN::from_array(&env, &[0u8; 32]);

        env.mock_all_auths();
        client.initialize(&admin, &wasm_hash, &token);
        client.initialize(&admin, &wasm_hash, &token);
    }
}
