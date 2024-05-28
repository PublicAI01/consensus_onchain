use anchor_lang::prelude::*;
use solana_program::system_instruction;
use crate::errors::error::ErrorCode;
use crate::states::consensus::*;
#[derive(Accounts)]
pub struct Withdraw<'info> {
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

pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let config_state = &mut ctx.accounts.config;
    if !config_state.initialized {
        return Err(ErrorCode::NotInitialized.into());
    }
    let balance = ctx.accounts.config.get_lamports();
    ctx.accounts.config.sub_lamports(balance)?;
    ctx.accounts.payer.add_lamports(balance)?;
    Ok(())
}
