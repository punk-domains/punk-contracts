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
  let tldContract;
  let receiverContract;
  let ownerContract;

  let signer;
  let user1;
  let user2;

  const domainPrice = ethers.utils.parseUnits("1", "ether");

  beforeEach(async function () {
    [signer, user1, user2] = await ethers.getSigners();

    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("PunkTLDFactory");
    const factoryContract = await PunkTLDFactory.deploy(domainPrice, forbTldsContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    // TLD contracts
    const PunkTLD = await ethers.getContractFactory("PunkTLD");

    // .L2 TLD
    tldContract = await PunkTLD.deploy(
      ".op", // name
      ".OP", // symbol
      signer.address, // TLD owner
      domainPrice, // domain price
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
      receiverContract.address,
      tldContract.address
    );

    // transfer TLD ownership to the owner contract
    await tldContract.transferOwnership(ownerContract.address);
  });

  it("should confirm TLD name & symbol", async function () {
    const tldName = await tldContract.name();
    expect(tldName).to.equal(".op");
    const tldSymbol = await tldContract.symbol();
    expect(tldSymbol).to.equal(".OP");
  });

  it("should redirect funds from a domain sale", async function () {
    const receiverBalanceBefore = await waffle.provider.getBalance(receiverContract.address);
    expect(ethers.utils.formatEther(receiverBalanceBefore)).to.equal("0.0");

    // mint a new .op domain
    const tx = await tldContract.connect(user1).mint(
      "user1",
      user1.address, // holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay for the domain
      }
    );

    const receipt = await tx.wait();

    calculateGasCosts("Domain purchase", receipt);

    const receiverBalanceAfter = await waffle.provider.getBalance(receiverContract.address);
    expect(ethers.utils.formatEther(receiverBalanceAfter)).to.equal("1.0");
  });

  it("should transfer TLD ownership to another address (only owner)", async function () {
    const ownerBefore = await tldContract.owner();
    expect(ownerBefore).to.equal(ownerContract.address);

    await ownerContract.transferTldOwnership(user2.address);

    const ownerAfter = await tldContract.owner();
    expect(ownerAfter).to.equal(user2.address);

    await expect(ownerContract.connect(user1).transferTldOwnership(
      user1.address
    )).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change domain price (only owner)", async function () {
    const priceBefore = await tldContract.price();
    expect(priceBefore).to.equal(domainPrice);

    const newPrice = ethers.utils.parseUnits("2", "ether");

    await ownerContract.changeTldPrice(
      newPrice
    );

    const priceAfter = await tldContract.price();
    expect(priceAfter).to.equal(newPrice);

    // if user is not owner, the tx should revert
    await expect(ownerContract.connect(user1).changeTldPrice(domainPrice)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change referral fee (only owner)", async function () {
    const refBefore = await tldContract.referral();
    expect(refBefore).to.equal(1000);

    const newRef = 2500;

    await ownerContract.changeTldReferralFee(newRef);

    const refAfter = await tldContract.referral();
    expect(refAfter).to.equal(newRef);

    // if user is not owner, the tx should revert
    await expect(ownerContract.connect(user1).changeTldReferralFee(666)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change max domain name length (only owner)", async function () {
    const before = await tldContract.nameMaxLength();
    expect(before).to.equal(140);

    const newLen = 69;
    await ownerContract.changeMaxDomainNameLength(newLen);

    const after = await tldContract.nameMaxLength();
    expect(after).to.equal(newLen);

    // if user is not owner, the tx should revert
    await expect(ownerContract.connect(user1).changeMaxDomainNameLength(420)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change TLD metadata description (only owner)", async function () {
    const desBefore = await tldContract.description();
    expect(desBefore).to.equal("Punk Domains digital identity. Visit https://punk.domains/");

    const newDes = "Get yourself a .OP domain and donate to public goods funding!";

    await ownerContract.changeTldDescription(newDes);

    const desAfter = await tldContract.description();
    expect(desAfter).to.equal(newDes);

    // if user is not owner, the tx should revert
    await expect(ownerContract.connect(user1).changeTldDescription("pwned")).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should recover ERC-20 tokens mistakenly sent to contract address", async function () {
    const ERC20MockToken = await ethers.getContractFactory("MockErc20Token");
    const mockErc20Contract = await ERC20MockToken.deploy("Mock", "MOCK");

    const signerBalance = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance))).to.equal(1000); // 1000 tokens minted in the ERC20 contract constructor

    const mintContractBalance = await mockErc20Contract.balanceOf(ownerContract.address);
    expect(mintContractBalance).to.equal(0); // should be 0

    // send 200 tokens to contract
    await mockErc20Contract.transfer(ownerContract.address, ethers.utils.parseEther("200"));

    const signerBalance2 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance2))).to.equal(800);

    const mintContractBalance2 = await mockErc20Contract.balanceOf(ownerContract.address);
    expect(Number(ethers.utils.formatEther(mintContractBalance2))).to.equal(200);

    // recover tokens from contract
    await ownerContract.recoverERC20(
      mockErc20Contract.address, // token address
      ethers.utils.parseEther("200"), // token amount
      signer.address // recipient
    );

    const signerBalance3 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance3))).to.equal(1000); // back to 1000

    const mintContractBalance3 = await mockErc20Contract.balanceOf(ownerContract.address);
    expect(Number(ethers.utils.formatEther(mintContractBalance3))).to.equal(0); // back to 0
  });

});
