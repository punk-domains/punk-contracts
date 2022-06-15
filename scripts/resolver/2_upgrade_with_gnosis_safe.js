// npx hardhat run scripts/resolver/2_upgrade_with_gnosis_safe.js --network polygonMumbai
// see instructions here: https://github.com/tempe-techie/upgradable-contracts#b-upgrades-with-gnosis-safe 

const contractName = "PunkResolverV2";
const proxyAddress = "<check-the-docs>";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contract = await ethers.getContractFactory(contractName);
  const impAddress = await upgrades.prepareUpgrade(proxyAddress, contract); // note: prepareUpgrade instead of upgradeProxy!

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