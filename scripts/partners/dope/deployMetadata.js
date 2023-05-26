// Deploy FlexiPunkMetadata contract
// npx hardhat run scripts/partners/dope/deployMetadata.js --network optimisticEthereum
// metadata contract will be automatically added to TLD contract (if not, do it manually)

const tldAddress = "0x1d33989185AA79a3B9173bC7B1137E527C6A262b";

async function main() {
  const contractName = "DopeMetadata";

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractName);
  const instance = await contract.deploy();
  await instance.deployed();

  console.log("Metadata contract address:", instance.address);

  console.log("Adding metadata contract to TLD contract");

  const tldContract = await ethers.getContractFactory("FlexiPunkTLD");
  const tldInstance = await tldContract.attach(tldAddress);

  await tldInstance.changeMetadataAddress(instance.address);

  console.log("Done!");

  console.log("Wait a minute and then run this command to verify contracts on Etherscan:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });