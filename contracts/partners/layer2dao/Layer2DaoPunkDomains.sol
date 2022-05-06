// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "./interfaces/IPunkTLD.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Layer2DaoPunkDomains is Ownable, ReentrancyGuard {
  address[] public supportedNfts; // whitelisted Layer2DAO NFT contracts
  bool public paused = true;

  // a mapping that shows which NFT IDs have already minted a .L2 domain; (NFT address => (tokenID => true/false))
  mapping (address => mapping (uint256 => bool)) public minted;

  // TLD address
  address public tldAddress; // .L2/.l2 TLD

  // TLD contract
  IPunkTLD tldContract;

  // CONSTRUCTOR
  constructor(
    address _nftAddress, // the first whitelisted NFT address
    address _tldAddress
  ) {
    supportedNfts.push(_nftAddress);

    tldAddress = _tldAddress;
    tldContract = IPunkTLD(tldAddress);
  }

  // READ

  function canUserMint(address _user) public view returns(bool canMint) {
    IERC721Enumerable nftContract;
    for (uint256 i = 0; i < supportedNfts.length && !canMint; i++) {
      nftContract = IERC721Enumerable(supportedNfts[i]);

      for (uint256 j = 0; j < nftContract.balanceOf(_user) && !canMint; j++) {
        canMint = !minted[supportedNfts[i]][nftContract.tokenOfOwnerByIndex(_user, j)];
      }
    }

    return canMint;
  }

  function getSupportedNftsArrayLength() public view returns(uint) {
    return supportedNfts.length;
  }

  function getSupportedNftsArray() public view returns(address[] memory) {
    return supportedNfts;
  }

  function isNftIdAlreadyUsed(address _nftAddress, uint256 _nftTokenId) public view returns(bool used) {
    return minted[_nftAddress][_nftTokenId]; 
  }

  // WRITE

  function mint(
    string memory _domainName,
    address _referrer
  ) external payable nonReentrant returns(uint256) {
    require(!paused || msg.sender == owner(), "Minting paused");
    require(msg.value >= tldContract.price(), "Value below price");
    
    bool canMint = false;

    // loop through NFT contracts and see if user holds any NFT
    IERC721Enumerable nftContract;
    for (uint256 i = 0; i < supportedNfts.length && !canMint; i++) {
      nftContract = IERC721Enumerable(supportedNfts[i]);

      // if user has NFTs, loop through them and see if any has not been used yet
      for (uint256 j = 0; j < nftContract.balanceOf(msg.sender) && !canMint; j++) {
        if (!minted[supportedNfts[i]][nftContract.tokenOfOwnerByIndex(msg.sender, j)]) {
          // if NFT has not been used yet, mark it as used and allow minting a new domain
          minted[supportedNfts[i]][nftContract.tokenOfOwnerByIndex(msg.sender, j)] = true;
          canMint = true;
        }
      }
    }

    require(canMint, "User cannot mint a domain");

    return tldContract.mint{value: msg.value}(_domainName, msg.sender, _referrer);
  }

  // OWNER

  function addWhitelistedNftContract(address _nftAddress) external onlyOwner {
    supportedNfts.push(_nftAddress);
  }

  function changeMaxDomainNameLength(uint256 _maxLength) external onlyOwner {
    tldContract.changeNameMaxLength(_maxLength);
  }

  function changeTldDescription(string calldata _description) external onlyOwner {
    tldContract.changeDescription(_description);
  }

  function changeTldPrice(uint256 _price) external onlyOwner {
    tldContract.changePrice(_price);
  }

  /// @notice Referral fee cannot be 5000 bps or higher
  function changeTldReferralFee(uint256 _referral) external onlyOwner {
    tldContract.changeReferralFee(_referral);
  }

  /// @notice Owner can mint a domain without holding/using an NFT
  function ownerMintDomain(
    string memory _domainName,
    address _domainHolder
  ) external payable nonReentrant onlyOwner returns(uint256) {
    return tldContract.mint{value: msg.value}(_domainName, _domainHolder, address(0));
  }

  // recover tokens
  function recoverERC20(address tokenAddress_, uint256 tokenAmount_, address recipient_) external onlyOwner {
    IERC20(tokenAddress_).transfer(recipient_, tokenAmount_);
  }

  function recoverERC721(address tokenAddress_, uint256 tokenId_, address recipient_) external onlyOwner {
    IERC721Enumerable(tokenAddress_).transferFrom(address(this), recipient_, tokenId_);
  }

  function removeWhitelistedNftContract(uint _nftIndex) external onlyOwner {
    supportedNfts[_nftIndex] = supportedNfts[supportedNfts.length - 1];
    supportedNfts.pop();
  }

  function transferTldOwnership(address _newTldOwner) external onlyOwner {
    tldContract.transferOwnership(_newTldOwner);
  }

  function togglePaused() external onlyOwner {
    paused = !paused;
  }

  // withdraw ETH from contract
  function withdraw() external onlyOwner {
    (bool success, ) = owner().call{value: address(this).balance}("");
    require(success, "Failed to withdraw ETH from contract");
  }

  // receive & fallback
  receive() external payable {}
  fallback() external payable {}
}
