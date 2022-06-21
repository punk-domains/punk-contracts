// npx hardhat run scripts/resolver/other/addFactory.js --network polygon
// If you can't do it through a block explorer, you can add factory to Resolver through this script

const resolverAddress = "<enter-resolver-proxy-address>"; // proxy
const factoryAddress = "<enter-factory-address>";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Using account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const intfc = new ethers.utils.Interface([
    "function addFactoryAddress(address) external",
    "function getFactoriesArray() public view returns(address[] memory)",
  ]);

  const contract = new ethers.Contract(resolverAddress, intfc, deployer);

  // check factories array
  const factoriesArrayBefore = await contract.getFactoriesArray();
  console.log("Factories array before: " + factoriesArrayBefore);

  let exists = false;
  for (let fAddr of factoriesArrayBefore) {
    if (String(fAddr).toLowerCase() === factoryAddress.toLowerCase()) {
      console.log("This factory address has already been added.");
      exists = true;
      break;
    }
  }

  if (!exists) {
    // add factory address
    await contract.addFactoryAddress(factoryAddress);

    console.log("Added!");

    // check factories array again
    const factoriesArrayAfter = await contract.getFactoriesArray();
    console.log("Factories array after: " + factoriesArrayAfter);
    console.log("Note that the address may be missing in the above array due to a data fetching lag.")
  }
}

main()
.then(() => process.exit(0))
.catch(error => {
  console.error(error);
  process.exit(1);
});