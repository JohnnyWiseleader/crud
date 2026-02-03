const anchor = require("@coral-xyz/anchor");
const { PublicKey } = anchor.web3;

const programId = new PublicKey("CR1RgZqqExQhtb3dsKzG1nJYDUbT1udJRSfM9xoE7k3J");

(async () => {
  const [idlAddr] = PublicKey.findProgramAddressSync(
    [Buffer.from("idl")],
    programId
  );
  console.log("IDL Address:", idlAddr.toBase58());
})();
