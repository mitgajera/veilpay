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
use crate::state::{ConfidentialBalance, MintConfig};

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
