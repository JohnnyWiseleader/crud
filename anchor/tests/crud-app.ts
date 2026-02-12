import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

// little-endian u64 Buffer (8 bytes)
function u64le(n: number | bigint): Buffer {
  const bn = BigInt(n);
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(bn, 0);
  return b;
}

function deriveIndexPda(programId: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("index"), owner.toBuffer()],
    programId
  );
}

function deriveIdCounterPda(programId: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("journal_id"), owner.toBuffer()],
    programId
  );
}

function deriveEntryPda(programId: PublicKey, owner: PublicKey, id: number | bigint): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("entry"), owner.toBuffer(), u64le(id)],
    programId
  );
}

async function getNextIdOrZero(program: Program, idCounterPda: PublicKey): Promise<bigint> {
  try {
    const c: any = await (program as any).account.journalId.fetch(idCounterPda);
    return BigInt(c.nextId.toString()); // u64 -> BN -> string
  } catch {
    return 0n;
  }
}


describe("crud-app", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.CrudApp as Program;

  console.log("IDL accounts:", Object.keys(program.account));

  it("creates entry", async () => {
    const provider = anchor.getProvider() as anchor.AnchorProvider;
    const owner = provider.wallet.publicKey;

    const [indexPda] = deriveIndexPda(program.programId, owner);
    const [idCounterPda] = deriveIdCounterPda(program.programId, owner);

    const nextId = await getNextIdOrZero(program, idCounterPda);
    const [entryPda] = deriveEntryPda(program.programId, owner, nextId);

    const title = "My First Entry";
    const message = "Hello world";

    await program.methods
      .createJournalEntry(title, message)
      .accounts({
        journalEntry: entryPda,
        index: indexPda,
        idCounter: idCounterPda,
        owner,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const entry: any = await (program as any).account.journalEntryState.fetch(entryPda);
    assert.equal(entry.owner.toBase58(), owner.toBase58());
    assert.equal(entry.title, title);
    assert.equal(entry.message, message);
    assert.equal(BigInt(entry.id.toString()), nextId);

    const index: any = await (program as any).account.journalIndex.fetch(indexPda);
    assert.isTrue(index.entries.some((k: PublicKey) => k.equals(entryPda)));

    const counter: any = await (program as any).account.journalId.fetch(idCounterPda);
    assert.equal(BigInt(counter.nextId.toString()), nextId + 1n);
  });
});
