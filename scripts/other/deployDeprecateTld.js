// npx hardhat run scripts/other/deployDeprecateTld.js --network sokol

const contractNameFactory = "DeprecateTld";
const oldTldAddress = "";
const newTldAddress = "";
const newTldName = ".";
const refundAmount = ethers.utils.parseEther("0.01");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract
  const contract = await ethers.getContractFactory(contractNameFactory);
  const instance = await contract.deploy(
    refundAmount,
    oldTldAddress,
    newTldName,
    newTldAddress
  );
  
  console.log("Contract address:", instance.address);

  console.log("Wait a minute and then run this command to verify contract on the block explorer:");
  console.log("npx hardhat verify --network " + network.name + " " + instance.address + ' "' + refundAmount + '" ' + oldTldAddress + ' "' + newTldName + '" ' + newTldAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });