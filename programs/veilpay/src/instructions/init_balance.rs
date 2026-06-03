use anchor_lang::prelude::*;

use crate::errors::VeilPayError;
use crate::events::BalanceInitialized;
use crate::state::{ConfidentialBalance, CONFIDENTIAL_BALANCE_SIZE};

#[derive(Accounts)]
pub struct InitBalance<'info> {
    #[account(
        init,
        payer = owner,
        space = CONFIDENTIAL_BALANCE_SIZE,
        seeds = [b"balance", owner.key().as_ref()],
        bump
    )]
    pub confidential_balance: Account<'info, ConfidentialBalance>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitBalance>, owner_commitment: [u8; 32]) -> Result<()> {
    require!(
        owner_commitment != [0u8; 32],
        VeilPayError::InvalidCommitment
    );

    let balance = &mut ctx.accounts.confidential_balance;
    balance.owner = ctx.accounts.owner.key();
    balance.owner_commitment = owner_commitment;
    balance.encrypted_balance = [0u8; 64];
    balance.pending_balance = [0u8; 64];
    balance.nonce = 0;
    balance.deposit_count = 0;
    balance.withdraw_count = 0;
    balance.is_frozen = false;
    balance.bump = ctx.bumps.confidential_balance;

    emit!(BalanceInitialized {
        owner: ctx.accounts.owner.key(),
        balance_pda: ctx.accounts.confidential_balance.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
