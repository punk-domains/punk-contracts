// npx hardhat run scripts/partners/op/deployPunkOpPgf.js --network optimisticKovan

const contractName = "PunkOpPgf";
const assetReceiver = "enter-asset-receiver-contract-address";
const tldAddress = "enter-op-contract-address";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractName);
  const instance = await contract.deploy(assetReceiver, tldAddress);
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contracts on Etherscan:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + assetReceiver + " " + tldAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });