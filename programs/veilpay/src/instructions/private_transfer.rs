use anchor_lang::prelude::*;

use crate::errors::VeilPayError;
use crate::events::PrivateTransferMade;
use crate::state::ConfidentialBalance;
use crate::utils::{transfer_commitment, xor_64};

#[derive(Accounts)]
pub struct PrivateTransfer<'info> {
    #[account(
        mut,
        seeds = [b"balance", sender.key().as_ref()],
        bump = sender_balance.bump,
        constraint = sender_balance.owner == sender.key() @ VeilPayError::Unauthorized,
        constraint = !sender_balance.is_frozen @ VeilPayError::AccountFrozen,
    )]
    pub sender_balance: Account<'info, ConfidentialBalance>,

    #[account(
        mut,
        seeds = [b"balance", receiver_balance.owner.as_ref()],
        bump = receiver_balance.bump,
        constraint = !receiver_balance.is_frozen @ VeilPayError::AccountFrozen,
        constraint = sender_balance.key() != receiver_balance.key() @ VeilPayError::SelfTransfer,
    )]
    pub receiver_balance: Account<'info, ConfidentialBalance>,

    pub sender: Signer<'info>,
}

pub fn handler(
    ctx: Context<PrivateTransfer>,
    encrypted_amount: [u8; 64],
    sender_new_encrypted_balance: [u8; 64],
    commitment_hash: [u8; 32],
    encrypted_receiver_tag: [u8; 64],
    sender_nonce: u64,
) -> Result<()> {
    require!(
        sender_nonce == ctx.accounts.sender_balance.nonce,
        VeilPayError::InvalidNonce
    );

    let expected_commitment = transfer_commitment(
        &encrypted_amount,
        sender_nonce,
        &ctx.accounts.receiver_balance.owner_commitment,
    );
    require!(
        expected_commitment == commitment_hash,
        VeilPayError::InvalidCommitment
    );

    let sender = &mut ctx.accounts.sender_balance;
    sender.encrypted_balance = sender_new_encrypted_balance;
    sender.nonce = sender
        .nonce
        .checked_add(1)
        .ok_or(VeilPayError::Overflow)?;

    let receiver = &mut ctx.accounts.receiver_balance;
    receiver.pending_balance = xor_64(receiver.pending_balance, encrypted_amount);

    let clock = Clock::get()?;
    emit!(PrivateTransferMade {
        commitment_hash,
        encrypted_receiver_tag,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
