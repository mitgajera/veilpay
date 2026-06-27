use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("6QPCy4uju8fKdzje3vkifX6YH6sRZ9ZuzyhdMjb25cGa");

#[arcium_program]
pub mod veilpay {
    use super::*;

    /// Configure a new SPL mint for confidential custody (creates MintConfig + mint).
    pub fn initialize_mint(ctx: Context<InitializeMint>) -> Result<()> {
        initialize_mint_handler(ctx)
    }

    /// One-time: register the `debit` circuit definition with the MXE.
    pub fn init_debit_comp_def(ctx: Context<InitDebitCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    /// Queue a confidential debit (`balance - amount`) to the MPC cluster.
    pub fn debit(
        ctx: Context<Debit>,
        computation_offset: u64,
        ciphertext_balance: [u8; 32],
        ciphertext_amount: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        instructions::debit::handler(
            ctx,
            computation_offset,
            ciphertext_balance,
            ciphertext_amount,
            pubkey,
            nonce,
        )
    }

    #[arcium_callback(encrypted_ix = "debit")]
    pub fn debit_callback(
        ctx: Context<DebitCallback>,
        output: SignedComputationOutputs<DebitOutput>,
    ) -> Result<()> {
        instructions::debit::callback(ctx, output)
    }

    /// One-time: register the `transfer` circuit definition with the MXE.
    pub fn init_transfer_comp_def(ctx: Context<InitTransferCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    /// Queue a confidential transfer (sender -> receiver) to the MPC cluster.
    pub fn transfer(
        ctx: Context<Transfer>,
        computation_offset: u64,
        ciphertext_sender_balance: [u8; 32],
        ciphertext_receiver_balance: [u8; 32],
        ciphertext_amount: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        instructions::transfer::handler(
            ctx,
            computation_offset,
            ciphertext_sender_balance,
            ciphertext_receiver_balance,
            ciphertext_amount,
            pubkey,
            nonce,
        )
    }

    #[arcium_callback(encrypted_ix = "transfer")]
    pub fn transfer_callback(
        ctx: Context<TransferCallback>,
        output: SignedComputationOutputs<TransferOutput>,
    ) -> Result<()> {
        instructions::transfer::callback(ctx, output)
    }

    /// One-time: register the `deposit` circuit definition with the MXE.
    pub fn init_deposit_comp_def(ctx: Context<InitDepositCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    /// Queue a confidential deposit (`balance + amount`) to the MPC cluster.
    pub fn deposit(
        ctx: Context<Deposit>,
        computation_offset: u64,
        ciphertext_balance: [u8; 32],
        ciphertext_amount: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        instructions::deposit::handler(
            ctx,
            computation_offset,
            ciphertext_balance,
            ciphertext_amount,
            pubkey,
            nonce,
        )
    }

    #[arcium_callback(encrypted_ix = "deposit")]
    pub fn deposit_callback(
        ctx: Context<DepositCallback>,
        output: SignedComputationOutputs<DepositOutput>,
    ) -> Result<()> {
        instructions::deposit::callback(ctx, output)
    }

    /// One-time: register the `withdraw` circuit definition with the MXE.
    pub fn init_withdraw_comp_def(ctx: Context<InitWithdrawCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    /// Queue a confidential withdraw (`balance - amount`, amount revealed) to
    /// the MPC cluster.
    pub fn withdraw(
        ctx: Context<Withdraw>,
        computation_offset: u64,
        ciphertext_balance: [u8; 32],
        ciphertext_amount: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        instructions::withdraw::handler(
            ctx,
            computation_offset,
            ciphertext_balance,
            ciphertext_amount,
            pubkey,
            nonce,
        )
    }

    #[arcium_callback(encrypted_ix = "withdraw")]
    pub fn withdraw_callback(
        ctx: Context<WithdrawCallback>,
        output: SignedComputationOutputs<WithdrawOutput>,
    ) -> Result<()> {
        instructions::withdraw::callback(ctx, output)
    }

    pub fn init_view_balance_comp_def(ctx: Context<InitViewBalanceCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    pub fn view_balance(
        ctx: Context<ViewBalance>,
        computation_offset: u64,
        ciphertext_balance: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        instructions::view_balance::handler(ctx, computation_offset, ciphertext_balance, pubkey, nonce)
    }

    #[arcium_callback(encrypted_ix = "view_balance")]
    pub fn view_balance_callback(
        ctx: Context<ViewBalanceCallback>,
        output: SignedComputationOutputs<ViewBalanceOutput>,
    ) -> Result<()> {
        instructions::view_balance::callback(ctx, output)
    }

    pub fn init_prove_threshold_comp_def(ctx: Context<InitProveThresholdCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    pub fn prove_threshold(
        ctx: Context<ProveThreshold>,
        computation_offset: u64,
        ciphertext_balance: [u8; 32],
        ciphertext_threshold: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        instructions::prove_threshold::handler(
            ctx,
            computation_offset,
            ciphertext_balance,
            ciphertext_threshold,
            pubkey,
            nonce,
        )
    }

    #[arcium_callback(encrypted_ix = "prove_threshold")]
    pub fn prove_threshold_callback(
        ctx: Context<ProveThresholdCallback>,
        output: SignedComputationOutputs<ProveThresholdOutput>,
    ) -> Result<()> {
        instructions::prove_threshold::callback(ctx, output)
    }

    pub fn init_reveal_to_auditor_comp_def(
        ctx: Context<InitRevealToAuditorCompDef>,
    ) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    pub fn reveal_to_auditor(
        ctx: Context<RevealToAuditor>,
        computation_offset: u64,
        ciphertext_balance: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        instructions::reveal_to_auditor::handler(ctx, computation_offset, ciphertext_balance, pubkey, nonce)
    }

    #[arcium_callback(encrypted_ix = "reveal_to_auditor")]
    pub fn reveal_to_auditor_callback(
        ctx: Context<RevealToAuditorCallback>,
        output: SignedComputationOutputs<RevealToAuditorOutput>,
    ) -> Result<()> {
        instructions::reveal_to_auditor::callback(ctx, output)
    }

    pub fn init_batch_transfer_comp_def(ctx: Context<InitBatchTransferCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn batch_transfer(
        ctx: Context<BatchTransfer>,
        computation_offset: u64,
        ct_sender: [u8; 32],
        ct_r1: [u8; 32],
        ct_r2: [u8; 32],
        ct_r3: [u8; 32],
        ct_a1: [u8; 32],
        ct_a2: [u8; 32],
        ct_a3: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        instructions::batch_transfer::handler(
            ctx,
            computation_offset,
            ct_sender,
            ct_r1,
            ct_r2,
            ct_r3,
            ct_a1,
            ct_a2,
            ct_a3,
            pubkey,
            nonce,
        )
    }

    #[arcium_callback(encrypted_ix = "batch_transfer")]
    pub fn batch_transfer_callback(
        ctx: Context<BatchTransferCallback>,
        output: SignedComputationOutputs<BatchTransferOutput>,
    ) -> Result<()> {
        instructions::batch_transfer::callback(ctx, output)
    }

    pub fn init_init_balance_comp_def(ctx: Context<InitInitBalanceCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    /// Create a confidential balance account for (owner, mint) and queue the
    /// MPC computation that fills it with an encrypted zero.
    pub fn init_balance(ctx: Context<InitBalance>, computation_offset: u64) -> Result<()> {
        instructions::confidential_balance::init_balance_handler(ctx, computation_offset)
    }

    #[arcium_callback(encrypted_ix = "init_balance")]
    pub fn init_balance_callback(
        ctx: Context<InitBalanceCallback>,
        output: SignedComputationOutputs<InitBalanceOutput>,
    ) -> Result<()> {
        instructions::confidential_balance::init_balance_callback(ctx, output)
    }

    pub fn init_deposit_to_account_comp_def(
        ctx: Context<InitDepositToAccountCompDef>,
    ) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    /// Deposit real tokens into the vault and credit the confidential balance.
    /// `amount` is PUBLIC (the tokens visibly move into the vault), so it is
    /// passed to the circuit as plaintext and the credited amount is bound to
    /// the on-chain transfer — no balance can be minted from thin air. The MPC
    /// adds it to the stored ciphertext; the callback writes the new balance.
    pub fn deposit_to_account(
        ctx: Context<DepositToAccount>,
        computation_offset: u64,
        amount: u64,
    ) -> Result<()> {
        instructions::confidential_balance::deposit_to_account_handler(
            ctx,
            computation_offset,
            amount,
        )
    }

    #[arcium_callback(encrypted_ix = "deposit_to_account")]
    pub fn deposit_to_account_callback(
        ctx: Context<DepositToAccountCallback>,
        output: SignedComputationOutputs<DepositToAccountOutput>,
    ) -> Result<()> {
        instructions::confidential_balance::deposit_to_account_callback(ctx, output)
    }

    pub fn init_debit_from_account_comp_def(
        ctx: Context<InitDebitFromAccountCompDef>,
    ) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    /// Spend `amount` from the stored confidential balance with no-overdraft.
    /// The balance is read from the on-chain ciphertext (offset 9), not from the
    /// client — so the client can't claim a balance they don't have. The MPC
    /// enforces `balance >= amount`; the callback writes the new ciphertext back.
    pub fn debit_from_account(
        ctx: Context<DebitFromAccount>,
        computation_offset: u64,
        ciphertext_amount: [u8; 32],
        pubkey: [u8; 32],
        amount_nonce: u128,
    ) -> Result<()> {
        instructions::confidential_balance::debit_from_account_handler(
            ctx,
            computation_offset,
            ciphertext_amount,
            pubkey,
            amount_nonce,
        )
    }

    #[arcium_callback(encrypted_ix = "debit_from_account")]
    pub fn debit_from_account_callback(
        ctx: Context<DebitFromAccountCallback>,
        output: SignedComputationOutputs<DebitFromAccountOutput>,
    ) -> Result<()> {
        instructions::confidential_balance::debit_from_account_callback(ctx, output)
    }

    pub fn init_withdraw_from_account_comp_def(
        ctx: Context<InitWithdrawFromAccountCompDef>,
    ) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    /// Withdraw a PUBLIC `amount` of real tokens from the vault, debiting the
    /// confidential balance. Two-phase: the MPC checks `balance >= amount` over
    /// the hidden balance and reveals only the released amount; the callback
    /// releases exactly that many tokens (0 if short). The balance is read from
    /// the on-chain ciphertext (offset 9), so it can't be faked.
    pub fn withdraw_from_account(
        ctx: Context<WithdrawFromAccount>,
        computation_offset: u64,
        amount: u64,
    ) -> Result<()> {
        instructions::confidential_balance::withdraw_from_account_handler(
            ctx,
            computation_offset,
            amount,
        )
    }

    #[arcium_callback(encrypted_ix = "withdraw_from_account")]
    pub fn withdraw_from_account_callback(
        ctx: Context<WithdrawFromAccountCallback>,
        output: SignedComputationOutputs<WithdrawFromAccountOutput>,
    ) -> Result<()> {
        instructions::confidential_balance::withdraw_from_account_callback(ctx, output)
    }

    pub fn init_transfer_between_accounts_comp_def(
        ctx: Context<InitTransferBetweenAccountsCompDef>,
    ) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    /// Confidential transfer from the signer's balance to the receiver's balance.
    /// Both balances are read from on-chain ciphertext (offset 9) so neither can
    /// be faked; the MPC enforces no-overdraft. The callback writes both new
    /// ciphertexts back.
    pub fn transfer_between_accounts(
        ctx: Context<TransferBetweenAccounts>,
        computation_offset: u64,
        ciphertext_amount: [u8; 32],
        pubkey: [u8; 32],
        amount_nonce: u128,
    ) -> Result<()> {
        instructions::confidential_balance::transfer_between_accounts_handler(
            ctx,
            computation_offset,
            ciphertext_amount,
            pubkey,
            amount_nonce,
        )
    }

    #[arcium_callback(encrypted_ix = "transfer_between_accounts")]
    pub fn transfer_between_accounts_callback(
        ctx: Context<TransferBetweenAccountsCallback>,
        output: SignedComputationOutputs<TransferBetweenAccountsOutput>,
    ) -> Result<()> {
        instructions::confidential_balance::transfer_between_accounts_callback(ctx, output)
    }

    pub fn init_reveal_account_balance_comp_def(
        ctx: Context<InitRevealAccountBalanceCompDef>,
    ) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    /// Reveal the stored confidential balance (passes the on-chain ciphertext
    /// to the MPC cluster, which decrypts and reveals it).
    pub fn reveal_account_balance(
        ctx: Context<RevealAccountBalance>,
        computation_offset: u64,
    ) -> Result<()> {
        instructions::confidential_balance::reveal_account_balance_handler(ctx, computation_offset)
    }

    #[arcium_callback(encrypted_ix = "reveal_account_balance")]
    pub fn reveal_account_balance_callback(
        ctx: Context<RevealAccountBalanceCallback>,
        output: SignedComputationOutputs<RevealAccountBalanceOutput>,
    ) -> Result<()> {
        instructions::confidential_balance::reveal_account_balance_callback(ctx, output)
    }
}
