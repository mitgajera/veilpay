use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::events::MintInitialized;
use crate::state::MintConfig;

/// Initialize VeilPay using an EXISTING SPL mint (e.g. devnet USDC, wSOL).
/// This is an alternative to initialize_mint — call one OR the other.
/// All downstream instructions (deposit, withdraw) work unchanged because
/// mint_config.mint is set to the provided mint address.
#[derive(Accounts)]
pub struct InitializeExistingMint<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 89,
        seeds = [b"mint_config", mint.key().as_ref()],
        bump
    )]
    pub mint_config: Account<'info, MintConfig>,

    /// The existing SPL mint to wrap (e.g. USDC, wSOL)
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeExistingMint>) -> Result<()> {
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
