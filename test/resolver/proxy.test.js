// npx hardhat test test/resolver/proxy.test.js
const { expect } = require('chai');
 
describe("Punk Resolver Proxy", function () {
  let contract;

  let forbTldsContract;

  let factoryContract1;
  let factoryContract2;

  let tldContract1;
  let tldContract2;
  let tldContract3;

  let signer;
  let user1;
  let user2;

  // TLD1
  const tldName1 = ".wagmi";
  const domainSymbol1 = ".WAGMI";
  const domainPrice1 = ethers.utils.parseUnits("1", "ether");
  const domainRoyalty1 = 10; // royalty in bips (10 bips is 0.1%)
  
  // TLD2
  const tldName2 = ".degen";
  const domainSymbol2 = ".DEGEN";
  const domainPrice2 = ethers.utils.parseUnits("2", "ether");
  const domainRoyalty2 = 20; // royalty in bips (10 bips is 0.1%)

  // TLD1
  const tldName3 = ".ape";
  const domainSymbol3 = ".APE";
  const domainPrice3 = ethers.utils.parseUnits("3", "ether");
  const domainRoyalty3 = 30; // royalty in bips (10 bips is 0.1%)

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

    await forbTldsContract.addFactoryAddress(factoryContract1.address);
    await forbTldsContract.addFactoryAddress(factoryContract2.address);

    // create TLD no. 1
    await factoryContract1.ownerCreateTld(
      tldName1,
      domainSymbol1,
      signer.address, // TLD owner
      domainPrice1,
      true // buying enabled
    )

    // create TLD no. 2
    await factoryContract1.ownerCreateTld(
      tldName2,
      domainSymbol2,
      signer.address, // TLD owner
      domainPrice2,
      true // buying enabled
    )

    // create TLD no. 3
    await factoryContract2.ownerCreateTld(
      tldName3,
      domainSymbol3,
      signer.address, // TLD owner
      domainPrice3,
      true // buying enabled
    )

    const tldAddress1 = await factoryContract1.tldNamesAddresses(tldName1);
    const tldAddress2 = await factoryContract1.tldNamesAddresses(tldName2);
    const tldAddress3 = await factoryContract2.tldNamesAddresses(tldName3);

    tldContract1 = await hre.ethers.getContractAt("PunkTLD", tldAddress1);
    tldContract2 = await hre.ethers.getContractAt("PunkTLD", tldAddress2);
    tldContract3 = await hre.ethers.getContractAt("PunkTLD", tldAddress3);
  });
  
  it('adds and removes a factory address', async function () {
    const owner = await contract.owner();
    expect(owner).to.equal(signer.address);

    const factoryAddresses1 = contract.getFactoriesArray();
    expect(factoryAddresses1).to.be.empty;

    await contract.addFactoryAddress(factoryContract1.address);

    const factoryAddresses2 = await contract.getFactoriesArray();
    expect(factoryAddresses2).to.have.members([factoryContract1.address]);

    await expect(contract.connect(user1).addFactoryAddress(
      factoryContract2.address
    )).to.be.revertedWith('Ownable: caller is not the owner');

    await contract.addFactoryAddress(factoryContract2.address);

    const factoryAddresses3 = await contract.getFactoriesArray();
    expect(factoryAddresses3).to.have.members([factoryContract1.address, factoryContract2.address]);

    await contract.removeFactoryAddress(0); // remove factory contract 1

    const factoryAddresses4 = await contract.getFactoriesArray();
    expect(factoryAddresses4).to.have.members([factoryContract2.address]);

    await expect(contract.connect(user1).removeFactoryAddress(
      0
    )).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('fetches a domain holder', async function () {
    const domainName = "user1";

    // check domain holder via TLD contract before
    const domainHolderViaTldBefore = await tldContract1.getDomainHolder(domainName);
    expect(domainHolderViaTldBefore).to.equal(ethers.constants.AddressZero);

    // create domain name
    await tldContract1.mint(
      domainName, // domain name (without TLD)
      user1.address, // domain owner
      ethers.constants.AddressZero, // no referrer
      {
        value: domainPrice1 // pay  for the domain
      }
    );

    // check domain holder via TLD contract after
    const domainHolderViaTldAfter = await tldContract1.getDomainHolder(domainName);
    expect(domainHolderViaTldAfter).to.equal(user1.address);

    // check domain holder via Resolver before
    const domainHolderViaResolverBefore = await contract.getDomainHolder(domainName, tldName1);
    expect(domainHolderViaResolverBefore).to.equal(ethers.constants.AddressZero);

    // add factory address to the resolver contract
    await contract.addFactoryAddress(factoryContract1.address);

    // check domain holder via Resolver after
    const domainHolderViaResolverAfter = await contract.getDomainHolder(domainName, tldName1);
    expect(domainHolderViaResolverAfter).to.equal(user1.address);

    // check non-existing domain name via Resolver
    const domainHolderViaResolverNonExisting = await contract.getDomainHolder("nonExistingDomain", tldName1);
    expect(domainHolderViaResolverNonExisting).to.equal(ethers.constants.AddressZero);
  });


  //it('', async function () {});
  //it('', async function () {});
  //it('', async function () {});
});