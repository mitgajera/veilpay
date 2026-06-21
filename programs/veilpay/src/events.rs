use anchor_lang::prelude::*;

/// Emitted by `initialize_mint` when a new custodied mint is configured.
#[event]
pub struct MintInitialized {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub timestamp: i64,
}

/// Emitted when real tokens are moved into the vault (public on-ramp amount).
#[event]
pub struct DepositMade {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

/// Emitted when real tokens are released from the vault (public off-ramp amount).
#[event]
pub struct WithdrawalMade {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

/// Emitted by `debit_callback` with the new encrypted balance.
#[event]
pub struct DebitEvent {
    /// New confidential balance (encrypted; only the owner can decrypt).
    pub new_balance: [u8; 32],
    pub nonce: [u8; 16],
}

/// Emitted by `transfer_callback` with both parties' new encrypted balances.
#[event]
pub struct TransferEvent {
    /// Sender's new confidential balance (encrypted).
    pub new_sender_balance: [u8; 32],
    /// Receiver's new confidential balance (encrypted).
    pub new_receiver_balance: [u8; 32],
    pub nonce: [u8; 16],
}

/// Emitted by `deposit_callback` with the new encrypted balance.
#[event]
pub struct DepositEvent {
    pub new_balance: [u8; 32],
    pub nonce: [u8; 16],
}

/// Emitted by `withdraw_callback` with the new encrypted balance.
#[event]
pub struct WithdrawEvent {
    pub new_balance: [u8; 32],
    pub nonce: [u8; 16],
}

/// Emitted by `view_balance_callback` — balance re-encrypted to the owner.
#[event]
pub struct ViewBalanceEvent {
    pub balance: [u8; 32],
    pub nonce: [u8; 16],
}

/// Emitted by `prove_threshold_callback` — only the boolean solvency result.
#[event]
pub struct ProveThresholdEvent {
    pub meets_threshold: bool,
}

/// Emitted by `reveal_to_auditor_callback` — balance re-encrypted to the auditor.
#[event]
pub struct AuditorRevealEvent {
    pub balance: [u8; 32],
    pub nonce: [u8; 16],
}

/// Emitted by `reveal_account_balance_callback` — the revealed stored balance.
#[event]
pub struct AccountBalanceRevealedEvent {
    pub balance: u64,
}

/// Emitted by `batch_transfer_callback` — sender + 3 receivers' new balances.
#[event]
pub struct BatchTransferEvent {
    pub new_sender: [u8; 32],
    pub new_r1: [u8; 32],
    pub new_r2: [u8; 32],
    pub new_r3: [u8; 32],
    pub nonce: [u8; 16],
}
