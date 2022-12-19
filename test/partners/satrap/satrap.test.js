// npx hardhat test test/partners/satrap/satrap.test.js
const { expect } = require("chai");

describe(".satrap", function () {
  let tldContract;
  const tldName = ".satrap";
  const tldSymbol = ".SATRAP";
  const tldPrice = 0;
  const tldRoyalty = 0;

  const paymentTokenDecimals = 18; // ETH (18 decimals)

  let mintContract;
  const price1char = ethers.utils.parseUnits("1", paymentTokenDecimals); // $10k
  const price2char = ethers.utils.parseUnits("0.5", paymentTokenDecimals);
  const price3char = ethers.utils.parseUnits("0.1", paymentTokenDecimals);
  const price4char = ethers.utils.parseUnits("0.05", paymentTokenDecimals);
  const price5char = ethers.utils.parseUnits("0.01", paymentTokenDecimals);

  let signer;
  let user1;
  let user2;
  let user3;
  let user4;

  let nftContract1;
  let nftContract2;
  let nftContract3;

  beforeEach(async function () {
    [signer, user1, user2, user3, user4] = await ethers.getSigners();

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
    nftContract1 = await Erc721Contract.deploy("The Satraps", "THESATRAPS");
    nftContract2 = await Erc721Contract.deploy("Partner One", "PARTNER1");
    nftContract3 = await Erc721Contract.deploy("Partner Two", "PARTNER2");

    // Minter contract
    const minterCode = await ethers.getContractFactory("SatrapMinter");
    mintContract = await minterCode.deploy(
      nftContract1.address,
      tldContract.address, // TLD address
      price1char, price2char, price3char, price4char, price5char // prices
    );

    // set minter contract as TLD minter address
    await tldContract.changeMinter(mintContract.address);

    await mintContract.addPartnerNftAddress(nftContract2.address);

    // mint NFT for users
    await nftContract1.mint(user1.address);
    await nftContract1.mint(user2.address);

    await nftContract2.mint(user1.address);
    await nftContract2.mint(user3.address);
  });

  it("should confirm TLD name & symbol", async function () {
    const _tldName = await tldContract.name();
    expect(_tldName).to.equal(tldName);
    const _tldSymbol = await tldContract.symbol();
    expect(_tldSymbol).to.equal(tldSymbol);
  });

  it("checks if users can mint or get discount", async function () {
    // mint
    const mintEligible1 = await mintContract.canUserMint(user1.address);
    expect(mintEligible1).to.be.true;

    const mintEligible2 = await mintContract.canUserMint(user2.address);
    expect(mintEligible2).to.be.true;

    const mintEligible3 = await mintContract.canUserMint(user3.address);
    expect(mintEligible3).to.be.true;

    const mintEligible4 = await mintContract.canUserMint(user4.address);
    expect(mintEligible4).to.be.false;

    // discount
    const discountEligible1 = await mintContract.canGetDiscount(user1.address);
    expect(discountEligible1).to.be.true;

    const discountEligible2 = await mintContract.canGetDiscount(user2.address);
    expect(discountEligible2).to.be.false;
  });

  it("should mint a domain if holding main NFT", async function () {
    // unpause the minter
    await mintContract.togglePaused();

    const balanceDomainBefore1 = await tldContract.balanceOf(user2.address);
    expect(balanceDomainBefore1).to.equal(0);

    await mintContract.connect(user2).mint(
      "user2", // domain name (without TLD)
      user2.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: price5char // pay for the domain
      }
    );

    const balanceDomainAfter1 = await tldContract.balanceOf(user2.address);
    expect(balanceDomainAfter1).to.equal(1);

    // should fail if domain is 4 chars, but payment is for 5 chars (too low)
    await expect(mintContract.connect(user2).mint(
      "usr2", // domain name (without TLD)
      user2.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: price5char // pay for the domain
      }
    )).to.be.revertedWith("Value below price");

    const balanceDomainBefore2 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore2).to.equal(0);

    await mintContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: price5char * 0.4 // pay for the domain (60% discount)
      }
    );

    const balanceDomainAfter2 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter2).to.equal(1);

    const balanceDomainBefore3 = await tldContract.balanceOf(user3.address);
    expect(balanceDomainBefore3).to.equal(0);

    await mintContract.connect(user3).mint(
      "user3", // domain name (without TLD)
      user3.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: price5char * 0.4 // pay for the domain (60% discount)
      }
    );

    const balanceDomainAfter3 = await tldContract.balanceOf(user3.address);
    expect(balanceDomainAfter3).to.equal(1);
  });

});
