// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import {Keypair, PublicKey} from "@solana/web3.js";
import {BN} from "bn.js";
import {assert} from "chai";
import * as ed from "@noble/ed25519";
import * as bs58 from  "bs58";
const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);
  const idl = JSON.parse(
      require("fs").readFileSync("../target/idl/consensus_onchain.json", "utf8")
  );
  const programID=new PublicKey("B2fHGq6iwRPGmn3KBUFBgQpxVnDGFQT3ZjD2vJTDphZn")

  const program = new anchor.Program(idl, programID);

  // Add your deploy script here.
  const [configPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("config")
      ],
      program.programId
  )
  console.log(configPDA)
  console.log(await program.account.config.fetch(configPDA))
  // const tx = await program.methods.update(provider.wallet.publicKey, new BN('30000')).accounts({
  //   config: configPDA,
  //   payer: provider.wallet.publicKey,
  //   systemProgram: anchor.web3.SystemProgram.programId,
  // }).signers([]).rpc();
  // console.log("Your transaction signature", tx);
  // assert((await program.account.config.fetch(configPDA)).fee.eq(
  //     new BN('30000'))
  // )
//   const msgJson = {
//     'timestamp':1717545600,
//     'consensus_proof':'25a5577a3e6b5b89df5a9ce2ad6103a110fa2c08ab54c9f2394d28a15ba79c5f'
//   }
//   const message = Uint8Array.from(
//       Buffer.from(JSON.stringify(msgJson))
//   );
//   const signature = await ed.sign(message, provider.wallet.payer.secretKey.slice(0, 32));
//
//   console.log(signature)
//   const userKeypair = Keypair.fromSecretKey(
//       bs58.decode(''));
//   console.log(userKeypair.publicKey.toBase58())
//   console.log(userKeypair.secretKey)
//   const [userPDA] = PublicKey.findProgramAddressSync(
//       [Buffer.from('1717545600'), userKeypair.publicKey.toBuffer()],
//       program.programId,
//   );
//   console.log(userPDA.toBase58())
//   console.log(message)
//   // console.log(await program.account.config.fetch(configPDA))
//
//   console.log(anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY.toBase58())
//   let uploadValidationInstruction = await program.methods.uploadValidation(
//       new BN('123451234'),
//       Buffer.from(message),
//       Array.from(signature),
//   ).accounts({
//     user:userKeypair.publicKey,
//     config: configPDA,
//     consensus:userPDA,
//     ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
//     systemProgram: anchor.web3.SystemProgram.programId,
//   }).instruction()
//
//   let tx = new anchor.web3.Transaction()
//       .add(
//           // Ed25519 instruction
//           anchor.web3.Ed25519Program.createInstructionWithPublicKey({
//             publicKey: provider.wallet.publicKey.toBytes(),
//             message: message,
//             signature: signature,
//           })
//       )
//       .add(
//           // Our instruction
//           uploadValidationInstruction
//       );
// console.log(tx)
  // try {
  //   console.log(tx)
  //   await anchor.web3.sendAndConfirmTransaction(
  //       provider.connection,
  //       tx,
  //       [userKeypair]
  //   );
  //
  //   // If all goes well, we're good!
  // } catch (error) {
  //   assert.fail(
  //       `Should not have failed with the following error:\n${error.msg}`
  //   );
  // }
  // assert((await program.account.config.fetch(configPDA)).fee.eq(
  //     new BN('2000000'))
  // )
  // assert.isFalse((await program.account.consensusState.fetch(userPDA)).global
  // )


 // console.log(provider.wallet.publicKey.toBase58())
  let fee = new BN('30000')
  const tx = await program.methods.initialize(provider.wallet.publicKey, fee).accounts({
    config: configPDA,
    payer: provider.wallet.publicKey,
    systemProgram: anchor.web3.SystemProgram.programId,
  }).signers([]).rpc();
  console.log("Your transaction signature", tx);

  assert((await program.account.config.fetch(configPDA)).signer.equals(provider.publicKey))
  console.log(await program.account.config.fetch(configPDA))
};
