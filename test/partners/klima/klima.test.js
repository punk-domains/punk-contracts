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

  const usdcDecimals = 6;
  const domainPrice = ethers.utils.parseUnits("100", usdcDecimals); // domain price is in USDC (mwei, 6 decimals)

  beforeEach(async function () {
    [signer, user1, user2] = await ethers.getSigners();

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
      domainPrice // domain price in USDC (6 decimals, mwei)
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
    await wrapperContract.togglePaused();

    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    const wrapperBalanceBefore = await usdcContract.balanceOf(wrapperContract.address);
    expect(wrapperBalanceBefore).to.equal(0);
    console.log("Wrapper contract USDC balance before first mint: " + ethers.utils.formatUnits(wrapperBalanceBefore, usdcDecimals) + " USDC");

    const knsBalanceBefore = await usdcContract.balanceOf(knsRetirerContract.address);
    expect(knsBalanceBefore).to.equal(0);
    console.log("KNS contract USDC balance before first mint: " + ethers.utils.formatUnits(knsBalanceBefore, usdcDecimals) + " USDC");

    // give user1 100 USDC
    await usdcContract.mint(user1.address, ethers.utils.parseUnits("100", usdcDecimals));

    // Give USDC allowance
    await usdcContract.connect(user1).approve(
      wrapperContract.address, // spender
      domainPrice // amount
    );

    // Mint a .L2 domain
    const tx = await wrapperContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero // no referrer in this case
    );

    const receipt = await tx.wait();

    calculateGasCosts("Domain Mint", receipt);

    const balanceDomainAfter = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(1);

    const domainHolder = await tldContract.getDomainHolder("user1");
    expect(domainHolder).to.equal(user1.address);

    const wrapperBalanceAfter = await usdcContract.balanceOf(wrapperContract.address);
    expect(wrapperBalanceAfter).to.equal(0); // wrapper contract does not hold USDC from domain mints
    console.log("Wrapper contract USDC balance after successful mint: " + ethers.utils.formatUnits(wrapperBalanceAfter, usdcDecimals) + " USDC");

    const knsBalanceAfter = await usdcContract.balanceOf(knsRetirerContract.address);
    expect(knsBalanceAfter).to.equal(ethers.utils.parseUnits("80", usdcDecimals));
    console.log("KNS contract USDC balance after successful mint: " + ethers.utils.formatUnits(knsBalanceAfter, usdcDecimals) + " USDC");

    /*
    // should fail at minting another .L2 domain with the same NFT
    await expect(wrapperContract.connect(user1).mint(
      "user1second", // domain name (without TLD)
      ethers.constants.AddressZero // no referrer in this case
    )).to.be.revertedWith('User cannot mint a domain');

    const contractBalanceAfter2 = await waffle.provider.getBalance(wrapperContract.address);
    console.log("Contract balance after failed mint: " + ethers.utils.formatEther(contractBalanceAfter2) + " ETH");

    // owner withdraw
    await wrapperContract.withdraw();

    const contractBalanceAfter3 = await waffle.provider.getBalance(wrapperContract.address);
    expect(contractBalanceAfter3).to.equal(0);
    console.log("Contract balance after withdrawal: " + ethers.utils.formatEther(contractBalanceAfter3) + " ETH");
    */
  });

  /*
  it("should allow owner to add a new NFT address and user to mint with any of them", async function () {
    await wrapperContract.togglePaused();

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
    await wrapperContract.addWhitelistedNftContract(nftLevel2Contract.address);

    const arrLengthAfterAdd = await wrapperContract.getSupportedNftsArrayLength();
    expect(arrLengthAfterAdd).to.equal(2);

    // check user's domain balance before domain mint
    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    const canMintUser1 = await wrapperContract.canUserMint(user1.address);
    expect(canMintUser1).to.be.true;

    // Mint a .L2 domain with level 1 NFT
    await wrapperContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      ethers.constants.AddressZero // no referrer in this case
    );

    // Fail at minting the same domain name with level 2 NFT
    await expect(wrapperContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      ethers.constants.AddressZero // no referrer in this case
    )).to.be.revertedWith("Domain with this name already exists");

    const canMintUser2 = await wrapperContract.canUserMint(user1.address);
    expect(canMintUser2).to.be.true;

    // Mint another .L2 domain with level 2 NFT
    await wrapperContract.connect(user1).mint(
      "user1another", // domain name (without TLD)
      ethers.constants.AddressZero // no referrer in this case
    );

    const canMintUser3 = await wrapperContract.canUserMint(user1.address);
    expect(canMintUser3).to.be.false;

    // Fail at minting yet another domain
    await expect(wrapperContract.connect(user1).mint(
      "user1third", // domain name (without TLD)
      ethers.constants.AddressZero // no referrer in this case

    )).to.be.revertedWith("User cannot mint a domain");

    const balanceDomainAfter = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(2);

    const domainHolder1 = await tldContract.getDomainHolder("user1");
    expect(domainHolder1).to.equal(user1.address);

    const domainHolder2 = await tldContract.getDomainHolder("user1another");
    expect(domainHolder2).to.equal(user1.address);
  });

  it("should change domain price (only owner)", async function () {
    const priceBefore = await tldContract.price();
    expect(priceBefore).to.equal(domainPrice);

    const newPrice = ethers.utils.parseUnits("2", "ether");

    await wrapperContract.changeTldPrice(
      newPrice
    );

    const priceAfter = await tldContract.price();
    expect(priceAfter).to.equal(newPrice);

    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).changeTldPrice(domainPrice)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change referral fee (only owner)", async function () {
    const refBefore = await tldContract.referral();
    expect(refBefore).to.equal(1000);

    const newRef = 2500;

    await wrapperContract.changeTldReferralFee(newRef);

    const refAfter = await tldContract.referral();
    expect(refAfter).to.equal(newRef);

    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).changeTldReferralFee(666)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change max domain name length (only owner)", async function () {
    const before = await tldContract.nameMaxLength();
    expect(before).to.equal(140);

    const newLen = 69;
    await wrapperContract.changeMaxDomainNameLength(newLen);

    const after = await tldContract.nameMaxLength();
    expect(after).to.equal(newLen);

    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).changeMaxDomainNameLength(420)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change TLD metadata description (only owner)", async function () {
    const desBefore = await tldContract.description();
    expect(desBefore).to.equal("Punk Domains digital identity. Visit https://punk.domains/");

    const newDes = "Get yourself a .L2 domain by L2DAO and Punk Domains!";

    await wrapperContract.changeTldDescription(newDes);

    const desAfter = await tldContract.description();
    expect(desAfter).to.equal(newDes);

    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).changeTldDescription("pwned")).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should fail at minting a domain if contract is paused", async function () {
    const nftBalanceBefore = await nftLevel1Contract.balanceOf(user1.address);
    expect(nftBalanceBefore).to.equal(0);

    // mint a Layer2DAO NFT
    await nftLevel1Contract.mint(user1.address);

    const nftBalanceAfter = await nftLevel1Contract.balanceOf(user1.address);
    expect(nftBalanceAfter).to.equal(1);

    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    // should fail at minting because contract is paused
    await expect(wrapperContract.connect(user1).mint(
      "user1fail", // domain name (without TLD)
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
  */

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
