use arcis::*;

/// VeilPay confidential payment circuits — run inside the Arcium MPC cluster.
/// No node ever sees plaintext balances or amounts.
#[encrypted]
mod circuits {
    use arcis::*;

    pub struct DebitInput {
        balance: u64,
        amount: u64,
    }

    pub struct BalanceOnly {
        balance: u64,
    }

    // Persistent MXE-owned balances (stored on-chain as Enc<Mxe, u64>)

    /// Create a fresh confidential balance of 0, encrypted to the MXE.
    #[instruction]
    pub fn init_balance() -> Enc<Mxe, u64> {
        let zero: u64 = 0;
        Mxe::get().from_arcis(zero)
    }

    /// Add the client-encrypted `amount` to the stored MXE-owned balance.
    /// Saturating: if the deposit would exceed u64::MAX, cap rather than wrap.
    #[instruction]
    pub fn deposit_to_account(
        amount_ctxt: Enc<Shared, u64>,
        balance_ctxt: Enc<Mxe, u64>,
    ) -> Enc<Mxe, u64> {
        let amount = amount_ctxt.to_arcis();
        let balance = balance_ctxt.to_arcis();
        let sum = balance + amount;
        let new_balance = if sum < balance { u64::MAX } else { sum };
        balance_ctxt.owner.from_arcis(new_balance)
    }

    /// Spend `amount` from the stored MXE-owned balance with no-overdraft.
    /// The balance is read from on-chain ciphertext (client can't fake it); if
    /// `balance < amount` the balance is left unchanged (oblivious select).
    #[instruction]
    pub fn debit_from_account(
        amount_ctxt: Enc<Shared, u64>,
        balance_ctxt: Enc<Mxe, u64>,
    ) -> Enc<Mxe, u64> {
        let amount = amount_ctxt.to_arcis();
        let balance = balance_ctxt.to_arcis();
        let sufficient = balance >= amount;
        let new_balance = if sufficient { balance - amount } else { balance };
        balance_ctxt.owner.from_arcis(new_balance)
    }

    /// Confidential transfer between two stored MXE-owned balances: debit the
    /// sender (no-overdraft) and credit the receiver (saturating). Both balances
    /// are read from on-chain ciphertext, so neither side can be faked. Nothing
    /// moves if the sender is short. Returns (new_sender, new_receiver).
    #[instruction]
    pub fn transfer_between_accounts(
        amount_ctxt: Enc<Shared, u64>,
        sender_ctxt: Enc<Mxe, u64>,
        receiver_ctxt: Enc<Mxe, u64>,
    ) -> (Enc<Mxe, u64>, Enc<Mxe, u64>) {
        let amount = amount_ctxt.to_arcis();
        let sender = sender_ctxt.to_arcis();
        let receiver = receiver_ctxt.to_arcis();
        let sufficient = sender >= amount;
        let moved = if sufficient { amount } else { 0 };
        let new_sender = sender - moved;
        let recv_sum = receiver + moved;
        let new_receiver = if recv_sum < receiver { u64::MAX } else { recv_sum };
        (
            sender_ctxt.owner.from_arcis(new_sender),
            receiver_ctxt.owner.from_arcis(new_receiver),
        )
    }

    /// Reveal the stored MXE-owned balance (verification/testing).
    #[instruction]
    pub fn reveal_account_balance(balance_ctxt: Enc<Mxe, u64>) -> u64 {
        balance_ctxt.to_arcis().reveal()
    }

    /// Debit with no-overdraft: unchanged if `balance < amount` (oblivious select).
    #[instruction]
    pub fn debit(input_ctxt: Enc<Shared, DebitInput>) -> Enc<Shared, u64> {
        let input = input_ctxt.to_arcis();
        let sufficient = input.balance >= input.amount;
        let new_balance = if sufficient {
            input.balance - input.amount
        } else {
            input.balance
        };
        input_ctxt.owner.from_arcis(new_balance)
    }

    pub struct TransferInput {
        sender_balance: u64,
        receiver_balance: u64,
        amount: u64,
    }

    pub struct TransferResult {
        new_sender_balance: u64,
        new_receiver_balance: u64,
    }

    /// Move `amount` from sender to receiver with no-overdraft; nothing moves if insufficient.
    #[instruction]
    pub fn transfer(input_ctxt: Enc<Shared, TransferInput>) -> Enc<Shared, TransferResult> {
        let input = input_ctxt.to_arcis();
        let sufficient = input.sender_balance >= input.amount;
        let moved = if sufficient { input.amount } else { 0 };
        let recv_sum = input.receiver_balance + moved;
        let new_receiver = if recv_sum < input.receiver_balance { u64::MAX } else { recv_sum };
        input_ctxt.owner.from_arcis(TransferResult {
            new_sender_balance: input.sender_balance - moved,
            new_receiver_balance: new_receiver,
        })
    }

    /// Add `amount` to the confidential balance (real tokens move publicly into
    /// the vault). Saturating: cap at u64::MAX rather than wrapping on overflow.
    #[instruction]
    pub fn deposit(input_ctxt: Enc<Shared, DebitInput>) -> Enc<Shared, u64> {
        let input = input_ctxt.to_arcis();
        let sum = input.balance + input.amount;
        let new_balance = if sum < input.balance { u64::MAX } else { sum };
        input_ctxt.owner.from_arcis(new_balance)
    }

    /// Debit on withdraw with no-overdraft check.
    #[instruction]
    pub fn withdraw(input_ctxt: Enc<Shared, DebitInput>) -> Enc<Shared, u64> {
        let input = input_ctxt.to_arcis();
        let sufficient = input.balance >= input.amount;
        let withdrawn = if sufficient { input.amount } else { 0 };
        input_ctxt.owner.from_arcis(input.balance - withdrawn)
    }

    /// Re-encrypt the balance to the requester's key so only they can view it.
    #[instruction]
    pub fn view_balance(input_ctxt: Enc<Shared, BalanceOnly>) -> Enc<Shared, u64> {
        let input = input_ctxt.to_arcis();
        input_ctxt.owner.from_arcis(input.balance)
    }

    pub struct ThresholdInput {
        balance: u64,
        threshold: u64,
    }

    /// Solvency proof: reveal only whether `balance >= threshold`.
    #[instruction]
    pub fn prove_threshold(input_ctxt: Enc<Shared, ThresholdInput>) -> bool {
        let input = input_ctxt.to_arcis();
        (input.balance >= input.threshold).reveal()
    }

    /// Re-encrypt the balance to an auditor's key (selective disclosure).
    #[instruction]
    pub fn reveal_to_auditor(input_ctxt: Enc<Shared, BalanceOnly>) -> Enc<Shared, u64> {
        let input = input_ctxt.to_arcis();
        input_ctxt.owner.from_arcis(input.balance)
    }

    pub struct BatchInput {
        sender_balance: u64,
        r1_balance: u64,
        r2_balance: u64,
        r3_balance: u64,
        a1: u64,
        a2: u64,
        a3: u64,
    }

    pub struct BatchResult {
        new_sender: u64,
        new_r1: u64,
        new_r2: u64,
        new_r3: u64,
    }

    /// Send secret amounts to 3 recipients in one computation; nothing moves if total exceeds balance.
    #[instruction]
    pub fn batch_transfer(input_ctxt: Enc<Shared, BatchInput>) -> Enc<Shared, BatchResult> {
        let input = input_ctxt.to_arcis();
        let total = input.a1 + input.a2 + input.a3;
        let sufficient = input.sender_balance >= total;
        let m1 = if sufficient { input.a1 } else { 0 };
        let m2 = if sufficient { input.a2 } else { 0 };
        let m3 = if sufficient { input.a3 } else { 0 };
        input_ctxt.owner.from_arcis(BatchResult {
            new_sender: input.sender_balance - (m1 + m2 + m3),
            new_r1: input.r1_balance + m1,
            new_r2: input.r2_balance + m2,
            new_r3: input.r3_balance + m3,
        })
    }
}
