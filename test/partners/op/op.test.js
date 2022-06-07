// Run tests:
// npx hardhat test test/partners/op/op.test.js 

const { expect, assert } = require("chai");

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const eth = 2000;
  
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("100", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostOptimism = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1.25", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Optimism): $" + String(Number(gasCostOptimism)*eth));
}

describe("PunkOpPgf (redirect OP sales to PGF)", function () {
  let tldContract1;
  let tldContract2;
  let receiverContract;
  let ownerContract;

  let signer;
  let user1;
  let user2;

  const domainPrice1 = ethers.utils.parseUnits("1", "ether");
  const domainPrice2 = ethers.utils.parseUnits("2", "ether");

  beforeEach(async function () {
    [signer, user1, user2] = await ethers.getSigners();

    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("PunkTLDFactory");
    const factoryContract = await PunkTLDFactory.deploy(domainPrice1, forbTldsContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    // TLD contracts
    const PunkTLD = await ethers.getContractFactory("PunkTLD");

    // .op TLD
    tldContract1 = await PunkTLD.deploy(
      ".op", // name
      ".OP", // symbol
      signer.address, // TLD owner
      domainPrice1, // domain price
      true, // buying enabled
      0, // royalty (0%)
      factoryContract.address
    );

    // .optimism TLD
    tldContract2 = await PunkTLD.deploy(
      ".optimism", // name
      ".OPTIMISM", // symbol
      signer.address, // TLD owner
      domainPrice2, // domain price
      true, // buying enabled
      0, // royalty (0%)
      factoryContract.address
    );

    // Asset Receiver contract
    const AssetReceiver = await ethers.getContractFactory("AssetReceiver");
    receiverContract = await AssetReceiver.deploy(signer.address);

    // Owner contract
    const PunkOpPgf = await ethers.getContractFactory("PunkOpPgf");
    ownerContract = await PunkOpPgf.deploy(
      receiverContract.address
    );

    // transfer TLDs ownership to the owner contract
    await tldContract1.transferOwnership(ownerContract.address);
    await tldContract2.transferOwnership(ownerContract.address);
  });

  it("should confirm TLD name & symbol", async function () {
    const tldName1 = await tldContract1.name();
    expect(tldName1).to.equal(".op");

    const tldSymbol1 = await tldContract1.symbol();
    expect(tldSymbol1).to.equal(".OP");
    
    const tldName2 = await tldContract2.name();
    expect(tldName2).to.equal(".optimism");

    const tldSymbol2 = await tldContract2.symbol();
    expect(tldSymbol2).to.equal(".OPTIMISM");
  });

  it("should redirect funds from a domain sale", async function () {
    const receiverBalanceBefore = await waffle.provider.getBalance(receiverContract.address);
    expect(ethers.utils.formatEther(receiverBalanceBefore)).to.equal("0.0");

    // mint a new .op domain
    const tx = await tldContract1.connect(user1).mint(
      "user1",
      user1.address, // holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice1 // pay for the domain
      }
    );

    const receipt = await tx.wait();

    calculateGasCosts("Domain purchase (.op)", receipt);

    const receiverBalanceAfter1 = await waffle.provider.getBalance(receiverContract.address);
    expect(ethers.utils.formatEther(receiverBalanceAfter1)).to.equal("1.0");

    // mint a new .optimism domain
    const tx2 = await tldContract2.connect(user1).mint(
      "user1",
      user1.address, // holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice2 // pay for the domain
      }
    );

    const receipt2 = await tx2.wait();

    calculateGasCosts("Domain purchase (.optimism)", receipt2);

    const receiverBalanceAfter2 = await waffle.provider.getBalance(receiverContract.address);
    expect(ethers.utils.formatEther(receiverBalanceAfter2)).to.equal("3.0");
  });

  it("should transfer TLD ownership to another address (only owner)", async function () {
    const ownerBefore = await tldContract1.owner();
    expect(ownerBefore).to.equal(ownerContract.address);

    await ownerContract.transferTldOwnership(tldContract1.address, user2.address);

    const ownerAfter = await tldContract1.owner();
    expect(ownerAfter).to.equal(user2.address);

    await expect(ownerContract.connect(user1).transferTldOwnership(
      tldContract1.address,
      user1.address
    )).to.be.revertedWith('Ownable: caller is not the owner');
    
    const ownerBefore2 = await tldContract2.owner();
    expect(ownerBefore2).to.equal(ownerContract.address);

    await ownerContract.transferTldOwnership(tldContract2.address, user2.address);

    const ownerAfter2 = await tldContract2.owner();
    expect(ownerAfter2).to.equal(user2.address);

    await expect(ownerContract.connect(user1).transferTldOwnership(
      tldContract2.address,
      user1.address
    )).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change domain price (only owner)", async function () {
    const priceBefore = await tldContract1.price();
    expect(priceBefore).to.equal(domainPrice1);

    const newPrice = ethers.utils.parseUnits("2", "ether");

    await ownerContract.changeTldPrice(
      tldContract1.address,
      newPrice
    );

    const priceAfter = await tldContract1.price();
    expect(priceAfter).to.equal(newPrice);

    // if user is not owner, the tx should revert
    await expect(ownerContract.connect(user1).changeTldPrice(tldContract1.address, domainPrice1)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change referral fee (only owner)", async function () {
    const refBefore = await tldContract1.referral();
    expect(refBefore).to.equal(1000);

    const newRef = 2500;

    await ownerContract.changeTldReferralFee(tldContract1.address, newRef);

    const refAfter = await tldContract1.referral();
    expect(refAfter).to.equal(newRef);

    // if user is not owner, the tx should revert
    await expect(ownerContract.connect(user1).changeTldReferralFee(tldContract1.address, 666)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change max domain name length (only owner)", async function () {
    const before = await tldContract1.nameMaxLength();
    expect(before).to.equal(140);

    const newLen = 69;
    await ownerContract.changeMaxDomainNameLength(tldContract1.address, newLen);

    const after = await tldContract1.nameMaxLength();
    expect(after).to.equal(newLen);

    // if user is not owner, the tx should revert
    await expect(ownerContract.connect(user1).changeMaxDomainNameLength(tldContract1.address, 420)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change TLD metadata description (only owner)", async function () {
    const desBefore = await tldContract1.description();
    expect(desBefore).to.equal("Punk Domains digital identity. Visit https://punk.domains/");

    const newDes = "Get yourself a .OP domain and donate to public goods funding!";

    await ownerContract.changeTldDescription(tldContract1.address, newDes);

    const desAfter = await tldContract1.description();
    expect(desAfter).to.equal(newDes);

    // if user is not owner, the tx should revert
    await expect(ownerContract.connect(user1).changeTldDescription(tldContract1.address, "pwned")).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should recover ERC-20 tokens mistakenly sent to contract address", async function () {
    const ERC20MockToken = await ethers.getContractFactory("MockErc20Token");
    const mockErc20Contract = await ERC20MockToken.deploy("Mock", "MOCK");

    const signerBalance = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance))).to.equal(1000); // 1000 tokens minted in the ERC20 contract constructor

    const ownerContractBalance = await mockErc20Contract.balanceOf(ownerContract.address);
    expect(ownerContractBalance).to.equal(0); // should be 0

    // send 200 tokens to contract
    await mockErc20Contract.transfer(ownerContract.address, ethers.utils.parseEther("200"));

    const signerBalance2 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance2))).to.equal(800);

    const ownerContractBalance2 = await mockErc20Contract.balanceOf(ownerContract.address);
    expect(Number(ethers.utils.formatEther(ownerContractBalance2))).to.equal(200);

    // recover tokens from contract
    await ownerContract.recoverERC20(
      mockErc20Contract.address, // token address
      ethers.utils.parseEther("200"), // token amount
      signer.address // recipient
    );

    const signerBalance3 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance3))).to.equal(1000); // back to 1000

    const ownerContractBalance3 = await mockErc20Contract.balanceOf(ownerContract.address);
    expect(Number(ethers.utils.formatEther(ownerContractBalance3))).to.equal(0); // back to 0
  });

});
