// Run tests:
// npx hardhat test test/factories/renewable/RenewableTLDFactory.test.js 

const { expect } = require("chai");
const { ethers, waffle} = require("hardhat");

describe("RenewablePunkTLDFactory", function () {
  let contract;
  let forbTldsContract;
  let signer;
  let anotherUser;

  const provider = waffle.provider;

  const tldPrice = ethers.utils.parseUnits("1", "ether");
  const tldName = ".renew";
  const tldSymbol = ".RENEW";

  beforeEach(async function () {
    [signer, anotherUser] = await ethers.getSigners();

    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    forbTldsContract = await PunkForbiddenTlds.deploy();

    const RenewablePunkMetadata = await ethers.getContractFactory("RenewablePunkMetadata");
    const metadataContract = await RenewablePunkMetadata.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("RenewablePunkTLDFactory");
    contract = await PunkTLDFactory.deploy(tldPrice, forbTldsContract.address, metadataContract.address);

    await forbTldsContract.addFactoryAddress(contract.address);
  });

  it("should confirm forbidden TLD names defined in the constructor", async function () {
    const forbiddenCom = await forbTldsContract.forbidden(".com");
    expect(forbiddenCom).to.be.true;

    const forbiddenEth = await forbTldsContract.forbidden(".eth");
    expect(forbiddenEth).to.be.true;
  });

  it("should create a new valid TLD", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    // get user&signer balances BEFORE
    const balanceSignerBefore = await provider.getBalance(signer.address); // signer is the factory owner
    const balanceUserBefore = await provider.getBalance(anotherUser.address);

    await expect(contract.connect(anotherUser).createTld(
      tldName, // TLD
      tldSymbol, // symbol
      signer.address, // TLD owner
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.emit(contract, "TldCreated");

    // get another user's balance AFTER (should be smaller by 1 ETH + gas)
    const balanceUserAfter = await provider.getBalance(anotherUser.address);
    const balUsrBef = Number(ethers.utils.formatEther(balanceUserBefore))
    const balUsrAft = Number(ethers.utils.formatEther(balanceUserAfter))
    expect(balUsrBef-balUsrAft).to.be.greaterThan(1); // diff: 1 ETH + gas

    // get signer's balance after (should be bigger by exactly 1 ETH)
    const balanceSignerAfter = await provider.getBalance(signer.address);
    const balSigBef = Number(ethers.utils.formatEther(balanceSignerBefore))
    const balSigAft = Number(ethers.utils.formatEther(balanceSignerAfter))
    expect(balSigAft-balSigBef).to.equal(1); // diff: 1 ETH exactly

    // get TLD from array by index
    const firstTld = await contract.tlds(0);
    expect(firstTld).to.equal(tldName);

    // get TLD address by name
    const firstTldAddress = await contract.tldNamesAddresses(tldName);
    expect(firstTldAddress.startsWith("0x")).to.be.true;
  });

  it("should fail to create a new valid TLD if buying TLDs disabled", async function () {
    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      tldName, // TLD
      tldSymbol, // symbol
      signer.address, // TLD owner
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('Buying TLDs disabled');
  });

  it("should fail to create a new valid TLD if payment is too low", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      tldName, // TLD
      tldSymbol, // symbol
      signer.address, // TLD owner
      false, // buying enabled
      {
        value: ethers.utils.parseUnits("0.9", "ether") // pay 0.9 ETH for the TLD - TOO LOW!
      }
    )).to.be.revertedWith('Value below price');
  });

  it("should fail to create a new valid TLD if more than 1 dot in the name", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      ".re.new", // TLD
      tldSymbol, // symbol
      signer.address, // TLD owner
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('Name must have 1 dot');
  });

  it("should fail to create a new valid TLD if no dot in the name", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      "renew", // TLD
      tldSymbol, // symbol
      signer.address, // TLD owner
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('Name must have 1 dot');
  });

  it("should fail to create a new valid TLD if name does not start with dot", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      "ren.ew", // TLD
      tldSymbol, // symbol
      signer.address, // TLD owner
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('Name must start with dot');
  });

  it("should fail to create a new valid TLD if name is of length 1", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      ".", // TLD
      tldSymbol, // symbol
      signer.address, // TLD owner
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('TLD too short');
  });

  it("should fail to create a new valid TLD with empty name", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      "", // TLD
      tldSymbol, // symbol
      signer.address, // TLD owner
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('TLD too short');
  });

  it("should fail to create a new valid TLD if TLD already exists", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    // create a valid TLD
    await expect(contract.createTld(
      tldName, // TLD
      tldSymbol, // symbol
      signer.address, // TLD owner
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.emit(contract, "TldCreated");

    // try to create a TLD with the same name
    await expect(contract.createTld(
      tldName, // TLD
      tldSymbol, // symbol
      signer.address, // TLD owner
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('TLD already exists or forbidden');
  });

  it("should fail to create a new valid TLD if TLD name is too long", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    // try to create a TLD with the same name
    await expect(contract.createTld(
      ".renew3dfferopfmeomeriovneriovneriovndferfgergf", // TLD
      tldSymbol, // symbol
      signer.address, // TLD owner
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('TLD too long');

  });

  it("should fail to create a new valid TLD if TLD name is forbidden", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    // try to create a TLD that's on the forbidden list
    await expect(contract.createTld(
      ".com", // TLD
      "COM", // symbol
      signer.address, // TLD owner
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('TLD already exists or forbidden');

  });

});
