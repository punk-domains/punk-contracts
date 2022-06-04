// npx hardhat test test/resolver/proxy.test.js
const { expect } = require('chai');
 
describe("Punk Resolver Proxy", function () {
  let contractV1;

  beforeEach(async function () {
    const PunkResolverV1 = await ethers.getContractFactory("PunkResolverV1");
    contractV1 = await PunkResolverV1.deploy();
  });
  
  it('', async function () {
    
  });
});