// npx hardhat test test/partners/templates/minterNftRequired.test.js
const { expect } = require("chai");

describe("Template: MinterNftRequired contract", function () {
  let tldContract;
  const tldName = ".nftrequired";
  const tldSymbol = ".NFTREQUIRED";
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

  let nftContract;

  beforeEach(async function () {
    [signer, user1, user2, owner, broker] = await ethers.getSigners();

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
      false, // buying enabled
      tldRoyalty,
      factoryContract.address,
      flexiMetadataContract.address
    );

    // create fake project NFTs
    const Erc721Contract = await ethers.getContractFactory("MockErc721Token");
    nftContract = await Erc721Contract.deploy("Required", "REQUIRED");

    // Minter contract
    const minterCode = await ethers.getContractFactory("MinterNftRequired");
    mintContract = await minterCode.deploy(
      broker.address,
      nftContract.address,
      tldContract.address, // TLD address
      referralFee, royaltyFee, brokerFee,
      price1char, price2char, price3char, price4char, price5char // prices
    );

    // set minter contract as TLD minter address
    await tldContract.changeMinter(mintContract.address);

    // transfer TLD ownership to owner
    await tldContract.transferOwnership(owner.address);
    await mintContract.transferOwnership(owner.address);

    // mint NFT for user 1
    await nftContract.mint(user1.address);
  });

  it("should confirm TLD name & symbol", async function () {
    const _tldName = await tldContract.name();
    expect(_tldName).to.equal(tldName);
    const _tldSymbol = await tldContract.symbol();
    expect(_tldSymbol).to.equal(tldSymbol);
  });

  it("checks if user can mint a domain", async function () {
    // mint
    const mintEligible1 = await mintContract.canUserMint(user1.address);
    expect(mintEligible1).to.be.true;

    const mintEligible2 = await mintContract.canUserMint(user2.address);
    expect(mintEligible2).to.be.false;
  });

  it("should mint a domain if holding NFT", async function () {
    // unpause the minter
    await mintContract.connect(owner).togglePaused();

    const balanceDomainBefore1 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore1).to.equal(0);

    await mintContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: price5char // pay for the domain
      }
    );

    const balanceDomainAfter1 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter1).to.equal(1);

    // should fail if domain is 4 chars, but payment is for 5 chars (too low)
    await expect(mintContract.connect(user1).mint(
      "usr1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: price5char // pay for the domain (wrong price)
      }
    )).to.be.revertedWith("Value below price");

    const balanceDomainBefore2 = await tldContract.balanceOf(user2.address);
    expect(balanceDomainBefore2).to.equal(0);

    await expect(mintContract.connect(user2).mint(
      "user2", // domain name (without TLD)
      user2.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: price5char
      }
    )).to.be.revertedWith("Not eligible for minting");

    const balanceDomainAfter2 = await tldContract.balanceOf(user2.address);
    expect(balanceDomainAfter2).to.equal(0);
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