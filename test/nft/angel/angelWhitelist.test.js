// npx hardhat test test/nft/angel/angelWhitelist.test.js
const { expect } = require("chai");

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const matic = 0.7;
  const eth = 1800;
  
  const gasCostMatic = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("35", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("55", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostArbitrum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Arbitrum): $" + String(Number(gasCostArbitrum)*eth));
  console.log(testName + " gas cost (Polygon): $" + String(Number(gasCostMatic)*matic));
}

describe("Punk Angel Whitelist", function () {
  let contract;
  let signer;
  let user1;
  let user2;

  beforeEach(async function () {
    [signer, user1, user2] = await ethers.getSigners();

    const PunkAngelWhitelist = await ethers.getContractFactory("PunkAngelWhitelist");
    contract = await PunkAngelWhitelist.deploy();
  });

  it("should join the whitelist", async function () {
    const amount = 5000;

    // check if user1 is whitelisted
    const isWhitelistedBefore = await contract.isWhitelisted(user1.address);
    expect(isWhitelistedBefore).to.be.false;

    // check total whitelisted addresses
    const totalAddressesBefore = await contract.totalAddresses();
    expect(totalAddressesBefore).to.equal(0);

    // check total amount
    const totalAmountBefore = await contract.totalAmount();
    expect(totalAmountBefore).to.equal(0);

    await contract.togglePaused();

    // fail at whitelisting when contract is paused
    await expect(contract.connect(user1).joinWhitelist(
      amount
    )).to.be.revertedWith('Whitelisting is paused.');

    await contract.togglePaused();

    // whitelisting should now succeed
    const tx = await contract.connect(user1).joinWhitelist(amount);

    const receipt = await tx.wait()

    calculateGasCosts("Join Whitelist", receipt);

    const events = [];
    for (let item of receipt.events) {
      events.push(item.event);
    }

    expect(events).to.include("UserJoinWhitelist");

    // check if user1 is whitelisted
    const isWhitelistedAfter = await contract.isWhitelisted(user1.address);
    expect(isWhitelistedAfter).to.be.true;

    // check total whitelisted addresses
    const totalAddressesAfter = await contract.totalAddresses();
    expect(totalAddressesAfter).to.equal(1);

    // check total amount
    const totalAmountAfter = await contract.totalAmount();
    expect(totalAmountAfter).to.equal(amount);

    // whitelist the same user again
    const newAmount = 6000;

    const tx2 = await contract.connect(user1).joinWhitelist(newAmount);

    const receipt2 = await tx2.wait()

    calculateGasCosts("Join Whitelist Again", receipt2);

    const events2 = [];
    for (let item of receipt2.events) {
      events2.push(item.event);
    }

    expect(events2).to.include("UserJoinWhitelist");

    // check if user1 is whitelisted
    const isWhitelistedAfter2 = await contract.isWhitelisted(user1.address);
    expect(isWhitelistedAfter2).to.be.true;

    // check total whitelisted addresses
    const totalAddressesAfter2 = await contract.totalAddresses();
    expect(totalAddressesAfter2).to.equal(1);

    // check total amount
    const totalAmountAfter2 = await contract.totalAmount();
    expect(totalAmountAfter2).to.equal(newAmount);
  });

  it("should fail at whitelisting if amount is too high", async function () {
    await expect(contract.connect(user1).joinWhitelist(
      51000
    )).to.be.revertedWith('Amount is too high.');
  });

});
