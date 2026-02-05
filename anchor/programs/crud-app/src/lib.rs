#![allow(clippy::result_large_err)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("ADoEaEXd75hq2KxJWDKc4zpmujqYLqaGG3qThW3c6bS3");

#[program]
pub mod crud_app {
    use super::*;

    pub fn create_journal_entry(
        ctx: Context<CreateEntry>,
        title: String,
        message: String,
    ) -> Result<()> {
        // init entry
        let entry = &mut ctx.accounts.journal_entry;
        entry.owner = ctx.accounts.owner.key();
        entry.title = title;
        entry.message = message;

        // init/update index
        let index = &mut ctx.accounts.index;

        // init_if_needed creates the account, but fields start as default/zeroed
        if index.owner == Pubkey::default() {
            index.owner = ctx.accounts.owner.key();
        }

        require_keys_eq!(index.owner, ctx.accounts.owner.key(), CustomError::InvalidOwner);
        require!(index.entries.len() < 200, CustomError::IndexFull);

        let entry_key = ctx.accounts.journal_entry.key();
        if !index.entries.contains(&entry_key) {
            index.entries.push(entry_key);
        }

        Ok(())
    }

    pub fn update_journal_entry(
        ctx: Context<UpdateEntry>,
        _title: String,
        message: String,
    ) -> Result<()> {
        let journal_entry = &mut ctx.accounts.journal_entry;
        journal_entry.message = message;
        Ok(())
    }

    pub fn delete_journal_entry(
        ctx: Context<DeleteEntry>,
        _title: String,
    ) -> Result<()> {
        let entry_key = ctx.accounts.journal_entry.key();
        let index = &mut ctx.accounts.index;

        // remove from index
        index.entries.retain(|k| *k != entry_key);

        // close index when empty (return rent to owner)
        if index.entries.is_empty() {
            index.close(ctx.accounts.owner.to_account_info())?;
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct CreateEntry<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + JournalEntryState::INIT_SPACE,
        seeds = [title.as_bytes(), owner.key().as_ref()],
        bump,
    )]
    pub journal_entry: Account<'info, JournalEntryState>,

    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + JournalIndex::INIT_SPACE,
        seeds = [b"index", owner.key().as_ref()],
        bump,
    )]
    pub index: Account<'info, JournalIndex>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct UpdateEntry<'info> {
    #[account(
        mut,
        seeds = [title.as_bytes(), owner.key().as_ref()],
        bump,
        has_one = owner,
    )]
    pub journal_entry: Account<'info, JournalEntryState>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct DeleteEntry<'info> {
    #[account(
        mut,
        close = owner,
        seeds = [title.as_bytes(), owner.key().as_ref()],
        bump,
        has_one = owner,
    )]
    pub journal_entry: Account<'info, JournalEntryState>,

    #[account(
        mut,
        seeds = [b"index", owner.key().as_ref()],
        bump,
    )]
    pub index: Account<'info, JournalIndex>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// create a listing account to store all journal entry PDAs for a user
// discriminator: 8
// owner: 32
// vec length prefix: 4
// 200 pubkeys: 200 * 32 = 6400
// Total: 8 + 32 + 4 + 6400 = 6444
// Index account: stores up to 200 entry PDAs per owner
#[account]
#[derive(InitSpace)]
pub struct JournalIndex {
    pub owner: Pubkey,
    #[max_len(200)]
    pub entries: Vec<Pubkey>,
}

#[account]
#[derive(InitSpace)]
pub struct JournalEntryState {
    pub owner: Pubkey,
    #[max_len(50)]
    pub title: String,
    #[max_len(1000)]
    pub message: String,
}

#[error_code]
pub enum CustomError {
    #[msg("Index owner mismatch")]
    InvalidOwner,
    #[msg("Journal index is full (max 200)")]
    IndexFull,
}
