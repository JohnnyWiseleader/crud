const anchor = require("@coral-xyz/anchor");
const { PublicKey } = anchor.web3;

const programId = new PublicKey("4NcUz8q7fAChF5RiAvcWQ6cFaZduXLQYiaVX2Fq4i2EC");

(async () => {
  const [idlAddr] = PublicKey.findProgramAddressSync(
    [Buffer.from("idl")],
    programId
  );
  console.log("IDL Address:", idlAddr.toBase58());
})();
