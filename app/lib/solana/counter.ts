import type { Program } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";

export async function getNextIdOrZero(program: Program, journalIdPda: PublicKey): Promise<bigint> {
  try {
    const c: any = await (program as any).account.journalId.fetch(journalIdPda);
    return BigInt(c.nextId.toString());
  } catch {
    return BigInt(0);
  }
}
