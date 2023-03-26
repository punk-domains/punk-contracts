// npx hardhat run scripts/other/deployDeprecateTldOne.js --network polygon

const contractNameFactory = "DeprecateTldOne";
const oldTldAddress = "0xa450bc33d0940d25fB0961c592fb440Fa63ABE03";
const newTldAddress = "0x70Ac07C50131b7bb2c8Bd9466D8d2add30B7759f";
const newTldName = ".poly";
const refundAmount = ethers.utils.parseEther("14");

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