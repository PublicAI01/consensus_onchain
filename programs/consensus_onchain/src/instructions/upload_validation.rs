use crate::errors::error::ErrorCode;
use crate::states::consensus::*;
use crate::utils;
use anchor_lang::prelude::*;
use serde::{Deserialize, Serialize};
use solana_program::instruction::Instruction;
use solana_program::system_instruction;
use solana_program::sysvar::instructions::{
    load_current_index_checked, load_instruction_at_checked, ID as IX_ID,
};

#[derive(Serialize, Deserialize)]
struct Validation {
    timestamp: u64,
    consensus_proof: String,
}
#[derive(Accounts)]
#[instruction(timestamp:u64)]
pub struct UploadValidation<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
    mut,
    seeds = [b"config".as_ref()],
    bump,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(
    init,
    seeds = [format!("{}", timestamp).as_ref(), user.key().as_ref()],
    bump,
    payer = user,
    space = 8 + ConsensusState::INIT_SPACE
    )]
    pub consensus: Box<Account<'info, ConsensusState>>,
    /// CHECK: The address check is needed because otherwise
    /// the supplied Sysvar could be anything else.
    /// The Instruction Sysvar has not been implemented
    /// in the Anchor framework yet, so this is the safe approach.
    #[account(address = IX_ID)]
    pub ix_sysvar: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
pub fn upload_validation(
    ctx: Context<UploadValidation>,
    timestamp: u64,
    msg: Vec<u8>,
    sig: [u8; 64],
) -> Result<()> {
    let msg_str = String::from_utf8(msg.clone()).map_err(|_| ErrorCode::MessageShouldString)?;

    let validation: Validation =
        serde_json::from_str(&msg_str).map_err(|_| ErrorCode::MessageShouldJson)?;

    let config_state = &ctx.accounts.config;

    if !config_state.initialized {
        return Err(ErrorCode::NotInitialized.into());
    }

    let signer_key = config_state.signer.to_bytes();

    let user_signer = if config_state.signer == *ctx.accounts.user.key {
        true
    } else {
        false
    };

    // Get what should be the Ed25519Program instruction
    let index = load_current_index_checked(&ctx.accounts.ix_sysvar)?;
    let ix: Instruction = load_instruction_at_checked((index - 1).into(), &ctx.accounts.ix_sysvar)?;

    // Check that ix is what we expect to have been sent
    utils::verify_ed25519_ix(&ix, &signer_key, &msg, &sig)?;

    let consensus_state = &mut ctx.accounts.consensus;

    consensus_state.timestamp = validation.timestamp;

    consensus_state.global = user_signer;

    let mut proof = &validation.consensus_proof[..];

    if validation.consensus_proof.to_lowercase().starts_with("0x") {
        proof = &validation.consensus_proof[2..];
    }
    let hex_data = hex::decode(proof).unwrap();

    if hex_data.len() != 32 {
        return Err(ErrorCode::ProofLengthError.into());
    }
    let array_bytes: [u8; 32] = hex_data
        .as_slice()
        .try_into()
        .map_err(|_| ErrorCode::ProofDataError)?;

    consensus_state.consensus_proof = array_bytes;

    let upload_fee = config_state.fee;
    // Charge an upload fee, if one exists
    if upload_fee > 0 {
        let transfer_instruction = system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.config.key(),
            upload_fee,
        );
        solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.config.to_account_info(),
            ],
        )?;
    }
    Ok(())
}
