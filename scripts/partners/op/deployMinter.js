// npx hardhat run scripts/partners/op/deployMinter.js --network optimisticEthereum
// TODO:
// 1) transfer TLD ownership from Distributor to EOA
// 2) Set buying enabled to false (pause minting)
// 3) Set domain price to 0
// 4) set minter contract as new TLD contract owner

const contractNameFactory = "OpMinter";

const distributorAddress = "0x7b3E2Ec40c241b424b08fD31937D22137793a00c";
const tldAddress = "0xC16aCAdf99E4540E6f4E6Da816fd6D2A2C6E1d4F";

const paymentTokenDecimals = 18;

const price1char = ethers.utils.parseUnits("4.20", paymentTokenDecimals);
const price2char = ethers.utils.parseUnits("0.69", paymentTokenDecimals);
const price3char = ethers.utils.parseUnits("0.10", paymentTokenDecimals);
const price4char = ethers.utils.parseUnits("0.02", paymentTokenDecimals);
const price5char = ethers.utils.parseUnits("0.01", paymentTokenDecimals);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(
    tldAddress, distributorAddress,
    price1char, price2char, price3char, price4char, price5char
  );
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + tldAddress + " " + distributorAddress + ' "' + price1char + '" "' + price2char + '" "' + price3char + '" "' + price4char + '" "' + price5char + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });