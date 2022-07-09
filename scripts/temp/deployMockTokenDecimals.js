/*
Mock tokens for testnet purposes.

npx hardhat run scripts/temp/deployMockTokenDecimals.js --network arbitrumTestnet
*/

const contractName = "MockErc20TokenDecimals";
const tokenName = "Mock Token";
const tokenSymbol = "MTKN";
const tokenDecimals = 4;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contract = await ethers.getContractFactory(contractName);
  const instance = await contract.deploy(tokenName, tokenSymbol, tokenDecimals);

  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + ' "' + tokenName + '" "' + tokenSymbol + '" ' + tokenDecimals);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });