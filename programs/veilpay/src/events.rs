use anchor_lang::prelude::*;

/// Event emitted for private transfers
/// This event is indexed by Helius webhooks for activity feed
/// 
/// Privacy Design:
/// - Only non-sensitive metadata is included
/// - No amounts, sender, or receiver identities exposed
/// - encrypted_tag allows recipient to detect their transactions locally
/// - commitment_hash enables transaction verification without revealing details
#[event]
pub struct PrivateTransferEvent {
    /// Commitment hash for transaction verification (non-sensitive)
    /// Used for proof generation and audit trails without revealing amounts
    pub commitment_hash: [u8; 32],
    
    /// Encrypted tag for recipient detection (only recipient can decrypt)
    /// Generated via ECDH key derivation - only intended recipient can match
    pub encrypted_tag: [u8; 32],
    
    /// Slot number when transaction was processed
    /// Used by Helius for indexing and ordering
    pub slot: u64,
    
    /// Timestamp of the transfer (Unix timestamp)
    pub timestamp: i64,
    
    /// Event type identifier for filtering
    /// 0 = transfer, 1 = mint, 2 = burn, 3 = deposit
    pub event_type: u8,
    
    /// Program-derived address bump (for account identification)
    pub sender_bump: u8,
}

/// Event emitted when a new confidential balance account is created
/// Indexed by Helius for tracking new wallet initializations
#[event]
pub struct BalanceInitializedEvent {
    /// Owner commitment hash (privacy-preserving identifier)
    pub owner_commitment: [u8; 32],
    
    /// Slot number when account was initialized
    pub slot: u64,
    
    /// Timestamp of initialization (Unix timestamp)
    pub timestamp: i64,
}