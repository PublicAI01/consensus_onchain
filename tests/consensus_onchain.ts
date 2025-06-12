import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ConsensusOnchain } from "../target/types/consensus_onchain";
import { BN } from 'bn.js';
import {Keypair, PublicKey} from "@solana/web3.js";
import {assert, expect} from "chai";
import * as ed from '@noble/ed25519';
import * as bs58 from "bs58";
import {
    createMint,
    createAssociatedTokenAccount,
    mintTo,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID, getMint,
    createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";

describe("consensus_onchain", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ConsensusOnchain as Program<ConsensusOnchain>;

  const pg = program.provider as anchor.AnchorProvider;
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
  const admin_keypair = Keypair.generate();
  let user_keypair =  Keypair.generate();
  const [configPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("config")
      ],
      program.programId
  )

    const sendTx = async (ixs :anchor.web3.TransactionInstruction[], keypair: Keypair) => {
       let tx = new anchor.web3.Transaction()
           for(var i=0;i<ixs.length;i++) {
               tx.add(
                   // Our instruction
                   ixs[i]
               );
           }

        try {
            await anchor.web3.sendAndConfirmTransaction(
                pg.connection,
                tx,
                [keypair]
            );

            // If all goes well, we're good!
        } catch (error) {
               console.log(error)
            assert.fail(
                `Should not have failed with the following error:\n${error.msg}`
            );
        }
    }
  it("Is initialized!", async () => {
    await requestAirdrop(user_keypair);
    await requestAirdrop(admin_keypair);

    let fee = new BN('30000')
    const tx = await program.methods.initialize(admin_keypair.publicKey, fee).accounts({
      config: configPDA,
      payer: pg.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([]).rpc();
    console.log("Your transaction signature", tx);
    assert((await program.account.config.fetch(configPDA)).fee.eq(
        fee)
    )
    assert((await program.account.config.fetch(configPDA)).signer.equals(admin_keypair.publicKey))
  });

  it("User upload consensus data", async () => {
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
        new BN('30000'))
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

    it("Signer is owner", async () => {
        const tx = await program.methods.update(pg.wallet.publicKey, new BN('77')).accounts({
            config: configPDA,
            payer: pg.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).signers([]).rpc();
        console.log("Your transaction signature", tx);
        assert((await program.account.config.fetch(configPDA)).fee.eq(
            new BN('77'))
        )
        assert((await program.account.config.fetch(configPDA)).signer.equals(pg.wallet.publicKey))

        const msgJson = {
            'consensus_proof':'9b64d63367328fd980b6e88af0dc46c437bf2c3906a9b000eccd66a6e4599938',
            'timestamp':1234567,
        }
        const message = Uint8Array.from(
            Buffer.from(JSON.stringify(msgJson))
        );
        const signature = await ed.sign(message, pg.wallet.payer.secretKey.slice(0, 32));

        const [userPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('1234567'), user_keypair.publicKey.toBuffer()],
            program.programId,
        );

        let uploadValidationInstruction = await program.methods.uploadValidation(
            new BN('1234567'),
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
                    publicKey: pg.wallet.publicKey.toBytes(),
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
            new BN('77'))
        )
        assert.isFalse((await program.account.consensusState.fetch(userPDA)).global
        )
    });

    it("Fee test!", async () => {
        const oldBalance = await pg.connection.getBalance(
            configPDA
        );
    await program.methods.update(pg.wallet.publicKey, new BN('2000000')).accounts({
        config: configPDA,
        payer: pg.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([]).rpc();
      const msgJson = {
        'consensus_proof':'9b64d63367328fd980b6e88af0dc46c437bf2c3906a9b000eccd66a6e4599938',
          'timestamp':123452,
      }
      const message = Uint8Array.from(
          Buffer.from(JSON.stringify(msgJson))
      );
      const signature = await ed.sign(message, pg.wallet.payer.secretKey.slice(0, 32));

      const [userPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('123452'), user_keypair.publicKey.toBuffer()],
          program.programId,
      );

      let uploadValidationInstruction = await program.methods.uploadValidation(
          new BN('123452'),
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
                publicKey: pg.publicKey.toBytes(),
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
        let newBalance = await pg.connection.getBalance(
            configPDA
        );
        assert((newBalance-oldBalance)==2000000)

        await program.methods.withdraw(new BN(1000000)).accounts({
            config: configPDA,
            payer: pg.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).signers([]).rpc();
       let otherNewBalance = await pg.connection.getBalance(
            configPDA
        );
        assert((newBalance-otherNewBalance)==1000000)
    });

    it("User upload badge data", async () => {
        const [badgeConfigPoolPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('bdt_cfg_pool')],
            program.programId,
        );
        let quiz = 9;
        let tier = 1;
        let msgJson = {
            'quiz':quiz,
            'tier':tier,
            'owner': Array.from(user_keypair.publicKey.toBytes()),
        }
        let message = Uint8Array.from(
            Buffer.from(JSON.stringify(msgJson))
        );
        let signature = await ed.sign(message, pg.wallet.payer.secretKey.slice(0, 32));
        let [badgeConfigPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('bdt_cfg'), Buffer.from(quiz.toString())],
            program.programId,
        );
        let [badgePDA] = PublicKey.findProgramAddressSync(
            [Buffer.from(quiz.toString()), user_keypair.publicKey.toBuffer()],
            program.programId,
        );

        let uploadBadgeInstruction = await program.methods.uploadBadge(
            new BN(quiz.toString()),
            Buffer.from(message),
            Array.from(signature),
        ).accounts({
            user:user_keypair.publicKey,
            config: configPDA,
            badgeConfigPool: badgeConfigPoolPDA,
            badgeConfig: badgeConfigPDA,
            badge:badgePDA,
            ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).instruction()

        let tx = new anchor.web3.Transaction()
            .add(
                // Ed25519 instruction
                anchor.web3.Ed25519Program.createInstructionWithPublicKey({
                    publicKey: pg.publicKey.toBytes(),
                    message: message,
                    signature: signature,
                })
            )
            .add(
                // Our instruction
                uploadBadgeInstruction
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
        assert((await program.account.badgeConfigPool.fetch(badgeConfigPoolPDA)).total.eq(new BN(1)))
        assert((await program.account.badgeConfigPool.fetch(badgeConfigPoolPDA)).configCount.eq(new BN(1)))
        assert((await program.account.badgeConfig.fetch(badgeConfigPDA)).total.eq(new BN(1)))
        assert((await program.account.badgeConfig.fetch(badgeConfigPDA)).quiz.eq(new BN(quiz)))
        assert((await program.account.badge.fetch(badgePDA)).quiz.eq(new BN(quiz)))
        assert((await program.account.badge.fetch(badgePDA)).tier.eq(new BN(tier)))
        assert((await program.account.badge.fetch(badgePDA)).owner = user_keypair.publicKey)
        // Should error
        try {
            await anchor.web3.sendAndConfirmTransaction(
                pg.connection,
                tx,
                [user_keypair]
            );

        } catch (error) {
            // pass
        }
        quiz = 2;
        tier = 1;
        msgJson = {
            'quiz':quiz,
            'tier':tier,
            'owner': Array.from(user_keypair.publicKey.toBytes()),
        }
        message = Uint8Array.from(
            Buffer.from(JSON.stringify(msgJson))
        );
        signature = await ed.sign(message, pg.wallet.payer.secretKey.slice(0, 32));
        [badgeConfigPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('bdt_cfg'), Buffer.from(quiz.toString())],
            program.programId,
        );
        [badgePDA] = PublicKey.findProgramAddressSync(
            [Buffer.from(quiz.toString()), user_keypair.publicKey.toBuffer()],
            program.programId,
        );

        uploadBadgeInstruction = await program.methods.uploadBadge(
            new BN(quiz.toString()),
            Buffer.from(message),
            Array.from(signature),
        ).accounts({
            user:user_keypair.publicKey,
            config: configPDA,
            badgeConfigPool: badgeConfigPoolPDA,
            badgeConfig: badgeConfigPDA,
            badge:badgePDA,
            ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).instruction()

        tx = new anchor.web3.Transaction()
            .add(
                // Ed25519 instruction
                anchor.web3.Ed25519Program.createInstructionWithPublicKey({
                    publicKey: pg.publicKey.toBytes(),
                    message: message,
                    signature: signature,
                })
            )
            .add(
                // Our instruction
                uploadBadgeInstruction
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
        assert((await program.account.badgeConfigPool.fetch(badgeConfigPoolPDA)).total.eq(new BN(2)))
        assert((await program.account.badgeConfigPool.fetch(badgeConfigPoolPDA)).configCount.eq(new BN(2)))
        assert((await program.account.badgeConfig.fetch(badgeConfigPDA)).total.eq(new BN(1)))
        assert((await program.account.badgeConfig.fetch(badgeConfigPDA)).quiz.eq(new BN(quiz)))
        assert((await program.account.badge.fetch(badgePDA)).quiz.eq(new BN(quiz)))
        assert((await program.account.badge.fetch(badgePDA)).tier.eq(new BN(tier)))
        assert((await program.account.badge.fetch(badgePDA)).owner = user_keypair.publicKey)
        const other_user_keypair = Keypair.generate();
        await requestAirdrop(other_user_keypair);
        msgJson = {
            'quiz':quiz,
            'tier':tier,
            'owner': Array.from(other_user_keypair.publicKey.toBytes()),
        }
        message = Uint8Array.from(
            Buffer.from(JSON.stringify(msgJson))
        );
        signature = await ed.sign(message, pg.wallet.payer.secretKey.slice(0, 32));
        [badgeConfigPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('bdt_cfg'), Buffer.from(quiz.toString())],
            program.programId,
        );
        [badgePDA] = PublicKey.findProgramAddressSync(
            [Buffer.from(quiz.toString()), other_user_keypair.publicKey.toBuffer()],
            program.programId,
        );

        uploadBadgeInstruction = await program.methods.uploadBadge(
            new BN(quiz.toString()),
            Buffer.from(message),
            Array.from(signature),
        ).accounts({
            user:other_user_keypair.publicKey,
            config: configPDA,
            badgeConfigPool: badgeConfigPoolPDA,
            badgeConfig: badgeConfigPDA,
            badge:badgePDA,
            ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).instruction()

        tx = new anchor.web3.Transaction()
            .add(
                // Ed25519 instruction
                anchor.web3.Ed25519Program.createInstructionWithPublicKey({
                    publicKey: pg.publicKey.toBytes(),
                    message: message,
                    signature: signature,
                })
            )
            .add(
                // Our instruction
                uploadBadgeInstruction
            );
        try {
            await anchor.web3.sendAndConfirmTransaction(
                pg.connection,
                tx,
                [other_user_keypair]
            );

            // If all goes well, we're good!
        } catch (error) {
            assert.fail(
                `Should not have failed with the following error:\n${error.msg}`
            );
        }
        assert((await program.account.badgeConfigPool.fetch(badgeConfigPoolPDA)).total.eq(new BN(3)))
        assert((await program.account.badgeConfigPool.fetch(badgeConfigPoolPDA)).configCount.eq(new BN(2)))
        assert((await program.account.badgeConfig.fetch(badgeConfigPDA)).total.eq(new BN(2)))
        assert((await program.account.badgeConfig.fetch(badgeConfigPDA)).quiz.eq(new BN(quiz)))
        assert((await program.account.badge.fetch(badgePDA)).quiz.eq(new BN(quiz)))
        assert((await program.account.badge.fetch(badgePDA)).tier.eq(new BN(tier)))
        assert((await program.account.badge.fetch(badgePDA)).owner = other_user_keypair.publicKey)
    });

    it("Claim reward", async () => {
        const mint_keypair = Keypair.generate();
        await requestAirdrop(mint_keypair);
        const seeds = [Buffer.from("state")];
        const [statePda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
            seeds,
            program.programId);
        const mint = await createMint(
            pg.connection,
            mint_keypair,
            mint_keypair.publicKey,
            null,
            6
        );
        const token_vault_ata = await getAssociatedTokenAddress(
            mint,
            statePda,
            true
        );
        let createATAIx = createAssociatedTokenAccountInstruction(
            mint_keypair.publicKey,
            token_vault_ata,
            statePda,
            mint
        );

        let tx = new anchor.web3.Transaction().add(createATAIx);
        await pg.sendAndConfirm(tx, [mint_keypair]);

        const mintAmount = BigInt(1000000_000000);
        await mintTo(
            pg.connection,
            mint_keypair,
            mint,
            token_vault_ata,
            mint_keypair.publicKey,
            mintAmount
        );
        const token_vault_ata_balance = await pg.connection.getTokenAccountBalance(token_vault_ata);
        expect(token_vault_ata_balance.value.amount).to.eq(mintAmount.toString());

        let initClaimTx = await program.methods.iniClaim(
        ).accounts({
            state:statePda,
            mint:mint,
            tokenVault:token_vault_ata,
            config: configPDA,
            payer:pg.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).instruction()
        await sendTx([initClaimTx], pg.wallet.payer);
        await sendTx([initClaimTx], pg.wallet.payer);

        let task =1 ;
        let nonce = 0;
        let reward = 1000000;
        let msgJson = {
            'task':task,
            'nonce':nonce,
            'reward':reward,
            'receiver': Array.from(user_keypair.publicKey.toBytes()),
        }
        let message = Uint8Array.from(
            Buffer.from(JSON.stringify(msgJson))
        );
        let signature = await ed.sign(message, pg.wallet.payer.secretKey.slice(0, 32));
        let [rewardPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('reward'), Buffer.from(task.toString()), user_keypair.publicKey.toBuffer()],
            program.programId,
        );
        const receiver_ata = await getAssociatedTokenAddress(
            mint,
            user_keypair.publicKey,
            false
        );
        // createATAIx = createAssociatedTokenAccountInstruction(
        //     user_keypair.publicKey,
        //     receiver_ata,
        //     user_keypair.publicKey,
        //     mint
        // );
        //  tx = new anchor.web3.Transaction().add(createATAIx);
        // await pg.sendAndConfirm(tx, [user_keypair]);
        let claimIx = await program.methods.claim(
            new BN(task.toString()),
            Buffer.from(message),
            Array.from(signature),
        ).accounts({
            payer:user_keypair.publicKey,
            config: configPDA,
            state:statePda,
            reward:rewardPDA,
            tokenVault:token_vault_ata,
            receiver:receiver_ata,
            mint: mint,
            ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        }).instruction()
        let sigIx =
                // Ed25519 instruction
                anchor.web3.Ed25519Program.createInstructionWithPublicKey({
                    publicKey: pg.publicKey.toBytes(),
                    message: message,
                    signature: signature,
                });
        await sendTx([sigIx, claimIx], user_keypair);
        let receiver_ata_balance = await pg.connection.getTokenAccountBalance(receiver_ata);
        expect(receiver_ata_balance.value.amount).to.eq(reward.toString());
        assert((await program.account.claimReward.fetch(rewardPDA)).times==1)
    });
});