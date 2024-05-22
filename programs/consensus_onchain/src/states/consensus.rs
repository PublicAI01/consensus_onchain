use anchor_lang::prelude::*;

#[account]
pub struct Config {
    pub fee: u64,  //upload consensus fee
    pub bump: u8,
}

impl Config {
    pub fn space() -> usize {
        8 + 8 + 1
    }
}

#[account]
pub struct GlobalConsensusState {
    pub timestamp: u64,
    pub consensus_proof:[u8;32],
}