// npx hardhat test test/nft/angel/angelMetadata.test.js
const { expect } = require("chai");

describe("Punk Angel Metadata", function () {
  let metadataContract;
  let signer;

  beforeEach(async function () {
    [signer] = await ethers.getSigners();

    const PunkAngelMetadata = await ethers.getContractFactory("PunkAngelMetadata");
    metadataContract = await PunkAngelMetadata.deploy(signer.address);

    const features1 = "3A1174741911F257FFCA965A000000031"; // bg1, bg2, hair, skin, dress, face (0-3), arms (0-3), lips (0-2)
  
    await metadataContract.setUniqueFeaturesId(1, [features1]); 
  
  });

  it("should fetch and parse metadata", async function () {
    const tokenId = 1;
    const domainName = "techie.punkangel";

    const metadata = await metadataContract.getMetadata(domainName, tokenId, metadataContract.address);
    
    const mdJson = Buffer.from(metadata.substring(29), "base64");
    const mdResult = JSON.parse(mdJson);

    expect(mdResult.name).to.equal(domainName);
    expect(mdResult.description).to.equal("A collection of Punk Angel NFTs created by Punk Domains: https://punk.domains"); 

    console.log(mdResult.image);
  });

});
