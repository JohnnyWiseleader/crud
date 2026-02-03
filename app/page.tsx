"use client";

import CrudApp from "./components/CrudApp";
import { useWallet } from "@solana/wallet-adapter-react";
import { ClientOnly } from "./components/ClientOnly";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Home() {
  const wallet = useWallet();
  const address = wallet.publicKey?.toBase58();

  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-10 border-x border-border-low px-6 py-16">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.18em] text-muted">
            Solana + Anchor (wallet-adapter)
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            CRUD dApp (devnet)
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted">
            Wallet-adapter frontend so Anchor .rpc() works reliably with Phantom.
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
              <WalletMultiButton />
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
