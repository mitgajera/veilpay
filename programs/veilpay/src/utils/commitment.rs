use solana_program::hash::hashv;

pub fn commitment_hash(a: &[u8], b: &[u8]) -> [u8; 32] {
    hashv(&[a, b]).to_bytes()
}

pub fn transfer_commitment(
    encrypted_amount: &[u8; 64],
    sender_nonce: u64,
    receiver_commitment: &[u8; 32],
) -> [u8; 32] {
    hashv(&[
        encrypted_amount.as_ref(),
        &sender_nonce.to_le_bytes(),
        receiver_commitment.as_ref(),
    ])
    .to_bytes()
}

pub fn withdrawal_proof_hash(
    owner_commitment: &[u8; 32],
    amount: u64,
    nonce: u64,
) -> [u8; 32] {
    hashv(&[
        owner_commitment.as_ref(),
        &amount.to_le_bytes(),
        &nonce.to_le_bytes(),
    ])
    .to_bytes()
}
