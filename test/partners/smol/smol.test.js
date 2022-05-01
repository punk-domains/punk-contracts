// Run tests:
// npx hardhat test test/partners/smol/smol.test.js 

const { expect } = require("chai");
const partnerContractName = "SmolPunkDomains";

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const eth = 3000;
  
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("100", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostArbitrum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1.25", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Arbitrum): $" + String(Number(gasCostArbitrum)*eth));
}

describe(partnerContractName + " (partner contract)", function () {
  let tldContract;
  const tldName = ".smol";
  const tldSymbol = ".SMOL";
  const tldPrice = 0;
  const tldRoyalty = 0;
  const tldReferral = 0;

  let paymentTokenContract;
  const paymentTokenDecimals = 18; // $MAGIC has 18 decimals
  const paymentTokenSymbol = "MAGIC";

  let wrapperContract;
  const wrapperPrice = ethers.utils.parseUnits("15", paymentTokenDecimals); // in $MAGIC tokens (18 decimals)
  const wrapperRoyalty = 2000;
  const wrapperReferral = 1000;

  let nftContract1;
  const nftName1 = "Smol Brains";
  const nftSymbol1 = "SMOLBRAINS";

  let nftContract2;
  const nftName2 = "Smol Bodies";
  const nftSymbol2 = "SMOLBODIES";

  let signer;
  let user1;
  let user2;

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

    // Create NFT contracts which can be whitelisted
    const Erc721Contract = await ethers.getContractFactory("MockErc721Token");
    nftContract1 = await Erc721Contract.deploy(nftName1, nftSymbol1);
    nftContract2 = await Erc721Contract.deploy(nftName2, nftSymbol2);

    // Create mock $MAGIC token
    const Erc20ContractDecimals = await ethers.getContractFactory("MockErc20TokenDecimals");
    paymentTokenContract = await Erc20ContractDecimals.deploy("Magic", "MAGIC", paymentTokenDecimals);

    // transfer all signer's tokens to user1
    paymentTokenContract.transfer(user1.address, ethers.utils.parseUnits("1000", paymentTokenDecimals));

    // Wrapper contract
    const wrapperCode = await ethers.getContractFactory(partnerContractName);
    wrapperContract = await wrapperCode.deploy(
      nftContract1.address, // NFT address
      tldContract.address, // TLD address
      paymentTokenContract.address, // payment token address
      wrapperPrice // price (in payment token)
    );

    // transfer TLD ownership to the wrapper contract
    await tldContract.transferOwnership(wrapperContract.address);
  });

  it("should confirm TLD name & symbol", async function () {
    const l2Name = await tldContract.name();
    expect(l2Name).to.equal(tldName);
    const l2Symbol = await tldContract.symbol();
    expect(l2Symbol).to.equal(tldSymbol);
  });
  
  it("should check if user can mint", async function () {
    // signer can mint
    const balanceSigner = await nftContract1.balanceOf(signer.address);
    expect(balanceSigner).to.equal(1);

    const canMintSigner = await wrapperContract.canUserMint(signer.address);
    expect(canMintSigner).to.be.true;

    // user 1 cannot mint
    const balanceUser1 = await nftContract1.balanceOf(user1.address);
    expect(balanceUser1).to.equal(0);

    const canMintUser1 = await wrapperContract.canUserMint(user1.address);
    expect(canMintUser1).to.be.false;
  });

  it("should add/remove an NFT to the supported NFTs array (only owner)", async function () {
    const arrLengthStart = await wrapperContract.getSupportedNftsArrayLength();
    expect(arrLengthStart).to.equal(1);

    // add new NFT address (nftContract2)
    await wrapperContract.addWhitelistedNftContract(nftContract2.address);

    const arrLengthAfterAdd = await wrapperContract.getSupportedNftsArrayLength();
    expect(arrLengthAfterAdd).to.equal(2);

    // remove NFT address
    await wrapperContract.removeWhitelistedNftContract(0); // remove first address (index = 0)

    const arrLengthAfterRemove = await wrapperContract.getSupportedNftsArrayLength();
    expect(arrLengthAfterRemove).to.equal(1);

    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).removeWhitelistedNftContract(0)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should transfer TLD ownership to another address (only owner)", async function () {
    await expect(wrapperContract.connect(user1).transferTldOwnership(
      user1.address
    )).to.be.revertedWith('Ownable: caller is not the owner');

    const ownerTldBefore = await tldContract.owner();
    expect(ownerTldBefore).to.equal(wrapperContract.address);

    await wrapperContract.transferTldOwnership(user2.address);

    const ownerTldAfter = await tldContract.owner();
    expect(ownerTldAfter).to.equal(user2.address);
  });

  
  it("should mint a new domain", async function () {

    await wrapperContract.togglePaused();

    // check if user1 has an NFT1
    const nftBalanceBefore = await nftContract1.balanceOf(user1.address);
    expect(nftBalanceBefore).to.equal(0);

    const canMintUser1Before1 = await wrapperContract.canUserMint(user1.address);
    expect(canMintUser1Before1).to.be.false;

    // Give payment token allowance
    await paymentTokenContract.connect(user1).approve(
      wrapperContract.address, // spender
      wrapperPrice // amount
    );

    // should fail at minting a domain without an NFT
    await expect(wrapperContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
    )).to.be.revertedWith('User cannot mint a domain');

    // mint an NFT1 for user1
    await nftContract1.mint(user1.address);

    const nftBalanceAfter = await nftContract1.balanceOf(user1.address);
    expect(nftBalanceAfter).to.equal(1);

    const canMintUser1Before2 = await wrapperContract.canUserMint(user1.address);
    expect(canMintUser1Before2).to.be.true;

    // how many domains user1 has before minting
    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    // wrapper contract owner's balance before minting
    const ownerBalanceBefore = await paymentTokenContract.balanceOf(signer.address);
    expect(ownerBalanceBefore).to.equal(0);
    console.log("Signer's payment token balance before first mint: " + ethers.utils.formatEther(ownerBalanceBefore) + " " + paymentTokenSymbol);

    // Mint a domain
    const tx = await wrapperContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
    );

    const receipt = await tx.wait();

    calculateGasCosts("Mint with NFT1", receipt);
    
    const balanceDomainAfter = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(1);

    const domainHolder = await tldContract.getDomainHolder("user1");
    expect(domainHolder).to.equal(user1.address);

    const canMintUser1After1 = await wrapperContract.canUserMint(user1.address);
    expect(canMintUser1After1).to.be.true; // NFT holder can mint as many domains as they want

    // wrapper contract owner's balance after minting
    const ownerBalanceAfter = await paymentTokenContract.balanceOf(signer.address);
    expect(ownerBalanceAfter).to.equal(wrapperPrice); // signer gets both royalty and the rest of the domain payment
    console.log("Signer's payment token balance after first mint: " + ethers.utils.formatEther(ownerBalanceAfter) + " " + paymentTokenSymbol);

    // Give payment token allowance
    await paymentTokenContract.connect(user1).approve(
      wrapperContract.address, // spender
      wrapperPrice // amount
    );

    // should not fail at minting another domain with the same NFT
    await wrapperContract.connect(user1).mint(
      "user1second", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
    );

    const balanceDomainAfter2 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter2).to.equal(2);
  });

  it("should allow owner to add a new NFT address and user to mint with any of them", async function () {
    await wrapperContract.togglePaused();

    // mint NFT1
    const nftBalanceBefore = await nftContract1.balanceOf(user1.address);
    expect(nftBalanceBefore).to.equal(0);
    
    await nftContract1.mint(user1.address);

    const nftBalanceAfter = await nftContract1.balanceOf(user1.address);
    expect(nftBalanceAfter).to.equal(1);

    // mint NFT2
    const nft2BalanceBefore = await nftContract2.balanceOf(user1.address);
    expect(nft2BalanceBefore).to.equal(0);

    await nftContract2.mint(user1.address);

    const nft2BalanceAfter = await nftContract2.balanceOf(user1.address);
    expect(nft2BalanceAfter).to.equal(1);

    // add NFT2 to contract as whitelisted NFT address
    await wrapperContract.addWhitelistedNftContract(nftContract2.address);

    const arrLengthAfterAdd = await wrapperContract.getSupportedNftsArrayLength();
    expect(arrLengthAfterAdd).to.equal(2);

    // check user's domain balance before domain mint
    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    const canMintUser1 = await wrapperContract.canUserMint(user1.address);
    expect(canMintUser1).to.be.true;

    // Give payment token allowance
    await paymentTokenContract.connect(user1).approve(
      wrapperContract.address, // spender
      wrapperPrice // amount
    );

    // Mint a domain with NFT1
    await wrapperContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
    );

    // Give payment token allowance
    await paymentTokenContract.connect(user1).approve(
      wrapperContract.address, // spender
      wrapperPrice // amount
    );

    // Fail at minting the same domain name with NFT2
    await expect(wrapperContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
    )).to.be.revertedWith("Domain with this name already exists");

    const canMintUser2 = await wrapperContract.canUserMint(user1.address);
    expect(canMintUser2).to.be.true;

    // Mint another domain with NFT2
    const tx = await wrapperContract.connect(user1).mint(
      "user1another", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
    );

    const receipt = await tx.wait();

    calculateGasCosts("Mint with NFT2", receipt);

    const canMintUser3 = await wrapperContract.canUserMint(user1.address);
    expect(canMintUser3).to.be.true; // NFT holder can mint as many domains as they want

    // Give payment token allowance
    await paymentTokenContract.connect(user1).approve(
      wrapperContract.address, // spender
      wrapperPrice // amount
    );

    // Succeed at minting yet another domain
    await wrapperContract.connect(user1).mint(
      "user1third", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
    );

    const balanceDomainAfter = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(3);

    const domainHolder1 = await tldContract.getDomainHolder("user1");
    expect(domainHolder1).to.equal(user1.address);

    const domainHolder2 = await tldContract.getDomainHolder("user1another");
    expect(domainHolder2).to.equal(user1.address);

    const domainHolder3 = await tldContract.getDomainHolder("user1third");
    expect(domainHolder3).to.equal(user1.address);
  });

  it("should allow owner to mint domain without NFT needed (only owner)", async function () {
    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    await wrapperContract.ownerMintDomain(
      "user1",
      user1.address, // domain holder
    );

    const balanceDomainAfter = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(1);

    const domainHolder = await tldContract.getDomainHolder("user1");
    expect(domainHolder).to.equal(user1.address);

    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).ownerMintDomain(
      "user1more",
      user1.address, // domain holder
    )).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change domain price (only owner)", async function () {
    const priceBefore = await wrapperContract.price();
    expect(priceBefore).to.equal(wrapperPrice);

    const newPrice = ethers.utils.parseUnits("200", paymentTokenDecimals); // domain price is in payment tokens

    await wrapperContract.changePrice(
      newPrice
    );

    const priceAfter = await wrapperContract.price();
    expect(priceAfter).to.equal(newPrice);

    // cannot be zero
    await expect(wrapperContract.changePrice(0)).to.be.revertedWith('Cannot be zero');
    
    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).changePrice(123456)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change referral fee (only owner)", async function () {
    const refBefore = await wrapperContract.referralFee();
    expect(refBefore).to.equal(1000);

    const newRef = 1500;

    await wrapperContract.changeReferralFee(newRef);

    const refAfter = await wrapperContract.referralFee();
    expect(refAfter).to.equal(newRef);

    // cannot exceed 20%
    await expect(wrapperContract.changeReferralFee(2100)).to.be.revertedWith('Cannot exceed 20%');

    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).changeReferralFee(666)).to.be.revertedWith('Ownable: caller is not the owner');
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

    const newDes = "New description!!!";

    await wrapperContract.changeTldDescription(newDes);

    const desAfter = await tldContract.description();
    expect(desAfter).to.equal(newDes);

    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).changeTldDescription("pwned")).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change royalty fee (only factory owner)", async function () {
    const rBefore = await wrapperContract.royaltyFee();
    expect(rBefore).to.equal(2000);

    const newFee = 1500;

    await wrapperContract.changeRoyaltyFee(newFee);

    const rAfter = await wrapperContract.royaltyFee();
    expect(rAfter).to.equal(newFee);

    // cannot exceed 20%
    await expect(wrapperContract.changeRoyaltyFee(2100)).to.be.revertedWith('Cannot exceed 20%');

    // if user is not owner, the tx should revert
    await expect(wrapperContract.connect(user1).changeRoyaltyFee(666)).to.be.revertedWith('Wrapper: Caller is not Factory owner');
  });

  it("should recover ERC-20 tokens mistakenly sent to contract address", async function () {
    const ERC20MockToken = await ethers.getContractFactory("MockErc20Token");
    const mockErc20Contract = await ERC20MockToken.deploy("Mock", "MOCK");

    const signerBalance = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance))).to.equal(1000); // 1000 tokens minted in the ERC20 contract constructor

    const mintContractBalance = await mockErc20Contract.balanceOf(wrapperContract.address);
    expect(mintContractBalance).to.equal(0); // should be 0

    // send 200 tokens to contract
    await mockErc20Contract.transfer(wrapperContract.address, ethers.utils.parseEther("200"));

    const signerBalance2 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance2))).to.equal(800);

    const mintContractBalance2 = await mockErc20Contract.balanceOf(wrapperContract.address);
    expect(Number(ethers.utils.formatEther(mintContractBalance2))).to.equal(200);

    // recover tokens from contract
    await wrapperContract.recoverERC20(
      mockErc20Contract.address, // token address
      ethers.utils.parseEther("200"), // token amount
      signer.address // recipient
    );

    const signerBalance3 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance3))).to.equal(1000); // back to 1000

    const mintContractBalance3 = await mockErc20Contract.balanceOf(wrapperContract.address);
    expect(Number(ethers.utils.formatEther(mintContractBalance3))).to.equal(0); // back to 0
  });

  it("should recover ERC-721 tokens mistakenly sent to contract address", async function () {
    const balanceSigner1 = await nftContract1.balanceOf(signer.address);
    expect(balanceSigner1).to.equal(1);

    const balanceContract1 = await nftContract1.balanceOf(wrapperContract.address);
    expect(balanceContract1).to.equal(0);

    // send NFT level 1 to contract address
    await nftContract1.transferFrom(
      signer.address, // from
      wrapperContract.address, // to
      0 // token ID
    );

    const balanceSigner2 = await nftContract1.balanceOf(signer.address);
    expect(balanceSigner2).to.equal(0);

    const balanceContract2 = await nftContract1.balanceOf(wrapperContract.address);
    expect(balanceContract2).to.equal(1);

    // recover NFT
    await wrapperContract.recoverERC721(
      nftContract1.address, // NFT address
      0, // NFT token ID
      signer.address // recipient
    );

    const balanceSigner3 = await nftContract1.balanceOf(signer.address);
    expect(balanceSigner3).to.equal(1);

    const balanceContract3 = await nftContract1.balanceOf(wrapperContract.address);
    expect(balanceContract3).to.equal(0);
  });

});
