use anchor_lang::prelude::*;

/// A confidential, MXE-owned token balance stored on-chain.
///
/// `encrypted_balance` is an `Enc<Mxe, u64>` ciphertext — only the MPC cluster
/// can decrypt it. Deposits/transfers/withdrawals read it into a circuit,
/// compute on it, and the callback writes the new ciphertext back here.
///
/// Keyed by `(owner, mint)` so each token has its own confidential balance.
///
/// IMPORTANT: `encrypted_balance` sits immediately after the 8-byte
/// discriminator + 1-byte bump (offset 9), so the ArgBuilder reads it with
/// `.account(key, 8 + 1, 32)`. Do not reorder these fields.
#[account]
#[derive(InitSpace)]
pub struct ConfidentialBalance {
    pub bump: u8,
    /// Enc<Mxe, u64> ciphertext (one 32-byte field).
    pub encrypted_balance: [[u8; 32]; 1],
    /// Encryption nonce for `encrypted_balance`.
    pub nonce: u128,
    pub owner: Pubkey,
    pub mint: Pubkey,
}

/// Vault configuration for one SPL mint custodied by the protocol.
///
/// The real tokens live in a `vault` token account whose authority is this
/// PDA. Deposits move tokens in (public amount), withdrawals move them out
/// (public amount) — only the confidential balances computed in MPC are
/// private. `total_deposited`/`total_withdrawn` track the public on/off-ramp.
#[account]
#[derive(InitSpace)]
pub struct MintConfig {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub bump: u8,
}
