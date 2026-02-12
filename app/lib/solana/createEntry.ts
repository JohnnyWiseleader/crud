import { SystemProgram, PublicKey } from "@solana/web3.js";
import type { Program } from "@coral-xyz/anchor";
import { deriveJournalIdPda, deriveJournalIndexPda, deriveEntryPda } from "./pda";
import { getNextIdOrZero } from "./counter";

export async function createJournalEntryIx({
  program,
  owner,
  title,
  message,
}: {
  program: Program;
  owner: PublicKey;
  title: string;
  message: string;
}) {
  const [indexPda] = deriveJournalIndexPda(program.programId, owner);
  const [journalIdPda] = deriveJournalIdPda(program.programId, owner);

  const nextId = await getNextIdOrZero(program, journalIdPda);
  const [entryPda] = deriveEntryPda(program.programId, owner, nextId);

  const sig = await program.methods
    .createJournalEntry(title, message)
    .accounts({
      journalEntry: entryPda,
      index: indexPda,
      idCounter: journalIdPda, 
      owner,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { sig, entryPda, id: nextId };
}
