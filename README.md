# Consensus results on-chain program



​    This is the contract for PublicAI consensus onchain (called program on Solana). Users can upload their daily consensus data through this program, and the PublicAI Data Hub platform will issue points as rewards to those uploaders.



### Technical principle:



​    When the program is initialized, the deployer sets a signature public key, and the corresponding private key is stored on the server where the backend service program of PublicAI Data Hub is located.

​    After the user completes the daily training data set task on the Data Hub platform, he can request the backend to upload the data to the chain. The backend uses the private key mentioned above to sign,
ensuring that the data source is credible. 

​    Then the backend rolls up the data and obtains the rollup hash. The user then calls the program to pass in the hash and other necessary information, and the user pays the gas fee. When the on-chain program is executed, the signature will first be verified with the public key set during initialization. If the verification passes, the transaction is executed successfully.



## Getting Started

### Installation

Rust

```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Solana

```
sh -c "$(curl -sSfL https://release.solana.com/v1.18.16/install)"
```

Yarn

Anchor

### Installing using Anchor version manager (avm) (recommended)

Anchor version manager is a tool for using multiple versions of the anchor-cli. It will require the same dependencies as building from source. It is recommended you uninstall the NPM package if you have it installed.

Install `avm` using Cargo. Note this will replace your `anchor` binary if you had one installed.

```shell
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
```

On Linux systems you may need to install additional dependencies if cargo install fails. E.g. on Ubuntu:

```shell
sudo apt-get update && sudo apt-get upgrade && sudo apt-get install -y pkg-config build-essential libudev-dev libssl-dev
```

Install the latest version of the CLI using `avm`, and then set it to be the version to use.

```shell
avm install latest
avm use latest
```

Verify the installation.

```shell
anchor --version
```

##### The anchor version currently used in the code is 0.28.0



### Building and testing

```
anchor build
anchor test
```



## Deployment

Solana has three main clusters: `mainnet-beta`, `devnet`, and `testnet`. For developers, `devnet` and `mainnet-beta` are the most interesting. `devnet` is where you test your application in a more realistic environment than `localnet`. `testnet` is mostly for validators.

Here is your deployment checklist 🚀

1. Run `anchor build`. Your program keypair is now in `target/deploy`. Keep this keypair secret. You can reuse it on all clusters.
2. Run `anchor keys list` to display the keypair's public key and copy it into your `declare_id!` macro at the top of `lib.rs`.
3. Run `anchor build` again. This step is necessary to include the new program id in the binary.
4. Change the `provider.cluster` variable in `Anchor.toml` to `devnet`.
5. Run `anchor deploy`
6. Run `anchor test`