// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../lib/strings.sol";

interface IRenewablePunkTLD {
  function owner() external returns(address);
  function renew(string memory _domainName, uint256 _addExpirySeconds) external returns(uint256);
}

// example Renewer contract for renewable punk domains
contract RenewablePunkRenewer is Ownable, ReentrancyGuard {
  address public royaltyFeeReceiver;

  uint256 renewLength = 60 * 60 * 24 * 365; // length in seconds (default: 1 year)

  uint256 public royaltyFee = 5_000; // share of each domain renewing (in bips) that goes to the royalty fee receiver
  uint256 public constant MAX_BPS = 10_000;

  uint256 public price1char; // 1 char domain renewal price
  uint256 public price2char; // 2 chars domain renewal price
  uint256 public price3char; // 3 chars domain renewal price
  uint256 public price4char; // 4 chars domain renewal price
  uint256 public price5char; // 5+ chars domain renewal price

  // TLD contract
  IRenewablePunkTLD public immutable tldContract; // TLD contract

  // CONSTRUCTOR
  constructor(
    address _royaltyFeeReceiver,
    address _tldAddress,
    uint256 _price1char,
    uint256 _price2char,
    uint256 _price3char,
    uint256 _price4char,
    uint256 _price5char
  ) {
    royaltyFeeReceiver = _royaltyFeeReceiver;

    tldContract = IRenewablePunkTLD(_tldAddress);

    price1char = _price1char;
    price2char = _price2char;
    price3char = _price3char;
    price4char = _price4char;
    price5char = _price5char;
  }

  // WRITE

  function renew(string memory _domainName) external nonReentrant payable returns(uint256) {
    // find price
    uint256 domainLength = strings.len(strings.toSlice(_domainName));
    uint256 selectedPrice;

    if (domainLength == 1) {
      selectedPrice = price1char;
    } else if (domainLength == 2) {
      selectedPrice = price2char;
    } else if (domainLength == 3) {
      selectedPrice = price3char;
    } else if (domainLength == 4) {
      selectedPrice = price4char;
    } else {
      selectedPrice = price5char;
    }

    require(msg.value >= selectedPrice, "Value below price");

    // send royalty fee
    if (royaltyFee > 0 && royaltyFeeReceiver != address(0)) {
      uint256 royaltyPayment = (selectedPrice * royaltyFee) / MAX_BPS;
      (bool sentRoyaltyFee, ) = payable(royaltyFeeReceiver).call{value: royaltyPayment}("");
      require(sentRoyaltyFee, "Failed to send royalty fee");
    }

    // send the rest to TLD owner
    (bool sent, ) = payable(tldContract.owner()).call{value: address(this).balance}("");
    require(sent, "Failed to send domain payment to TLD owner");

    // renew a domain (returns the new expiry date)
    return tldContract.renew(_domainName, renewLength);
  }

  // OWNER

  /// @notice This changes price for renewals
  function changePrice(uint256 _price, uint256 _chars) external onlyOwner {
    require(_price > 0, "Cannot be zero");

    if (_chars == 1) {
      price1char = _price;
    } else if (_chars == 2) {
      price2char = _price;
    } else if (_chars == 3) {
      price3char = _price;
    } else if (_chars == 4) {
      price4char = _price;
    } else if (_chars == 5) {
      price5char = _price;
    }
  }

  /// @notice This changes registration length (in seconds)
  function changeRenewLength(uint256 _renewLength) external onlyOwner {
    require(_renewLength > 604800, "Cannot be shorter than a week");
    renewLength = _renewLength;
  }

  /// @notice This changes royalty fee
  function changeRoyaltyFee(uint256 _royalty) external onlyOwner {
    require(_royalty <= 9000, "Cannot exceed 90%");
    royaltyFee = _royalty;
  }

  /// @notice This changes royalty fee receiver address
  function changeRoyaltyFeeReceiver(address _newReceiver) external onlyOwner {
    royaltyFeeReceiver = _newReceiver;
  }

  function ownerFreeRenew(string memory _domainName) external nonReentrant onlyOwner returns(uint256) {
    // renew any domain (returns the new expiry date)
    return tldContract.renew(_domainName, renewLength);
  }

  // TLD OWNER

  /// @notice Recover any ERC-20 token mistakenly sent to this contract address
  function recoverERC20(address tokenAddress_, uint256 tokenAmount_, address recipient_) external {
    require(_msgSender() == tldContract.owner(), "Only TLD owner can do recovery.");
    IERC20(tokenAddress_).transfer(recipient_, tokenAmount_);
  }

  /// @notice Recover any ERC-721 token mistakenly sent to this contract address
  function recoverERC721(address tokenAddress_, uint256 tokenId_, address recipient_) external {
    require(_msgSender() == tldContract.owner(), "Only TLD owner can do recovery.");
    IERC721(tokenAddress_).transferFrom(address(this), recipient_, tokenId_);
  }

  /// @notice Recover any ETH mistakenly sent to this contract address
  function withdraw() external {
    require(_msgSender() == tldContract.owner(), "Only TLD owner can do recovery.");
    (bool success, ) = payable(tldContract.owner()).call{value: address(this).balance}("");
    require(success, "Failed to withdraw ETH from contract");
  }

  // RECEIVE & FALLBACK
  receive() external payable {}
  fallback() external payable {}
 
}