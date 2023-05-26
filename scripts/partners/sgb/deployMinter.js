// npx hardhat run scripts/partners/sgb/deployMinter.js --network songbird
// automatically adds minter address to TLD contract (but check manually)

const contractNameFactory = "SgbMinter";

const brokerAddress = "0xc4Dbc181bc27b01B6269FB7Fb3c1250C9B922633";
const stakingAddress = "0xCA9749778327CD67700d3a777731a712330beB9A";
const tldAddress = "0xBDACF94dDCAB51c39c2dD50BffEe60Bb8021949a";

const paymentTokenDecimals = 18;

const price1char = ethers.utils.parseUnits("50000", paymentTokenDecimals);
const price2char = ethers.utils.parseUnits("25000", paymentTokenDecimals);
const price3char = ethers.utils.parseUnits("7749", paymentTokenDecimals);
const price4char = ethers.utils.parseUnits("699", paymentTokenDecimals);
const price5char = ethers.utils.parseUnits("299", paymentTokenDecimals);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(
    brokerAddress, stakingAddress, tldAddress,
    price1char, price2char, price3char, price4char, price5char
  );

  await instance.deployed();
  
  console.log("Minter address:", instance.address);

  console.log("Adding minter address to TLD contract");

  const tldContract = await ethers.getContractFactory("FlexiPunkTLD");
  const tldInstance = await tldContract.attach(tldAddress);

  await tldInstance.changeMinter(instance.address);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + brokerAddress + " " + stakingAddress + " " + tldAddress + ' "' + price1char + '" "' + price2char + '" "' + price3char + '" "' + price4char + '" "' + price5char + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });