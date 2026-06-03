use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::VeilPayError;
use crate::events::WithdrawalMade;
use crate::state::{ConfidentialBalance, MintConfig};
use crate::utils::withdrawal_proof_hash;

#[derive(Accounts)]
pub struct Withdraw<'info> {
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
        mut,
        seeds = [b"vault", mint_config.key().as_ref()],
        bump,
        token::mint = mint_config.mint,
        token::authority = mint_config,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"mint_config", mint.key().as_ref()],
        bump = mint_config.bump,
    )]
    pub mint_config: Account<'info, MintConfig>,

    #[account(constraint = mint.key() == mint_config.mint @ VeilPayError::InvalidMint)]
    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Withdraw>,
    amount: u64,
    new_encrypted_balance: [u8; 64],
    balance_commitment: [u8; 32],
    withdrawal_proof: [u8; 32],
) -> Result<()> {
    require!(amount > 0, VeilPayError::InvalidAmount);

    let balance = &ctx.accounts.confidential_balance;
    let expected_proof = withdrawal_proof_hash(
        &balance.owner_commitment,
        amount,
        balance.nonce,
    );
    require!(
        expected_proof == withdrawal_proof,
        VeilPayError::InvalidWithdrawalProof
    );

    let mint_key = ctx.accounts.mint_config.mint;
    let mint_config_bump = ctx.accounts.mint_config.bump;
    let seeds = &[b"mint_config".as_ref(), mint_key.as_ref(), &[mint_config_bump]];
    let signer = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.owner_token_account.to_account_info(),
            authority: ctx.accounts.mint_config.to_account_info(),
        },
        signer,
    );
    token::transfer(cpi_ctx, amount)?;

    let balance = &mut ctx.accounts.confidential_balance;
    balance.encrypted_balance = new_encrypted_balance;
    balance.withdraw_count = balance
        .withdraw_count
        .checked_add(1)
        .ok_or(VeilPayError::Overflow)?;
    balance.nonce = balance
        .nonce
        .checked_add(1)
        .ok_or(VeilPayError::Overflow)?;

    let mint_config = &mut ctx.accounts.mint_config;
    mint_config.total_withdrawn = mint_config
        .total_withdrawn
        .checked_add(amount)
        .ok_or(VeilPayError::Overflow)?;

    emit!(WithdrawalMade {
        owner: ctx.accounts.owner.key(),
        balance_commitment,
        withdraw_index: ctx.accounts.confidential_balance.withdraw_count,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
