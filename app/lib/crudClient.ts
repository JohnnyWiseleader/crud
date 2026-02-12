"use client";

import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";

import idl from "../idl/crud_app.json";

export function getProgramId(): PublicKey {
  const val = process.env.NEXT_PUBLIC_PROGRAM_ID;
  if (!val) throw new Error("Missing NEXT_PUBLIC_PROGRAM_ID");
  return new PublicKey(val);
}

export function createCrudProgram(wallet: WalletContextState, connection: Connection) {
  if (!wallet.publicKey) throw new Error("Wallet not connected");
  if (!wallet.signTransaction) throw new Error("Wallet cannot sign");

  const provider = new AnchorProvider(connection, wallet as any, {
    preflightCommitment: "confirmed",
  });

  const PROGRAM_ID = getProgramId();
  const normalizedIdl = JSON.parse(JSON.stringify(idl)) as any;

  // merge types into accounts if needed
  if (Array.isArray(normalizedIdl.accounts) && Array.isArray(normalizedIdl.types)) {
    const typesByName: Record<string, any> = {};
    for (const t of normalizedIdl.types) typesByName[t.name] = t.type ?? t;

    normalizedIdl.accounts = normalizedIdl.accounts.map((acct: any) => {
      if (acct.type) return acct;
      const t = typesByName[acct.name];
      return t ? { ...acct, type: t } : acct;
    });
  }

  // anchor >=0.30 expects program id inside IDL
  normalizedIdl.address = PROGRAM_ID.toBase58();

  return new (Program as any)(normalizedIdl as Idl, provider as any);
}
