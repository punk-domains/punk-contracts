// npx hardhat run scripts/partners/klima/deployKlima.js --network polygon

const contractNameFactory = "KlimaPunkDomains";

const knsAddress = "0x618E21237600488c7956549c89Df58aF6bEB6F8e"; // contract that retires BCT and distributes funds
const domainAddress = "0xe8b97542A433e7eCc7bB791872af04DF02A1a6E4"; // .klima address
const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const price = ethers.utils.parseUnits("100", "mwei"); // Price USDC (mwei because USDC has 6 decimals)

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(knsAddress, domainAddress, usdcAddress, price);
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contracts on Etherscan:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + " " + knsAddress + " " + domainAddress + " " + usdcAddress + ' "' + price + '"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });