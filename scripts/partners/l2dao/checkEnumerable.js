// check if ERC721 contract has the function tokenOfOwnerByIndex
// npx hardhat run scripts/partners/l2dao/checkEnumerable.js --network optimisticEthereum

async function main() {
  const [signer] = await ethers.getSigners();

  const intrfc = new ethers.utils.Interface([
    "function balanceOf(address owner) external view returns (uint256 balance)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256 tokenId)",
    "function ownerOf(uint256 tokenId) external view returns (address owner)"
  ]);

  const contract = new ethers.Contract("0x65eecBf5E5BC6b1bdAf28Ab28A650e8c34d7ba04", intrfc, signer);

  const balance = await contract.balanceOf("0x00418880f4712320da41a8259c774ca0e0637979");
  console.log("balance: " + balance);

  const tokenId = await contract.tokenOfOwnerByIndex("0x00418880f4712320da41a8259c774ca0e0637979", balance-1);
  console.log("tokenId: " + tokenId);

  const owner = await contract.ownerOf(tokenId);
  console.log("owner: " + owner);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });