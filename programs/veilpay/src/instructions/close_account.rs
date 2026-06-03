use anchor_lang::prelude::*;

use crate::errors::VeilPayError;
use crate::events::AccountClosed;
use crate::state::ConfidentialBalance;

#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(
        mut,
        seeds = [b"balance", owner.key().as_ref()],
        bump = confidential_balance.bump,
        constraint = confidential_balance.owner == owner.key() @ VeilPayError::Unauthorized,
        close = owner,
    )]
    pub confidential_balance: Account<'info, ConfidentialBalance>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CloseAccount>) -> Result<()> {
    require!(
        ctx.accounts.confidential_balance.encrypted_balance == [0u8; 64],
        VeilPayError::BalanceNotZero
    );
    require!(
        ctx.accounts.confidential_balance.pending_balance == [0u8; 64],
        VeilPayError::PendingBalanceNotZero
    );

    emit!(AccountClosed {
        owner: ctx.accounts.owner.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
