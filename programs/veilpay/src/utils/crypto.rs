use anchor_lang::prelude::*;
use solana_keccak_hasher::hashv;
use crate::constants::*;

pub fn cspl_assert_ge(
    balance: &[u8; ENCRYPTED_VALUE_SIZE],
    amount: &[u8; ENCRYPTED_VALUE_SIZE],
) -> Result<()> {
    let balance_c1 = &balance[0..ELGAMAL_C1_SIZE];
    let balance_c2 = &balance[ELGAMAL_C1_SIZE..ENCRYPTED_VALUE_SIZE];
    let amount_c1 = &amount[0..ELGAMAL_C1_SIZE];
    let amount_c2 = &amount[ELGAMAL_C1_SIZE..ENCRYPTED_VALUE_SIZE];

    let balance_commitment = hashv(&[balance_c1, balance_c2]);
    let _amount_commitment = hashv(&[amount_c1, amount_c2]);

    let balance_value = extract_encrypted_value(balance);
    let amount_value = extract_encrypted_value(amount);

    require!(
        balance_value >= amount_value,
        ErrorCode::InsufficientBalance
    );

    require!(
        balance_commitment.as_ref() != [0u8; 32],
        ErrorCode::InvalidEncryption
    );

    Ok(())
}

pub fn cspl_sub(
    balance: &[u8; ENCRYPTED_VALUE_SIZE],
    amount: &[u8; ENCRYPTED_VALUE_SIZE],
) -> Result<[u8; ENCRYPTED_VALUE_SIZE]> {
    let mut result = [0u8; ENCRYPTED_VALUE_SIZE];

    let balance_c1 = &balance[0..ELGAMAL_C1_SIZE];
    let balance_c2 = &balance[ELGAMAL_C1_SIZE..ENCRYPTED_VALUE_SIZE];
    let amount_c1 = &amount[0..ELGAMAL_C1_SIZE];
    let amount_c2 = &amount[ELGAMAL_C1_SIZE..ENCRYPTED_VALUE_SIZE];

    for i in 0..ELGAMAL_C1_SIZE {
        result[i] = balance_c1[i].wrapping_sub(amount_c1[i]);
    }

    for i in 0..ELGAMAL_C2_SIZE {
        result[ELGAMAL_C1_SIZE + i] = balance_c2[i].wrapping_sub(amount_c2[i]);
    }

    let result_commitment = hashv(&[&result[0..ELGAMAL_C1_SIZE], &result[ELGAMAL_C1_SIZE..ENCRYPTED_VALUE_SIZE]]);
    require!(
        result_commitment.as_ref() != [0u8; 32],
        ErrorCode::InvalidEncryption
    );

    Ok(result)
}

pub fn cspl_add(
    balance: &[u8; ENCRYPTED_VALUE_SIZE],
    amount: &[u8; ENCRYPTED_VALUE_SIZE],
) -> Result<[u8; ENCRYPTED_VALUE_SIZE]> {
    let mut result = [0u8; ENCRYPTED_VALUE_SIZE];

    let balance_c1 = &balance[0..ELGAMAL_C1_SIZE];
    let balance_c2 = &balance[ELGAMAL_C1_SIZE..ENCRYPTED_VALUE_SIZE];
    let amount_c1 = &amount[0..ELGAMAL_C1_SIZE];
    let amount_c2 = &amount[ELGAMAL_C1_SIZE..ENCRYPTED_VALUE_SIZE];

    for i in 0..ELGAMAL_C1_SIZE {
        result[i] = balance_c1[i].wrapping_add(amount_c1[i]);
    }

    for i in 0..ELGAMAL_C2_SIZE {
        result[ELGAMAL_C1_SIZE + i] = balance_c2[i].wrapping_add(amount_c2[i]);
    }

    let result_commitment = hashv(&[&result[0..ELGAMAL_C1_SIZE], &result[ELGAMAL_C1_SIZE..ENCRYPTED_VALUE_SIZE]]);
    require!(
        result_commitment.as_ref() != [0u8; 32],
        ErrorCode::InvalidEncryption
    );

    Ok(result)
}

pub fn encrypt_amount(amount: u64) -> [u8; ENCRYPTED_VALUE_SIZE] {
    let mut encrypted = [0u8; ENCRYPTED_VALUE_SIZE];
    let amount_bytes = amount.to_le_bytes();

    let c1_seed = hashv(&[&amount_bytes, b"c1"]);
    let c2_seed = hashv(&[&amount_bytes, b"c2"]);

    encrypted[0..ELGAMAL_C1_SIZE].copy_from_slice(&c1_seed.to_bytes()[0..ELGAMAL_C1_SIZE]);
    encrypted[ELGAMAL_C1_SIZE..ENCRYPTED_VALUE_SIZE].copy_from_slice(&c2_seed.to_bytes()[0..ELGAMAL_C2_SIZE]);

    encrypted
}

fn extract_encrypted_value(encrypted: &[u8; ENCRYPTED_VALUE_SIZE]) -> u64 {
    let c1 = &encrypted[0..ELGAMAL_C1_SIZE];
    let c2 = &encrypted[ELGAMAL_C1_SIZE..ENCRYPTED_VALUE_SIZE];
    
    let combined = [c1, c2].concat();
    let hash = hashv(&[&combined]);
    
    let mut value_bytes = [0u8; 8];
    value_bytes.copy_from_slice(&hash.to_bytes()[0..8]);
    u64::from_le_bytes(value_bytes)
}

pub fn generate_encrypted_tag(
    recipient_pubkey: &Pubkey,
    sender_secret: &[u8; 32],
) -> [u8; 32] {
    let recipient_bytes = recipient_pubkey.as_ref();
    let shared_seed = [recipient_bytes, sender_secret].concat();
    hashv(&[&shared_seed]).to_bytes()
}

pub fn generate_commitment_hash(
    encrypted_amount: &[u8; ENCRYPTED_VALUE_SIZE],
    sender_nonce: u64,
    recipient_pubkey: &Pubkey,
) -> [u8; 32] {
    let nonce_bytes = sender_nonce.to_le_bytes();
    let combined = [encrypted_amount.as_ref(), &nonce_bytes, recipient_pubkey.as_ref()].concat();
    hashv(&[&combined]).to_bytes()
}

pub fn verify_commitment_hash(
    commitment_hash: &[u8; 32],
    encrypted_amount: &[u8; ENCRYPTED_VALUE_SIZE],
    sender_nonce: u64,
    recipient_pubkey: &Pubkey,
) -> bool {
    let expected = generate_commitment_hash(encrypted_amount, sender_nonce, recipient_pubkey);
    commitment_hash == expected.as_ref()
}

pub fn verify_encrypted_tag(
    encrypted_tag: &[u8; 32],
    recipient_pubkey: &Pubkey,
    sender_secret: &[u8; 32],
) -> bool {
    let expected_tag = generate_encrypted_tag(recipient_pubkey, sender_secret);
    encrypted_tag == expected_tag.as_ref()
}

pub fn derive_stealth_address(
    recipient_pubkey: &Pubkey,
    sender_secret: &[u8; 32],
) -> [u8; 32] {
    let tag = generate_encrypted_tag(recipient_pubkey, sender_secret);
    hashv(&[recipient_pubkey.as_ref(), &tag]).to_bytes()
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient balance for this operation")]
    InsufficientBalance,
    #[msg("Invalid encryption format")]
    InvalidEncryption,
}
