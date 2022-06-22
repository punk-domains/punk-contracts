// npx hardhat run scripts/resolver/other/changeProxyAdminOwner.js --network polygon
// If you can't do it through a block explorer, you can change ProxyAdmin owner here

const proxyAdminAddress = "<enter-proxy-admin-address>"; // ProxyADMIN
const newOwnerAddress = "<enter-new-owner>"; // probably your Gnosis Safe address

async function main() {
  const [signer] = await ethers.getSigners();

  console.log("Using account:", signer.address);
  console.log("Account balance:", (await signer.getBalance()).toString());

  const intfc = new ethers.utils.Interface([
    "function transferOwnership(address) external",
    "function owner() public view returns (address)"
  ]);

  const contract = new ethers.Contract(proxyAdminAddress, intfc, signer);

  const ownerBefore = await contract.owner();
  console.log("ProxyAdmin owner before: " + ownerBefore);

  if (ownerBefore === signer.address) {
    console.log("Signer is ProxyAdmin owner. We can proceed with transfering ownership.")

    // change owner
    await contract.transferOwnership(newOwnerAddress);

    console.log("Ownership changed!");

    const ownerAfter = await contract.owner();
    console.log("ProxyAdmin owner after: " + ownerAfter);
    console.log("Note that it may still show the old owner due to a data fetching lag.")
  }
}

main()
.then(() => process.exit(0))
.catch(error => {
  console.error(error);
  process.exit(1);
});