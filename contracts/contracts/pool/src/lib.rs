#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String, Vec};

// ── Constants ───────────────────────────────────────────────────
const MAX_POOL_MEMBERS: u32 = 30;
const QUORUM_PERCENTAGE: u32 = 60;
const YEAR_IN_SECONDS: u64 = 365 * 24 * 60 * 60;
const DEFAULT_CLAIM_COOLDOWN: u64 = 86_400; // 24 hours between claims
const DEFAULT_MAX_PAYOUT_PERCENT: u32 = 50; // max 50% of pool per claim

// ── Storage Keys ────────────────────────────────────────────────
#[contracttype]
pub enum DataKey {
    // Pool config
    Creator,
    TokenAddress,
    PoolName,
    PoolDescription,
    PoolCategory,
    FixedContribution,
    MaxMembers,
    MemberCount,
    Balance,
    TotalPaidClaims,
    TotalApprovedClaims,
    CreatedAt,
    ExpiresAt,
    Status,
    Paused,
    // Roles
    Manager(Address),
    // Members
    Member(Address),
    MemberAt(u32),
    // Claims
    ClaimCount,
    Claim(u64),
    ClaimVote(u64, Address),
    UserClaimCount(Address),
    UserLastClaimTime(Address),
    // Pool claims list for querying
    PoolClaimAt(u64),
    // Payout cap
    MaxPayoutPercent,
    // Cooldown
    ClaimCooldown,
}

// ── Pool Category ───────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum PoolCategory {
    Health,
    Crop,
    Property,
    Vehicle,
    Travel,
    Business,
    Other,
}

impl PoolCategory {
    pub fn from_u32(val: u32) -> Self {
        match val {
            0 => PoolCategory::Health,
            1 => PoolCategory::Crop,
            2 => PoolCategory::Property,
            3 => PoolCategory::Vehicle,
            4 => PoolCategory::Travel,
            5 => PoolCategory::Business,
            _ => PoolCategory::Other,
        }
    }
}

// ── Pool Status ─────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum PoolStatus {
    Active,
    Matured,
    Closed,
}

// ── Claim Status ────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ClaimStatus {
    PendingReview,
    Approved,
    Rejected,
    Resolved,
}

// ── Vote Choice ─────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum VoteChoice {
    Approve,
    Reject,
}

// ── Claim Record ────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug)]
pub struct Claim {
    pub id: u64,
    pub claimant: Address,
    pub amount: i128,
    pub description: String,
    pub evidence_cid: String,
    pub status: ClaimStatus,
    pub votes_for: u32,
    pub votes_against: u32,
    pub submitted_at: u64,
    pub deadline: u64,
    pub updated_at: u64,
    pub executed: bool,
}

// ── Pool Summary (for view queries) ─────────────────────────────
#[contracttype]
#[derive(Clone, Debug)]
pub struct PoolSummary {
    pub creator: Address,
    pub name: String,
    pub description: String,
    pub category: PoolCategory,
    pub fixed_contribution: i128,
    pub max_members: u32,
    pub member_count: u32,
    pub balance: i128,
    pub total_paid_claims: i128,
    pub total_approved_claims: i128,
    pub created_at: u64,
    pub expires_at: u64,
    pub status: PoolStatus,
    pub paused: bool,
    pub claim_count: u64,
}

// ── Member Role ─────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Role {
    Creator,
    Manager,
    Member,
}

#[contract]
pub struct PoolContract;

#[contractimpl]
impl PoolContract {
    // ════════════════════════════════════════════════════════════
    // INITIALIZATION (called by Factory)
    // ════════════════════════════════════════════════════════════

    pub fn initialize(
        env: Env,
        creator: Address,
        token: Address,
        name: String,
        description: String,
        category: u32,
        fixed_contribution: i128,
        max_members: u32,
    ) {
        if env.storage().instance().has(&DataKey::Creator) {
            panic!("already initialized");
        }

        assert!(fixed_contribution > 0, "contribution must be positive");
        assert!(max_members > 0, "max members must be positive");
        assert!(max_members <= MAX_POOL_MEMBERS, "pool member cap is 30");

        let now = env.ledger().timestamp();
        let cat = PoolCategory::from_u32(category);

        env.storage().instance().set(&DataKey::Creator, &creator);
        env.storage()
            .instance()
            .set(&DataKey::TokenAddress, &token);
        env.storage().instance().set(&DataKey::PoolName, &name);
        env.storage()
            .instance()
            .set(&DataKey::PoolDescription, &description);
        env.storage().instance().set(&DataKey::PoolCategory, &cat);
        env.storage()
            .instance()
            .set(&DataKey::FixedContribution, &fixed_contribution);
        env.storage()
            .instance()
            .set(&DataKey::MaxMembers, &max_members);
        env.storage()
            .instance()
            .set(&DataKey::MemberCount, &0u32);
        env.storage().instance().set(&DataKey::Balance, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::TotalPaidClaims, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::TotalApprovedClaims, &0i128);
        env.storage().instance().set(&DataKey::CreatedAt, &now);
        env.storage()
            .instance()
            .set(&DataKey::ExpiresAt, &(now + YEAR_IN_SECONDS));
        env.storage()
            .instance()
            .set(&DataKey::Status, &PoolStatus::Active);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage()
            .instance()
            .set(&DataKey::ClaimCount, &0u64);
        env.storage()
            .instance()
            .set(&DataKey::MaxPayoutPercent, &DEFAULT_MAX_PAYOUT_PERCENT);
        env.storage()
            .instance()
            .set(&DataKey::ClaimCooldown, &DEFAULT_CLAIM_COOLDOWN);

        env.events()
            .publish(("pool", "initialized"), (creator, fixed_contribution, now));
    }

    // ════════════════════════════════════════════════════════════
    // ROLE MANAGEMENT
    // ════════════════════════════════════════════════════════════

    /// Add a manager to the pool. Only the creator can add managers.
    pub fn add_manager(env: Env, caller: Address, manager: Address) {
        caller.require_auth();
        Self::require_creator(&env, &caller);
        Self::require_not_paused(&env);

        env.storage()
            .persistent()
            .set(&DataKey::Manager(manager.clone()), &true);

        env.events()
            .publish(("pool", "manager_added"), (manager, caller));
    }

    /// Remove a manager. Only the creator can remove managers.
    pub fn remove_manager(env: Env, caller: Address, manager: Address) {
        caller.require_auth();
        Self::require_creator(&env, &caller);

        env.storage()
            .persistent()
            .set(&DataKey::Manager(manager.clone()), &false);

        env.events()
            .publish(("pool", "manager_removed"), (manager, caller));
    }

    /// Check the role of an address in this pool.
    pub fn get_role(env: Env, addr: Address) -> Role {
        let creator: Address = env
            .storage()
            .instance()
            .get(&DataKey::Creator)
            .expect("not initialized");
        if addr == creator {
            return Role::Creator;
        }
        let is_manager: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Manager(addr.clone()))
            .unwrap_or(false);
        if is_manager {
            return Role::Manager;
        }
        Role::Member
    }

    // ════════════════════════════════════════════════════════════
    // MEMBERSHIP
    // ════════════════════════════════════════════════════════════

    /// Join the pool by paying the fixed contribution in USDC.
    pub fn join_pool(env: Env, member: Address) {
        member.require_auth();
        Self::require_not_paused(&env);
        Self::require_active(&env);

        let max_members: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MaxMembers)
            .unwrap_or(MAX_POOL_MEMBERS);
        let mut member_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MemberCount)
            .unwrap_or(0);

        assert!(member_count < max_members, "pool is full");
        assert!(
            !Self::is_member_internal(&env, &member),
            "already a pool member"
        );

        let fixed_contribution: i128 = env
            .storage()
            .instance()
            .get(&DataKey::FixedContribution)
            .expect("not initialized");
        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .expect("not initialized");

        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(
            &member,
            &env.current_contract_address(),
            &fixed_contribution,
        );

        env.storage()
            .persistent()
            .set(&DataKey::Member(member.clone()), &true);
        env.storage()
            .persistent()
            .set(&DataKey::MemberAt(member_count), &member);

        member_count += 1;
        env.storage()
            .instance()
            .set(&DataKey::MemberCount, &member_count);

        let mut balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance)
            .unwrap_or(0);
        balance += fixed_contribution;
        env.storage().instance().set(&DataKey::Balance, &balance);

        env.events().publish(
            ("pool", "member_joined"),
            (member, fixed_contribution, member_count),
        );
    }

    // ════════════════════════════════════════════════════════════
    // CLAIMS
    // ════════════════════════════════════════════════════════════

    /// Submit a new insurance claim with evidence CID.
    pub fn submit_claim(
        env: Env,
        claimant: Address,
        amount: i128,
        description: String,
        evidence_cid: String,
        review_period_seconds: u64,
    ) -> u64 {
        claimant.require_auth();
        Self::require_not_paused(&env);
        Self::require_active(&env);

        assert!(amount > 0, "claim amount must be positive");
        assert!(review_period_seconds > 0, "review period must be positive");
        assert!(
            Self::is_member_internal(&env, &claimant),
            "claimant must be a pool member"
        );

        // Enforce payout cap
        let balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance)
            .unwrap_or(0);
        let max_payout_pct: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MaxPayoutPercent)
            .unwrap_or(DEFAULT_MAX_PAYOUT_PERCENT);
        let max_payout = (balance * max_payout_pct as i128) / 100;
        assert!(
            amount <= max_payout,
            "claim exceeds maximum payout cap"
        );
        assert!(balance >= amount, "claim exceeds pool balance");

        // Enforce cooldown
        let cooldown: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ClaimCooldown)
            .unwrap_or(DEFAULT_CLAIM_COOLDOWN);
        let now = env.ledger().timestamp();
        let last_claim_time: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::UserLastClaimTime(claimant.clone()))
            .unwrap_or(0);
        assert!(
            now >= last_claim_time + cooldown || last_claim_time == 0,
            "claim cooldown not elapsed"
        );

        let mut claim_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ClaimCount)
            .unwrap_or(0);
        let claim_id = claim_count;

        let claim = Claim {
            id: claim_id,
            claimant: claimant.clone(),
            amount,
            description,
            evidence_cid,
            status: ClaimStatus::PendingReview,
            votes_for: 0,
            votes_against: 0,
            submitted_at: now,
            deadline: now + review_period_seconds,
            updated_at: now,
            executed: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Claim(claim_id), &claim);
        env.storage()
            .persistent()
            .set(&DataKey::PoolClaimAt(claim_id), &claim_id);
        env.storage()
            .persistent()
            .set(&DataKey::UserLastClaimTime(claimant.clone()), &now);

        let user_count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::UserClaimCount(claimant.clone()))
            .unwrap_or(0);
        env.storage().persistent().set(
            &DataKey::UserClaimCount(claimant.clone()),
            &(user_count + 1),
        );

        claim_count += 1;
        env.storage()
            .instance()
            .set(&DataKey::ClaimCount, &claim_count);

        env.events().publish(
            ("claim", "submitted"),
            (claim_id, claimant, amount, claim.deadline),
        );

        claim_id
    }

    // ════════════════════════════════════════════════════════════
    // VOTING (Quorum-based)
    // ════════════════════════════════════════════════════════════

    /// Vote on a pending claim. Only pool members can vote.
    pub fn vote_on_claim(env: Env, voter: Address, claim_id: u64, choice: VoteChoice) {
        voter.require_auth();
        Self::require_not_paused(&env);

        assert!(
            Self::is_member_internal(&env, &voter),
            "voter must be a pool member"
        );

        let mut claim: Claim = env
            .storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .expect("claim not found");

        // Auto-reject if expired
        Self::reject_if_expired(&env, &mut claim);
        assert!(
            claim.status == ClaimStatus::PendingReview,
            "claim is not pending"
        );

        // Check voter hasn't already voted
        assert!(
            !env.storage()
                .persistent()
                .has(&DataKey::ClaimVote(claim_id, voter.clone())),
            "already voted on this claim"
        );

        // Record vote
        env.storage()
            .persistent()
            .set(&DataKey::ClaimVote(claim_id, voter.clone()), &choice);

        match choice {
            VoteChoice::Approve => claim.votes_for += 1,
            VoteChoice::Reject => claim.votes_against += 1,
        }
        claim.updated_at = env.ledger().timestamp();

        // Check if quorum reached
        let member_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MemberCount)
            .unwrap_or(0);
        let quorum_needed = Self::quorum_threshold(member_count);
        let total_votes = claim.votes_for + claim.votes_against;

        if total_votes >= quorum_needed {
            if claim.votes_for > claim.votes_against {
                claim.status = ClaimStatus::Approved;
                let mut total_approved: i128 = env
                    .storage()
                    .instance()
                    .get(&DataKey::TotalApprovedClaims)
                    .unwrap_or(0);
                total_approved += claim.amount;
                env.storage()
                    .instance()
                    .set(&DataKey::TotalApprovedClaims, &total_approved);

                env.events()
                    .publish(("claim", "approved"), (claim_id, claim.amount));
            } else {
                claim.status = ClaimStatus::Rejected;
                env.events()
                    .publish(("claim", "rejected_by_vote"), (claim_id, claim.amount));
            }
        }

        env.storage()
            .persistent()
            .set(&DataKey::Claim(claim_id), &claim);

        env.events()
            .publish(("claim", "vote_cast"), (claim_id, voter, total_votes));
    }

    // ════════════════════════════════════════════════════════════
    // PAYOUT EXECUTION
    // ════════════════════════════════════════════════════════════

    /// Execute payout for an approved claim. Anyone can trigger this
    /// (permissionless execution after governance approval).
    pub fn resolve_claim(env: Env, claim_id: u64) {
        Self::require_not_paused(&env);

        let mut claim: Claim = env
            .storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .expect("claim not found");

        Self::reject_if_expired(&env, &mut claim);
        assert!(
            claim.status == ClaimStatus::Approved,
            "claim must be approved"
        );
        assert!(!claim.executed, "claim already executed");

        let mut balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance)
            .unwrap_or(0);
        assert!(balance >= claim.amount, "insufficient pool balance");

        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .expect("not initialized");
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(
            &env.current_contract_address(),
            &claim.claimant,
            &claim.amount,
        );

        balance -= claim.amount;
        env.storage().instance().set(&DataKey::Balance, &balance);

        let mut total_paid: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalPaidClaims)
            .unwrap_or(0);
        total_paid += claim.amount;
        env.storage()
            .instance()
            .set(&DataKey::TotalPaidClaims, &total_paid);

        claim.status = ClaimStatus::Resolved;
        claim.executed = true;
        claim.updated_at = env.ledger().timestamp();

        env.storage()
            .persistent()
            .set(&DataKey::Claim(claim_id), &claim);

        env.events().publish(
            ("claim", "resolved"),
            (claim_id, claim.claimant, claim.amount),
        );
    }

    /// Admin/creator can reject a pending claim.
    pub fn reject_claim(env: Env, caller: Address, claim_id: u64) {
        caller.require_auth();
        Self::require_creator_or_manager(&env, &caller);

        let mut claim: Claim = env
            .storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .expect("claim not found");
        assert!(
            claim.status == ClaimStatus::PendingReview,
            "claim is not pending"
        );

        claim.status = ClaimStatus::Rejected;
        claim.updated_at = env.ledger().timestamp();

        env.storage()
            .persistent()
            .set(&DataKey::Claim(claim_id), &claim);

        env.events()
            .publish(("claim", "rejected"), (claim_id, caller));
    }

    /// Anyone can trigger rejection of an expired claim.
    pub fn reject_expired_claim(env: Env, claim_id: u64) {
        let mut claim: Claim = env
            .storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .expect("claim not found");
        Self::reject_if_expired(&env, &mut claim);
        env.storage()
            .persistent()
            .set(&DataKey::Claim(claim_id), &claim);
    }

    // ════════════════════════════════════════════════════════════
    // EMERGENCY PAUSE
    // ════════════════════════════════════════════════════════════

    /// Pause the pool — only creator or manager.
    pub fn pause(env: Env, caller: Address) {
        caller.require_auth();
        Self::require_creator_or_manager(&env, &caller);
        env.storage().instance().set(&DataKey::Paused, &true);
        env.events()
            .publish(("pool", "paused"), (caller, env.ledger().timestamp()));
    }

    /// Unpause the pool — only creator.
    pub fn unpause(env: Env, caller: Address) {
        caller.require_auth();
        Self::require_creator(&env, &caller);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.events()
            .publish(("pool", "unpaused"), (caller, env.ledger().timestamp()));
    }

    // ════════════════════════════════════════════════════════════
    // POOL LIFECYCLE
    // ════════════════════════════════════════════════════════════

    /// Close the pool after its lifecycle ends and distribute remaining funds.
    pub fn close_pool(env: Env) {
        let status: PoolStatus = env
            .storage()
            .instance()
            .get(&DataKey::Status)
            .expect("not initialized");
        assert!(status == PoolStatus::Active, "pool is not active");

        let expires_at: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ExpiresAt)
            .expect("not initialized");
        assert!(
            env.ledger().timestamp() >= expires_at,
            "pool lifecycle has not ended"
        );

        let member_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MemberCount)
            .unwrap_or(0);
        let balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance)
            .unwrap_or(0);

        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .expect("not initialized");
        let token_client = token::Client::new(&env, &token_addr);

        if member_count > 0 && balance > 0 {
            let share = balance / (member_count as i128);
            let mut distributed = 0i128;
            let mut index = 0u32;

            while index < member_count {
                let member: Address = env
                    .storage()
                    .persistent()
                    .get(&DataKey::MemberAt(index))
                    .expect("member not found");
                let mut payout = share;
                if index == member_count - 1 {
                    payout = balance - distributed;
                }
                if payout > 0 {
                    token_client.transfer(&env.current_contract_address(), &member, &payout);
                    distributed += payout;
                }
                index += 1;
            }
        }

        env.storage().instance().set(&DataKey::Balance, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::Status, &PoolStatus::Closed);

        env.events()
            .publish(("pool", "closed"), (balance, member_count));
    }

    // ════════════════════════════════════════════════════════════
    // CONFIGURATION (creator-only)
    // ════════════════════════════════════════════════════════════

    /// Update the payout cap percentage.
    pub fn set_max_payout_percent(env: Env, caller: Address, percent: u32) {
        caller.require_auth();
        Self::require_creator(&env, &caller);
        assert!(percent > 0 && percent <= 100, "invalid payout percent");
        env.storage()
            .instance()
            .set(&DataKey::MaxPayoutPercent, &percent);
    }

    /// Update the claim cooldown period.
    pub fn set_claim_cooldown(env: Env, caller: Address, seconds: u64) {
        caller.require_auth();
        Self::require_creator(&env, &caller);
        env.storage()
            .instance()
            .set(&DataKey::ClaimCooldown, &seconds);
    }

    // ════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ════════════════════════════════════════════════════════════

    pub fn get_summary(env: Env) -> PoolSummary {
        PoolSummary {
            creator: env.storage().instance().get(&DataKey::Creator).expect("not initialized"),
            name: env.storage().instance().get(&DataKey::PoolName).expect("not initialized"),
            description: env.storage().instance().get(&DataKey::PoolDescription).expect("not initialized"),
            category: env.storage().instance().get(&DataKey::PoolCategory).expect("not initialized"),
            fixed_contribution: env.storage().instance().get(&DataKey::FixedContribution).unwrap_or(0),
            max_members: env.storage().instance().get(&DataKey::MaxMembers).unwrap_or(MAX_POOL_MEMBERS),
            member_count: env.storage().instance().get(&DataKey::MemberCount).unwrap_or(0),
            balance: env.storage().instance().get(&DataKey::Balance).unwrap_or(0),
            total_paid_claims: env.storage().instance().get(&DataKey::TotalPaidClaims).unwrap_or(0),
            total_approved_claims: env.storage().instance().get(&DataKey::TotalApprovedClaims).unwrap_or(0),
            created_at: env.storage().instance().get(&DataKey::CreatedAt).unwrap_or(0),
            expires_at: env.storage().instance().get(&DataKey::ExpiresAt).unwrap_or(0),
            status: env.storage().instance().get(&DataKey::Status).unwrap_or(PoolStatus::Active),
            paused: env.storage().instance().get(&DataKey::Paused).unwrap_or(false),
            claim_count: env.storage().instance().get(&DataKey::ClaimCount).unwrap_or(0),
        }
    }

    pub fn get_claim(env: Env, claim_id: u64) -> Claim {
        env.storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .expect("claim not found")
    }

    pub fn get_all_claims(env: Env) -> Vec<Claim> {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ClaimCount)
            .unwrap_or(0);
        let mut claims = Vec::new(&env);
        for i in 0..count {
            if let Some(claim) = env
                .storage()
                .persistent()
                .get::<_, Claim>(&DataKey::Claim(i))
            {
                claims.push_back(claim);
            }
        }
        claims
    }

    pub fn get_pending_claims(env: Env) -> Vec<Claim> {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ClaimCount)
            .unwrap_or(0);
        let mut claims = Vec::new(&env);
        for i in 0..count {
            if let Some(claim) = env
                .storage()
                .persistent()
                .get::<_, Claim>(&DataKey::Claim(i))
            {
                if claim.status == ClaimStatus::PendingReview {
                    claims.push_back(claim);
                }
            }
        }
        claims
    }

    pub fn claim_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::ClaimCount)
            .unwrap_or(0)
    }

    pub fn balance(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Balance)
            .unwrap_or(0)
    }

    pub fn member_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::MemberCount)
            .unwrap_or(0)
    }

    pub fn is_member(env: Env, addr: Address) -> bool {
        Self::is_member_internal(&env, &addr)
    }

    pub fn has_voted(env: Env, claim_id: u64, voter: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::ClaimVote(claim_id, voter))
    }

    pub fn user_claim_count(env: Env, user: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::UserClaimCount(user))
            .unwrap_or(0)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    pub fn creator(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Creator)
            .expect("not initialized")
    }

    pub fn token_address(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .expect("not initialized")
    }

    pub fn get_members(env: Env) -> Vec<Address> {
        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MemberCount)
            .unwrap_or(0);
        let mut members = Vec::new(&env);
        for i in 0..count {
            if let Some(member) = env
                .storage()
                .persistent()
                .get::<_, Address>(&DataKey::MemberAt(i))
            {
                members.push_back(member);
            }
        }
        members
    }

    // ════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ════════════════════════════════════════════════════════════

    fn is_member_internal(env: &Env, addr: &Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Member(addr.clone()))
            .unwrap_or(false)
    }

    fn quorum_threshold(member_count: u32) -> u32 {
        if member_count == 0 {
            return 1;
        }
        // Quorum = ceil(member_count * QUORUM_PERCENTAGE / 100)
        ((member_count * QUORUM_PERCENTAGE) + 99) / 100
    }

    fn reject_if_expired(env: &Env, claim: &mut Claim) {
        if claim.status == ClaimStatus::PendingReview && env.ledger().timestamp() > claim.deadline {
            claim.status = ClaimStatus::Rejected;
            claim.updated_at = env.ledger().timestamp();
            env.events()
                .publish(("claim", "deadline_rejected"), (claim.id, claim.amount));
        }
    }

    fn require_creator(env: &Env, addr: &Address) {
        let creator: Address = env
            .storage()
            .instance()
            .get(&DataKey::Creator)
            .expect("not initialized");
        assert!(*addr == creator, "unauthorized: not creator");
    }

    fn require_creator_or_manager(env: &Env, addr: &Address) {
        let creator: Address = env
            .storage()
            .instance()
            .get(&DataKey::Creator)
            .expect("not initialized");
        if *addr == creator {
            return;
        }
        let is_manager: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Manager(addr.clone()))
            .unwrap_or(false);
        assert!(is_manager, "unauthorized: not creator or manager");
    }

    fn require_not_paused(env: &Env) {
        let paused: bool = env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false);
        assert!(!paused, "pool is paused");
    }

    fn require_active(env: &Env) {
        let status: PoolStatus = env
            .storage()
            .instance()
            .get(&DataKey::Status)
            .unwrap_or(PoolStatus::Active);
        assert!(status == PoolStatus::Active, "pool is not active");
        let expires_at: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ExpiresAt)
            .unwrap_or(0);
        assert!(
            env.ledger().timestamp() < expires_at,
            "pool lifecycle ended"
        );
    }
}

// ════════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════════

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::Env;

    fn setup_pool(env: &Env) -> (Address, PoolContractClient<'_>) {
        let contract_id = env.register(PoolContract, ());
        let client = PoolContractClient::new(env, &contract_id);
        let creator = Address::generate(env);
        let token = Address::generate(env);

        env.mock_all_auths();
        client.initialize(
            &creator,
            &token,
            &String::from_str(env, "Test Pool"),
            &String::from_str(env, "A test insurance pool"),
            &0u32, // Health
            &1_000_000i128,
            &30u32,
        );

        (creator, client)
    }

    #[test]
    fn test_initialize_and_summary() {
        let env = Env::default();
        let (_creator, client) = setup_pool(&env);

        let summary = client.get_summary();
        assert_eq!(summary.member_count, 0);
        assert_eq!(summary.balance, 0);
        assert_eq!(summary.status, PoolStatus::Active);
        assert_eq!(summary.category, PoolCategory::Health);
        assert_eq!(summary.max_members, 30);
        assert!(!summary.paused);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize() {
        let env = Env::default();
        let contract_id = env.register(PoolContract, ());
        let client = PoolContractClient::new(&env, &contract_id);
        let creator = Address::generate(&env);
        let token = Address::generate(&env);

        env.mock_all_auths();
        client.initialize(
            &creator,
            &token,
            &String::from_str(&env, "Pool"),
            &String::from_str(&env, "desc"),
            &0u32,
            &1_000i128,
            &10u32,
        );
        client.initialize(
            &creator,
            &token,
            &String::from_str(&env, "Pool2"),
            &String::from_str(&env, "desc2"),
            &0u32,
            &1_000i128,
            &10u32,
        );
    }

    #[test]
    fn test_roles() {
        let env = Env::default();
        let (creator, client) = setup_pool(&env);
        let manager = Address::generate(&env);
        let nobody = Address::generate(&env);

        env.mock_all_auths();

        assert_eq!(client.get_role(&creator), Role::Creator);
        assert_eq!(client.get_role(&manager), Role::Member);

        client.add_manager(&creator, &manager);
        assert_eq!(client.get_role(&manager), Role::Manager);

        client.remove_manager(&creator, &manager);
        assert_eq!(client.get_role(&manager), Role::Member);
        assert_eq!(client.get_role(&nobody), Role::Member);
    }

    #[test]
    fn test_pause_and_unpause() {
        let env = Env::default();
        let (creator, client) = setup_pool(&env);

        env.mock_all_auths();

        assert!(!client.is_paused());
        client.pause(&creator);
        assert!(client.is_paused());
        client.unpause(&creator);
        assert!(!client.is_paused());
    }

    #[test]
    fn test_submit_claim_and_voting() {
        let env = Env::default();
        let contract_id = env.register(PoolContract, ());
        let client = PoolContractClient::new(&env, &contract_id);
        let creator = Address::generate(&env);
        let token = Address::generate(&env);
        let claimant = Address::generate(&env);
        let voter1 = Address::generate(&env);
        let voter2 = Address::generate(&env);

        env.mock_all_auths();
        client.initialize(
            &creator,
            &token,
            &String::from_str(&env, "Travel Pool"),
            &String::from_str(&env, "Travel insurance"),
            &4u32, // Travel
            &1_000i128,
            &30u32,
        );

        // Manually set up members and balance for testing
        env.as_contract(&contract_id, || {
            env.storage().persistent().set(&DataKey::Member(claimant.clone()), &true);
            env.storage().persistent().set(&DataKey::Member(voter1.clone()), &true);
            env.storage().persistent().set(&DataKey::Member(voter2.clone()), &true);
            env.storage().persistent().set(&DataKey::MemberAt(0), &claimant);
            env.storage().persistent().set(&DataKey::MemberAt(1), &voter1);
            env.storage().persistent().set(&DataKey::MemberAt(2), &voter2);
            env.storage().instance().set(&DataKey::MemberCount, &3u32);
            env.storage().instance().set(&DataKey::Balance, &10_000i128);
        });

        // Submit claim (within 50% payout cap = 5000)
        let claim_id = client.submit_claim(
            &claimant,
            &2_000i128,
            &String::from_str(&env, "Delayed flight"),
            &String::from_str(&env, "QmEvidenceCID123"),
            &604_800u64, // 7 days
        );

        assert_eq!(claim_id, 0);
        assert_eq!(client.claim_count(), 1);

        let claim = client.get_claim(&0);
        assert_eq!(claim.status, ClaimStatus::PendingReview);
        assert_eq!(claim.votes_for, 0);
        assert_eq!(claim.votes_against, 0);

        // Vote — quorum for 3 members at 60% = ceil(1.8) = 2 votes needed
        client.vote_on_claim(&voter1, &claim_id, &VoteChoice::Approve);
        let claim = client.get_claim(&0);
        assert_eq!(claim.votes_for, 1);
        assert_eq!(claim.status, ClaimStatus::PendingReview);

        // Second vote should trigger quorum and approval
        client.vote_on_claim(&voter2, &claim_id, &VoteChoice::Approve);
        let claim = client.get_claim(&0);
        assert_eq!(claim.votes_for, 2);
        assert_eq!(claim.status, ClaimStatus::Approved);
    }

    #[test]
    fn test_claim_rejected_by_votes() {
        let env = Env::default();
        let contract_id = env.register(PoolContract, ());
        let client = PoolContractClient::new(&env, &contract_id);
        let creator = Address::generate(&env);
        let token = Address::generate(&env);
        let claimant = Address::generate(&env);
        let voter1 = Address::generate(&env);
        let voter2 = Address::generate(&env);

        env.mock_all_auths();
        client.initialize(
            &creator,
            &token,
            &String::from_str(&env, "Health Pool"),
            &String::from_str(&env, "Health insurance"),
            &0u32,
            &1_000i128,
            &30u32,
        );

        env.as_contract(&contract_id, || {
            env.storage().persistent().set(&DataKey::Member(claimant.clone()), &true);
            env.storage().persistent().set(&DataKey::Member(voter1.clone()), &true);
            env.storage().persistent().set(&DataKey::Member(voter2.clone()), &true);
            env.storage().persistent().set(&DataKey::MemberAt(0), &claimant);
            env.storage().persistent().set(&DataKey::MemberAt(1), &voter1);
            env.storage().persistent().set(&DataKey::MemberAt(2), &voter2);
            env.storage().instance().set(&DataKey::MemberCount, &3u32);
            env.storage().instance().set(&DataKey::Balance, &10_000i128);
        });

        let claim_id = client.submit_claim(
            &claimant,
            &2_000i128,
            &String::from_str(&env, "Medical bill"),
            &String::from_str(&env, "QmCID"),
            &604_800u64,
        );

        client.vote_on_claim(&voter1, &claim_id, &VoteChoice::Reject);
        client.vote_on_claim(&voter2, &claim_id, &VoteChoice::Reject);

        let claim = client.get_claim(&claim_id);
        assert_eq!(claim.status, ClaimStatus::Rejected);
        assert_eq!(claim.votes_against, 2);
    }

    #[test]
    fn test_expired_claim_rejected() {
        let env = Env::default();
        let contract_id = env.register(PoolContract, ());
        let client = PoolContractClient::new(&env, &contract_id);
        let creator = Address::generate(&env);
        let token = Address::generate(&env);
        let claimant = Address::generate(&env);

        env.mock_all_auths();
        client.initialize(
            &creator,
            &token,
            &String::from_str(&env, "Crop Pool"),
            &String::from_str(&env, "Crop insurance"),
            &1u32,
            &1_000i128,
            &30u32,
        );

        env.as_contract(&contract_id, || {
            env.storage().persistent().set(&DataKey::Member(claimant.clone()), &true);
            env.storage().persistent().set(&DataKey::MemberAt(0), &claimant);
            env.storage().instance().set(&DataKey::MemberCount, &1u32);
            env.storage().instance().set(&DataKey::Balance, &10_000i128);
        });

        let claim_id = client.submit_claim(
            &claimant,
            &1_000i128,
            &String::from_str(&env, "Crop failure"),
            &String::from_str(&env, "QmCID"),
            &100u64, // 100 second review
        );

        // Fast-forward past deadline
        env.ledger().set_timestamp(200);
        client.reject_expired_claim(&claim_id);

        let claim = client.get_claim(&claim_id);
        assert_eq!(claim.status, ClaimStatus::Rejected);
    }

    #[test]
    #[should_panic(expected = "claim exceeds maximum payout cap")]
    fn test_payout_cap_exceeded() {
        let env = Env::default();
        let contract_id = env.register(PoolContract, ());
        let client = PoolContractClient::new(&env, &contract_id);
        let creator = Address::generate(&env);
        let token = Address::generate(&env);
        let claimant = Address::generate(&env);

        env.mock_all_auths();
        client.initialize(
            &creator,
            &token,
            &String::from_str(&env, "Pool"),
            &String::from_str(&env, "desc"),
            &0u32,
            &1_000i128,
            &30u32,
        );

        env.as_contract(&contract_id, || {
            env.storage().persistent().set(&DataKey::Member(claimant.clone()), &true);
            env.storage().persistent().set(&DataKey::MemberAt(0), &claimant);
            env.storage().instance().set(&DataKey::MemberCount, &1u32);
            env.storage().instance().set(&DataKey::Balance, &10_000i128);
        });

        // Try claiming 6000 when cap is 50% of 10000 = 5000
        client.submit_claim(
            &claimant,
            &6_000i128,
            &String::from_str(&env, "Too much"),
            &String::from_str(&env, "QmCID"),
            &604_800u64,
        );
    }

    #[test]
    fn test_get_all_and_pending_claims() {
        let env = Env::default();
        let contract_id = env.register(PoolContract, ());
        let client = PoolContractClient::new(&env, &contract_id);
        let creator = Address::generate(&env);
        let token = Address::generate(&env);
        let claimant = Address::generate(&env);

        env.mock_all_auths();
        client.initialize(
            &creator,
            &token,
            &String::from_str(&env, "Pool"),
            &String::from_str(&env, "desc"),
            &0u32,
            &1_000i128,
            &30u32,
        );

        env.as_contract(&contract_id, || {
            env.storage().persistent().set(&DataKey::Member(claimant.clone()), &true);
            env.storage().persistent().set(&DataKey::MemberAt(0), &claimant);
            env.storage().instance().set(&DataKey::MemberCount, &1u32);
            env.storage().instance().set(&DataKey::Balance, &10_000i128);
            // Disable cooldown for this test
            env.storage().instance().set(&DataKey::ClaimCooldown, &0u64);
        });

        client.submit_claim(
            &claimant,
            &1_000i128,
            &String::from_str(&env, "Claim 1"),
            &String::from_str(&env, "QmCID1"),
            &604_800u64,
        );
        client.submit_claim(
            &claimant,
            &2_000i128,
            &String::from_str(&env, "Claim 2"),
            &String::from_str(&env, "QmCID2"),
            &604_800u64,
        );

        let all = client.get_all_claims();
        assert_eq!(all.len(), 2);

        let pending = client.get_pending_claims();
        assert_eq!(pending.len(), 2);
    }

    #[test]
    fn test_quorum_calculation() {
        // 1 member → ceil(0.6) = 1
        assert_eq!(PoolContract::quorum_threshold(1), 1);
        // 3 members → ceil(1.8) = 2
        assert_eq!(PoolContract::quorum_threshold(3), 2);
        // 5 members → ceil(3.0) = 3
        assert_eq!(PoolContract::quorum_threshold(5), 3);
        // 10 members → ceil(6.0) = 6
        assert_eq!(PoolContract::quorum_threshold(10), 6);
        // 30 members → ceil(18.0) = 18
        assert_eq!(PoolContract::quorum_threshold(30), 18);
    }
}
