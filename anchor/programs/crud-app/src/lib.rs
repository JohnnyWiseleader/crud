#![allow(clippy::result_large_err)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("4NcUz8q7fAChF5RiAvcWQ6cFaZduXLQYiaVX2Fq4i2EC");

#[program]
pub mod crud_app {
    use super::*;

    pub fn create_journal_entry(
        ctx: Context<CreateEntry>,
        title: String,
        message: String,
    ) -> Result<()> {
        let owner = ctx.accounts.owner.key();

        // init index owner if first time (optional but recommended)
        if ctx.accounts.index.owner == Pubkey::default() {
            ctx.accounts.index.owner = owner;
        }

        // init counter owner if first time
        if ctx.accounts.id_counter.owner == Pubkey::default() {
            ctx.accounts.id_counter.owner = owner;
            ctx.accounts.id_counter.next_id = 0;
        }

        // sanity: prevent weird mismatches
        require_keys_eq!(ctx.accounts.index.owner, owner, CrudError::InvalidOwner);
        require_keys_eq!(
            ctx.accounts.id_counter.owner,
            owner,
            CrudError::InvalidOwner
        );

        // enforce your existing 200 cap
        require!(ctx.accounts.index.entries.len() < 200, CrudError::IndexFull);

        let id = ctx.accounts.id_counter.next_id;

        // write entry
        let entry = &mut ctx.accounts.journal_entry;
        entry.owner = owner;
        entry.id = id;
        entry.title = title;
        entry.message = message;

        // store PDA in your existing index list
        ctx.accounts.index.entries.push(entry.key());

        // increment counter
        ctx.accounts.id_counter.next_id = id.checked_add(1).ok_or(error!(CrudError::IdOverflow))?;

        Ok(())
    }

    pub fn update_journal_entry(
        ctx: Context<UpdateEntry>,
        message: String,
    ) -> Result<()> {
        ctx.accounts.journal_entry.message = message;
        Ok(())
    }

    pub fn delete_journal_entry(ctx: Context<DeleteEntry>) -> Result<()> {
        let entry_key = ctx.accounts.journal_entry.key();
        let index = &mut ctx.accounts.index;

        // remove from index
        if let Some(pos) = index.entries.iter().position(|k| *k == entry_key) {
            index.entries.swap_remove(pos);
        }

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
        init_if_needed,
        payer = owner,
        space = 8 + JournalId::INIT_SPACE,
        seeds = [b"journal_id", owner.key().as_ref()],
        bump,
    )]
    pub id_counter: Account<'info, JournalId>,

    #[account(
        init,
        payer = owner,
        space = 8 + JournalEntryState::INIT_SPACE,
        seeds = [
            b"entry",
            owner.key().as_ref(),
            &id_counter.next_id.to_le_bytes(),
        ],
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
pub struct UpdateEntry<'info> {
    #[account(
        mut,
        has_one = owner
    )]
    pub journal_entry: Account<'info, JournalEntryState>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeleteEntry<'info> {
    #[account(mut, has_one = owner, close = owner)]
    pub journal_entry: Account<'info, JournalEntryState>,

    #[account(
        mut,
        seeds = [b"index", owner.key().as_ref()],
        bump,
        has_one = owner
    )]
    pub index: Account<'info, JournalIndex>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

// create a listing account to store all journal entry PDAs for a user
// Index account: stores up to 200 entry PDAs per owner
#[account]
#[derive(InitSpace)]
pub struct JournalIndex {
    pub owner: Pubkey,
    #[max_len(200)]
    pub entries: Vec<Pubkey>,
}

// separate account to track next journal entry Id for each user
// do not close this account when deleting entries, as it tracks the next available ID
#[account]
#[derive(InitSpace)]
pub struct JournalId {
    pub owner: Pubkey,
    pub next_id: u64,
}

#[account]
#[derive(InitSpace)]
pub struct JournalEntryState {
    pub owner: Pubkey,
    pub id: u64,
    #[max_len(100)]
    pub title: String,
    #[max_len(1000)]
    pub message: String,
}

#[error_code]
pub enum CrudError {
    #[msg("Owner mismatch")]
    InvalidOwner,
    #[msg("Journal index is full (max 200 entries)")]
    IndexFull,
    #[msg("ID overflow")]
    IdOverflow,
}
