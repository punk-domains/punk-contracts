// Deploy non-upgradable version of Resolver
// npx hardhat run scripts/resolver/deployNonUpgradableResolver.js --network xdai

async function main() {
  const contractName = "PunkResolverNonUpgradable";

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contract = await ethers.getContractFactory(contractName);
  const instance = await contract.deploy();
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contracts on block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });