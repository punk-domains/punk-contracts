const { expect } = require("chai");

describe("Web3PandaTLD", function () {
  let contract;
  let factoryContract;
  let signer;

  const domainName = ".web3";
  const domainSymbol = "WEB3";
  const domainPrice = ethers.utils.parseUnits("1", "ether");
  const domainRoyalty = 0; // royalty in bips

  beforeEach(async function () {
    [signer] = await ethers.getSigners();

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

  it("should confirm the correct TLD name", async function () {
    const name = await contract.name();
    expect(name).to.equal(domainName);  
  });

  it("should create a new valid domain", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const price = await contract.price();
    expect(price).to.equal(domainPrice);

    const newDomainName = "techie";

    await expect(contract.mint(
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      {
        value: domainPrice // pay  for the domain
      }
    )).to.emit(contract, "DomainCreated");

    // get domain name by token ID
    const firstDomainName = await contract.domainIdsNames(0);
    expect(firstDomainName).to.equal(newDomainName);

    // get domain data by domain name
    const firstDomainData = await contract.domains(newDomainName);
    expect(firstDomainData.name).to.equal(newDomainName);
    expect(firstDomainData.holder).to.equal(signer.address);
  });

});
