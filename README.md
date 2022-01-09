# Web3panda Domains core contracts

Web3Panda Domains allow anyone to either create a top-level domain (TLD) such as .web3 or a normal domain such as techie.web3. In addition, users can add some other data to their domain:

- description
- redirect URL (useful together with the Web3Panda browser extension)
- profile picture (an address and token ID of an NFT)

See instructions below to run the code on localhost and for blockchain deployment.

### .env

Create a `.env` file with the following keys:

```bash
ALCHEMY_API_KEY_MUMBAI=enter-key-here
ALCHEMY_API_KEY_ROPSTEN=enter-key-here
DEPLOYER_PRIVATE_KEY=enter-key-here
ETHERSCAN_API_KEY=enter-key-here
POLYGONSCAN_API_KEY=enter-key-here
```

### Compile

```bash
npx hardhat compile
```

### Test

```bash
npx hardhat test
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

### Deploy to Mumbai testnet

```bash
npx hardhat run scripts/deploy.js --network mumbai
```

### Verify contract on Etherscan/Polygonscan:

First make sure to have the correct key uncommented (Polygonscan for Mumbai or Etherscan for Ropsten):

```bash
etherscan: {
  apiKey: process.env.POLYGONSCAN_API_KEY
  //apiKey: process.env.ETHERSCAN_API_KEY
},
```

Then run this command:

```bash
npx hardhat verify --network mumbai <contract-address> "argument"
```

### Verify TLD contracts

Verifying TLD contracts generated through the factory is a bit tricky, but there is a way around the issue. See scripts/deployTld.js for instructions.
