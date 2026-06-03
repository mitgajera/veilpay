use anchor_lang::prelude::*;

pub const MINT_CONFIG_SIZE: usize = 89;

#[account]
pub struct MintConfig {
    pub authority: Pubkey,    // 32
    pub mint: Pubkey,         // 32
    pub total_deposited: u64, // 8
    pub total_withdrawn: u64, // 8
    pub bump: u8,             // 1
    // Total: 8 (discriminator) + 32+32+8+8+1 = 89
}
