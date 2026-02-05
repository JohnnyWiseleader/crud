import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

// If you generated types, import them; otherwise Program<any> is fine.
// import { CrudApp } from "../target/types/crud_app";

describe("crud-app (index PDA)", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  const program = anchor.workspace.CrudApp as Program<any>;
  const owner = provider.wallet.publicKey;

  function entryPda(title: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(title), owner.toBuffer()],
      program.programId
    );
  }

  function indexPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("index"), owner.toBuffer()],
      program.programId
    );
  }

  it("create initializes index and adds first entry", async () => {
    const title = "t1";
    const message = "m1";

    const [entry] = entryPda(title);
    const [index] = indexPda();

    await program.methods
      .createJournalEntry(title, message)
      .accounts({
        journalEntry: entry,
        index,
        owner,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const idx = await program.account.journalIndex.fetch(index);
    assert.equal(idx.owner.toBase58(), owner.toBase58());
    assert.equal(idx.entries.length, 1);
    assert.equal(idx.entries[0].toBase58(), entry.toBase58());

    const e = await program.account.journalEntryState.fetch(entry);
    assert.equal(e.owner.toBase58(), owner.toBase58());
    assert.equal(e.title, title);
    assert.equal(e.message, message);
  });

  it("second create reuses index and appends", async () => {
    const title = "t2";
    const message = "m2";

    const [entry] = entryPda(title);
    const [index] = indexPda();

    await program.methods
      .createJournalEntry(title, message)
      .accounts({
        journalEntry: entry,
        index,
        owner,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const idx = await program.account.journalIndex.fetch(index);
    assert.equal(idx.entries.length, 2);
    const set = new Set(idx.entries.map((k: PublicKey) => k.toBase58()));
    assert.isTrue(set.has(entry.toBase58()));
  });

  it("delete removes from index and closes entry", async () => {
    const title = "t1";
    const [entry] = entryPda(title);
    const [index] = indexPda();

    await program.methods
      .deleteJournalEntry(title)
      .accounts({
        journalEntry: entry,
        index,
        owner,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Entry should be closed: fetch should fail
    try {
      await program.account.journalEntryState.fetch(entry);
      assert.fail("Expected entry fetch to fail (closed)");
    } catch (_) {
      // ok
    }

    const idx = await program.account.journalIndex.fetch(index);
    assert.equal(idx.entries.length, 1);
    const set = new Set(idx.entries.map((k: PublicKey) => k.toBase58()));
    assert.isFalse(set.has(entry.toBase58()));
  });

  it("delete last entry closes index", async () => {
    const title = "t2";
    const [entry] = entryPda(title);
    const [index] = indexPda();

    await program.methods
      .deleteJournalEntry(title)
      .accounts({
        journalEntry: entry,
        index,
        owner,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Entry closed
    try {
      await program.account.journalEntryState.fetch(entry);
      assert.fail("Expected entry fetch to fail (closed)");
    } catch (_) {
      // ok
    }

    // Index should be closed when empty
    try {
      await program.account.journalIndex.fetch(index);
      assert.fail("Expected index fetch to fail (closed)");
    } catch (_) {
      // ok
    }
  });
});
