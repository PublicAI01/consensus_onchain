use anchor_lang::prelude::*;

declare_id!("2pc2q2DVkXNycXq4DAJqGRtosMmffq5KKHB7iXUoB3wH");

#[program]
pub mod consensus_onchain {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
