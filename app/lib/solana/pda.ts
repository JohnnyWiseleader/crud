import { PublicKey } from "@solana/web3.js";

export function u64le(n: number | bigint): Buffer {
  const bn = BigInt(n);
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(bn, 0);
  return b;
}

export function deriveJournalIndexPda(programId: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("index"), owner.toBuffer()],
    programId
  );
}

export function deriveJournalIdPda(programId: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("journal_id"), owner.toBuffer()],
    programId
  );
}

export function deriveEntryPda(programId: PublicKey, owner: PublicKey, id: number | bigint): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("entry"), owner.toBuffer(), u64le(id)],
    programId
  );
}
