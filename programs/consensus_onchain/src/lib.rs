use anchor_lang::prelude::*;
// pub mod errors;
mod errors;
mod instructions;
mod states;
mod utils;
use instructions::initialize::*;
use instructions::upload_validation::*;

declare_id!("2pc2q2DVkXNycXq4DAJqGRtosMmffq5KKHB7iXUoB3wH");

#[program]
pub mod consensus_onchain {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, admin_account: Pubkey, fee: u64) -> Result<()> {
        instructions::initialize::initialize(ctx, admin_account, fee)
    }
    pub fn upload_validation(
        ctx: Context<UploadValidation>,
        msg: Vec<u8>,
        sig: [u8; 64],
    ) -> Result<()> {
        instructions::upload_validation::upload_validation(ctx, msg, sig)
    }
}
