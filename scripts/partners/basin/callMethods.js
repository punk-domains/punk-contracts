// npx hardhat run scripts/partners/basin/callMethods.js --network polygon

const contractAddress = "";

const minterAddress = "";

const newOwnerAddress = "";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Calling methods with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contractInterface = new ethers.utils.Interface([
    //"function togglePaused() external",
    "function minter() external view returns(address)",
    "function changeMinter(address _minter) external",
    "function transferOwnership(address newOwner) external"
  ]);

  const contract = new ethers.Contract(contractAddress, contractInterface, deployer);

  const minterBefore = await contract.minter();
  console.log("Minter before: " + minterBefore);

  await contract.changeMinter(minterAddress);
  //await minterContract.togglePaused();
  //await minterContract.transferOwnership(newOwnerAddress);
  
  console.log("Method call completed");

  const minterAfter = await contract.minter();
  console.log("Minter after: " + minterAfter);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });