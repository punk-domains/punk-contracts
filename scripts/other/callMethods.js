// npx hardhat run scripts/other/callMethods.js --network polygon

const contractAddress = "0x6724c95Af33e396d85D2Fc93609C60D23490878B";
const eligibleTokenIds = [16,17,18,19,20,21,22,23,24,26,27,28,32,33,34,35,37,38,39,40,41,42,43,44,45,46,47,48,49];
//const nonEligibleTokenIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 58, 65, 69, 78, 79, 82, 89, 100];

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Calling methods with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contractInterface = new ethers.utils.Interface([
    "function isNotRefundEligible(uint256) view external returns(bool)",
    "function togglePaused() external",
    "function addNonEligibleDomains(uint256[] memory) external",
    "function removeNonEligibleDomains(uint256[] memory) external",
    "function transferOwnership(address newOwner) external"
  ]);

  const contract = new ethers.Contract(contractAddress, contractInterface, deployer);

  //const minterBefore = await contract.minter();
  //console.log("Minter before: " + minterBefore);

  //await contract.addNonEligibleDomains(nonEligibleTokenIds);
  const tx = await contract.removeNonEligibleDomains(eligibleTokenIds);
  //await contract.togglePaused();
  //await contract.transferOwnership(newOwnerAddress);

  console.log(tx);

  const tokenId = 16;
  const isNotEligible = await contract.isNotRefundEligible(tokenId);
  console.log("Token " + String(tokenId) + " not eligible? " + isNotEligible);
  
  console.log("Method call completed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });