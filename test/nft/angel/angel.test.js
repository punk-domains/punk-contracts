// Run tests:
// npx hardhat test test/nft/angel/angel.test.js 

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

describe("Punk Angel minting contract", function () {
  let tldContract;
  const tldName = ".punkangel";
  const tldSymbol = ".PUNKANGEL";
  const tldPrice = 0;
  const tldRoyalty = 0;
  const tldReferral = 0;

  let paymentTokenContract;
  const paymentTokenDecimals = 6;
  const paymentTokenName = "USDC";
  const paymentTokenSymbol = "USDC";

  let mintContract;
  const maxTotalPayments = ethers.utils.parseUnits("100000", paymentTokenDecimals); // $100k
  const price1char = ethers.utils.parseUnits("10000", paymentTokenDecimals); // $10k
  const price2char = ethers.utils.parseUnits("3000", paymentTokenDecimals);
  const price3char = ethers.utils.parseUnits("999", paymentTokenDecimals);
  const price4char = ethers.utils.parseUnits("199", paymentTokenDecimals);
  const price5char = ethers.utils.parseUnits("69", paymentTokenDecimals);

  let metadataContract;

  let signer;
  let user1;
  let user2;

  beforeEach(async function () {
    [signer, user1, user2] = await ethers.getSigners();

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
      false, // buying enabled
      tldRoyalty,
      factoryContract.address,
      flexiMetadataContract.address
    );

    // Create mock payment token
    const Erc20ContractDecimals = await ethers.getContractFactory("MockErc20TokenDecimals");
    paymentTokenContract = await Erc20ContractDecimals.deploy(paymentTokenName, paymentTokenSymbol, paymentTokenDecimals);

    // transfer all signer's tokens to user1
    paymentTokenContract.transfer(user1.address, ethers.utils.parseUnits("1000", paymentTokenDecimals));

    // deploy Punk Angels metadata contract
    const PunkAngelMetadata = await ethers.getContractFactory("PunkAngelMetadata");
    metadataContract = await PunkAngelMetadata.deploy();

    // add it to the TLD contract
    await tldContract.changeMetadataAddress(metadataContract.address);

    // Minter contract
    const minterCode = await ethers.getContractFactory("PunkAngelMinter");
    mintContract = await minterCode.deploy(
      paymentTokenContract.address, // payment token address
      tldContract.address, // TLD address
      metadataContract.address, // metadata contract
      maxTotalPayments,
      price1char, price2char, price3char, price4char, price5char
    );

    // set minter contract as TLD minter address
    await tldContract.changeMinter(mintContract.address);

    // set minter contract in the metadata contract
    await metadataContract.changeMinter(mintContract.address);
  });

  it("should confirm TLD name & symbol", async function () {
    const _tldName = await tldContract.name();
    expect(_tldName).to.equal(tldName);
    const _tldSymbol = await tldContract.symbol();
    expect(_tldSymbol).to.equal(tldSymbol);
  });

  it("should mint two 5+ char domains", async function () {
    const featureIds = ["3A1174741911F257FFCA965A000000231", "3A1174741911F257FFCA965A000000121", "3A1174741911F257FFCA965A000000020"];

    await mintContract.togglePaused();

    // user1 has 1000 payment tokens

    // should fail at minting before allowance is set
    await expect(mintContract.connect(user1).mint(
      "1234", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      featureIds
    )).to.be.reverted;

    // Give payment token allowance
    await paymentTokenContract.connect(user1).approve(
      mintContract.address, // spender
      price5char // amount
    );

    // how many domains user1 has before minting
    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    // TLD contract owner's balance before minting
    const ownerBalanceBefore = await paymentTokenContract.balanceOf(signer.address);
    expect(ownerBalanceBefore).to.equal(0);
    console.log("Signer's payment token balance before first mint: " + ethers.utils.formatUnits(ownerBalanceBefore, paymentTokenDecimals) + " " + paymentTokenSymbol);

    // Mint a domain
    const tx = await mintContract.connect(user1).mint(
      "user12", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      featureIds
    );

    const receipt = await tx.wait();

    calculateGasCosts("Mint", receipt);

    // get metadata
    const metadata1 = await tldContract.tokenURI(1);
  
    const mdJson1 = Buffer.from(metadata1.substring(29), "base64");
    const mdResult1 = JSON.parse(mdJson1);

    expect(mdResult1.name).to.equal("user12.punkangel");
    //console.log(mdResult1.image);

    const balanceDomainAfter = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(1);

    const domainHolder = await tldContract.getDomainHolder("user12");
    expect(domainHolder).to.equal(user1.address);

    // TLD contract owner's balance after minting
    const ownerBalanceAfter = await paymentTokenContract.balanceOf(signer.address);
    expect(ownerBalanceAfter).to.equal(price5char); // signer gets both royalty and the rest of the domain payment
    console.log("Signer's payment token balance after first mint: " + ethers.utils.formatUnits(ownerBalanceAfter, paymentTokenDecimals) + " " + paymentTokenSymbol);

    // Give payment token allowance
    await paymentTokenContract.connect(user1).approve(
      mintContract.address, // spender
      price5char // amount
    );

    // should not fail at minting another domain
    await mintContract.connect(user1).mint(
      "user1second", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      featureIds
    );

    const balanceDomainAfter2 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter2).to.equal(2);

    // get metadata2
    const metadata2 = await tldContract.tokenURI(2);
  
    const mdJson2 = Buffer.from(metadata2.substring(29), "base64");
    const mdResult2 = JSON.parse(mdJson2);

    expect(mdResult2.name).to.equal("user1second.punkangel");
    //console.log(mdResult1.image);

    // should FAIL at minting a domain with 4 chars

    // Give payment token allowance
    await paymentTokenContract.connect(user1).approve(
      mintContract.address, // spender
      price5char // amount
    );

    // should fail if domain is 4 chars, but payment is for 5 chars (too low)
    await expect(mintContract.connect(user1).mint(
      "user", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      featureIds
    )).to.be.reverted;

    const balanceDomainAfter3 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter3).to.equal(2);

    // should revert becuase feature IDs is already taken
    await expect(mintContract.connect(user1).mint(
      "hello", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      ["3A1174741911F257FFCA965A000000231", "3A1174741911F257FFCA965A000000121"] // already used feature IDs
    )).to.be.revertedWith("Feature IDs already used");

    const balanceDomainAfter4 = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter4).to.equal(2);
  });

  it("should pause minting when max payment amount is reached", async function () {
    // max payment amount is $100k
    // 10 domains (1 char for $10k)

    const featureIds = [
      "3A1174741911F257FFCA965A000000231", 
      "3A1174741911F257FFCA965A000000121", 
      "3A1174741911F257FFCA965A000000120",
      "3A1174741911F257FFCA965A000000110",
      "3A1174741911F257FFCA965A000000000",
      "3A1174741911F257FFCA965A000000100",
      "3A1174741911F257FFCA965A000000210",
      "3A1174741911F257FFCA965A000000200",
      "3A1174741911F257FFCA965A000000220",
      "3A1174741911F257FFCA965A000000221"
    ];

    const pausedBefore1 = await mintContract.paused();
    expect(pausedBefore1).to.be.true;

    await mintContract.togglePaused();

    const pausedBefore2 = await mintContract.paused();
    expect(pausedBefore2).to.be.false;

    // mint new payment tokens for user1
    await paymentTokenContract.connect(user1).mint(
      user1.address,
      maxTotalPayments
    );

    // Give payment token allowance
    await paymentTokenContract.connect(user1).approve(
      mintContract.address, // spender
      maxTotalPayments // amount
    );

    // how many domains user1 has before minting
    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    // TLD contract owner's balance before minting
    const ownerBalanceBefore = await paymentTokenContract.balanceOf(signer.address);
    expect(ownerBalanceBefore).to.equal(0);
    console.log("Signer's payment token balance before first mint: " + ethers.utils.formatUnits(ownerBalanceBefore, paymentTokenDecimals) + " " + paymentTokenSymbol);

    // Mint 10 domains
    await mintContract.connect(user1).mint(
      "0", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      [featureIds[0]]
    );
    
    await mintContract.connect(user1).mint(
      "1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      [featureIds[1]]
    );
    
    await mintContract.connect(user1).mint(
      "2", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      [featureIds[2]]
    );
    
    await mintContract.connect(user1).mint(
      "3", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      [featureIds[3]]
    );
    
    await mintContract.connect(user1).mint(
      "4", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      [featureIds[4]]
    );
    
    await mintContract.connect(user1).mint(
      "5", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      [featureIds[5]]
    );
    
    await mintContract.connect(user1).mint(
      "6", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      [featureIds[6]]
    );
    
    await mintContract.connect(user1).mint(
      "7", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      [featureIds[7]]
    );
    
    await mintContract.connect(user1).mint(
      "8", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      [featureIds[8]]
    );
    
    await mintContract.connect(user1).mint(
      "9", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      [featureIds[9]]
    );

    // get metadata for 5.punkangel
    const metadata = await tldContract.tokenURI(6);
  
    const mdJson = Buffer.from(metadata.substring(29), "base64");
    const mdResult = JSON.parse(mdJson);

    expect(mdResult.name).to.equal("5.punkangel");
    expect(mdResult.paid).to.equal(price1char);
    console.log(mdResult.attributes);

    const pausedAfter = await mintContract.paused();
    expect(pausedAfter).to.be.true;

    const balanceDomainAfter = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(10);

    // TLD contract owner's balance after minting
    const ownerBalanceAfter = await paymentTokenContract.balanceOf(signer.address);
    expect(ownerBalanceAfter).to.equal(maxTotalPayments); // signer gets both royalty and the rest of the domain payment
    console.log("Signer's payment token balance after first mint: " + ethers.utils.formatUnits(ownerBalanceAfter, paymentTokenDecimals) + " " + paymentTokenSymbol);
    
    // TRY ANOTHER MINT

    // Give payment token allowance
    await paymentTokenContract.connect(user1).approve(
      mintContract.address, // spender
      maxTotalPayments // amount
    );

    // should revert because minting is paused
    await expect(mintContract.connect(user1).mint(
      "hello", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      ["3A1174741911F257FFCA965A000000331"]
    )).to.be.revertedWith("Minting paused");

    // unpause minting
    await mintContract.togglePaused();

    // should revert because max payment is reached
    await expect(mintContract.connect(user1).mint(
      "hello", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      ["3A1174741911F257FFCA965A000000331"]
    )).to.be.revertedWith("Max total payments reached");
  });

  it("should change domain price (only owner)", async function () {
    const priceBefore = await mintContract.price5char();
    expect(priceBefore).to.equal(price5char);

    const newPrice = ethers.utils.parseUnits("70", paymentTokenDecimals); // domain price is in payment tokens

    await mintContract.changePrice(
      newPrice, 
      5 // chars (price for domains with 5 chars)
    );

    const priceAfter = await mintContract.price5char();
    expect(priceAfter).to.equal(newPrice);

    // cannot be zero
    await expect(mintContract.changePrice(0, 5)).to.be.revertedWith('Cannot be zero');
    
    // if user is not owner, the tx should revert
    await expect(mintContract.connect(user1).changePrice(123456, 5)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change referral fee (only owner)", async function () {
    const refBefore = await mintContract.referralFee();
    expect(refBefore).to.equal(1000);

    const newRef = 1500;

    await mintContract.changeReferralFee(newRef);

    const refAfter = await mintContract.referralFee();
    expect(refAfter).to.equal(newRef);

    // cannot exceed 20%
    await expect(mintContract.changeReferralFee(2100)).to.be.revertedWith('Cannot exceed 20%');

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

});
