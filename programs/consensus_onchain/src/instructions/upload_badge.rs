use crate::errors::error::ErrorCode;
use crate::states::badge::*;
use crate::states::consensus::Config;
use crate::utils;
use anchor_lang::prelude::*;
use serde::{Deserialize, Serialize};
use solana_program::instruction::Instruction;
use solana_program::system_instruction;
use solana_program::sysvar::instructions::{
    load_current_index_checked, load_instruction_at_checked, ID as IX_ID,
};

#[derive(Serialize, Deserialize)]
struct BadgeInfo {
    /// Quiz id.
    pub quiz: u64,
    /// Tier of badge.
    pub tier: u64,
    /// Owner of badge.
    pub owner: Pubkey,
}
#[derive(Accounts)]
#[instruction(quiz:u64)]
pub struct UploadBadge<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
    mut,
    seeds = [b"config".as_ref()],
    bump,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(
    init_if_needed,
    seeds = [b"bdt_cfg_pool".as_ref()],
    bump,
    payer = user,
    space = 8 + BadgeConfigPool::INIT_SPACE
    )]
    pub badge_config_pool: Box<Account<'info, BadgeConfigPool>>,

    #[account(
    init_if_needed,
    seeds = [b"bdt_cfg".as_ref(), format!("{}", quiz).as_ref()],
    bump,
    payer = user,
    space = 8 + BadgeConfig::INIT_SPACE
    )]
    pub badge_config: Box<Account<'info, BadgeConfig>>,

    #[account(
    init,
    seeds = [format!("{}", quiz).as_ref(), user.key().as_ref()],
    bump,
    payer = user,
    space = 8 + Badge::INIT_SPACE
    )]
    pub badge: Box<Account<'info, Badge>>,
    /// CHECK: The address check is needed because otherwise
    /// the supplied Sysvar could be anything else.
    /// The Instruction Sysvar has not been implemented
    /// in the Anchor framework yet, so this is the safe approach.
    #[account(address = IX_ID)]
    pub ix_sysvar: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
pub fn upload_badge(
    ctx: Context<UploadBadge>,
    quiz: u64,
    msg: Vec<u8>,
    sig: [u8; 64],
) -> Result<()> {
    msg!("quiz:{}, msg:{:?}", quiz, msg);
    require!(quiz != 0, ErrorCode::InvalidQuizIDError);

    let msg_str = String::from_utf8(msg.clone()).map_err(|_| ErrorCode::MessageShouldString)?;

    let badge_info: BadgeInfo =
        serde_json::from_str(&msg_str).map_err(|_| ErrorCode::MessageShouldJson)?;

    let owner = *ctx.accounts.user.key;
    require!(owner == badge_info.owner, ErrorCode::InvalidOwnerError);

    let config_state = &ctx.accounts.config;

    if !config_state.initialized {
        return Err(ErrorCode::NotInitialized.into());
    }

    let signer_key = config_state.signer.to_bytes();

    // Get what should be the Ed25519Program instruction
    let index = load_current_index_checked(&ctx.accounts.ix_sysvar)?;
    let ix: Instruction = load_instruction_at_checked((index - 1).into(), &ctx.accounts.ix_sysvar)?;

    // Check that ix is what we expect to have been sent
    utils::verify_ed25519_ix(&ix, &signer_key, &msg, &sig)?;

    let badge = &mut ctx.accounts.badge;

    badge.owner = owner;

    badge.quiz = quiz;

    badge.tier = badge_info.tier;

    let badge_config_pool = &mut ctx.accounts.badge_config_pool;

    let badge_config = &mut ctx.accounts.badge_config;
    if badge_config.quiz == 0 {
        badge_config.quiz = quiz;
        badge_config_pool.config_count += 1;
    }
    badge_config.total += 1;
    badge_config_pool.total += 1;

    Ok(())
}
