// npx hardhat run scripts/temp/deployMockNft.js --network localhost

const contractNameFactory = "MockErc721Token";
const nftName = "Mock NFT";
const symbol = "MOCKNFT";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(nftName, symbol);
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contracts on Etherscan:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + ' "' + nftName + '" "' + symbol + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });