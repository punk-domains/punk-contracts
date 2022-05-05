// Run tests:
// npx hardhat test test/partners/unstoppable/polygonRefund.test.js 

const { expect } = require("chai");
const partnerContractName = "UnstoppablePolygonRefund";

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

describe(partnerContractName + " (partner contract)", function () {
  let tldContract;
  const tldName = ".polygon";
  const tldSymbol = ".POLYGON";
  const tldPrice = ethers.utils.parseEther("14");
  const tldRoyalty = 0;

  let transitionContract;

  let signer;
  let user1;
  let user2;

  const provider = waffle.provider;

  beforeEach(async function () {
    [signer, user1, user2] = await ethers.getSigners();

    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("PunkTLDFactory");
    const priceToCreateTld = ethers.utils.parseUnits("100", "ether");
    const factoryContract = await PunkTLDFactory.deploy(priceToCreateTld, forbTldsContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    // create TLD contract
    const PunkTLD = await ethers.getContractFactory("PunkTLD");

    tldContract = await PunkTLD.deploy(
      tldName, // name
      tldSymbol, // symbol
      signer.address, // temp TLD owner
      tldPrice, // domain price
      false, // buying enabled
      tldRoyalty, // royalty
      factoryContract.address
    );

    // transition contract
    const transitionCode = await ethers.getContractFactory(partnerContractName);
    transitionContract = await transitionCode.deploy(
      tldContract.address, // TLD address
      ethers.utils.parseEther("14") // refund amount per domain
    );

    // send 14 MATIC to the transition contract
    await signer.sendTransaction({
      to: transitionContract.address,
      value: ethers.utils.parseEther("14")
    });
  });

  it("should confirm TLD name & symbol", async function () {
    const l2Name = await tldContract.name();
    expect(l2Name).to.equal(tldName);
    const l2Symbol = await tldContract.symbol();
    expect(l2Symbol).to.equal(tldSymbol);
  });

  it("should transfer contract ownership to another address (only owner)", async function () {
    await expect(transitionContract.connect(user1).transferOwnership(
      user1.address
    )).to.be.revertedWith('Ownable: caller is not the owner');

    const ownerBefore = await transitionContract.owner();
    expect(ownerBefore).to.equal(signer.address);

    await transitionContract.transferOwnership(user2.address);

    const ownerAfter = await transitionContract.owner();
    expect(ownerAfter).to.equal(user2.address);
  });
  
  it("should mint and transition one domain", async function () {
    const domain1 = "techie";

    // mint a domain
    await tldContract.mint(
      domain1, // domain name (without TLD)
      signer.address, // domain owner
      ethers.constants.AddressZero, // referrer
      {
        value: tldPrice // pay  for the domain
      }
    );

    const domainHolderBefore = await tldContract.getDomainHolder(domain1);
    expect(domainHolderBefore).to.equal(signer.address);

    await transitionContract.togglePaused();

    // approve all NFT domains
    await tldContract.setApprovalForAll(transitionContract.address, true);

    // get signer's balance BEFORE
    const balanceSignerBefore = await provider.getBalance(signer.address);
    console.log("Signer balance after transition: " + ethers.utils.formatEther(balanceSignerBefore) + " MATIC");

    // Fail at transitioning if not the holder (user1)
    await expect(
      transitionContract.connect(user1).claimRefund(domain1)
    ).to.be.revertedWith("Transition: Sender is not domain holder.");

    // transition (signer)
    const tx = await transitionContract.claimRefund(domain1);

    const receipt = await tx.wait();

    calculateGasCosts("Transition domain", receipt);

    const domainHolderAfter = await tldContract.getDomainHolder(domain1);
    expect(domainHolderAfter).to.equal(transitionContract.address);

    // get signer's balance AFTER (should receive 14 MATIC minus the tx fees)
    const balanceSignerAfter = await provider.getBalance(signer.address);
    expect(balanceSignerAfter).to.be.gt(balanceSignerBefore);
    console.log("Signer balance after transition: " + ethers.utils.formatEther(balanceSignerAfter) + " MATIC");

    // Fail at transitioning the same domain name
    await expect(
      transitionContract.claimRefund(domain1)
    ).to.be.revertedWith("Transition: Sender is not domain holder.");
  });
  
  it("should mint and transition multiple domains at once (bulk)", async function () {
    const domain1 = "tempe";
    const domain2 = "techie";
    const domain3 = "punkdomains";

    // mint domain 1
    await tldContract.mint(
      domain1, // domain name (without TLD)
      signer.address, // domain owner
      ethers.constants.AddressZero, // referrer
      {
        value: tldPrice // pay  for the domain
      }
    );

    // mint domain 2
    await tldContract.mint(
      domain2, // domain name (without TLD)
      signer.address, // domain owner
      ethers.constants.AddressZero, // referrer
      {
        value: tldPrice // pay  for the domain
      }
    );

    // mint domain 3
    await tldContract.mint(
      domain3, // domain name (without TLD)
      signer.address, // domain owner
      ethers.constants.AddressZero, // referrer
      {
        value: tldPrice // pay  for the domain
      }
    );

    const domainHolderBefore1 = await tldContract.getDomainHolder(domain1);
    expect(domainHolderBefore1).to.equal(signer.address);

    const domainHolderBefore2 = await tldContract.getDomainHolder(domain2);
    expect(domainHolderBefore2).to.equal(signer.address);

    const domainHolderBefore3 = await tldContract.getDomainHolder(domain3);
    expect(domainHolderBefore3).to.equal(signer.address);

    await transitionContract.togglePaused();

    // send additional 28 MATIC to the transition contract (total: 42 MATIC in contract)
    await signer.sendTransaction({
      to: transitionContract.address,
      value: ethers.utils.parseEther("28")
    });

    // approve all NFT domains
    await tldContract.setApprovalForAll(transitionContract.address, true);

    // get signer's balance BEFORE
    const balanceSignerBefore = await provider.getBalance(signer.address);
    console.log("Signer balance after transition: " + ethers.utils.formatEther(balanceSignerBefore) + " MATIC");

    // Fail at transitioning if not the holder (user1)
    await expect(
      transitionContract.connect(user1).claimRefundBulk([domain1, domain2, domain3])
    ).to.be.revertedWith("Transition: Sender is not domain holder.");

    // transition (signer)
    const tx = await transitionContract.claimRefundBulk(
      [domain1, domain2, domain3] // domain names array
    );

    const receipt = await tx.wait();

    calculateGasCosts("Transition domain", receipt);

    const domainHolderAfter1 = await tldContract.getDomainHolder(domain1);
    expect(domainHolderAfter1).to.equal(transitionContract.address);

    const domainHolderAfter2 = await tldContract.getDomainHolder(domain2);
    expect(domainHolderAfter2).to.equal(transitionContract.address);

    const domainHolderAfter3 = await tldContract.getDomainHolder(domain3);
    expect(domainHolderAfter3).to.equal(transitionContract.address);

    // get signer's balance AFTER (should receive 42 MATIC minus the tx fees)
    const balanceSignerAfter = await provider.getBalance(signer.address);
    expect(balanceSignerAfter).to.be.gt(balanceSignerBefore);
    console.log("Signer balance after transition: " + ethers.utils.formatEther(balanceSignerAfter) + " MATIC");
  });

  it("should recover ERC-20 tokens mistakenly sent to contract address", async function () {
    const ERC20MockToken = await ethers.getContractFactory("MockErc20Token");
    const mockErc20Contract = await ERC20MockToken.deploy("Mock", "MOCK");

    const signerBalance = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance))).to.equal(1000); // 1000 tokens minted in the ERC20 contract constructor

    const mintContractBalance = await mockErc20Contract.balanceOf(transitionContract.address);
    expect(mintContractBalance).to.equal(0); // should be 0

    // send 200 tokens to contract
    await mockErc20Contract.transfer(transitionContract.address, ethers.utils.parseEther("200"));

    const signerBalance2 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance2))).to.equal(800);

    const mintContractBalance2 = await mockErc20Contract.balanceOf(transitionContract.address);
    expect(Number(ethers.utils.formatEther(mintContractBalance2))).to.equal(200);

    // recover tokens from contract
    await transitionContract.recoverERC20(
      mockErc20Contract.address, // token address
      ethers.utils.parseEther("200"), // token amount
      signer.address // recipient
    );

    const signerBalance3 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance3))).to.equal(1000); // back to 1000

    const mintContractBalance3 = await mockErc20Contract.balanceOf(transitionContract.address);
    expect(Number(ethers.utils.formatEther(mintContractBalance3))).to.equal(0); // back to 0
  });

  it("should recover ERC-721 tokens mistakenly sent to contract address", async function () {
    // Create NFT contracts which can be whitelisted
    const Erc721Contract = await ethers.getContractFactory("MockErc721Token");
    const nftContract1 = await Erc721Contract.deploy("Some 3rd party NFT", "SOMENFT");

    const balanceSigner1 = await nftContract1.balanceOf(signer.address);
    expect(balanceSigner1).to.equal(1);

    const balanceContract1 = await nftContract1.balanceOf(transitionContract.address);
    expect(balanceContract1).to.equal(0);

    // send NFT level 1 to contract address
    await nftContract1.transferFrom(
      signer.address, // from
      transitionContract.address, // to
      0 // token ID
    );

    const balanceSigner2 = await nftContract1.balanceOf(signer.address);
    expect(balanceSigner2).to.equal(0);

    const balanceContract2 = await nftContract1.balanceOf(transitionContract.address);
    expect(balanceContract2).to.equal(1);

    // recover NFT
    await transitionContract.recoverERC721(
      nftContract1.address, // NFT address
      0, // NFT token ID
      signer.address // recipient
    );

    const balanceSigner3 = await nftContract1.balanceOf(signer.address);
    expect(balanceSigner3).to.equal(1);

    const balanceContract3 = await nftContract1.balanceOf(transitionContract.address);
    expect(balanceContract3).to.equal(0);
  });

});
