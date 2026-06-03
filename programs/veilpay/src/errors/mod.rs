use anchor_lang::prelude::*;

#[error_code]
pub enum VeilPayError {
    #[msg("Unauthorized: signer does not own this account")]
    Unauthorized,

    #[msg("Invalid nonce: possible replay attack")]
    InvalidNonce,

    #[msg("Invalid commitment: commitment hash is zero or malformed")]
    InvalidCommitment,

    #[msg("Invalid amount: must be greater than zero")]
    InvalidAmount,

    #[msg("Insufficient funds in source account")]
    InsufficientFunds,

    #[msg("Account is frozen")]
    AccountFrozen,

    #[msg("Cannot transfer to yourself")]
    SelfTransfer,

    #[msg("Balance must be zero before closing account")]
    BalanceNotZero,

    #[msg("Pending balance must be zero before closing account")]
    PendingBalanceNotZero,

    #[msg("Invalid mint: token account mint does not match program mint")]
    InvalidMint,

    #[msg("Too many recipients: batch transfer supports max 5")]
    TooManyRecipients,

    #[msg("Account count does not match transfer count")]
    AccountMismatch,

    #[msg("Invalid withdrawal proof")]
    InvalidWithdrawalProof,

    #[msg("Arithmetic overflow")]
    Overflow,
}
