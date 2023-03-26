// npx hardhat test test/other/deprecateTldTwo.test.js
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

describe("Deprecated TLDs contract test", function () {
  let oldTldContract;
  let newTldContract;
  let deprecateTldContract;

  let signer;
  let user1;
  let user2;

  const provider = waffle.provider;

  const oldDomainName = ".web3";
  const oldDomainSymbol = ".WEB3";
  const oldDomainPrice = ethers.utils.parseUnits("0.2", "ether");
  const oldDomainRoyalty = 2500; // royalty in bips (10 bips is 0.1%)

  const newDomainName = ".wagmi";
  const newDomainSymbol = ".WAGMI";
  const newDomainPrice = ethers.utils.parseUnits("0.1", "ether");
  const newDomainRoyalty = 2000; // royalty in bips (10 bips is 0.1%)

  beforeEach(async function () {
    [signer, user1, user2] = await ethers.getSigners();

    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const FlexiPunkMetadata = await ethers.getContractFactory("FlexiPunkMetadata");
    const metadataContract = await FlexiPunkMetadata.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("FlexiPunkTLDFactory");
    const factoryContract = await PunkTLDFactory.deploy(oldDomainPrice, forbTldsContract.address, metadataContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    const FlexiPunkTLD = await ethers.getContractFactory("FlexiPunkTLD");
    
    oldTldContract = await FlexiPunkTLD.deploy(
      oldDomainName,
      oldDomainSymbol,
      signer.address, // TLD owner
      oldDomainPrice,
      true, // buying enabled
      oldDomainRoyalty,
      factoryContract.address,
      metadataContract.address
    );

    newTldContract = await FlexiPunkTLD.deploy(
      newDomainName,
      newDomainSymbol,
      signer.address, // TLD owner
      newDomainPrice,
      true, // buying enabled
      newDomainRoyalty,
      factoryContract.address,
      metadataContract.address
    );

    const DeprecateTldTwo = await ethers.getContractFactory("DeprecateTldTwo");
    deprecateTldContract = await DeprecateTldTwo.deploy(
      oldDomainPrice, // refund amount
      oldTldContract.address,
      newDomainName,
      newTldContract.address
    );

    // add non-eligible token IDs
    await deprecateTldContract.addNonEligibleDomains([2, 4]);

    // give NFT approvals to the deprecateTldContract
    await oldTldContract.connect(signer).setApprovalForAll(deprecateTldContract.address, true);
    await oldTldContract.connect(user1).setApprovalForAll(deprecateTldContract.address, true);
    await oldTldContract.connect(user2).setApprovalForAll(deprecateTldContract.address, true);

    // send 100 ETH to the deprecateTldContract
    await signer.sendTransaction({
      to: deprecateTldContract.address,
      value: ethers.utils.parseEther("100")
    });
  });

  it("should confirm correct TLD names", async function () {
    const oldName = await oldTldContract.name();
    expect(oldName).to.equal(oldDomainName); 
    
    const newName = await newTldContract.name();
    expect(newName).to.equal(newDomainName);  
  });

  it("refund", async function () {
    // FAIL: try refunding when contract is paused
    await expect(deprecateTldContract.connect(user1).refund(
      "user1", // deprecate
      "user1", // new
      newDomainName,
      "user1a", // new
      newDomainName
    )).to.be.revertedWith('Contract paused');

    // unpause contract
    await deprecateTldContract.togglePaused();

    // FAIL: try refunding when user does not have the old domain
    await expect(deprecateTldContract.connect(user1).refund(
      "user1", // old
      "user1", // new
      newDomainName,
      "user1a", // new
      newDomainName
    )).to.be.revertedWith('DeprecateTldTwo: Sender is not domain holder.');

    // mint old domains for users
    await oldTldContract.mint( // #1
      "signer1", // domain name (without TLD)
      signer.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: oldDomainPrice // pay for the domain
      }
    )
    
    await oldTldContract.mint( // #2
      "signer2", // domain name (without TLD)
      signer.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: oldDomainPrice // pay for the domain
      }
    )

    await oldTldContract.mint( // #3
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: oldDomainPrice // pay for the domain
      }
    )

    await oldTldContract.mint( // #4
      "user2", // domain name (without TLD)
      user2.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: oldDomainPrice // pay for the domain
      }
    )

    await oldTldContract.mint( // #5
      "user22", // domain name (without TLD)
      user2.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: oldDomainPrice // pay for the domain
      }
    )

    // FAIL: try refund for non-existent domain
    await expect(deprecateTldContract.connect(user1).refund(
      "user11111111111", // old
      "user1", // new
      newDomainName,
      "user1a", // new
      newDomainName
    )).to.be.revertedWith('DeprecateTldTwo: Sender is not domain holder.');

    // FAIL: try refund and get a new domain which is not added to the selected new domains list
    await expect(deprecateTldContract.connect(user1).refund(
      "user1", // old
      "user1", // new
      oldDomainName, // this is not a new domain TLD name
      "user1a", // new
      newDomainName
    )).to.be.revertedWith('You cannot get a domain of this TLD as domain refund');

    // check user1 balance before the refund
    const balanceUser1Before = await provider.getBalance(user1.address);
    console.log("User1 balance before refund: " + ethers.utils.formatEther(balanceUser1Before));

    // SUCCESS: refund user who paid for a domain (refund eligible, receives money and new domain)
    await deprecateTldContract.connect(user1).refund(
      "user1", // old
      "user1", // new
      newDomainName,
      "user1a", // new
      newDomainName
    )

    // check user1 balance after the refund
    const balanceUser1After = await provider.getBalance(user1.address);
    console.log("User1 balance after refund: " + ethers.utils.formatEther(balanceUser1After));
    expect(balanceUser1After).to.be.gt(balanceUser1Before);

    // check user1 old TLD ownership
    const domainOwner1 = await oldTldContract.getDomainHolder("user1");
    expect(domainOwner1).to.equal(deprecateTldContract.address);

    // check user2 balance before the refund
    const balanceUser2Before = await provider.getBalance(user2.address);
    console.log("User2 balance before refund: " + ethers.utils.formatEther(balanceUser2Before));

    // SUCCESS: refund user who did not pay for a domain (only receives a new domain, no money)
    await deprecateTldContract.connect(user2).refund(
      "user2", // old
      "user2", // new
      newDomainName,
      "user2a", // new
      newDomainName
    )

    // check user2 balance after the refund (no money refund, just a new domain)
    const balanceUser2After = await provider.getBalance(user2.address);
    console.log("User2 balance after refund: " + ethers.utils.formatEther(balanceUser2After));
    expect(balanceUser2After).to.be.lt(balanceUser2Before);

    // check user1 old TLD ownership
    const domainOwner2 = await oldTldContract.getDomainHolder("user2");
    expect(domainOwner2).to.equal(deprecateTldContract.address);

    // FAIL: try to get refund again for a domain that was already refunded
    await expect(deprecateTldContract.connect(user1).refund(
      "user1", // already refunded
      "user1", // new
      newDomainName,
      "user1a", // new
      newDomainName
    )).to.be.revertedWith('DeprecateTldTwo: Sender is not domain holder.');
  });

});
