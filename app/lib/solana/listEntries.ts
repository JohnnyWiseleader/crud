import type { Program } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";
import { deriveJournalIndexPda } from "./pda";

export async function listEntryPubkeys(program: Program, owner: PublicKey): Promise<PublicKey[]> {
  const [indexPda] = deriveJournalIndexPda(program.programId, owner);

  try {
    const index: any = await (program as any).account.journalIndex.fetch(indexPda);
    return index.entries as PublicKey[];
  } catch {
    return [];
  }
}

export async function fetchEntries(program: Program, entryKeys: PublicKey[]) {
  if (entryKeys.length === 0) return [];

  // Anchor has fetchMultiple for accounts
  const entries: any[] = await (program as any).account.journalEntryState.fetchMultiple(entryKeys);

  // Pair with pubkeys (fetchMultiple can return null for missing/closed)
  return entryKeys
    .map((k, i) => ({ pubkey: k, account: entries[i] }))
    .filter((x) => x.account != null);
}
