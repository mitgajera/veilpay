use anchor_lang::prelude::*;

use crate::errors::VeilPayError;
use crate::events::{BatchTransferMade, PrivateTransferMade};
use crate::state::ConfidentialBalance;
use crate::utils::{transfer_commitment, xor_64};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BatchTransferParams {
    pub encrypted_amount: [u8; 64],
    pub commitment_hash: [u8; 32],
    pub encrypted_receiver_tag: [u8; 64],
}

#[derive(Accounts)]
pub struct BatchTransfer<'info> {
    #[account(
        mut,
        seeds = [b"balance", sender.key().as_ref()],
        bump = sender_balance.bump,
        constraint = sender_balance.owner == sender.key() @ VeilPayError::Unauthorized,
        constraint = !sender_balance.is_frozen @ VeilPayError::AccountFrozen,
    )]
    pub sender_balance: Account<'info, ConfidentialBalance>,

    pub sender: Signer<'info>,
}

pub fn handler(
    ctx: Context<BatchTransfer>,
    transfers: Vec<BatchTransferParams>,
    sender_new_encrypted_balance: [u8; 64],
    sender_nonce: u64,
) -> Result<()> {
    require!(transfers.len() <= 5, VeilPayError::TooManyRecipients);
    require!(
        transfers.len() == ctx.remaining_accounts.len(),
        VeilPayError::AccountMismatch
    );
    require!(
        sender_nonce == ctx.accounts.sender_balance.nonce,
        VeilPayError::InvalidNonce
    );

    let clock = Clock::get()?;
    let program_id = crate::ID;

    for (transfer_params, receiver_account_info) in
        transfers.iter().zip(ctx.remaining_accounts.iter())
    {
        let mut receiver_data = receiver_account_info.try_borrow_mut_data()?;
        let mut receiver: ConfidentialBalance =
            ConfidentialBalance::try_deserialize(&mut receiver_data.as_ref())?;

        let expected_pda = Pubkey::create_program_address(
            &[
                b"balance",
                receiver.owner.as_ref(),
                &[receiver.bump],
            ],
            &program_id,
        )
        .map_err(|_| VeilPayError::InvalidCommitment)?;
        require!(
            expected_pda == receiver_account_info.key(),
            VeilPayError::Unauthorized
        );
        require!(!receiver.is_frozen, VeilPayError::AccountFrozen);

        let expected_commitment = transfer_commitment(
            &transfer_params.encrypted_amount,
            sender_nonce,
            &receiver.owner_commitment,
        );
        require!(
            expected_commitment == transfer_params.commitment_hash,
            VeilPayError::InvalidCommitment
        );

        receiver.pending_balance =
            xor_64(receiver.pending_balance, transfer_params.encrypted_amount);

        ConfidentialBalance::try_serialize(&receiver, &mut *receiver_data)?;

        emit!(PrivateTransferMade {
            commitment_hash: transfer_params.commitment_hash,
            encrypted_receiver_tag: transfer_params.encrypted_receiver_tag,
            slot: clock.slot,
            timestamp: clock.unix_timestamp,
        });
    }

    let sender = &mut ctx.accounts.sender_balance;
    sender.encrypted_balance = sender_new_encrypted_balance;
    sender.nonce = sender
        .nonce
        .checked_add(1)
        .ok_or(VeilPayError::Overflow)?;

    emit!(BatchTransferMade {
        sender_commitment: sender.owner_commitment,
        recipient_count: transfers.len() as u8,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
