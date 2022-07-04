// npx hardhat test test/nft/angel/angel.test.js
const { expect } = require("chai");

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const matic = 2;
  const eth = 3000;
  
  const gasCostMatic = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("35", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("100", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostArbitrum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1.25", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Arbitrum): $" + String(Number(gasCostArbitrum)*eth));
  console.log(testName + " gas cost (Polygon): $" + String(Number(gasCostMatic)*matic));
}

/*
describe("Punk Angel NFT", function () {
  let contract;
  let metadataContract;
  let usdcContract;
  let owner;
  let user1;
  let user2;

  const nftName = "Punk Angel";
  const nftSymbol = "PDANGEL";
  const nftIdCounter = 1;

  const usdcDecimals = 6;
  const nftPrice = ethers.utils.parseUnits("500", usdcDecimals); // NFT price is in USDC (mwei, 6 decimals)

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // mock USDC contract
    const Erc20ContractDecimals = await ethers.getContractFactory("MockErc20TokenDecimals");
    usdcContract = await Erc20ContractDecimals.deploy("USD Coin", "USDC", usdcDecimals); // 1000 USDC were minted for signer

    // metadata contract
    const PunkAngelMetadata = await ethers.getContractFactory("PunkAngelMetadata");
    metadataContract = await PunkAngelMetadata.deploy();

    // punk angel NFT contract
    const PunkAngelNft = await ethers.getContractFactory("PunkAngelNft");
    contract = await PunkAngelNft.deploy(
      nftName,
      nftSymbol,
      nftIdCounter,
      nftPrice,
      metadataContract.address,
      usdcContract.address
    );
  });

  xit("should confirm NFT name & symbol", async function () {
    const name = await contract.name();
    expect(name).to.equal(nftName);
    const symbol = await contract.symbol();
    expect(symbol).to.equal(nftSymbol);
  });

  xit("should mint 1 new NFT", async function () {
    // USDC balance before minting USDC
    const user1UsdcBalanceBefore1 = await usdcContract.balanceOf(user1.address);
    expect(user1UsdcBalanceBefore1).to.equal(ethers.utils.parseUnits("0", usdcDecimals));

    // mint 500 USDC for user1
    await usdcContract.mint(user1.address, nftPrice);

    // USDC balance after minting USDC (but before minting NFT)
    const user1UsdcBalanceBefore2 = await usdcContract.balanceOf(user1.address);
    expect(user1UsdcBalanceBefore2).to.equal(nftPrice);

    // NFT balance before
    const user1NftBalanceBefore = await contract.balanceOf(user1.address);
    expect(user1NftBalanceBefore).to.equal(0);

    // give USDC allowance to the NFT contract
    await usdcContract.connect(user1).approve(
      contract.address, // spender
      nftPrice // allowance for the NFT price
    );

    // fail at minting when contract is paused
    await expect(contract.connect(user1).mint(
      user1.address,
      1
    )).to.be.revertedWith('Minting paused');

    // unpause contract
    await contract.toggleMintingPaused();

    // mint 1 NFT
    const tx = await contract.connect(user1).mint(
      user1.address,
      1
    );

    const receipt = await tx.wait()

    calculateGasCosts("Mint 1 NFT", receipt);

    // USDC balance after minting NFT
    const user1UsdcBalanceAfter = await usdcContract.balanceOf(user1.address);
    expect(user1UsdcBalanceAfter).to.equal(ethers.utils.parseUnits("0", usdcDecimals));

    // NFT balance after
    const user1NftBalanceAfter = await contract.balanceOf(user1.address);
    expect(user1NftBalanceAfter).to.equal(1);
    
    // owner of NFT #1
    const ownerOf1 = await contract.ownerOf(nftIdCounter); // ID counter set in constructor
    expect(ownerOf1).to.equal(user1.address);

    // fetch tokenURI data
    const metadata = await contract.tokenURI(nftIdCounter);

    const mdJson = Buffer.from(metadata.substring(29), "base64");
    const mdResult = JSON.parse(mdJson);

    expect(mdResult.name).to.equal("Cyberpunk Angel #" + nftIdCounter);
    expect(mdResult.description).to.equal("A collection of Punk Angel NFTs created by Punk Domains: https://punk.domains"); 
    
  });

  xit("should fail at minting when minting is stopped permanently", async function () {
    // USDC balance before minting USDC
    const user1UsdcBalanceBefore1 = await usdcContract.balanceOf(user1.address);
    expect(user1UsdcBalanceBefore1).to.equal(ethers.utils.parseUnits("0", usdcDecimals));

    // mint 1000 USDC for user1
    await usdcContract.mint(user1.address, ethers.utils.parseUnits("1000", usdcDecimals));

    // USDC balance after minting USDC (but before minting NFT)
    const user1UsdcBalanceBefore2 = await usdcContract.balanceOf(user1.address);
    expect(user1UsdcBalanceBefore2).to.equal(ethers.utils.parseUnits("1000", usdcDecimals));

    // check NFT contract owner USDC balance (should be 1000 USDC minted in constructor)
    const ownerUsdcBalanceBefore = await usdcContract.balanceOf(owner.address);
    expect(ownerUsdcBalanceBefore).to.equal(ethers.utils.parseUnits("1000", usdcDecimals));

    // NFT balance before
    const user1NftBalanceBefore = await contract.balanceOf(user1.address);
    expect(user1NftBalanceBefore).to.equal(0);

    // give USDC allowance to the NFT contract
    await usdcContract.connect(user1).approve(
      contract.address, // spender
      ethers.utils.parseUnits("1000", usdcDecimals) // allowance for 1000 USDC
    );

    // unpause contract
    await contract.toggleMintingPaused();

    // mint 1 NFT
    await contract.connect(user1).mint(
      user1.address,
      1
    );

    // USDC balance after minting NFT
    const user1UsdcBalanceAfter = await usdcContract.balanceOf(user1.address);
    expect(user1UsdcBalanceAfter).to.equal(ethers.utils.parseUnits("500", usdcDecimals));

    // check NFT contract owner USDC balance AFTER
    const ownerUsdcBalanceAfter = await usdcContract.balanceOf(owner.address);
    expect(ownerUsdcBalanceAfter).to.equal(ethers.utils.parseUnits("1500", usdcDecimals));

    // NFT balance after
    const user1NftBalanceAfter = await contract.balanceOf(user1.address);
    expect(user1NftBalanceAfter).to.equal(1);

    // permanently stop the minting
    await contract.stopMintingPermanently();

    // fail at minting when contract is permanently stopped
    await expect(contract.connect(user1).mint(
      user1.address,
      1
    )).to.be.revertedWith('Minting permanently stopped');
    
  });

  // it("should allow minter to mint for free", async function () {}
    // also toggle a minter

  // it("should fail at trying to mint over the max amount for one mint", async function () {}

  // it("should fail at trying to mint over the max supply", async function () {}

  // it("should prevent transfers when transfers are paused", async function () {}

  // it("should freeze metadata", async function () {}
    // also change metadata before freezing it

});
*/
