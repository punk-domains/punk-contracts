/*
This script is needed to verify contracts that are generated through contract factory.

How to use:
- First deploy the Factory contract
- Then in deployTld.js replace the owner and factory addresses with the ones you want
- Then deploy the PunkTLD contract: npx hardhat run scripts/temp/deployFlexiTld.js --network songbird
- Go to arguments.js file and enter correct addresses (and other data if changed in deployTld.js)
- Verify it (see command line for the Verify command). Something like: npx hardhat verify --network songbird --constructor-args scripts/temp/argumentsFlexiTld.js <contract-address>
- After successful verification, every TLD contract created through the factory will show contract code. 
- The PunkTLD contract that you deployed using this script can be ignored (factory does not know about it). It
was only needed for the verification purposes.
*/

const contractName1 = "FlexiPunkTLD";
const tldOwner = "0xb29050965A5AC70ab487aa47546cdCBc97dAE45D";
const factoryAddress = "<enter-factory-address>";
const metadataAddress = "<enter-metadata-address>";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contract1
  const contract1 = await ethers.getContractFactory(contractName1);
  
  const tldName = ".test";
  const tldSymbol = "TEST";
  
  const tldPrice = ethers.utils.parseUnits("0.1", "ether");
  const buyingEnabled = false;
  const royalty = 0;

  const instance1 = await contract1.deploy(
    tldName, tldSymbol, tldOwner, tldPrice, buyingEnabled, royalty, factoryAddress, metadataAddress
  );

  console.log("Contract address:", instance1.address);

  console.log("Wait a minute and then run this command:");
  console.log(
    "npx hardhat verify --network " + network.name + " --constructor-args scripts/temp/argumentsFlexiTld.js " + instance1.address
  );
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