// npx hardhat run scripts/partners/pool/deployMinter.js --network optimisticEthereum
// add minter address to:
// 1) TLD contract as minter

const contractNameFactory = "PoolMinter";

const treasuryAddress = "0x6CE6986FF28BFed84a911682cDB127beCb9fc88a";
const brokerAddress = "0xaF5a0068f5465260A1a88A6264D0dcE4469609CF";
const tldAddress = "0xf2C9E463592BD440f0D422E944E5F95c79404586";

const paymentTokenDecimals = 18;

const price1char = ethers.utils.parseUnits("0.02", paymentTokenDecimals);
const price2char = ethers.utils.parseUnits("0.02", paymentTokenDecimals);
const price3char = ethers.utils.parseUnits("0.02", paymentTokenDecimals);
const price4char = ethers.utils.parseUnits("0.02", paymentTokenDecimals);
const price5char = ethers.utils.parseUnits("0.02", paymentTokenDecimals);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(
    treasuryAddress, brokerAddress, tldAddress,
    price1char, price2char, price3char, price4char, price5char
  );
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + treasuryAddress + " " + brokerAddress + " " + tldAddress + ' "' + price1char + '" "' + price2char + '" "' + price3char + '" "' + price4char + '" "' + price5char + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });