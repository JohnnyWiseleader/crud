"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { createCrudProgram } from "../lib/crudClient";
import { createEntry, deleteEntryByKey, fetchEntries, listEntryKeys, updateEntryByKey } from "../lib/journalClient";
import type { Program, Idl } from "@coral-xyz/anchor";
import idl from "../idl/crud_app.json";

type CrudAppIdl = typeof idl & Idl;

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

type EntryRow = {
  pda: PublicKey;
  id: bigint;
  title: string;
  message: string;
  owner: PublicKey;
};

export async function loadEntries(
  program: Program<CrudAppIdl>,
  owner: PublicKey
): Promise<EntryRow[]> {
  const pubkeys = await listEntryKeys(program, owner);
  if (pubkeys.length === 0) return [];

  const pairs = await fetchEntries(program, pubkeys); // [{ pubkey, account }]
  const rows: EntryRow[] = pairs.map(({ pubkey, account }: any) => ({
    pda: pubkey,
    id: BigInt(account.id.toString()), // <-- important
    title: account.title,
    message: account.message,
    owner: account.owner,
  }));

  // Sort by ID asc (oldest first) flip the comparison for desc
  rows.sort((a, b) => (a.id < b.id ? -1 : 1));
  return rows;
}

export default function CrudApp() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const connected = wallet.connected && !!wallet.publicKey;
  const owner = wallet.publicKey ?? null;

  // -----------------------------
  // Wallet connect watchdog
  // -----------------------------
  const [connectTimeout, setConnectTimeout] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // clear previous timer
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (wallet.connecting) {
      setConnectTimeout(false);

      timerRef.current = window.setTimeout(async () => {
        console.warn("[wallet] connect timed out; forcing disconnect/reset");
        setConnectTimeout(true);

        try {
          await wallet.disconnect();
        } catch { }

        // Optional: clear remembered wallet so autoConnect doesn't instantly re-hang
        try {
          localStorage.removeItem("walletName");     // older wallet-adapter key
          localStorage.removeItem("walletAdapter");  // some setups
        } catch { }
      }, 45_000);
    }

    // Clear banner once connected or idle
    if (wallet.connected || (!wallet.connecting && !wallet.disconnecting)) {
      setConnectTimeout(false);
    }

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [wallet.connecting, wallet.connected, wallet.disconnecting, wallet]);

  async function retryConnect() {
    setConnectTimeout(false);
    try {
      await wallet.connect();
    } catch (e) {
      // user may reject again; treat as normal
      console.warn("[wallet] retry connect failed", e);
    }
  }

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
  const [selectedEntry, setSelectedEntry] = useState<EntryRow | null>(null);
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
      if (!title) throw new Error("Title required");

      const { sig, entryPda } = await createEntry(program, owner, title, message);

      console.log("create txSig: ", sig);

      setTxStatus("create-success");
      await refresh();

      setSelectedPdaStr(entryPda.toBase58());
    } catch (err: any) {
      if (isUserRejected(err)) {
        setTxStatus("cancelled");
        return;
      }

      console.error(err);
      if (typeof err?.getLogs === "function") {
        console.log("on-chain logs:", await err.getLogs());
      }
      setTxStatus("create-failed: " + (err?.message ?? String(err)));
    }
  }

  async function handleUpdate() {
    setTxStatus("sending-update");
    try {
      if (!program || !owner) throw new Error("Wallet/program not ready");
      if (!selectedEntry) throw new Error("No entry selected");

      const pdaStr = selectedEntry.pda.toBase58();

      await updateEntryByKey(program, owner, selectedEntry.pda, message);

      setTxStatus("update-success");
      await refresh();

      setSelectedPdaStr(pdaStr);
    } catch (err: any) {
      if (isUserRejected(err)) {
        setTxStatus("cancelled");
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
    if (!selectedEntry) throw new Error("No entry selected");

    await deleteEntryByKey(program, owner, selectedEntry.pda);

    setTxStatus("delete-success");
    await refresh();

    // clear selection since the entry is now closed
    setSelectedEntry(null);
    setSelectedPdaStr("");
  } catch (err: any) {
    if (isUserRejected(err)) {
      setTxStatus("cancelled");
      return;
    }
    console.error(err);
    setTxStatus("delete-failed: " + (err?.message ?? String(err)));
  }
}

  return (
    <div className="space-y-4 rounded-lg border border-border-low bg-card p-4">
      {connectTimeout && (
        <div className="rounded border p-3 text-sm">
          Wallet connection timed out.
          <div className="mt-2 flex gap-2">
            <button className="rounded border px-3 py-1" onClick={retryConnect}>
              Retry
            </button>
            <button
              className="rounded border px-3 py-1"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </button>
          </div>
        </div>
      )}

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
