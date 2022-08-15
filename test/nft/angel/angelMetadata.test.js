// npx hardhat test test/nft/angel/angelMetadata.test.js
const { expect } = require("chai");

describe("Punk Angel Metadata", function () {
  let metadataContract;
  let signer;

  beforeEach(async function () {
    [signer] = await ethers.getSigners();

    const PunkAngelMetadata = await ethers.getContractFactory("PunkAngelMetadata");
    metadataContract = await PunkAngelMetadata.deploy();
    await metadataContract.changeMinter(signer.address);

    const features1 = "3A1174741911F257FFCA965A000000231"; // bg1, bg2, hair, skin, dress, face (0-3), arms (0-3), lips (0-2)
  
    const domainPrice = ethers.utils.parseUnits("1", "ether");
    await metadataContract.setUniqueFeaturesId(1, [features1], domainPrice);
  });

  it("should fetch and parse metadata", async function () {
    const tokenId = 1;
    const domainName = "techie";
    const tld = ".punkangel";

    const metadata = await metadataContract.getMetadata(domainName, tld, tokenId);

    //console.log(metadata)
    
    const mdJson = Buffer.from(metadata.substring(29), "base64");
    const mdResult = JSON.parse(mdJson);

    // metadata: 
    //console.log(mdResult);
    console.log(mdResult.name);
    console.log(mdResult.attributes);

    expect(mdResult.name).to.equal(domainName+tld);
    expect(mdResult.description).to.equal("A collection of Punk Angel NFTs created by Punk Domains: https://punk.domains/#/nft/angel"); 

    // SVG image:
    //console.log(mdResult.image);
  });

});
