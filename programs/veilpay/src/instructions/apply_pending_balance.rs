use anchor_lang::prelude::*;

use crate::errors::VeilPayError;
use crate::events::PendingBalanceApplied;
use crate::state::ConfidentialBalance;

#[derive(Accounts)]
pub struct ApplyPendingBalance<'info> {
    #[account(
        mut,
        seeds = [b"balance", owner.key().as_ref()],
        bump = confidential_balance.bump,
        constraint = confidential_balance.owner == owner.key() @ VeilPayError::Unauthorized,
        constraint = !confidential_balance.is_frozen @ VeilPayError::AccountFrozen,
    )]
    pub confidential_balance: Account<'info, ConfidentialBalance>,

    pub owner: Signer<'info>,
}

pub fn handler(
    ctx: Context<ApplyPendingBalance>,
    new_encrypted_balance: [u8; 64],
    new_balance_commitment: [u8; 32],
) -> Result<()> {
    let balance = &mut ctx.accounts.confidential_balance;
    balance.encrypted_balance = new_encrypted_balance;
    balance.pending_balance = [0u8; 64];

    emit!(PendingBalanceApplied {
        owner: ctx.accounts.owner.key(),
        new_balance_commitment,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
