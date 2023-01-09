// npx hardhat run scripts/resolver/2_upgrade_with_gnosis_safe.js --network flare
// see instructions here: https://github.com/tempe-techie/upgradable-contracts#b-upgrades-with-gnosis-safe 

const previousVersionContractName = "PunkResolverV1";
const newVersionContractName = "PunkResolverV2";
let proxyAddress;

if (network.config.chainId === 1) {
  proxyAddress = "0x7e8aB50697C7Abe63Bdab6B155C2FB8D285458cB"; // Ethereum
} else if (network.config.chainId === 10) {
  proxyAddress = "0xF20fc12a4955c9d47194B8fEd591Fe01777D2b06"; // Optimism
} else if (network.config.chainId === 14) {
  proxyAddress = "0x1D882E64bb7f4D49e67018d81254236A2A6465a3"; // Flare
} else if (network.config.chainId === 19) {
  proxyAddress = "0x7e8aB50697C7Abe63Bdab6B155C2FB8D285458cB"; // Songbird
} else if (network.config.chainId === 56) {
  proxyAddress = "0x4aBf8b364ac4aF048Ea077AAA2EDF3e1e1EC0f9c"; // BSC
} else if (network.config.chainId === 77) {
  proxyAddress = "0x7A84e7f48DCe4ab212c3511eC5ade0982eaBa8c4"; // Sokol (Gnosis Testnet)
} else if (network.config.chainId === 100) {
  proxyAddress = "0x7Df67B2ef4eEDf49Fc53Bb6E94e90e9546FC6c6B"; // Gnosis
} else if (network.config.chainId === 137) {
  proxyAddress = "0x07884566cdED43eDaec7813C1523624202b060D3"; // Polygon
} else if (network.config.chainId === 250) {
  proxyAddress = "0xa97c7AF10ee564EBf452A9347bB9653454Ba69C0"; // Fantom
} else if (network.config.chainId === 4002) {
  proxyAddress = "0xa97c7AF10ee564EBf452A9347bB9653454Ba69C0"; // Fantom Testnet
} else if (network.config.chainId === 42161) {
  proxyAddress = "0xd64A2DF9d73CD1Cb50139A3eC3176070e00C67cA"; // Arbitrum
} else if (network.config.chainId === 1313161555) {
  proxyAddress = "0x4aBf8b364ac4aF048Ea077AAA2EDF3e1e1EC0f9c"; // Aurora Testnet
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // force import the previous implementation to generate .openzeppelin file
  const contractV1 = await ethers.getContractFactory(previousVersionContractName);
  const instanceV1 = await upgrades.forceImport(proxyAddress, contractV1);
  await instanceV1.deployed();

  // deploy the new implementation
  const contract = await ethers.getContractFactory(newVersionContractName);
  const impAddress = await upgrades.prepareUpgrade(proxyAddress, contract); // note: prepareUpgrade instead of upgradeProxy!
  //await instance.deployed();

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