// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "../../PunkTLD.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Punk Domains -> Unstoppable Domains .polygon transition
/// @author Tempe Techie
/// @notice This contract helps with the transition of .polygon domains from Punk Domains to Unstoppable Domains
contract UnstoppablePunkTransition is Ownable, ReentrancyGuard {
  bool public paused = true;

  // TLD contract (.polygon)
  PunkTLD public immutable tldContract;

  // CONSTRUCTOR
  constructor(
    address _tldAddress
  ) {
    tldContract = PunkTLD(_tldAddress);
  }

  // READ
  
  /// @notice Returns true or false if address is eligible to claim refund for the .polygon domain
  function canClaimRefund(address _user) public view returns(bool) {
    if (tldContract.balanceOf(_user) > 0) {
      return true;
    }

    return false;
  }

  // WRITE

  /// @notice Call this method to burn your PD domain. In return you will get 14 MATIC and credits on UD.
  function domainTransition(
    string memory domainName
  ) external nonReentrant {
    require(!paused, "Minting paused");
    // check if msg.sender owns the domain name
    require(msg.sender == tldContract.getDomainHolder(domainName), "Transition: Sender is not domain holder.");

    // get domain NFT ID
    (, uint256 _tokenId, , ) = tldContract.domains(domainName);

    // transfer domain NFT from msg.sender to this contract address
    tldContract.transferFrom(msg.sender, address(this), _tokenId);

    // send 14 MATIC to msg.sender
    if (address(this).balance >= 14 ether) {
      (bool success, ) = msg.sender.call{value: 14 ether}("");
      require(success, "Failed to send 14 MATIC to msg.sender");
    }
  }

  /// @notice Call this method to burn your PD domains in bulk. In return you will get MATIC and credits on UD.
  function domainTransitionBulk(
    string[] memory domainNames
  ) external nonReentrant {
    require(!paused, "Minting paused");

    uint256 refund = 0 ether;

    for (uint256 i = 0; i < domainNames.length; i++) {
      // check if msg.sender owns the domain name
      require(msg.sender == tldContract.getDomainHolder(domainNames[i]), "Transition: Sender is not domain holder.");

      // get domain NFT ID
      (, uint256 _tokenId, , ) = tldContract.domains(domainNames[i]);

      // transfer domain NFT from msg.sender to this contract address
      tldContract.transferFrom(msg.sender, address(this), _tokenId);

      refund += 14 ether;
    }

    // send MATIC to msg.sender
    if (address(this).balance >= refund) {
      (bool success, ) = msg.sender.call{value: refund}("");
      require(success, "Failed to send MATIC to msg.sender");
    }
  }

  /// @notice Recover any ERC-20 token mistakenly sent to this contract address (only owner)
  function recoverERC20(address tokenAddress_, uint256 tokenAmount_, address recipient_) external onlyOwner {
    IERC20(tokenAddress_).transfer(recipient_, tokenAmount_);
  }

  /// @notice Recover any ERC-721 token mistakenly sent to this contract address (only owner)
  function recoverERC721(address tokenAddress_, uint256 tokenId_, address recipient_) external onlyOwner {
    IERC721(tokenAddress_).transferFrom(address(this), recipient_, tokenId_);
  }

  /// @notice Pause the contract (only owner)
  function togglePaused() external onlyOwner {
    paused = !paused;
  }

  /// @notice Withdraw ETH from contract (only owner)
  function withdraw() external onlyOwner {
    (bool success, ) = owner().call{value: address(this).balance}("");
    require(success, "Failed to withdraw ETH from contract");
  }

  // RECEIVE & FALLBACK
  receive() external payable {}
  fallback() external payable {}
}