import type { Program } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";

export async function updateEntry({
  program,
  owner,
  entryPda,
  message,
}: {
  program: Program;
  owner: PublicKey;
  entryPda: PublicKey;
  message: string;
}): Promise<string> {
  const sig = await program.methods
    .updateJournalEntry(message)
    .accounts({
      journalEntry: entryPda,
      owner,
    })
    .rpc();

  return sig;
}
