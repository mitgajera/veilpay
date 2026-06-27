use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

use crate::{ArciumSignerAccount, ID, ID_CONST};
use crate::constants::COMP_DEF_OFFSET_TRANSFER;
use crate::errors::ErrorCode;
use crate::events::TransferEvent;

#[queue_computation_accounts("transfer", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct Transfer<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
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
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_TRANSFER))]
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

#[callback_accounts("transfer")]
#[derive(Accounts)]
pub struct TransferCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_TRANSFER))]
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

#[init_computation_definition_accounts("transfer", payer)]
#[derive(Accounts)]
pub struct InitTransferCompDef<'info> {
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

/// Queue a confidential transfer (sender -> receiver) to the MPC cluster.
pub fn handler(
    ctx: Context<Transfer>,
    computation_offset: u64,
    ciphertext_sender_balance: [u8; 32],
    ciphertext_receiver_balance: [u8; 32],
    ciphertext_amount: [u8; 32],
    pubkey: [u8; 32],
    nonce: u128,
) -> Result<()> {
    ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
    let args = ArgBuilder::new()
        .x25519_pubkey(pubkey)
        .plaintext_u128(nonce)
        .encrypted_u64(ciphertext_sender_balance)
        .encrypted_u64(ciphertext_receiver_balance)
        .encrypted_u64(ciphertext_amount)
        .build();

    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        vec![TransferCallback::callback_ix(
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

pub fn callback(
    ctx: Context<TransferCallback>,
    output: SignedComputationOutputs<TransferOutput>,
) -> Result<()> {
    let o = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(TransferOutput { field_0 }) => field_0,
        Err(e) => {
            msg!("Computation aborted, no valid MPC output: {}", e);
            return Err(ErrorCode::AbortedComputation.into());
        }
    };

    emit!(TransferEvent {
        new_sender_balance: o.ciphertexts[0],
        new_receiver_balance: o.ciphertexts[1],
        nonce: o.nonce.to_le_bytes(),
    });
    Ok(())
}
