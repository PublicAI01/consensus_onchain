use crate::errors::error::ErrorCode;
use crate::states::claim::*;
use crate::states::consensus::Config;
use crate::utils;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use serde::{Deserialize, Serialize};
use solana_program::instruction::Instruction;
use solana_program::sysvar::instructions::{
    load_current_index_checked, load_instruction_at_checked, ID as IX_ID,
};

#[derive(Accounts)]
pub struct IniClaim<'info> {
    #[account(
        init_if_needed,
        seeds = [b"state".as_ref()],
        bump,
        payer = payer,
        space = 8 + StateAccount::LEN
    )]
    pub state: Box<Account<'info, StateAccount>>,

    pub mint: Account<'info, Mint>,

    #[account(
        constraint = token_vault.mint == mint.key() @ ErrorCode::InvalidTokenAccount,
        constraint = token_vault.owner == state.key() @ ErrorCode::InvalidVaultOwner,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"config".as_ref()],
        bump,
    )]
    pub config: Box<Account<'info, Config>>,
    #[account(
        mut,
        constraint = config.owner == payer.key() @ ErrorCode::OnlyOwner,
    )]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn ini_claim(ctx: Context<IniClaim>) -> Result<()> {
    let state = &mut ctx.accounts.state;
    state.token_mint = ctx.accounts.mint.key();
    state.token_vault = ctx.accounts.token_vault.key();
    state.bump = ctx.bumps.state;
    Ok(())
}

#[derive(Serialize, Deserialize)]
struct ClaimInput {
    pub task: u16,
    pub nonce: u16,
    pub reward: u64,
    pub receiver: Pubkey,
}
#[derive(Accounts)]
#[instruction(task:u16)]
pub struct Claim<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
    mut,
    seeds = [b"config".as_ref()],
    bump,
    )]
    pub config: Box<Account<'info, Config>>,
    #[account(
        mut,
        seeds = [b"state".as_ref()],
        bump,
    )]
    pub state: Box<Account<'info, StateAccount>>,

    #[account(
        init_if_needed,
        seeds = [b"reward".as_ref(), format!("{}", task).as_ref(), payer.key().as_ref()],
        bump,
        payer = payer,
        space = 8 + ClaimReward::INIT_SPACE
    )]
    pub reward: Box<Account<'info, ClaimReward>>,
    #[account(
        mut,
        constraint = token_vault.mint == state.token_mint @ ErrorCode::InvalidTokenAccount,
        constraint = token_vault.owner == state.key() @ ErrorCode::InvalidVaultOwner,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer,
        associated_token::token_program = token_program,
        constraint = receiver.owner == payer.key() @ ErrorCode::InvalidTokenAccount,
        constraint = receiver.mint == state.token_mint @ ErrorCode::InvalidTokenAccount,
    )]
    pub receiver: Box<Account<'info, TokenAccount>>,
    pub mint: Box<Account<'info, Mint>>,
    /// CHECK: The address check is needed because otherwise
    /// the supplied Sysvar could be anything else.
    /// The Instruction Sysvar has not been implemented
    /// in the Anchor framework yet, so this is the safe approach.
    #[account(address = IX_ID)]
    pub ix_sysvar: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn claim(ctx: Context<Claim>, task: u16, msg: Vec<u8>, sig: [u8; 64]) -> Result<()> {
    let msg_str = String::from_utf8(msg.clone()).map_err(|_| ErrorCode::MessageShouldString)?;

    let claim_info: ClaimInput =
        serde_json::from_str(&msg_str).map_err(|_| ErrorCode::MessageShouldJson)?;

    msg!(
        "task: {}, nonce: {}, reward: {}, receiver: {}",
        claim_info.task,
        claim_info.nonce,
        claim_info.reward,
        claim_info.receiver.to_string()
    );

    let owner = *ctx.accounts.payer.key;
    require!(owner == claim_info.receiver, ErrorCode::InvalidOwnerError);

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

    let reward_info = &mut ctx.accounts.reward;

    reward_info.owner = claim_info.receiver;

    reward_info.reward = claim_info.reward;

    require!(reward_info.times == claim_info.nonce, ErrorCode::NonceError);
    reward_info.times += 1;

    let state = &mut ctx.accounts.state;
    state.claimed += claim_info.reward;
    // transfer token

    let seeds = &[b"state".as_ref(), &[state.bump]];
    let signer = &[&seeds[..]];
    // Transfer tokens
    let cpi_accounts = Transfer {
        from: ctx.accounts.token_vault.to_account_info(),
        to: ctx.accounts.receiver.to_account_info(),
        authority: ctx.accounts.state.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

    token::transfer(cpi_ctx, claim_info.reward)?;

    Ok(())
}

#[derive(Accounts)]
pub struct IniClaimPublic<'info> {
    #[account(
        init_if_needed,
        seeds = [b"state".as_ref()],
        bump,
        payer = payer,
        space = 8 + StateAccount::LEN
    )]
    pub state: Box<Account<'info, StateAccount>>,

    pub mint: Account<'info, Mint>,

    #[account(
        constraint = token_vault.mint == mint.key() @ ErrorCode::InvalidTokenAccount,
        constraint = token_vault.owner == state.key() @ ErrorCode::InvalidVaultOwner,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"config".as_ref()],
        bump,
    )]
    pub config: Box<Account<'info, Config>>,
    #[account(
        mut,
        constraint = config.owner == payer.key() @ ErrorCode::OnlyOwner,
    )]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn ini_claim_public(ctx: Context<IniClaimPublic>) -> Result<()> {
    let state = &mut ctx.accounts.state;
    state.public_token_mint = ctx.accounts.mint.key();
    state.public_token_vault = ctx.accounts.token_vault.key();
    state.bump = ctx.bumps.state;
    Ok(())
}

#[derive(Accounts)]
#[instruction(task:u16)]
pub struct ClaimPublic<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
    mut,
    seeds = [b"config".as_ref()],
    bump,
    )]
    pub config: Box<Account<'info, Config>>,
    #[account(
        mut,
        seeds = [b"state".as_ref()],
        bump,
    )]
    pub state: Box<Account<'info, StateAccount>>,

    #[account(
        init_if_needed,
        seeds = [b"reward".as_ref(), format!("{}", task).as_ref(), payer.key().as_ref()],
        bump,
        payer = payer,
        space = 8 + ClaimReward::INIT_SPACE
    )]
    pub reward: Box<Account<'info, ClaimReward>>,
    #[account(
        mut,
        constraint = token_vault.mint == state.public_token_mint @ ErrorCode::InvalidTokenAccount,
        constraint = token_vault.owner == state.key() @ ErrorCode::InvalidVaultOwner,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer,
        associated_token::token_program = token_program,
        constraint = receiver.owner == payer.key() @ ErrorCode::InvalidTokenAccount,
        constraint = receiver.mint == state.public_token_mint @ ErrorCode::InvalidTokenAccount,
    )]
    pub receiver: Box<Account<'info, TokenAccount>>,
    pub mint: Box<Account<'info, Mint>>,
    /// CHECK: The address check is needed because otherwise
    /// the supplied Sysvar could be anything else.
    /// The Instruction Sysvar has not been implemented
    /// in the Anchor framework yet, so this is the safe approach.
    #[account(address = IX_ID)]
    pub ix_sysvar: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn claim_public(
    ctx: Context<ClaimPublic>,
    task: u16,
    msg: Vec<u8>,
    sig: [u8; 64],
) -> Result<()> {
    let msg_str = String::from_utf8(msg.clone()).map_err(|_| ErrorCode::MessageShouldString)?;

    let claim_info: ClaimInput =
        serde_json::from_str(&msg_str).map_err(|_| ErrorCode::MessageShouldJson)?;

    msg!(
        "task: {}, nonce: {}, reward: {}, receiver: {}",
        claim_info.task,
        claim_info.nonce,
        claim_info.reward,
        claim_info.receiver.to_string()
    );

    let owner = *ctx.accounts.payer.key;
    require!(owner == claim_info.receiver, ErrorCode::InvalidOwnerError);

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

    let reward_info = &mut ctx.accounts.reward;

    reward_info.owner = claim_info.receiver;

    reward_info.reward = claim_info.reward;

    require!(reward_info.times == claim_info.nonce, ErrorCode::NonceError);
    reward_info.times += 1;

    let state = &mut ctx.accounts.state;
    state.claimed += claim_info.reward;
    // transfer token

    let seeds = &[b"state".as_ref(), &[state.bump]];
    let signer = &[&seeds[..]];
    // Transfer tokens
    let cpi_accounts = Transfer {
        from: ctx.accounts.token_vault.to_account_info(),
        to: ctx.accounts.receiver.to_account_info(),
        authority: ctx.accounts.state.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

    token::transfer(cpi_ctx, claim_info.reward)?;

    Ok(())
}
