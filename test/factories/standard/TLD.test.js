const { expect } = require("chai");

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const matic = 2;
  const eth = 3000;
  
  const gasCostMatic = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("35", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("100", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostArbitrum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1.25", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Arbitrum): $" + String(Number(gasCostArbitrum)*eth));
  console.log(testName + " gas cost (Polygon): $" + String(Number(gasCostMatic)*matic));
}

describe("PunkTLD", function () {
  let contract;
  let factoryContract;
  let signer;
  let anotherUser;
  let referrer;

  const provider = waffle.provider;

  const domainName = ".web3";
  const domainSymbol = "WEB3";
  const domainPrice = ethers.utils.parseUnits("1", "ether");
  const domainRoyalty = 10; // royalty in bips (10 bips is 0.1%)

  beforeEach(async function () {
    [signer, anotherUser, referrer] = await ethers.getSigners();

    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("PunkTLDFactory");
    factoryContract = await PunkTLDFactory.deploy(domainPrice, forbTldsContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    const PunkTLD = await ethers.getContractFactory("PunkTLD");
    contract = await PunkTLD.deploy(
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

    // get referrer's balance BEFORE
    const balanceReferrerBefore = await provider.getBalance(referrer.address);

    const totalSupplyBefore = await contract.totalSupply();
    expect(totalSupplyBefore).to.equal(0);

    const tx = await contract["mint(string,address,address)"]( // this approach is better for getting gasUsed value from receipt
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
      {
        value: domainPrice // pay  for the domain
      }
    );

    const receipt = await tx.wait();

    calculateGasCosts("Mint", receipt);

    const events = [];
    for (let item of receipt.events) {
      events.push(item.event);
    }

    expect(events).to.include("DomainCreated");

    const totalSupplyAfter = await contract.totalSupply();
    expect(totalSupplyAfter).to.equal(1);

    // get referrer's balance AFTER
    const balanceReferrerAfter = await provider.getBalance(referrer.address);
    expect(ethers.BigNumber.from(balanceReferrerAfter).sub(balanceReferrerBefore)).to.equal(ethers.BigNumber.from("100000000000000000"));

    // get domain name by token ID
    const firstDomainName = await contract.domainIdsNames(0);
    expect(firstDomainName).to.equal(newDomainName);

    // get domain data by domain name
    const firstDomainData = await contract.domains(newDomainName);
    expect(firstDomainData.name).to.equal(newDomainName);
    expect(firstDomainData.holder).to.equal(signer.address);
    expect(firstDomainData.tokenId).to.equal(0);

    // mint another domain
    await contract["mint(string,address,address)"](
      "second", // domain name (without TLD)
      referrer.address, // domain owner
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay  for the domain
      }
    );

    // check total supply of tokens
    const totalSupplyAfterSecond = await contract.totalSupply();
    expect(totalSupplyAfterSecond).to.equal(2);

    // get domain data by domain name
    const secondDomainData = await contract.domains("second");
    expect(secondDomainData.name).to.equal("second");
    expect(secondDomainData.holder).to.equal(referrer.address);
    expect(secondDomainData.tokenId).to.equal(1);
  });

  it("should transfer domain to another user", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const newDomainName = "techie";
    const tokenId = 0;

    await expect(contract["mint(string,address,address)"](
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      ethers.constants.AddressZero,
      {
        value: domainPrice // pay  for the domain
      }
    )).to.emit(contract, "DomainCreated");

    // get owner
    const domainOwnerBefore = await contract.ownerOf(tokenId);
    expect(domainOwnerBefore).to.equal(signer.address);

    // get domain data by domain name
    const firstDomainDataBefore = await contract.domains(newDomainName);
    expect(firstDomainDataBefore.name).to.equal(newDomainName);
    expect(firstDomainDataBefore.holder).to.equal(signer.address);

    // transfer domain from signer to another user
    /*
    await expect(contract.transferFrom(
      signer.address, // from
      anotherUser.address, // to
      tokenId // token ID
    )).to.emit(contract, "Transfer");
    */

    const tx = await contract.transferFrom( // this approach is better for getting gasUsed value from receipt
      signer.address, // from
      anotherUser.address, // to
      tokenId // token ID
    );

    const receipt = await tx.wait()

    calculateGasCosts("Transfer", receipt);

    const events = [];
    for (let item of receipt.events) {
      events.push(item.event);
    }

    expect(events).to.include("Transfer");

    // get default name (after)
    const defaultNameAfterSigner = await contract.defaultNames(signer.address);
    expect(defaultNameAfterSigner).to.be.empty;

    const defaultNameAfterAnother = await contract.defaultNames(anotherUser.address);
    expect(defaultNameAfterAnother).to.equal(newDomainName);

    // get owner
    const domainOwnerAfter = await contract.ownerOf(tokenId);
    expect(domainOwnerAfter).to.equal(anotherUser.address);

    // get domain data by domain name
    const firstDomainDataAfter = await contract.domains(newDomainName);
    expect(firstDomainDataAfter.name).to.equal(newDomainName);
    expect(firstDomainDataAfter.holder).to.equal(anotherUser.address);
  });

  it("should change default domain", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const price = await contract.price();
    expect(price).to.equal(domainPrice);

    const newDomainName = "techie";

    // mint domain
    await expect(contract["mint(string,address,address)"](
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      ethers.constants.AddressZero,
      {
        value: domainPrice // pay  for the domain
      }
    )).to.emit(contract, "DomainCreated");

    // get default name (before)
    const defaultNameBefore = await contract.defaultNames(signer.address);
    expect(defaultNameBefore).to.equal(newDomainName);

    const anotherDomainName = "tempe";

    // mint domain
    await expect(contract["mint(string,address,address)"](
      anotherDomainName, // domain name (without TLD)
      signer.address, // domain owner
      ethers.constants.AddressZero,
      {
        value: domainPrice // pay  for the domain
      }
    )).to.emit(contract, "DomainCreated");

    // get default name (after 1)
    const defaultNameAfter = await contract.defaultNames(signer.address);
    expect(defaultNameAfter).to.equal(newDomainName); // default domain name should remain the first domain (techie)

    // change default domain to tempe
    await expect(contract.editDefaultDomain(anotherDomainName)).to.emit(contract, "DefaultDomainChanged");

    // get default name (after change)
    const defaultNameAfterChange = await contract.defaultNames(signer.address);
    expect(defaultNameAfterChange).to.equal(anotherDomainName); // default domain name should change to tempe

    // fail at changing default domain if msg.sender is not domain holder
    await expect(contract.connect(anotherUser).editDefaultDomain(
      newDomainName // trying to change back to techie (but msg.sender is not domain holder)
    )).to.be.revertedWith('You do not own the selected domain');

  });

  it("should change domain data", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const price = await contract.price();
    expect(price).to.equal(domainPrice);

    const newDomainName = "techie";

    // mint domain
    await expect(contract["mint(string,address,address)"](
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      ethers.constants.AddressZero,
      {
        value: domainPrice // pay  for the domain
      }
    )).to.emit(contract, "DomainCreated");

    // get domain data by domain name (before)
    const firstDomainDataBefore = await contract.domains(newDomainName);
    expect(firstDomainDataBefore.data).to.equal("");

    const newData = "{'description': 'This is my NEW domain description'}";

    // set new data
    const tx = await contract.editData(
      newDomainName, // domain name (without TLD)
      newData
    );

    const receipt = await tx.wait();

    calculateGasCosts("DataChanged", receipt);

    const events = [];
    for (let item of receipt.events) {
      events.push(item.event);
    }

    expect(events).to.include("DataChanged");

    // get domain data by domain name (after)
    const firstDomainDataAfter = await contract.domains(newDomainName);
    expect(firstDomainDataAfter.data).to.equal(newData);

    // fail at changing data if msg.sender is not domain holder
    await expect(contract.connect(anotherUser).editData(
      newDomainName, // domain name (without TLD)
      "No change"
    )).to.be.revertedWith('Only domain holder can edit their data');

  });

  it("should create a new valid domain, but with uppercase and non-ascii letters input", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const price = await contract.price();
    expect(price).to.equal(domainPrice);

    const newDomainName = "poɯSnᴉǝ";

    const tx = await contract["mint(string,address,address)"]( // this approach is better for getting gasUsed value from receipt
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
      {
        value: domainPrice // pay  for the domain
      }
    );

    const receipt = await tx.wait();

    calculateGasCosts("Mint " + newDomainName, receipt);

    const events = [];
    for (let item of receipt.events) {
      events.push(item.event);
    }

    expect(events).to.include("DomainCreated");

    const totalSupplyAfter = await contract.totalSupply();
    expect(totalSupplyAfter).to.equal(1);

    const getDomainName = await contract.domainIdsNames(0);
    console.log(getDomainName);
    //expect(getDomainName).to.equal(newDomainName.toLowerCase()); // should be lowercase
  });

});
