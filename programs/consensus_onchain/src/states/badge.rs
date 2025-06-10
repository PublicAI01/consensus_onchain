use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct BadgeConfigPool {
    /// Total numbers of badge.
    pub total: u64,
    /// Numbers of config.(aka quiz count)
    pub config_count:u64,
}

#[account]
#[derive(InitSpace)]
pub struct BadgeConfig {
    /// Quiz id.
    pub quiz:u64,
    /// Numbers of badge.
    pub total: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Badge {
    /// Owner of badge.
    pub owner:Pubkey,
    /// Quiz id.
    pub quiz:u64,
    /// Tier of badge.
    pub tier: u64,
}