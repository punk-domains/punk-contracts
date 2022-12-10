// npx hardhat run scripts/partners/fantom/callMethods.js --network opera

const tldAddress = "0xBDACF94dDCAB51c39c2dD50BffEe60Bb8021949a";
const minterAddress = "0x7aa8597134eAb3259F4D7d08a09ff69EDf73DdFf";
const metadataAddress = "0xf1dB5D19fF3f8b7034F58E11060FBED6F61254f8";
const pgfAddress = "0x690b1E05A43f32fcfcd966A2C0b5Cd713B728dbE";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Calling methods with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const tldInterface = new ethers.utils.Interface([
    //"function togglePaused() external",
    "function metadataAddress() external view returns(address)",
    "function minter() external view returns(address)",
    "function changeMinter(address _minter) external",
    "function changeMetadataAddress(address) external",
    "function transferOwnership(address newOwner) external"
  ]);

  const metadataInterface = new ethers.utils.Interface([
    "function changeBrand(address _tldAddress, string calldata _brand) external",
    "function changeDescription(address _tldAddress, string calldata _description) external"
  ]);

  const minterInterface = new ethers.utils.Interface([
    "function royaltyFeeReceiver() external view returns(address)",
    "function ownerFreeMint(string memory, address) external returns(uint256 tokenId)",
    "function changeRoyaltyFeeReceiver(address _newReceiver) external",
    "function royaltyFee() view external returns(uint256)",
    "function changeRoyaltyFee(uint256 _royalty) external"
  ]);

  const tldContract = new ethers.Contract(tldAddress, tldInterface, deployer);
  const metadataContract = new ethers.Contract(metadataAddress, metadataInterface, deployer);
  const minterContract = new ethers.Contract(minterAddress, minterInterface, deployer);

  // CHANGE MINTER ADDRESS

  //const minterBefore = await tldContract.minter();
  //console.log("Minter before: " + minterBefore);

  //await tldContract.changeMinter(minterAddress);
  //await minterContract.togglePaused();
  //await minterContract.transferOwnership(newOwnerAddress);

  //const minterAfter = await tldContract.minter();
  //console.log("Minter after: " + minterAfter);

  // CHANGE METADATA ADDRESS

  const metadataBefore = await tldContract.metadataAddress();
  console.log("Metadata before: " + metadataBefore);

  //await tldContract.changeMetadataAddress(metadataAddress);

  const metadataAfter = await tldContract.metadataAddress();
  console.log("Metadata after: " + metadataAfter);

  // CHANGE METADATA IMAGE BRAND AND DESCRIPTION
  //await metadataContract.changeBrand(tldAddress, "FantomNames.org");

  /*
  await metadataContract.changeDescription(
    tldAddress, 
    "The first web3 domain provider on Songbird. Mint your very own .sgb domain on https://songbird.domains/"
  );
  */

  // CHANGE ROYALTY FEE RECEIVER
  /*
  const royaltyFeeReceiverBefore = await tldContract.royaltyFeeReceiver();
  console.log("RoyaltyFeeReceiver before: " + royaltyFeeReceiverBefore);

  await tldContract.changeRoyaltyFeeReceiver(royaltyFeeReceiver);

  const royaltyFeeReceiverAfter = await tldContract.royaltyFeeReceiver();
  console.log("RoyaltyFeeReceiver after: " + royaltyFeeReceiverAfter);
  */

  // CHANGE ROYALTY FEE
  /*
  const royaltyFeeBefore = await minterContract.royaltyFee();
  console.log("RoyaltyFee before: " + royaltyFeeBefore);

  const newRoyaltyFeeBps = 5000; // in bps
  await minterContract.changeRoyaltyFee(newRoyaltyFeeBps);

  const royaltyFeeAfter = await minterContract.royaltyFee();
  console.log("RoyaltyFee after: " + royaltyFeeAfter);
  */

  // FREE DOMAIN MINT
  //const freeDomainName = ""; // without domain extension
  //const freeDomainReceiver = ""; // 0x address
  //await minterContract.ownerFreeMint(freeDomainName, freeDomainReceiver);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });