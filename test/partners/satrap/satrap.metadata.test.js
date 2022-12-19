// npx hardhat test test/partners/satrap/satrap.metadata.test.js
const { expect } = require("chai");

describe(".satrap Metadata", function () {
  let metadataContract;
  let signer;

  beforeEach(async function () {
    [signer] = await ethers.getSigners();

    const SatrapMetadata = await ethers.getContractFactory("SatrapMetadata");
    metadataContract = await SatrapMetadata.deploy();
  });

  it("should fetch and parse metadata", async function () {
    const tokenId = 1;
    const domainName = "clavi";
    const tld = ".satrap";

    const metadata = await metadataContract.getMetadata(domainName, tld, tokenId);

    //console.log(metadata)
    
    const mdJson = Buffer.from(metadata.substring(29), "base64");
    const mdResult = JSON.parse(mdJson);

    // metadata: 
    //console.log(mdResult);
    console.log(mdResult.name);
    console.log(mdResult.attributes);

    expect(mdResult.name).to.equal(domainName+tld);
    
    // SVG image:
    console.log(mdResult.image);

  });

});
