// npx hardhat run scripts/partners/templates/nft-required/callMethods.js --network polygonMumbai

const tldAddress = "";
const minterAddress = "";
const metadataAddress = "";
const royaltyFeeReceiver = "";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Calling methods with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const tldInterface = new ethers.utils.Interface([
    "function minter() external view returns(address)",
    "function changeMinter(address _minter) external",
    "function transferOwnership(address newOwner) external"
  ]);

  const metadataInterface = new ethers.utils.Interface([
    "function changeBrand(address _tldAddress, string calldata _brand) external",
    "function changeDescription(address _tldAddress, string calldata _description) external"
  ]);

  const minterInterface = new ethers.utils.Interface([
    "function paused() external view returns(bool)",
    "function royaltyFeeReceiver() external view returns(address)",
    "function ownerFreeMint(string memory, address) external returns(uint256 tokenId)",
    "function changeRoyaltyFeeReceiver(address _newReceiver) external",
    "function royaltyFee() view external returns(uint256)",
    "function changeRoyaltyFee(uint256 _royalty) external",
    "function togglePaused() external",
    "function changePrice(uint256 _price, uint256 _chars) external"
  ]);

  const tldContract = new ethers.Contract(tldAddress, tldInterface, deployer);
  const metadataContract = new ethers.Contract(metadataAddress, metadataInterface, deployer);
  const minterContract = new ethers.Contract(minterAddress, minterInterface, deployer);

  // CHANGE MINTER

  //const minterBefore = await tldContract.minter();
  //console.log("Minter before: " + minterBefore);

  //await tldContract.changeMinter(minterAddress);
  
  //await minterContract.transferOwnership(newOwnerAddress);

  //const minterAfter = await tldContract.minter();
  //console.log("Minter after: " + minterAfter);

  // TOGGLE PAUSED (MINTER)

  //const minterPausedBefore = await minterContract.paused();
  //console.log("Minter paused before: " + minterPausedBefore);

  //await minterContract.togglePaused();

  //const minterPausedAfter = await minterContract.paused();
  //console.log("Minter paused after: " + minterPausedAfter);

  // CHANGE METADATA IMAGE BRAND AND DESCRIPTION
  //await metadataContract.changeBrand(tldAddress, "FantomNames.org");

  /*
  await metadataContract.changeDescription(
    tldAddress, 
    "The first web3 domain provider on Songbird. Mint your very own .sgb domain on https://songbird.domains/"
  );
  */

  // CHANGE PRICE
  
  //const royaltyFeeBefore = await minterContract.royaltyFee();
  //console.log("RoyaltyFee before: " + royaltyFeeBefore);

  //const newPrice = ethers.utils.parseUnits("0.1", 18);
  //const chars = 1;
  //await minterContract.changePrice(newPrice, chars);

  //const royaltyFeeAfter = await minterContract.royaltyFee();
  //console.log("RoyaltyFee after: " + royaltyFeeAfter);
  

  // CHANGE ROYALTY FEE RECEIVER
  /*
  const royaltyFeeReceiverBefore = await minterContract.royaltyFeeReceiver();
  console.log("RoyaltyFeeReceiver before: " + royaltyFeeReceiverBefore);

  await minterContract.changeRoyaltyFeeReceiver(royaltyFeeReceiver);

  const royaltyFeeReceiverAfter = await minterContract.royaltyFeeReceiver();
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