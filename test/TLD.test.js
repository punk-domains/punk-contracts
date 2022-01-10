const { expect } = require("chai");

function calculateGasCosts(receipt) {
  console.log("mint gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const matic = 2;
  const eth = 3000;
  
  const gasCostMatic = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("35", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("100", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostArbitrum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1.47", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log("transferFrom gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log("transferFrom gas cost (Arbitrum): $" + String(Number(gasCostArbitrum)*eth));
  console.log("transferFrom gas cost (Polygon): $" + String(Number(gasCostMatic)*matic));
}

describe("Web3PandaTLD", function () {
  let contract;
  let factoryContract;
  let signer;
  let anotherUser;

  const domainName = ".web3";
  const domainSymbol = "WEB3";
  const domainPrice = ethers.utils.parseUnits("1", "ether");
  const domainRoyalty = 10; // royalty in bips (10 bips is 0.1%)

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

  it("should confirm the correct TLD name", async function () {
    const name = await contract.name();
    expect(name).to.equal(domainName);  
  });

  it("should create a new valid domain", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const price = await contract.price();
    expect(price).to.equal(domainPrice);

    const newDomainName = "techie";

    // mint a new valid domain
    // note that mint() needs to be called this way ("mint(string,address)") due to function overloading

    /*
    const tx = await expect(contract["mint(string,address)"](
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      {
        value: domainPrice // pay  for the domain
      }
    )).to.emit(contract, "DomainCreated");
    */

    const tx = await contract["mint(string,address)"]( // this approach is better for getting gasUsed value from receipt
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      {
        value: domainPrice // pay  for the domain
      }
    );

    const receipt = await tx.wait();

    calculateGasCosts(receipt);

    const events = [];
    for (let item of receipt.events) {
      events.push(item.event);
    }

    expect(events).to.include("DomainCreated");

    // get domain name by token ID
    const firstDomainName = await contract.domainIdsNames(0);
    expect(firstDomainName).to.equal(newDomainName);

    // get domain data by domain name
    const firstDomainData = await contract.domains(newDomainName);
    expect(firstDomainData.name).to.equal(newDomainName);
    expect(firstDomainData.holder).to.equal(signer.address);
  });

  it("should transfer domain to another user", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const newDomainName = "techie";
    const tokenId = 0;

    await expect(contract["mint(string,address)"](
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      {
        value: domainPrice // pay  for the domain
      }
    )).to.emit(contract, "DomainCreated");

    // get owner
    const domainOwnerBefore = await contract.ownerOf(tokenId);
    expect(domainOwnerBefore).to.equal(signer.address);

    // create Picky Panda NFT (constructor alread mints the first PickyPanda NFT and gives it to the signer)
    const PickyPandas = await ethers.getContractFactory("PickyPandas");
    const pandaContract = await PickyPandas.deploy("Picky Pandas", "PP");

    const pandaNftOwner = await pandaContract.ownerOf(0);
    expect(pandaNftOwner).to.equal(signer.address);

    // set Picky Panda as signer's PFP
    await expect(contract.editPfp(
      newDomainName, // domain name (without TLD)
      pandaContract.address, // PFP address
      0 // PFP token ID
    )).to.emit(contract, "PfpChanged");

    // get domain data by domain name
    const firstDomainDataBefore = await contract.domains(newDomainName);
    expect(firstDomainDataBefore.name).to.equal(newDomainName);
    expect(firstDomainDataBefore.holder).to.equal(signer.address);
    expect(firstDomainDataBefore.pfpAddress).to.equal(pandaContract.address);

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

    calculateGasCosts(receipt);

    const events = [];
    for (let item of receipt.events) {
      events.push(item.event);
    }

    expect(events).to.include("Transfer");

    // get owner
    const domainOwnerAfter = await contract.ownerOf(tokenId);
    expect(domainOwnerAfter).to.equal(anotherUser.address);

    // get domain data by domain name
    const firstDomainDataAfter = await contract.domains(newDomainName);
    expect(firstDomainDataAfter.name).to.equal(newDomainName);
    expect(firstDomainDataAfter.holder).to.equal(anotherUser.address);
    expect(firstDomainDataAfter.pfpAddress).to.equal(ethers.constants.AddressZero); // pfpAddress should now be 0x0
  });

  it("should validate if user owns the PFP", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const price = await contract.price();
    expect(price).to.equal(domainPrice);

    const newDomainName = "techie";

    // mint domain
    await expect(contract["mint(string,address)"](
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      {
        value: domainPrice // pay  for the domain
      }
    )).to.emit(contract, "DomainCreated");

    // create Picky Panda NFT (constructor alread mints the first PickyPanda NFT and gives it to the signer)
    const PickyPandas = await ethers.getContractFactory("PickyPandas");
    const pandaContract = await PickyPandas.deploy("Picky Pandas", "PP");

    const pandaNftOwner = await pandaContract.ownerOf(0);
    expect(pandaNftOwner).to.equal(signer.address);

    // get domain data by domain name (before)
    const firstDomainDataBefore = await contract.domains(newDomainName);
    expect(firstDomainDataBefore.pfpAddress).to.equal(ethers.constants.AddressZero);
    expect(firstDomainDataBefore.pfpTokenId).to.equal(0);

    // set Picky Panda as signer's PFP
    await expect(contract.editPfp(
      newDomainName, // domain name (without TLD)
      pandaContract.address, // PFP address
      0 // PFP token ID
    )).to.emit(contract, "PfpChanged");

    // get domain data by domain name (after)
    const firstDomainDataAfter = await contract.domains(newDomainName);
    expect(firstDomainDataAfter.pfpAddress).to.equal(pandaContract.address);
    expect(firstDomainDataAfter.pfpTokenId).to.equal(0);

    // set Picky Panda as signer's PFP
    await expect(contract.validatePfp(0)).to.emit(contract, "PfpValidated").withArgs(
      signer.address, // msg sender
      signer.address, // domain holder
      true // validation result
    );

  });

  it("should fail if user wants to add PFP that they don't own", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const price = await contract.price();
    expect(price).to.equal(domainPrice);

    const newDomainName = "techie";

    // mint domain
    await expect(contract["mint(string,address)"](
      newDomainName, // domain name (without TLD)
      anotherUser.address, // domain owner (another user!!!)
      {
        value: domainPrice // pay  for the domain
      }
    )).to.emit(contract, "DomainCreated");

    // create Picky Panda NFT (constructor alread mints the first PickyPanda NFT and gives it to the signer)
    const PickyPandas = await ethers.getContractFactory("PickyPandas");
    const pandaContract = await PickyPandas.deploy("Picky Pandas", "PP");

    const pandaNftOwner = await pandaContract.ownerOf(0);
    expect(pandaNftOwner).to.equal(signer.address);

    // get domain data by domain name (before)
    const firstDomainDataBefore = await contract.domains(newDomainName);
    expect(firstDomainDataBefore.pfpAddress).to.equal(ethers.constants.AddressZero);
    expect(firstDomainDataBefore.pfpTokenId).to.equal(0);

    // try to set signer's Picky Panda as anotherUser's PFP (should fail)
    await expect(contract.connect(anotherUser).editPfp(
      newDomainName, // domain name (without TLD)
      pandaContract.address, // PFP address
      0 // PFP token ID (note that this tokenId is owned by signer, not by anotherUser)
    )).to.be.revertedWith('Sender must be the owner of the specified PFP');

    // get domain data by domain name (after)
    const firstDomainDataAfter = await contract.domains(newDomainName);
    expect(firstDomainDataAfter.pfpAddress).to.equal(ethers.constants.AddressZero);
    expect(firstDomainDataAfter.pfpTokenId).to.equal(0);

  });

  it("should change domain description", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const price = await contract.price();
    expect(price).to.equal(domainPrice);

    const newDomainName = "techie";

    // mint domain
    await expect(contract["mint(string,address)"](
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      {
        value: domainPrice // pay  for the domain
      }
    )).to.emit(contract, "DomainCreated");

    // get domain data by domain name (before)
    const firstDomainDataBefore = await contract.domains(newDomainName);
    expect(firstDomainDataBefore.description).to.equal("");

    const newDescription = "This is my new description";

    // set new description
    await expect(contract.editDescription(
      newDomainName, // domain name (without TLD)
      newDescription
    )).to.emit(contract, "DescriptionChanged");

    // get domain data by domain name (after)
    const firstDomainDataAfter = await contract.domains(newDomainName);
    expect(firstDomainDataAfter.description).to.equal(newDescription);

    // fail at changing description if msg.sender is not domain holder
    await expect(contract.connect(anotherUser).editDescription(
      newDomainName, // domain name (without TLD)
      "No change"
    )).to.be.revertedWith('Only domain holder can edit their description');

  });

  it("should change domain URL", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const price = await contract.price();
    expect(price).to.equal(domainPrice);

    const newDomainName = "techie";

    // mint domain
    await expect(contract["mint(string,address)"](
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      {
        value: domainPrice // pay  for the domain
      }
    )).to.emit(contract, "DomainCreated");

    // get domain data by domain name (before)
    const firstDomainDataBefore = await contract.domains(newDomainName);
    expect(firstDomainDataBefore.url).to.equal("");

    const newUrl = "https://ethereum.org";

    // set new URL
    await expect(contract.editUrl(
      newDomainName, // domain name (without TLD)
      newUrl
    )).to.emit(contract, "UrlChanged");

    // get domain data by domain name (after)
    const firstDomainDataAfter = await contract.domains(newDomainName);
    expect(firstDomainDataAfter.url).to.equal(newUrl);

    // fail at changing url if msg.sender is not domain holder
    await expect(contract.connect(anotherUser).editUrl(
      newDomainName, // domain name (without TLD)
      "https://facebook.com"
    )).to.be.revertedWith('Only domain holder can edit their URL');

  });
});
