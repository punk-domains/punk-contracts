// npx hardhat test test/other/deprecateTld.test.js
const { expect } = require("chai");

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const matic = 0.5;
  const eth = 1000;
  
  const gasCostMatic = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("35", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("21", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostArbitrum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1.25", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Arbitrum): $" + String(Number(gasCostArbitrum)*eth));
  console.log(testName + " gas cost (Polygon): $" + String(Number(gasCostMatic)*matic));
}

describe("Deprecated TLDs contract test", function () {
  let oldTldContract;
  let newTldContract;
  let deprecateTldContract;

  let signer;
  let user1;
  let user2;

  const provider = waffle.provider;

  const oldDomainName = ".web3";
  const oldDomainSymbol = ".WEB3";
  const oldDomainPrice = ethers.utils.parseUnits("2", "ether");
  const oldDomainRoyalty = 2500; // royalty in bips (10 bips is 0.1%)

  const newDomainName = ".wagmi";
  const newDomainSymbol = ".WAGMI";
  const newDomainPrice = ethers.utils.parseUnits("1", "ether");
  const newDomainRoyalty = 2000; // royalty in bips (10 bips is 0.1%)

  beforeEach(async function () {
    [signer] = await ethers.getSigners();

    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const FlexiPunkMetadata = await ethers.getContractFactory("FlexiPunkMetadata");
    const metadataContract = await FlexiPunkMetadata.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("FlexiPunkTLDFactory");
    const factoryContract = await PunkTLDFactory.deploy(oldDomainPrice, forbTldsContract.address, metadataContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    const FlexiPunkTLD = await ethers.getContractFactory("FlexiPunkTLD");
    
    oldTldContract = await FlexiPunkTLD.deploy(
      oldDomainName,
      oldDomainSymbol,
      signer.address, // TLD owner
      oldDomainPrice,
      true, // buying enabled
      oldDomainRoyalty,
      factoryContract.address,
      metadataContract.address
    );

    newTldContract = await FlexiPunkTLD.deploy(
      newDomainName,
      newDomainSymbol,
      signer.address, // TLD owner
      newDomainPrice,
      true, // buying enabled
      newDomainRoyalty,
      factoryContract.address,
      metadataContract.address
    );

    //const DeprecateTld = await ethers.getContractFactory("DeprecateTld");
    //deprecateTldContract = await DeprecateTld.deploy();
  });

  it("should confirm correct TLD names", async function () {
    const oldName = await oldTldContract.name();
    expect(oldName).to.equal(oldDomainName); 
    
    const newName = await newTldContract.name();
    expect(newName).to.equal(newDomainName);  
  });

  xit("", async function () {});
  
  
  //xit("", async function () {});

});
