// npx hardhat run scripts/other/callMethods.js --network sokol

const contractAddress = "0xd43E3C6d04f40C6FDCf63C62C9b24A858C275b26";
const nonEligibleTokenIds = [2, 4];
//const nonEligibleTokenIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 58, 65, 69, 78, 79, 82, 89, 100];

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