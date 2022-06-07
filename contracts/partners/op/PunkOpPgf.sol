// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "../../factories/standard/interfaces/IPunkTLD.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Punk Domains Revenue Redirect Contract
/// @author Tempe Techie
/// @notice This smart contract redirects revenue from domain purchases to public goods funding (PGF)
contract PunkOpPgf is Ownable {
  address public pgfAddress; // official Optimism's PGF address

  // CONSTRUCTOR
  constructor(address _pgfAddress) {
    pgfAddress = _pgfAddress;
  }

  // EVENTS
  event PgfAddressChanged(address user, address newPgfAddress);

  // OWNER
  function changeMaxDomainNameLength(address _tldAddress, uint256 _maxLength) external onlyOwner {
    IPunkTLD(_tldAddress).changeNameMaxLength(_maxLength);
  }

  function changePgfAddress(address _newPgfAddress) external onlyOwner {
    pgfAddress = _newPgfAddress;
    emit PgfAddressChanged(msg.sender, _newPgfAddress);
  }

  function changeTldDescription(address _tldAddress, string calldata _description) external onlyOwner {
    IPunkTLD(_tldAddress).changeDescription(_description);
  }

  function changeTldPrice(address _tldAddress, uint256 _price) external onlyOwner {
    IPunkTLD(_tldAddress).changePrice(_price);
  }

  /// @notice Referral fee cannot be 5000 bps or higher
  function changeTldReferralFee(address _tldAddress, uint256 _referral) external onlyOwner {
    IPunkTLD(_tldAddress).changeReferralFee(_referral);
  }

  // recover ERC20 tokens mistakenly sent to this contract
  function recoverERC20(address tokenAddress_, uint256 tokenAmount_, address recipient_) external onlyOwner {
    IERC20(tokenAddress_).transfer(recipient_, tokenAmount_);
  }

  // recover ERC721 tokens mistakenly sent to this contract
  function recoverERC721(address tokenAddress_, uint256 tokenId_, address recipient_) external onlyOwner {
    IERC721(tokenAddress_).transferFrom(address(this), recipient_, tokenId_);
  }

  function transferTldOwnership(address _tldAddress, address _newTldOwner) external onlyOwner {
    IPunkTLD(_tldAddress).transferOwnership(_newTldOwner);
  }

  // manually redirect ETH from contract (in case it wasn't redirected automatically)
  function manualRedirect() external onlyOwner {
    (bool success, ) = pgfAddress.call{value: address(this).balance}("");
    require(success, "Failed to withdraw ETH from contract");
  }

  // allow contract to receive ETH (both with and without data/message)
  receive() external payable {
    pgfAddress.call{value: address(this).balance}("");
  }

  fallback() external payable {
    pgfAddress.call{value: address(this).balance}("");
  }
}
