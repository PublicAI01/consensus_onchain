use anchor_lang::prelude::*;
use solana_program::pubkey::Pubkey;

#[account]
pub struct StateAccount {
    /// The mint address of the token to be distributed
    pub token_mint: Pubkey,

    /// The token vault that holds the tokens to be distributed
    pub token_vault: Pubkey,

    /// PDA bump seed
    pub bump: u8,

    /// Total claimed.
    pub claimed: u64,

    /// Reserved space for future upgrades
    pub reserved: [u8; 64],
}

impl StateAccount {
    pub const LEN: usize = 32 + // token_mint
        32 + // token_vault
        1 +  // bump
        8 + // claimed
        64;  // reserved
}

// #[account]
// #[derive(InitSpace)]
// pub struct ClaimPool {
//     pub claimed: u64,
// }

#[account]
#[derive(InitSpace)]
pub struct ClaimReward {
    pub owner: Pubkey,
    pub reward: u64,
    pub times: u16,
}