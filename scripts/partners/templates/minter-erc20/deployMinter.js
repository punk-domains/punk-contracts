// npx hardhat run scripts/partners/templates/minter-erc20/deployMinter.js --network polygonMumbai
// add minter address to:
// 1) TLD contract as minter

const contractNameFactory = "MinterErc20";

const teamAddress1 = "";
const teamAddress2 = "";
const tldAddress = "";
const tokenAddress = "";

const paymentTokenDecimals = 18;

const price = ethers.utils.parseUnits("0.0002", paymentTokenDecimals);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(
    teamAddress1, teamAddress2, tldAddress, tokenAddress, price
  );
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + teamAddress1 + " " + teamAddress2 + " " + tldAddress + " " + tokenAddress + ' "' + price + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });