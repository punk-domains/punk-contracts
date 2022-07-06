// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IFlexiPunkTLD.sol";

contract HuwaDomainMinter is Ownable, ReentrancyGuard {
  bool public paused = true;

  uint256 public price = 200_000; // domain price in HUWA (4 decimals!!!)
  uint256 public royaltyFee = 2_000; // share of each domain purchase (in bips) that goes to Punk Domains
  uint256 public referralFee = 1_000; // share of each domain purchase (in bips) that goes to the referrer
  uint256 public constant MAX_BPS = 10_000;

  IERC20 public immutable paymentToken; // payment token
  IFlexiPunkTLD public immutable tldContract; // TLD contract

  // EVENTS
  event PriceChanged(address indexed user, uint256 price_);
  event ReferralChanged(address indexed user, uint256 referral_);
  event RoyaltyChanged(address indexed user, uint256 royalty_);

  // CONSTRUCTOR
  constructor(
    address _tokenAddress,
    address _tldAddress
  ) {
    paymentToken = IERC20(_tokenAddress);
    tldContract = IFlexiPunkTLD(_tldAddress);
  }

  // WRITE

  /// @notice HUWA token approval transaction needs to be made before minting
  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer
  ) external nonReentrant returns(uint256) {
    require(!paused || msg.sender == owner(), "Minting paused");

    // send royalty fee
    uint256 royaltyPayment = (price * royaltyFee) / MAX_BPS;
    uint256 ownerPayment = price - royaltyPayment;

    paymentToken.transferFrom(msg.sender, tldContract.royaltyFeeReceiver(), royaltyPayment);

    // send referral fee
    if (referralFee > 0 && _referrer != address(0)) {
      uint256 referralPayment = (price * referralFee) / MAX_BPS;
      ownerPayment -= referralPayment;
      paymentToken.transferFrom(msg.sender, _referrer, referralPayment);
    }

    // send the rest to the owner
    paymentToken.transferFrom(msg.sender, tldContract.owner(), ownerPayment);

    return tldContract.mint{value: 0}(_domainName, _domainHolder, address(0));
  }

  // OWNER

  /// @notice This changes price in the minter contract
  function changePrice(uint256 _price) external onlyOwner {
    require(_price > 0, "Cannot be zero");
    price = _price;
    emit PriceChanged(msg.sender, _price);
  }

  /// @notice This changes referral fee in the wrapper contract
  function changeReferralFee(uint256 _referral) external onlyOwner {
    require(_referral <= 2000, "Cannot exceed 20%");
    referralFee = _referral;
    emit ReferralChanged(msg.sender, _referral);
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

  // ROYALTY FEE RECEIVER

  /// @notice This changes royalty fee in the minting contract (cannot exceed 3000 bps or 30%)
  function changeRoyaltyFee(uint256 _royalty) external {
    require(_royalty <= 3000, "Cannot exceed 30%");
    require(msg.sender == tldContract.royaltyFeeReceiver(), "Minter: Caller is not royalty fee receiver");
    royaltyFee = _royalty;
    emit RoyaltyChanged(msg.sender, _royalty);
  }

  // RECEIVE & FALLBACK
  receive() external payable {}
  fallback() external payable {}

}