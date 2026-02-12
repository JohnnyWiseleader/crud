import { PublicKey, SystemProgram } from "@solana/web3.js";
import type { Program } from "@coral-xyz/anchor";

// u64 LE for PDA seed
export function u64le(n: number | bigint): Buffer {
  const bn = BigInt(n);
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(bn, 0);
  return b;
}

export function deriveIndexPda(programId: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("index"), owner.toBuffer()], programId);
}

export function deriveJournalIdPda(programId: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("journal_id"), owner.toBuffer()], programId);
}

export function deriveEntryPda(programId: PublicKey, owner: PublicKey, id: number | bigint): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("entry"), owner.toBuffer(), u64le(id)], programId);
}

export async function getNextIdOrZero(program: Program, journalIdPda: PublicKey): Promise<bigint> {
  try {
    const c: any = await (program as any).account.journalId.fetch(journalIdPda);
    return BigInt(c.nextId.toString());
  } catch {
    return BigInt(0);
  }
}

export async function createEntry(program: Program, owner: PublicKey, title: string, message: string) {
  const [indexPda] = deriveIndexPda(program.programId, owner);
  const [journalIdPda] = deriveJournalIdPda(program.programId, owner);

  const nextId = await getNextIdOrZero(program, journalIdPda);
  const [entryPda] = deriveEntryPda(program.programId, owner, nextId);

  const sig = await program.methods
    .createJournalEntry(title, message)
    .accounts({
      journalEntry: entryPda,
      index: indexPda,
      idCounter: journalIdPda, // must match Rust field name id_counter
      owner,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { sig, entryPda, id: nextId };
}

export async function listEntryKeys(program: Program, owner: PublicKey): Promise<PublicKey[]> {
  const [indexPda] = deriveIndexPda(program.programId, owner);

  const idx = await (program as any).account.journalIndex.fetchNullable(indexPda);
  if (!idx) return [];

  return (idx.entries ?? []) as PublicKey[];
}

export async function fetchEntries(program: Program, keys: PublicKey[]) {
  if (keys.length === 0) return [];
  const accounts: any[] = await (program as any).account.journalEntryState.fetchMultiple(keys);
  return keys
    .map((k, i) => ({ pubkey: k, account: accounts[i] }))
    .filter((x) => x.account != null);
}

export async function updateEntryByKey(program: Program, owner: PublicKey, entryPda: PublicKey, message: string) {
  return await program.methods
    .updateJournalEntry(message)
    .accounts({ journalEntry: entryPda, owner })
    .rpc();
}

export async function deleteEntryByKey(program: Program, owner: PublicKey, entryPda: PublicKey) {
  const [indexPda] = deriveIndexPda(program.programId, owner);
  return await program.methods
    .deleteJournalEntry()
    .accounts({ journalEntry: entryPda, index: indexPda, owner })
    .rpc();
}
