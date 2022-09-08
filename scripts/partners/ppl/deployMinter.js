// npx hardhat run scripts/partners/ppl/deployMinter.js --network arbitrumOne
// add minter address to:
// 1) TLD contract as minter

const contractNameFactory = "PplMinter2";
const tldAddress = "0xbC9d19e5f97a572f428F7292DBf3dc182Cc05C82";

const paymentTokenDecimals = 18;

const price1char = ethers.utils.parseUnits("1", paymentTokenDecimals); // 10k
const price2char = ethers.utils.parseUnits("0.5", paymentTokenDecimals); // 3k
const price3char = ethers.utils.parseUnits("0.1", paymentTokenDecimals);
const price4char = ethers.utils.parseUnits("0.05", paymentTokenDecimals);
const price5char = ethers.utils.parseUnits("0.01", paymentTokenDecimals);

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