// Create a new TLD through Factory
// npx hardhat run scripts/temp/ownerCreateTld.js --network polygonMumbai

const factoryAddress = "0xD6e994d98bD269a61aF8FB3d0cdCE2304440A057"; // <factory-address>
//const maxFee = 0; // 2500000000 - set the correct fee for eip-1559 style transactions (otherwise make txs legacy type)

const newTldName = ".wavytest";
const newTldSymbol = ".WAVYTEST";
const newTldOwner = "0x854AB2279491b8c086458D035f40f05528b14619";
const newTldDomainPrice = ethers.utils.parseUnits("0", "ether");
const newTldBuyingEnabled = false;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Using the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contractInterface = new ethers.utils.Interface([
    "function tldNamesAddresses(string memory) external view returns(address)",
    "function ownerCreateTld(string memory _name,string memory _symbol,address _tldOwner,uint256 _domainPrice,bool _buyingEnabled) external returns(address)"
  ]);

  const contract = new ethers.Contract(factoryAddress, contractInterface, deployer);

  //const newTldAddress = await contract.ownerCreateTld(newTldName, newTldSymbol, newTldOwner, newTldDomainPrice, newTldBuyingEnabled);
  //console.log("newTldAddress: " + newTldAddress);

  // double-check address
  const newTldAddress2 = await contract.tldNamesAddresses(newTldName);
  console.log("newTldAddress2: " + newTldAddress2);

}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });