// Run tests:
// npx hardhat test test/partners/wildbunch/wildbunch.test.js 

const { expect } = require("chai");

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);
  const eth = 1000; // price in USD
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("20", "gwei")) * Number(receipt.gasUsed)), "ether");
  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
}

describe("WildBunchDomainMinter (partner contract)", function () {
  let tldContract;
  let mintContract;
  let nftContract;
  let metadataContract;
  let signer;
  let user1;
  let user2;

  const domainName = ".wildbunch";
  const domainSymbol = ".WILDBUNCH";
  const domainPrice = ethers.utils.parseUnits("0.1", "ether");
  const domainRoyalty = 2000; // royalty in bips (2000 bips is 20%)

  beforeEach(async function () {
    [signer, user1, user2] = await ethers.getSigners();

    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const WildBunchMetadata = await ethers.getContractFactory("WildBunchMetadata");
    metadataContract = await WildBunchMetadata.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("FlexiPunkTLDFactory");
    const factoryContract = await PunkTLDFactory.deploy(domainPrice, forbTldsContract.address, metadataContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    const PunkTLD = await ethers.getContractFactory("FlexiPunkTLD");
    tldContract = await PunkTLD.deploy(
      domainName,
      domainSymbol,
      signer.address, // TLD owner
      domainPrice,
      false, // buying enabled
      domainRoyalty,
      factoryContract.address,
      metadataContract.address
    );

    // supported NFT contract
    const Erc721Contract = await ethers.getContractFactory("MockErc721Token");
    nftContract = await Erc721Contract.deploy("Wild Bunch NFT", "WBN");

    // minting contract
    const WildBunchDomainMinter = await ethers.getContractFactory("WildBunchDomainMinter");
    mintContract = await WildBunchDomainMinter.deploy(
      nftContract.address,
      tldContract.address
    );

    // set minter contract as TLD minter address
    await tldContract.changeMinter(mintContract.address);
  });

  it("should confirm TLD name & symbol", async function () {
    const tldName = await tldContract.name();
    expect(tldName).to.equal(domainName);
    const tldSymbol = await tldContract.symbol();
    expect(tldSymbol).to.equal(domainSymbol);
  });

  it("should check if user can mint", async function () {
    const balanceSigner = await nftContract.balanceOf(signer.address);
    expect(balanceSigner).to.equal(1);

    const balanceUser1 = await nftContract.balanceOf(user1.address);
    expect(balanceUser1).to.equal(0);
  });

  it("should mint a new domain", async function () {
    const nftBalanceBefore = await nftContract.balanceOf(user1.address);
    expect(nftBalanceBefore).to.equal(0);

    // mint an NFT
    await nftContract.mint(user1.address);

    const nftBalanceAfter = await nftContract.balanceOf(user1.address);
    expect(nftBalanceAfter).to.equal(1);

    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    const tx = await mintContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay for the domain
      }
    );

    const receipt = await tx.wait();

    calculateGasCosts("Domain Mint", receipt);

    const balanceDomainAfter = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(1);

    const domainHolder = await tldContract.getDomainHolder("user1");
    expect(domainHolder).to.equal(user1.address);

    const domainTokenIdName0 = await tldContract.domainIdsNames(0);
    expect(domainTokenIdName0).to.equal("");

    const domainTokenIdName1 = await tldContract.domainIdsNames(1);
    expect(domainTokenIdName1).to.equal("user1");

    // should fail if user does not hold NFT
    await expect(mintContract.connect(user2).mint(
      "user2fail", // domain name (without TLD)
      user2.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay for the domain
      }
    )).to.be.revertedWith('User must hold the required NFT');

    const balanceDomainAfter2 = await tldContract.balanceOf(user2.address);
    expect(balanceDomainAfter2).to.equal(0);

    const domainHolder2 = await tldContract.getDomainHolder("user2fail");
    expect(domainHolder2).to.equal(ethers.constants.AddressZero); // the owner is a zero address because domain was not minted
  
    // should fail if payment is too low
    await expect(mintContract.connect(user1).mint(
      "user1fail2", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: ethers.utils.parseUnits("0.01", "ether") // too low payment
      }
    )).to.be.revertedWith('Value below price');

    // check metadata
    const metadata1 = await tldContract.tokenURI(1);
    //console.log(metadata1);

    const mdJson = Buffer.from(metadata1.substring(29), "base64");
    const mdResult = JSON.parse(mdJson);

    // metadata: 
    //console.log(mdResult);
    console.log(mdResult.name);
    console.log(mdResult.attributes);

    // SVG image:
    console.log(mdResult.image);
  });

  it("should fail at minting a domain if contract is paused", async function () {
    const nftBalanceBefore = await nftContract.balanceOf(user1.address);
    expect(nftBalanceBefore).to.equal(0);

    // mint an NFT
    await nftContract.mint(user1.address);

    const nftBalanceAfter = await nftContract.balanceOf(user1.address);
    expect(nftBalanceAfter).to.equal(1);

    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    // pause minting contract
    await mintContract.togglePaused();

    // should fail at minting because contract is paused
    await expect(mintContract.connect(user1).mint(
      "user1fail", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: domainPrice // pay for the domain
      }
    )).to.be.revertedWith('Minting paused');

    const balanceDomainAfter = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(0); // remains zero

    const domainHolder = await tldContract.getDomainHolder("user1fail");
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
    const balanceSigner1 = await nftContract.balanceOf(signer.address);
    expect(balanceSigner1).to.equal(1);

    const balanceContract1 = await nftContract.balanceOf(mintContract.address);
    expect(balanceContract1).to.equal(0);

    // send NFT level 1 to contract address
    await nftContract.transferFrom(
      signer.address, // from
      mintContract.address, // to
      0 // token ID
    );

    const balanceSigner2 = await nftContract.balanceOf(signer.address);
    expect(balanceSigner2).to.equal(0);

    const balanceContract2 = await nftContract.balanceOf(mintContract.address);
    expect(balanceContract2).to.equal(1);

    // recover NFT
    await mintContract.recoverERC721(
      nftContract.address, // NFT address
      0, // NFT token ID
      signer.address // recipient
    );

    const balanceSigner3 = await nftContract.balanceOf(signer.address);
    expect(balanceSigner3).to.equal(1);

    const balanceContract3 = await nftContract.balanceOf(mintContract.address);
    expect(balanceContract3).to.equal(0);
  });

});
