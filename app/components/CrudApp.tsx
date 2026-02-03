"use client";

import { useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { createCrudProgram } from "../lib/crudClient";

function walletOwnerPk(wallet: any): PublicKey {
  if (!wallet?.publicKey) throw new Error("Wallet missing publicKey");
  return wallet.publicKey;
}

async function pdaForTitle(program: any, owner: PublicKey, titleStr: string) {
  // PDA seed length must be <= 32 bytes. Your title max_len is 50 characters
  // so you may eventually need to hash it or truncate.
  return await PublicKey.findProgramAddress(
    [Buffer.from(titleStr), owner.toBuffer()],
    program.programId
  );
}

export default function CrudApp() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const connected = wallet.connected && !!wallet.publicKey;
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Optional: create program once per wallet connection
  const program = useMemo(() => {
    if (!wallet.publicKey) return null;
    try {
      return createCrudProgram(wallet, connection);
    } catch (e) {
      console.error("program init failed", e);
      return null;
    }
  }, [wallet.publicKey?.toBase58(), connection]);

  async function handleCreate() {
    setTxStatus("sending-create");
    try {
      if (!wallet || !program) throw new Error("Wallet/program not ready");

      const owner = walletOwnerPk(wallet);
      const [pda] = await pdaForTitle(program, owner, title);

      console.log("[debug] programId", program.programId.toBase58());

      await program.methods
        .createJournalEntry(title, message)
        .accounts({
          journalEntry: pda,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setTxStatus("create-success");
    } catch (err: any) {
      console.error("create error (raw):", err);

      // Some errors are Proxied; this forces useful fields out
      const details =
        err && typeof err === "object"
          ? JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
          : String(err);

      console.error("create error details:", details);

      // web3.js / wallet-adapter often attaches logs
      if (err?.logs) {
        console.error("transaction logs:", err.logs);
      }

      // some errors include a signature
      if (err?.signature) {
        console.error("transaction signature:", err.signature);
      }

      setTxStatus("create-failed: " + (err?.message ?? String(err)));
    }
  }

  async function handleUpdate() {
    try {
      if (!wallet || !program) throw new Error("Wallet/program not ready");

      const owner = walletOwnerPk(wallet);
      const [pda] = await pdaForTitle(program, owner, title);

      const acct = await program.account.journalEntryState.fetchNullable(pda);
      if (!acct) {
        setTxStatus("No entry found for that title. Create it first.");
        return;
      }

      setTxStatus("sending-update");

      await program.methods
        .updateJournalEntry(title, message)
        .accounts({
          journalEntry: pda,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setTxStatus("update-success");
    } catch (err: any) {
      console.error("update error", err);
      setTxStatus("update-failed: " + (err?.message ?? String(err)));
    }
  }

  async function handleDelete() {
    try {
      if (!wallet || !program) throw new Error("Wallet/program not ready");

      const owner = walletOwnerPk(wallet);
      const [pda] = await pdaForTitle(program, owner, title);

      const acct = await program.account.journalEntryState.fetchNullable(pda);
      if (!acct) {
        setTxStatus("No entry found for that title. Create it first.");
        return;
      }

      setTxStatus("sending-delete");

      await program.methods
        .deleteJournalEntry(title)
        .accounts({
          journalEntry: pda,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setTitle("");
      setMessage("");
      setTxStatus("delete-success");
    } catch (err: any) {
      console.error("delete error", err);
      setTxStatus("delete-failed: " + (err?.message ?? String(err)));
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border-low bg-card p-4">
      <h3 className="text-lg font-semibold">Journal CRUD (example)</h3>

      <div className="grid gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (used as PDA seed)"
          className="rounded border px-3 py-2"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          className="rounded border px-3 py-2"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          disabled={!connected || !program}
          className="rounded bg-primary px-3 py-2 text-white disabled:opacity-50"
        >
          Create
        </button>
        <button
          onClick={handleUpdate}
          disabled={!connected || !program}
          className="rounded bg-yellow-600 px-3 py-2 text-white disabled:opacity-50"
        >
          Update
        </button>
        <button
          onClick={handleDelete}
          disabled={!connected || !program}
          className="rounded bg-red-600 px-3 py-2 text-white disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      <div className="text-sm text-muted">Status: {txStatus ?? "idle"}</div>
    </div>
  );
}
