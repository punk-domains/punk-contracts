// npx hardhat run scripts/partners/dope/deployMinter.js --network polygonMumbai // optimisticEthereum
// minter contract will be automatically added to TLD contract (if not, do it manually)

const contractNameFactory = "DopeMinter";

const daoAddress = "0xb29050965A5AC70ab487aa47546cdCBc97dAE45D"; // "0x90103beDCfbE1eeE44ded89cEd88bA8503580b3D"; // Dope DAO Safe on Optimism
const nftAddress = "0x2582EC420195Fefb091B098da6FAdEE49f490740"; // "0xDbfEaAe58B6dA8901a8a40ba0712bEB2EE18368E"; // The Hustlers NFT on Optimism
const tldAddress = "0x68a172F375Bf4525eeAC5257E7ED17A67b6A76DA";

const referralFee = 1000;
const royaltyFee = 2000;

const paymentTokenDecimals = 18;

const price1char = ethers.utils.parseUnits("0.1", paymentTokenDecimals);
const price2char = ethers.utils.parseUnits("0.06", paymentTokenDecimals);
const price3char = ethers.utils.parseUnits("0.04", paymentTokenDecimals);
const price4char = ethers.utils.parseUnits("0.02", paymentTokenDecimals);
const price5char = ethers.utils.parseUnits("0.01", paymentTokenDecimals);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(
    daoAddress, nftAddress, tldAddress,
    referralFee, royaltyFee, 
    price1char, price2char, price3char, price4char, price5char
  );
  await instance.deployed();

  console.log("Minter contract deployed to:", instance.address);
  
  console.log("Adding minter contract to TLD contract");

  const tldContract = await ethers.getContractFactory("FlexiPunkTLD");
  const tldInstance = await tldContract.attach(tldAddress);

  await tldInstance.changeMinter(instance.address);

  console.log("Done!");

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + daoAddress + " " + nftAddress + " " + tldAddress + ' "' + referralFee + '" "' + royaltyFee + '" "' + price1char + '" "' + price2char + '" "' + price3char + '" "' + price4char + '" "' + price5char + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });