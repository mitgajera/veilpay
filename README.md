# VeilPay

**Private Payments with Public UX on Solana**

VeilPay is a privacy-first payment protocol on Solana that enables fully private SPL token transfers while preserving wallet-like UX, notifications, and auditability. Built with Arcium confidential SPL and Helius privacy-safe indexing.

---

## Problem Statement

On Solana today, every payment leaks sensitive financial data:

- Wallet balances are public
- Transfer amounts are visible
- Wallets can be clustered through address reuse
- Indexers expose full transaction history

VeilPay solves this by combining encrypted balances with privacy-safe metadata indexing.

---

## Architecture

### Core Components

**Arcium Confidential SPL (cSPL)** - Encrypted balances and transfers  
**Helius Privacy-Safe Indexing** - Activity feeds without exposing sensitive data  
**Stealth Addresses** - Prevents wallet clustering  
**Selective Disclosure Proofs** - Optional compliance and audits

### Privacy Model

**Private:**
- Wallet balances (encrypted with Arcium MPC)
- Transfer amounts (never revealed on-chain)
- Sender/receiver identities (hidden via commitments and stealth addresses)

**Public:**
- Transaction existence (timestamp and slot)
- Validity proofs (cryptographic commitments)
- Event metadata (non-sensitive data for indexing)

### Account Structure

```
ConfidentialBalance Account:
- owner_commitment: [u8; 32]  (Hashed owner pubkey)
- encrypted_balance: [u8; 64] (Arcium encrypted value)
- nonce: u64                  (Replay protection)
- bump: u8                    (PDA bump seed)
```

---

## Features

### Core
- Confidential balance storage using Arcium MPC
- Private transfers with encrypted amounts
- Stealth addresses for recipient privacy
- Replay protection via nonces
- Owner verification through commitments
- Privacy-safe event emission for indexing

### Security
- End-to-end encryption for sensitive data
- Range proofs for balance validation
- Zero-knowledge proofs for correctness
- Access control via owner commitments

---

## Installation

### Prerequisites

- Rust 1.75+
- Solana CLI 1.18+
- Anchor 0.32+
- Node.js 18+

### Setup

```bash
# Clone repository
git clone <repository-url>
cd veilpay

# Build program
cd veilpay
anchor build

# Run tests
anchor test

# Setup frontend
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=your_program_id
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_key
NEXT_PUBLIC_ARCIUM_API_KEY=your_arcium_key
```

---

## Usage

### Initialize Balance

```typescript
const balancePda = PublicKey.findProgramAddressSync(
  [Buffer.from("balance"), owner.publicKey.toBuffer()],
  program.programId
)[0];

await program.methods
  .initBalance()
  .accounts({
    confidentialBalance: balancePda,
    owner: owner.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([owner])
  .rpc();
```

### Private Transfer

```typescript
const encryptedAmount = encryptAmount(100);
const commitmentHash = generateCommitmentHash(encryptedAmount, nonce, recipientPubkey);
const encryptedTag = generateEncryptedTag(recipientPubkey, senderSecret);

await program.methods
  .privateTransfer(encryptedAmount, new BN(nonce), commitmentHash, encryptedTag)
  .accounts({
    senderBalance: senderBalancePda,
    receiverBalance: receiverBalancePda,
    sender: sender.publicKey,
  })
  .signers([sender])
  .rpc();
```

---

## Testing

```bash
cd veilpay
anchor test
```

Test coverage includes:
- Mint initialization
- Balance initialization
- Private transfers (success and error cases)
- Replay attack prevention
- State consistency validation
- Integration scenarios

---

## Deployment

### Devnet

```bash
cd veilpay
anchor build
anchor deploy --provider.cluster devnet
```

### Mainnet

```bash
anchor build
anchor deploy --provider.cluster mainnet-beta
```

---

## Security

VeilPay implements multiple security layers:

1. **Encryption** - All balances encrypted with Arcium MPC
2. **Access Control** - Owner commitment verification and signature requirements
3. **Privacy** - Stealth addresses and encrypted tags prevent clustering
4. **Replay Protection** - Nonce-based transaction validation

---

## Project Structure

```
veilpay/
├── veilpay/              # Solana Program
│   ├── programs/
│   │   └── veilpay/
│   │       └── src/
│   │           ├── instructions/
│   │           ├── state/
│   │           ├── utils/
│   │           └── lib.rs
│   └── tests/
│
└── frontend/             # Next.js Frontend
    ├── app/
    ├── components/
    ├── contexts/
    └── lib/
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

---

## License

MIT License - see LICENSE file for details.

---

## Documentation

- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Detailed project overview
- [FRONTEND_SETUP.md](./FRONTEND_SETUP.md) - Frontend setup guide
- [TEST_COVERAGE.md](./TEST_COVERAGE.md) - Test coverage details
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Implementation guide

---

## External Resources

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Documentation](https://www.anchor-lang.com/docs)
- [Arcium Documentation](https://docs.arcium.com/)
- [Helius Documentation](https://docs.helius.dev/)

---

**Built with ❤️ for Solana - Making privacy practical, one transaction at a time.**