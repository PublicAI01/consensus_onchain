use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub signer: Pubkey,
    pub owner: Pubkey,
    pub fee: u64, //upload consensus fee
    pub initialized: bool,
    pub bump: u8,
}

// impl Config {
//     pub fn space() -> usize {
//         8 + 32 + 8 + 1
//     }
// }

#[account]
#[derive(InitSpace)]
pub struct ConsensusState {
    pub global: bool,
    pub timestamp: u64,
    pub consensus_proof: [u8; 32],
    pub bump: u8,
}
