// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import {BN} from "bn.js";
import {assert} from "chai";
import {PublicKey} from "@solana/web3.js";

const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);
  const idl = JSON.parse(
      require("fs").readFileSync("../target/idl/consensus_onchain.json", "utf8")
  );
  const programID=new PublicKey("")

  const program = new anchor.Program(idl, programID);
  const [configPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("config")
      ],
      program.programId
  )
  // Add your deploy script here.
  let fee = new BN('2000000')
  const tx = await program.methods.initialize(provider.wallet.publicKey, fee).accounts({
    config: configPDA,
    payer: provider.wallet.publicKey,
    systemProgram: anchor.web3.SystemProgram.programId,
  }).signers([]).rpc();
  console.log("Your transaction signature", tx);
};
