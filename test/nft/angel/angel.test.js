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

describe("Punk Angel Metadata", function () {
  let contract;
  let metadataContract;
  let usdcContract;
  let signer;
  let anotherUser;

  const provider = waffle.provider;

  const nftName = "Punk Angel";
  const nftSymbol = "PDANGEL";
  const nftIdCounter = 1;

  const usdcDecimals = 6;
  const nftPrice = ethers.utils.parseUnits("500", usdcDecimals); // NFT price is in USDC (mwei, 6 decimals)

  beforeEach(async function () {
    [signer, anotherUser] = await ethers.getSigners();

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

  it("should confirm NFT name & symbol", async function () {
    const name = await contract.name();
    expect(name).to.equal(nftName);
    const symbol = await contract.symbol();
    expect(symbol).to.equal(nftSymbol);
  });

});
