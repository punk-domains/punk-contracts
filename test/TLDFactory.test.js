const { expect } = require("chai");

describe("Web3PandaTLDFactory", function () {
  let contract;
  let signer;

  const tldPrice = ethers.utils.parseUnits("1", "ether");

  beforeEach(async function () {
    [signer] = await ethers.getSigners();

    const Web3PandaTLDFactory = await ethers.getContractFactory("Web3PandaTLDFactory");
    contract = await Web3PandaTLDFactory.deploy(tldPrice);
  });

  it("should return 4 forbidden TLD names defined in the constructor", async function () {
    const forbiddenArray = await contract.getForbiddenTldsArray();
    expect(forbiddenArray).to.have.members([".com", ".eth", ".org", ".net"]);
  });

  it("should create a new valid TLD", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      ".web3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.emit(contract, "TldCreated");

    // get TLD from array by index
    const firstTld = await contract.tlds(0);
    expect(firstTld).to.equal(".web3");
  });

  it("should fail to create a new valid TLD if buying TLDs is disabled", async function () {
    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      ".web3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('Buying TLDs is disabled');
  });

  it("should fail to create a new valid TLD if payment is too low", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      ".web3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
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
      ".web.3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('There should be exactly one dot in the name');
  });

  it("should fail to create a new valid TLD if no dot in the name", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      "web3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('There should be exactly one dot in the name');
  });

  it("should fail to create a new valid TLD if name does not start with dot", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      "web.3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('The dot must be at the start of the TLD name');
  });

  it("should fail to create a new valid TLD if name is of length 1", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      ".", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('The TLD name must be longer than 1 character');
  });

  it("should fail to create a new valid TLD with empty name", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    await expect(contract.createTld(
      "", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('The TLD name must be longer than 1 character');
  });

  it("should fail to create a new valid TLD if TLD with this name already exists", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    // create a valid TLD
    await expect(contract.createTld(
      ".web3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.emit(contract, "TldCreated");

    // try to create a TLD with the same name
    await expect(contract.createTld(
      ".web3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('TLD with this name already exists');
  });

  it("should fail to create a new valid TLD if TLD name is too long", async function () {
    await contract.toggleBuyingTlds(); // enable buying TLDs

    const price = await contract.price();
    expect(price).to.equal(tldPrice);

    // try to create a TLD with the same name
    await expect(contract.createTld(
      ".web3dfferopfmeomeriovneriovneriovndferfgergf", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false, // buying enabled
      {
        value: tldPrice // pay 1 ETH for the TLD
      }
    )).to.be.revertedWith('The TLD name is too long');

  });

});
