// npx hardhat run scripts/factories/flexi/callMethods.js --network opera

const forbiddenAddress = "0xC6c17896fa051083324f2aD0Ed4555dC46D96E7f";
const factoryAddress = "0xeA2f99fE93E5D07F61334C5Eb9c54c5D5C957a6a";
const tldAddress = "";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Calling methods with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const forbiddenInterface = new ethers.utils.Interface([
    "function factoryAddresses(address) external view returns(bool)",
    "function addFactoryAddress(address _fAddr) external"
  ]);

  const factoryInterface = new ethers.utils.Interface([
    "function tldNamesAddresses(string memory) external view returns(address)",
    "function ownerCreateTld(string memory _name, string memory _symbol, address _tldOwner, uint256 _domainPrice, bool _buyingEnabled) external returns(address)"
  ]);

  const tldInterface = new ethers.utils.Interface([
    "function tokenURI(uint256) external view returns(string memory)",
    "function mint(string memory,address,address) external payable returns(uint256)"
  ]);

  const forbiddenContract = new ethers.Contract(forbiddenAddress, forbiddenInterface, deployer);
  const factoryContract = new ethers.Contract(factoryAddress, factoryInterface, deployer);
  //const tldContract = new ethers.Contract(tldAddress, tldInterface, deployer);

  //const minterBefore = await contract.minter();
  //console.log("Minter before: " + minterBefore);

  // ADD FACTORY ADDRESS TO THE FORBIDDEN CONTRACT
  //await forbiddenContract.addFactoryAddress(factoryAddress);

  //const factoryAdded = await forbiddenContract.factoryAddresses(factoryAddress);
  //console.log("factoryAdded:");
  //console.log(factoryAdded);

  //await minterContract.togglePaused();
  //await minterContract.transferOwnership(newOwnerAddress);

  // MINT A NEW TLD
  const tldName = ".fantom";
  const tldSymbol = ".FANTOM";
  const domainPrice = ethers.utils.parseUnits("0", "ether");

  /*
  await factoryContract.ownerCreateTld(
    tldName, // TLD name
    tldSymbol, // symbol
    deployer.address, // TLD owner
    domainPrice, // domain price
    false // buying enabled
  );
  */

  const tldAddr = await factoryContract.tldNamesAddresses(tldName);
  
  console.log("TLD address: ");
  console.log(tldAddr);

  /*
  await tldContract.mint(
    "tempe", // domain name (without TLD)
    deployer.address, // domain holder
    ethers.constants.AddressZero, // referrer
    {
      value: domainPrice // pay  for the domain
    }
  );
  */

  //const metadata = await tldContract.tokenURI(1);
  //console.log("metadata:");
  //console.log(metadata);

  console.log("Method calls completed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });