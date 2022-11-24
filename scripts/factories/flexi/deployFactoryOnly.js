// Deploy factory contract only (ForbiddenTlds and FlexiPunkMetadata need to be already deployed)
// after deployment, add factory address to the ForbiddenTlds whitelist and to the Resolver
// npx hardhat run scripts/factories/flexi/deployFactoryOnly.js --network bsc

async function main() {
  const contractNameFactory = "FlexiPunkTLDFactory";
  const forbAddress = "<enter-forbidden-tlds-contract-address>";
  const metaAddress = "<enter-metadata-address>";

  let tldPrice = "0.01"; // price on testnets

  // mainnet prices
  if (network.config.chainId === 1 || network.config.chainId === 10 || network.config.chainId === 42161) {
    tldPrice = "40"; // ETH
  } else if (network.config.chainId === 137) {
    tldPrice = "80000"; // MATIC
  } else if (network.config.chainId === 100) {
    tldPrice = "75000"; // XDAI
  } else if (network.config.chainId === 56) {
    tldPrice = "250"; // BNB
  } else if (network.config.chainId === 19) {
    tldPrice = "2000000"; // SGB
  } else if (network.config.chainId === 250) {
    tldPrice = "270000"; // FTM
  }

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract1
  const contractFactory = await ethers.getContractFactory(contractNameFactory);
  
  console.log("ForbiddenTlds contract address:", forbAddress);
  console.log("FlexiPunkMetadata contract address:", metaAddress);

  const tldPriceWei = ethers.utils.parseUnits(tldPrice, "ether");
  const instanceFactory = await contractFactory.deploy(tldPriceWei, forbAddress, metaAddress);
  
  console.log("Factory contract address:", instanceFactory.address);

  console.log("Wait a minute and then run this command to verify contracts on Etherscan:");
  console.log("npx hardhat verify --network " + network.name + " " + instanceFactory.address + ' "' + tldPriceWei + '" ' + forbAddress + ' ' + metaAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });