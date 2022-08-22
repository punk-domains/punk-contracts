// npx hardhat test test/partners/ppl/pplMetadata.test.js
const { expect } = require("chai");

describe(".ppl Metadata", function () {
  let metadataContract;
  let signer;

  beforeEach(async function () {
    [signer] = await ethers.getSigners();

    const PplMetadata = await ethers.getContractFactory("PplMetadata");
    metadataContract = await PplMetadata.deploy();
  });

  it("should fetch and parse metadata", async function () {
    const tokenId = 3;
    const domainName = "joie";
    const tld = ".ppl";

    const metadata = await metadataContract.getMetadata(domainName, tld, tokenId);

    //console.log(metadata)
    
    const mdJson = Buffer.from(metadata.substring(29), "base64");
    const mdResult = JSON.parse(mdJson);

    // metadata: 
    //console.log(mdResult);
    console.log(mdResult.name);
    console.log(mdResult.attributes);

    expect(mdResult.name).to.equal(domainName+tld);
    expect(mdResult.description).to.equal("A collection of PEOPLE web3 domain (.ppl) NFTs created by Joie Degarlic: https://ppl.domains"); 

    // SVG image:
    //console.log(mdResult.image);
  });

});
