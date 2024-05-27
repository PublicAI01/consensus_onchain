use crate::errors::error::ErrorCode;
use crate::states::consensus::*;
use anchor_lang::prelude::*;
#[derive(Accounts)]
pub struct Update<'info> {
    #[account(
    mut,
    seeds = [b"config".as_ref()],
    bump,
    )]
    pub config: Box<Account<'info, Config>>,
    #[account(mut,
    constraint = config.owner == payer.key()
    )]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn update(ctx: Context<Update>, signer: Pubkey, fee: u64) -> Result<()> {
    let config_state = &mut ctx.accounts.config;
    if !config_state.initialized {
        return Err(ErrorCode::NotInitialized.into());
    }
    // if config_state.owner != *ctx.accounts.payer.key{
    //     return Err(ErrorCode::AccountError.into());
    // }
    config_state.signer = signer;
    config_state.fee = fee;
    Ok(())
}
