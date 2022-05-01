// npx hardhat run scripts/partners/smol/deploySmol.js --network arbitrumOne

const contractNameFactory = "SmolPunkDomains";

const nftAddress = "0x6325439389E0797Ab35752B4F43a14C004f22A9c"; // enter address of the first supported NFT (Smol Brain)
const tldAddress = "0xE0d972817e94c5FF9BDc49a63d8927A0bA833E4f"; // .smol TLD address
const paymentTokenAddress = "0x539bde0d7dbd336b79148aa742883198bbf60342"; // $MAGIC
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