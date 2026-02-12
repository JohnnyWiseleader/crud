"use client";

import CrudApp from "./components/CrudApp";
import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ClientOnly } from "./components/ClientOnly";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Home() {
  const wallet = useWallet();
  const address = wallet.publicKey?.toBase58();

  const [connectTimeout, setConnectTimeout] = useState(false);
  const [connectAttempt, setConnectAttempt] = useState(0);
  const timerRef = useRef<number | null>(null);

  function onWalletButtonClick() {
    if (!wallet.connected) {
      setConnectTimeout(false);
      setConnectAttempt((x) => x + 1);
    }
  }


  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (connectAttempt > 0 && !wallet.connected) {
      timerRef.current = window.setTimeout(async () => {
        console.warn("[wallet] connect timed out; forcing disconnect/reset");
        setConnectTimeout(true);

        try {
          await wallet.disconnect();
        } catch { }

        // Optional: prevent autoConnect from instantly re-hanging
        try {
          localStorage.removeItem("walletName");
          localStorage.removeItem("walletAdapter");
        } catch { }
      }, 45_000);
    }

    if (wallet.connected) {
      setConnectTimeout(false);
    }

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [connectAttempt, wallet.connected, wallet]);

  async function retryConnect() {
    setConnectTimeout(false);
    try {
      await wallet.connect();
    } catch (e) {
      console.warn("[wallet] retry connect failed", e);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-10 border-x border-border-low px-6 py-16">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.18em] text-muted">
            Solana + Anchor (wallet-adapter)
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            CRUD dApp (Pro)
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted">
            A Create Read Update Delete dApp that works reliably with Phantom.
          </p>
        </header>

        <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold">Wallet connection</p>
              <p className="text-sm text-muted">Connect Phantom.</p>
            </div>
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80">
              {wallet.connected ? "Connected" : "Not connected"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ClientOnly>
              <div onClickCapture={onWalletButtonClick} className="flex items-center gap-3">
                <WalletMultiButton />
                {connectTimeout && (
                  <div className="rounded border px-3 py-2 text-xs">
                    Wallet connection timed out.
                    <div className="mt-2 flex gap-2">
                      <button className="rounded border px-2 py-1" onClick={retryConnect}>
                        Retry
                      </button>
                      <button
                        className="rounded border px-2 py-1"
                        onClick={() => window.location.reload()}
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </ClientOnly>
            <span className="rounded-lg border border-border-low bg-cream px-3 py-2 font-mono text-xs">
              {address ?? "No wallet connected"}
            </span>
          </div>
        </section>

        <div className="mx-auto w-full max-w-3xl">
          <CrudApp />
        </div>
      </main>
    </div>
  );
}
