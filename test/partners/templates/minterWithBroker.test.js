// Run tests:
// npx hardhat test test/partners/templates/minterWithBroker.test.js 

const { expect } = require("chai");

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const eth = 1000;
  
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("20", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostArbitrum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1.25", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Arbitrum): $" + String(Number(gasCostArbitrum)*eth));
}

describe("Template: MinterWithBroker contract", function () {
  let tldContract;
  const tldName = ".broker";
  const tldSymbol = ".BROKER";
  const tldPrice = 0;
  const tldRoyalty = 0;

  const paymentTokenDecimals = 18; // ETH (18 decimals)

  let mintContract;
  const referralFee = 1000;
  const brokerFee = 5000;
  const royaltyFee = 1500;

  const price1char = ethers.utils.parseUnits("1", paymentTokenDecimals); // $10k
  const price2char = ethers.utils.parseUnits("0.5", paymentTokenDecimals);
  const price3char = ethers.utils.parseUnits("0.1", paymentTokenDecimals);
  const price4char = ethers.utils.parseUnits("0.05", paymentTokenDecimals);
  const price5char = ethers.utils.parseUnits("0.01", paymentTokenDecimals);

  let signer;
  let user1;
  let user2;
  let owner;
  let broker;

  beforeEach(async function () {
    [signer, user1, user2, owner, broker] = await ethers.getSigners();

    //----
    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const FlexiPunkMetadata = await ethers.getContractFactory("FlexiPunkMetadata");
    const flexiMetadataContract = await FlexiPunkMetadata.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("FlexiPunkTLDFactory");
    const priceToCreateTld = ethers.utils.parseUnits("100", "ether");
    const factoryContract = await PunkTLDFactory.deploy(priceToCreateTld, forbTldsContract.address, flexiMetadataContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    const PunkTLD = await ethers.getContractFactory("FlexiPunkTLD");
    tldContract = await PunkTLD.deploy(
      tldName,
      tldSymbol,
      signer.address, // TLD owner
      tldPrice,
      false,
      tldRoyalty,
      factoryContract.address,
      flexiMetadataContract.address
    );

    // Minter contract 
    const minterCode = await ethers.getContractFactory("MinterWithBroker");
    mintContract = await minterCode.deploy(
      broker.address,
      tldContract.address, // TLD address
      referralFee, royaltyFee, brokerFee,
      price1char, price2char, price3char, price4char, price5char // prices
    );

    // set minter contract as TLD minter address
    await tldContract.changeMinter(mintContract.address);

    // transfer TLD ownership to owner
    await tldContract.transferOwnership(owner.address);
    await mintContract.transferOwnership(owner.address);
  });

  it("should confirm TLD name & symbol", async function () {
    const _tldName = await tldContract.name();
    expect(_tldName).to.equal(tldName);
    const _tldSymbol = await tldContract.symbol();
    expect(_tldSymbol).to.equal(tldSymbol);
  });

  it("should mint two 5+ char domains", async function () {
    // should fail at minting before unpaused
    await expect(mintContract.connect(user1).mint(
      "123456", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: price5char // pay for the domain
      }
    )).to.be.revertedWith("Minting paused");

    // unpause the minter
    await mintContract.connect(owner).togglePaused();

    // how many domains user1 has before minting
    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    // TLD contract owner's balance before minting
    const ownerBalanceBefore = await waffle.provider.getBalance(owner.address);
    //expect().approximately(Number(ownerBalanceBefore), Number(ethers.utils.parseEther("10000")), Number(ethers.utils.parseEther("0.1")));
    console.log("Owner's balance before first mint: " + ethers.utils.formatEther(ownerBalanceBefore) + " ETH");

    // Mint a domain
    const tx = await mintContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: price5char // pay for the domain
      }
    );

    const receipt = await tx.wait();

    calculateGasCosts("Mint", receipt);

    // get metadata
    const metadata1 = await tldContract.tokenURI(1);
  
    const mdJson1 = Buffer.from(metadata1.substring(29), "base64");
    const mdResult1 = JSON.parse(mdJson1);

    expect(mdResult1.name).to.equal("user1"+tldName);
    //console.log(mdResult1.image);

    const balanceDomainAfter = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(1);

    const domainHolder = await tldContract.getDomainHolder("user1");
    expect(domainHolder).to.equal(user1.address);

    // TLD contract owner's balance after minting
    const ownerBalanceAfter = await waffle.provider.getBalance(owner.address);
    console.log("Owner's payment token balance after first mint: " + ethers.utils.formatEther(ownerBalanceAfter) + " ETH");

    // should not fail at minting another domain
    await mintContract.connect(user1).mint(
      "user1second", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: price5char // pay for the domain
      }
    );

    const balanceDomainAfter2 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter2).to.equal(2);

    // get metadata2
    const metadata2 = await tldContract.tokenURI(2);
  
    const mdJson2 = Buffer.from(metadata2.substring(29), "base64");
    const mdResult2 = JSON.parse(mdJson2);

    expect(mdResult2.name).to.equal("user1second"+tldName);

    // should fail if domain is 4 chars, but payment is for 5 chars (too low)
    await expect(mintContract.connect(user1).mint(
      "user", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: price5char // pay for the domain
      }
    )).to.be.revertedWith("Value below price");

    const balanceDomainAfter3 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter3).to.equal(2);

    // should mint a 4 char domain
    await mintContract.connect(user1).mint(
      "user", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: price4char // pay for the domain
      }
    );

    const balanceDomainAfter4 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter4).to.equal(3);

    // should mint a 3 char domain
    await mintContract.connect(user1).mint(
      "use", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: price3char // pay for the domain
      }
    );

    const balanceDomainAfter5 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter5).to.equal(4);
  });

  it("should change domain price (only owner)", async function () {
    const priceBefore = await mintContract.price5char();
    expect(priceBefore).to.equal(price5char);

    const newPrice = ethers.utils.parseUnits("0.02", paymentTokenDecimals); // domain price is in payment tokens

    await mintContract.connect(owner).changePrice(
      newPrice, 
      5 // chars (price for domains with 5 chars)
    );

    const priceAfter = await mintContract.price5char();
    expect(priceAfter).to.equal(newPrice);

    // cannot be zero
    await expect(mintContract.connect(owner).changePrice(0, 5)).to.be.revertedWith('Cannot be zero');
    
    // if user is not owner, the tx should revert
    await expect(mintContract.connect(user1).changePrice(123456, 5)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change referral fee (only owner)", async function () {
    const refBefore = await mintContract.referralFee();
    expect(refBefore).to.equal(1000);

    const newRef = 1500;

    await mintContract.connect(owner).changeReferralFee(newRef);

    const refAfter = await mintContract.referralFee();
    expect(refAfter).to.equal(newRef);

    // cannot exceed 20%
    await expect(mintContract.connect(owner).changeReferralFee(2100)).to.be.revertedWith('Cannot exceed 20%');

    // if user is not owner, the tx should revert
    await expect(mintContract.connect(user1).changeReferralFee(666)).to.be.revertedWith('Ownable: caller is not the owner');
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
    await mintContract.connect(owner).recoverERC20(
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