// npx hardhat test test/factories/renewable/RenewableTLD.owner.test.js 

const { expect } = require("chai");

function expiryDate(startTimestamp, expiryInMinutes) {
  return Math.round(startTimestamp + (expiryInMinutes*60)); // return timestamp in seconds
}

describe("RenewablePunkTLD (onlyOwner)", function () {
  let contract;
  let factoryContract;
  let signer;
  let anotherUser;
  let metadataContract1;
  let metadataContract2;

  const tldPrice = ethers.utils.parseUnits("1", "ether");
  const domainName = ".renew";
  const domainSymbol = ".RENEW";
  const now = Math.round(new Date().getTime() / 1000); // timestamp in seconds

  beforeEach(async function () {
    [signer, anotherUser] = await ethers.getSigners();

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
    await contract.changeMinter(signer.address);

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
    await contract.changeMinter(signer.address);

    const newDomainName = "techie";

    await expect(contract.connect(anotherUser).mint(
      newDomainName, // domain name (without TLD)
      anotherUser.address, // domain holder
      expiryDate(now, 60) // expiry date 60 min in the future
    )).to.be.revertedWith('Buying domains disabled'); // should fail, no matter if user is owner and minter
  });
  
  /*
  xit("should fail to create a new valid domain if buying is disabled forever", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    // buying domains should be enabled
    const buyingEnabled = await contract.buyingEnabled();
    expect(buyingEnabled).to.be.true;

    const newDomainName = "techie";

    await contract.connect(anotherUser).mint(
      newDomainName, // domain name (without TLD)
      anotherUser.address, // domain holder
      ethers.constants.AddressZero, // referrer
      {
        value: domainPrice // pay  for the domain
      }
    )

    // disable buying forever
    await contract.disableBuyingForever();

    // fail at minting new domains
    await expect(contract.mint(
      "test1domain", // domain name (without TLD)
      anotherUser.address, // domain holder
      ethers.constants.AddressZero, // referrer
      {
        value: domainPrice // pay  for the domain
      }
    )).to.be.revertedWith('Domain minting disabled forever');
    
    await expect(contract.connect(anotherUser).mint(
      "test2domain", // domain name (without TLD)
      anotherUser.address, // domain holder
      ethers.constants.AddressZero, // referrer
      {
        value: domainPrice // pay  for the domain
      }
    )).to.be.revertedWith('Domain minting disabled forever');
  });

  xit("should change the price of a domain", async function () {
    const priceBefore = await contract.price();
    expect(priceBefore).to.equal(domainPrice); 

    const newPrice = ethers.utils.parseUnits("2", "ether");
    
    await contract.changePrice(newPrice);

    const priceAfter = await contract.price();
    expect(priceAfter).to.equal(newPrice); 

    // if user is not owner, the tx should revert
    await expect(contract.connect(anotherUser).changePrice(domainPrice)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  xit("should change the referral fee", async function () {
    const referralBefore = await contract.referral();
    expect(referralBefore).to.equal(1000); // 10% by default

    const newReferral = 500; // 500 bips or 5%
    
    await contract.changeReferralFee(newReferral);

    const referralAfter = await contract.referral();
    expect(referralAfter).to.equal(newReferral); 

    // if user is not owner, the tx should revert
    await expect(contract.connect(anotherUser).changeReferralFee(200)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  xit("should prevent setting referral fee to 50% or higher", async function () {
    const referralBefore = await contract.referral();
    expect(referralBefore).to.equal(1000); // 10% by default

    // if referral fee is set to 50%, the tx should fail
    await expect(contract.changeReferralFee(5000)).to.be.revertedWith('Referral fee cannot be 50% or higher');
    
    // if referral fee is set to higher than 50%, the tx should fail
    await expect(contract.changeReferralFee(8000)).to.be.revertedWith('Referral fee cannot be 50% or higher');
    
    const referralAfter = await contract.referral();
    expect(referralAfter).to.equal(1000); // should remain the same as before
  });

  xit("should toggle buying domains", async function () {
    const buyingEnabledBefore = await contract.buyingEnabled();
    expect(buyingEnabledBefore).to.be.false; 
    
    await contract.toggleBuyingDomains(); // enable buying domains

    const buyingEnabledAfter = await contract.buyingEnabled();
    expect(buyingEnabledAfter).to.be.true; 

    // if user is not owner, the tx should revert
    await expect(contract.connect(anotherUser).toggleBuyingDomains()).to.be.revertedWith('Ownable: caller is not the owner');
  });

  xit("should change max length for a domain name", async function () {
    const nameMaxLengthBefore = await contract.nameMaxLength();
    expect(nameMaxLengthBefore).to.equal(140);

    const newMaxLength = 180;
    
    await contract.changeNameMaxLength(newMaxLength);

    const nameMaxLengthAfter = await contract.nameMaxLength();
    expect(nameMaxLengthAfter).to.equal(newMaxLength);

    // if user is not owner, the tx should revert
    await expect(contract.connect(anotherUser).changeNameMaxLength(70)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  xit("should change the royalty amount", async function () {
    const royaltyBefore = await contract.royalty();
    expect(royaltyBefore).to.equal(0);

    const newRoyalty = 10;
    
    await contract.changeRoyalty(newRoyalty);

    const royaltyAfter = await contract.royalty();
    expect(royaltyAfter).to.equal(10);

    // if user is not owner, the tx should revert
    await expect(contract.connect(anotherUser).changeRoyalty(20)).to.be.revertedWith('Sender is not royalty fee updater');
  });

  xit("should change metadata contract address and then freeze it", async function () {
    const mtdAddrBefore = await contract.metadataAddress();
    expect(mtdAddrBefore).to.equal(metadataContract1.address);
    
    await contract.changeMetadataAddress(metadataContract2.address);

    const mtdAddrAfter = await contract.metadataAddress();
    expect(mtdAddrAfter).to.equal(metadataContract2.address);

    // if user is not owner, the tx should revert
    await expect(contract.connect(anotherUser).changeMetadataAddress(metadataContract1.address)).to.be.revertedWith('Ownable: caller is not the owner');
    
    await contract.freezeMetadata();

    await expect(contract.changeMetadataAddress(metadataContract1.address)).to.be.revertedWith('Cannot change metadata address anymore');
  });
  */

});
