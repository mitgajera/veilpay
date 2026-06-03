use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::events::MintInitialized;
use crate::state::MintConfig;

#[derive(Accounts)]
pub struct InitializeMint<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 89,
        seeds = [b"mint_config"],
        bump
    )]
    pub mint_config: Account<'info, MintConfig>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = authority,
    )]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitializeMint>) -> Result<()> {
    let mint_config = &mut ctx.accounts.mint_config;
    mint_config.authority = ctx.accounts.authority.key();
    mint_config.mint = ctx.accounts.mint.key();
    mint_config.total_deposited = 0;
    mint_config.total_withdrawn = 0;
    mint_config.bump = ctx.bumps.mint_config;

    emit!(MintInitialized {
        authority: ctx.accounts.authority.key(),
        mint: ctx.accounts.mint.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
