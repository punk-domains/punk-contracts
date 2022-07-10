// npx hardhat run scripts/nft/angel/deployMinter.js --network polygonMumbai
// add minter address to:
// 1) TLD contract as minter
// 2) metadata contract as minter

const contractNameFactory = "PunkAngelMinter";
const tldAddress = "";
const metadataAddress = "";
const paymentTokenAddress = ""; // USDC

const paymentTokenDecimals = 6;
const maxTotalPayments = ethers.utils.parseUnits("400000", paymentTokenDecimals); // 400k
const price1char = ethers.utils.parseUnits("10000", paymentTokenDecimals); // 10k
const price2char = ethers.utils.parseUnits("3000", paymentTokenDecimals); // 3k
const price3char = ethers.utils.parseUnits("999", paymentTokenDecimals);
const price4char = ethers.utils.parseUnits("199", paymentTokenDecimals);
const price5char = ethers.utils.parseUnits("69", paymentTokenDecimals);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(
    paymentTokenAddress,
    tldAddress,
    metadataAddress,
    maxTotalPayments,
    price1char, price2char, price3char, price4char, price5char
  );
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + paymentTokenAddress + " " + tldAddress + " " + metadataAddress + ' "' + maxTotalPayments + '"' + ' "' + price1char + '"' + ' "' + price2char + '"' + ' "' + price3char + '"' + ' "' + price4char + '"' + ' "' + price5char + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });