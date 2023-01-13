// npx hardhat run scripts/partners/giveth/callMethods.js --network flareCoston

const tldAddress = "0x2ef8bbfa2a753bc2886fe24181fba454c3149846";
const minterAddress = "";
const metadataAddress = "";
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
  //await metadataContract.changeBrand(tldAddress, "Songbird Domains");

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