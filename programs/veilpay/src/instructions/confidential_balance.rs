use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use arcium_anchor::prelude::*;

use crate::{ArciumSignerAccount, ID, ID_CONST};
use crate::constants::{
    COMP_DEF_OFFSET_DEBIT_FROM_ACCOUNT, COMP_DEF_OFFSET_DEPOSIT_TO_ACCOUNT,
    COMP_DEF_OFFSET_INIT_BALANCE, COMP_DEF_OFFSET_REVEAL_ACCOUNT_BALANCE,
    COMP_DEF_OFFSET_TRANSFER_BETWEEN_ACCOUNTS, COMP_DEF_OFFSET_WITHDRAW_FROM_ACCOUNT,
};
use crate::errors::ErrorCode;
use crate::events::{AccountBalanceRevealedEvent, DepositMade, WithdrawalMade};
use crate::state::{ConfidentialBalance, MintConfig};
use arcium_client::idl::arcium::types::CallbackAccount;

#[queue_computation_accounts("init_balance", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct InitBalance<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// The token mint this confidential balance is for.
    /// CHECK: only used to key the PDA.
    pub mint: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + ConfidentialBalance::INIT_SPACE,
        seeds = [b"balance", payer.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub confidential_balance: Account<'info, ConfidentialBalance>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_BALANCE))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("init_balance")]
#[derive(Accounts)]
pub struct InitBalanceCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_BALANCE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints in the callback context.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: UncheckedAccount<'info>,
    /// The balance account the callback writes the encrypted zero into.
    #[account(mut)]
    pub confidential_balance: Account<'info, ConfidentialBalance>,
}

#[init_computation_definition_accounts("init_balance", payer)]
#[derive(Accounts)]
pub struct InitInitBalanceCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program. Not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("deposit_to_account", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct DepositToAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = mint.key() == mint_config.mint @ ErrorCode::InvalidMint)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        seeds = [b"balance", payer.key().as_ref(), mint.key().as_ref()],
        bump = confidential_balance.bump,
    )]
    pub confidential_balance: Account<'info, ConfidentialBalance>,
    /// The depositor's token account — tokens move from here into the vault.
    #[account(
        mut,
        constraint = owner_token_account.owner == payer.key() @ ErrorCode::InvalidMint,
        constraint = owner_token_account.mint == mint_config.mint @ ErrorCode::InvalidMint,
    )]
    pub owner_token_account: Box<Account<'info, TokenAccount>>,
    /// The protocol-owned vault holding the real tokens for this mint.
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [b"vault", mint_config.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = mint_config,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [b"mint_config", mint.key().as_ref()],
        bump = mint_config.bump,
    )]
    pub mint_config: Box<Account<'info, MintConfig>>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_DEPOSIT_TO_ACCOUNT))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("deposit_to_account")]
#[derive(Accounts)]
pub struct DepositToAccountCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_DEPOSIT_TO_ACCOUNT))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints in the callback context.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: UncheckedAccount<'info>,
    /// The balance account the callback writes the new ciphertext into.
    #[account(mut)]
    pub confidential_balance: Account<'info, ConfidentialBalance>,
}

#[init_computation_definition_accounts("deposit_to_account", payer)]
#[derive(Accounts)]
pub struct InitDepositToAccountCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program. Not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("debit_from_account", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct DebitFromAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: only used to key the PDA.
    pub mint: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"balance", payer.key().as_ref(), mint.key().as_ref()],
        bump = confidential_balance.bump,
    )]
    pub confidential_balance: Account<'info, ConfidentialBalance>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_DEBIT_FROM_ACCOUNT))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("debit_from_account")]
#[derive(Accounts)]
pub struct DebitFromAccountCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_DEBIT_FROM_ACCOUNT))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints in the callback context.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: UncheckedAccount<'info>,
    /// The balance account the callback writes the new ciphertext into.
    #[account(mut)]
    pub confidential_balance: Account<'info, ConfidentialBalance>,
}

#[init_computation_definition_accounts("debit_from_account", payer)]
#[derive(Accounts)]
pub struct InitDebitFromAccountCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program. Not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("withdraw_from_account", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct WithdrawFromAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = mint.key() == mint_config.mint @ ErrorCode::InvalidMint)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        seeds = [b"balance", payer.key().as_ref(), mint.key().as_ref()],
        bump = confidential_balance.bump,
    )]
    pub confidential_balance: Account<'info, ConfidentialBalance>,
    /// Destination for released tokens — must belong to the withdrawer.
    #[account(
        mut,
        constraint = owner_token_account.owner == payer.key() @ ErrorCode::InvalidMint,
        constraint = owner_token_account.mint == mint_config.mint @ ErrorCode::InvalidMint,
    )]
    pub owner_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [b"vault", mint_config.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = mint_config,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [b"mint_config", mint.key().as_ref()],
        bump = mint_config.bump,
    )]
    pub mint_config: Box<Account<'info, MintConfig>>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_WITHDRAW_FROM_ACCOUNT))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("withdraw_from_account")]
#[derive(Accounts)]
pub struct WithdrawFromAccountCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_WITHDRAW_FROM_ACCOUNT))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints in the callback context.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: UncheckedAccount<'info>,
    // Extra accounts (order must match the CallbackAccount vec in the handler).
    /// Balance account — callback writes the new ciphertext here.
    #[account(mut)]
    pub confidential_balance: Account<'info, ConfidentialBalance>,
    /// Vault config — supplies the PDA signer seeds and tracks total withdrawn.
    #[account(mut)]
    pub mint_config: Box<Account<'info, MintConfig>>,
    /// Vault token account — released tokens leave here (authority = mint_config).
    #[account(mut, constraint = vault.owner == mint_config.key() @ ErrorCode::InvalidMint)]
    pub vault: Box<Account<'info, TokenAccount>>,
    /// Destination token account for the released tokens.
    #[account(mut, constraint = owner_token_account.mint == mint_config.mint @ ErrorCode::InvalidMint)]
    pub owner_token_account: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

#[init_computation_definition_accounts("withdraw_from_account", payer)]
#[derive(Accounts)]
pub struct InitWithdrawFromAccountCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program. Not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("transfer_between_accounts", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct TransferBetweenAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: only used to key the PDAs.
    pub mint: UncheckedAccount<'info>,
    /// CHECK: the receiver; only used to key the receiver balance PDA.
    pub receiver: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"balance", payer.key().as_ref(), mint.key().as_ref()],
        bump = sender_balance.bump,
    )]
    pub sender_balance: Account<'info, ConfidentialBalance>,
    #[account(
        mut,
        seeds = [b"balance", receiver.key().as_ref(), mint.key().as_ref()],
        bump = receiver_balance.bump,
    )]
    pub receiver_balance: Account<'info, ConfidentialBalance>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_TRANSFER_BETWEEN_ACCOUNTS))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("transfer_between_accounts")]
#[derive(Accounts)]
pub struct TransferBetweenAccountsCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_TRANSFER_BETWEEN_ACCOUNTS))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints in the callback context.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: UncheckedAccount<'info>,
    /// Sender balance — callback writes the new sender ciphertext here.
    #[account(mut)]
    pub sender_balance: Account<'info, ConfidentialBalance>,
    /// Receiver balance — callback writes the new receiver ciphertext here.
    #[account(mut)]
    pub receiver_balance: Account<'info, ConfidentialBalance>,
}

#[init_computation_definition_accounts("transfer_between_accounts", payer)]
#[derive(Accounts)]
pub struct InitTransferBetweenAccountsCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program. Not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("reveal_account_balance", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct RevealAccountBalance<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: only used to key the PDA.
    pub mint: UncheckedAccount<'info>,
    #[account(
        seeds = [b"balance", payer.key().as_ref(), mint.key().as_ref()],
        bump = confidential_balance.bump,
    )]
    pub confidential_balance: Account<'info, ConfidentialBalance>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL_ACCOUNT_BALANCE))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("reveal_account_balance")]
#[derive(Accounts)]
pub struct RevealAccountBalanceCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL_ACCOUNT_BALANCE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints in the callback context.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: UncheckedAccount<'info>,
}

#[init_computation_definition_accounts("reveal_account_balance", payer)]
#[derive(Accounts)]
pub struct InitRevealAccountBalanceCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program. Not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// ----------------------------------------------------------------- handlers

/// Create a confidential balance account for (owner, mint) and queue the MPC
/// computation that fills it with an encrypted zero.
pub fn init_balance_handler(ctx: Context<InitBalance>, computation_offset: u64) -> Result<()> {
    ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
    let bal = &mut ctx.accounts.confidential_balance;
    bal.bump = ctx.bumps.confidential_balance;
    bal.owner = ctx.accounts.payer.key();
    bal.mint = ctx.accounts.mint.key();

    let args = ArgBuilder::new().build();
    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        vec![InitBalanceCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[CallbackAccount {
                pubkey: ctx.accounts.confidential_balance.key(),
                is_writable: true,
            }],
        )?],
        1,
        0,
        0,
    )?;
    Ok(())
}

pub fn init_balance_callback(
    ctx: Context<InitBalanceCallback>,
    output: SignedComputationOutputs<InitBalanceOutput>,
) -> Result<()> {
    let o = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(InitBalanceOutput { field_0 }) => field_0,
        Err(e) => {
            msg!("Computation aborted, no valid MPC output: {}", e);
            return Err(ErrorCode::AbortedComputation.into());
        }
    };

    let bal = &mut ctx.accounts.confidential_balance;
    bal.encrypted_balance = o.ciphertexts;
    bal.nonce = o.nonce;
    Ok(())
}

/// Deposit real tokens into the vault and credit the confidential balance.
pub fn deposit_to_account_handler(
    ctx: Context<DepositToAccount>,
    computation_offset: u64,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(
        ctx.accounts.owner_token_account.amount >= amount,
        ErrorCode::InsufficientFunds
    );
    ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

    // Move the real tokens into the vault (public on-ramp).
    anchor_spl::token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.owner_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            },
        ),
        amount,
    )?;

    let mint_config = &mut ctx.accounts.mint_config;
    mint_config.total_deposited = mint_config
        .total_deposited
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;

    emit!(DepositMade {
        owner: ctx.accounts.payer.key(),
        mint: ctx.accounts.mint.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    let args = ArgBuilder::new()
        .plaintext_u64(amount)
        .plaintext_u128(ctx.accounts.confidential_balance.nonce)
        .account(ctx.accounts.confidential_balance.key(), 8 + 1, 32)
        .build();

    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        vec![DepositToAccountCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[CallbackAccount {
                pubkey: ctx.accounts.confidential_balance.key(),
                is_writable: true,
            }],
        )?],
        1,
        0,
        0,
    )?;
    Ok(())
}

pub fn deposit_to_account_callback(
    ctx: Context<DepositToAccountCallback>,
    output: SignedComputationOutputs<DepositToAccountOutput>,
) -> Result<()> {
    let o = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(DepositToAccountOutput { field_0 }) => field_0,
        Err(e) => {
            msg!("Computation aborted, no valid MPC output: {}", e);
            return Err(ErrorCode::AbortedComputation.into());
        }
    };

    let bal = &mut ctx.accounts.confidential_balance;
    bal.encrypted_balance = o.ciphertexts;
    bal.nonce = o.nonce;
    Ok(())
}

/// Spend `amount` from the stored confidential balance with no-overdraft.
pub fn debit_from_account_handler(
    ctx: Context<DebitFromAccount>,
    computation_offset: u64,
    ciphertext_amount: [u8; 32],
    pubkey: [u8; 32],
    amount_nonce: u128,
) -> Result<()> {
    ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

    let args = ArgBuilder::new()
        .x25519_pubkey(pubkey)
        .plaintext_u128(amount_nonce)
        .encrypted_u64(ciphertext_amount)
        .plaintext_u128(ctx.accounts.confidential_balance.nonce)
        .account(ctx.accounts.confidential_balance.key(), 8 + 1, 32)
        .build();

    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        vec![DebitFromAccountCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[CallbackAccount {
                pubkey: ctx.accounts.confidential_balance.key(),
                is_writable: true,
            }],
        )?],
        1,
        0,
        0,
    )?;
    Ok(())
}

pub fn debit_from_account_callback(
    ctx: Context<DebitFromAccountCallback>,
    output: SignedComputationOutputs<DebitFromAccountOutput>,
) -> Result<()> {
    let o = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(DebitFromAccountOutput { field_0 }) => field_0,
        Err(e) => {
            msg!("Computation aborted, no valid MPC output: {}", e);
            return Err(ErrorCode::AbortedComputation.into());
        }
    };

    let bal = &mut ctx.accounts.confidential_balance;
    bal.encrypted_balance = o.ciphertexts;
    bal.nonce = o.nonce;
    Ok(())
}

/// Withdraw a PUBLIC `amount` of real tokens from the vault, debiting the
/// confidential balance (MPC proves coverage and reveals only the released amount).
pub fn withdraw_from_account_handler(
    ctx: Context<WithdrawFromAccount>,
    computation_offset: u64,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);
    ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

    let args = ArgBuilder::new()
        .plaintext_u64(amount)
        .plaintext_u128(ctx.accounts.confidential_balance.nonce)
        .account(ctx.accounts.confidential_balance.key(), 8 + 1, 32)
        .build();

    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        vec![WithdrawFromAccountCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[
                CallbackAccount {
                    pubkey: ctx.accounts.confidential_balance.key(),
                    is_writable: true,
                },
                CallbackAccount {
                    pubkey: ctx.accounts.mint_config.key(),
                    is_writable: true,
                },
                CallbackAccount {
                    pubkey: ctx.accounts.vault.key(),
                    is_writable: true,
                },
                CallbackAccount {
                    pubkey: ctx.accounts.owner_token_account.key(),
                    is_writable: true,
                },
                CallbackAccount {
                    pubkey: anchor_spl::token::ID,
                    is_writable: false,
                },
            ],
        )?],
        1,
        0,
        0,
    )?;
    Ok(())
}

pub fn withdraw_from_account_callback(
    ctx: Context<WithdrawFromAccountCallback>,
    output: SignedComputationOutputs<WithdrawFromAccountOutput>,
) -> Result<()> {
    // Tuple return: field_0 = new encrypted balance, field_1 = revealed released amount.
    let o = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(WithdrawFromAccountOutput { field_0 }) => field_0,
        Err(e) => {
            msg!("Computation aborted, no valid MPC output: {}", e);
            return Err(ErrorCode::AbortedComputation.into());
        }
    };

    let new_balance = o.field_0;
    let released = o.field_1;

    let bal = &mut ctx.accounts.confidential_balance;
    bal.encrypted_balance = new_balance.ciphertexts;
    bal.nonce = new_balance.nonce;

    if released > 0 {
        let mint_key = ctx.accounts.mint_config.mint;
        let bump = ctx.accounts.mint_config.bump;
        let bump_arr = [bump];
        let seeds: &[&[u8]] = &[b"mint_config", mint_key.as_ref(), &bump_arr];
        let signer_seeds = &[seeds];

        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                anchor_spl::token::ID,
                anchor_spl::token::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: ctx.accounts.mint_config.to_account_info(),
                },
                signer_seeds,
            ),
            released,
        )?;

        let mc = &mut ctx.accounts.mint_config;
        mc.total_withdrawn = mc
            .total_withdrawn
            .checked_add(released)
            .ok_or(ErrorCode::Overflow)?;

        emit!(WithdrawalMade {
            owner: ctx.accounts.owner_token_account.owner,
            mint: mint_key,
            amount: released,
            timestamp: Clock::get()?.unix_timestamp,
        });
    }
    Ok(())
}

/// Confidential transfer from the signer's balance to the receiver's balance.
pub fn transfer_between_accounts_handler(
    ctx: Context<TransferBetweenAccounts>,
    computation_offset: u64,
    ciphertext_amount: [u8; 32],
    pubkey: [u8; 32],
    amount_nonce: u128,
) -> Result<()> {
    ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

    let args = ArgBuilder::new()
        .x25519_pubkey(pubkey)
        .plaintext_u128(amount_nonce)
        .encrypted_u64(ciphertext_amount)
        .plaintext_u128(ctx.accounts.sender_balance.nonce)
        .account(ctx.accounts.sender_balance.key(), 8 + 1, 32)
        .plaintext_u128(ctx.accounts.receiver_balance.nonce)
        .account(ctx.accounts.receiver_balance.key(), 8 + 1, 32)
        .build();

    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        vec![TransferBetweenAccountsCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[
                CallbackAccount {
                    pubkey: ctx.accounts.sender_balance.key(),
                    is_writable: true,
                },
                CallbackAccount {
                    pubkey: ctx.accounts.receiver_balance.key(),
                    is_writable: true,
                },
            ],
        )?],
        1,
        0,
        0,
    )?;
    Ok(())
}

pub fn transfer_between_accounts_callback(
    ctx: Context<TransferBetweenAccountsCallback>,
    output: SignedComputationOutputs<TransferBetweenAccountsOutput>,
) -> Result<()> {
    let pair = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(TransferBetweenAccountsOutput { field_0 }) => field_0,
        Err(e) => {
            msg!("Computation aborted, no valid MPC output: {}", e);
            return Err(ErrorCode::AbortedComputation.into());
        }
    };

    let sender = &mut ctx.accounts.sender_balance;
    sender.encrypted_balance = pair.field_0.ciphertexts;
    sender.nonce = pair.field_0.nonce;
    let receiver = &mut ctx.accounts.receiver_balance;
    receiver.encrypted_balance = pair.field_1.ciphertexts;
    receiver.nonce = pair.field_1.nonce;
    Ok(())
}

/// Reveal the stored confidential balance (decrypts via MPC and emits it).
pub fn reveal_account_balance_handler(
    ctx: Context<RevealAccountBalance>,
    computation_offset: u64,
) -> Result<()> {
    ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

    let args = ArgBuilder::new()
        .plaintext_u128(ctx.accounts.confidential_balance.nonce)
        .account(ctx.accounts.confidential_balance.key(), 8 + 1, 32)
        .build();

    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        vec![RevealAccountBalanceCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[],
        )?],
        1,
        0,
        0,
    )?;
    Ok(())
}

pub fn reveal_account_balance_callback(
    ctx: Context<RevealAccountBalanceCallback>,
    output: SignedComputationOutputs<RevealAccountBalanceOutput>,
) -> Result<()> {
    let balance = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(RevealAccountBalanceOutput { field_0 }) => field_0,
        Err(e) => {
            msg!("Computation aborted, no valid MPC output: {}", e);
            return Err(ErrorCode::AbortedComputation.into());
        }
    };

    emit!(AccountBalanceRevealedEvent { balance });
    Ok(())
}
