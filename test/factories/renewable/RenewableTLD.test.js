// TODO tests:
// - User cannot transfer an expired domain
// - Renewer should not be able to add a negative amount of renewal seconds
// - If a domain is transferred to another user, the expiry date should stay the same

// npx hardhat test test/factories/renewable/RenewableTLD.test.js 

const { expect } = require("chai");

function expiryDate(startTimestamp, expiryInMinutes) {
  return Math.round(startTimestamp + (expiryInMinutes*60)); // return timestamp in seconds
}

describe("RenewablePunkTLD", function () {
  let contract;
  let factoryContract;
  let signer;
  let anotherUser;
  let royaltyReceiver;

  let metadataContract;

  let minter;
  let renewer;

  const tldPrice = ethers.utils.parseUnits("1", "ether");
  const domainName = ".renew";
  const domainSymbol = ".RENEW";

  const now = Math.round(new Date().getTime() / 1000); // timestamp in seconds

  const domainPrice1char = ethers.utils.parseUnits("1", "ether");
  const domainPrice2char = ethers.utils.parseUnits("0.5", "ether");
  const domainPrice3char = ethers.utils.parseUnits("0.1", "ether");
  const domainPrice4char = ethers.utils.parseUnits("0.05", "ether");
  const domainPrice5char = ethers.utils.parseUnits("0.01", "ether");

  beforeEach(async function () {
    [signer, anotherUser, royaltyReceiver] = await ethers.getSigners();

    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const RenewablePunkMetadata = await ethers.getContractFactory("RenewablePunkMetadata");
    metadataContract = await RenewablePunkMetadata.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("RenewablePunkTLDFactory");
    factoryContract = await PunkTLDFactory.deploy(tldPrice, forbTldsContract.address, metadataContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    const PunkTLD = await ethers.getContractFactory("RenewablePunkTLD");
    contract = await PunkTLD.deploy(
      domainName,
      domainSymbol,
      signer.address, // TLD owner
      false, // buying enabled
      factoryContract.address,
      metadataContract.address
    );

    const RenewablePunkMinter = await ethers.getContractFactory("RenewablePunkMinter");
    minter = await RenewablePunkMinter.deploy(
      royaltyReceiver.address,
      contract.address, // TLD address
      domainPrice1char,
      domainPrice2char,
      domainPrice3char,
      domainPrice4char,
      domainPrice5char
    );

    // change registration length to a shorter time
    await minter.changeRegistrationLength(604801); // 604800 = 1 week

    const RenewablePunkRenewer = await ethers.getContractFactory("RenewablePunkRenewer");
    renewer = await RenewablePunkRenewer.deploy(
      royaltyReceiver.address,
      contract.address, // TLD address
      domainPrice1char,
      domainPrice2char,
      domainPrice3char,
      domainPrice4char,
      domainPrice5char
    );

    await contract.changeMinterAddress(minter.address);
    await contract.changeRenewerAddress(renewer.address);
    await contract.toggleBuyingDomains(); // enable buying domains
  });

  it("should allow user to mint a domain through the minter contract", async function () {
    await minter.togglePaused(); // unpause minting

    const newDomainName = "techie";

    // mint a new valid domain as TLD owner
    await expect(minter.mint(
      newDomainName, // domain name (without TLD)
      signer.address, // domain holder
      ethers.constants.AddressZero,
      {
        value: domainPrice5char // pay  for the domain
      }
    )).to.emit(contract, "DomainCreated");

    // get domain name by token ID
    const firstDomainName = await contract.domainIdsNames(1); // token ID 1
    expect(firstDomainName).to.equal(newDomainName);

    // get domain data by domain name
    const firstDomainData = await contract.domains(newDomainName);
    expect(firstDomainData.name).to.equal(newDomainName);
    expect(firstDomainData.holder).to.equal(signer.address);
  });


});
