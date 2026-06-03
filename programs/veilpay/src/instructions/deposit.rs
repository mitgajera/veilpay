use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::VeilPayError;
use crate::events::DepositMade;
use crate::state::{ConfidentialBalance, MintConfig};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"balance", owner.key().as_ref()],
        bump = confidential_balance.bump,
        constraint = confidential_balance.owner == owner.key() @ VeilPayError::Unauthorized,
        constraint = !confidential_balance.is_frozen @ VeilPayError::AccountFrozen,
    )]
    pub confidential_balance: Account<'info, ConfidentialBalance>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key() @ VeilPayError::Unauthorized,
        constraint = owner_token_account.mint == mint_config.mint @ VeilPayError::InvalidMint,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = owner,
        seeds = [b"vault", mint_config.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = mint_config,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"mint_config"],
        bump = mint_config.bump,
    )]
    pub mint_config: Account<'info, MintConfig>,

    #[account(constraint = mint.key() == mint_config.mint @ VeilPayError::InvalidMint)]
    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Deposit>,
    amount: u64,
    new_encrypted_balance: [u8; 64],
    balance_commitment: [u8; 32],
) -> Result<()> {
    require!(amount > 0, VeilPayError::InvalidAmount);
    require!(
        ctx.accounts.owner_token_account.amount >= amount,
        VeilPayError::InsufficientFunds
    );

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.owner_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        },
    );
    token::transfer(cpi_ctx, amount)?;

    let balance = &mut ctx.accounts.confidential_balance;
    balance.encrypted_balance = new_encrypted_balance;
    balance.deposit_count = balance
        .deposit_count
        .checked_add(1)
        .ok_or(VeilPayError::Overflow)?;

    let mint_config = &mut ctx.accounts.mint_config;
    mint_config.total_deposited = mint_config
        .total_deposited
        .checked_add(amount)
        .ok_or(VeilPayError::Overflow)?;

    emit!(DepositMade {
        owner: ctx.accounts.owner.key(),
        balance_commitment,
        deposit_index: balance.deposit_count,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
