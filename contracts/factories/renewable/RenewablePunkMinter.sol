// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../lib/strings.sol";

interface IRenewablePunkTLD {
  function owner() external returns(address);
  function mint(string memory _domainName,address _domainHolder,uint256 _registrationLength) external returns(uint256);
}

// example minter contract for renewable punk domains
contract RenewablePunkMinter is Ownable, ReentrancyGuard {
  bool public paused = true;

  address public royaltyFeeReceiver;

  uint256 registrationLength = 60 * 60 * 24 * 365; // length in seconds (default: 1 year)

  uint256 public referralFee = 1_000; // share of each domain purchase (in bips) that goes to the referrer
  uint256 public royaltyFee = 5_000; // share of each domain purchase (in bips) that goes to the royalty fee receiver
  uint256 public constant MAX_BPS = 10_000;

  uint256 public price1char; // 1 char domain price
  uint256 public price2char; // 2 chars domain price
  uint256 public price3char; // 3 chars domain price
  uint256 public price4char; // 4 chars domain price
  uint256 public price5char; // 5+ chars domain price

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

  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer
  ) external nonReentrant payable returns(uint256 tokenId) {
    require(!paused, "Minting paused");

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

    // send referral fee
    if (referralFee > 0 && _referrer != address(0)) {
      uint256 referralPayment = (selectedPrice * referralFee) / MAX_BPS;
      (bool sentReferralFee, ) = payable(_referrer).call{value: referralPayment}("");
      require(sentReferralFee, "Failed to send referral fee");

      selectedPrice -= referralPayment;
    }

    // send royalty fee
    if (royaltyFee > 0 && royaltyFeeReceiver != address(0)) {
      uint256 royaltyPayment = (selectedPrice * royaltyFee) / MAX_BPS;
      (bool sentRoyaltyFee, ) = payable(royaltyFeeReceiver).call{value: royaltyPayment}("");
      require(sentRoyaltyFee, "Failed to send royalty fee");
    }

    // send the rest to TLD owner
    (bool sent, ) = payable(tldContract.owner()).call{value: address(this).balance}("");
    require(sent, "Failed to send domain payment to TLD owner");

    // mint a domain
    tokenId = tldContract.mint(
      _domainName, 
      _domainHolder, 
      registrationLength // registration length in seconds (gets added to the current block timestamp)
    );
  }

  // OWNER

  /// @notice This changes price in the minter contract
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

  /// @notice This changes referral fee
  function changeReferralFee(uint256 _referral) external onlyOwner {
    require(_referral <= 1000, "Cannot exceed 10%");
    referralFee = _referral;
  }

  /// @notice This changes registration length (in seconds)
  function changeRegistrationLength(uint256 _regLength) external onlyOwner {
    require(_regLength > 604800, "Cannot be shorter than a week");
    registrationLength = _regLength;
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

  function ownerFreeMint(
    string memory _domainName,
    address _domainHolder
  ) external nonReentrant onlyOwner returns(uint256 tokenId) {
    // mint a domain
    tokenId = tldContract.mint(
      _domainName, 
      _domainHolder, 
      registrationLength
    );
  }

  /// @notice Pause or unpause the contract
  function togglePaused() external onlyOwner {
    paused = !paused;
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