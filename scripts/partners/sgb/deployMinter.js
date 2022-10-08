// npx hardhat run scripts/partners/sgb/deployMinter.js --network songbird
// add minter address to:
// 1) TLD contract as minter

const contractNameFactory = "SgbMinter";
const tldAddress = "0xBDACF94dDCAB51c39c2dD50BffEe60Bb8021949a";

const paymentTokenDecimals = 18;

const price1char = ethers.utils.parseUnits("50000", paymentTokenDecimals);
const price2char = ethers.utils.parseUnits("25000", paymentTokenDecimals);
const price3char = ethers.utils.parseUnits("7749", paymentTokenDecimals);
const price4char = ethers.utils.parseUnits("1299", paymentTokenDecimals);
const price5char = ethers.utils.parseUnits("499", paymentTokenDecimals);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(
    tldAddress,
    price1char, price2char, price3char, price4char, price5char
  );
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + tldAddress + ' "' + price1char + '"' + ' "' + price2char + '"' + ' "' + price3char + '"' + ' "' + price4char + '"' + ' "' + price5char + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });