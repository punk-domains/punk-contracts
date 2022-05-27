// npx hardhat test test/nft/angel/angelMetadata.test.js
const { expect } = require("chai");

describe("Punk Angel Metadata", function () {
  let metadataContract;

  beforeEach(async function () {
    const PunkAngelMetadata = await ethers.getContractFactory("PunkAngelMetadata");
    metadataContract = await PunkAngelMetadata.deploy();
  });

  it("should fetch and parse metadata", async function () {
    const tokenId = 19;

    const metadata = await metadataContract.getMetadata(tokenId);
    
    const mdJson = Buffer.from(metadata.substring(29), "base64");
    const mdResult = JSON.parse(mdJson);

    expect(mdResult.name).to.equal("Cyberpunk Angel #" + tokenId);
    expect(mdResult.description).to.equal("A collection of Punk Angel NFTs created by Punk Domains: https://punk.domains"); 

    console.log(mdResult.image);
  });

});
