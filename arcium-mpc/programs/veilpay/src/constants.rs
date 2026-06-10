use arcium_anchor::prelude::*;

/// Circuit computation-definition offsets (one per Arcis `#[instruction]`).
pub const COMP_DEF_OFFSET_DEBIT: u32 = comp_def_offset("debit");
pub const COMP_DEF_OFFSET_TRANSFER: u32 = comp_def_offset("transfer");
pub const COMP_DEF_OFFSET_DEPOSIT: u32 = comp_def_offset("deposit");
pub const COMP_DEF_OFFSET_WITHDRAW: u32 = comp_def_offset("withdraw");
pub const COMP_DEF_OFFSET_VIEW_BALANCE: u32 = comp_def_offset("view_balance");
pub const COMP_DEF_OFFSET_PROVE_THRESHOLD: u32 = comp_def_offset("prove_threshold");
pub const COMP_DEF_OFFSET_REVEAL_TO_AUDITOR: u32 = comp_def_offset("reveal_to_auditor");
pub const COMP_DEF_OFFSET_BATCH_TRANSFER: u32 = comp_def_offset("batch_transfer");
// Stage 3: persistent MXE-owned balances stored on-chain.
pub const COMP_DEF_OFFSET_INIT_BALANCE: u32 = comp_def_offset("init_balance");
pub const COMP_DEF_OFFSET_DEPOSIT_TO_ACCOUNT: u32 = comp_def_offset("deposit_to_account");
pub const COMP_DEF_OFFSET_DEBIT_FROM_ACCOUNT: u32 = comp_def_offset("debit_from_account");
pub const COMP_DEF_OFFSET_REVEAL_ACCOUNT_BALANCE: u32 =
    comp_def_offset("reveal_account_balance");
