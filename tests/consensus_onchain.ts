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
    const requestAirdrop = async (mint_keypair:anchor.web3.Keypair) => {
        const signature = await pg.connection.requestAirdrop(
            mint_keypair.publicKey,
            5 * anchor.web3.LAMPORTS_PER_SOL
        );
        const { blockhash, lastValidBlockHeight } = await pg.connection.getLatestBlockhash();
        await pg.connection.confirmTransaction({
            blockhash,
            lastValidBlockHeight,
            signature
        });
    }
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
    assert((await program.account.config.fetch(configPDA)).signer.equals(admin_keypair.publicKey))
  });

  it("User upload consensus data", async () => {
      await requestAirdrop(user_keypair);
      await requestAirdrop(admin_keypair);

    const msgJson = {
      'consensus_proof':'9b64d63367328fd980b6e88af0dc46c437bf2c3906a9b000eccd66a6e4599938',
        'timestamp':12345,
    }
    const message = Uint8Array.from(
        Buffer.from(JSON.stringify(msgJson))
    );
    const signature = await ed.sign(message, admin_keypair.secretKey.slice(0, 32));

    const [userPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('12345'), user_keypair.publicKey.toBuffer()],
        program.programId,
    );

    let uploadValidationInstruction = await program.methods.uploadValidation(
        new BN('12345'),
        Buffer.from(message),
        Array.from(signature),
    ).accounts({
      user:user_keypair.publicKey,
      config: configPDA,
      consensus:userPDA,
      ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
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
        new BN('20'))
    )
    assert.isFalse((await program.account.consensusState.fetch(userPDA)).global
    )

    const [adminPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('12345'), admin_keypair.publicKey.toBuffer()],
        program.programId,
    );
    uploadValidationInstruction = await program.methods.uploadValidation(
        new BN('12345'),
        Buffer.from(message),
        Array.from(signature),
    ).accounts({
      user:admin_keypair.publicKey,
      config: configPDA,
      consensus:adminPDA,
      ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).instruction()

    tx = new anchor.web3.Transaction()
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
          [admin_keypair]
      );

      // If all goes well, we're good!
    } catch (error) {
      assert.fail(
          `Should not have failed with the following error:\n${error.msg}`
      );
    }
    assert.isTrue((await program.account.consensusState.fetch(adminPDA)).global
    )
  });

    it("Is updated!", async () => {
        const other_admin_keypair = Keypair.generate();
        await requestAirdrop(other_admin_keypair);

        const tx = await program.methods.update(other_admin_keypair.publicKey, new BN('66')).accounts({
            config: configPDA,
            payer: pg.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).signers([]).rpc();
        console.log("Your transaction signature", tx);
        assert((await program.account.config.fetch(configPDA)).fee.eq(
            new BN('66'))
        )
        assert((await program.account.config.fetch(configPDA)).signer.equals(other_admin_keypair.publicKey))

        const msgJson = {
            'consensus_proof':'9b64d63367328fd980b6e88af0dc46c437bf2c3906a9b000eccd66a6e4599938',
            'timestamp':12345,
        }
        const message = Uint8Array.from(
            Buffer.from(JSON.stringify(msgJson))
        );
        const signature = await ed.sign(message, other_admin_keypair.secretKey.slice(0, 32));

        const [userPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('123456'), user_keypair.publicKey.toBuffer()],
            program.programId,
        );

        let uploadValidationInstruction = await program.methods.uploadValidation(
            new BN('123456'),
            Buffer.from(message),
            Array.from(signature),
        ).accounts({
            user:user_keypair.publicKey,
            config: configPDA,
            consensus:userPDA,
            ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).instruction()

        let txx = new anchor.web3.Transaction()
            .add(
                // Ed25519 instruction
                anchor.web3.Ed25519Program.createInstructionWithPublicKey({
                    publicKey: other_admin_keypair.publicKey.toBytes(),
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
                txx,
                [user_keypair]
            );

            // If all goes well, we're good!
        } catch (error) {
            assert.fail(
                `Should not have failed with the following error:\n${error.msg}`
            );
        }
        assert((await program.account.config.fetch(configPDA)).fee.eq(
            new BN('66'))
        )
        assert.isFalse((await program.account.consensusState.fetch(userPDA)).global
        )
    });


});
