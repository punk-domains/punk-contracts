// Run tests:
// npx hardhat test test/partners/op/op.test.js 

const { expect, assert } = require("chai");

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const eth = 1200;
  
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("14", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostOptimism = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1.25", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Optimism): $" + String(Number(gasCostOptimism)*eth));
}

describe("PunkOpPgf (redirect OP sales to PGF)", function () {
  let tldContract1;
  let tldContract2;
  let receiverContract;
  let distributorContract;
  let minterContract1;
  let minterContract2;

  let signer;
  let user1;
  let user2;

  const paymentTokenDecimals = 18;

  const price1char = ethers.utils.parseUnits("1", paymentTokenDecimals); // $10k
  const price2char = ethers.utils.parseUnits("0.5", paymentTokenDecimals);
  const price3char = ethers.utils.parseUnits("0.1", paymentTokenDecimals);
  const price4char = ethers.utils.parseUnits("0.05", paymentTokenDecimals);
  const price5char = ethers.utils.parseUnits("0.01", paymentTokenDecimals);

  beforeEach(async function () {
    [signer, user1, user2] = await ethers.getSigners();

    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("PunkTLDFactory");
    const factoryContract = await PunkTLDFactory.deploy(price1char, forbTldsContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    // TLD contracts
    const PunkTLD = await ethers.getContractFactory("PunkTLD");

    // .op TLD
    tldContract1 = await PunkTLD.deploy(
      ".op", // name
      ".OP", // symbol
      signer.address, // TLD owner
      0, // domain price
      false, // buying enabled
      0, // royalty (0%)
      factoryContract.address
    );

    // .optimism TLD
    tldContract2 = await PunkTLD.deploy(
      ".optimism", // name
      ".OPTIMISM", // symbol
      signer.address, // TLD owner
      0, // domain price
      false, // buying enabled
      0, // royalty (0%)
      factoryContract.address
    );

    // Asset Receiver contract
    const AssetReceiver = await ethers.getContractFactory("AssetReceiver");
    receiverContract = await AssetReceiver.deploy(signer.address);

    // Punk Distributor contract
    const PunkOpPgf = await ethers.getContractFactory("PunkOpPgf");
    distributorContract = await PunkOpPgf.deploy(receiverContract.address);

    // Minter contracts
    const OpMinter = await ethers.getContractFactory("OpMinter");

    minterContract1 = await OpMinter.deploy(
      tldContract1.address, distributorContract.address,
      price1char, price2char, price3char, price4char, price5char // prices
    );

    minterContract2 = await OpMinter.deploy(
      tldContract2.address, distributorContract.address,
      price1char, price2char, price3char, price4char, price5char // prices
    );

    // unpause both minters
    await minterContract1.togglePaused();
    await minterContract2.togglePaused();

    // transfer TLDs ownerships to the minter contracts
    await tldContract1.transferOwnership(minterContract1.address);
    await tldContract2.transferOwnership(minterContract2.address);
  });

  it("should confirm TLD name & symbol", async function () {
    const tldName1 = await tldContract1.name();
    expect(tldName1).to.equal(".op");

    const tldSymbol1 = await tldContract1.symbol();
    expect(tldSymbol1).to.equal(".OP");
    
    const tldName2 = await tldContract2.name();
    expect(tldName2).to.equal(".optimism");

    const tldSymbol2 = await tldContract2.symbol();
    expect(tldSymbol2).to.equal(".OPTIMISM");
  });

  it("should redirect funds from a domain sale", async function () {
    const receiverBalanceBefore = await waffle.provider.getBalance(receiverContract.address);
    expect(ethers.utils.formatEther(receiverBalanceBefore)).to.equal("0.0");

    // mint a new .op domain
    const tx = await minterContract1.connect(user1).mint(
      "user1",
      user1.address, // holder
      {
        value: price5char // pay 0.01 for the domain
      }
    );

    const receipt = await tx.wait();

    calculateGasCosts("Domain purchase (.op)", receipt);

    const receiverBalanceAfter1 = await waffle.provider.getBalance(receiverContract.address);
    expect(ethers.utils.formatEther(receiverBalanceAfter1)).to.equal("0.01");

    // mint a new .optimism domain
    const tx2 = await minterContract2.connect(user1).mint(
      "user",
      user1.address, // holder
      {
        value: price4char // pay 0.05 for the domain
      }
    );

    const receipt2 = await tx2.wait();

    calculateGasCosts("Domain purchase (.optimism)", receipt2);

    const receiverBalanceAfter2 = await waffle.provider.getBalance(receiverContract.address);
    expect(ethers.utils.formatEther(receiverBalanceAfter2)).to.equal("0.06");
  });

  it("should transfer TLD ownership to another address (only owner)", async function () {
    const ownerBefore = await tldContract1.owner();
    expect(ownerBefore).to.equal(minterContract1.address);

    await minterContract1.transferTldOwnership(user2.address);

    const ownerAfter = await tldContract1.owner();
    expect(ownerAfter).to.equal(user2.address);

    await expect(minterContract1.connect(user1).transferTldOwnership(
      user1.address
    )).to.be.revertedWith('Ownable: caller is not the owner');
    
    const ownerBefore2 = await tldContract2.owner();
    expect(ownerBefore2).to.equal(minterContract2.address);

    await minterContract2.transferTldOwnership(user2.address);

    const ownerAfter2 = await tldContract2.owner();
    expect(ownerAfter2).to.equal(user2.address);

    await expect(minterContract2.connect(user1).transferTldOwnership(
      user1.address
    )).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should change TLD metadata description (only owner)", async function () {
    const desBefore = await tldContract1.description();
    expect(desBefore).to.equal("Punk Domains digital identity. Visit https://punk.domains/");

    const newDes = "Get yourself a .OP domain and donate to public goods funding!";

    await minterContract1.changeTldDescription(newDes);

    const desAfter = await tldContract1.description();
    expect(desAfter).to.equal(newDes);

    // if user is not owner, the tx should revert
    await expect(minterContract1.connect(user1).changeTldDescription("pwned")).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("should recover ERC-20 tokens mistakenly sent to contract address", async function () {
    const ERC20MockToken = await ethers.getContractFactory("MockErc20Token");
    const mockErc20Contract = await ERC20MockToken.deploy("Mock", "MOCK");

    const signerBalance = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance))).to.equal(1000); // 1000 tokens minted in the ERC20 contract constructor

    const ownerContractBalance = await mockErc20Contract.balanceOf(minterContract1.address);
    expect(ownerContractBalance).to.equal(0); // should be 0

    // send 200 tokens to contract
    await mockErc20Contract.transfer(minterContract1.address, ethers.utils.parseEther("200"));

    const signerBalance2 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance2))).to.equal(800);

    const ownerContractBalance2 = await mockErc20Contract.balanceOf(minterContract1.address);
    expect(Number(ethers.utils.formatEther(ownerContractBalance2))).to.equal(200);

    // recover tokens from contract
    await minterContract1.recoverERC20(
      mockErc20Contract.address, // token address
      ethers.utils.parseEther("200"), // token amount
      signer.address // recipient
    );

    const signerBalance3 = await mockErc20Contract.balanceOf(signer.address);
    expect(Number(ethers.utils.formatEther(signerBalance3))).to.equal(1000); // back to 1000

    const ownerContractBalance3 = await mockErc20Contract.balanceOf(minterContract1.address);
    expect(Number(ethers.utils.formatEther(ownerContractBalance3))).to.equal(0); // back to 0
  });

});
