# Punk Domains core contracts

Punk Domains allow anyone to either create a top-level domain (TLD) such as `.wagmi` or a normal domain such as `techie.wagmi`. In addition, users can add some other data to their domain:

- description
- redirect URL (useful together with the Punk Domains browser extension)
- profile picture (an address and token ID of an NFT)

See instructions below to run the code on localhost and for blockchain deployment.

### .env

Create a `.env` file with the following keys:

```bash
ALCHEMY_API_KEY_MUMBAI=enter-key-here
ALCHEMY_API_KEY_OPTIMISM=enter-key-here
ALCHEMY_API_KEY_RINKEBY=enter-key-here
ALCHEMY_API_KEY_ROPSTEN=enter-key-here
DEPLOYER_PRIVATE_KEY=enter-key-here
ETHERSCAN_API_KEY=enter-key-here
POLYGONSCAN_API_KEY=enter-key-here
OPTIMISTIC_ETHERSCAN_API_KEY=enter-key-here
ARBISCAN_API_KEY=enter-key-here
```

### Compile

Make sure you use Node.js v19.

```bash
npx hardhat compile
```

### Test

```bash
npx hardhat test
```

Run tests in a specific folder:

```bash
npx hardhat test test/factories/flexi/*test.js
```

Run a specific test:

```bash
npx hardhat test test/factories/flexi/TLD.owner.test.js
```

### Run on localhost

Start a localhost node:

```bash
npx hardhat node
```

Make sure to add one of the private keys presented as deployer key in `.env` file.

In a separate terminal tab then run the following command:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### Deploy to testnets

```bash
npx hardhat run scripts/deploy.js --network polygonMumbai
```

```bash
npx hardhat run scripts/deploy.js --network ropsten
```

### Verify contract on Etherscan/Polygonscan:

Make sure to enter correct network names ([see here](https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html#multiple-api-keys-and-alternative-block-explorers) and [here](https://gist.github.com/tempe-techie/95a3ad4e81b46c895928a0524fc2b7ac)):

```bash
etherscan: {
  apiKey: {
    polygonMumbai: process.env.POLYGONSCAN_API_KEY,
    ropsten: process.env.ETHERSCAN_API_KEY
  }
},
```

Then run this command:

```bash
npx hardhat verify --network mumbai <contract-address> "argument"
```

Also make sure you have the `@nomiclabs/hardhat-etherscan` library `3.1.0` or above.

### Verify TLD contracts

Verifying TLD contracts generated through the factory is a bit tricky, but there is a way around the issue. See `scripts/temp/deployTld.js` for instructions.

#### Manually verify TLD contract on Etherscan

1. Flatten the code (`npx hardhat flatten <path-to-contract>.sol >> <flat-contract-name>.sol`).
2. Delete all instances of SPDX Licences except one.
3. Go to Etherscan and select single file verification.
4. Turn on optimizations.
5. Select 0.8.4 for compiler (do not delete other pragma solidity lines in the file, even if they are for a different Solidity version).
6. Generate the ABI-encoded constructor arguments using this online tool: https://abi.hashex.org/. Make sure you generate all arguments 
needed in the TLD **constructor**, including the Factory address.
7. Submit for verification and hope for the best :)

## Audit tools

### Flatten the contracts

Most audit tools will require you to flatten the contracts. This means that all contracts that are defined under the imports will actually be imported into one .sol file, so all code is in one place.

First create a new folder called flattened:

```bash
mkdir flattened
```

To flatten a contract, run this command:

```bash
npx hardhat flatten <path-to-contract> >> flattened/<flat-contract-name>.sol
```

You may also need to give all contracts in the flattened file the same Solidity version. And you may need to delete all SPDX lines except the very first one.

### Mythril

Use Docker:

```bash
sudo docker pull mythril/myth
```

Go to the `flattened` folder and run this command:

```bash
sudo docker run -v $(pwd):/tmp mythril/myth -v4 analyze /tmp/<flat-contract-name>.sol --max-depth 10
```

Or, if you don't use Docker, use this command alone:

```bash
myth -v4 analyze flattened/PunkForbiddenTlds.sol --max-depth 10
```

Flags:

- `v4`: verbose
- `o`: output
- `a`: address onchain
- `l`: automatically retrieve dependencies
- `max-depth`: maximum recursion depth

Docs: https://mythril-classic.readthedocs.io/en/master/security-analysis.html 

### Slither

Install Slither:

```bash
pip3 install slither-analyzer --user
```

Run it in the `flattened` folder:

```bash
slither .
```

Docs: https://github.com/crytic/slither

## Debugging

### Error: ENOENT: no such file or directory

Run `npx hardhat clean` and then `npx hardhat compile`.