/*
Mock tokens for testnet purposes.

npx hardhat run scripts/temp/deployMockToken.js --network optimisticKovan
*/

const contractName = "MockErc20Token";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contract1 = await ethers.getContractFactory(contractName); // mock DAI
  const contract2 = await ethers.getContractFactory(contractName); // mock AAVE
  
  const tokenName1 = "Mock Dai";
  const tokenSymbol1 = "MDAI";
  
  const tokenName2 = "Mock Aave";
  const tokenSymbol2 = "MAAVE";

  const instance1 = await contract1.deploy(tokenName1, tokenSymbol1);
  const instance2 = await contract2.deploy(tokenName2, tokenSymbol2);

  console.log("Contract 1 address:", instance1.address);
  console.log("Contract 2 address:", instance2.address);

  console.log("Wait a minute and then run these commands:");
  
  console.log("npx hardhat verify --network " + network.name + " " + instance1.address + ' "' + tokenName1 + '" "' + tokenSymbol1 + '"');
  console.log("npx hardhat verify --network " + network.name + " " + instance2.address + ' "' + tokenName2 + '" "' + tokenSymbol2 + '"');
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