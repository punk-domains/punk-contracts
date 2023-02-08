// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../lib/strings.sol";

interface IFlexiPunkTLD is IERC721 {

  function owner() external view returns(address);
  function royaltyFeeReceiver() external view returns(address);
  function royaltyFeeUpdater() external view returns(address);

  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer
  ) external payable returns(uint256);

}

// generic punk minter contract
// - no minting restrictions (anyone can mint)
// - tiered pricing
// - broker fee
contract MinterWithBroker is Ownable, ReentrancyGuard {
  address public brokerAddress;

  bool public paused = true;

  uint256 public referralFee; // share of each domain purchase (in bips) that goes to the referrer
  uint256 public royaltyFee; // share of each domain purchase (in bips) that goes to Punk Domains
  uint256 public brokerFee; // share of each domain purchase (in bips) that goes to the broker
  uint256 public constant MAX_BPS = 10_000;

  uint256 public price1char; // 1 char domain price
  uint256 public price2char; // 2 chars domain price
  uint256 public price3char; // 3 chars domain price
  uint256 public price4char; // 4 chars domain price
  uint256 public price5char; // 5+ chars domain price

  IFlexiPunkTLD public immutable tldContract;

  // CONSTRUCTOR
  constructor(
    address _brokerAddress,
    address _tldAddress,
    uint256 _referralFee,
    uint256 _royaltyFee,
    uint256 _brokerFee,
    uint256 _price1char,
    uint256 _price2char,
    uint256 _price3char,
    uint256 _price4char,
    uint256 _price5char
  ) {
    brokerAddress = _brokerAddress;
    tldContract = IFlexiPunkTLD(_tldAddress);

    referralFee = _referralFee;
    royaltyFee = _royaltyFee;
    brokerFee = _brokerFee;

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

    // send royalty fee
    if (royaltyFee > 0) {
      uint256 royaltyPayment = (selectedPrice * royaltyFee) / MAX_BPS;
      (bool sentRoyaltyFee, ) = payable(tldContract.royaltyFeeReceiver()).call{value: royaltyPayment}("");
      require(sentRoyaltyFee, "Failed to send royalty fee");
    }

    // send broker fee
    if (brokerFee > 0 && brokerAddress != address(0)) {
      uint256 brokerPayment = (selectedPrice * brokerFee) / MAX_BPS;
      (bool sentBrokerFee, ) = payable(brokerAddress).call{value: brokerPayment}("");
      require(sentBrokerFee, "Failed to send broker fee");
    }

    // send referral fee
    if (referralFee > 0 && _referrer != address(0)) {
      uint256 referralPayment = (selectedPrice * referralFee) / MAX_BPS;
      (bool sentReferralFee, ) = payable(_referrer).call{value: referralPayment}("");
      require(sentReferralFee, "Failed to send referral fee");
    }

    // send the rest to TLD owner
    (bool sent, ) = payable(tldContract.owner()).call{value: address(this).balance}("");
    require(sent, "Failed to send domain payment to TLD owner");

    // mint a domain
    tokenId = tldContract.mint{value: 0}(_domainName, _domainHolder, address(0));
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

  /// @notice This changes referral fee in the minter contract
  function changeReferralFee(uint256 _referralFee) external onlyOwner {
    require(_referralFee <= 2000, "Cannot exceed 20%");
    referralFee = _referralFee;
  }

  function ownerFreeMint(
    string memory _domainName,
    address _domainHolder
  ) external nonReentrant onlyOwner returns(uint256 tokenId) {
    // mint a domain
    tokenId = tldContract.mint{value: 0}(_domainName, _domainHolder, address(0));
  }

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

  // OTHER WRITE METHODS

  /// @notice This changes royalty fee in the minter contract
  function changeRoyaltyFee(uint256 _royaltyFee) external {
    require(_royaltyFee <= 6000, "Cannot exceed 60%");
    require(_msgSender() == tldContract.royaltyFeeUpdater(), "Sender is not Royalty Fee Updater");
    royaltyFee = _royaltyFee;
  }

  /// @notice This changes the Broker address in the minter contract
  function changeBrokerAddress(address _brokerAddress) external {
    require(_msgSender() == brokerAddress, "Sender is not the broker");
    brokerAddress = _brokerAddress;
  }

  /// @notice This changes the Broker fee in the minter contract
  function changeBrokerFee(uint256 _brokerFee) external {
    require(_brokerFee <= 3000, "Cannot exceed 30%");
    require(_msgSender() == brokerAddress, "Sender is not the broker");
    brokerFee = _brokerFee;
  }

  // RECEIVE & FALLBACK
  receive() external payable {}
  fallback() external payable {}
 
}