// npx hardhat run scripts/partners/l2dao/deployL2Dao.js --network optimisticKovan

const contractNameFactory = "Layer2DaoPunkDomains";
const l2DaoNftAddress = "<enter-address>";
const l2domainAddress = "<enter-address>";
const layer2domainAddress = "<enter-address>";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(l2DaoNftAddress, l2domainAddress, layer2domainAddress);
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contracts on Etherscan:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + l2DaoNftAddress + " " + l2domainAddress + " " + layer2domainAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });