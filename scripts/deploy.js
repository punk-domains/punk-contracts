const contractNameForb = "PunkForbiddenTlds";
const contractNameFactory = "PunkTLDFactory";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract1
  const contractForb = await ethers.getContractFactory(contractNameForb);
  const contractFactory = await ethers.getContractFactory(contractNameFactory);

  const instanceForb = await contractForb.deploy();
  console.log("ForbiddenTlds contract address:", instanceForb.address);

  const tldPrice = ethers.utils.parseUnits("0.01", "ether");
  const instanceFactory = await contractFactory.deploy(tldPrice, instanceForb.address);

  await instanceForb.addFactoryAddress(instanceFactory.address);
  
  console.log("Factory contract address:", instanceFactory.address);

  console.log("Wait a minute and then run these two commands to verify contracts on Etherscan:");

  console.log("Command 1 (verify Forbiddent TLDs contract):");
  console.log("npx hardhat verify --network " + network.name + " " + instanceForb.address);
  
  console.log("Command 2 (verify Factory contract):");
  console.log("npx hardhat verify --network " + network.name + " " + instanceFactory.address + ' "' + tldPrice + '" ' + instanceForb.address);
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