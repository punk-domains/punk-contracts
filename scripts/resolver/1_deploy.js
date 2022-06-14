// npx hardhat run scripts/resolver/1_deploy.js --network polygonMumbai

const contractName = "PunkResolverV1";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contract = await ethers.getContractFactory(contractName);
  const instance = await upgrades.deployProxy(contract); // alternative: upgrades.deployProxy(contract, {initializer: 'initialize'});
  await instance.deployed();

  console.log("Proxy address:", instance.address);

  const impAddress = await hre.upgrades.erc1967.getImplementationAddress(instance.address);

  console.log("Implementation address:", impAddress);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + impAddress);
}

main()
.then(() => process.exit(0))
.catch(error => {
  console.error(error);
  process.exit(1);
});