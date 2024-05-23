use crate::states::consensus::*;
use crate::utils;
use anchor_lang::prelude::*;
use solana_program::instruction::Instruction;
use solana_program::sysvar::instructions::{load_instruction_at_checked, ID as IX_ID};
#[derive(Accounts)]
pub struct UploadValidation<'info> {
    pub user: Signer<'info>,
    #[account(
    mut,
    seeds = [b"config".as_ref()],
    bump,
    )]
    pub config: Box<Account<'info, Config>>,
    /// CHECK: The address check is needed because otherwise
    /// the supplied Sysvar could be anything else.
    /// The Instruction Sysvar has not been implemented
    /// in the Anchor framework yet, so this is the safe approach.
    #[account(address = IX_ID)]
    pub ix_sysvar: AccountInfo<'info>,
}
pub fn upload_validation(
    ctx: Context<UploadValidation>,
    msg: Vec<u8>,
    sig: [u8; 64],
) -> Result<()> {
    let config_state = &mut ctx.accounts.config;
    let admin_key = config_state.admin_account.to_bytes();
    // Get what should be the Ed25519Program instruction
    let ix: Instruction = load_instruction_at_checked(0, &ctx.accounts.ix_sysvar)?;
    config_state.fee = 33;
    // Check that ix is what we expect to have been sent
    utils::verify_ed25519_ix(&ix, &admin_key, &msg, &sig)?;
    Ok(())
}
