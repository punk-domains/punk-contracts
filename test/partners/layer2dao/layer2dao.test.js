// Run tests:
// npx hardhat test test/partners/layer2dao/layer2dao.test.js 

const { expect } = require("chai");

describe("Layer2DaoPunkDomains (partner contract)", function () {
  let tldContractL2;
  let tldContractLayer2;
  let mintContract;
  let nftLevel1Contract;
  let nftLevel2Contract;
  let nftLevel3Contract;
  let signer;
  let user1;
  let user2;
  let user3;

  const domainPrice = ethers.utils.parseUnits("1", "ether");

  beforeEach(async function () {
    [signer, user1, user2, user3] = await ethers.getSigners();

    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("PunkTLDFactory");
    const factoryContract = await PunkTLDFactory.deploy(domainPrice, forbTldsContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    // TLD contracts
    const PunkTLD = await ethers.getContractFactory("PunkTLD");

    // .L2 TLD
    tldContractL2 = await PunkTLD.deploy(
      ".l2", // name
      ".L2", // symbol
      signer.address, // temp TLD owner
      domainPrice, // domain price
      false, // buying enabled
      4999, // royalty (49.99%)
      factoryContract.address
    );

    // .LAYER2 TLD
    tldContractLayer2 = await PunkTLD.deploy(
      ".layer2", // name
      ".LAYER2", // symbol
      signer.address, // temp TLD owner
      domainPrice, // domain price
      false, // buying enabled
      4999, // royalty (49.99%)
      factoryContract.address
    );

    // NFTs
    const Erc721Contract = await ethers.getContractFactory("MockErc721Token");
    nftLevel1Contract = await Erc721Contract.deploy("Layer2DAO Level 1", "L2DL1");
    nftLevel2Contract = await Erc721Contract.deploy("Layer2DAO Level 2", "L2DL2");
    nftLevel3Contract = await Erc721Contract.deploy("Layer2DAO Level 3", "L2DL3");

    // Whitelisted minting contract
    const Layer2DaoPunkDomains = await ethers.getContractFactory("Layer2DaoPunkDomains");
    mintContract = await Layer2DaoPunkDomains.deploy(
      nftLevel1Contract.address,
      tldContractL2.address,
      tldContractLayer2.address
    );

    // transfer TLD ownership to the Mint contract
    await tldContractL2.transferOwnership(mintContract.address);
    await tldContractLayer2.transferOwnership(mintContract.address);
  });

  it("should confirm TLDs names & symbols", async function () {
    const l2Name = await tldContractL2.name();
    expect(l2Name).to.equal(".l2");
    const l2Symbol = await tldContractL2.symbol();
    expect(l2Symbol).to.equal(".L2");

    const layer2Name = await tldContractLayer2.name();
    expect(layer2Name).to.equal(".layer2");
    const layer2Symbol = await tldContractLayer2.symbol();
    expect(layer2Symbol).to.equal(".LAYER2");
  });

  it("should add/remove an NFT to the supported NFTs array", async function () {
    const arrLengthStart = await mintContract.getSupportedNftsArrayLength();
    expect(arrLengthStart).to.equal(1);

    // add new NFT address
    await mintContract.addWhitelistedNftContract(nftLevel2Contract.address);

    const arrLengthAfterAdd = await mintContract.getSupportedNftsArrayLength();
    expect(arrLengthAfterAdd).to.equal(2);

    // remove NFT address
    await mintContract.removeWhitelistedNftContract(0); // remove first address (index = 0)

    const arrLengthAfterRemove = await mintContract.getSupportedNftsArrayLength();
    expect(arrLengthAfterRemove).to.equal(1);
  });

  it("should transfer TLD ownership to another address", async function () {
    const ownerL2Before = await tldContractL2.owner();
    expect(ownerL2Before).to.equal(mintContract.address);
    const ownerLayer2Before = await tldContractLayer2.owner();
    expect(ownerLayer2Before).to.equal(mintContract.address);

    await mintContract.transferTldsOwnership(user2.address);

    const ownerL2After = await tldContractL2.owner();
    expect(ownerL2After).to.equal(user2.address);
    const ownerLayer2After = await tldContractLayer2.owner();
    expect(ownerLayer2After).to.equal(user2.address);

    await expect(mintContract.connect(user1).transferTldsOwnership(
      user1.address
    )).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should mint a new domain", async function () {
    await mintContract.togglePaused();

    const nftBalanceBefore = await nftLevel1Contract.balanceOf(user1.address);
    expect(nftBalanceBefore).to.equal(0);

    // mint a Layer2DAO NFT
    await nftLevel1Contract.mint(user1.address);

    const nftBalanceAfter = await nftLevel1Contract.balanceOf(user1.address);
    expect(nftBalanceAfter).to.equal(1);

    const nftTokenByIndex = await nftLevel1Contract.tokenOfOwnerByIndex(user1.address, 0);
    expect(nftTokenByIndex).to.equal(1);

    const nftOwner = await nftLevel1Contract.ownerOf(1); // owner of token 1
    expect(nftOwner).to.equal(user1.address);

    const balanceDomainBefore = await tldContractL2.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    await mintContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      1, // choose TLD - 1: .L2, 2: .LAYER2
      nftLevel1Contract.address, // NFT address
      1, // NFT token ID (the second minted NFT, the first one is minted in the constructor)
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay  for the domain
      }
    );

    const balanceDomainAfter = await tldContractL2.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(1);

    const domainHolder = await tldContractL2.getDomainHolder("user1");
    expect(domainHolder).to.equal(user1.address);
  });

  it("should change domain price", async function () {
    const priceBefore = await tldContractL2.price();
    expect(priceBefore).to.equal(domainPrice);

    const newPrice = ethers.utils.parseUnits("2", "ether");

    await mintContract.changeTldPrice(
      newPrice,
      1 // .L2 or .l2
    );

    const priceAfter = await tldContractL2.price();
    expect(priceAfter).to.equal(newPrice);

    // if user is not owner, the tx should revert
    await expect(mintContract.connect(user1).changeTldPrice(domainPrice, 1)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  // it("should ", async function () {});

});
