// Run tests:
// npx hardhat test test/partners/layer2dao/layer2dao.test.js 

const { expect } = require("chai");

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const eth = 3000;
  
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("100", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostArbitrum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1.25", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Arbitrum): $" + String(Number(gasCostArbitrum)*eth));
}

describe("Layer2DaoPunkDomains (partner contract)", function () {
  let tldContractL2;
  let tldContractLayer2;
  let mintContract;
  let nftLevel1Contract;
  let nftLevel2Contract;
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

  it("should add/remove an NFT to the supported NFTs array (only owner)", async function () {
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

    // if user is not owner, the tx should revert
    await expect(mintContract.connect(user1).removeWhitelistedNftContract(0)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should transfer TLD ownership to another address (only owner)", async function () {
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

  it("should mint two new domains", async function () {
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

    const contractBalanceBefore = await waffle.provider.getBalance(mintContract.address);
    expect(contractBalanceBefore).to.equal(0);
    console.log("Contract balance before first mint: " + ethers.utils.formatEther(contractBalanceBefore) + " ETH");

    // Mint a .L2 domain
    const tx = await mintContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      1, // choose TLD - 1: .L2, 2: .LAYER2
      nftLevel1Contract.address, // NFT address
      1, // NFT token ID (the second minted NFT, the first one is minted in the constructor)
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay for the domain
      }
    );

    const receipt = await tx.wait();

    calculateGasCosts("L2DAO Mint", receipt);

    const balanceDomainAfter = await tldContractL2.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(1);

    const domainHolder = await tldContractL2.getDomainHolder("user1");
    expect(domainHolder).to.equal(user1.address);

    const contractBalanceAfter = await waffle.provider.getBalance(mintContract.address);
    console.log("Contract balance after first mint: " + ethers.utils.formatEther(contractBalanceAfter) + " ETH");

    // should fail at minting another .L2 domain with the same NFT
    await expect(mintContract.connect(user1).mint(
      "user1second", // domain name (without TLD)
      1, // choose TLD - 1: .L2, 2: .LAYER2
      nftLevel1Contract.address, // NFT address
      1, // NFT token ID (the second minted NFT, the first one is minted in the constructor)
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay for the domain
      }
    )).to.be.revertedWith('This NFT was already used for minting a domain of the chosen TLD');

    // mint a new .LAYER2 domain with the same NFT
    const balanceDomainBeforeLayer2 = await tldContractLayer2.balanceOf(user1.address);
    expect(balanceDomainBeforeLayer2).to.equal(0);

    await mintContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      2, // choose TLD - 1: .L2, 2: .LAYER2
      nftLevel1Contract.address, // NFT address
      1, // NFT token ID (the second minted NFT, the first one is minted in the constructor)
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay for the domain
      }
    );

    const balanceDomainAfterLayer2 = await tldContractLayer2.balanceOf(user1.address);
    expect(balanceDomainAfterLayer2).to.equal(1);

    const domainHolderLayer2 = await tldContractLayer2.getDomainHolder("user1");
    expect(domainHolderLayer2).to.equal(user1.address);

    const contractBalanceAfter2 = await waffle.provider.getBalance(mintContract.address);
    console.log("Contract balance after second mint: " + ethers.utils.formatEther(contractBalanceAfter2) + " ETH");

    // owner withdraw
    await mintContract.withdraw();

    const contractBalanceAfter3 = await waffle.provider.getBalance(mintContract.address);
    expect(contractBalanceAfter3).to.equal(0);
    console.log("Contract balance after withdrawal: " + ethers.utils.formatEther(contractBalanceAfter3) + " ETH");
  });

  it("should allow owner to add a new NFT address and user to mint with any of them", async function () {
    await mintContract.togglePaused();

    // mint a Layer2DAO NFT (level 1)
    const nftBalanceBefore = await nftLevel1Contract.balanceOf(user1.address);
    expect(nftBalanceBefore).to.equal(0);
    
    await nftLevel1Contract.mint(user1.address);

    const nftBalanceAfter = await nftLevel1Contract.balanceOf(user1.address);
    expect(nftBalanceAfter).to.equal(1);

    // mint a Layer2DAO NFT (level 2)
    const nft2BalanceBefore = await nftLevel2Contract.balanceOf(user1.address);
    expect(nft2BalanceBefore).to.equal(0);

    await nftLevel2Contract.mint(user1.address);

    const nft2BalanceAfter = await nftLevel2Contract.balanceOf(user1.address);
    expect(nft2BalanceAfter).to.equal(1);

    // add Layer2DAO NFT (level 2) to contract as whitelisted NFT address
    await mintContract.addWhitelistedNftContract(nftLevel2Contract.address);

    const arrLengthAfterAdd = await mintContract.getSupportedNftsArrayLength();
    expect(arrLengthAfterAdd).to.equal(2);

    // check user's domain balance before domain mint
    const balanceDomainBefore = await tldContractL2.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    // Mint a .L2 domain with level 1 NFT
    await mintContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      1, // choose TLD - 1: .L2, 2: .LAYER2
      nftLevel1Contract.address, // NFT address
      1, // NFT token ID (the second minted NFT, the first one is minted in the constructor)
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay for the domain
      }
    );

    // Fail at minting the same domain name with level 2 NFT
    await expect(mintContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      1, // choose TLD - 1: .L2, 2: .LAYER2
      nftLevel2Contract.address, // NFT address
      1, // NFT token ID (the second minted NFT, the first one is minted in the constructor)
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay for the domain
      }
    )).to.be.revertedWith("Domain with this name already exists");

    // Mint another .L2 domain with level 2 NFT
    await mintContract.connect(user1).mint(
      "user1another", // domain name (without TLD)
      1, // choose TLD - 1: .L2, 2: .LAYER2
      nftLevel2Contract.address, // NFT address
      1, // NFT token ID (the second minted NFT, the first one is minted in the constructor)
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay for the domain
      }
    );

    const balanceDomainAfter = await tldContractL2.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(2);

    const domainHolder1 = await tldContractL2.getDomainHolder("user1");
    expect(domainHolder1).to.equal(user1.address);

    const domainHolder2 = await tldContractL2.getDomainHolder("user1another");
    expect(domainHolder2).to.equal(user1.address);
  });

  it("should allow owner to mint domain without Layer2 NFT needed (only owner)", async function () {
    const balanceDomainBefore = await tldContractL2.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    await mintContract.ownerMintDomain(
      "user1",
      1, // .L2 or .l2
      user1.address, // domain holder
      {
        value: domainPrice // pay for the domain
      }
    );

    const balanceDomainAfter = await tldContractL2.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(1);

    const domainHolder = await tldContractL2.getDomainHolder("user1");
    expect(domainHolder).to.equal(user1.address);

    // if user is not owner, the tx should revert
    await expect(mintContract.connect(user1).ownerMintDomain(
      "user1more", 
      1, // .L2 or .l2
      user1.address, // domain holder
      {
        value: domainPrice // pay for the domain
      }
    )).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change domain price (only owner)", async function () {
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

  it("should change referral fee (only owner)", async function () {
    const refBefore = await tldContractL2.referral();
    expect(refBefore).to.equal(1000);

    const newRef = 2500;

    await mintContract.changeTldReferralFee(
      newRef,
      1 // .L2 or .l2
    );

    const refAfter = await tldContractL2.referral();
    expect(refAfter).to.equal(newRef);

    // if user is not owner, the tx should revert
    await expect(mintContract.connect(user1).changeTldReferralFee(666, 1)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change max domain name length (only owner)", async function () {
    const before = await tldContractL2.nameMaxLength();
    expect(before).to.equal(140);

    await mintContract.changeMaxDomainNameLength(
      69, // new max name length
      1 // .L2 or .l2
    );

    const after = await tldContractL2.nameMaxLength();
    expect(after).to.equal(69);

    // if user is not owner, the tx should revert
    await expect(mintContract.connect(user1).changeMaxDomainNameLength(420, 1)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change TLD metadata description (only owner)", async function () {
    const desBefore = await tldContractL2.description();
    expect(desBefore).to.equal("Punk Domains digital identity. Visit https://punk.domains/");

    const newDes = "Get yourself a .L2 domain by L2DAO and Punk Domains!";

    await mintContract.changeTldDescription(
      newDes,
      1 // .L2 or .l2
    );

    const desAfter = await tldContractL2.description();
    expect(desAfter).to.equal(newDes);

    // if user is not owner, the tx should revert
    await expect(mintContract.connect(user1).changeTldDescription("pwned", 1)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should fail at minting a domain if contract is paused", async function () {
    const nftBalanceBefore = await nftLevel1Contract.balanceOf(user1.address);
    expect(nftBalanceBefore).to.equal(0);

    // mint a Layer2DAO NFT
    await nftLevel1Contract.mint(user1.address);

    const nftBalanceAfter = await nftLevel1Contract.balanceOf(user1.address);
    expect(nftBalanceAfter).to.equal(1);

    const balanceDomainBefore = await tldContractL2.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    // should fail at minting because contract is paused
    await expect(mintContract.connect(user1).mint(
      "user1fail", // domain name (without TLD)
      1, // choose TLD - 1: .L2, 2: .LAYER2
      nftLevel1Contract.address, // NFT address
      1, // NFT token ID (the second minted NFT, the first one is minted in the constructor)
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay for the domain
      }
    )).to.be.revertedWith('Minting paused');

    const balanceDomainAfter = await tldContractL2.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(0); // remains zero

    const domainHolder = await tldContractL2.getDomainHolder("user1fail");
    expect(domainHolder).to.equal(ethers.constants.AddressZero); // the owner is a zero address because domain was not minted
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

  it("should recover ERC-721 tokens mistakenly sent to contract address", async function () {
    const balanceSigner1 = await nftLevel1Contract.balanceOf(signer.address);
    expect(balanceSigner1).to.equal(1);

    const balanceContract1 = await nftLevel1Contract.balanceOf(mintContract.address);
    expect(balanceContract1).to.equal(0);

    // send NFT level 1 to contract address
    await nftLevel1Contract.transferFrom(
      signer.address, // from
      mintContract.address, // to
      0 // token ID
    );

    const balanceSigner2 = await nftLevel1Contract.balanceOf(signer.address);
    expect(balanceSigner2).to.equal(0);

    const balanceContract2 = await nftLevel1Contract.balanceOf(mintContract.address);
    expect(balanceContract2).to.equal(1);

    // recover NFT
    await mintContract.recoverERC721(
      nftLevel1Contract.address, // NFT address
      0, // NFT token ID
      signer.address // recipient
    );

    const balanceSigner3 = await nftLevel1Contract.balanceOf(signer.address);
    expect(balanceSigner3).to.equal(1);

    const balanceContract3 = await nftLevel1Contract.balanceOf(mintContract.address);
    expect(balanceContract3).to.equal(0);
  });

});
