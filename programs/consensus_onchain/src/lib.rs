use anchor_lang::prelude::*;
// pub mod errors;
mod instructions;
mod states;
use instructions::initialize::*;


declare_id!("2pc2q2DVkXNycXq4DAJqGRtosMmffq5KKHB7iXUoB3wH");

#[program]
pub mod consensus_onchain {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, fee:u64) -> Result<()> {
        instructions::initialize::initialize(ctx, fee)
    }
}
