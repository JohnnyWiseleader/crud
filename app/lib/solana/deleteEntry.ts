import type { Program } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";
import { deriveJournalIndexPda } from "./pda";

export async function deleteEntry({
  program,
  owner,
  entryPda,
}: {
  program: Program;
  owner: PublicKey;
  entryPda: PublicKey;
}) {
  const [indexPda] = deriveJournalIndexPda(program.programId, owner);

  const sig = await program.methods
    .deleteJournalEntry() 
    .accounts({
      journalEntry: entryPda,
      index: indexPda,
      owner,
    })
    .rpc();

  return sig;
}
