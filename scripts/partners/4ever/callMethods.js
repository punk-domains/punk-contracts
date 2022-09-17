// npx hardhat run scripts/partners/4ever/callMethods.js --network auroraTestnet

const contractAddress = "0xc2C543D39426bfd1dB66bBde2Dd9E4a5c7212876";

const minterAddress = "0x1B293F3fEdBB97cE6e17b3AB08723a942A5B774c";

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