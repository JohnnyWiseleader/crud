"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export function DevWalletResetter() {
  const wallet = useWallet();

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const onVisibility = async () => {
      // when you refresh tab / focus after server restart, clear stuck "connecting"
      if (document.visibilityState === "visible") {
        if (wallet.connecting) {
          try { await wallet.disconnect(); } catch {}
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [wallet]);

  return null;
}
