import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ConsensusOnchain } from "../target/types/consensus_onchain";
import { BN } from 'bn.js';
import {PublicKey} from "@solana/web3.js";
import {assert} from "chai";

describe("consensus_onchain", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ConsensusOnchain as Program<ConsensusOnchain>;
  const pg = program.provider as anchor.AnchorProvider;

  it("Is initialized!", async () => {
    // Add your test here.
    const [configPDA] = await PublicKey.findProgramAddress(
        [
          Buffer.from("config")
        ],
        program.programId
    )
    console.log(pg.wallet.publicKey)
    const tx = await program.methods.initialize(new BN('20')).accounts({
      config: configPDA,
      payer: pg.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([]).rpc();
    console.log("Your transaction signature", tx);
    assert((await program.account.config.fetch(configPDA)).fee.eq(
        new BN('20'))
    )
  });
});
