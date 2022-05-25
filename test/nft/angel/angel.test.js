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

describe("Punk Angel NFT", function () {
  let contract;
  let metadataContract;
  let signer;
  let anotherUser;

  const provider = waffle.provider;

  beforeEach(async function () {
    [signer, anotherUser] = await ethers.getSigners();

    //const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    //const forbTldsContract = await PunkForbiddenTlds.deploy();

    const PunkAngelMetadata = await ethers.getContractFactory("PunkAngelMetadata");
    metadataContract = await PunkAngelMetadata.deploy();
  });

  it("should fetch and parse metadata", async function () {
    const tokenId = 43;

    const metadata = await metadataContract.getMetadata(tokenId);
    
    const mdJson = Buffer.from(metadata.substring(29), "base64");
    const mdResult = JSON.parse(mdJson);

    expect(mdResult.name).to.equal("Cyberpunk Angel #" + tokenId);
    expect(mdResult.description).to.equal("A collection of Punk Angel NFTs."); 

    console.log(mdResult.image);
  });

});
