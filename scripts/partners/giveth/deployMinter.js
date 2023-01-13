// npx hardhat run scripts/partners/giveth/deployMinter.js --network flareCoston
// add minter address to:
// 1) TLD contract as minter

const contractNameFactory = "GivethMinter";
const pgfAddress = "0x6e8873085530406995170Da467010565968C7C62"; // Giveth Matching Pool
const devAddress = "0x96A4715280c3Dac3F3093d51aA278aA5eb60ffDE"; // johnson
const tldAddress = "0x2ef8bbfa2a753bc2886fe24181fba454c3149846";

const paymentTokenDecimals = 18;

const referralFee = 0;
const pgfFee = 8000;

const price1char = ethers.utils.parseUnits("5", paymentTokenDecimals);
const price2char = ethers.utils.parseUnits("4", paymentTokenDecimals);
const price3char = ethers.utils.parseUnits("3", paymentTokenDecimals);
const price4char = ethers.utils.parseUnits("2", paymentTokenDecimals);
const price5char = ethers.utils.parseUnits("1", paymentTokenDecimals);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(
    pgfAddress, devAddress, tldAddress,
    referralFee, pgfFee,
    price1char, price2char, price3char, price4char, price5char
  );
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + pgfAddress + " " + devAddress + " " + tldAddress + ' "' + referralFee + '" "' + pgfFee + '" "' + price1char + '" "' + price2char + '" "' + price3char + '" "' + price4char + '" "' + price5char + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });