// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "../../factories/standard/interfaces/IPunkTLD.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// receive and redirect ETH
contract PunkOpPgf is Ownable {
  address public pgfAddress;
  IPunkTLD tldContract;

  // CONSTRUCTOR
  constructor(
    address _pgfAddress,
    address _tldAddress
  ) {
    pgfAddress = _pgfAddress;
    tldContract = IPunkTLD(_tldAddress);
  }

  // OWNER

  function changeMaxDomainNameLength(uint256 _maxLength) external onlyOwner {
    tldContract.changeNameMaxLength(_maxLength);
  }

  function changePgfAddress(address _newPgfAddress) external onlyOwner {
    pgfAddress = _newPgfAddress;
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

  // recover ERC20 tokens mistakenly sent to this contract
  function recoverERC20(address tokenAddress_, uint256 tokenAmount_, address recipient_) external onlyOwner {
    IERC20(tokenAddress_).transfer(recipient_, tokenAmount_);
  }

  // recover ERC721 tokens mistakenly sent to this contract
  function recoverERC721(address tokenAddress_, uint256 tokenId_, address recipient_) external onlyOwner {
    IERC721(tokenAddress_).transferFrom(address(this), recipient_, tokenId_);
  }

  function transferTldOwnership(address _newTldOwner) external onlyOwner {
    tldContract.transferOwnership(_newTldOwner);
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
