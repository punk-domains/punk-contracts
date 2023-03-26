// npx hardhat run scripts/other/deployDeprecateTldTwo.js --network sokol

const contractNameFactory = "DeprecateTldTwo";
const oldTldAddress = "0x0744d775804BB81efD3fF630402988b2F7eB284B";
const newTldAddress = "0x110Cc3f64CdF8ffAdC785dFA53906bCfF76b3846";
const newTldName = ".testdao";
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