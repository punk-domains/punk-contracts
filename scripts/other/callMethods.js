// npx hardhat run scripts/other/callMethods.js --network sokol

const contractAddress = "";
const nonEligibleTokenIds = [2, 4];

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Calling methods with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contractInterface = new ethers.utils.Interface([
    "function togglePaused() external",
    "function addNonEligibleDomains(uint256[] memory) external",
    "function transferOwnership(address newOwner) external"
  ]);

  const contract = new ethers.Contract(contractAddress, contractInterface, deployer);

  //const minterBefore = await contract.minter();
  //console.log("Minter before: " + minterBefore);

  await contract.addNonEligibleDomains(nonEligibleTokenIds);
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