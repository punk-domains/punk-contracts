// npx hardhat run scripts/partners/smol/deploySmol.js --network arbitrumTestnet  // arbitrumOne

const contractNameFactory = "SmolPunkDomains";

const nftAddress = "<enter-address>"; // enter address of the first supported NFT (Smol Brains)
const tldAddress = "<enter-address>"; // .smol TLD address
const paymentTokenAddress = "<enter-address>"; // $MAGIC
const price = ethers.utils.parseEther("19.99"); // Price in MAGIC tokens

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(nftAddress, tldAddress, paymentTokenAddress, price);
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contracts on Etherscan:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + nftAddress + " " + tldAddress + " " + paymentTokenAddress + ' "' + price + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });