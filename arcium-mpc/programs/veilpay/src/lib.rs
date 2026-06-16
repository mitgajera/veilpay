use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use errors::ErrorCode;
use events::*;
use instructions::*;

declare_id!("AVqXCN6eZshXdAaRHhBV4AMxpsVZKj9jRCdSQptax7GD");

#[arcium_program]
pub mod veilpay {
    use super::*;
    use arcium_client::idl::arcium::types::CallbackAccount;

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
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(ciphertext_balance)
            .encrypted_u64(ciphertext_amount)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![DebitCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "debit")]
    pub fn debit_callback(
        ctx: Context<DebitCallback>,
        output: SignedComputationOutputs<DebitOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(DebitOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("Computation aborted, no valid MPC output: {}", e);
                return Err(ErrorCode::AbortedComputation.into());
            }
        };

        emit!(DebitEvent {
            new_balance: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
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
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "transfer")]
    pub fn transfer_callback(
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
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(ciphertext_balance)
            .encrypted_u64(ciphertext_amount)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![DepositCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "deposit")]
    pub fn deposit_callback(
        ctx: Context<DepositCallback>,
        output: SignedComputationOutputs<DepositOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(DepositOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("Computation aborted, no valid MPC output: {}", e);
                return Err(ErrorCode::AbortedComputation.into());
            }
        };

        emit!(DepositEvent {
            new_balance: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
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
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(ciphertext_balance)
            .encrypted_u64(ciphertext_amount)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![WithdrawCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "withdraw")]
    pub fn withdraw_callback(
        ctx: Context<WithdrawCallback>,
        output: SignedComputationOutputs<WithdrawOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(WithdrawOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("Computation aborted, no valid MPC output: {}", e);
                return Err(ErrorCode::AbortedComputation.into());
            }
        };

        emit!(WithdrawEvent {
            new_balance: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
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
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(ciphertext_balance)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![ViewBalanceCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "view_balance")]
    pub fn view_balance_callback(
        ctx: Context<ViewBalanceCallback>,
        output: SignedComputationOutputs<ViewBalanceOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(ViewBalanceOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("Computation aborted, no valid MPC output: {}", e);
                return Err(ErrorCode::AbortedComputation.into());
            }
        };

        emit!(ViewBalanceEvent {
            balance: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
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
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(ciphertext_balance)
            .encrypted_u64(ciphertext_threshold)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![ProveThresholdCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "prove_threshold")]
    pub fn prove_threshold_callback(
        ctx: Context<ProveThresholdCallback>,
        output: SignedComputationOutputs<ProveThresholdOutput>,
    ) -> Result<()> {
        // `prove_threshold` returns a REVEALED bool → field_0 is the value itself.
        let meets = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(ProveThresholdOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("Computation aborted, no valid MPC output: {}", e);
                return Err(ErrorCode::AbortedComputation.into());
            }
        };

        emit!(ProveThresholdEvent {
            meets_threshold: meets,
        });
        Ok(())
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
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(ciphertext_balance)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![RevealToAuditorCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "reveal_to_auditor")]
    pub fn reveal_to_auditor_callback(
        ctx: Context<RevealToAuditorCallback>,
        output: SignedComputationOutputs<RevealToAuditorOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(RevealToAuditorOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("Computation aborted, no valid MPC output: {}", e);
                return Err(ErrorCode::AbortedComputation.into());
            }
        };

        emit!(AuditorRevealEvent {
            balance: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
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
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(ct_sender)
            .encrypted_u64(ct_r1)
            .encrypted_u64(ct_r2)
            .encrypted_u64(ct_r3)
            .encrypted_u64(ct_a1)
            .encrypted_u64(ct_a2)
            .encrypted_u64(ct_a3)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![BatchTransferCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "batch_transfer")]
    pub fn batch_transfer_callback(
        ctx: Context<BatchTransferCallback>,
        output: SignedComputationOutputs<BatchTransferOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(BatchTransferOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("Computation aborted, no valid MPC output: {}", e);
                return Err(ErrorCode::AbortedComputation.into());
            }
        };

        emit!(BatchTransferEvent {
            new_sender: o.ciphertexts[0],
            new_r1: o.ciphertexts[1],
            new_r2: o.ciphertexts[2],
            new_r3: o.ciphertexts[3],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }

    pub fn init_init_balance_comp_def(ctx: Context<InitInitBalanceCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, None)?;
        Ok(())
    }

    /// Create a confidential balance account for (owner, mint) and queue the
    /// MPC computation that fills it with an encrypted zero.
    pub fn init_balance(ctx: Context<InitBalance>, computation_offset: u64) -> Result<()> {
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
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "init_balance")]
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
            // PUBLIC plaintext amount (bound to the token transfer above)
            .plaintext_u64(amount)
            // Enc<Mxe, u64> stored balance (read from the account at offset 9)
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
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "deposit_to_account")]
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
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let args = ArgBuilder::new()
            // Enc<Shared, u64> amount (from client)
            .x25519_pubkey(pubkey)
            .plaintext_u128(amount_nonce)
            .encrypted_u64(ciphertext_amount)
            // Enc<Mxe, u64> stored balance (read from the account at offset 9)
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
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "debit_from_account")]
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
        require!(amount > 0, ErrorCode::InvalidAmount);
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let args = ArgBuilder::new()
            // PUBLIC plaintext amount requested
            .plaintext_u64(amount)
            // Enc<Mxe, u64> stored balance (read from the account at offset 9)
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
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "withdraw_from_account")]
    pub fn withdraw_from_account_callback(
        ctx: Context<WithdrawFromAccountCallback>,
        output: SignedComputationOutputs<WithdrawFromAccountOutput>,
    ) -> Result<()> {
        // Tuple return: field_0 = new encrypted balance, field_1 = revealed
        // released amount (0 if the hidden balance was insufficient).
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
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let args = ArgBuilder::new()
            // Enc<Shared, u64> amount (from client)
            .x25519_pubkey(pubkey)
            .plaintext_u128(amount_nonce)
            .encrypted_u64(ciphertext_amount)
            // Enc<Mxe, u64> sender balance (read from account)
            .plaintext_u128(ctx.accounts.sender_balance.nonce)
            .account(ctx.accounts.sender_balance.key(), 8 + 1, 32)
            // Enc<Mxe, u64> receiver balance (read from account)
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
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "transfer_between_accounts")]
    pub fn transfer_between_accounts_callback(
        ctx: Context<TransferBetweenAccountsCallback>,
        output: SignedComputationOutputs<TransferBetweenAccountsOutput>,
    ) -> Result<()> {
        // The tuple return `(Enc<Mxe,u64>, Enc<Mxe,u64>)` arrives as a single
        // `field_0` struct whose fields are `field_0` (new_sender) and `field_1`
        // (new_receiver), each an Enc output with `.ciphertexts` and `.nonce`.
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
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "reveal_account_balance")]
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
}
