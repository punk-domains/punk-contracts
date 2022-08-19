// npx hardhat run scripts/partners/ppl/callMethods.js --network arbitrumOne

const minterAddress = "0x64427BE4497E473ce0f529Ec07C91cc5CDB1ffc4";

const newOwnerAddress = "";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Calling methods with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const minterInterface = new ethers.utils.Interface([
    "function togglePaused() external",
    "function transferOwnership(address newOwner) external"
  ]);

  const minterContract = new ethers.Contract(minterAddress, minterInterface, deployer);

  //await minterContract.togglePaused();
  //await minterContract.transferOwnership(newOwnerAddress);
  
  console.log("Method call completed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });