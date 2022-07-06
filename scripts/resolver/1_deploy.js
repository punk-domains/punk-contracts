// npx hardhat run scripts/resolver/1_deploy.js --network bsc
// after deployment:
// - Mark proxy contract as proxy on Etherscan-based explorers (Contract > More options > Is this a proxy)
// - Add factory addresses to the Resolver
// - Check if there's any TLD to deprecate
// - Move ownership to Gnosis Safe (2 things):
//   - transferOwnership() function -> this allows owner to add/remove factories and deprecated TLDs (note that you'll need to manually add implementation ABI to Gnosis Safe to find these methods)
//   - transfer the ownership of the ProxyAdmin -> this allows owner to do contract upgrades
//     - find the ProxyAdmin address in the .openzeppelin folder

const contractName = "PunkResolverV1";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contract = await ethers.getContractFactory(contractName);
  const instance = await upgrades.deployProxy(contract, {initializer: 'initialize'});
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