use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("6QPCy4uju8fKdzje3vkifX6YH6sRZ9ZuzyhdMjb25cGa");

#[program]
pub mod veilpay {
    use super::*;

    pub fn initialize_mint(ctx: Context<InitializeMint>) -> Result<()> {
        instructions::initialize_mint::handler(ctx)
    }

    pub fn initialize_existing_mint(ctx: Context<InitializeExistingMint>) -> Result<()> {
        instructions::initialize_existing_mint::handler(ctx)
    }

    pub fn init_balance(
        ctx: Context<InitBalance>,
        owner_commitment: [u8; 32],
    ) -> Result<()> {
        instructions::init_balance::handler(ctx, owner_commitment)
    }

    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
        new_encrypted_balance: [u8; 64],
        balance_commitment: [u8; 32],
    ) -> Result<()> {
        instructions::deposit::handler(ctx, amount, new_encrypted_balance, balance_commitment)
    }

    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount: u64,
        new_encrypted_balance: [u8; 64],
        balance_commitment: [u8; 32],
        withdrawal_proof: [u8; 32],
    ) -> Result<()> {
        instructions::withdraw::handler(
            ctx,
            amount,
            new_encrypted_balance,
            balance_commitment,
            withdrawal_proof,
        )
    }

    pub fn private_transfer(
        ctx: Context<PrivateTransfer>,
        encrypted_amount: [u8; 64],
        sender_new_encrypted_balance: [u8; 64],
        commitment_hash: [u8; 32],
        encrypted_receiver_tag: [u8; 64],
        sender_nonce: u64,
    ) -> Result<()> {
        instructions::private_transfer::handler(
            ctx,
            encrypted_amount,
            sender_new_encrypted_balance,
            commitment_hash,
            encrypted_receiver_tag,
            sender_nonce,
        )
    }

    pub fn apply_pending_balance(
        ctx: Context<ApplyPendingBalance>,
        new_encrypted_balance: [u8; 64],
        new_balance_commitment: [u8; 32],
    ) -> Result<()> {
        instructions::apply_pending_balance::handler(
            ctx,
            new_encrypted_balance,
            new_balance_commitment,
        )
    }

    pub fn close_account(ctx: Context<CloseAccount>) -> Result<()> {
        instructions::close_account::handler(ctx)
    }

    pub fn batch_transfer(
        ctx: Context<BatchTransfer>,
        transfers: Vec<BatchTransferParams>,
        sender_new_encrypted_balance: [u8; 64],
        sender_nonce: u64,
    ) -> Result<()> {
        instructions::batch_transfer::handler(
            ctx,
            transfers,
            sender_new_encrypted_balance,
            sender_nonce,
        )
    }
}
