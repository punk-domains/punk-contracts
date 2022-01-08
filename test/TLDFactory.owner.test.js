const { expect } = require("chai");

describe("Web3PandaTLDFactory (onlyOwner)", function () {
  let contract;
  let signer;

  const tldPrice = ethers.utils.parseUnits("1", "ether");

  beforeEach(async function () {
    [signer] = await ethers.getSigners();

    const Web3PandaTLDFactory = await ethers.getContractFactory("Web3PandaTLDFactory");
    contract = await Web3PandaTLDFactory.deploy(tldPrice);
  });

  it("should create a new valid TLD through ownerCreateTld()", async function () {
    await expect(contract.ownerCreateTld(
      ".web3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false // buying enabled
    )).to.emit(contract, "TldCreated");
  });

  it("should fail to create a new valid TLD if more than 1 dot in the name", async function () {
    await expect(contract.ownerCreateTld(
      ".web.3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false // buying enabled
    )).to.be.revertedWith('There should be exactly one dot in the name');
  });

  it("should fail to create a new valid TLD if no dot in the name", async function () {
    await expect(contract.ownerCreateTld(
      "web3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false // buying enabled
    )).to.be.revertedWith('There should be exactly one dot in the name');
  });

  it("should fail to create a new valid TLD if name does not start with dot", async function () {
    await expect(contract.ownerCreateTld(
      "web.3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false // buying enabled
    )).to.be.revertedWith('The dot must be at the start of the TLD name');
  });

  it("should fail to create a new valid TLD if name is of length 1", async function () {
    await expect(contract.ownerCreateTld(
      ".", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false // buying enabled
    )).to.be.revertedWith('The TLD name must be longer than 1 character');
  });

  it("should fail to create a new valid TLD with empty name", async function () {
    await expect(contract.ownerCreateTld(
      "", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false // buying enabled
    )).to.be.revertedWith('The TLD name must be longer than 1 character');
  });

  it("should fail to create a new valid TLD if TLD with this name already exists", async function () {
    // create a valid TLD
    await expect(contract.ownerCreateTld(
      ".web3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false // buying enabled
    )).to.emit(contract, "TldCreated");

    // try to create a TLD with the same name
    await expect(contract.ownerCreateTld(
      ".web3", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false // buying enabled
    )).to.be.revertedWith('TLD with this name already exists');
  });

  it("should fail to create a new valid TLD if TLD name is too long", async function () {
    // try to create a TLD with the same name
    await expect(contract.ownerCreateTld(
      ".web3dfferopfmeomeriovneriovneriovndferfgergf", // TLD
      "WEB3", // symbol
      signer.address, // TLD owner
      ethers.utils.parseUnits("0.2", "ether"), // domain price
      false // buying enabled
    )).to.be.revertedWith('The TLD name is too long');

  });

});
