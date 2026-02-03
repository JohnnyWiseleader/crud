"use client";

import { useBalance, useWalletConnection } from "@solana/react-hooks";

function WalletPanel() {
  const { connectors, connect, disconnect, wallet, status, currentConnector } =
    useWalletConnection();
  const address = wallet?.account.address;
  const balance = useBalance(address);

  if (status === "connected") {
    return (
      <div>
        <p>Connected via {currentConnector?.name}</p>
        <p>{address?.toString()}</p>
        <p>Lamports: {balance.lamports?.toString() ?? "loading…"}</p>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return connectors.map((c) => (
    <button key={c.id} onClick={() => connect(c.id)}>
      Connect {c.name}
    </button>
  ));
}