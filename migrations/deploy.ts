// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import {Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Commitment,
  Transaction} from "@solana/web3.js";
import {BN} from "bn.js";
import {assert} from "chai";
import * as ed from "@noble/ed25519";
import * as bs58 from  "bs58";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
const anchor = require("@coral-xyz/anchor");
function hexStringToUint8Array(hexString: string): Uint8Array {
  if (hexString.startsWith("0x")) {
    hexString = hexString.slice(2);
  }

  if (hexString.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }

  const byteArray = new Uint8Array(hexString.length / 2);

  for (let i = 0; i < hexString.length; i += 2) {
    const hexPair = hexString.slice(i, i + 2);
    byteArray[i / 2] = parseInt(hexPair, 16);
  }

  return byteArray;
}
module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);
  const currentDirectory = process.cwd();
  const idl = JSON.parse(
      require("fs").readFileSync(currentDirectory + "/target/idl/consensus_onchain.json", "utf8")
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
  // console.log(await program.account.config.fetch(configPDA))
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
 //  let fee = new BN('30000')
 //  const tx = await program.methods.initialize(provider.wallet.publicKey, fee).accounts({
 //    config: configPDA,
 //    payer: provider.wallet.publicKey,
 //    systemProgram: anchor.web3.SystemProgram.programId,
 //  }).signers([]).rpc();
 //  console.log("Your transaction signature", tx);
 //
 //  assert((await program.account.config.fetch(configPDA)).signer.equals(provider.publicKey))
 //  console.log(await program.account.config.fetch(configPDA))
  let commitment: Commitment = 'confirmed';
  // init clam
  const seeds = [Buffer.from("state")];
  const [statePda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      program.programId);
  const mint = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB")
  const token_vault_ata = await getAssociatedTokenAddress(
      mint,
      statePda,
      true
  );
  console.log(token_vault_ata.toBase58());
  // let createATAIx = createAssociatedTokenAccountInstruction(
  //     provider.wallet.publicKey,
  //     token_vault_ata,
  //     statePda,
  //     mint
  // );
  //
  // let tx = new anchor.web3.Transaction().add(createATAIx);
  // try {
  //   await sendAndConfirmTransaction(provider.connection, tx, [provider.wallet.payer], {commitment});
  // }
  // catch (error: any) {
  //   console.log(error);
  // }

  // let initClaimTx = program.methods.iniClaim(
  // ).accounts({
  //   state:statePda,
  //   mint:mint,
  //   tokenVault:token_vault_ata,
  //   config: configPDA,
  //   payer:provider.wallet.publicKey,
  //   systemProgram: anchor.web3.SystemProgram.programId,
  // }).instruction();
  // let tx = new Transaction().add(await initClaimTx);
  // try {
  //   await sendAndConfirmTransaction(provider.connection, tx, [provider.wallet.payer], {commitment});
  // }
  // catch (error: any) {
  //   console.log(error);
  // }
};
