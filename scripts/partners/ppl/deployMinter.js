// npx hardhat run scripts/partners/ppl/deployMinter.js --network polygonMumbai
// add minter address to:
// 1) TLD contract as minter

const contractNameFactory = "PplMinter";
const tldAddress = "0x17C212067f11BDFCb975A77b3fff56Dff8d2cd57";
const metadataAddress = "0x531B6122f896f6B62D9FCb17630a51DC4C96787F";

const dishesNft1 = "0x78d086122af1422dcec88c612587436D07457C35";
const dishesNft2 = "0xBba6B3327eDC39e6ac4047075C49c8708e552357";
const dishesNft3 = "0x1F7b490104cF47B929bCa0fc7Db1B214862cA2e9";

const paymentTokenDecimals = 18;

const price1char = ethers.utils.parseUnits("1", paymentTokenDecimals); // 10k
const price2char = ethers.utils.parseUnits("0.5", paymentTokenDecimals); // 3k
const price3char = ethers.utils.parseUnits("0.1", paymentTokenDecimals);
const price4char = ethers.utils.parseUnits("0.05", paymentTokenDecimals);
const price5char = ethers.utils.parseUnits("0.01", paymentTokenDecimals);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(
    tldAddress,
    dishesNft1, dishesNft2, dishesNft3,
    price1char, price2char, price3char, price4char, price5char
  );
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + tldAddress + " " + dishesNft1 + " " + dishesNft2 + " " + dishesNft3 + ' "' + price1char + '"' + ' "' + price2char + '"' + ' "' + price3char + '"' + ' "' + price4char + '"' + ' "' + price5char + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });