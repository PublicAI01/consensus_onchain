import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ConsensusOnchain } from "../target/types/consensus_onchain";
import { BN } from 'bn.js';
import {Keypair, PublicKey} from "@solana/web3.js";
import {assert} from "chai";
import * as ed from '@noble/ed25519';

describe("consensus_onchain", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ConsensusOnchain as Program<ConsensusOnchain>;

  const pg = program.provider as anchor.AnchorProvider;

  const admin_keypair = Keypair.generate();
  const user_keypair =  Keypair.generate();
  const [configPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("config")
      ],
      program.programId
  )

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize(admin_keypair.publicKey, new BN('20')).accounts({
      config: configPDA,
      payer: pg.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([]).rpc();
    console.log("Your transaction signature", tx);
    assert((await program.account.config.fetch(configPDA)).fee.eq(
        new BN('20'))
    )
    assert((await program.account.config.fetch(configPDA)).adminAccount.equals(admin_keypair.publicKey))
  });

  it("User upload consensus data", async () => {
    let txid = await pg.connection.requestAirdrop(
        user_keypair.publicKey,
        5 * anchor.web3.LAMPORTS_PER_SOL
    );
    let { blockhash, lastValidBlockHeight } = await pg.connection.getLatestBlockhash();
    await pg.connection.confirmTransaction({
      signature: txid,
      blockhash,
      lastValidBlockHeight,
    });

    const message = Uint8Array.from(
        Buffer.from('this is such a good message to sign')
    );
    const signature = await ed.sign(message, admin_keypair.secretKey.slice(0, 32));
    console.log(signature)

    let uploadValidationInstruction = await program.methods.uploadValidation(
        Buffer.from(message),
        Array.from(signature),
    ).accounts({
      user:user_keypair.publicKey,
      config: configPDA,
      ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    }).instruction()

    let tx = new anchor.web3.Transaction()
        .add(
            // Ed25519 instruction
            anchor.web3.Ed25519Program.createInstructionWithPublicKey({
              publicKey: admin_keypair.publicKey.toBytes(),
              message: message,
              signature: signature,
            })
        )
        .add(
            // Our instruction
            uploadValidationInstruction
        );

    try {
      await anchor.web3.sendAndConfirmTransaction(
          pg.connection,
          tx,
          [user_keypair]
      );

      // If all goes well, we're good!
    } catch (error) {
      assert.fail(
          `Should not have failed with the following error:\n${error.msg}`
      );
    }
    assert((await program.account.config.fetch(configPDA)).fee.eq(
        new BN('33'))
    )
  });

});
