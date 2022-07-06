// Run tests:
// npx hardhat test test/partners/huwa/huwa.test.js 

const { expect } = require("chai");
const partnerContractName = "HuwaDomainMinter";

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const eth = 1000;
  
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("20", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostArbitrum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1.25", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Arbitrum): $" + String(Number(gasCostArbitrum)*eth));
}

describe(partnerContractName + " (partner contract)", function () {
  let tldContract;
  const tldName = ".huwa";
  const tldSymbol = ".HUWA";
  const tldPrice = 0;
  const tldRoyalty = 0;
  const tldReferral = 0;

  let paymentTokenContract;
  const paymentTokenDecimals = 4; // $HUWA has 4 decimals
  const paymentTokenName = "HUWA";
  const paymentTokenSymbol = "HUWA";

  let mintContract;
  const minterPrice = ethers.utils.parseUnits("20", paymentTokenDecimals); // in $HUWA tokens (4 decimals)

  let signer;
  let user1;
  let user2;

  beforeEach(async function () {
    [signer, user1, user2] = await ethers.getSigners();

    //----
    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const FlexiPunkMetadata = await ethers.getContractFactory("FlexiPunkMetadata");
    const metadataContract = await FlexiPunkMetadata.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("FlexiPunkTLDFactory");
    const priceToCreateTld = ethers.utils.parseUnits("100", "ether");
    const factoryContract = await PunkTLDFactory.deploy(priceToCreateTld, forbTldsContract.address, metadataContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    const PunkTLD = await ethers.getContractFactory("FlexiPunkTLD");
    tldContract = await PunkTLD.deploy(
      tldName,
      tldSymbol,
      signer.address, // TLD owner
      tldPrice,
      false, // buying enabled
      tldRoyalty,
      factoryContract.address,
      metadataContract.address
    );

    // Create mock payment token
    const Erc20ContractDecimals = await ethers.getContractFactory("MockErc20TokenDecimals");
    paymentTokenContract = await Erc20ContractDecimals.deploy(paymentTokenName, paymentTokenSymbol, paymentTokenDecimals);

    // transfer all signer's tokens to user1
    paymentTokenContract.transfer(user1.address, ethers.utils.parseUnits("1000", paymentTokenDecimals));

    // Minter contract
    const minterCode = await ethers.getContractFactory(partnerContractName);
    mintContract = await minterCode.deploy(
      paymentTokenContract.address, // payment token address
      tldContract.address, // TLD address
    );

    // set minter contract as TLD minter address
    await tldContract.changeMinter(mintContract.address);
  });

  it("should confirm TLD name & symbol", async function () {
    const _tldName = await tldContract.name();
    expect(_tldName).to.equal(tldName);
    const _tldSymbol = await tldContract.symbol();
    expect(_tldSymbol).to.equal(tldSymbol);
  });

  it("should mint a new domain", async function () {

    await mintContract.togglePaused();

    // user1 has 1000 payment tokens

    // Give payment token allowance
    await paymentTokenContract.connect(user1).approve(
      mintContract.address, // spender
      minterPrice // amount
    );

    // how many domains user1 has before minting
    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    // TLD contract owner's balance before minting
    const ownerBalanceBefore = await paymentTokenContract.balanceOf(signer.address);
    expect(ownerBalanceBefore).to.equal(0);
    console.log("Signer's payment token balance before first mint: " + ethers.utils.formatUnits(ownerBalanceBefore, paymentTokenDecimals) + " " + paymentTokenSymbol);

    // Mint a domain
    const tx = await mintContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
    );

    const receipt = await tx.wait();

    calculateGasCosts("Mint", receipt);
    
    const balanceDomainAfter = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(1);

    const domainHolder = await tldContract.getDomainHolder("user1");
    expect(domainHolder).to.equal(user1.address);

    // TLD contract owner's balance after minting
    const ownerBalanceAfter = await paymentTokenContract.balanceOf(signer.address);
    expect(ownerBalanceAfter).to.equal(minterPrice); // signer gets both royalty and the rest of the domain payment
    console.log("Signer's payment token balance after first mint: " + ethers.utils.formatUnits(ownerBalanceAfter, paymentTokenDecimals) + " " + paymentTokenSymbol);

    // Give payment token allowance
    await paymentTokenContract.connect(user1).approve(
      mintContract.address, // spender
      minterPrice // amount
    );

    // should not fail at minting another domain
    await mintContract.connect(user1).mint(
      "user1second", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
    );

    const balanceDomainAfter2 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter2).to.equal(2);
  });

  it("should change domain price (only owner)", async function () {
    const priceBefore = await mintContract.price();
    expect(priceBefore).to.equal(minterPrice);

    const newPrice = ethers.utils.parseUnits("200", paymentTokenDecimals); // domain price is in payment tokens

    await mintContract.changePrice(
      newPrice
    );

    const priceAfter = await mintContract.price();
    expect(priceAfter).to.equal(newPrice);

    // cannot be zero
    await expect(mintContract.changePrice(0)).to.be.revertedWith('Cannot be zero');
    
    // if user is not owner, the tx should revert
    await expect(mintContract.connect(user1).changePrice(123456)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change referral fee (only owner)", async function () {
    const refBefore = await mintContract.referralFee();
    expect(refBefore).to.equal(1000);

    const newRef = 1500;

    await mintContract.changeReferralFee(newRef);

    const refAfter = await mintContract.referralFee();
    expect(refAfter).to.equal(newRef);

    // cannot exceed 20%
    await expect(mintContract.changeReferralFee(2100)).to.be.revertedWith('Cannot exceed 20%');

    // if user is not owner, the tx should revert
    await expect(mintContract.connect(user1).changeReferralFee(666)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change royalty fee (only royalty fee updater)", async function () {
    const rBefore = await mintContract.royaltyFee();
    expect(rBefore).to.equal(2000);

    const newFee = 1500;

    await mintContract.changeRoyaltyFee(newFee);

    const rAfter = await mintContract.royaltyFee();
    expect(rAfter).to.equal(newFee);

    // cannot exceed 30%
    await expect(mintContract.changeRoyaltyFee(3100)).to.be.revertedWith('Cannot exceed 30%');

    // if user is not owner, the tx should revert
    await expect(mintContract.connect(user1).changeRoyaltyFee(666)).to.be.revertedWith('Minter: Caller is not royalty fee receiver');
  });

  it("should recover ERC-20 tokens mistakenly sent to contract address", async function () {
    const ERC20MockToken = await ethers.getContractFactory("MockErc20Token");
    const mockErc20Contract = await ERC20MockToken.deploy("Mock", "MOCK");

    const signerBalance = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance))).to.equal(1000); // 1000 tokens minted in the ERC20 contract constructor

    const mintContractBalance = await mockErc20Contract.balanceOf(mintContract.address);
    expect(mintContractBalance).to.equal(0); // should be 0

    // send 200 tokens to contract
    await mockErc20Contract.transfer(mintContract.address, ethers.utils.parseEther("200"));

    const signerBalance2 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance2))).to.equal(800);

    const mintContractBalance2 = await mockErc20Contract.balanceOf(mintContract.address);
    expect(Number(ethers.utils.formatEther(mintContractBalance2))).to.equal(200);

    // recover tokens from contract
    await mintContract.recoverERC20(
      mockErc20Contract.address, // token address
      ethers.utils.parseEther("200"), // token amount
      signer.address // recipient
    );

    const signerBalance3 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance3))).to.equal(1000); // back to 1000

    const mintContractBalance3 = await mockErc20Contract.balanceOf(mintContract.address);
    expect(Number(ethers.utils.formatEther(mintContractBalance3))).to.equal(0); // back to 0
  });

});
