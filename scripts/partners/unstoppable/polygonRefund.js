// npx hardhat run scripts/partners/unstoppable/polygonRefund.js --network polygonMumbai

const contractNameFactory = "UnstoppablePolygonRefund";

async function main() {
  let tldAddress;

  if (network.name === "polygonMumbai") {
    tldAddress = "0xDEF098948F47F9Fbe80fF2D966c27965DFB47F26"; // .polygontest TLD address
  } else {
    tldAddress = "0xBca24d86e4Ad1e011278FaEFc4fF191a731411EC"; // .polygon TLD address
  }
  
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(tldAddress);
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contracts on Etherscan:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + tldAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });