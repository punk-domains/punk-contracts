// npx hardhat test test/factories/flexi/FlexiTLD.test.js

const { expect } = require("chai");

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const matic = 0.5;
  const eth = 1000;
  
  const gasCostMatic = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("35", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("21", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostArbitrum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1.25", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Arbitrum): $" + String(Number(gasCostArbitrum)*eth));
  console.log(testName + " gas cost (Polygon): $" + String(Number(gasCostMatic)*matic));
}

describe("FlexiPunkTLD", function () {
  let contract;
  let factoryContract;
  let metadataContract;
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

    const FlexiPunkMetadata = await ethers.getContractFactory("FlexiPunkMetadata");
    metadataContract = await FlexiPunkMetadata.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("FlexiPunkTLDFactory");
    factoryContract = await PunkTLDFactory.deploy(domainPrice, forbTldsContract.address, metadataContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    const PunkTLD = await ethers.getContractFactory("FlexiPunkTLD");
    contract = await PunkTLD.deploy(
      domainName,
      domainSymbol,
      signer.address, // TLD owner
      domainPrice,
      false, // buying enabled
      domainRoyalty,
      factoryContract.address,
      metadataContract.address
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
    const firstDomainName = await contract.domainIdsNames(1);
    expect(firstDomainName).to.equal(newDomainName);

    // get domain data by domain name
    const firstDomainData = await contract.domains(newDomainName);
    expect(firstDomainData.name).to.equal(newDomainName);
    expect(firstDomainData.holder).to.equal(signer.address);
    expect(firstDomainData.tokenId).to.equal(1);

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
    expect(secondDomainData.tokenId).to.equal(2);

    // mint a 1-letter domain
    await contract.connect(anotherUser).mint(
      "a", // domain name (without TLD)
      anotherUser.address, // domain owner
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay  for the domain
      }
    );

    // check total supply of tokens
    const totalSupplyAfterA = await contract.totalSupply();
    expect(totalSupplyAfterA).to.equal(3);

    // get domain data by domain name
    const aDomainData = await contract.domains("a");
    expect(aDomainData.name).to.equal("a");
    expect(aDomainData.holder).to.equal(anotherUser.address);
    expect(aDomainData.tokenId).to.equal(3);

    // fail at minting an empty domain
    await expect(contract.mint( // this approach is better for getting gasUsed value from receipt
      "", // empty domain name (without TLD)
      anotherUser.address, // domain owner
      referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
      {
        value: domainPrice // pay  for the domain
      }
    )).to.be.revertedWith('Domain name empty');
  });

  it("should transfer domain to another user", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const newDomainName = "techie";
    const tokenId = 1;

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

  it("should change metadata", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const price = await contract.price();
    expect(price).to.equal(domainPrice);

    const newDomainName = "techie";

    // mint domain
    await expect(contract.mint(
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      ethers.constants.AddressZero,
      {
        value: domainPrice // pay  for the domain
      }
    )).to.emit(contract, "DomainCreated");

    // get domain token ID
    const domainData = await contract.domains(newDomainName);
    expect(domainData.tokenId).to.equal(1);

    // get domain metadata
    const domainMetadata = await contract.tokenURI(domainData.tokenId);
    const mdJson = Buffer.from(domainMetadata.substring(29), "base64");
    const mdResult = JSON.parse(mdJson);
    expect(mdResult.name).to.equal(newDomainName+domainName);
    expect(mdResult.description).to.equal("");

    // change description in the metadata contract
    const newDesc = "The best top-level domain";

    await metadataContract.changeDescription(
      contract.address,
      newDesc
    );

    // get domain metadata
    const domainMetadata2 = await contract.tokenURI(domainData.tokenId);
    const mdJson2 = Buffer.from(domainMetadata2.substring(29), "base64");
    const mdResult2 = JSON.parse(mdJson2);
    expect(mdResult2.name).to.equal(newDomainName+domainName);
    expect(mdResult2.description).to.equal(newDesc);

    // fail at changing metadata description if sender is not TLD owner
    await expect(metadataContract.connect(anotherUser).changeDescription(
      contract.address,
      newDesc
    )).to.be.revertedWith('Sender not TLD owner');
  });

  it("should create a new valid domain, but with non-ascii letters input", async function () {
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

    const getDomainName = await contract.domainIdsNames(1);
    console.log(getDomainName);
    expect(getDomainName).to.equal(newDomainName.toLowerCase()); // should be lowercase
  });

  it("should mint a token and burn it and mint it again", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const totalSupplyBeforeMint = await contract.totalSupply();
    expect(totalSupplyBeforeMint).to.equal(0);

    const balanceBeforeMint = await contract.balanceOf(signer.address);
    expect(balanceBeforeMint).to.equal(0);

    const getDomainNameBeforeMint = await contract.domainIdsNames(1); // token ID 1
    expect(getDomainNameBeforeMint).to.equal(""); // should be empty string

    const price = await contract.price();
    expect(price).to.equal(domainPrice);

    // MINT DOMAIN

    const newDomainName = "signer";

    await contract["mint(string,address,address)"]( // this approach is better for getting gasUsed value from receipt
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
      {
        value: domainPrice // pay  for the domain
      }
    );

    const totalSupplyAfterMint = await contract.totalSupply();
    expect(totalSupplyAfterMint).to.equal(1);

    const balanceAfterMint = await contract.balanceOf(signer.address);
    expect(balanceAfterMint).to.equal(1);

    const getDomainDataAfterMint = await contract.domains(newDomainName);
    expect(getDomainDataAfterMint.name).to.equal(newDomainName);
    expect(getDomainDataAfterMint.tokenId).to.equal(1);
    expect(getDomainDataAfterMint.holder).to.equal(signer.address);
    expect(getDomainDataAfterMint.data).to.equal("");

    const getDomainNameAfterMint = await contract.domainIdsNames(1);
    expect(getDomainNameAfterMint).to.equal(newDomainName);

    // BURN DOMAIN

    const tx = await contract.burn(newDomainName);

    const receipt = await tx.wait();

    calculateGasCosts("Burn domain", receipt);

    const events = [];
    for (let item of receipt.events) {
      events.push(item.event);
    }

    expect(events).to.include("DomainBurned");

    const totalSupplyAfterBurn = await contract.totalSupply();
    expect(totalSupplyAfterBurn).to.equal(0);

    const balanceAfterBurn = await contract.balanceOf(signer.address);
    expect(balanceAfterBurn).to.equal(0);

    const getDomainDataAfterBurn = await contract.domains(newDomainName);
    expect(getDomainDataAfterBurn.holder).to.equal(ethers.constants.AddressZero);
    expect(getDomainDataAfterBurn.name).to.equal("");
    expect(getDomainDataAfterBurn.data).to.equal("");
    expect(getDomainDataAfterBurn.tokenId).to.equal(0);

    const getDomainNameAfterBurn = await contract.domainIdsNames(1);
    expect(getDomainNameAfterBurn).to.equal(""); // should be empty

    const getDefaultDomainNameAfterBurn = await contract.defaultNames(signer.address);
    expect(getDefaultDomainNameAfterBurn).to.equal(""); // should be empty

    // MINT AGAIN

    await contract["mint(string,address,address)"]( // this approach is better for getting gasUsed value from receipt
      newDomainName, // domain name (without TLD)
      signer.address, // domain owner
      referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
      {
        value: domainPrice // pay  for the domain
      }
    );

    const totalSupplyAfterMintAgain = await contract.totalSupply();
    expect(totalSupplyAfterMintAgain).to.equal(1);

    const balanceAfterMintAgain = await contract.balanceOf(signer.address);
    expect(balanceAfterMintAgain).to.equal(1);

    const getDomainDataAfterMintAgain = await contract.domains(newDomainName);
    expect(getDomainDataAfterMintAgain.name).to.equal(newDomainName);
    expect(getDomainDataAfterMintAgain.tokenId).to.equal(2); // token ID is now 2, because burned IDs still count as used
    expect(getDomainDataAfterMintAgain.holder).to.equal(signer.address);
    expect(getDomainDataAfterMintAgain.data).to.equal("");

    // token ID 1 still burned
    const getDomainNameAfterMintAgain0 = await contract.domainIdsNames(1); // token ID 1 is burned and will not be used again
    expect(getDomainNameAfterMintAgain0).to.equal("");

    // new NFT has now ID 2
    const getDomainNameAfterMintAgain1 = await contract.domainIdsNames(2); // new domain has ID 2
    expect(getDomainNameAfterMintAgain1).to.equal(newDomainName);
  });

  it("should mint multiple tokens, burn one and mint it again", async function () {
    await contract.toggleBuyingDomains(); // enable buying domains

    const totalSupplyBeforeMint = await contract.totalSupply();
    expect(totalSupplyBeforeMint).to.equal(0);

    const idCounterBeforeMint = await contract.idCounter();
    expect(idCounterBeforeMint).to.equal(1);

    const balanceBeforeMint = await contract.balanceOf(signer.address);
    expect(balanceBeforeMint).to.equal(0);

    const getDomainNameBeforeMint = await contract.domainIdsNames(1);
    expect(getDomainNameBeforeMint).to.equal(""); // should be empty string

    const price = await contract.price();
    expect(price).to.equal(domainPrice);

    // MINT 3 DOMAINs

    const newDomainName1 = "signer";
    const newDomainName2 = "anotheruser";
    const newDomainName3 = "referrer";

    await contract.mint( // this approach is better for getting gasUsed value from receipt
      newDomainName1, // domain name (without TLD)
      signer.address, // domain owner
      referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
      {
        value: domainPrice // pay  for the domain
      }
    );

    await contract.mint( // this approach is better for getting gasUsed value from receipt
      newDomainName2, // domain name (without TLD)
      anotherUser.address, // domain owner
      referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
      {
        value: domainPrice // pay  for the domain
      }
    );

    await contract.mint( // this approach is better for getting gasUsed value from receipt
      newDomainName3, // domain name (without TLD)
      referrer.address, // domain owner
      referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
      {
        value: domainPrice // pay  for the domain
      }
    );

    const totalSupplyAfterMint = await contract.totalSupply();
    expect(totalSupplyAfterMint).to.equal(3);

    const idCounterAfterMint = await contract.idCounter();
    expect(idCounterAfterMint).to.equal(4); // 3 token IDs has been created. The next domain will have ID 4.

    const balanceAfterMint = await contract.balanceOf(signer.address);
    expect(balanceAfterMint).to.equal(1);

    const balanceAfterMint2 = await contract.balanceOf(anotherUser.address);
    expect(balanceAfterMint2).to.equal(1);

    const balanceAfterMint3 = await contract.balanceOf(referrer.address);
    expect(balanceAfterMint3).to.equal(1);

    const getDefaultDomainAfterMint = await contract.defaultNames(anotherUser.address);
    expect(getDefaultDomainAfterMint).to.equal(newDomainName2);

    const getDomainDataAfterMint = await contract.domains(newDomainName1);
    expect(getDomainDataAfterMint.name).to.equal(newDomainName1);

    const getDomainDataAfterMint2 = await contract.domains(newDomainName2);
    expect(getDomainDataAfterMint2.name).to.equal(newDomainName2);
    expect(getDomainDataAfterMint2.tokenId).to.equal(2);
    expect(getDomainDataAfterMint2.holder).to.equal(anotherUser.address);
    expect(getDomainDataAfterMint2.data).to.equal("");

    const getDomainNameAfterMint = await contract.domainIdsNames(2);
    expect(getDomainNameAfterMint).to.equal(newDomainName2);

    // fail at minting the existing domain before burning it
    await expect(contract.mint( // this approach is better for getting gasUsed value from receipt
      newDomainName2, // domain name (without TLD)
      anotherUser.address, // domain owner
      referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
      {
        value: domainPrice // pay  for the domain
      }
    )).to.be.revertedWith('Domain with this name already exists');

    // set domain data
    const domainDataString = "{'url': 'https://ethereum.org'}";

    await contract.connect(anotherUser).editData(
      newDomainName2,
      domainDataString
    );

    // check domain data before burn
    const domainDataBeforeBurn = await contract.getDomainData(newDomainName2);
    expect(domainDataBeforeBurn).to.equal(domainDataString);

    // BURN DOMAIN

    const tx = await contract.connect(anotherUser).burn(newDomainName2);

    const receipt = await tx.wait();

    calculateGasCosts("Burn second domain", receipt);

    const events = [];
    for (let item of receipt.events) {
      events.push(item.event);
    }

    expect(events).to.include("DomainBurned");

    const totalSupplyAfterBurn = await contract.totalSupply();
    expect(totalSupplyAfterBurn).to.equal(2);

    const idCounterAfterBurn = await contract.idCounter();
    expect(idCounterAfterBurn).to.equal(4);

    // check domain data after burn
    const domainDataAfterBurn = await contract.getDomainData(newDomainName2);
    expect(domainDataAfterBurn).to.equal("");

    const balanceAfterBurn = await contract.balanceOf(signer.address);
    expect(balanceAfterBurn).to.equal(1);

    const balanceAfterBurn1 = await contract.balanceOf(anotherUser.address);
    expect(balanceAfterBurn1).to.equal(0);

    const balanceAfterBurn2 = await contract.balanceOf(referrer.address);
    expect(balanceAfterBurn2).to.equal(1);

    const getDomainDataAfterBurn = await contract.domains(newDomainName1);
    expect(getDomainDataAfterBurn.holder).to.equal(signer.address);
    expect(getDomainDataAfterBurn.name).to.equal("signer");
    expect(getDomainDataAfterBurn.data).to.equal("");
    expect(getDomainDataAfterBurn.tokenId).to.equal(1);

    const getDomainDataAfterBurn2 = await contract.domains(newDomainName2);
    expect(getDomainDataAfterBurn2.holder).to.equal(ethers.constants.AddressZero);
    expect(getDomainDataAfterBurn2.name).to.equal("");
    expect(getDomainDataAfterBurn2.data).to.equal("");
    expect(getDomainDataAfterBurn2.tokenId).to.equal(0);

    const getDomainDataAfterBurn3 = await contract.domains(newDomainName3);
    expect(getDomainDataAfterBurn3.holder).to.equal(referrer.address);
    expect(getDomainDataAfterBurn3.name).to.equal("referrer");
    expect(getDomainDataAfterBurn3.data).to.equal("");
    expect(getDomainDataAfterBurn3.tokenId).to.equal(3);

    const getDomainNameAfterBurn = await contract.domainIdsNames(1);
    expect(getDomainNameAfterBurn).to.equal("signer");

    const getDomainNameAfterBurn2 = await contract.domainIdsNames(2);
    expect(getDomainNameAfterBurn2).to.equal(""); // should be empty

    const getDomainNameAfterBurn3 = await contract.domainIdsNames(3);
    expect(getDomainNameAfterBurn3).to.equal("referrer");

    // MINT AGAIN

    await contract.mint( // this approach is better for getting gasUsed value from receipt
      newDomainName2, // domain name (without TLD)
      anotherUser.address, // domain owner
      referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
      {
        value: domainPrice // pay  for the domain
      }
    );

    const totalSupplyAfterMintAgain = await contract.totalSupply();
    expect(totalSupplyAfterMintAgain).to.equal(3);

    const idCounterAfterMintAgain = await contract.idCounter();
    expect(idCounterAfterMintAgain).to.equal(5);

    const balanceAfterMintAgain = await contract.balanceOf(signer.address);
    expect(balanceAfterMintAgain).to.equal(1);

    const balanceAfterMintAgain2 = await contract.balanceOf(anotherUser.address);
    expect(balanceAfterMintAgain2).to.equal(1);

    const balanceAfterMintAgain3 = await contract.balanceOf(referrer.address);
    expect(balanceAfterMintAgain3).to.equal(1);

    const getDomainDataAfterMintAgain = await contract.domains(newDomainName2);
    expect(getDomainDataAfterMintAgain.name).to.equal(newDomainName2);
    expect(getDomainDataAfterMintAgain.tokenId).to.equal(4); // token ID is now 4, because burned IDs still count as used
    expect(getDomainDataAfterMintAgain.holder).to.equal(anotherUser.address);
    expect(getDomainDataAfterMintAgain.data).to.equal("");

    // token ID 2 still burned
    const getDomainNameAfterMintAgain1 = await contract.domainIdsNames(2);
    expect(getDomainNameAfterMintAgain1).to.equal("");

    // new NFT has now ID 4
    const getDomainNameAfterMintAgain3 = await contract.domainIdsNames(4);
    expect(getDomainNameAfterMintAgain3).to.equal(newDomainName2);
    
  });

});
