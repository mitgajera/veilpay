use anchor_lang::prelude::*;

#[event]
pub struct MintInitialized {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct BalanceInitialized {
    pub owner: Pubkey,
    pub balance_pda: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct DepositMade {
    pub owner: Pubkey,
    pub balance_commitment: [u8; 32],
    pub deposit_index: u64,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawalMade {
    pub owner: Pubkey,
    pub balance_commitment: [u8; 32],
    pub withdraw_index: u64,
    pub timestamp: i64,
}

#[event]
pub struct PrivateTransferMade {
    pub commitment_hash: [u8; 32],
    pub encrypted_receiver_tag: [u8; 64],
    pub slot: u64,
    pub timestamp: i64,
}

#[event]
pub struct BatchTransferMade {
    pub sender_commitment: [u8; 32],
    pub recipient_count: u8,
    pub slot: u64,
    pub timestamp: i64,
}

#[event]
pub struct PendingBalanceApplied {
    pub owner: Pubkey,
    pub new_balance_commitment: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct AccountClosed {
    pub owner: Pubkey,
    pub timestamp: i64,
}
