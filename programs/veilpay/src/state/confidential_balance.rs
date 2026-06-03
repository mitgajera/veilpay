use anchor_lang::prelude::*;

pub const CONFIDENTIAL_BALANCE_SIZE: usize = 226;

#[account]
pub struct ConfidentialBalance {
    pub owner: Pubkey,               // 32
    pub owner_commitment: [u8; 32],  // 32
    pub encrypted_balance: [u8; 64], // 64
    pub pending_balance: [u8; 64],   // 64
    pub nonce: u64,                  // 8
    pub deposit_count: u64,          // 8
    pub withdraw_count: u64,         // 8
    pub is_frozen: bool,             // 1
    pub bump: u8,                    // 1
    // Total: 8 (discriminator) + 32+32+64+64+8+8+8+1+1 = 226
}

impl ConfidentialBalance {
    pub fn new(owner: Pubkey, owner_commitment: [u8; 32], bump: u8) -> Self {
        Self {
            owner,
            owner_commitment,
            encrypted_balance: [0u8; 64],
            pending_balance: [0u8; 64],
            nonce: 0,
            deposit_count: 0,
            withdraw_count: 0,
            is_frozen: false,
            bump,
        }
    }
}
