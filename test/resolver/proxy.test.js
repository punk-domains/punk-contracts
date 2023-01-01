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
  
  // TLD2
  const tldName2 = ".degen";
  const domainSymbol2 = ".DEGEN";
  const domainPrice2 = ethers.utils.parseUnits("2", "ether");

  // TLD1
  const tldName3 = ".ape";
  const domainSymbol3 = ".APE";
  const domainPrice3 = ethers.utils.parseUnits("3", "ether");

  beforeEach(async function () {
    [signer, user1, user2] = await ethers.getSigners();

    // deploy V1
    const PunkResolverV1 = await ethers.getContractFactory("PunkResolverV1");
    contract = await upgrades.deployProxy(PunkResolverV1); // alternative: upgrades.deployProxy(CounterV1, {initializer: 'initialize'});

    // deploy V2
    const PunkResolverV2 = await ethers.getContractFactory("PunkResolverV2");
    contract = await upgrades.upgradeProxy(contract.address, PunkResolverV2);

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
  
  it('adds and removes a factory address (only owner)', async function () {
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

    // fail if user is not owner
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

    // deprecate a TLD
    await contract.addDeprecatedTldAddress(tldContract1.address);

    // should return 0x0 address because TLD is deprecated
    const domainHolderViaResolverDeprecated = await contract.getDomainHolder(domainName, tldName1);
    expect(domainHolderViaResolverDeprecated).to.equal(ethers.constants.AddressZero);
  });

  it('fetches a default domain for a user address', async function () {
    // query default domain via TLD contract before
    const defaultDomainViaTldBefore = await tldContract1.defaultNames(user1.address);
    expect(defaultDomainViaTldBefore).to.equal("");

    // create domain name
    const domainName = "user1";

    await tldContract1.mint(
      domainName, // domain name (without TLD)
      user1.address, // domain owner
      ethers.constants.AddressZero, // no referrer
      {
        value: domainPrice1 // pay  for the domain
      }
    );

    // check default domain via TLD contract after
    const defaultDomainViaTldAfter = await tldContract1.defaultNames(user1.address);
    expect(defaultDomainViaTldAfter).to.equal(domainName);

    // check default domain via Resolver before
    const defaultDomainViaResolverBefore = await contract.getDefaultDomain(user1.address, tldName1);
    expect(defaultDomainViaResolverBefore).to.equal("");

    // add factory address to the resolver contract
    await contract.addFactoryAddress(factoryContract1.address);

    // check default domain via Resolver after
    const defaultDomainViaResolverAfter = await contract.getDefaultDomain(user1.address, tldName1);
    expect(defaultDomainViaResolverAfter).to.equal(domainName);

    // check non-existing default domain via Resolver
    const defaultDomainViaResolverNonExisting = await contract.getDefaultDomain(user2.address, tldName1);
    expect(defaultDomainViaResolverNonExisting).to.equal("");

    // deprecate a TLD
    await contract.addDeprecatedTldAddress(tldContract1.address);

    // should return empty string because TLD is deprecated
    const domainDomainViaResolverDeprecated = await contract.getDomainData(user1.address, tldName1);
    expect(domainDomainViaResolverDeprecated).to.equal("");
  });

  it('fetches domain data', async function () {
    const domainName = "user1";

    // check domain data via TLD contract before
    const domainDataViaTldBefore = await tldContract1.getDomainData(domainName);
    expect(domainDataViaTldBefore).to.equal("");

    // create domain name
    await tldContract1.mint(
      domainName, // domain name (without TLD)
      user1.address, // domain owner
      ethers.constants.AddressZero, // no referrer
      {
        value: domainPrice1 // pay  for the domain
      }
    );

    const newDomainData = "new data";

    await tldContract1.connect(user1).editData(domainName, newDomainData);

    // check domain data via TLD contract after
    const domainDataViaTldAfter = await tldContract1.getDomainData(domainName);
    expect(domainDataViaTldAfter).to.equal(newDomainData);

    // check domain data via Resolver before
    const domainDataViaResolverBefore = await contract.getDomainData(domainName, tldName1);
    expect(domainDataViaResolverBefore).to.equal("");

    // add factory address to the resolver contract
    await contract.addFactoryAddress(factoryContract1.address);

    // check domain data via Resolver after
    const domainDataViaResolverAfter = await contract.getDomainData(domainName, tldName1);
    expect(domainDataViaResolverAfter).to.equal(newDomainData);

    // check non-existing domain name via Resolver
    const domainDataViaResolverNonExisting = await contract.getDomainData("nonExistingDomain", tldName1);
    expect(domainDataViaResolverNonExisting).to.equal("");

    // deprecate a TLD
    await contract.addDeprecatedTldAddress(tldContract1.address);

    // should return 0x0 address because TLD is deprecated
    const domainDataViaResolverDeprecated = await contract.getDomainData(domainName, tldName1);
    expect(domainDataViaResolverDeprecated).to.equal("");
  });

  it('fetches the address of a given TLD', async function () {
    const tldAddressBefore = await contract.getTldAddress(tldName1);
    expect(tldAddressBefore).to.equal(ethers.constants.AddressZero);

    await contract.addFactoryAddress(factoryContract1.address);
    await contract.addFactoryAddress(factoryContract2.address);

    const tldAddressAfter1 = await contract.getTldAddress(tldName1);
    expect(tldAddressAfter1).to.equal(tldContract1.address);

    // deprecate a TLD
    await contract.addDeprecatedTldAddress(tldContract1.address);

    const tldAddressAfter2 = await contract.getTldAddress(tldName1);
    expect(tldAddressAfter2).to.equal(ethers.constants.AddressZero);
  });

  it('fetches a stringified CSV of all active TLDs', async function () {
    const tldsCsvStringBefore = await contract.getTlds();
    expect(tldsCsvStringBefore).to.be.empty;

    await contract.addFactoryAddress(factoryContract1.address);
    await contract.addFactoryAddress(factoryContract2.address);

    const tldsCsvStringAfter = await contract.getTlds();
    expect(tldsCsvStringAfter).to.include(tldName1);
    console.log(tldsCsvStringAfter);

    // deprecate a TLD
    await contract.addDeprecatedTldAddress(tldContract1.address);

    const tldsCsvStringAfter2 = await contract.getTlds();
    expect(tldsCsvStringAfter2).to.not.include(tldName1);
    console.log(tldsCsvStringAfter2);
  });

  it('fetches a list of default domains for a user address across all TLDs', async function () {
    // query default domain via TLD contract before
    const defaultDomainViaTldBefore = await tldContract1.defaultNames(user1.address);
    expect(defaultDomainViaTldBefore).to.equal("");

    // create domain name
    const domainName = "user1";

    await tldContract1.mint(
      domainName, // domain name (without TLD)
      user1.address, // domain owner
      ethers.constants.AddressZero, // no referrer
      {
        value: domainPrice1 // pay  for the domain
      }
    );

    await tldContract3.mint(
      domainName, // domain name (without TLD)
      user1.address, // domain owner
      ethers.constants.AddressZero, // no referrer
      {
        value: domainPrice3 // pay  for the domain
      }
    );

    // check default domain via TLD contract after
    const defaultDomainViaTldAfter = await tldContract1.defaultNames(user1.address);
    expect(defaultDomainViaTldAfter).to.equal(domainName);

    // check default domain via Resolver before
    const defaultDomainViaResolverBefore = await contract.getDefaultDomains(user1.address);
    expect(defaultDomainViaResolverBefore).to.equal("");

    // add factory addresses to the resolver contract
    await contract.addFactoryAddress(factoryContract1.address);
    await contract.addFactoryAddress(factoryContract2.address);

    // check default domain via Resolver after
    const defaultDomainViaResolverAfter = await contract.getDefaultDomains(user1.address);
    console.log(defaultDomainViaResolverAfter);

    expect(defaultDomainViaResolverAfter).to.equal(domainName + tldName1 + " " + domainName + tldName3);

    // check non-existing default domain via Resolver
    const defaultDomainViaResolverNonExisting = await contract.getDefaultDomains(user2.address);
    expect(defaultDomainViaResolverNonExisting).to.equal("");

    // deprecate a TLD
    await contract.addDeprecatedTldAddress(tldContract1.address);

    // should return 1 less domain name because TLD is deprecated
    const defaultDomainViaResolverAfter2 = await contract.getDefaultDomains(user1.address);
    console.log(defaultDomainViaResolverAfter2);

    expect(defaultDomainViaResolverAfter2).to.equal(domainName + tldName3);
  });

  it('fetches a single users default domain name, the first that comes', async function () {
    // query default domain via TLD contract before
    const defaultDomainViaTldBefore = await tldContract1.defaultNames(user1.address);
    expect(defaultDomainViaTldBefore).to.equal("");

    // create domain name
    const domainName = "user1";

    await tldContract1.mint(
      domainName, // domain name (without TLD)
      user1.address, // domain owner
      ethers.constants.AddressZero, // no referrer
      {
        value: domainPrice1 // pay  for the domain
      }
    );

    await tldContract3.mint(
      domainName, // domain name (without TLD)
      user1.address, // domain owner
      ethers.constants.AddressZero, // no referrer
      {
        value: domainPrice3 // pay  for the domain
      }
    );

    // check default domain via TLD contract after
    const defaultDomainViaTldAfter = await tldContract1.defaultNames(user1.address);
    expect(defaultDomainViaTldAfter).to.equal(domainName);

    // check default domain via Resolver before
    const defaultDomainViaResolverBefore = await contract.getFirstDefaultDomain(user1.address);
    expect(defaultDomainViaResolverBefore).to.equal("");

    // add factory addresses to the resolver contract
    await contract.addFactoryAddress(factoryContract1.address);
    await contract.addFactoryAddress(factoryContract2.address);

    // check default domain via Resolver after
    const defaultDomainViaResolverAfter = await contract.getFirstDefaultDomain(user1.address);
    console.log(defaultDomainViaResolverAfter);

    expect(defaultDomainViaResolverAfter).to.equal(domainName + tldName1);

    // check non-existing default domain via Resolver
    const defaultDomainViaResolverNonExisting = await contract.getFirstDefaultDomain(user2.address);
    expect(defaultDomainViaResolverNonExisting).to.equal("");

    // deprecate a TLD
    await contract.addDeprecatedTldAddress(tldContract1.address);

    // should return a different domain name because the first TLD is deprecated
    const defaultDomainViaResolverAfter2 = await contract.getDefaultDomains(user1.address);
    expect(defaultDomainViaResolverAfter2).to.equal(domainName + tldName3);
  });

  it('un/sets a TLD as deprecated (only owner)', async function () {
    const isDeprecatedBefore = await contract.isTldDeprecated(tldContract2.address);
    expect(isDeprecatedBefore).to.be.false;

    await contract.addDeprecatedTldAddress(tldContract2.address);

    const isDeprecatedAfter1 = await contract.isTldDeprecated(tldContract2.address);
    expect(isDeprecatedAfter1).to.be.true;

    await contract.removeDeprecatedTldAddress(tldContract2.address);

    const isDeprecatedAfter2 = await contract.isTldDeprecated(tldContract2.address);
    expect(isDeprecatedAfter2).to.be.false;

    // should fail if user is not owner
    await expect(
      contract.connect(user1).addDeprecatedTldAddress(tldContract2.address)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('fetch domain metadata via tokenURI', async function () {
    const domainName = "user1";

    // create domain name
    await tldContract1.mint(
      domainName, // domain name (without TLD)
      user1.address, // domain owner
      ethers.constants.AddressZero, // no referrer
      {
        value: domainPrice1 // pay  for the domain
      }
    );

    // check domain metadata via TLD contract
    const domainMetadataViaTldAfter = await tldContract1.tokenURI(0);
    const mdJson = Buffer.from(domainMetadataViaTldAfter.substring(29), "base64");
    const mdResult = JSON.parse(mdJson);
    expect(mdResult.name).to.equal(domainName+tldName1);

    // check domain metadata via Resolver contract
    const domainMetadataViaTldAfter2 = await contract.getDomainTokenUri(domainName, tldName1);
    expect(domainMetadataViaTldAfter2).to.be.empty;

    // add factory address to the resolver contract
    await contract.addFactoryAddress(factoryContract1.address);

    // check domain metadata via Resolver contract
    const domainMetadataViaTldAfter3 = await contract.getDomainTokenUri(domainName, tldName1);
    const mdJson2 = Buffer.from(domainMetadataViaTldAfter3.substring(29), "base64");
    const mdResult2 = JSON.parse(mdJson2);
    expect(mdResult2.name).to.equal(domainName+tldName1);

    // deprecate a TLD
    await contract.addDeprecatedTldAddress(tldContract1.address);

    // should return an empty string because the TLD is deprecated
    const domainMetadataViaTldAfter4 = await contract.getDomainTokenUri(domainName, tldName1);
    expect(domainMetadataViaTldAfter4).to.be.empty;
  });

  it('fetches the address of the factory through which a given TLD was created', async function () {
    const factoryAddressBefore = await contract.getTldFactoryAddress(tldName1);
    expect(factoryAddressBefore).to.equal(ethers.constants.AddressZero);

    await contract.addFactoryAddress(factoryContract1.address);
    await contract.addFactoryAddress(factoryContract2.address);

    const factoryAddressAfter1 = await contract.getTldFactoryAddress(tldName1);
    expect(factoryAddressAfter1).to.equal(factoryContract1.address);

    // deprecate a TLD
    await contract.addDeprecatedTldAddress(tldContract1.address);

    const factoryAddressAfter2 = await contract.getTldFactoryAddress(tldName1);
    expect(factoryAddressAfter2).to.equal(ethers.constants.AddressZero);
  });

  it('allows user to set a custom default domain', async function () {
    // check default domain via Resolver before
    const defaultDomainViaResolverBefore = await contract.getDefaultDomain(user1.address, tldName1);
    expect(defaultDomainViaResolverBefore).to.equal("");

    // add factory address to the resolver contract
    await contract.addFactoryAddress(factoryContract1.address);

    // create domain name
    const domainName1 = "user1a";

    await tldContract1.mint(
      domainName1, // domain name (without TLD)
      user1.address, // domain owner
      ethers.constants.AddressZero, // no referrer
      {
        value: domainPrice1 // pay  for the domain
      }
    );
  
    // create another domain name
    const domainName2 = "user1b";

    await tldContract1.mint(
      domainName2, // domain name (without TLD)
      user1.address, // domain owner
      ethers.constants.AddressZero, // no referrer
      {
        value: domainPrice1 // pay  for the domain
      }
    )

    // check default domain via Resolver after
    const defaultDomainViaResolverAfter = await contract.getDefaultDomain(user1.address, tldName1);
    expect(defaultDomainViaResolverAfter).to.equal(domainName1);

    // check the first default domain via Resolver before
    const defaultFirstDomainViaResolverBefore = await contract.getFirstDefaultDomain(user1.address);
    expect(defaultFirstDomainViaResolverBefore).to.equal(domainName1+".wagmi");

    // user sets a different domain to be the default domain in the Resolver contract
    await contract.connect(user1).setCustomDefaultDomain(domainName2, ".wagmi");

    // check the first default domain via Resolver after
    const defaultFirstDomainViaResolverAfter = await contract.getFirstDefaultDomain(user1.address);
    expect(defaultFirstDomainViaResolverAfter).to.equal(domainName2+".wagmi");

    await expect(contract.connect(user1).setCustomDefaultDomain("admin", ".wagmi")).to.be.revertedWith('You do not own this domain.');;
  
    // un-set/remove a custom default domain
    await contract.connect(user1).setCustomDefaultDomain("", "");

    // check the first default domain via Resolver after
    const defaultFirstDomainViaResolverAfter2 = await contract.getFirstDefaultDomain(user1.address);
    expect(defaultFirstDomainViaResolverAfter2).to.equal(domainName1+".wagmi");
  });
});