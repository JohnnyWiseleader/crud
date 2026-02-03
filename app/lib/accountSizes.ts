// app/lib/accountSizes.ts
// Keep these in sync with Rust #[max_len] constraints.

export const JOURNAL_ENTRY_STATE_SIZE =
  8 +   // discriminator
  32 +  // owner: Pubkey
  (4 + 50) +    // title String: 4-byte prefix + 50 max
  (4 + 1000);   // message String: 4-byte prefix + 1000 max

export const ACCOUNT_SIZES: Record<string, number> = {
  JournalEntryState: JOURNAL_ENTRY_STATE_SIZE,
};
