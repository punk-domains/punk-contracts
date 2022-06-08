// npx hardhat test test/resolver/proxy.test.js
const { expect } = require('chai');
 
describe("Punk Resolver Proxy", function () {
  let contract;
  let forbTldsContract;
  let factoryContract1;
  let factoryContract2;
  let factoryContract3;

  let signer;
  let user1;
  let user2;

  beforeEach(async function () {
    [signer, user1, user2] = await ethers.getSigners();

    // deploy V1
    const PunkResolverV1 = await ethers.getContractFactory("PunkResolverV1");
    contract = await upgrades.deployProxy(PunkResolverV1); // alternative: upgrades.deployProxy(CounterV1, {initializer: 'initialize'});

    // deploy Frobidden TLDs contract
    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    forbTldsContract = await PunkForbiddenTlds.deploy();

    // deploy multiple factory contracts
    const PunkTLDFactory = await ethers.getContractFactory("PunkTLDFactory");
    factoryContract1 = await PunkTLDFactory.deploy(ethers.utils.parseUnits("1", "ether"), forbTldsContract.address);
    factoryContract2 = await PunkTLDFactory.deploy(ethers.utils.parseUnits("2", "ether"), forbTldsContract.address);
    factoryContract3 = await PunkTLDFactory.deploy(ethers.utils.parseUnits("3", "ether"), forbTldsContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract1.address);
    await forbTldsContract.addFactoryAddress(factoryContract2.address);
    await forbTldsContract.addFactoryAddress(factoryContract3.address);
  });
  
  it('adds and removes a factory address', async function () {
    const owner = await contract.owner();
    expect(owner).to.equal(signer.address);

    const factoryAddresses1 = contract.getFactoriesArray();
    expect(factoryAddresses1).to.be.empty;

    await contract.addFactoryAddress(factoryContract1.address);

    const factoryAddresses2 = await contract.getFactoriesArray();
    expect(factoryAddresses2).to.eql([factoryContract1.address]);
  });
});