use crate::errors::error::ErrorCode;
use crate::states::consensus::*;
use anchor_lang::prelude::*;
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
    init,
    seeds = [b"config".as_ref()],
    bump,
    payer = payer,
    space = 8 + Config::INIT_SPACE
    )]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>, signer: Pubkey, fee: u64) -> Result<()> {
    let config_state = &mut ctx.accounts.config;
    if config_state.initialized {
        return Err(ErrorCode::Initialized.into());
    }
    config_state.owner = *ctx.accounts.payer.key;
    config_state.signer = signer;
    config_state.fee = fee;
    config_state.initialized = true;
    Ok(())
}
