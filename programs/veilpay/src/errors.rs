use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("The computation was aborted")]
    AbortedComputation,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Insufficient token balance for deposit")]
    InsufficientFunds,
    #[msg("Token account mint does not match the vault mint")]
    InvalidMint,
    #[msg("Arithmetic overflow")]
    Overflow,
}
