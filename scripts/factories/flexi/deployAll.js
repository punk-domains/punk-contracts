// Deploy forbidden contract & factory contract (you'll need to deploy metadata contract beforehand)
// after deployment, add factory address to the ForbiddenTlds whitelist and to the Resolver
// npx hardhat run scripts/factories/flexi/deployAll.js --network mainnet

async function main() {
  const contractNameForb = "PunkForbiddenTlds";
  const contractNameFactory = "FlexiPunkTLDFactory";
  const metaAddress = "<add-metadata-contract-address>";

  let tldPrice = "0.01"; // in ETH or MATIC on testnets

  // mainnet prices
  if (network.config.chainId === 1 || network.config.chainId === 10 || network.config.chainId === 42161) {
    tldPrice = "40"; // ETH
  } else if (network.config.chainId === 137) {
    tldPrice = "80000"; // MATIC
  } else if (network.config.chainId === 100) {
    tldPrice = "75000"; // XDAI
  }

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contractForb = await ethers.getContractFactory(contractNameForb);
  const contractFactory = await ethers.getContractFactory(contractNameFactory);

  const instanceForb = await contractForb.deploy();
  
  console.log("ForbiddenTlds contract address:", instanceForb.address);
  console.log("FlexiPunkMetadata contract address:", metaAddress);

  const tldPriceWei = ethers.utils.parseUnits(tldPrice, "ether");
  const instanceFactory = await contractFactory.deploy(tldPriceWei, instanceForb.address, metaAddress);
  
  console.log("Factory contract address:", instanceFactory.address);

  console.log("Wait a minute and then run these two commands to verify contracts on Etherscan:");

  console.log("Command 1 (verify Forbiddent TLDs contract):");
  console.log("npx hardhat verify --network " + network.name + " " + instanceForb.address);
  
  console.log("Command 2 (verify Factory contract):");
  console.log("npx hardhat verify --network " + network.name + " " + instanceFactory.address + ' "' + tldPrice + '" ' + instanceForb.address);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });