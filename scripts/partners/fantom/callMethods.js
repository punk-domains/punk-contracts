// npx hardhat run scripts/partners/fantom/callMethods.js --network opera

const tldAddress = "0xBDACF94dDCAB51c39c2dD50BffEe60Bb8021949a";
const minterAddress = "0x1D882E64bb7f4D49e67018d81254236A2A6465a3";
const metadataAddress = "0xF51F7a532a2AaDFE8E2320bf5BA8275503bB3789";
const royaltyFeeReceiver = "";

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

  const minterInterface = new ethers.utils.Interface([
    "function royaltyFeeReceiver() external view returns(address)",
    "function ownerFreeMint(string memory, address) external returns(uint256 tokenId)",
    "function changeRoyaltyFeeReceiver(address _newReceiver) external"
  ]);

  const tldContract = new ethers.Contract(tldAddress, tldInterface, deployer);
  const metadataContract = new ethers.Contract(metadataAddress, metadataInterface, deployer);
  const minterContract = new ethers.Contract(minterAddress, minterInterface, deployer);

  // CHANGE MINTER

  const minterBefore = await tldContract.minter();
  console.log("Minter before: " + minterBefore);

  //await tldContract.changeMinter(minterAddress);
  //await minterContract.togglePaused();
  //await minterContract.transferOwnership(newOwnerAddress);

  const minterAfter = await tldContract.minter();
  console.log("Minter after: " + minterAfter);

  // CHANGE METADATA IMAGE BRAND AND DESCRIPTION
  //await metadataContract.changeBrand(tldAddress, "FantomNames.org");

  /*
  await metadataContract.changeDescription(
    tldAddress, 
    "The first web3 domain provider on Songbird. Mint your very own .sgb domain on https://songbird.domains/"
  );
  */

  // CHANGE ROYATLY FEE RECEIVER
  /*
  const royaltyFeeReceiverBefore = await minterContract.royaltyFeeReceiver();
  console.log("RoyaltyFeeReceiver before: " + royaltyFeeReceiverBefore);

  await minterContract.changeRoyaltyFeeReceiver(royaltyFeeReceiver);

  const royaltyFeeReceiverAfter = await minterContract.royaltyFeeReceiver();
  console.log("RoyaltyFeeReceiver after: " + royaltyFeeReceiverAfter);
  */

  // FREE DOMAIN MINT
  const freeDomainName = ""; // without domain extension
  const freeDomainReceiver = ""; // 0x address
  //await minterContract.ownerFreeMint(freeDomainName, freeDomainReceiver);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });