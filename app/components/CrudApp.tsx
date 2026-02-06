"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { createCrudProgram } from "../lib/crudClient";

function isUserRejected(err: any) {
  const msg = (err?.message ?? String(err)).toLowerCase();
  return (
    err?.name?.toLowerCase().includes("walletsigntransactionerror") ||
    msg.includes("user rejected") ||
    msg.includes("rejected the request") ||
    msg.includes("denied") ||
    err?.code === 4001
  );
}

function indexPda(programId: PublicKey, owner: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("index"), owner.toBuffer()],
    programId
  );
  return pda;
}

function entryPda(programId: PublicKey, owner: PublicKey, title: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(title), owner.toBuffer()],
    programId
  );
  return pda;
}

type EntryRow = {
  pda: PublicKey;
  title: string;
  message: string;
  owner: PublicKey;
};

async function loadEntries(program: any, owner: PublicKey): Promise<EntryRow[]> {
  const indexAddr = indexPda(program.programId, owner);

  // index may not exist yet
  const idx = await program.account.journalIndex.fetchNullable(indexAddr);
  if (!idx) return [];

  const pubkeys: PublicKey[] = idx.entries;
  if (!pubkeys.length) return [];

  const accounts = await program.account.journalEntryState.fetchMultiple(pubkeys);

  // fetchMultiple returns (Account | null) aligned to input order
  const rows: EntryRow[] = [];
  for (let i = 0; i < pubkeys.length; i++) {
    const a = accounts[i];
    if (!a) continue;
    rows.push({
      pda: pubkeys[i],
      title: a.title,
      message: a.message,
      owner: a.owner,
    });
  }
  rows.sort((x, y) => x.title.localeCompare(y.title));
  return rows;
}

export default function CrudApp() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const connected = wallet.connected && !!wallet.publicKey;
  const owner = wallet.publicKey ?? null;

  const program = useMemo(() => {
    if (!connected || !wallet.publicKey) return null;
    try {
      return createCrudProgram(wallet, connection);
    } catch (e) {
      console.error("program init failed", e);
      return null;
    }
  }, [connected, wallet, connection]);

  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [selectedPdaStr, setSelectedPdaStr] = useState<string>("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [txStatus, setTxStatus] = useState<string>("idle");

  // Load list when wallet/program ready
  useEffect(() => {
    (async () => {
      if (!program || !owner) {
        setEntries([]);
        setSelectedPdaStr("");
        return;
      }
      try {
        const rows = await loadEntries(program, owner);
        setEntries(rows);
      } catch (e) {
        console.error("loadEntries failed", e);
        setEntries([]);
      }
    })();
  }, [program, owner?.toBase58()]);

  // When selection changes, populate form
  useEffect(() => {
    if (!selectedPdaStr) return;
    const row = entries.find((e) => e.pda.toBase58() === selectedPdaStr);
    if (!row) return;
    setTitle(row.title);
    setMessage(row.message);
  }, [selectedPdaStr, entries]);

  async function refresh() {
    if (!program || !owner) return;
    const rows = await loadEntries(program, owner);
    setEntries(rows);

    // if current selection was deleted, clear it
    if (selectedPdaStr && !rows.some((r) => r.pda.toBase58() === selectedPdaStr)) {
      setSelectedPdaStr("");
      setTitle("");
      setMessage("");
    }
  }

  async function handleCreate() {
    setTxStatus("sending-create");
    try {
      if (!program || !owner) throw new Error("Wallet/program not ready");
      if (!title.trim()) throw new Error("Title required");

      // derive PDA exactly like on-chain seeds
      const pda = entryPda(program.programId, owner, title);

      await program.methods
        .createJournalEntry(title, message)
        .accounts({
          journalEntry: pda,
          index: indexPda(program.programId, owner),
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setTxStatus("create-success");
      await refresh();
      setSelectedPdaStr(pda.toBase58());

    } catch (err: any) {
      if (isUserRejected(err)) {
        setTxStatus("cancelled");  // <-- graceful
        return;
      }
      console.error(err);
      setTxStatus("create-failed: " + (err?.message ?? String(err)));
    }
  }

  async function handleUpdate() {
    setTxStatus("sending-update");
    try {
      if (!program || !owner) throw new Error("Wallet/program not ready");
      if (!title.trim()) throw new Error("Title required");

      const pda = entryPda(program.programId, owner, title);

      await program.methods
        .updateJournalEntry(title, message)
        .accounts({
          journalEntry: pda,
          owner,
        })
        .rpc();

      setTxStatus("update-success");
      await refresh();
      setSelectedPdaStr(pda.toBase58());
    } catch (err: any) {
      if (isUserRejected(err)) {
        setTxStatus("cancelled");  // <-- graceful
        return;
      }
      console.error(err);
      setTxStatus("update-failed: " + (err?.message ?? String(err)));
    }
  }

  async function handleDelete() {
    setTxStatus("sending-delete");
    try {
      if (!program || !owner) throw new Error("Wallet/program not ready");
      if (!title.trim()) throw new Error("Title required");

      const pda = entryPda(program.programId, owner, title);

      await program.methods
        .deleteJournalEntry(title)
        .accounts({
          journalEntry: pda,
          index: indexPda(program.programId, owner),
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setTxStatus("delete-success");
      await refresh();
    } catch (err: any) {
      if (isUserRejected(err)) {
        setTxStatus("cancelled");  // <-- graceful
        return;
      }
      console.error(err);
      setTxStatus("delete-failed: " + (err?.message ?? String(err)));
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border-low bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Journal CRUD</h3>
        <div className="text-sm text-muted">Status: {txStatus}</div>
      </div>

      {!connected && (
        <div className="text-sm text-muted">
          Connect a wallet to load and edit entries.
        </div>
      )}

      {connected && (
        <>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Your entries</label>
            <select
              value={selectedPdaStr}
              onChange={(e) => setSelectedPdaStr(e.target.value)}
              className="rounded border px-3 py-2"
            >
              <option value="">— Select an entry —</option>
              {entries.map((e) => (
                <option key={e.pda.toBase58()} value={e.pda.toBase58()}>
                  {e.title}
                </option>
              ))}
            </select>

            <div className="text-xs text-muted">
              {entries.length ? `${entries.length} entries` : "No entries yet."}
            </div>
          </div>

          <div className="grid gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (seed)"
              className="rounded border px-3 py-2"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message"
              className="rounded border px-3 py-2"
              rows={6}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!program}
              className="rounded bg-primary px-3 py-2 text-white disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={handleUpdate}
              disabled={!program || !selectedPdaStr}
              className="rounded bg-yellow-600 px-3 py-2 text-white disabled:opacity-50"
            >
              Update
            </button>
            <button
              onClick={handleDelete}
              disabled={!program || !selectedPdaStr}
              className="rounded bg-red-600 px-3 py-2 text-white disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={refresh}
              disabled={!program}
              className="rounded border px-3 py-2 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </>
      )}
    </div>
  );
}
