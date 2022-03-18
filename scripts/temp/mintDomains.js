// V2 migration: a script which mints domains for existing holders

const oldTldAddress = "<old-tld-address>"; // <old-tld-address>
const newTldAddress = "<new-tld-address>"; // <new-tld-address>

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Minting domains with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const tldInterface = new ethers.utils.Interface([
    "function totalSupply() public view returns (uint256)",
    "function domainIdsNames(uint256) public view returns (string)",
    "function getDomainHolder(string memory _domainName) public view returns(address)",
    "function ownerMintDomain(string memory _domainName, address _domainHolder) public onlyOwner returns(uint256)"
  ]);

  const tldContractOld = new ethers.Contract(oldTldAddress, tldInterface, deployer);
  const tldContractNew = new ethers.Contract(newTldAddress, tldInterface, deployer);

  const totalSupplyOld = await tldContractOld.totalSupply();
  console.log("totalSupplyOld: " + totalSupplyOld.toNumber());

  const totalSupplyNewBefore = await tldContractNew.totalSupply();
  console.log("totalSupplyNewBefore: " + totalSupplyNewBefore.toNumber());

  for (let i = 0; i < totalSupplyOld; i++) {
    let domainName = await tldContractOld.domainIdsNames(i);
    let domainHolder = await tldContractOld.getDomainHolder(domainName);
    console.log(domainName + " --> " + domainHolder + " (OLD)");

    // check if domain name already exists on new TLD...
    let prevOwner = await tldContractNew.getDomainHolder(domainName);
    console.log("Has the domain been already minted? " + prevOwner);

    // ... if not, mint it
    if (prevOwner == ethers.constants.AddressZero) {
      let newDomainId = await tldContractNew.ownerMintDomain(domainName, domainHolder);
      console.log("New domain minted: " + newDomainId);
  
      let domainHolderNew = await tldContractNew.getDomainHolder(domainName);
      console.log(domainName + " --> " + domainHolderNew + " (NEW)");
    }
  }

  const totalSupplyNewAfter = await tldContractNew.totalSupply();
  console.log("totalSupplyNewAfter: " + totalSupplyNewAfter.toNumber());

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