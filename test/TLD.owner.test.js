const { expect } = require("chai");

describe("Web3PandaTLD (onlyOwner)", function () {
  let contract;
  let factoryContract;
  let signer;
  let anotherUser;

  const domainName = ".web3";
  const domainSymbol = "WEB3";
  const domainPrice = ethers.utils.parseUnits("1", "ether");
  const domainRoyalty = 0; // royalty in bips

  beforeEach(async function () {
    [signer, anotherUser] = await ethers.getSigners();

    const Web3PandaTLDFactory = await ethers.getContractFactory("Web3PandaTLDFactory");
    factoryContract = await Web3PandaTLDFactory.deploy(domainPrice);

    const Web3PandaTLD = await ethers.getContractFactory("Web3PandaTLD");
    contract = await Web3PandaTLD.deploy(
      domainName,
      domainSymbol,
      signer.address, // TLD owner
      domainPrice,
      false, // buying enabled
      domainRoyalty,
      factoryContract.address
    );
  });

  it("should create a new valid domain without paying for it", async function () {
    const newDomainName = "techie";

    // mint a new valid domain as TLD owner
    await expect(contract.ownerMintDomain(
      newDomainName, // domain name (without TLD)
      signer.address // domain holder
    )).to.emit(contract, "DomainCreated");

    // get domain name by token ID
    const firstDomainName = await contract.domainIdsNames(0);
    expect(firstDomainName).to.equal(newDomainName);

    // get domain data by domain name
    const firstDomainData = await contract.domains(newDomainName);
    expect(firstDomainData.name).to.equal(newDomainName);
    expect(firstDomainData.holder).to.equal(signer.address);
  });

  it("should fail to create a new valid domain if user is now TLD owner", async function () {
    const newDomainName = "techie";

    // mint a new valid domain as TLD owner
    await expect(contract.connect(anotherUser).ownerMintDomain(
      newDomainName, // domain name (without TLD)
      anotherUser.address // domain holder
    )).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change the price of a domain", async function () {
    const priceBefore = await contract.price();
    expect(priceBefore).to.equal(domainPrice); 

    const newPrice = ethers.utils.parseUnits("2", "ether");
    
    await contract.changePrice(newPrice);

    const priceAfter = await contract.price();
    expect(priceAfter).to.equal(newPrice); 

    // if user is not owner, the tx should revert
    await expect(contract.connect(anotherUser).changePrice(domainPrice)).to.be.revertedWith('Ownable: caller is not the owner');
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

  it("should change the royalty amount", async function () {
    const royaltyBefore = await contract.royalty();
    expect(royaltyBefore).to.equal(0);

    const newRoyalty = 10;
    
    await contract.changeRoyalty(newRoyalty);

    const royaltyAfter = await contract.royalty();
    expect(royaltyAfter).to.equal(10);

    // if user is not owner, the tx should revert
    await expect(contract.connect(anotherUser).changeRoyalty(20)).to.be.revertedWith('Sender is not Web3PandaTLDFactory owner');
  });

});
