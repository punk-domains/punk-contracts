// npx hardhat run scripts/partners/flr/deployMinter.js --network flareCoston
// add minter address to:
// 1) TLD contract as minter

const contractNameFactory = "FlareMinter";

const brokerAddress = "";
const devAddress = "0x96A4715280c3Dac3F3093d51aA278aA5eb60ffDE"; // johnson
const tldAddress = "";

const referralFee = 1000;
const devFee = 1500;
const brokerFee = 5000;

const paymentTokenDecimals = 18;

let price1char = ethers.utils.parseUnits("299", paymentTokenDecimals);
let price2char = ethers.utils.parseUnits("199", paymentTokenDecimals);
let price3char = ethers.utils.parseUnits("149", paymentTokenDecimals);
let price4char = ethers.utils.parseUnits("99", paymentTokenDecimals);
let price5char = ethers.utils.parseUnits("49", paymentTokenDecimals);

if (network.config.chainId === 16) {
  // Coston testnet
  price1char = ethers.utils.parseUnits("16", paymentTokenDecimals);
  price2char = ethers.utils.parseUnits("8", paymentTokenDecimals);
  price3char = ethers.utils.parseUnits("4", paymentTokenDecimals);
  price4char = ethers.utils.parseUnits("2", paymentTokenDecimals);
  price5char = ethers.utils.parseUnits("1", paymentTokenDecimals);
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(
    brokerAddress, devAddress, tldAddress,
    referralFee, brokerFee, devFee,
    price1char, price2char, price3char, price4char, price5char
  );
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + brokerAddress + " " + devAddress + " " + tldAddress + ' "' + referralFee + '" "' + brokerFee + '" "' + devFee + '" "' + price1char + '" "' + price2char + '" "' + price3char + '" "' + price4char + '" "' + price5char + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });