// npx hardhat run scripts/partners/templates/nft-required/deployMinter.js --network optimisticEthereum
// add minter address to:
// 1) TLD contract as minter

const contractNameFactory = "MinterNftRequired";

const brokerAddress = "";
const nftAddress = "";
const tldAddress = "";

const referralFee = 1000;
const royaltyFee = 1340;
const brokerFee = 660;

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
    brokerAddress, nftAddress, tldAddress,
    referralFee, royaltyFee, brokerFee, 
    price1char, price2char, price3char, price4char, price5char
  );
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + brokerAddress + " " + nftAddress + " " + tldAddress + ' "' + referralFee + '" "' + royaltyFee + '" "' + brokerFee + '" "' + price1char + '" "' + price2char + '" "' + price3char + '" "' + price4char + '" "' + price5char + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });