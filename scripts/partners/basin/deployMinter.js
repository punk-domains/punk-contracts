// npx hardhat run scripts/partners/basin/deployMinter.js --network polygon
// add minter address to:
// 1) TLD contract as minter

const contractNameFactory = "BasinMinter";
const contractPath = "contracts/partners/basin/BasinMinter.sol:BasinMinter";
const tldAddress = "0x4bF5A99eA2F8De061f7D77BA9edd749503D945Da";

const paymentTokenDecimals = 18;

const price1char = ethers.utils.parseUnits("999", paymentTokenDecimals);
const price2char = ethers.utils.parseUnits("299", paymentTokenDecimals);
const price3char = ethers.utils.parseUnits("99", paymentTokenDecimals);
const price4char = ethers.utils.parseUnits("25", paymentTokenDecimals);
const price5char = ethers.utils.parseUnits("10", paymentTokenDecimals);

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
  console.log("npx hardhat verify --contract " + contractPath + " --network " + network.name + " " + instance.address + " " + tldAddress + ' "' + price1char + '"' + ' "' + price2char + '"' + ' "' + price3char + '"' + ' "' + price4char + '"' + ' "' + price5char + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });