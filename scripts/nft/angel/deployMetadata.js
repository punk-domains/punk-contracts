// npx hardhat run scripts/nft/angel/deployMetadata.js --network polygonMumbai
// TODO after deployment: 
// 1) Deploy minter contract and add minter address to the metadata contract through changeMinter() function
// 2) Add metadata address to the TLD contract through the changeMetadataAddress() function

const contractNameFactory = "PunkAngelMetadata";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy();
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });