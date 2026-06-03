pub fn xor_64(a: [u8; 64], b: [u8; 64]) -> [u8; 64] {
    let mut result = [0u8; 64];
    for i in 0..64 {
        result[i] = a[i] ^ b[i];
    }
    result
}

pub fn is_valid_encrypted_tag(tag: &[u8; 64]) -> bool {
    tag.iter().any(|&b| b != 0)
}

pub fn is_valid_commitment(commitment: &[u8; 32]) -> bool {
    commitment.iter().any(|&b| b != 0)
}
