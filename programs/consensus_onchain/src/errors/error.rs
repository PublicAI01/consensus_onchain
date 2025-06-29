use anchor_lang::prelude::*;

/// Custom error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Not initialized.")]
    NotInitialized,
    #[msg("Already initialized.")]
    Initialized,
    #[msg("Message must be able to be converted into a string.")]
    MessageShouldString,
    #[msg("Message must be json format.")]
    MessageShouldJson,
    #[msg("Proof length error.")]
    ProofLengthError,
    #[msg("Proof data error.")]
    ProofDataError,
    #[msg("Signature verification failed.")]
    SigVerificationFailed,
    #[msg("Wrong account.")]
    AccountError,
    #[msg("Invalid quiz id.")]
    InvalidQuizIDError,
    #[msg("Invalid owner.")]
    InvalidOwnerError,
    #[msg("Invalid token account")]
    InvalidTokenAccount,

    #[msg("Invalid vault owner")]
    InvalidVaultOwner,

    #[msg("Only owner")]
    OnlyOwner,

    #[msg("Invalid nonce")]
    NonceError,
}
