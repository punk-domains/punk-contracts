const contractName1 = "Web3PandaTLDFactory";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract1
  const contract1 = await ethers.getContractFactory(contractName1);

  const tldPrice = ethers.utils.parseUnits("0.1", "ether");
  const instance1 = await contract1.deploy(tldPrice);

  console.log("Contract address:", instance1.address);

  console.log("Wait a minute and then run this command:");
  console.log("npx hardhat verify --network " + network.name + " " + instance1.address + '"' + tldPrice + '"');
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