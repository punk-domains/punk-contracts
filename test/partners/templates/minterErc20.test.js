// Run tests:
// npx hardhat test test/partners/templates/minterErc20.test.js 

const { expect } = require("chai");

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const eth = 2000;
  
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("80", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostArbitrum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1.25", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Arbitrum): $" + String(Number(gasCostArbitrum)*eth));
}

describe("Template: MinterErc20 contract", function () {
  let tldContract;
  const tldName = ".token";
  const tldSymbol = ".TOKEN";
  const tldPrice = 0;
  const tldRoyalty = 0;

  let tokenContract;
  const paymentTokenDecimals = 18; // ETH (18 decimals)
  const tokenName = "Payment Token";
  const tokenSymbol = "PAY";

  let mintContract;
  const referralFee = 1000;
  const price = ethers.utils.parseUnits("20", paymentTokenDecimals);

  let signer;
  let user1;
  let user2;
  let owner;
  let team1;
  let team2;

  beforeEach(async function () {
    [signer, user1, user2, owner, team1, team2, referrer] = await ethers.getSigners();

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

    // Token contract
    const MockErc20Token = await ethers.getContractFactory("MockErc20Token");
    tokenContract = await MockErc20Token.deploy(tokenName, tokenSymbol);

    // mint 100 tokens for user1
    await tokenContract.mint(user1.address, ethers.utils.parseUnits("100", paymentTokenDecimals));

    // Minter contract 
    const minterCode = await ethers.getContractFactory("MinterErc20");
    mintContract = await minterCode.deploy(
      team1.address,
      team2.address,
      tldContract.address, // TLD address
      tokenContract.address, // payment token address
      price
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
    // should fail at minting because no token approval was given
    await expect(mintContract.connect(user1).mint(
      "123456", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero // no referrer in this case
    )).to.be.revertedWith("ERC20: transfer amount exceeds allowance");

    // user1 gives token approval to minter
    await tokenContract.connect(user1).approve(mintContract.address, price.mul(2)); // approve twice the price

    // check team1 token balance before minting 1
    const balanceTeam1Before = await tokenContract.balanceOf(team1.address);
    expect(balanceTeam1Before).to.equal(0);

    // check team2 token balance before minting 1
    const balanceTeam2Before = await tokenContract.balanceOf(team2.address);
    expect(balanceTeam2Before).to.equal(0);

    // how many domains user1 has before minting
    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    // Mint a domain
    const tx = await mintContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero // no referrer in this case
    );

    const receipt = await tx.wait();

    calculateGasCosts("Mint", receipt);

    // check team1 token balance after minting 1
    const balanceTeam1After = await tokenContract.balanceOf(team1.address);
    expect(balanceTeam1After).to.equal(price.div(2));

    // check team2 token balance after minting 1
    const balanceTeam2After = await tokenContract.balanceOf(team2.address);
    expect(balanceTeam2After).to.equal(price.div(2));

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

    // should not fail at minting another domain
    await mintContract.connect(user1).mint(
      "user1second", // domain name (without TLD)
      user1.address, // domain holder
      referrer.address
    );

    const balanceDomainAfter2 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter2).to.equal(2);

    // calculate referral payment
    const referrerPay = price.mul(10).div(100);

    console.log("Referrer payment: ", ethers.utils.formatUnits(referrerPay, paymentTokenDecimals));
    console.log("Team1 payment: ", ethers.utils.formatUnits(price.sub(referrerPay.div(2)), paymentTokenDecimals));

    // check team1 token balance after minting 2
    const balanceTeam1After2 = await tokenContract.balanceOf(team1.address);
    expect(balanceTeam1After2).to.equal(price.sub(referrerPay.div(2)));

    // get metadata2
    const metadata2 = await tldContract.tokenURI(2);
  
    const mdJson2 = Buffer.from(metadata2.substring(29), "base64");
    const mdResult2 = JSON.parse(mdJson2);

    expect(mdResult2.name).to.equal("user1second"+tldName);

    // should fail if user2 has not enough tokens
    await expect(mintContract.connect(user2).mint(
      "user", // domain name (without TLD)
      user2.address, // domain holder
      ethers.constants.AddressZero // no referrer in this case
    )).to.be.revertedWith("ERC20: transfer amount exceeds balance");

    const balanceDomainAfter3 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter3).to.equal(2);

  });

  it("should change domain price (only owner)", async function () {
    const priceBefore = await mintContract.price();
    expect(priceBefore).to.equal(price);

    const newPrice = ethers.utils.parseUnits("40", paymentTokenDecimals); // domain price is in payment tokens

    await mintContract.connect(owner).changePrice(newPrice);

    const priceAfter = await mintContract.price();
    expect(priceAfter).to.equal(newPrice);
    
    // if user is not owner, the tx should revert
    await expect(mintContract.connect(user1).changePrice(123456)).to.be.revertedWith('Ownable: caller is not the owner');
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