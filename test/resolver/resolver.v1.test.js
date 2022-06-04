// npx hardhat test test/resolver/resolver.v1.test.js
const { expect } = require('chai');

const contractName = "PunkResolverV1";
 
describe(contractName, function () {
  let contract;

  beforeEach(async function () {
    const contractCode = await ethers.getContractFactory(contractName);
    contract = await contractCode.deploy();
  });
  
  it('', async function () {
    
  });
});