// Run tests:
// npx hardhat test test/partners/klima/klima.test.js 

const { expect } = require("chai");

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const eth = 3500;
  const matic = 2;
  
  const gasCostMatic = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("35", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("100", "gwei")) * Number(receipt.gasUsed)), "ether");
  
  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Polygon): $" + String(Number(gasCostMatic)*matic));
}

describe("KlimaPunkDomains (partner contract)", function () {
  let tldContract;
  let wrapperContract;
  let usdcContract;
  let knsRetirerContract;

  let signer;
  let user1;
  let user2;
  let royaltyFeeUpdater;

  const usdcDecimals = 6;
  const domainPrice = ethers.utils.parseUnits("100", usdcDecimals); // domain price is in USDC (mwei, 6 decimals)

  beforeEach(async function () {
    [signer, user1, user2, royaltyFeeUpdater] = await ethers.getSigners();

    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("PunkTLDFactory");
    const factoryContract = await PunkTLDFactory.deploy(ethers.utils.parseUnits("1", "ether"), forbTldsContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    // TLD contracts
    const PunkTLD = await ethers.getContractFactory("PunkTLD");

    // .L2 TLD
    tldContract = await PunkTLD.deploy(
      ".klima", // name
      ".KLIMA", // symbol
      signer.address, // temp TLD owner
      0, // domain price is set to 0 in the TLD contract (price will be in the wrapper contract instead)
      false, // buying enabled
      0, // royalty (will be set in wrapper contract instead)
      factoryContract.address
    );

    // Mock USDC contract
    const Erc20ContractDecimals = await ethers.getContractFactory("MockErc20TokenDecimals");
    usdcContract = await Erc20ContractDecimals.deploy("USD Coin", "USDC", usdcDecimals);

    // Mock KNS Retirer contract
    const KnsRetirer = await ethers.getContractFactory("MockKNSRetirer");
    knsRetirerContract = await KnsRetirer.deploy(usdcContract.address);

    // Whitelisted minting contract
    const KlimaPunkDomains = await ethers.getContractFactory("KlimaPunkDomains");
    wrapperContract = await KlimaPunkDomains.deploy(
      knsRetirerContract.address, // KNS Retirer contract address
      tldContract.address, // .klima TLD address
      usdcContract.address, // TODO: USDC address
      domainPrice, // domain price in USDC (6 decimals, mwei)
      royaltyFeeUpdater.address
    );

    // transfer TLD ownership to the Mint contract
    await tldContract.transferOwnership(wrapperContract.address);
  });

  it("should confirm TLD name & symbol", async function () {
    const tldName = await tldContract.name();
    expect(tldName).to.equal(".klima");
    const tldSymbol = await tldContract.symbol();
    expect(tldSymbol).to.equal(".KLIMA");
  });

  it("should transfer TLD ownership to another address (only owner)", async function () {
    const tldOwnerBefore = await tldContract.owner();
    expect(tldOwnerBefore).to.equal(wrapperContract.address); // wrapper contract is the TLD owner

    await wrapperContract.transferTldOwnership(user2.address); // transfer TLD ownership to user2

    const tldOwnerAfter = await tldContract.owner();
    expect(tldOwnerAfter).to.equal(user2.address); // user2 is now TLD owner

    await expect(wrapperContract.connect(user1).transferTldOwnership(
      user1.address
    )).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should mint a new domain", async function () {
    // should fail at minting because minting is paused
    await expect(wrapperContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      "retirement message"
    )).to.be.revertedWith('Minting paused');

    // enable minting
    await wrapperContract.togglePaused();

    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    const wrapperBalanceBefore = await usdcContract.balanceOf(wrapperContract.address);
    expect(wrapperBalanceBefore).to.equal(0);
    //console.log("Wrapper contract USDC balance before first mint: " + ethers.utils.formatUnits(wrapperBalanceBefore, usdcDecimals) + " USDC");

    const knsBalanceBefore = await usdcContract.balanceOf(knsRetirerContract.address);
    expect(knsBalanceBefore).to.equal(0);
    //console.log("KNS contract USDC balance before first mint: " + ethers.utils.formatUnits(knsBalanceBefore, usdcDecimals) + " USDC");

    // give user1 100 USDC
    await usdcContract.mint(user1.address, ethers.utils.parseUnits("300", usdcDecimals));

    // Give USDC allowance
    await usdcContract.connect(user1).approve(
      wrapperContract.address, // spender
      domainPrice // amount
    );

    // Mint a domain
    const tx = await wrapperContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      "This is my BCT retirement message" // retirement message
    );

    const receipt = await tx.wait();

    calculateGasCosts("Domain Mint", receipt);

    const balanceDomainAfter = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(1);

    const domainHolder = await tldContract.getDomainHolder("user1");
    expect(domainHolder).to.equal(user1.address);

    const wrapperBalanceAfter = await usdcContract.balanceOf(wrapperContract.address);
    expect(wrapperBalanceAfter).to.equal(0); // wrapper contract does not hold USDC from domain mints
    //console.log("Wrapper contract USDC balance after successful mint: " + ethers.utils.formatUnits(wrapperBalanceAfter, usdcDecimals) + " USDC");

    const knsBalanceAfter = await usdcContract.balanceOf(knsRetirerContract.address);
    expect(knsBalanceAfter).to.equal(ethers.utils.parseUnits("81", usdcDecimals));
    //console.log("KNS contract USDC balance after successful mint: " + ethers.utils.formatUnits(knsBalanceAfter, usdcDecimals) + " USDC");

    // Give USDC allowance
    await usdcContract.connect(user1).approve(
      wrapperContract.address, // spender
      domainPrice // amount
    );

    // should fail at minting existing domain
    await expect(wrapperContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      "This will fail" // retirement message
    )).to.be.revertedWith('Domain with this name already exists');

    const wrapperBalanceAfter2 = await usdcContract.balanceOf(wrapperContract.address);
    expect(wrapperBalanceAfter2).to.equal(0); // wrapper contract does not hold USDC from domain mints
    //console.log("Wrapper contract USDC balance after unsuccessful mint: " + ethers.utils.formatUnits(wrapperBalanceAfter2, usdcDecimals) + " USDC");

    const knsBalanceAfter2 = await usdcContract.balanceOf(knsRetirerContract.address);
    expect(knsBalanceAfter2).to.equal(ethers.utils.parseUnits("81", usdcDecimals));
    //console.log("KNS contract USDC balance after unsuccessful mint: " + ethers.utils.formatUnits(knsBalanceAfter2, usdcDecimals) + " USDC");

    // Give USDC allowance
    await usdcContract.connect(user1).approve(
      wrapperContract.address, // spender
      domainPrice // amount
    );
  
    // should mint another domain
    await wrapperContract.connect(user1).mint(
      "user1another", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      "" // no retirement message added
    );

    const wrapperBalanceAfter3 = await usdcContract.balanceOf(wrapperContract.address);
    expect(wrapperBalanceAfter3).to.equal(0); // wrapper contract does not hold USDC from domain mints
    //console.log("Wrapper contract USDC balance after successful mint: " + ethers.utils.formatUnits(wrapperBalanceAfter3, usdcDecimals) + " USDC");

    const knsBalanceAfter3 = await usdcContract.balanceOf(knsRetirerContract.address);
    expect(knsBalanceAfter3).to.equal(ethers.utils.parseUnits("162", usdcDecimals));
    //console.log("KNS contract USDC balance after successful mint: " + ethers.utils.formatUnits(knsBalanceAfter3, usdcDecimals) + " USDC");
  });

  it("should change domain price (only owner)", async function () {
    const priceBefore = await wrapperContract.price();
    expect(priceBefore).to.equal(domainPrice);

    const newPrice = ethers.utils.parseUnits("200", usdcDecimals); // domain price is in USDC (mwei, 6 decimals)

    await wrapperContract.changePrice(
      newPrice
    );

    const priceAfter = await wrapperContract.price();
    expect(priceAfter).to.equal(newPrice);

    // cannot be zero
    await expect(wrapperContract.changePrice(0)).to.be.revertedWith('Cannot be zero');
    
    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).changePrice(domainPrice)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change referral fee (only owner)", async function () {
    const refBefore = await wrapperContract.referralFee();
    expect(refBefore).to.equal(1000);

    const newRef = 1500;

    await wrapperContract.changeReferralFee(newRef);

    const refAfter = await wrapperContract.referralFee();
    expect(refAfter).to.equal(newRef);

    // cannot exceed 20%
    await expect(wrapperContract.changeReferralFee(2100)).to.be.revertedWith('Cannot exceed 20%');

    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).changeReferralFee(666)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change max domain name length (only owner)", async function () {
    const before = await tldContract.nameMaxLength();
    expect(before).to.equal(140);

    const newLen = 69;
    await wrapperContract.changeMaxDomainNameLength(newLen);

    const after = await tldContract.nameMaxLength();
    expect(after).to.equal(newLen);

    // cannot be zero
    await expect(wrapperContract.changeMaxDomainNameLength(0)).to.be.revertedWith('Cannot be zero');

    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).changeMaxDomainNameLength(420)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change TLD metadata description (only owner)", async function () {
    const desBefore = await tldContract.description();
    expect(desBefore).to.equal("Punk Domains digital identity. Visit https://punk.domains/");

    const newDes = "Get yourself a .klima domain by Gwami Labs and Punk Domains!";

    await wrapperContract.changeTldDescription(newDes);

    const desAfter = await tldContract.description();
    expect(desAfter).to.equal(newDes);

    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).changeTldDescription("pwned")).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change royalty fee (only Royalty Fee Updater)", async function () {
    const rBefore = await wrapperContract.royaltyFee();
    expect(rBefore).to.equal(1900);

    const newFee = 1500;

    await wrapperContract.connect(royaltyFeeUpdater).changeRoyaltyFee(newFee);

    const rAfter = await wrapperContract.royaltyFee();
    expect(rAfter).to.equal(newFee);

    // if user is not Royalty Fee Updater, the tx should revert
    await expect(wrapperContract.changeRoyaltyFee(666)).to.be.revertedWith('Wrapper: Caller is not royalty fee updater');
    await expect(wrapperContract.connect(user1).changeRoyaltyFee(666)).to.be.revertedWith('Wrapper: Caller is not royalty fee updater');
  
    // change the royalty fee updater address
    await wrapperContract.connect(royaltyFeeUpdater).changeRoyaltyFeeUpdater(signer.address);

    const newFee2 = 1800;

    await wrapperContract.connect(signer).changeRoyaltyFee(newFee2);

    const rAfter2 = await wrapperContract.royaltyFee();
    expect(rAfter2).to.equal(newFee2);

    // if user is not Royalty Fee Updater, the tx should revert
    await expect(wrapperContract.connect(royaltyFeeUpdater).changeRoyaltyFee(666)).to.be.revertedWith('Wrapper: Caller is not royalty fee updater');
    await expect(wrapperContract.connect(user1).changeRoyaltyFee(666)).to.be.revertedWith('Wrapper: Caller is not royalty fee updater');
  });

  it("should recover ERC-20 tokens mistakenly sent to contract address", async function () {
    const ERC20MockToken = await ethers.getContractFactory("MockErc20Token");
    const mockErc20Contract = await ERC20MockToken.deploy("Mock", "MOCK");

    const signerBalance = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance))).to.equal(1000); // 1000 tokens minted in the ERC20 contract constructor

    const wrapperContractBalance = await mockErc20Contract.balanceOf(wrapperContract.address);
    expect(wrapperContractBalance).to.equal(0); // should be 0

    // send 200 tokens to contract
    await mockErc20Contract.transfer(wrapperContract.address, ethers.utils.parseEther("200"));

    const signerBalance2 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance2))).to.equal(800);

    const wrapperContractBalance2 = await mockErc20Contract.balanceOf(wrapperContract.address);
    expect(Number(ethers.utils.formatEther(wrapperContractBalance2))).to.equal(200);

    // recover tokens from contract
    await wrapperContract.recoverERC20(
      mockErc20Contract.address, // token address
      ethers.utils.parseEther("200"), // token amount
      signer.address // recipient
    );

    const signerBalance3 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance3))).to.equal(1000); // back to 1000

    const wrapperContractBalance3 = await mockErc20Contract.balanceOf(wrapperContract.address);
    expect(Number(ethers.utils.formatEther(wrapperContractBalance3))).to.equal(0); // back to 0
  });

});
