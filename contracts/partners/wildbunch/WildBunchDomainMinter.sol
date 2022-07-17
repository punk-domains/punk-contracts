// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IFlexiPunkTLD.sol";

contract WildBunchDomainMinter is Ownable, ReentrancyGuard {
  bool public paused = false;
  IERC721 public immutable nftContract; // user must hold this NFT to be allowed to mint
  IFlexiPunkTLD public immutable tldContract; // TLD contract

  // CONSTRUCTOR
  constructor(
    address _nftAddress, // the required NFT address
    address _tldAddress
  ) {
    nftContract = IERC721(_nftAddress);
    tldContract = IFlexiPunkTLD(_tldAddress);
  }

  // WRITE

  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer
  ) external payable nonReentrant returns(uint256) {
    require(!paused, "Minting paused");
    require(nftContract.balanceOf(_msgSender()) > 0, "User must hold the required NFT");

    return tldContract.mint{value: msg.value}(_domainName, _domainHolder, _referrer);
  }

  // OWNER

  /// @notice Recover any ERC-20 token mistakenly sent to this contract address
  function recoverERC20(address tokenAddress_, uint256 tokenAmount_, address recipient_) external onlyOwner {
    IERC20(tokenAddress_).transfer(recipient_, tokenAmount_);
  }

  /// @notice Recover any ERC-721 token mistakenly sent to this contract address
  function recoverERC721(address tokenAddress_, uint256 tokenId_, address recipient_) external onlyOwner {
    IERC721(tokenAddress_).transferFrom(address(this), recipient_, tokenId_);
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
