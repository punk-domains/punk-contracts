// Use if the Forbidden contract was deployed, but factory was not
// npx hardhat run scripts/temp/deployFactoryOnly.js --network localhost

const contractNameFactory = "PunkTLDFactory";
const forbAddress = "<enter-forbidden-address>";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract1
  const contractFactory = await ethers.getContractFactory(contractNameFactory);
  
  console.log("ForbiddenTlds contract address:", forbAddress);

  const tldPrice = ethers.utils.parseUnits("10", "ether");
  const instanceFactory = await contractFactory.deploy(tldPrice, forbAddress);
  
  console.log("Factory contract address:", instanceFactory.address);

  console.log("Wait a minute and then run this command to verify contracts on Etherscan:");
  console.log("npx hardhat verify --network " + network.name + " " + instanceFactory.address + ' "' + tldPrice + '" ' + forbAddress);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });