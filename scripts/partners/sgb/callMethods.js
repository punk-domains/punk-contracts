// npx hardhat run scripts/partners/sgb/callMethods.js --network songbird

const tldAddress = "0xBDACF94dDCAB51c39c2dD50BffEe60Bb8021949a";

const minterAddress = "0xA33dCbE04278706248891931537Dd56B795c3663";

const metadataAddress = "0xF51F7a532a2AaDFE8E2320bf5BA8275503bB3789";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Calling methods with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const tldInterface = new ethers.utils.Interface([
    //"function togglePaused() external",
    "function minter() external view returns(address)",
    "function changeMinter(address _minter) external",
    "function transferOwnership(address newOwner) external"
  ]);

  const metadataInterface = new ethers.utils.Interface([
    "function changeBrand(address _tldAddress, string calldata _brand) external",
    "function changeDescription(address _tldAddress, string calldata _description) external"
  ]);

  const tldContract = new ethers.Contract(tldAddress, tldInterface, deployer);
  const metadataContract = new ethers.Contract(metadataAddress, metadataInterface, deployer);

  // CHANGE MINTER

  const minterBefore = await tldContract.minter();
  console.log("Minter before: " + minterBefore);

  //await tldContract.changeMinter(minterAddress);
  //await minterContract.togglePaused();
  //await minterContract.transferOwnership(newOwnerAddress);
  
  console.log("Method call completed");

  const minterAfter = await tldContract.minter();
  console.log("Minter after: " + minterAfter);

  // CHANGE METADATA IMAGE BRAND AND DESCRIPTION
  //await metadataContract.changeBrand(tldAddress, "Songbird Domains");

  /*
  await metadataContract.changeDescription(
    tldAddress, 
    "The first web3 domain provider on Songbird. Mint your very own .sgb domain on https://songbird.domains/"
  );
  */
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });