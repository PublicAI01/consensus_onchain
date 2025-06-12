use anchor_lang::prelude::*;
mod errors;
mod instructions;
mod states;
mod utils;
use instructions::initialize::*;
use instructions::update::*;
use instructions::upload_validation::*;
use instructions::withdraw::*;
use instructions::upload_badge::*;
use instructions::claim::*;

declare_id!("B2fHGq6iwRPGmn3KBUFBgQpxVnDGFQT3ZjD2vJTDphZn");

#[program]
pub mod consensus_onchain {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, signer: Pubkey, fee: u64) -> Result<()> {
        instructions::initialize::initialize(ctx, signer, fee)
    }
    pub fn upload_validation(
        ctx: Context<UploadValidation>,
        timestamp: u64,
        msg: Vec<u8>,
        sig: [u8; 64],
    ) -> Result<()> {
        instructions::upload_validation::upload_validation(ctx, timestamp, msg, sig)
    }

    pub fn update(ctx: Context<Update>, signer: Pubkey, fee: u64) -> Result<()> {
        instructions::update::update(ctx, signer, fee)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::withdraw(ctx, amount)
    }

    pub fn upload_badge(
        ctx: Context<UploadBadge>,
        quiz: u64,
        msg: Vec<u8>,
        sig: [u8; 64],
    ) -> Result<()> {
        instructions::upload_badge::upload_badge(ctx, quiz, msg, sig)
    }

    pub fn ini_claim(
        ctx: Context<IniClaim>,
    ) -> Result<()> {
        instructions::claim::ini_claim(ctx)
    }

    pub fn claim(
        ctx: Context<Claim>,
        task:u16,
        msg: Vec<u8>,
        sig: [u8; 64],
    ) -> Result<()>{
        instructions::claim::claim(ctx, task, msg, sig)
    }
}
