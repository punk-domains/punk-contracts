// npx hardhat run scripts/partners/shrohms/deployMinter.js --network arbitrumOne
// add minter address to:
// 1) TLD contract as minter

const contractNameFactory = "ShrohmsMinter";
const nftAddress = "0x5A794d808Ad9F4763E2D07811CcEf175bD4Db510";
const smolAddress = "0xa929891A6E69e301e113536a552bE8af21601252";
const tldAddress = "0x277847a61116A3197d0aDd77Bf27A6569C167B61";

const paymentTokenDecimals = 18;

const price1char = ethers.utils.parseUnits("0.799", paymentTokenDecimals);
const price2char = ethers.utils.parseUnits("0.399", paymentTokenDecimals);
const price3char = ethers.utils.parseUnits("0.079", paymentTokenDecimals);
const price4char = ethers.utils.parseUnits("0.019", paymentTokenDecimals);
const price5char = ethers.utils.parseUnits("0.0079", paymentTokenDecimals);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(
    nftAddress, smolAddress, tldAddress,
    price1char, price2char, price3char, price4char, price5char
  );
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + nftAddress + " " + smolAddress + " " + tldAddress + ' "' + price1char + '"' + ' "' + price2char + '"' + ' "' + price3char + '"' + ' "' + price4char + '"' + ' "' + price5char + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });