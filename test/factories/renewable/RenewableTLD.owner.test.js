// npx hardhat test test/factories/renewable/RenewableTLD.owner.test.js 

const { expect } = require("chai");

function expiryDate(startTimestamp, expiryInMinutes) {
  return Math.round(startTimestamp + (expiryInMinutes*60)); // return timestamp in seconds
}

describe("RenewablePunkTLD (onlyOwner)", function () {
  let contract;
  let factoryContract;
  let signer;
  let minter;
  let renewer;
  let anotherUser;
  let metadataContract1;
  let metadataContract2;

  const tldPrice = ethers.utils.parseUnits("1", "ether");
  const domainName = ".renew";
  const domainSymbol = ".RENEW";
  const now = Math.round(new Date().getTime() / 1000); // timestamp in seconds

  beforeEach(async function () {
    [signer, anotherUser, minter, renewer] = await ethers.getSigners();

    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const RenewablePunkMetadata = await ethers.getContractFactory("RenewablePunkMetadata");
    metadataContract1 = await RenewablePunkMetadata.deploy();
    metadataContract2 = await RenewablePunkMetadata.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("RenewablePunkTLDFactory");
    factoryContract = await PunkTLDFactory.deploy(tldPrice, forbTldsContract.address, metadataContract1.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    const PunkTLD = await ethers.getContractFactory("RenewablePunkTLD");
    contract = await PunkTLD.deploy(
      domainName,
      domainSymbol,
      signer.address, // TLD owner
      false, // buying enabled
      factoryContract.address,
      metadataContract1.address
    );
  });

  it("should create a new valid domain as minter", async function () {
    // buying domains should be disabled
    const buyingEnabled = await contract.buyingEnabled();
    expect(buyingEnabled).to.be.false;

    await contract.toggleBuyingDomains(); // enable buying domains

    const buyingEnabledAfter = await contract.buyingEnabled();
    expect(buyingEnabledAfter).to.be.true; 

    // make owner a minter
    await contract.changeMinterAddress(signer.address);

    const newDomainName = "techie";

    // mint a new valid domain as TLD owner
    await expect(contract.mint(
      newDomainName, // domain name (without TLD)
      signer.address, // domain holder
      expiryDate(now, 60) // expiry date 60 min in the future
    )).to.emit(contract, "DomainCreated");

    // get domain name by token ID
    const firstDomainName = await contract.domainIdsNames(1); // token ID 1
    expect(firstDomainName).to.equal(newDomainName);

    // get domain data by domain name
    const firstDomainData = await contract.domains(newDomainName);
    expect(firstDomainData.name).to.equal(newDomainName);
    expect(firstDomainData.holder).to.equal(signer.address);
  });

  
  it("should fail to create a new valid domain if buying is disabled", async function () {
    // buying domains should be disabled
    const buyingEnabled = await contract.buyingEnabled();
    expect(buyingEnabled).to.be.false;

    // make owner also a minter
    await contract.changeMinterAddress(signer.address);

    const newDomainName = "techie";

    await expect(contract.connect(anotherUser).mint(
      newDomainName, // domain name (without TLD)
      anotherUser.address, // domain holder
      expiryDate(now, 60) // expiry date 60 min in the future
    )).to.be.revertedWith('Buying domains disabled'); // should fail, no matter if user is owner and minter
  });

  it("should toggle buying domains", async function () {
    const buyingEnabledBefore = await contract.buyingEnabled();
    expect(buyingEnabledBefore).to.be.false; 
    
    await contract.toggleBuyingDomains(); // enable buying domains

    const buyingEnabledAfter = await contract.buyingEnabled();
    expect(buyingEnabledAfter).to.be.true; 

    // if user is not owner, the tx should revert
    await expect(contract.connect(anotherUser).toggleBuyingDomains()).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change max length for a domain name", async function () {
    const nameMaxLengthBefore = await contract.nameMaxLength();
    expect(nameMaxLengthBefore).to.equal(140);

    const newMaxLength = 180;
    
    await contract.changeNameMaxLength(newMaxLength);

    const nameMaxLengthAfter = await contract.nameMaxLength();
    expect(nameMaxLengthAfter).to.equal(newMaxLength);

    // if user is not owner, the tx should revert
    await expect(contract.connect(anotherUser).changeNameMaxLength(70)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change metadata contract address and then freeze it", async function () {
    const mtdAddrBefore = await contract.metadataAddress();
    expect(mtdAddrBefore).to.equal(metadataContract1.address);
    
    await contract.changeMetadataAddress(metadataContract2.address);

    const mtdAddrAfter = await contract.metadataAddress();
    expect(mtdAddrAfter).to.equal(metadataContract2.address);

    // if user is not owner, the tx should revert
    await expect(contract.connect(anotherUser).changeMetadataAddress(metadataContract1.address)).to.be.revertedWith('Ownable: caller is not the owner');
    
    await contract.freezeMetadata();

    await expect(contract.changeMetadataAddress(metadataContract1.address)).to.be.revertedWith('Cannot change the metadata address anymore');
  });

  it("should change minter contract address and then freeze it", async function () {
    const addrBefore = await contract.minterAddress();
    expect(addrBefore).to.equal(ethers.constants.AddressZero);
    
    await contract.changeMinterAddress(minter.address);

    const addrAfter = await contract.minterAddress();
    expect(addrAfter).to.equal(minter.address);

    // if user is not owner, the tx should revert
    await expect(contract.connect(anotherUser).changeMinterAddress(ethers.constants.AddressZero)).to.be.revertedWith('Ownable: caller is not the owner');
    
    await contract.freezeMinter();

    await expect(contract.changeMinterAddress(ethers.constants.AddressZero)).to.be.revertedWith('Cannot change the minter address anymore');
  });

  it("should change renewer contract address and then freeze it", async function () {
    const addrBefore = await contract.renewerAddress();
    expect(addrBefore).to.equal(ethers.constants.AddressZero);
    
    await contract.changeRenewerAddress(renewer.address);

    const addrAfter = await contract.renewerAddress();
    expect(addrAfter).to.equal(renewer.address);

    // if user is not owner, the tx should revert
    await expect(contract.connect(anotherUser).changeRenewerAddress(ethers.constants.AddressZero)).to.be.revertedWith('Ownable: caller is not the owner');
    
    await contract.freezeRenewer();

    await expect(contract.changeRenewerAddress(ethers.constants.AddressZero)).to.be.revertedWith('Cannot change the renewer address anymore');
  });

});
