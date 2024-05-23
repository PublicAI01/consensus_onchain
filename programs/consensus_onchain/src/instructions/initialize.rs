use crate::states::consensus::*;
use anchor_lang::prelude::*;
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
    init,
    seeds = [b"config".as_ref()],
    bump,
    payer = payer,
    space = Config::space()
    )]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>, admin_account: Pubkey, fee: u64) -> Result<()> {
    let config_state = &mut ctx.accounts.config;
    config_state.admin_account = admin_account;
    config_state.fee = fee;
    Ok(())
}
