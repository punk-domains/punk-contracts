// npx hardhat run scripts/partners/4ever/deployMinter.js --network auroraTestnet
// add minter address to:
// 1) TLD contract as minter

const contractNameFactory = "ForeverMinter";
const tldAddress = "0xc2C543D39426bfd1dB66bBde2Dd9E4a5c7212876";

const paymentTokenDecimals = 18;

const price1char = ethers.utils.parseUnits("0.01", paymentTokenDecimals); // 10k
const price2char = ethers.utils.parseUnits("0.005", paymentTokenDecimals); // 3k
const price3char = ethers.utils.parseUnits("0.001", paymentTokenDecimals);
const price4char = ethers.utils.parseUnits("0.0005", paymentTokenDecimals);
const price5char = ethers.utils.parseUnits("0.0001", paymentTokenDecimals);

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